from datetime import datetime, timedelta
import os
from functools import wraps
import re
import json
import requests
from collections import defaultdict

from bson import ObjectId, Decimal128
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g, Response, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ServerSelectionTimeoutError
from db import mongo                           # <-- PyMongo instance from db.py
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from prices_today import bp as prices_today_bp  # <-- import is fine here (registration happens later)

# ---- NEW: certification blueprint + admin seeder ----
from certs import bp as certs_bp
from seed_admin import ensure_admin

# ---- Gemini (AI) ----
# pip install google-generativeai
import google.generativeai as genai

load_dotenv()

# ---- Config ----
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "farmunity")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_EXPIRE_DAYS = 7

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY") or os.getenv("OWM_API_KEY")

# Configure Gemini once
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# ---- Flask app & CORS (CREATE APP BEFORE REGISTERING BLUEPRINTS) ----
app = Flask(__name__)
# In production, lock origins to your exact frontend origin
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# ---- File uploads / static serving for certification docs ----
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")  # we'll store certs/invoices here
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # ~6 MB guardrail

# Public route to serve uploaded files (supports subfolders via <path:filename>)
@app.get("/uploads/<path:filename>")
def serve_uploads(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# ---- PyMongo init for blueprints that use `from db import mongo` ----
app.config["MONGO_URI"] = MONGO_URI
mongo.init_app(app)  # <-- IMPORTANT: init before registering prices_today_bp

# ---- Seed the single admin user once ----
with app.app_context():
    ensure_admin(mongo)

# ---- Register blueprints AFTER mongo is initialized ----
app.register_blueprint(prices_today_bp)
app.register_blueprint(certs_bp)  # <--- certification endpoints

# ---- Native pymongo (Atlas-safe init) ----
if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI is missing. Example:\n"
        "mongodb+srv://<user>:<pass>@farmunity.x7hhyxj.mongodb.net/farmunity"
    )

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=8000,   # fast fail if DNS/IP/auth is wrong
    retryWrites=True,
    w="majority",
    appname="farmunity-api"
)

# Always select the DB explicitly; do NOT rely on defaults
DB_NAME = DB_NAME or "farmunity"
db = client[DB_NAME]

# Fail fast if Atlas is unreachable / auth blocked
try:
    client.admin.command("ping")
    print(f"✅ Connected to MongoDB Atlas · DB='{DB_NAME}'")
except ServerSelectionTimeoutError as e:
    raise RuntimeError(f"❌ Could not reach MongoDB Atlas: {e}") from e
except Exception as e:
    raise RuntimeError(f"❌ MongoDB Atlas auth/connection failed: {e}") from e

# Collections
users           = db["users"]
crops           = db["crops"]
conversations   = db["conversations"]
messages_col    = db["messages"]
equipment_col   = db["equipment"]
notifications   = db["notifications"]
bookings        = db["bookings"]
ai_sessions     = db["ai_sessions"]
discussions     = db["discussions"]

# ---- Indexes (idempotent & resilient) ----
def safe_index(col, spec, **kwargs):
    try:
        col.create_index(spec, **kwargs)
    except Exception as e:
        print(f"[index] {col.name} {spec} -> {e}", flush=True)

safe_index(users, [("email", ASCENDING)], unique=True)
safe_index(crops, [("createdAt", DESCENDING)])
safe_index(conversations, [("participantHash", ASCENDING), ("cropId", ASCENDING)])
safe_index(messages_col, [("conversationId", ASCENDING), ("createdAt", ASCENDING)])

# Equipment helpful indexes
safe_index(equipment_col, [("category", ASCENDING)])
safe_index(equipment_col, [("available", ASCENDING)])
safe_index(equipment_col, [("location.city", ASCENDING)])
safe_index(equipment_col, [("price.day", ASCENDING)])
safe_index(equipment_col, [("rating", DESCENDING)])
safe_index(equipment_col, [("title", "text"), ("features", "text")])

# Notifications / bookings indexes
safe_index(notifications, [("userId", ASCENDING), ("createdAt", DESCENDING)])
safe_index(bookings, [("equipmentId", ASCENDING), ("createdAt", DESCENDING)])

# AI session indexes
safe_index(ai_sessions, [("userId", ASCENDING), ("updatedAt", DESCENDING)])

# NEW: forum indexes
safe_index(discussions, [("createdAt", DESCENDING)])
safe_index(discussions, [("title", "text"), ("text", "text"), ("category", "text")])

