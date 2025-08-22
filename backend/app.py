from datetime import datetime, timedelta
import os
from functools import wraps
import re
import json

from bson import ObjectId, Decimal128
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g, Response
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

load_dotenv()

# ---- Config ----
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "farmunity")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_EXPIRE_DAYS = 7

app = Flask(__name__)
# In production, lock origins to your exact frontend origin
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---- Mongo ----
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users = db["users"]
crops = db["crops"]
conversations = db["conversations"]
messages_col = db["messages"]
equipment_col = db["equipment"]
notifications = db["notifications"]
bookings = db["bookings"]

# ---- Indexes (idempotent) ----
users.create_index([("email", ASCENDING)], unique=True)
crops.create_index([("createdAt", DESCENDING)])
conversations.create_index([("participantHash", ASCENDING), ("cropId", ASCENDING)])
messages_col.create_index([("conversationId", ASCENDING), ("createdAt", ASCENDING)])

# Equipment helpful indexes
equipment_col.create_index([("category", ASCENDING)])
equipment_col.create_index([("available", ASCENDING)])
equipment_col.create_index([("location.city", ASCENDING)])
equipment_col.create_index([("price.day", ASCENDING)])
equipment_col.create_index([("rating", DESCENDING)])
equipment_col.create_index([("title", "text"), ("features", "text")])

# Notifications / bookings indexes
notifications.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
bookings.create_index([("equipmentId", ASCENDING), ("createdAt", DESCENDING)])


# ---- Helpers ----
def oid(x):
    return ObjectId(x) if isinstance(x, str) else x

def oid_str(x):
    return str(x) if isinstance(x, ObjectId) else x

def _json_default(o):
    if isinstance(o, ObjectId):
        return str(o)
    if isinstance(o, Decimal128):
        return float(o.to_decimal())
    if isinstance(o, (datetime, )):
        return o.isoformat()
    return o

def to_jsonable(doc):
    return json.loads(json.dumps(doc, default=_json_default))

def human_month_year(dt):
    try:
        return dt.strftime("%B %Y")
    except Exception:
        return None

def serialize_user(u):
    return {
        "id": oid_str(u["_id"]),
        "name": u.get("name"),
        "email": u.get("email"),
        "role": (u.get("role") or "").lower(),          # normalized
        "location": u.get("location"),                  # e.g., "Ludhiana, Punjab"
        "phone": u.get("phone"),
        "avatarUrl": u.get("avatarUrl"),
        "createdAt": u.get("createdAt"),
        "joinedDate": human_month_year(u.get("createdAt")) or None,
        # You can compute rating later; keep front-end fallback
    }

def serialize_crop(doc):
    owner_id = doc.get("createdBy")
    if not owner_id and doc.get("farmer"):
        u = users.find_one({"name": doc.get("farmer")})
        if u:
            owner_id = u["_id"]
    return {
        "id": oid_str(doc.get("_id")),
        "ownerId": oid_str(owner_id) if owner_id else None,
        "farmer": doc.get("farmer"),
        "crop": doc.get("crop"),
        "quantity": doc.get("quantity"),
        "price": doc.get("price"),
        "location": doc.get("location"),
        "quality": doc.get("quality"),
        "rating": doc.get("rating"),
        "image": doc.get("image"),
        "category": doc.get("category"),
        "createdAt": doc.get("createdAt"),
    }

def serialize_equipment(doc):
    return {
        "id": oid_str(doc.get("_id")),
        "title": doc.get("title"),
        "category": doc.get("category"),
        "owner": {
            "name": (doc.get("owner") or {}).get("name"),
            "userId": oid_str((doc.get("owner") or {}).get("userId")) if (doc.get("owner") or {}).get("userId") else None
        },
        "location": doc.get("location"),            # {city, state}
        "features": doc.get("features") or [],
        "rating": float(doc.get("rating", 0)) if doc.get("rating") is not None else None,
        "available": bool(doc.get("available", True)),
        "price": {
            "day": float((doc.get("price") or {}).get("day", 0)) if (doc.get("price") or {}).get("day") is not None else None,
            "week": float((doc.get("price") or {}).get("week", 0)) if (doc.get("price") or {}).get("week") is not None else None
        },
        "images": doc.get("images") or [],
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }

