# seed_today.py  (run from backend folder)
import json, os, sys
from datetime import date
from pymongo import MongoClient, ASCENDING

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/farmunity")
DB_NAME   = os.getenv("DB_NAME", "farmunity")
JSON_PATH = sys.argv[1] if len(sys.argv) > 1 else "state_prices_today.json"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
coll = db.state_prices_today

# Helpful unique index
coll.create_index([("date", ASCENDING), ("state", ASCENDING), ("crop", ASCENDING), ("type", ASCENDING)], unique=True)

with open(JSON_PATH, "r", encoding="utf-8") as f:
  data = json.load(f)

today = data.get("generated_at") or date.today().isoformat()
bulk = []
for s in data["states"]:
  state = s["state"]
  for typ in ["wholesale", "retail"]:
    for crop, row in s["prices"][typ].items():
      bulk.append({
        "date": today,
        "state": state,
        "crop": crop,
        "type": typ,
        "price_per_qt": row["price_per_qt"],
        "change_pct": row["change_pct"],
        "unit": row.get("unit", "INR_PER_QT"),
        "yesterday_price": row.get("yesterday_price")
      })

# Replace today's snapshot
coll.delete_many({"date": today})
if bulk:
  coll.insert_many(bulk)
print(f"Seeded {len(bulk)} docs for {today}")
