from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from backend.app.db.session import get_db
from backend.app.schemas.chat import Room as RoomSchema

router = APIRouter()

@router.get("/rooms")
async def get_rooms(db: AsyncIOMotorDatabase = Depends(get_db)):
    rooms = await db["chat_rooms"].find().to_list(length=100)
    for room in rooms:
        if "_id" in room:
            room.pop("_id")
    return rooms
