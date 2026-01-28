from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import re
import uuid

from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.schemas.room import Room as RoomSchema
from pydantic import BaseModel

router = APIRouter()

class UserOut(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_friend: Optional[bool] = False
    is_online: Optional[bool] = False
    last_seen: Optional[datetime] = None
    request_sent: Optional[bool] = False
    is_blocked: Optional[bool] = False
    blocked_by_other: Optional[bool] = False
    allow_stranger_messages: bool = True
    request_id: Optional[str] = None
    message_count: Optional[int] = 0
    friend_count: Optional[int] = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("/search", response_model=List[UserOut])
async def search_users(
    q: str = Query(..., min_length=1),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Tìm kiếm người dùng theo username và kiểm tra quan hệ bạn bè.
    """
    mongo_query = {
        "$or": [
            {"username": {"$regex": re.escape(q), "$options": "i"}},
            {"full_name": {"$regex": re.escape(q), "$options": "i"}}
        ],
        "is_superuser": False,  # Không tìm thấy Admin trong tìm kiếm thông thường
        "id": {
            "$ne": current_user["id"],
            "$nin": current_user.get("blocked_users", []) # Không tìm thấy người mình đã chặn
        }
    }
    
    # Lọc những người đã chặn mình
    blocked_by_query = await db["users"].find({"blocked_users": current_user["id"]}).to_list(length=100)
    blocked_me_ids = [u["id"] for u in blocked_by_query]
    
    if blocked_me_ids:
        mongo_query["id"]["$nin"].extend(blocked_me_ids)

    users = await db["users"].find(mongo_query).limit(10).to_list(length=10)
    
    results = []
    for user_data in users:
        # Ràng buộc: Ẩn trạng thái online nếu user đó không muốn hiển thị
        if not user_data.get("show_online_status", True):
            user_data["is_online"] = False
            
        user_out = UserOut(**user_data)
        
        # Kiểm tra xem đã là bạn chưa
        friend_check = await db["friend_requests"].find_one({
            "$or": [
                {"from_id": current_user["id"], "to_id": user_data["id"], "status": "accepted"},
                {"from_id": user_data["id"], "to_id": current_user["id"], "status": "accepted"}
            ]
        })
        is_friend = bool(friend_check)
        user_out.is_friend = is_friend
        
        # Ràng buộc: Chỉ bạn bè mới thấy được trạng thái online
        if not is_friend:
            user_out.is_online = False
        elif not user_data.get("show_online_status", True):
            # Nếu là bạn mà họ cài đặt ẩn thì vẫn ẩn
            user_out.is_online = False
        
        # Kiểm tra xem có lời mời nào đang chờ không
        pending_check = await db["friend_requests"].find_one({
            "from_id": current_user["id"],
            "to_id": user_data["id"],
            "status": "pending"
        })
        user_out.request_sent = bool(pending_check)
        if pending_check:
            user_out.request_id = pending_check["id"]
            
        results.append(user_out)
        
    return results

@router.get("/{user_id}/profile", response_model=UserOut)
async def get_user_profile(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Xem profile của người dùng khác kèm theo thống kê.
    """
    user_data = await db["users"].find_one({"id": user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    # Tính toán thống kê
    message_count = await db["messages"].count_documents({"sender_id": user_id})
    friend_count = await db["friend_requests"].count_documents({
        "$or": [
            {"from_id": user_id, "status": "accepted"},
            {"to_id": user_id, "status": "accepted"}
        ]
    })
    
    # Ràng buộc: Chặn xem profile nếu có quan hệ chặn
    if user_id in current_user.get("blocked_users", []) or current_user["id"] in user_data.get("blocked_users", []):
        # Chỉ cho phép xem các thông tin công khai tối thiểu hoặc báo lỗi
        user_data["is_online"] = False
        user_data["bio"] = "Thông tin không khả dụng"
        user_data["show_online_status"] = False
    
    user_data["message_count"] = message_count
    user_data["friend_count"] = friend_count
    
    # Ràng buộc trạng thái hoạt động
    if not user_data.get("show_online_status", True):
        user_data["is_online"] = False
    
    user_out = UserOut(**user_data)
    
    # Check relationship
    friend_check = await db["friend_requests"].find_one({
        "$or": [
            {"from_id": current_user["id"], "to_id": user_id, "status": "accepted"},
            {"from_id": user_id, "to_id": current_user["id"], "status": "accepted"}
        ]
    })
    is_friend = bool(friend_check)
    user_out.is_friend = is_friend
    
    # Ràng buộc: Chỉ bạn bè mới thấy được trạng thái online
    if not is_friend:
        user_out.is_online = False
    elif not user_data.get("show_online_status", True):
        # Nếu là bạn mà họ cài đặt ẩn thì vẫn ẩn
        user_out.is_online = False
    
    # Check if blocked
    user_out.is_blocked = user_id in current_user.get("blocked_users", [])
    user_out.blocked_by_other = current_user["id"] in user_data.get("blocked_users", [])
    
    return user_out

@router.post("/friend-request/{user_id}")
async def send_friend_request(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Gửi lời mời kết bạn.
    """
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể kết bạn với chính mình")
    
    # Kiểm tra chặn
    target = await db["users"].find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
        
    if user_id in current_user.get("blocked_users", []) or current_user["id"] in target.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="Không thể thực hiện yêu cầu này.")

    # Check existing request
    existing = await db["friend_requests"].find_one({
        "$or": [
            {"from_id": current_user["id"], "to_id": user_id},
            {"from_id": user_id, "to_id": current_user["id"]}
        ]
    })
    
    if existing:
        if existing["status"] == "accepted":
            return {"message": "Đã là bạn bè"}
        if existing["status"] == "pending":
            return {"message": "Lời mời đang được xử lý"}
            
    new_request = {
        "id": str(uuid.uuid4()),
        "from_id": current_user["id"],
        "to_id": user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    await db["friend_requests"].insert_one(new_request)
    return {"message": "Đã gửi lời mời kết bạn"}

@router.post("/friend-request/{request_id}/accept")
async def accept_friend_request(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Chấp nhận lời mời kết bạn và tự động tạo phòng chat 1-1.
    """
    request = await db["friend_requests"].find_one({"id": request_id, "to_id": current_user["id"], "status": "pending"})
    if not request:
        raise HTTPException(status_code=404, detail="Lời mời không tồn tại hoặc đã xử lý")

    result = await db["friend_requests"].update_one(
        {"id": request_id},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc)}}
    )
    
    # Tự động tạo phòng chat 1-1 nếu chưa có
    from_id = request["from_id"]
    from_user = await db["users"].find_one({"id": from_id})
    
    if from_user:
        ids = sorted([current_user["id"], from_id])
        room_id = f"direct_{ids[0]}_{ids[1]}"
        
        existing_room = await db["chat_rooms"].find_one({"id": room_id})
        if not existing_room:
            # Create new direct chat room
            new_room = {
                "id": room_id,
                "name": from_user["username"], # Tên tạm, sẽ được override bởi logic hiển thị
                "type": "direct",
                "icon": "person",
                "updated_at": datetime.now(timezone.utc)
            }
            await db["chat_rooms"].insert_one(new_room)
            
            # Add both members
            members = [
                {"room_id": room_id, "user_id": current_user["id"], "joined_at": datetime.now(timezone.utc)},
                {"room_id": room_id, "user_id": from_id, "joined_at": datetime.now(timezone.utc)}
            ]
            await db["room_members"].insert_many(members)

            # Thông báo trạng thái online mới cho nhau
            from backend.app.api.v1.endpoints.websocket import notify_friend_status_change
            await notify_friend_status_change(current_user["id"], from_id, "accepted")

            return {"message": "Đã trở thành bạn bè", "room_id": room_id}
        
        # Thông báo trạng thái online mới cho nhau ngay cả khi phòng đã tồn tại
        from backend.app.api.v1.endpoints.websocket import notify_friend_status_change
        await notify_friend_status_change(current_user["id"], from_id, "accepted")
        
        return {"message": "Đã trở thành bạn bè", "room_id": room_id}
    
    return {"message": "Đã trở thành bạn bè"}

@router.post("/friend-request/{user_id}/unfriend")
async def unfriend_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Hủy kết bạn với một người dùng.
    """
    result = await db["friend_requests"].delete_many({
        "$or": [
            {"from_id": current_user["id"], "to_id": user_id, "status": "accepted"},
            {"from_id": user_id, "to_id": current_user["id"], "status": "accepted"}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hai người chưa là bạn bè")
    
    # Thông báo trạng thái online sẽ bị ẩn
    from backend.app.api.v1.endpoints.websocket import notify_friend_status_change
    await notify_friend_status_change(current_user["id"], user_id, "deleted")
        
    return {"message": "Đã hủy kết bạn"}

@router.post("/friend-request/{request_id}/reject")
async def reject_friend_request(
    request_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Từ chối lời mời kết bạn.
    """
    result = await db["friend_requests"].delete_one(
        {"id": request_id, "to_id": current_user["id"], "status": "pending"}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lời mời không tồn tại")
    
    return {"message": "Đã từ chối lời mời"}

@router.get("/friend-requests/pending")
async def get_pending_requests(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Danh sách lời mời kết bạn đang chờ.
    """
    requests = await db["friend_requests"].find({
        "to_id": current_user["id"],
        "status": "pending"
    }).to_list(length=50)
    
    results = []
    for req in requests:
        from_user = await db["users"].find_one({"id": req["from_id"]})
        if from_user:
            results.append({
                "request_id": req["id"],
                "user_id": from_user["id"],
                "username": from_user["username"],
                "avatar_url": from_user.get("avatar_url"),
                "created_at": req["created_at"]
            })
    return results

@router.get("/friends", response_model=List[UserOut])
async def get_friends_list(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Danh sách bạn bè đã kết nối.
    """
    friends_reqs = await db["friend_requests"].find({
        "$or": [
            {"from_id": current_user["id"], "status": "accepted"},
            {"to_id": current_user["id"], "status": "accepted"}
        ]
    }).sort("accepted_at", -1).to_list(length=100)
    
    friend_ids = []
    for req in friends_reqs:
        if req["from_id"] == current_user["id"]:
            friend_ids.append(req["to_id"])
        else:
            friend_ids.append(req["from_id"])
            
    users = await db["users"].find({"id": {"$in": friend_ids}}).to_list(length=100)
    
    # Ràng buộc trạng thái hoạt động cho danh sách bạn bè
    for u in users:
        if not u.get("show_online_status", True):
            u["is_online"] = False
            
    return [UserOut(**u, is_friend=True) for u in users]

@router.post("/direct-chat/{user_id}", response_model=RoomSchema)
async def start_direct_chat(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Bắt đầu chat 1-1 với người dùng khác.
    Kiểm tra quyền riêng tư: nếu đối phương không cho phép người lạ nhắn tin, 
    chỉ cho phép nếu đã là bạn bè.
    """
    # Check if target user exists
    target = await db["users"].find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể nhắn tin với chính mình")

    # Kiểm tra xem có bị chặn không
    if user_id in current_user.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="Bạn đã chặn người dùng này.")
    
    if current_user["id"] in target.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="Bạn đã bị người dùng này chặn.")

    # Kiểm tra quan hệ bạn bè
    is_friend_req = await db["friend_requests"].find_one({
        "status": "accepted",
        "$or": [
            {"from_id": current_user["id"], "to_id": user_id},
            {"from_id": user_id, "to_id": current_user["id"]}
        ]
    })
    is_friend = bool(is_friend_req)

    # Kiểm tra quyền riêng tư của đối phương
    allow_strangers = target.get("allow_stranger_messages", True)
    
    if not allow_strangers and not is_friend:
        raise HTTPException(
            status_code=403, 
            detail="Người dùng này chỉ nhận tin nhắn từ bạn bè."
        )

    ids = sorted([current_user["id"], user_id])
    room_id = f"direct_{ids[0]}_{ids[1]}"
    
    existing_room = await db["chat_rooms"].find_one({"id": room_id})
    if existing_room:
        if "_id" in existing_room:
            existing_room.pop("_id")
        return existing_room

    # Create new direct chat room
    new_room = {
        "id": room_id,
        "name": target["username"],
        "type": "direct",
        "icon": "person",
        "updated_at": datetime.now(timezone.utc)
    }
    
    try:
        await db["chat_rooms"].insert_one(new_room)
        
        # Add both members
        members = [
            {"room_id": room_id, "user_id": current_user["id"], "joined_at": datetime.now(timezone.utc)},
            {"room_id": room_id, "user_id": user_id, "joined_at": datetime.now(timezone.utc)}
        ]
        await db["room_members"].insert_many(members)
        
        # Thông báo cho đối phương qua WebSocket để cập nhật Sidebar realtime
        try:
            from .ws.manager import manager
            await manager.send_to_user(user_id, {
                "type": "new_room",
                "room": {
                    "id": room_id,
                    "name": current_user["username"],
                    "type": "direct",
                    "other_user_id": current_user["id"],
                    "avatar_url": current_user.get("avatar_url") or current_user.get("avatar"),
                    "updated_at": new_room["updated_at"].isoformat(),
                    "is_online": current_user.get("is_online", False)
                }
            })
        except:
            pass

        if "_id" in new_room:
            new_room.pop("_id")
        return new_room
    except Exception as e:
        # Xử lý trường hợp race condition hoặc lỗi trùng lặp
        if "duplicate key" in str(e).lower():
            # Thử tìm lại lần nữa nếu do race condition
            room = await db["chat_rooms"].find_one({"id": room_id})
            if room:
                if "_id" in room: room.pop("_id")
                return room
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

@router.post("/block/{user_id}")
async def block_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Chặn một người dùng.
    """
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể chặn chính mình")
        
    await db["users"].update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"blocked_users": user_id}}
    )

    # Ràng buộc logic nghiệp vụ: Tự động hủy kết bạn hoặc lời mời khi chặn
    await db["friend_requests"].delete_many({
        "$or": [
            {"from_id": current_user["id"], "to_id": user_id},
            {"from_id": user_id, "to_id": current_user["id"]}
        ]
    })
    
    # Thông báo thời gian thực cho người bị chặn
    from backend.app.api.v1.endpoints.websocket import notify_block_status_change
    await notify_block_status_change(user_id, current_user["id"], True)
    
    return {"message": "Đã chặn người dùng này"}

@router.post("/unblock/{user_id}")
async def unblock_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Bỏ chặn một người dùng.
    """
    await db["users"].update_one(
        {"id": current_user["id"]},
        {"$pull": {"blocked_users": user_id}}
    )

    # Thông báo thời gian thực cho người được bỏ chặn
    from backend.app.api.v1.endpoints.websocket import notify_block_status_change
    await notify_block_status_change(user_id, current_user["id"], False)

    return {"message": "Đã bỏ chặn người dùng này"}

@router.get("/blocked-list", response_model=List[UserOut])
async def get_blocked_list(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Lấy danh sách người dùng đã chặn.
    """
    user = await db["users"].find_one({"id": current_user["id"]})
    blocked_ids = user.get("blocked_users", [])
    
    if not blocked_ids:
        return []
        
    users = await db["users"].find({"id": {"$in": blocked_ids}}).to_list(length=100)
    return [UserOut(**u) for u in users]