# ---- Helpers ----
def oid(x):
    return ObjectId(x) if isinstance(x, str) else x

def oid_str(x):
    return str(x) if isinstance(x, ObjectId) else x

# ---- NEW: JWT user attach so certs.py can use request.user ----
def decode_jwt_from_request():
    """Read Bearer token, decode, and return user dict (or None)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

    # IMPORTANT: accept our current 'sub' claim (and fall back to 'uid' if present)
    uid = payload.get("sub") or payload.get("uid")
    if not uid:
        return None

    try:
        u = users.find_one({"_id": oid(uid)}, {"password": 0})
    except Exception:
        return None
    if not u:
        return None

    # Convert ObjectId to string for JSON safety
    u["_id"] = str(u["_id"])
    return {"_id": u["_id"], "email": u.get("email"), "role": u.get("role", "buyer"), "name": u.get("name")}

@app.before_request
def attach_request_user():
    """
    Populate request.user for downstream blueprints (e.g., certs.py).
    Falls back to None if no/invalid token.
    """
    user = decode_jwt_from_request()
    # Attach to request (as used by certs.py) and also to flask.g
    setattr(request, "user", user)
    g.user = user

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
        "role": (u.get("role") or "").lower(),
        "location": u.get("location"),
        "phone": u.get("phone"),
        "avatarUrl": u.get("avatarUrl"),
        "preferredLanguage": u.get("preferredLanguage"),
        "crops": u.get("crops"),
        "soil": u.get("soil"),
        "createdAt": u.get("createdAt"),
        "joinedDate": human_month_year(u.get("createdAt")) or None,
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

def serialize_discussion(doc):
    return {
        "id": oid_str(doc.get("_id")),
        "title": doc.get("title"),
        "text": doc.get("text"),
        "category": doc.get("category"),
        "createdAt": doc.get("createdAt"),
        "author": {
            "id": oid_str((doc.get("author") or {}).get("id")),
            "name": (doc.get("author") or {}).get("name"),
        },
        "replies": [
            {
                "id": oid_str(r.get("_id")),
                "text": r.get("text"),
                "createdAt": r.get("createdAt"),
                "author": {
                    "id": oid_str((r.get("author") or {}).get("id")),
                    "name": (r.get("author") or {}).get("name"),
                },
            }
            for r in (doc.get("replies") or [])
        ],
        "repliesCount": len(doc.get("replies") or []),
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

def token_optional(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        g.current_user = None
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
            try:
                data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                uid = data["sub"]
                user = users.find_one({"_id": ObjectId(uid)})
                if user:
                    g.current_user = user
            except Exception:
                g.current_user = None
        return fn(*args, **kwargs)
    return wrapper

def participants_hash(a, b):
    return "-".join(sorted([str(a), str(b)]))

# ---------- AI helpers ----------
GENERATION_CONFIG = {
    "temperature": 0.6,
    "top_p": 0.9,
    "max_output_tokens": 1024
}

def build_system_prompt(profile: dict) -> str:
    """Craft a farmer-personalized instruction for Gemini."""
    name = (profile or {}).get("name") or "Farmer"
    region = (profile or {}).get("location") or "India"
    crops_list = (profile or {}).get("crops") or []
    crops_txt = ", ".join(crops_list) if crops_list else "—"
    soil = (profile or {}).get("soil") or {}
    soil_desc = f"pH={soil.get('ph','?')}, type={soil.get('type','?')}"
    lang = ((profile or {}).get("preferredLanguage") or "English").lower()

    return f"""
You are Farmunity's AI Farming Assistant.

PERSONALIZATION
- Farmer: {name}
- Region: {region}
- Typical crops: {crops_txt}
- Soil: {soil_desc}
- Preferred language: {lang}