def make_token(user_id, role):
    role_norm = (role or "").lower()
    payload = {
        "sub": str(user_id),
        "role": role_norm,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth.split(" ", 1)[1]
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            uid = data["sub"]
            user = users.find_one({"_id": ObjectId(uid)})
            if not user:
                return jsonify({"error": "User not found"}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper

def participants_hash(a, b):
    return "-".join(sorted([str(a), str(b)]))


# ---- Health ----
@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---- Auth ----
@app.post("/api/auth/signup")
def signup():
    body = request.get_json(force=True)
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").lower().strip()
    password = (body.get("password") or "")
    role_in = (body.get("role") or "").strip()  # "Farmer"/"Buyer" or "farmer"/"buyer"

    role = role_in.lower()
    if role not in ["farmer", "buyer"]:
        return jsonify({"error": "role must be 'farmer' or 'buyer'"}), 400
    if not name or not email or not password:
        return jsonify({"error": "name, email, and password are required"}), 400

    try:
        hashed = generate_password_hash(password)
        doc = {
            "name": name,
            "email": email,
            "password": hashed,
            "role": role,                      # store normalized
            "createdAt": datetime.utcnow(),
            "location": None,
            "phone": None,
            "avatarUrl": None,
        }
        result = users.insert_one(doc)
        token = make_token(result.inserted_id, role)
        doc["_id"] = result.inserted_id
        return jsonify({"token": token, "user": serialize_user(doc)}), 201
    except Exception:
        return jsonify({"error": "Email already registered"}), 409

@app.post("/api/auth/login")
def login():
    body = request.get_json(force=True)
    email = (body.get("email") or "").lower().strip()
    password = (body.get("password") or "")

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    user = users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    # normalize any legacy roles to lowercase
    if user.get("role") not in ["farmer", "buyer"]:
        users.update_one({"_id": user["_id"]}, {"$set": {"role": (user.get("role") or "").lower()}})
        user = users.find_one({"_id": user["_id"]})

    token = make_token(user["_id"], user["role"])
    return jsonify({"token": token, "user": serialize_user(user)}), 200

@app.get("/api/auth/me")
@token_required
def me():
    return jsonify({"user": serialize_user(g.current_user)})


# ---- User profile (update current user) ----
@app.put("/api/users/me")
@token_required
def update_me():
    body = request.get_json(force=True)
    updates = {}

    if "name" in body and isinstance(body["name"], str):
        updates["name"] = body["name"].strip()
    if "location" in body and isinstance(body["location"], str):
        updates["location"] = body["location"].strip()
    if "phone" in body and isinstance(body["phone"], str):
        updates["phone"] = body["phone"].strip()
    if "avatarUrl" in body and isinstance(body["avatarUrl"], str):
        updates["avatarUrl"] = body["avatarUrl"].strip()

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    users.update_one({"_id": g.current_user["_id"]}, {"$set": updates})
    user = users.find_one({"_id": g.current_user["_id"]})
    return jsonify({"user": serialize_user(user)}), 200


# ---- Protected sample ----
@app.get("/api/secure/sample")
@token_required
def secure_sample():
    u = serialize_user(g.current_user)
    return jsonify({"message": f"Hello {u['name']}!", "role": u["role"]})


# ---- CROPS: real-time from Mongo (protected) ----
@app.get("/api/crops")
@token_required
def get_crops():
    q = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip().lower()
    try:
        min_price = float(request.args.get("minPrice")) if request.args.get("minPrice") else None
    except ValueError:
        min_price = None
    try:
        max_price = float(request.args.get("maxPrice")) if request.args.get("maxPrice") else None
    except ValueError:
        max_price = None

    try:
        limit = int(request.args.get("limit") or 24)
        limit = min(max(limit, 1), 100)
    except ValueError:
        limit = 24
    try:
        skip = int(request.args.get("skip") or 0)
        skip = max(skip, 0)
    except ValueError:
        skip = 0

    sort_field = request.args.get("sort") or "createdAt"
    order = request.args.get("order") or "desc"
    sort_dir = DESCENDING if order.lower() == "desc" else ASCENDING

    query = {}
    if q:
        regex = re.compile(re.escape(q), re.IGNORECASE)
        query["$or"] = [{"crop": regex}, {"farmer": regex}, {"location": regex}]
    if category:
        query["category"] = category
    price_filter = {}
    if min_price is not None:
        price_filter["$gte"] = min_price
    if max_price is not None:
        price_filter["$lte"] = max_price
    if price_filter:
        query["price"] = price_filter

    docs = list(crops.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit))
    total = crops.count_documents(query)

    items = [serialize_crop(d) for d in docs]
    return jsonify({"items": items, "total": total, "skip": skip, "limit": limit})

@app.post("/api/crops")
@token_required
def create_crop():
    """Create a crop listing (owner = current user)."""
    body = request.get_json(force=True)
    required = ["farmer", "crop", "quantity", "price", "location", "quality"]
    missing = [k for k in required if not body.get(k)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        doc = {
            "farmer": body["farmer"],
            "crop": body["crop"],
            "quantity": body["quantity"],
            "price": float(body["price"]),
            "location": body["location"],
            "quality": body["quality"],
            "rating": float(body.get("rating", 4.6)),
            "image": body.get("image"),
            "category": (body.get("category") or "").lower() or None,
            "createdAt": datetime.utcnow(),
            "createdBy": g.current_user["_id"],  # seller/owner
        }
    except Exception:
        return jsonify({"error": "Invalid payload"}), 400

    result = crops.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"item": serialize_crop(doc)}), 201


