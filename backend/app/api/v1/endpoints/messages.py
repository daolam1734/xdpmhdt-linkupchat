from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
import re

from backend.app.db.session import get_db
from backend.app.schemas.message import MessageRead
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/{room_id}/messages/", response_model=List[MessageRead])
async def get_room_messages(
    room_id: str,
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Truy xuất lịch sử tin nhắn của một phòng cụ thể.
    """
    # Chỉ lấy tin nhắn mà người dùng chưa xóa (từ phía họ)
    query = {
        "room_id": room_id,
        "deleted_by_users": {"$ne": current_user["id"]}
    }

    # Isolation logic cho phòng đặc biệt (AI Assistant, Help & Support)
    if room_id in ["ai", "help"]:
        # Ngay cả Admin khi vào phòng này trong view cá nhân cũng chỉ thấy thread của chính họ
        # (Để phản hồi khách hàng, hãy sử dụng Admin Dashboard)
        query["$or"] = [
            {"sender_id": current_user["id"]},
            {"receiver_id": current_user["id"]}
        ]

    messages = await db["messages"].find(query).sort("timestamp", 1).limit(limit).to_list(length=limit)
    return messages

@router.get("/search/", response_model=List[MessageRead])
async def search_messages(
    query: str = Query(..., min_length=1),
    room_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Tìm kiếm nội dung tin nhắn trên toàn hệ thống hoặc theo phòng.
    """
    mongo_query = {
        "content": {"$regex": re.escape(query), "$options": "i"},
        "deleted_by_users": {"$ne": current_user["id"]}
    }
    
    # Isolation logic cho tìm kiếm (Chỉ thấy tin nhắn của mình trong các phòng biệt lập)
    isolation_clause = {
        "$or": [
            {"room_id": {"$nin": ["ai", "help"]}},
            {"sender_id": current_user["id"]},
            {"receiver_id": current_user["id"]}
        ]
    }
    
    if room_id:
        mongo_query["room_id"] = room_id
        if room_id in ["ai", "help"]:
            mongo_query["$or"] = [
                {"sender_id": current_user["id"]},
                {"receiver_id": current_user["id"]}
            ]
    else:
        # Nếu tìm kiếm global, phải tránh lộ tin nhắn AI/Help của người khác
        mongo_query.update(isolation_clause)
    
    messages = await db["messages"].find(mongo_query).sort("timestamp", -1).limit(limit).to_list(length=limit)
    return messages

@router.delete("/{room_id}/clear/")
async def clear_room_messages(
    room_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Xóa lịch sử trò chuyện từ phía người dùng hiện tại (Messenger style).
    """
    # Thêm user_id vào mảng deleted_by_users của tất cả tin nhắn hiện tại trong phòng
    await db["messages"].update_many(
        {"room_id": room_id},
        {"$addToSet": {"deleted_by_users": current_user["id"]}}
    )
    return {"status": "success", "message": "Chat history cleared for you"}
