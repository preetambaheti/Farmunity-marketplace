from datetime import datetime, timedelta
import os
from functools import wraps
import re

from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
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

# ---- Indexes (idempotent) ----
users.create_index([("email", ASCENDING)], unique=True)
crops.create_index([("createdAt", DESCENDING)])
conversations.create_index([("participantHash", ASCENDING), ("cropId", ASCENDING)])
messages_col.create_index([("conversationId", ASCENDING), ("createdAt", ASCENDING)])

# ---- Helpers ----
def oid(x):
    """Convert str -> ObjectId safely when needed."""
    return ObjectId(x) if isinstance(x, str) else x

def oid_str(x):
    return str(x) if isinstance(x, ObjectId) else x

def serialize_user(u):
    return {
        "id": oid_str(u["_id"]),
        "name": u["name"],
        "email": u["email"],
        "role": u["role"],
        "createdAt": u.get("createdAt"),
    }

def serialize_crop(doc):
    """Expose ownerId for chat; prefer createdBy, fallback by farmer name."""
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

def make_token(user_id, role):
    payload = {
        "sub": str(user_id),
        "role": role,
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
    """Stable key for a 2‑person chat, independent of order."""
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
    role = (body.get("role") or "").strip()  # "Farmer" or "Buyer"

    if not name or not email or not password or role not in ["Farmer", "Buyer"]:
        return jsonify({"error": "name, email, password, and role (Farmer/Buyer) are required"}), 400

    try:
        hashed = generate_password_hash(password)
        doc = {
            "name": name,
            "email": email,
            "password": hashed,
            "role": role,
            "createdAt": datetime.utcnow(),
        }
        result = users.insert_one(doc)
        token = make_token(result.inserted_id, role)
        doc["_id"] = result.inserted_id
        return jsonify({"token": token, "user": serialize_user(doc)}), 201
    except Exception:
        # likely duplicate email
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

    token = make_token(user["_id"], user["role"])
    return jsonify({"token": token, "user": serialize_user(user)}), 200

@app.get("/api/auth/me")
@token_required
def me():
    return jsonify({"user": serialize_user(g.current_user)})

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
    total_crops = crops.count_documents({})
    # example placeholders
    earnings = 145230
    equipment_rented = 3
    return jsonify({
        "cropsCount": total_crops,
        "earnings": earnings,
        "equipmentRented": equipment_rented
    })

# =============================
#        CHAT ENDPOINTS
# =============================

@app.post("/api/chat/start")
@token_required
def chat_start():
    """
    Start (or fetch existing) conversation with recipient.
    JSON: { "recipientId": "<userId>", "cropId": "<optional crop id>" }
    """
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
    """
    JSON: { "conversationId": "...", "text": "..." }
    """
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
    app.run(host="0.0.0.0", port=5000, debug=True)
