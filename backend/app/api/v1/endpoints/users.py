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
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_friend: Optional[bool] = False
    is_online: Optional[bool] = False
    last_seen: Optional[datetime] = None
    request_sent: Optional[bool] = False
    allow_stranger_messages: bool = True
    request_id: Optional[str] = None
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
        "username": {"$regex": re.escape(q), "$options": "i"},
        "id": {"$ne": current_user["id"]}
    }
    users = await db["users"].find(mongo_query).limit(10).to_list(length=10)
    
    results = []
    for user_data in users:
        user_out = UserOut(**user_data)
        
        # Kiểm tra xem đã là bạn chưa
        friend_check = await db["friend_requests"].find_one({
            "$or": [
                {"from_id": current_user["id"], "to_id": user_data["id"], "status": "accepted"},
                {"from_id": user_data["id"], "to_id": current_user["id"], "status": "accepted"}
            ]
        })
        user_out.is_friend = bool(friend_check)
        
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
    Xem profile của người dùng khác.
    """
    user_data = await db["users"].find_one({"id": user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    user_out = UserOut(**user_data)
    
    # Check relationship
    friend_check = await db["friend_requests"].find_one({
        "$or": [
            {"from_id": current_user["id"], "to_id": user_id, "status": "accepted"},
            {"from_id": user_id, "to_id": current_user["id"], "status": "accepted"}
        ]
    })
    user_out.is_friend = bool(friend_check)
    
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
    Chấp nhận lời mời kết bạn.
    """
    result = await db["friend_requests"].update_one(
        {"id": request_id, "to_id": current_user["id"], "status": "pending"},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lời mời không tồn tại hoặc đã xử lý")
    
    return {"message": "Đã trở thành bạn bè"}

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
    }).to_list(length=100)
    
    friend_ids = []
    for req in friends_reqs:
        if req["from_id"] == current_user["id"]:
            friend_ids.append(req["to_id"])
        else:
            friend_ids.append(req["from_id"])
            
    users = await db["users"].find({"id": {"$in": friend_ids}}).to_list(length=100)
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
