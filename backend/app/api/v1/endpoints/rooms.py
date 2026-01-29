from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import uuid

from backend.app.db.session import get_db
from backend.app.schemas.room import Room, RoomCreate, GroupCreate, RoomUpdate, AddMembers, MemberRoleUpdate
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
            # LinkUp: Cả admin và user đều chỉ thấy thread cá nhân của mình trong ChatPage để đồng bộ trải nghiệm
            # Thread cá nhân: sender_id là mình và không có người nhận cụ thể (gửi cho hệ thống/AI)
            # HOẶC mình là người nhận (hệ thống/admin khác phản hồi mình)
            msg_query["$or"] = [
                {"sender_id": current_user["id"], "receiver_id": None},
                {"receiver_id": current_user["id"]}
            ]
            
            room["name"] = "Help & Support"
            
            # Thêm metadata status cho người dùng hiện tại
            thread = await db["support_threads"].find_one({"user_id": current_user["id"]})
            if thread:
                room["support_status"] = thread.get("status")
                room["support_note"] = thread.get("internal_note")

        last_msg = await db["messages"].find(msg_query).sort("timestamp", -1).limit(1).to_list(length=1)
        
        last_message_content = None
        last_message_id = None
        last_message_sender = None
        last_message_at = None
        
        if last_msg:
            last_message_id = str(last_msg[0].get("id"))
            if last_msg[0].get("is_recalled"):
                last_message_content = "Tin nhắn đã được thu hồi"
            elif last_msg[0].get("file_url"):
                file_type = last_msg[0].get("file_type")
                if file_type == "image":
                    last_message_content = "[Hình ảnh]"
                else:
                    last_message_content = "[Tệp đính kèm]"
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
                    other_name = other_user.get("full_name") or other_user["username"]
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
            "role": "owner" if uid == current_user["id"] else "member"
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
    Rời phòng hoặc xóa cuộc hội thoại khỏi danh sách.
    Nếu là Trưởng nhóm rời đi, sẽ tự động chuyển quyền cho Phó nhóm hoặc thành viên lâu năm nhất.
    """
    if room_id in ["ai", "help", "general"]:
        raise HTTPException(status_code=400, detail="Không thể xóa các phòng hệ thống.")
        
    # Lấy thông tin membership hiện tại
    membership = await db["room_members"].find_one({
        "room_id": room_id,
        "user_id": current_user["id"]
    })
    
    if not membership:
        raise HTTPException(status_code=404, detail="Bạn không tham gia phòng này.")
        
    # Kiểm tra loại phòng
    room = await db["chat_rooms"].find_one({"id": room_id})
    if room and room.get("type") == "group":
        # Logic rời nhóm
        if membership.get("role") == "owner":
            # Trưởng nhóm rời đi -> Tìm người kế nhiệm
            # Ưu tiên phó nhóm (admin) gia nhập lâu nhất, sau đó đến thành viên (member) gia nhập lâu nhất
            successor = await db["room_members"].find_one(
                {"room_id": room_id, "user_id": {"$ne": current_user["id"]}},
                sort=[("role", 1), ("joined_at", 1)] # 'admin' < 'member' (alphabetical), sau đó theo thời gian
            )
            
            if successor:
                await db["room_members"].update_one(
                    {"room_id": room_id, "user_id": successor["user_id"]},
                    {"$set": {"role": "owner"}}
                )
                
                # Thông báo quyền sở hữu mới qua WS
                try:
                    from .ws.manager import manager
                    await manager.broadcast_to_room(room_id, {
                        "type": "member_role_updated",
                        "room_id": room_id,
                        "user_id": successor["user_id"],
                        "new_role": "owner",
                        "note": f"Phòng chat đã có trưởng nhóm mới."
                    })
                except Exception as e:
                    print(f"Error broadcasting owner transfer: {e}")
            else:
                # Không còn ai trong nhóm -> Có thể xóa luôn group nếu muốn, hoặc để đó
                # Ở đây ta giữ lại group rỗng hoặc xóa tùy chính sách. LinkUp chọn để rỗng để tránh mất data nếu admin quay lại (tùy chỉnh)
                pass

    result = await db["room_members"].delete_one({
        "room_id": room_id,
        "user_id": current_user["id"]
    })

    # Thông báo member rời đi
    try:
        from .ws.manager import manager
        await manager.broadcast_to_room(room_id, {
            "type": "member_left",
            "room_id": room_id,
            "user_id": current_user["id"]
        })
    except Exception as e:
        print(f"Error broadcasting member leave: {e}")
    
    return {"status": "success", "message": "Đã rời khỏi phòng chat"}

@router.get("/{room_id}/members")
async def get_room_members(
    room_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Lấy danh sách thành viên của một phòng chat.
    """
    # Lấy IDs thành viên
    memberships = await db["room_members"].find({"room_id": room_id}).to_list(length=100)
    user_ids = [m["user_id"] for m in memberships]
    
    # Lấy thông tin chi tiết người dùng
    users = await db["users"].find({"id": {"$in": user_ids}}).to_list(length=100)
    
    # Kết hợp thông tin role từ membership
    final_members = []
    membership_map = {m["user_id"]: m for m in memberships}
    
    for user in users:
        m = membership_map.get(user["id"], {})
        final_members.append({
            "id": user["id"],
            "username": user["username"],
            "full_name": user.get("full_name"),
            "avatar_url": user.get("avatar_url"),
            "is_online": user.get("is_online", False),
            "role": m.get("role", "member"),
            "joined_at": m.get("joined_at")
        })
        
    return final_members

