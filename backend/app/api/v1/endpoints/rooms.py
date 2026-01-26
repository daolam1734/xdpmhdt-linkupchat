from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid

from backend.app.db.session import get_db
from backend.app.schemas.room import Room, RoomCreate, GroupCreate
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

    # LinkUp Refinement: Cho phép Admin thấy phòng Help để hỗ trợ khách hàng
    is_admin = current_user.get("is_superuser") or current_user.get("role") == "admin"
    query = {
        "$or": [
            {"type": "public"},
            {"id": "ai"},
            {"id": "help"}, # Mọi người đều thấy phòng Help
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
        if room["id"] == "ai":
            msg_query["$or"] = [
                {"sender_id": current_user["id"]},
                {"receiver_id": current_user["id"]}
            ]
        elif room["id"] == "help":
            # Nếu không phải admin, chỉ thấy thread của chính mình
            if not is_admin:
                msg_query["$or"] = [
                    {"sender_id": current_user["id"]},
                    {"receiver_id": current_user["id"]}
                ]
            else:
                # Nếu là admin, đổi tên phòng để phân biệt
                room["name"] = "Hỗ trợ khách hàng (Admin)"
                # msg_query giữ nguyên để admin thấy mọi tin nhắn
                
                # Tính toán unread_count cho admin: Tin nhắn từ User/Bot chưa được Admin phản hồi
                # Logic đơn giản: Nếu tin nhắn cuối cùng không phải của một admin
                last_msg_check = await db["messages"].find({"room_id": "help"}).sort("timestamp", -1).limit(1).to_list(1)
                if last_msg_check:
                    last_sender_id = last_msg_check[0].get("sender_id")
                    last_sender = await db["users"].find_one({"id": last_sender_id})
                    is_last_sender_admin = last_sender and (last_sender.get("is_superuser") or last_sender.get("role") == "admin")
                    if not is_last_sender_admin:
                        room["has_unread"] = True
                        room["unread_count"] = 1 # Simplified indicator

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
                    
                    # Kiểm tra bạn bè: Chỉ hiện online nếu đã kết bạn
                    is_friend = await db["friend_requests"].find_one({
                        "status": "accepted",
                        "$or": [
                            {"from_id": current_user["id"], "to_id": other_user["id"]},
                            {"from_id": other_user["id"], "to_id": current_user["id"]}
                        ]
                    })
                    
                    # Ràng buộc: Chỉ hiển thị online nếu là bạn bè và user đó cho phép và KHÔNG có quan hệ chặn
                    is_online = False
                    if is_friend:
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

@router.post("/group", response_model=Room)
async def create_group_chat(
    *,
    db: AsyncIOMotorDatabase = Depends(get_db),
    group_in: GroupCreate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Tạo một nhóm chat mới với bạn bè.
    """
    if not group_in.name.strip():
        raise HTTPException(status_code=400, detail="Tên nhóm không được để trống")
        
    room_id = f"group_{uuid.uuid4().hex[:8]}"
    
    # Check members
    member_ids = list(set(group_in.member_ids + [current_user["id"]]))
    if len(member_ids) < 3:
        raise HTTPException(status_code=400, detail="Nhóm chat phải có ít nhất 3 thành viên")

    db_obj = {
        "id": room_id,
        "name": group_in.name,
        "type": "group",
        "icon": "users",
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db["chat_rooms"].insert_one(db_obj)
    
    # Add members
    members = [
        {
            "room_id": room_id,
            "user_id": uid,
            "joined_at": datetime.now(timezone.utc),
            "role": "admin" if uid == current_user["id"] else "member"
        }
        for uid in member_ids
    ]
    await db["room_members"].insert_many(members)
    
    # Broadcast to members to update their sidebar
    try:
        from .ws.manager import manager
        await manager.broadcast_to_room(room_id, {
            "type": "new_room",
            "room": {
                "id": room_id,
                "name": group_in.name,
                "type": "group",
                "icon": "users",
                "updated_at": db_obj["updated_at"].isoformat()
            }
        })
    except Exception as e:
        print(f"Error broadcasting new group: {e}")

    if "_id" in db_obj: db_obj.pop("_id")
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

@router.delete("/{room_id}")
async def delete_room_for_user(
    room_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Xóa phòng chat đối với người dùng nội bộ (rời phòng hoặc ẩn direct chat).
    """
    if room_id in ["ai", "help", "general"]:
        raise HTTPException(status_code=400, detail="Không thể xóa các phòng hệ thống.")
        
    result = await db["room_members"].delete_one({
        "room_id": room_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bạn không tham gia phòng này.")
        
    return {"status": "success", "message": "Đã xóa đoạn chat khỏi danh sách"}