BEHAVIOR
- Reply in the farmer's preferred language (use Hinglish if chosen).
- Be practical for Indian agriculture (rain-fed realities, input costs, availability).
- Consider season, soil pH/type, irrigation, and local practices in suggestions.
- For fertilizers/pesticides: give active ingredient, dosage, interval, and safety notes.
- Ask one clarifying question when information is insufficient.
- Provide brief, actionable steps and a short checklist when helpful.
""".strip()

def ai_history_to_gemini(history):
    """
    Convert our history array to Gemini format.
    history: [{role: 'user'|'assistant', 'content': '...'}]
    """
    out = []
    for m in history or []:
        role = "user" if m.get("role") == "user" else "model"
        out.append({"role": role, "parts": [{"text": m.get("content","")}]})
    return out

# ---- Health ----
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/health/db")
def health_db():
    try:
        client.admin.command("ping")
        return {"ok": True, "db": DB_NAME}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500

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
            # Optional personalization defaults
            "preferredLanguage": "English",
            "crops": [],
            "soil": {},  # e.g., {"ph": 6.5, "type": "loamy"}
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
    if user.get("role") not in ["farmer", "buyer", "admin"]:
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

    # NEW: personalization fields
    if "preferredLanguage" in body and isinstance(body["preferredLanguage"], str):
        updates["preferredLanguage"] = body["preferredLanguage"].strip()
    if "crops" in body and isinstance(body["crops"], list):
        updates["crops"] = [str(x).strip() for x in body["crops"] if str(x).strip()]
    if "soil" in body and isinstance(body["soil"], dict):
        updates["soil"] = body["soil"]

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
            "status": body.get("status"),        # optional
        }
    except Exception:
        return jsonify({"error": "Invalid payload"}), 400

    result = crops.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify({"item": serialize_crop(doc)}), 201

# --- Inquiries helper (distinct buyers per crop) ---
def inquiries_map_for_owner_crops(owner_id, crop_ids):
    """
    Returns { cropId(str): distinctBuyerCount(int) }.
    A buyer is anyone != owner who sent >=1 message in a conversation with conversation.cropId == cropId.
    """
    crop_ids = [str(x) for x in crop_ids]
    # only conversations that involve owner & are tied to a crop
    convs = list(conversations.find({
        "cropId": {"$in": crop_ids},
        "participants": oid(owner_id)
    }))
    if not convs:
        return {}
    conv_to_crop = {str(c["_id"]): c.get("cropId") for c in convs}
    conv_ids = list(conv_to_crop.keys())

    msgs = messages_col.find({
        "conversationId": {"$in": conv_ids},
        "senderId": {"$ne": str(owner_id)}
    })

    seen = set()  # (cropId, senderId)
    for m in msgs:
        crop_id_for_msg = conv_to_crop.get(m["conversationId"])
        if crop_id_for_msg:
            seen.add((crop_id_for_msg, m["senderId"]))

    out = defaultdict(int)
    for crop_id, _sender in seen:
        out[crop_id] += 1
    return dict(out)

# ---- Farmer's own crops (with inquiries & status) ----
@app.get("/api/crops/mine")
@token_required
def my_crops():
    uid = g.current_user["_id"]
    docs = list(crops.find({"createdBy": uid}).sort("createdAt", DESCENDING))
    crop_ids = [d["_id"] for d in docs]
    inquiry_counts = inquiries_map_for_owner_crops(uid, crop_ids)

    items = []
    for d in docs:
        s = serialize_crop(d)
        status = d.get("status")
        if not status:
            # very simple derive from quantity if numeric available
            qty_str = str(s.get("quantity", "")).lower()
            try:
                m = re.search(r"[\d.]+", qty_str)
                qty_num = float(m.group(0)) if m else None
            except Exception:
                qty_num = None
            status = "Active" if (qty_num is None or qty_num > 0) else "Sold"

        items.append({
            **s,
            "quality": d.get("quality"),
            "status": status,
            "inquiries": int(inquiry_counts.get(str(d["_id"]), 0)),
        })
    return jsonify({"items": items})

# ---- Delete crop (owner only) ----
@app.delete("/api/crops/<id>")
@token_required
def delete_crop(id):
    try:
        doc = crops.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not doc:
        return jsonify({"error": "Not found"}), 404
    if doc.get("createdBy") != g.current_user["_id"]:
        return jsonify({"error": "Forbidden"}), 403
    crops.delete_one({"_id": doc["_id"]})
    return jsonify({"ok": True})

# ---- Dashboard summary (protected) ----
@app.get("/api/dashboard/summary")
@token_required
def dashboard_summary():
    uid = g.current_user["_id"]
    my_crops = crops.count_documents({"createdBy": uid})
    earnings = 145230   # placeholder until you implement orders
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

    # Debug log (optional)
    print("CREATE_EQUIPMENT payload=", doc, flush=True)

    res = equipment_col.insert_one(doc)
    doc["_id"] = res.inserted_id
    return jsonify({"item": serialize_equipment(to_jsonable(doc))}), 201

# --- My equipment (owner-only list) ---
@app.get("/api/equipment/mine")
@token_required
def my_equipment():
    uid = g.current_user["_id"]
    cur = equipment_col.find({"owner.userId": uid}).sort("updatedAt", DESCENDING)
    items = []
    for doc in cur:
        shaped = serialize_equipment(to_jsonable(doc))
        # Present a friendly status chip
        shaped["status"] = "Active" if doc.get("available", True) else "Upcoming"
        items.append(shaped)
    return jsonify({"items": items})

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

# =============================
#     COMMUNITY DISCUSSIONS
# =============================
@app.get("/api/forum/discussions")
def forum_list():
    """
    Public list of discussions.
    Query params:
      q (search), limit (default 20, <=100), skip (default 0)
    """
    q = (request.args.get("q") or "").strip()
    try:
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except Exception:
        limit = 20
    try:
        skip = max(0, int(request.args.get("skip", 0)))
    except Exception:
        skip = 0

    filt = {}
    if q:
        # Prefer $text if index exists
        filt["$text"] = {"$search": q}

    cursor = discussions.find(filt).sort("createdAt", DESCENDING).skip(skip).limit(limit)
    items = [serialize_discussion(to_jsonable(d)) for d in cursor]
    total = discussions.count_documents(filt)
    return jsonify({"items": items, "total": total, "skip": skip, "limit": limit})

@app.get("/api/forum/discussions/<id>")
def forum_get(id):
    try:
        doc = discussions.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not doc:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"item": serialize_discussion(to_jsonable(doc))})

@app.post("/api/forum/discussions")
@token_required
def forum_create():
    """
    Create a discussion.
    Body: { title, text, category? }
    """
    body = request.get_json(force=True)
    title = (body.get("title") or "").strip()
    text = (body.get("text") or "").strip()
    category = (body.get("category") or "").strip()

    if not title or not text:
        return jsonify({"error": "title and text are required"}), 400

    doc = {
        "title": title,
        "text": text,
        "category": category or None,
        "createdAt": datetime.utcnow(),
        "author": {"id": g.current_user["_id"], "name": g.current_user.get("name")},
        "replies": [],
    }
    res = discussions.insert_one(doc)
    doc["_id"] = res.inserted_id
    return jsonify({"item": serialize_discussion(to_jsonable(doc))}), 201

@app.post("/api/forum/discussions/<id>/replies")
@token_required
def forum_reply(id):
    """
    Add a reply to a discussion.
    Body: { text }
    """
    body = request.get_json(force=True)
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        base = discussions.find_one({"_id": oid(id)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not base:
        return jsonify({"error": "Discussion not found"}), 404

    reply_doc = {
        "_id": ObjectId(),
        "text": text,
        "createdAt": datetime.utcnow(),
        "author": {"id": g.current_user["_id"], "name": g.current_user.get("name")},
    }

    discussions.update_one(
        {"_id": base["_id"]},
        {"$push": {"replies": reply_doc}}
    )

    reply_out = {
        "id": oid_str(reply_doc["_id"]),
        "text": reply_doc["text"],
        "createdAt": reply_doc["createdAt"],
        "author": {
            "id": oid_str(reply_doc["author"]["id"]),
            "name": reply_doc["author"]["name"],
        },
    }
    return jsonify({"reply": reply_out}), 201

# =============================
#      AI ASSISTANT (Gemini)
# =============================
@app.post("/api/ai/ask")
@token_required
def ai_ask():
    """
    Body: { "message": str, "sessionId": optional str }
    Returns: { "sessionId": str, "reply": str }
    """
    if not GOOGLE_API_KEY:
        return jsonify({"error": "GOOGLE_API_KEY not configured on server"}), 500

    body = request.get_json(force=True)
    text = (body.get("message") or "").strip()
    session_id = body.get("sessionId")

    if not text:
        return jsonify({"error": "message is required"}), 400

    # Load/create session
    if session_id:
        try:
            session = ai_sessions.find_one({"_id": oid(session_id), "userId": g.current_user["_id"]})
        except Exception:
            return jsonify({"error": "Invalid sessionId"}), 400
    else:
        session = None

    if not session:
        session_doc = {
            "userId": g.current_user["_id"],
            "messages": [],  # [{role, content, ts}]
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "title": None
        }
        ins = ai_sessions.insert_one(session_doc)
        session_id = oid_str(ins.inserted_id)
        session = ai_sessions.find_one({"_id": ins.inserted_id})

    # Append user message
    ai_sessions.update_one(
        {"_id": session["_id"]},
        {"$push": {"messages": {"role": "user", "content": text, "ts": datetime.utcnow()}},
         "$set": {"updatedAt": datetime.utcnow(),
                  "title": session.get("title") or (text[:50] + ("..." if len(text) > 50 else ""))}}
    )

    # Build system prompt + history
    system_prompt = build_system_prompt(g.current_user)
    model = genai.GenerativeModel(model_name=GEMINI_MODEL, system_instruction=system_prompt)
    history = ai_sessions.find_one({"_id": session["_id"]})["messages"]
    g_history = ai_history_to_gemini(history)

    try:
        chat = model.start_chat(history=g_history)
        resp = chat.send_message(text, generation_config=GENERATION_CONFIG)
        answer = (resp.text or "").strip()
    except Exception as e:
        return jsonify({"error": f"Gemini error: {e}"}), 500

    # Save assistant reply
    ai_sessions.update_one(
        {"_id": session["_id"]},
        {"$push": {"messages": {"role": "assistant", "content": answer, "ts": datetime.utcnow()}},
         "$set": {"updatedAt": datetime.utcnow()}}
    )

    return jsonify({"sessionId": str(session["_id"]), "reply": answer})

# =============================
#           WEATHER
# =============================
def _owm_request(endpoint, params):
    if not OPENWEATHER_API_KEY:
        raise RuntimeError("OPENWEATHER_API_KEY missing")
    url = f"https://api.openweathermap.org/data/2.5/{endpoint}"
    p = {"appid": OPENWEATHER_API_KEY, "units": "metric", **params}
    r = requests.get(url, params=p, timeout=12)
    r.raise_for_status()
    return r.json()

def _resolve_current(lat=None, lon=None, q=None):
    if lat is not None and lon is not None:
        return _owm_request("weather", {"lat": float(lat), "lon": float(lon)})
    elif q:
        return _owm_request("weather", {"q": q})
    else:
        raise ValueError("Provide lat/lon or q")

def _resolve_forecast(lat=None, lon=None, q=None):
    if lat is not None and lon is not None:
        return _owm_request("forecast", {"lat": float(lat), "lon": float(lon)})
    elif q:
        return _owm_request("forecast", {"q": q})
    else:
        raise ValueError("Provide lat/lon or q")

def _aggregate_3days(forecast_json):
    """
    Input: OpenWeather 5-day/3-hour forecast JSON
    Output: list of up to 3 day summaries [{date, min, max, rain_mm, main, desc}]
    """
    from collections import defaultdict, Counter
    buckets = defaultdict(list)
    for it in forecast_json.get("list", []):
        dt_txt = it.get("dt_txt")  # 'YYYY-MM-DD HH:MM:SS'
        if not dt_txt:
            continue
        day = dt_txt.split(" ")[0]
        buckets[day].append(it)

    out = []
    today = datetime.utcnow().date()
    for i, day in enumerate(sorted(buckets.keys())):
        # Skip "today" partial day; take next 3 calendar days total including today if early enough
        d_date = datetime.strptime(day, "%Y-%m-%d").date()
        if d_date < today:
            continue
        temps = [x["main"]["temp"] for x in buckets[day] if x.get("main")]
        rains = []
        for x in buckets[day]:
            # rain can be {'3h': mm}
            mm = (x.get("rain") or {}).get("3h", 0.0)
            if isinstance(mm, (int, float)):
                rains.append(float(mm))
        mains = [ (x.get("weather") or [{}])[0].get("main") for x in buckets[day] ]
        descs = [ (x.get("weather") or [{}])[0].get("description") for x in buckets[day] ]
        if not temps:
            continue
        main = Counter([m for m in mains if m]).most_common(1)[0][0] if mains else None
        desc = Counter([d for d in descs if d]).most_common(1)[0][0] if descs else None
        out.append({
            "date": day,
            "min": round(min(temps), 1),
            "max": round(max(temps), 1),
            "rain_mm": round(sum(rains), 1) if rains else 0.0,
            "main": main,
            "desc": desc
        })
        if len(out) == 3:
            break
    return out

def _format_location_from_owm(cur):
    name = cur.get("name")
    sys = cur.get("sys") or {}
    country = sys.get("country")
    coord = cur.get("coord") or {}
    return {
        "display": ", ".join([x for x in [name, country] if x]),
        "lat": coord.get("lat"),
        "lon": coord.get("lon"),
        "name": name,
        "country": country
    }

# --- NEW: Weather endpoints used by the frontend ---

@app.get("/api/weather/now")
def weather_now():
    """
    Public endpoint used by api.weatherNow({ lat, lon, q }).
    Returns current weather and a compact 3-day outlook.
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    q = request.args.get("q")

    try:
        cur = _resolve_current(lat=lat, lon=lon, q=q)
        fc = _resolve_forecast(lat=lat, lon=lon, q=q)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Weather provider error: {e}"}), 502

    loc = _format_location_from_owm(cur)
    outlook = _aggregate_3days(fc)
    return jsonify({
        "location": loc,
        "current": {
            "temp": (cur.get("main") or {}).get("temp"),
            "feels_like": (cur.get("main") or {}).get("feels_like"),
            "humidity": (cur.get("main") or {}).get("humidity"),
            "pressure": (cur.get("main") or {}).get("pressure"),
            "wind_speed": (cur.get("wind") or {}).get("speed"),
            "wind_deg": (cur.get("wind") or {}).get("deg"),
            "weather": (cur.get("weather") or [{}])[0]
        },
        "outlook3d": outlook
    })

