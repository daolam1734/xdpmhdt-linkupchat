from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
from pydantic import BaseModel
from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.schemas.chat import Room as RoomSchema

router = APIRouter()

class AIFeedback(BaseModel):
    message_id: str
    feedback: str  # 'like' or 'dislike'

@router.get("/rooms")
async def get_rooms(db: AsyncIOMotorDatabase = Depends(get_db)):
    rooms = await db["chat_rooms"].find().to_list(length=100)
    for room in rooms:
        if "_id" in room:
            room.pop("_id")
    return rooms

@router.post("/ai/feedback")
async def submit_ai_feedback(
    data: AIFeedback,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Gửi phản hồi cho tin nhắn AI.
    """
    if data.feedback not in ["like", "dislike"]:
        raise HTTPException(status_code=400, detail="Invalid feedback type")
        
    await db["ai_feedback"].update_one(
        {"message_id": data.message_id, "user_id": current_user["id"]},
        {
            "$set": {
                "feedback": data.feedback,
                "timestamp": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    return {"status": "success"}
