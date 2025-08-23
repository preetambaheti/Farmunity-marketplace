from werkzeug.security import generate_password_hash

def ensure_admin(mongo):
    u = mongo.db.users.find_one({"email": "admin@farmunity.app"})
    if not u:
        mongo.db.users.insert_one({
            "_id": "admin_01",
            "name": "Admin",
            "email": "admin@farmunity.app",
            "role": "admin",
            "password": generate_password_hash("Farmunity@123")
        })