@app.get("/api/weather/advisory")
@token_required
def weather_advisory():
    """
    Auth-only endpoint used by api.weatherAdvisory({ lat, lon, q }).
    Returns a simple farm-focused advisory for the next 3 days.
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    q = request.args.get("q")

    try:
        cur = _resolve_current(lat=lat, lon=lon, q=q)
        fc = _resolve_forecast(lat=lat, lon=lon, q=q)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Weather provider error: {e}"}), 502

    loc = _format_location_from_owm(cur)
    days = _aggregate_3days(fc)

    # Very lightweight rule-based advice
    tips = []
    if any(d["rain_mm"] >= 5 for d in days):
        tips.append("Rain likely — delay irrigation and keep harvested grain covered.")
    if any(d["max"] is not None and d["max"] >= 35 for d in days):
        tips.append("High heat — irrigate in the evening/morning; mulch to reduce evap loss.")
    if any(d["min"] is not None and d["min"] <= 10 for d in days):
        tips.append("Cool nights — consider row covers for nurseries/seedlings.")
    if any((d["main"] or "").lower() in ["thunderstorm"] for d in days):
        tips.append("Thunderstorms possible — secure shade nets and tall trellises.")
    if not tips:
        tips.append("No severe signals — proceed with routine field work.")

    return jsonify({
        "location": loc,
        "today": {
            "temp": (cur.get("main") or {}).get("temp"),
            "weather": (cur.get("weather") or [{}])[0]
        },
        "outlook3d": days,
        "advice": tips
    })

@app.get("/api/ai/sessions")
@token_required
def ai_list_sessions():
    cur = ai_sessions.find({"userId": g.current_user["_id"]}).sort("updatedAt", DESCENDING).limit(50)
    out = []
    for s in cur:
        out.append({
            "id": oid_str(s["_id"]),
            "title": s.get("title") or "AI Session",
            "createdAt": s.get("createdAt"),
            "updatedAt": s.get("updatedAt"),
            "messagesCount": len(s.get("messages", [])),
        })
    return jsonify({"sessions": out})

@app.get("/api/ai/sessions/<sid>")
@token_required
def ai_get_session(sid):
    try:
        s = ai_sessions.find_one({"_id": oid(sid), "userId": g.current_user["_id"]})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not s:
        return jsonify({"error": "Not found"}), 404
    msgs = [{"role": m.get("role"), "content": m.get("content"), "ts": m.get("ts")} for m in s.get("messages", [])]
    return jsonify({
        "id": oid_str(s["_id"]),
        "title": s.get("title") or "AI Session",
        "createdAt": s.get("createdAt"),
        "updatedAt": s.get("updatedAt"),
        "messages": msgs
    })

@app.delete("/api/ai/sessions/<sid>")
@token_required
def ai_delete_session(sid):
    try:
        s = ai_sessions.find_one({"_id": oid(sid), "userId": g.current_user["_id"]})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not s:
        return jsonify({"error": "Not found"}), 404
    ai_sessions.delete_one({"_id": s["_id"]})
    return jsonify({"ok": True})

# ---- Main ----
if __name__ == "__main__":
    # Consider debug=False in production
    app.run(host="0.0.0.0", port=5000, debug=True)