# ---- Dashboard summary (protected) ----
@app.get("/api/dashboard/summary")
@token_required
def dashboard_summary():
    # Basic example: you can scope by user later
    uid = g.current_user["_id"]
    my_crops = crops.count_documents({"createdBy": uid})
    earnings = 145230   # TODO: compute from orders if you add them
    equipment_rented = equipment_col.count_documents({"owner.userId": uid})
    return jsonify({
        "cropsCount": my_crops,
        "earnings": earnings,
        "equipmentRented": equipment_rented
    })


# =============================
#         EQUIPMENT
# =============================

# Public listing (no auth required for browsing)
@app.get("/api/equipment")
def list_equipment():
    """
    Query params (all optional):
      q, category, city, available=true/false,
      minPrice, maxPrice  (day price)
      page=1, limit=12
      sort in { 'price:asc','price:desc','rating:desc','latest' }
    """
    q = (request.args.get("q") or "").strip()
    category = request.args.get("category")
    available = request.args.get("available")
    city = request.args.get("city")

    try:
        min_price = float(request.args.get("minPrice")) if request.args.get("minPrice") else None
    except ValueError:
        min_price = None
    try:
        max_price = float(request.args.get("maxPrice")) if request.args.get("maxPrice") else None
    except ValueError:
        max_price = None

    page = max(1, request.args.get("page", default=1, type=int))
    limit = min(50, request.args.get("limit", default=12, type=int))
    sort = request.args.get("sort", "rating:desc")

    # filter
    filt = {}
    if category and category != "All":
        filt["category"] = category
    if available is not None:
        filt["available"] = (available.lower() == "true")
    if city:
        filt["location.city"] = city
    if min_price is not None or max_price is not None:
        pr = {}
        if min_price is not None: pr["$gte"] = min_price
        if max_price is not None: pr["$lte"] = max_price
        filt["price.day"] = pr
    if q:
        # supports text index; fallback to regex if you prefer
        filt["$text"] = {"$search": q}

    # sort
    sort_map = {
        "price:asc": [("price.day", ASCENDING)],
        "price:desc": [("price.day", DESCENDING)],
        "rating:desc": [("rating", DESCENDING)],
        "latest": [("_id", DESCENDING)]
    }
    sort_spec = sort_map.get(sort, [("rating", DESCENDING)])

    total = equipment_col.count_documents(filt)
    cursor = (equipment_col
              .find(filt)
              .sort(sort_spec)
              .skip((page-1)*limit)
              .limit(limit))

    items = [serialize_equipment(to_jsonable(doc)) for doc in cursor]
    return jsonify({
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "hasMore": page * limit < total
    })

