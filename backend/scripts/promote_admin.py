import asyncio
import sys
import os

# Add the project root to sys.path to allow importing from 'backend'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings

async def promote_user(username: str):
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB]
    
    result = await db["users"].update_one(
        {"username": username},
        {"$set": {"is_superuser": True}}
    )
    
    if result.modified_count > 0:
        print(f"Successfully promoted user '{username}' to administrator.")
    else:
        print(f"User '{username}' not found or already is an administrator.")
    
    client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <username>")
    else:
        asyncio.run(promote_user(sys.argv[1]))
