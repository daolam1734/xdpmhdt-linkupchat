from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
import os
import uuid
import io
import csv
from pydantic import BaseModel

from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user, get_current_active_superuser
from backend.app.schemas.user import User as UserSchema
from backend.app.schemas.admin import SystemConfigUpdate, SystemConfigResponse
from backend.app.core.config import settings

router = APIRouter()

@router.get("/config", response_model=SystemConfigResponse)
async def get_admin_config(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Lấy các cấu hình hệ thống (API keys, vv).
    """
    config = await db["system_configs"].find_one({"type": "api_keys"})
    if not config:
        # Fallback to env settings if not in DB
        return {
            "google_api_key": settings.GOOGLE_API_KEY,
            "openai_api_key": getattr(settings, "OPENAI_API_KEY", ""),
            "ai_auto_reply": True,
            "ai_sentiment_analysis": False,
            "ai_system_prompt": "Bạn là LinkUp AI, trợ lý ảo thông minh được phát triển để giúp người dùng kết nối. Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn bằng Tiếng Việt."
        }
    
    return {
        "google_api_key": config.get("google_api_key", settings.GOOGLE_API_KEY),
        "openai_api_key": config.get("openai_api_key", ""),
        "ai_auto_reply": config.get("ai_auto_reply", True),
        "ai_sentiment_analysis": config.get("ai_sentiment_analysis", False),
        "ai_system_prompt": config.get("ai_system_prompt", "Bạn là LinkUp AI, trợ lý ảo thông minh được phát triển để giúp người dùng kết nối. Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn bằng Tiếng Việt.")
    }

@router.post("/config")
async def update_admin_config(
    config_data: SystemConfigUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Cập nhật cấu hình hệ thống và đồng bộ với môi trường (.env).
    """
    # 1. Cập nhật Database
    configs = {k: v for k, v in config_data.configs.items() if k != "_id"}
    await db["system_configs"].update_one(
        {"type": "api_keys"},
        {"$set": {
            **configs,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": current_user.get("username")
        }},
        upsert=True
    )

    # 2. Cập nhật Settings trong bộ nhớ & ghi đè file .env
    new_google_key = configs.get("google_api_key")
    new_openai_key = configs.get("openai_api_key")
    
    # Cập nhật file .env vật lý
    try:
        # Tìm file .env ở thư mục gốc hoặc thư mục backend
        env_path = os.path.join(os.getcwd(), ".env")
        if not os.path.exists(env_path):
            backend_env = os.path.join(os.getcwd(), "backend", ".env")
            if os.path.exists(backend_env):
                env_path = backend_env

        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            new_lines = []
            keys_to_update = {
                "GOOGLE_API_KEY": new_google_key,
                "OPENAI_API_KEY": new_openai_key
            }
            updated_keys = set()

            for line in lines:
                matched = False
                for key, val in keys_to_update.items():
                    if line.startswith(f"{key}=") and val is not None:
                        new_lines.append(f"{key}={val}\n")
                        updated_keys.add(key)
                        matched = True
                        if key == "GOOGLE_API_KEY": settings.GOOGLE_API_KEY = val
                        if key == "OPENAI_API_KEY": settings.OPENAI_API_KEY = val
                        break
                if not matched:
                    new_lines.append(line)
            
            # Thêm các key chưa có trong file
            for key, val in keys_to_update.items():
                if key not in updated_keys and val:
                    new_lines.append(f"{key}={val}\n")
                    if key == "GOOGLE_API_KEY": settings.GOOGLE_API_KEY = val
                    if key == "OPENAI_API_KEY": settings.OPENAI_API_KEY = val
            
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
            print(f"✅ Đã đồng bộ API Keys mới vào file .env và bộ nhớ")
    except Exception as e:
        print(f"⚠️ Lỗi khi cập nhật .env: {e}")

    return {"status": "success"}

@router.get("/stats")
async def get_system_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    """
    Lấy thống kê hệ thống mở rộng.
    """
    import time
    start_time = time.time()
    # Loại bỏ Admin khỏi thống kê người dùng thông thường
    total_users = await db["users"].count_documents({"is_superuser": False})
    total_admins = await db["users"].count_documents({"is_superuser": True})
    total_messages = await db["messages"].count_documents({})
    total_rooms = await db["chat_rooms"].count_documents({})
    
    # Thời gian
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = now - timedelta(days=1)
    last_week = now - timedelta(days=7)
    
    # Thống kê tin nhắn
    new_messages = await db["messages"].count_documents({"timestamp": {"$gte": yesterday}})
    
    # Thống kê AI (Ước tính từ tin nhắn bot)
    ai_calls_today = await db["messages"].count_documents({
        "is_bot": True, 
        "timestamp": {"$gte": today}
    })

    # Thống kê báo cáo thực tế
    unhandled_reports = await db["reports"].count_documents({"status": "pending"}) if "reports" in await db.list_collection_names() else 0

    # Tính toán sức khỏe hệ thống
    db_size_mb = 0
    try:
        db_stats = await db.command("dbStats")
        db_size_mb = round(db_stats.get("dataSize", 0) / (1024 * 1024), 2)
    except:
        pass

    # Tính latency sớm để dùng cho alerts
    latency_ms = (time.time() - start_time) * 1000

    # Cảnh báo hệ thống thực tế dựa trên dữ liệu
    system_alerts = []
    
    if latency_ms > 100:
        system_alerts.append({
            "type": "server",
            "level": "warning",
            "message": f"Phản hồi DB chậm ({round(latency_ms, 1)}ms). Hãy kiểm tra chỉ mục (index).",
            "timestamp": now.isoformat()
        })
    
    # 1. Kiểm tra lẫy lỗi AI gần đây (nếu có log)
    # Ở đây ta giả định nếu số tin nhắn bot trong 1h qua = 0 mà có tin nhắn user tag @ai thì có thể AI lỗi
    # Nhưng đơn giản hơn: Trả về các log hệ thống thực tế nếu có collection "logs"
    
    # Thêm các cảnh báo dựa trên ngưỡng (Thresholds)
    if ai_calls_today > 500:
        system_alerts.append({
            "type": "ai",
            "level": "warning",
            "message": f"Lượt sử dụng AI cao ({ai_calls_today}). Kiểm tra hạn mức API.",
            "timestamp": now.isoformat()
        })
    
    if unhandled_reports > 5:
        system_alerts.append({
            "type": "security",
            "level": "critical",
            "message": f"Có {unhandled_reports} báo cáo vi phạm chưa xử lý!",
            "timestamp": now.isoformat()
        })

    # Nếu không có cảnh báo nào, thêm 1 tin nhắn "Hệ thống ổn định" mang tính thực tế
    if not system_alerts:
        system_alerts.append({
            "type": "server",
            "level": "info",
            "message": "Các dịch vụ hệ thống đang hoạt động bình thường.",
            "timestamp": now.isoformat()
        })

    # Thống kê người dùng (Chỉ tính người dùng thường)
    online_users = await db["users"].count_documents({"is_online": True, "is_superuser": False})
    new_users_24h = await db["users"].count_documents({"created_at": {"$gte": yesterday}, "is_superuser": False})
    new_users_7d = await db["users"].count_documents({"created_at": {"$gte": last_week}, "is_superuser": False})

    # Thống kê hỗ trợ thực tế (Số thread mà tin nhắn cuối cùng là của user - chưa trả lời)
    pipeline_support = [
        {"$match": {"room_id": "help"}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": {"$ifNull": ["$receiver_id", "$sender_id"]},
            "last_sender_id": {"$first": "$sender_id"}
        }},
        {"$match": {"last_sender_id": {"$ne": None}}} # Logic: Nếu sender_id ko phải admin (ở đây tạm so sánh khác null, thực tế nên check role)
    ]
    # Lấy danh sách admin để filter
    admins_cursor = db["users"].find({"is_superuser": True}, {"id": 1})
    admin_ids = [a["id"] for a in await admins_cursor.to_list(length=100)]
    
    support_threads = await db["messages"].aggregate(pipeline_support).to_list(length=100)
    pending_support = 0
    for thread in support_threads:
        if thread["last_sender_id"] not in admin_ids:
            pending_support += 1

    # Top Phòng chat sôi động nhất (Dựa trên số tin nhắn)
    # Sử dụng aggregation
    pipeline = [
        {"$group": {"_id": "$room_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_rooms_cursor = db["messages"].aggregate(pipeline)
    top_rooms_data = await top_rooms_cursor.to_list(length=5)
    
    top_rooms = []
    for item in top_rooms_data:
        room = await db["chat_rooms"].find_one({"_id": item["_id"] if isinstance(item["_id"], str) else str(item["_id"])})
        if room:
            top_rooms.append({
                "name": room.get("name", "Unknown"),
                "message_count": item["count"],
                "type": room.get("type", "public")
            })

    # Dữ liệu biểu đồ (Số tin nhắn mỗi giờ trong 24h qua)
    # Group by hour
    hourly_pipeline = [
        {"$match": {"timestamp": {"$gte": yesterday}}},
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    hourly_cursor = db["messages"].aggregate(hourly_pipeline)
    hourly_data = await hourly_cursor.to_list(length=24)
    
    # Tạo mảng 24 giờ đầy đủ (sắp xếp theo giờ hiện tại trở về trước)
    hourly_stats = [0] * 24
    for item in hourly_data:
        hour = item["_id"]
        if 0 <= hour < 24:
            hourly_stats[hour] = item["count"]
    
    # Sắp xếp lại để giờ hiện tại là cuối cùng
    current_hour = now.hour
    ordered_stats = []
    for i in range(24):
        h = (current_hour - 23 + i) % 24
        ordered_stats.append(hourly_stats[h])

    # Tính latency
    import time
    latency_ms = (time.time() - start_time) * 1000

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_messages": total_messages,
        "total_rooms": total_rooms,
        "new_messages_24h": new_messages,
        "online_users": online_users,
        "new_users_24h": new_users_24h,
        "new_users_7d": new_users_7d,
        "pending_support": pending_support,
        "ai_usage_count": ai_calls_today,
        "unhandled_reports": unhandled_reports,
        "db_size_mb": db_size_mb,
        "system_alerts": system_alerts,
        "top_rooms": top_rooms,
        "hourly_stats": ordered_stats,
        "latency_ms": round(latency_ms, 2)
    }

@router.get("/users", response_model=List[UserSchema])
async def get_all_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    """
    Danh sách tất cả người dùng (Quản trị).
    """
    users = await db["users"].find().sort("created_at", -1).to_list(length=100)
    return users

@router.get("/users/export")
async def export_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Xuất danh sách người dùng ra file CSV.
    """
    users = await db["users"].find().to_list(length=1000)
    
    output = io.StringIO()
    # Chèn BOM (Byte Order Mark) để Excel nhận dạng đúng UTF-8 (tiếng Việt)
    output.write('\ufeff')
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Username", "Họ Tên", "Email", "Số điện thoại", "Vai trò", "Admin?", "Ngày tạo", "Hoạt động cuối"])
    
    # Data
    for user in users:
        writer.writerow([
            user.get("id"),
            user.get("username"),
            user.get("full_name", ""),
            user.get("email", ""),
            user.get("phone", ""),
            user.get("role", "user"),
            "Có" if user.get("is_superuser") else "Không",
            user.get("created_at").astimezone(timezone(timedelta(hours=7))).strftime('%Y-%m-%d %H:%M:%S') if isinstance(user.get("created_at"), datetime) else "",
            user.get("last_seen").astimezone(timezone(timedelta(hours=7))).strftime('%Y-%m-%d %H:%M:%S') if isinstance(user.get("last_seen"), datetime) else ""
        ])
    
    output.seek(0)
    
    filename = f"danh_sach_nguoi_dung_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Xóa người dùng và các dữ liệu liên quan"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = await db["users"].delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Dọn dẹp dữ liệu liên quan
    await db["room_members"].delete_many({"user_id": user_id})
    # Tùy chọn: Xóa tin nhắn (thường thì giữ lại hoặc ẩn đi)
    # await db["messages"].delete_many({"sender_id": user_id})
    
    return {"status": "success", "message": "User deleted"}

@router.get("/support/conversations")
async def get_support_conversations(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Lấy danh sách các cuộc trò chuyện hỗ trợ (Những người đã nhắn tin vào phòng help).
    """
    # Group messages by the "Customer" (User receiving or sending help)
    pipeline = [
        {"$match": {"room_id": "help"}},
        {"$project": {
            "customer_id": {"$ifNull": ["$receiver_id", "$sender_id"]},
            "content": 1,
            "timestamp": 1,
            "sender_name": 1,
            "is_bot": 1
        }},
        # Loại bỏ các entry không có customer_id (ví dụ tin nhắn hệ thống lỗi)
        {"$match": {"customer_id": {"$ne": None}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$customer_id",
            "last_message": {"$first": "$content"},
            "timestamp": {"$first": "$timestamp"},
            "sender_name": {"$first": "$sender_name"}
        }},
        {"$sort": {"timestamp": -1}}
    ]
    
    conversations = await db["messages"].aggregate(pipeline).to_list(length=100)
    
    # Bổ sung thông tin user (avatar, online status)
    results = []
    # Lấy danh sách admin để loại bỏ họ khỏi danh sách "khách hàng" nếu lỡ bị group vào
    admin_ids = await db["users"].find({"is_superuser": True}, {"id": 1}).to_list(length=100)
    admin_id_set = {a["id"] for a in admin_ids}

    for conv in conversations:
        user_id = conv["_id"]
        if user_id in admin_id_set:
            continue
            
        user = await db["users"].find_one({"id": user_id})
        if user:
            results.append({
                "user_id": user_id,
                "username": user.get("username"),
                "avatar_url": user.get("avatar") or user.get("avatar_url"),
                "last_message": conv["last_message"],
                "timestamp": conv["timestamp"].isoformat() if isinstance(conv["timestamp"], datetime) else conv["timestamp"],
                "is_online": user.get("is_online", False),
                "unread_count": 0
            })
            
    return results

@router.get("/support/messages/{user_id}")
async def get_support_messages(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Lấy lịch sử tin nhắn hỗ trợ của một user cụ thể.
    """
    query = {
        "room_id": "help",
        "$or": [
            {"sender_id": user_id},
            {"receiver_id": user_id},
            # Bao gồm cả tin nhắn bot trả lời cho user này trong context help
            # (Thường bot sẽ trả lời và filter query này vẫn đúng nếu ta gán receiver_id cho bot msg)
            {"is_bot": True, "receiver_id": user_id},
            # Fallback cho tin nhắn bot cũ chưa có receiver_id nhưng thuộc user này (nếu có context)
            {"is_bot": True, "sender_id": user_id} 
        ]
    }
    
    messages = await db["messages"].find(query).sort("timestamp", 1).to_list(length=200)
    # Serialize MongoDB objects
    for msg in messages:
        if "_id" in msg: msg["_id"] = str(msg["_id"])
        if "timestamp" in msg:
            msg["timestamp"] = msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]
    return messages

class SupportReply(BaseModel):
    user_id: str
    content: str

@router.post("/support/reply")
async def support_reply(
    reply: SupportReply,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """
    Admin gửi phản hồi hỗ trợ cho một người dùng.
    """
    ts = datetime.now(timezone.utc)
    msg_id = str(uuid.uuid4())
    
    # Lưu vào DB
    db_msg = {
        "id": msg_id,
        "content": reply.content,
        "sender_id": current_user["id"],
        "sender_name": "Admin Support",
        "receiver_id": reply.user_id,
        "room_id": "help",
        "timestamp": ts,
        "is_bot": False,
        "deleted_by_users": []
    }
    await db["messages"].insert_one(db_msg)
    
    # Broadcast tới user (nếu online)
    from .ws.manager import manager
    metadata = {
        "type": "message",
        "id": msg_id,
        "content": reply.content,
        "sender_id": current_user["id"],
        "sender_name": "Admin Support",
        "sender_avatar": current_user.get("avatar_url") or current_user.get("avatar"),
        "room_id": "help",
        "receiver_id": reply.user_id,
        "timestamp": ts.isoformat()
    }
    await manager.send_to_user(reply.user_id, metadata)
    
    # Broadcast tới các Admin khác đang online để đồng bộ dashboard
    admins = await db["users"].find({"is_superuser": True, "is_online": True}).to_list(length=50)
    for admin in admins:
        await manager.send_to_user(admin["id"], metadata)

    return {"status": "success", "message_id": msg_id}

@router.post("/set-admin/{username}")
async def set_admin_status(
    username: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
) -> Any:
    result = await db["users"].update_one(
        {"username": username},
        {"$set": {"is_superuser": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": f"{username} is now an admin"}

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    is_admin: bool,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Cập nhật vai trò (Admin/User)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
        
    result = await db["users"].update_one(
        {"id": user_id},
        {"$set": {"is_superuser": is_admin}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "is_superuser": is_admin}

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Cập nhật trạng thái hoạt động (Active/Inactive)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")

    result = await db["users"].update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "is_active": is_active}

class UserUpdateByAdmin(BaseModel):
    username: str | None = None
    password: str | None = None
    role: str | None = None
    permissions: List[str] | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None

@router.patch("/users/{user_id}/update")
async def update_user_info(
    user_id: str,
    update_data: UserUpdateByAdmin,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Admin cập nhật thông tin người dùng (Username, Password, Role, Permissions, Info)"""
    from backend.app.core import security
    
    update_fields = {}
    if update_data.username:
        # Check if username exists for other users
        check = await db["users"].find_one({"username": update_data.username, "id": {"$ne": user_id}})
        if check:
            raise HTTPException(status_code=400, detail="Tên người dùng đã tồn tại")
        update_fields["username"] = update_data.username
        
    if update_data.password:
        update_fields["hashed_password"] = security.get_password_hash(update_data.password)
        
    if update_data.role:
        update_fields["role"] = update_data.role
        
    if update_data.permissions is not None:
        update_fields["permissions"] = update_data.permissions

    if update_data.full_name is not None:
        update_fields["full_name"] = update_data.full_name

    if update_data.email is not None:
        update_fields["email"] = update_data.email

    if update_data.phone is not None:
        update_fields["phone"] = update_data.phone
        
    if not update_fields:
        return {"status": "success", "message": "No changes made"}
        
    result = await db["users"].update_one(
        {"id": user_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "message": "User info updated"}

@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Admin bật/tắt trạng thái hoạt động của người dùng (Khóa/Mở khóa)"""
    user = await db["users"].find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db["users"].update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    # Nếu bị khóa, thì force logout luôn
    if not new_status:
        from .ws.manager import manager
        await manager.force_disconnect(user_id)
        
    return {"status": "success", "is_active": new_status}

@router.post("/users/{user_id}/force-logout")
async def force_logout_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Admin ép buộc người dùng đăng xuất (Đóng WebSocket)"""
    from .ws.manager import manager
    await manager.force_disconnect(user_id)
    await db["users"].update_one({"id": user_id}, {"$set": {"is_online": False}})
    return {"status": "success", "message": "User forced to logout"}

@router.post("/users/{user_id}/reset-status")
async def reset_user_status(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Admin reset trạng thái online của người dùng (về offline)"""
    await db["users"].update_one({"id": user_id}, {"$set": {"is_online": False}})
    return {"status": "success", "message": "User status reset to offline"}

# --- ROOM MANAGEMENT ---

@router.get("/rooms")
async def list_rooms_for_admin(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Lấy danh sách tất cả các phòng chat cho Admin"""
    cursor = db["chat_rooms"].find({})
    rooms = await cursor.to_list(length=500)
    
    # Bổ sung thông tin số tin nhắn
    results = []
    for room in rooms:
        # Convert ObjectId if needed
        room_id = room.get("id")
        msg_count = await db["messages"].count_documents({"room_id": room_id})
        
        results.append({
            "id": room_id,
            "name": room.get("name"),
            "description": room.get("description", ""),
            "type": room.get("type", "public"),
            "is_private": room.get("is_private", False),
            "created_at": room.get("created_at"),
            "created_by": room.get("created_by"),
            "message_count": msg_count,
            "member_count": len(room.get("members", [])),
            "is_locked": room.get("is_locked", False)
        })
    
    return results

@router.post("/rooms/{room_id}/toggle-lock")
async def toggle_room_lock(
    room_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Admin khóa/mở khóa một phòng chat (ngăn chặn nhắn tin)"""
    room = await db["chat_rooms"].find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    new_status = not room.get("is_locked", False)
    await db["chat_rooms"].update_one({"id": room_id}, {"$set": {"is_locked": new_status}})
    
    return {"status": "success", "is_locked": new_status}

@router.post("/rooms/cleanup/empty")
async def delete_empty_rooms(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Xóa các phòng chat không có thành viên hoặc không có tin nhắn (ngoại trừ phòng hệ thống)"""
    # Lấy các phòng không phải help/general
    cursor = db["chat_rooms"].find({"id": {"$nin": ["general", "help"]}})
    rooms = await cursor.to_list(length=1000)
    
    deleted_count = 0
    for room in rooms:
        room_id = room["id"]
        member_count = len(room.get("members", []))
        msg_count = await db["messages"].count_documents({"room_id": room_id})
        
        if member_count == 0 or msg_count == 0:
            await db["chat_rooms"].delete_one({"id": room_id})
            await db["messages"].delete_many({"room_id": room_id})
            deleted_count += 1
            
    return {"status": "success", "deleted_count": deleted_count}

@router.delete("/rooms/{room_id}")
async def delete_room_by_admin(
    room_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_superuser)
):
    """Admin xóa vĩnh viễn một phòng chat và tin nhắn liên quan"""
    if room_id == "general" or room_id == "help":
        raise HTTPException(status_code=400, detail="Cannot delete default system rooms")
        
    # 1. Xóa phòng
    result = await db["chat_rooms"].delete_one({"id": room_id})
    if result.deleted_count == 0:
        # Thử với ObjectId nếu id string ko khớp (tùy schema)
        pass # Schema hiện tại dùng UUID string cho 'id' field
        
    # 2. Xóa tin nhắn trong phòng
    await db["messages"].delete_many({"room_id": room_id})
    
    return {"status": "success", "message": f"Room {room_id} and its content deleted"}
