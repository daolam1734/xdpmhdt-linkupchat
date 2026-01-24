import asyncio
from datetime import datetime, timezone
from backend.app.db.session import db

async def init_db():
    # Create indexes
    await db["users"].create_index("id", unique=True)
    await db["users"].create_index("username", unique=True)
    await db["chat_rooms"].create_index("id", unique=True)
    await db["room_members"].create_index([("room_id", 1), ("user_id", 1)], unique=True)
    await db["messages"].create_index([("room_id", 1), ("timestamp", 1)])

    # Check if rooms exist
    rooms_count = await db["chat_rooms"].count_documents({})
    
    if rooms_count == 0:
        now = datetime.now(timezone.utc)
        default_rooms = [
            {"id": "general", "name": "General", "icon": "hash", "type": "public", "updated_at": now},
            {"id": "help", "name": "Help & Support", "icon": "help-circle", "type": "public", "updated_at": now},
            {"id": "ai", "name": "AI Assistant", "icon": "bot", "type": "private", "updated_at": now},
        ]
        await db["chat_rooms"].insert_many(default_rooms)
        print("Default rooms created.")
    else:
        print("Rooms already exist.")

if __name__ == "__main__":
    asyncio.run(init_db())
