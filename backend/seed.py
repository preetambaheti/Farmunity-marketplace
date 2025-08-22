from pymongo import MongoClient
from datetime import datetime

client = MongoClient("mongodb://localhost:27017/farmunity")
db = client.get_database()

db.price_snapshots.delete_many({})
db.equipment.delete_many({})

db.price_snapshots.insert_many([
    {"crop_name": "Wheat", "mandi_price": 1950, "wholesale": 2100, "retail": 2400, "timestamp": datetime.utcnow()},
    {"crop_name": "Rice",  "mandi_price": 2200, "wholesale": 2350, "retail": 2600, "timestamp": datetime.utcnow()},
])

db.equipment.insert_many([
    {"name": "Tractor", "type": "tractor", "rent_per_day": 2500, "availability": True, "location": "Belagavi"},
    {"name": "Harvester", "type": "harvester", "rent_per_day": 4500, "availability": True, "location": "Hubballi"},
])

print("Seeded ✨")
