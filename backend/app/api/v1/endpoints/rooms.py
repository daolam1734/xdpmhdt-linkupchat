from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

from backend.app.db.session import get_db
from backend.app.schemas.room import Room, RoomCreate
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Room])
async def get_rooms(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Truy xuất danh sách tất cả các kênh thảo luận:
    - Các phòng Public
    - Các phòng người dùng tham gia (Private/Direct/AI)
    """
    # Lấy IDs các phòng mà người dùng là thành viên
    memberships = await db["room_members"].find({"user_id": current_user["id"]}).to_list(length=1000)
    user_room_ids = [m["room_id"] for m in memberships]

    # Truy vấn các phòng Public, AI, Help hoặc các phòng user đã tham gia
    query = {
        "$or": [
            {"type": "public"},
            {"id": {"$in": ["ai", "help"]}},
            {"id": {"$in": user_room_ids}}
        ]
    }
    
    rooms_list = await db["chat_rooms"].find(query).sort("updated_at", -1).to_list(length=100)
    
    # Xử lý thông tin bổ sung cho từng phòng
    final_rooms = []
    for room in rooms_list:
        # Lấy thông tin member của user hiện tại
        membership = await db["room_members"].find_one({
            "room_id": room["id"],
            "user_id": current_user["id"]
        })
        is_pinned = membership.get("is_pinned", False) if membership else False

        # Lấy tin nhắn cuối cùng (không bị người dùng xóa phía họ)
        msg_query = {
            "room_id": room["id"],
            "deleted_by_users": {"$ne": current_user["id"]}
        }
        
        # Isolation logic cho phòng đặc biệt (AI, Help)
        if room["id"] in ["ai", "help"]:
            msg_query["$or"] = [
                {"sender_id": current_user["id"]},
                {"receiver_id": current_user["id"]}
            ]

        last_msg = await db["messages"].find(msg_query).sort("timestamp", -1).limit(1).to_list(length=1)
        
        last_message_content = None
        last_message_id = None
        last_message_sender = None
        last_message_at = None
        
        if last_msg:
            last_message_id = str(last_msg[0].get("id"))
            if last_msg[0].get("is_recalled"):
                last_message_content = "Tin nhắn đã được thu hồi"
            else:
                last_message_content = last_msg[0].get("content")
            last_message_sender = last_msg[0].get("sender_name")
            last_message_at = last_msg[0].get("timestamp")

        if room["type"] == "direct":
            # Tìm tên của người kia trong cuộc trò chuyện 1-1
            other_member = await db["room_members"].find_one({
                "room_id": room["id"],
                "user_id": {"$ne": current_user["id"]}
            })
            
            other_name = "Unknown"
            other_avatar = None
            is_online = False
            if other_member:
                other_user = await db["users"].find_one({"id": other_member["user_id"]})
                if other_user:
                    other_name = other_user["username"]
                    other_avatar = other_user.get("avatar_url")
                    # Ràng buộc: Chỉ hiển thị online nếu user đó cho phép và KHÔNG có quan hệ chặn
                    is_online = other_user.get("is_online", False) and other_user.get("show_online_status", True)
                    
                    if other_user["id"] in current_user.get("blocked_users", []):
                        is_online = False
                    
                    blocked_by_other = current_user["id"] in other_user.get("blocked_users", [])
                    if blocked_by_other:
                        is_online = False
            
            room_data = {
                "id": room["id"],
                "name": other_name,
                "type": room["type"],
                "other_user_id": other_member["user_id"] if other_member else None,
                "icon": room.get("icon"),
                "avatar_url": other_avatar,
                "is_online": is_online,
                "is_pinned": is_pinned,
                "blocked_by_other": blocked_by_other if other_member else False,
                "updated_at": room.get("updated_at"),
                "last_message": last_message_content,
                "last_message_id": last_message_id,
                "last_message_sender": last_message_sender,
                "last_message_at": last_message_at
            }
            final_rooms.append(room_data)
        else:
            room["last_message"] = last_message_content
            room["last_message_id"] = last_message_id
            room["last_message_sender"] = last_message_sender
            room["last_message_at"] = last_message_at
            room["is_pinned"] = is_pinned
            final_rooms.append(room)
            
    return final_rooms

@router.post("/", response_model=Room)
async def create_room(
    *,
    db: AsyncIOMotorDatabase = Depends(get_db),
    room_in: RoomCreate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Tạo một kênh thảo luận mới.
    """
    # Check if exists
    existing = await db["chat_rooms"].find_one({"id": room_in.id})
    if existing:
        raise HTTPException(status_code=400, detail="Mã định danh phòng đã tồn tại.")

    db_obj = {
        "id": room_in.id,
        "name": room_in.name,
        "icon": room_in.icon,
        "type": room_in.type,
        "updated_at": datetime.now(timezone.utc)
    }
    await db["chat_rooms"].insert_one(db_obj)
    return db_obj

@router.post("/{room_id}/pin")
async def toggle_pin_room(
    room_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Ghim hoặc bỏ ghim một phòng chat.
    """
    membership = await db["room_members"].find_one({
        "room_id": room_id,
        "user_id": current_user["id"]
    })
    
    if not membership:
        # Nếu chưa là thành viên (ví dụ phòng public), tự động thêm vào
        await db["room_members"].insert_one({
            "room_id": room_id,
            "user_id": current_user["id"],
            "joined_at": datetime.now(timezone.utc),
            "is_pinned": True
        })
        return {"status": "success", "is_pinned": True}
    
    new_status = not membership.get("is_pinned", False)
    await db["room_members"].update_one(
        {"room_id": room_id, "user_id": current_user["id"]},
        {"$set": {"is_pinned": new_status}}
    )
    return {"status": "success", "is_pinned": new_status}
