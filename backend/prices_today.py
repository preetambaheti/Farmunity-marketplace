# backend/prices_today.py
from flask import Blueprint, request, jsonify
from datetime import date
from db import mongo 

bp = Blueprint("prices_today", __name__)

# Fixed set used by UI
CROPS = ["Wheat", "Rice", "Corn", "Tomato", "Onion", "Potato"]

def get_coll():
    """
    Resolve the collection after the app has initialized mongo.
    (mongo.db is None until mongo.init_app(app) has run in app.py)
    """
    db = mongo.db
    if db is None:
        raise RuntimeError(
            "Mongo is not initialized. Ensure app.config['MONGO_URI'] is set "
            "and mongo.init_app(app) is called before registering blueprints."
        )
    return db.state_prices_today

@bp.get("/api/states")
def get_states():
    """
    Returns the list of states that have a snapshot for today's date.
    """
    today = date.today().isoformat()
    coll = get_coll()
    states = coll.distinct("state", {"date": today})
    return jsonify({"states": sorted(states)})

@bp.get("/api/prices/today")
def get_today_prices():
    """
    Get today's market prices for the six crops in a given state.
    Query params:
      state=<State Name>       e.g., Karnataka (default)
      type=wholesale|retail    default: wholesale
    Returns:
      {
        state, type, date,
        items: [{crop, price_per_qt, change_pct, unit, state}]
      }
    """
    state = (request.args.get("state") or "Karnataka").strip()
    typ = (request.args.get("type") or "wholesale").strip().lower()

    if typ not in ("wholesale", "retail"):
        return jsonify({"error": "type must be wholesale or retail"}), 400

    today = date.today().isoformat()
    coll = get_coll()

    q = {
        "date": today,
        "state": state,
        "type": typ,
        "crop": {"$in": CROPS},
    }

    # Project only fields needed by the UI
    projection = {
        "_id": 0,
        "crop": 1,
        "price_per_qt": 1,
        "change_pct": 1,
        "unit": 1,
        "state": 1,
    }

    docs = list(coll.find(q, projection).sort("crop", 1))

    # Ensure exactly one entry per crop; fill missing with nulls so UI is stable
    found = {d["crop"]: d for d in docs}
    items = []
    for c in CROPS:
        if c in found:
            items.append(found[c])
        else:
            items.append({
                "crop": c,
                "price_per_qt": None,
                "change_pct": None,
                "unit": "INR_PER_QT",
                "state": state
            })

    return jsonify({
        "state": state,
        "type": typ,
        "date": today,
        "items": items
    })