@app.get("/api/equipment/<id>")
def get_equipment(id):
    try:
        doc = equipment_col.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not doc:
        return jsonify({"error": "Not found"}), 404
    return jsonify(serialize_equipment(to_jsonable(doc)))

# Create equipment (Farmer only)
@app.post("/api/equipment")
@token_required
def create_equipment():
    if (g.current_user.get("role") or "").lower() != "farmer":
        return jsonify({"error": "Only farmers can create equipment listings"}), 403

    body = request.get_json(force=True)
    try:
        doc = {
            "title": (body.get("title") or "").strip(),
            "category": body.get("category"),
            "owner": {
                "name": g.current_user.get("name"),
                "userId": g.current_user["_id"],
            },
            "location": body.get("location") or {},
            "features": body.get("features") or [],
            "rating": float(body.get("rating", 0)) if body.get("rating") is not None else None,
            "available": bool(body.get("available", True)),
            "price": {
                "day": float((body.get("price") or {}).get("day", 0)) if (body.get("price") or {}).get("day") is not None else None,
                "week": float((body.get("price") or {}).get("week", 0)) if (body.get("price") or {}).get("week") is not None else None
            },
            "images": body.get("images") or [],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
    except Exception:
        return jsonify({"error": "Invalid payload"}), 400

    if not doc["title"] or not doc["category"]:
        return jsonify({"error": "title and category are required"}), 400

    res = equipment_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return jsonify({"item": serialize_equipment(to_jsonable(doc))}), 201

# Update equipment (owner only)
@app.put("/api/equipment/<id>")
@token_required
def update_equipment(id):
    try:
        ex = equipment_col.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not ex:
        return jsonify({"error": "Not found"}), 404
    if ex.get("owner", {}).get("userId") != g.current_user["_id"]:
        return jsonify({"error": "Forbidden"}), 403

    body = request.get_json(force=True)
    updates = {
        k: v for k, v in {
            "title": body.get("title"),
            "category": body.get("category"),
            "location": body.get("location"),
            "features": body.get("features"),
            "rating": float(body["rating"]) if body.get("rating") is not None else None,
            "available": body.get("available"),
            "price": body.get("price"),
            "images": body.get("images"),
            "updatedAt": datetime.utcnow()
        }.items() if v is not None
    }
    equipment_col.update_one({"_id": ex["_id"]}, {"$set": updates})
    doc = equipment_col.find_one({"_id": ex["_id"]})
    return jsonify({"item": serialize_equipment(to_jsonable(doc))})

# Delete equipment (owner only)
@app.delete("/api/equipment/<id>")
@token_required
def delete_equipment(id):
    try:
        ex = equipment_col.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not ex:
        return jsonify({"error": "Not found"}), 404
    if ex.get("owner", {}).get("userId") != g.current_user["_id"]:
        return jsonify({"error": "Forbidden"}), 403
    equipment_col.delete_one({"_id": ex["_id"]})
    return jsonify({"ok": True})

# Realtime stream (MongoDB change streams; requires replica set/Atlas)
@app.get("/api/equipment/stream")
def equipment_stream():
    def gen():
        try:
            with equipment_col.watch(full_document='updateLookup') as stream:
                for change in stream:
                    payload = serialize_equipment(to_jsonable(change.get("fullDocument", {})))
                    yield f"data: {json.dumps(payload)}\n\n"
        except Exception:
            yield "event: error\ndata: {}\n\n"
    return Response(gen(), mimetype="text/event-stream")

# ===== Book Now -> notify owner + open chat =====
@app.post("/api/equipment/<id>/request")
@token_required
def request_equipment(id):
    me = g.current_user
    try:
        eq = equipment_col.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not eq:
        return jsonify({"error": "Equipment not found"}), 404

    owner = (eq.get("owner") or {}).get("userId")
    if not owner:
        return jsonify({"error": "Owner not set for this equipment"}), 400
    if owner == me["_id"]:
        return jsonify({"error": "You own this equipment"}), 400

    body = request.get_json(silent=True) or {}
    note = body.get("note")

    booking_doc = {
        "equipmentId": eq["_id"],
        "equipmentTitle": eq.get("title"),
        "ownerId": owner,
        "requesterId": me["_id"],
        "status": "interest",
        "note": note,
        "createdAt": datetime.utcnow()
    }
    res = bookings.insert_one(booking_doc)
    booking_id = res.inserted_id

    notif = {
        "userId": owner,
        "type": "equipment_interest",
        "title": "New booking interest",
        "message": f"{me.get('name')} is interested in your '{eq.get('title')}'.",
        "metadata": {
            "equipmentId": str(eq["_id"]),
            "equipmentTitle": eq.get("title"),
            "requesterId": str(me["_id"]),
            "bookingId": str(booking_id)
        },
        "isRead": False,
        "createdAt": datetime.utcnow()
    }
    notifications.insert_one(notif)

    me_id = oid_str(me["_id"])
    owner_id = oid_str(owner)
    phash = participants_hash(me_id, owner_id)
    conv = conversations.find_one({"participantHash": phash, "cropId": None})
    if not conv:
        conv_doc = {
            "participants": [oid(me_id), oid(owner_id)],
            "participantHash": phash,
            "cropId": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "lastMessage": None
        }
        result = conversations.insert_one(conv_doc)
        conv = conversations.find_one({"_id": result.inserted_id})

    msg_text = f"Hi! I'm interested in your equipment: {eq.get('title')}"
    msg = {
        "conversationId": str(conv["_id"]),
        "senderId": me_id,
        "text": msg_text if not note else f"{msg_text}\n\nNote: {note}",
        "createdAt": datetime.utcnow()
    }
    messages_col.insert_one(msg)
    conversations.update_one(
        {"_id": conv["_id"]},
        {"$set": {
            "updatedAt": msg["createdAt"],
            "lastMessage": {
                "text": msg["text"],
                "senderId": me_id,
                "createdAt": msg["createdAt"]
            }
        }}
    )

    return jsonify({
        "ok": True,
        "conversationId": oid_str(conv["_id"]),
        "bookingId": str(booking_id)
    }), 201

# ---- Notifications ----
@app.get("/api/notifications")
@token_required
def my_notifications():
    me = g.current_user["_id"]
    cur = notifications.find({"userId": me}).sort("createdAt", DESCENDING).limit(100)
    items = []
    for n in cur:
        item = to_jsonable(n)
        item["id"] = item.pop("_id")
        items.append(item)
    return jsonify({"items": items})

# =============================
#        CHAT ENDPOINTS
# =============================
@app.post("/api/chat/start")
@token_required
def chat_start():
    body = request.get_json(force=True)
    me = oid_str(g.current_user["_id"])
    recipient_id = body.get("recipientId")
    crop_id = body.get("cropId")

    if not recipient_id:
        return jsonify({"error": "recipientId required"}), 400
    if recipient_id == me:
        return jsonify({"error": "Cannot start chat with yourself"}), 400

    if crop_id:
        try:
            oid(crop_id)
        except Exception:
            return jsonify({"error": "Invalid cropId"}), 400

    phash = participants_hash(me, recipient_id)
    conv = conversations.find_one({"participantHash": phash, "cropId": crop_id})
    if not conv:
        conv_doc = {
            "participants": [oid(me), oid(recipient_id)],
            "participantHash": phash,
            "cropId": crop_id,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "lastMessage": None
        }
        result = conversations.insert_one(conv_doc)
        conv = conversations.find_one({"_id": result.inserted_id})

    other = users.find_one({"_id": oid(recipient_id)}, {"password": 0})
    return jsonify({
        "conversation": {
            "id": oid_str(conv["_id"]),
            "cropId": conv.get("cropId"),
            "participants": [oid_str(p) for p in conv.get("participants", [])],
            "createdAt": conv.get("createdAt"),
            "updatedAt": conv.get("updatedAt"),
            "peer": serialize_user(other) if other else None
        }
    })

@app.get("/api/chat/conversations")
@token_required
def chat_conversations():
    me = oid_str(g.current_user["_id"])
    cur = conversations.find({"participants": oid(me)}).sort("updatedAt", DESCENDING)
    out = []
    for c in cur:
        others = [p for p in c["participants"] if oid_str(p) != me]
        other = users.find_one({"_id": others[0]}) if others else None
        last = messages_col.find_one(
            {"conversationId": str(c["_id"])},
            sort=[("createdAt", DESCENDING)]
        )
        out.append({
            "id": oid_str(c["_id"]),
            "cropId": c.get("cropId"),
            "peer": serialize_user(other) if other else None,
            "lastMessage": {
                "text": last["text"],
                "senderId": last["senderId"],
                "createdAt": last["createdAt"]
            } if last else None,
            "updatedAt": c.get("updatedAt")
        })
    return jsonify({"conversations": out})

@app.get("/api/chat/messages/<conversation_id>")
@token_required
def chat_messages(conversation_id):
    me = oid_str(g.current_user["_id"])
    conv = conversations.find_one({"_id": oid(conversation_id)})
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
    if oid(me) not in conv["participants"]:
        return jsonify({"error": "Forbidden"}), 403

    msgs = list(
        messages_col.find({"conversationId": conversation_id}).sort("createdAt", ASCENDING)
    )
    return jsonify({"messages": [{
        "id": oid_str(m["_id"]),
        "conversationId": m["conversationId"],
        "senderId": m["senderId"],
        "text": m["text"],
        "createdAt": m["createdAt"],
    } for m in msgs]})

@app.post("/api/chat/messages")
@token_required
def chat_send_message():
    body = request.get_json(force=True)
    me = oid_str(g.current_user["_id"])
    conv_id = body.get("conversationId")
    text = (body.get("text") or "").strip()

    if not conv_id or not text:
        return jsonify({"error": "conversationId and text are required"}), 400

    conv = conversations.find_one({"_id": oid(conv_id)})
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
    if oid(me) not in conv["participants"]:
        return jsonify({"error": "Forbidden"}), 403

    doc = {
        "conversationId": conv_id,
        "senderId": me,
        "text": text,
        "createdAt": datetime.utcnow()
    }
    result = messages_col.insert_one(doc)
    conversations.update_one(
        {"_id": oid(conv_id)},
        {"$set": {
            "updatedAt": doc["createdAt"],
            "lastMessage": {
                "text": text,
                "senderId": me,
                "createdAt": doc["createdAt"]
            }
        }}
    )
    doc["_id"] = result.inserted_id
    return jsonify({"message": {
        "id": oid_str(doc["_id"]),
        "conversationId": doc["conversationId"],
        "senderId": doc["senderId"],
        "text": doc["text"],
        "createdAt": doc["createdAt"],
    }})

# ---- Main ----
if __name__ == "__main__":
    # Consider debug=False in production
    app.run(host="0.0.0.0", port=5000, debug=True)
