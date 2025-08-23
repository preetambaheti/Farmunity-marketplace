# backend/certs.py
from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.utils import secure_filename
from datetime import datetime
from functools import wraps
from bson import ObjectId
import hashlib, os

from db import mongo

bp = Blueprint("certs", __name__)

ALLOWED_EXTS = {"pdf", "jpg", "jpeg", "png"}
MAX_MB = 5  # soft limit; relies on app.config["MAX_CONTENT_LENGTH"] for hard cap


# ---------------- Auth helpers ----------------
def _current_user():
    # Prefer request.user (set in app.before_request), then g.current_user (used elsewhere)
    u = getattr(request, "user", None) or getattr(g, "current_user", None)
    if not u:
        return None
    # Normalize to a minimal dict with string id + role
    uid = str(u.get("_id")) if u.get("_id") is not None else None
    role = (u.get("role") or "").lower()
    return {"_id": uid, "role": role, "email": u.get("email"), "name": u.get("name")}

def auth_required(fn):
    @wraps(fn)
    def wrap(*args, **kwargs):
        if not _current_user():
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrap

def admin_required(fn):
    @wraps(fn)
    def wrap(*args, **kwargs):
        u = _current_user()
        if not u or u.get("role") != "admin":
            return jsonify({"error": "Admin only"}), 403
        return fn(*args, **kwargs)
    return wrap
# ------------------------------------------------


# ---------------- Utils ----------------
def _oid(x):
    return ObjectId(x) if isinstance(x, str) else x

def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS

def _sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()

def _save_file(file_storage, subdir):
    if not file_storage or file_storage.filename == "":
        return None, "No file uploaded"

    if not _allowed_file(file_storage.filename):
        return None, "Only PDF/JPG/PNG allowed"

    # soft size check from Content-Length of this part if available
    try:
        file_storage.stream.seek(0, os.SEEK_END)
        size = file_storage.stream.tell()
        file_storage.stream.seek(0)
        if size and size > MAX_MB * 1024 * 1024:
            return None, f"File exceeds {MAX_MB} MB"
    except Exception:
        # If we cannot measure, rely on Flask's MAX_CONTENT_LENGTH
        pass

    filename = secure_filename(file_storage.filename)
    root = current_app.config.get("UPLOAD_FOLDER") or os.path.join(os.getcwd(), "uploads")
    folder = os.path.join(root, subdir)
    os.makedirs(folder, exist_ok=True)

    # unique filename
    ts = int(datetime.utcnow().timestamp())
    name = f"{ts}_{filename}"
    path = os.path.join(folder, name)
    file_storage.save(path)

    meta = {
        "url": f"/uploads/{subdir}/{name}",
        "hash": _sha256_of(path),
    }
    return meta, None
# ------------------------------------------------


# ============ Seller upload ============

@bp.post("/api/equipment/<eqid>/certs")
@bp.post("/api/certs/<eqid>")  # alternate path for convenience
@auth_required
def submit_certs(eqid):
    """
    Seller uploads invoice + certificate for an equipment item.
    Sets certification.status = 'pending'.
    """
    user = _current_user()
    db = mongo.db

    # 1) Validate equipment id & fetch document
    try:
        eq = db.equipment.find_one({"_id": _oid(eqid)})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400
    if not eq:
        return jsonify({"error": "Equipment not found"}), 404

    # 2) Ownership check (your schema uses owner.userId)
    owner_id = (eq.get("owner") or {}).get("userId")
    if str(owner_id) != str(user["_id"]):
        return jsonify({"error": "Forbidden"}), 403

    # 3) Validate files present
    invoice = request.files.get("invoice")
    certificate = request.files.get("certificate")
    if not invoice or not certificate:
        return jsonify({"error": "Both invoice and certificate required"}), 400

    # 4) Save files
    inv_meta, err = _save_file(invoice, "invoices")
    if err:
        return jsonify({"error": err}), 400
    cert_meta, err = _save_file(certificate, "certs")
    if err:
        return jsonify({"error": err}), 400

    # 5) Extra fields
    issuer = (request.form.get("issuer") or "").strip() or "Not specified"
    certificate_no = (request.form.get("certificateNo") or "").strip()
    issue_date = (request.form.get("issueDate") or "").strip()
    expiry_date = (request.form.get("expiryDate") or "").strip()

    # 6) Upsert certification
    cert_obj = {
        "status": "pending",  # pending | certified | rejected | expired
        "issuer": issuer,
        "certificateNo": certificate_no,
        "issueDate": issue_date,
        "expiryDate": expiry_date,
        "documents": [
            {"type": "invoice", **inv_meta},
            {"type": "certificate", **cert_meta},
        ],
        "verifiedBy": None,
        "verifiedAt": None,
        "notes": None,
        "revoked": False,
    }

    db.equipment.update_one(
        {"_id": _oid(eqid)},
        {"$set": {"certification": cert_obj, "updatedAt": datetime.utcnow()}}
    )

    return jsonify({"ok": True, "certification": cert_obj}), 200


# ============ Admin list/approve ============

@bp.get("/api/admin/certs/pending")
@admin_required
def list_pending():
    cur = mongo.db.equipment.find(
        {"certification.status": "pending"},
        {"title": 1, "owner": 1, "certification": 1}
    )
    items = []
    for it in cur:
        it["_id"] = str(it["_id"])
        # keep a light payload for the UI
        items.append(it)
    return jsonify({"items": items})


@bp.post("/api/admin/certs/<eqid>/approve")
@admin_required
def approve_or_reject(eqid):
    """
    Admin one-click approve or reject.
    Body: { approve: bool, notes?: str, expiryDate?: 'YYYY-MM-DD' }
    """
    body = request.get_json(force=True) or {}
    approve = bool(body.get("approve", True))
    notes = body.get("notes")
    expiry_date = body.get("expiryDate")

    status = "certified" if approve else "rejected"
    upd = {
        "certification.status": status,
        "certification.verifiedBy": _current_user()["_id"],
        "certification.verifiedAt": datetime.utcnow().isoformat(),
        "certification.notes": notes,
    }
    if expiry_date:
        upd["certification.expiryDate"] = expiry_date

    try:
        res = mongo.db.equipment.update_one({"_id": _oid(eqid)}, {"$set": upd})
    except Exception:
        return jsonify({"error": "Invalid id"}), 400

    if res.matched_count == 0:
        return jsonify({"error": "Equipment not found"}), 404
    return jsonify({"ok": True, "status": status})