@router.patch("/{room_id}", response_model=Room)
async def update_room(
    room_id: str,
    room_in: RoomUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Cập nhật thông tin phòng (Tên, Ảnh đại diện). Chỉ dành cho Admin của phòng.
    """
    membership = await db["room_members"].find_one({
        "room_id": room_id,
        "user_id": current_user["id"]
    })
    
    if not membership or (membership.get("role") not in ["admin", "owner"] and not current_user.get("is_superuser")):
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa thông tin phòng này.")

    update_data = {k: v for k, v in room_in.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db["chat_rooms"].update_one(
        {"id": room_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")
        
    room = await db["chat_rooms"].find_one({"id": room_id})
    
    # Notify members
    try:
        from .ws.manager import manager
        await manager.broadcast_to_room(room_id, {
            "type": "room_updated",
            "room": {
                "id": room_id,
                "name": room.get("name"),
                "avatar_url": room.get("avatar_url")
            }
        })
    except Exception as e:
        print(f"Error broadcasting room update: {e}")
        
    return room

@router.delete("/{room_id}/members/{user_id}")
async def remove_room_member(
    room_id: str,
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Xóa thành viên khỏi phòng (Chỉ Admin/Owner có quyền)
    """
    # 1. Kiểm tra quyền của người gọi
    caller_membership = await db["room_members"].find_one({
        "room_id": room_id,
        "user_id": current_user["id"]
    })
    
    if not caller_membership or (caller_membership.get("role") not in ["admin", "owner"] and not current_user.get("is_superuser")):
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới có quyền xóa thành viên.")

    # 2. Kiểm tra role của người bị xóa (Admin không thể xóa Owner)
    target_membership = await db["room_members"].find_one({
        "room_id": room_id,
        "user_id": user_id
    })
    
    if not target_membership:
        raise HTTPException(status_code=404, detail="Thành viên không tìm thấy trong phòng.")
        
    if target_membership.get("role") == "owner" and not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="Không thể xóa trưởng nhóm.")
        
    if caller_membership.get("role") == "admin" and target_membership.get("role") == "admin" and user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Phó nhóm không thể xóa phó nhóm khác.")

    # 3. Thực hiện xóa
    await db["room_members"].delete_one({
        "room_id": room_id,
        "user_id": user_id
    })
    
    # 4. Thông báo qua WS
    try:
        from .ws.manager import manager
        await manager.broadcast_to_room(room_id, {
            "type": "member_left",
            "room_id": room_id,
            "user_id": user_id
        })
    except Exception as e:
        print(f"Error broadcasting member left: {e}")
        
    return {"status": "success", "message": "Đã xóa thành viên khỏi nhóm"}

@router.post("/{room_id}/members")
async def add_room_members(
    room_id: str,
    members_in: AddMembers,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Thêm thành viên mới vào phòng.
    """
    room = await db["chat_rooms"].find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")
        
    # Check if user is in room
    membership = await db["room_members"].find_one({"room_id": room_id, "user_id": current_user["id"]})
    if not membership:
        raise HTTPException(status_code=403, detail="Bạn phải là thành viên để thêm người khác.")

    new_members = []
    for uid in members_in.member_ids:
        # Check if already a member
        exists = await db["room_members"].find_one({"room_id": room_id, "user_id": uid})
        if not exists:
            new_members.append({
                "room_id": room_id,
                "user_id": uid,
                "joined_at": datetime.now(timezone.utc),
                "role": "member"
            })
            
    if new_members:
        await db["room_members"].insert_many(new_members)
        
        # Notify room
        try:
            from .ws.manager import manager
            await manager.broadcast_to_room(room_id, {
                "type": "members_added",
                "room_id": room_id,
                "count": len(new_members)
            })
        except Exception as e:
            print(f"Error broadcasting members added: {e}")

    return {"status": "success", "added_count": len(new_members)}

@router.patch("/{room_id}/members/{user_id}/role")
async def update_member_role(
    room_id: str,
    user_id: str,
    role_update: MemberRoleUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Cập nhật vai trò của thành viên trong nhóm (Trưởng nhóm/Thành viên)
    """
    # 1. Kiểm tra xem người dùng hiện tại có quyền Owner (Trưởng nhóm) không
    caller_membership = await db["room_members"].find_one({
        "room_id": room_id, 
        "user_id": current_user["id"]
    })
    
    if not caller_membership or (caller_membership.get("role") != "owner" and not current_user.get("is_superuser")):
        raise HTTPException(status_code=403, detail="Chỉ trưởng nhóm mới có quyền bổ nhiệm hoặc gỡ phó nhóm.")

    # 2. Không cho phép tự thay đổi role của mình
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Trưởng nhóm không thể tự thay đổi vai trò của mình. Vui lòng chuyển nhượng nhóm.")

    # 3. Cập nhật role cho member đích (chỉ cho phép admin hoặc member)
    if role_update.role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")

    result = await db["room_members"].update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"role": role_update.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Thành viên không tìm thấy trong phòng.")

    # 4. Thông báo qua WebSocket
    try:
        from .ws.manager import manager
        await manager.broadcast_to_room(room_id, {
            "type": "member_role_updated",
            "room_id": room_id,
            "user_id": user_id,
            "new_role": role_update.role
        })
    except Exception as e:
        print(f"Error broadcasting role update: {e}")

    return {"status": "success", "new_role": role_update.role}
