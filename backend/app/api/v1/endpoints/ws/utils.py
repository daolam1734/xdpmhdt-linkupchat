import uuid
import asyncio
from datetime import datetime, timezone
from backend.app.db.session import db
from .manager import manager
from .ai_logic import run_ai_generation_task

async def notify_user_status_change(user_id: str, is_online: bool):
    """
    Thông báo cho tất cả bạn bè về việc người dùng thay đổi trạng thái online.
    """
    try:
        user = await db["users"].find_one({"id": user_id})
        if not user: return
        
        effective_online = is_online and user.get("show_online_status", True)
        
        friends_reqs = await db["friend_requests"].find({
            "status": "accepted",
            "$or": [{"from_id": user_id}, {"to_id": user_id}]
        }).to_list(length=1000)

        friend_ids = []
        for req in friends_reqs:
            friend_ids.append(req["to_id"] if req["from_id"] == user_id else req["from_id"])
            
        for friend_id in friend_ids:
            friend_user = await db["users"].find_one({"id": friend_id})
            if friend_user:
                is_blocked = (user_id in friend_user.get("blocked_users", []) or 
                             friend_id in user.get("blocked_users", []))
                
                status_to_send = effective_online if not is_blocked else False
                
                await manager.send_to_user(friend_id, {
                    "type": "user_status_change",
                    "user_id": user_id,
                    "is_online": status_to_send
                })
    except Exception as e:
        print(f"Error in notify_user_status_change: {e}")

async def handle_admin_offline_catchup(admin_id: str):
    """
    Khi một Admin offline, kiểm tra xem còn Admin nào khác online không.
    Nếu không còn Admin nào, tìm các tin nhắn chưa được trả lời trong phòng 'help' để AI trả lời.
    """
    try:
        from backend.app.core.admin_config import get_system_config
        sys_config = await get_system_config(db)
        if not sys_config.get("ai_auto_reply", True):
            return

        active_admins_count = await db["users"].count_documents({
            "is_superuser": True, 
            "is_online": True,
            "id": {"$ne": admin_id}
        })

        if active_admins_count == 0:
            help_messages = await db["messages"].aggregate([
                {"$match": {"room_id": "help", "is_bot": False}},
                {"$group": {"_id": "$sender_id", "last_msg": {"$last": "$$ROOT"}}}
            ]).to_list(length=100)

            for entry in help_messages:
                user_id = entry["_id"]
                last_msg = entry["last_msg"]
                
                has_reply = await db["messages"].find_one({
                    "room_id": "help",
                    "timestamp": {"$gt": last_msg["timestamp"]},
                    "$or": [
                        {"receiver_id": user_id},
                        {"is_bot": True}
                    ]
                })

                if not has_reply:
                    ai_msg_id = str(uuid.uuid4())
                    user_obj = await db["users"].find_one({"id": user_id})
                    if not user_obj: continue
                    username = user_obj.get("username", "Người dùng")
                    
                    chat_context = f"Hệ thống: Admin vừa ngoại tuyến. AI đang tiếp quản hỗ trợ.\n--- Lịch sử chat gần đây ---\n"
                    recent_msgs = await db["messages"].find({
                        "room_id": "help",
                        "$or": [{"sender_id": user_id}, {"receiver_id": user_id}, {"is_bot": True}]
                    }).sort("timestamp", -1).limit(5).to_list(length=5)
                    recent_msgs.reverse()
                    
                    for m in recent_msgs:
                        sender = m.get("sender_name") or "AI"
                        chat_context += f"[{sender}]: {m.get('content')}\n"

                    asyncio.create_task(run_ai_generation_task(
                        room_id="help",
                        prompt=last_msg["content"],
                        chat_context=chat_context,
                        user_id=user_id,
                        username=username,
                        ai_msg_id=ai_msg_id,
                        ai_identity="LinkUp Support",
                        is_suggestion_mode=False,
                        is_ai_room=True,
                        user_role=user_obj.get("role", "member"),
                        user_permissions=user_obj.get("permissions", [])
                    ))
    except Exception as e:
        print(f"Error in admin catchup: {e}")

async def notify_friend_status_change(user_a_id: str, user_b_id: str, status: str):
    """
    Thông báo cho hai người dùng về việc thay đổi quan hệ bạn bè (accepted/deleted).
    """
    try:
        user_a = await db["users"].find_one({"id": user_a_id})
        user_b = await db["users"].find_one({"id": user_b_id})
        
        if not user_a or not user_b: return

        if status == "accepted":
            eff_a_online = user_a.get("is_online", False) and user_a.get("show_online_status", True)
            eff_b_online = user_b.get("is_online", False) and user_b.get("show_online_status", True)
        else:
            eff_a_online = False
            eff_b_online = False
            
        await manager.send_to_user(user_b_id, {
            "type": "user_status_change",
            "user_id": user_a_id,
            "is_online": eff_a_online,
            "friend_status": status
        })
        
        await manager.send_to_user(user_a_id, {
            "type": "user_status_change",
            "user_id": user_b_id,
            "is_online": eff_b_online,
            "friend_status": status
        })
    except Exception as e:
        print(f"Error in notify_friend_status_change: {e}")

async def notify_block_status_change(target_user_id: str, by_user_id: str, is_blocked: bool):
    """
    Thông báo thời gian thực về trạng thái chặn/bỏ chặn cho cả người chặn và người bị chặn.
    """
    msg_type_target = "user_blocked_me" if is_blocked else "user_unblocked_me"
    await manager.send_to_user(target_user_id, {
        "type": msg_type_target,
        "by_user_id": by_user_id
    })
    
    if is_blocked:
        await manager.send_to_user(target_user_id, {
            "type": "user_status_change",
            "user_id": by_user_id,
            "is_online": False
        })
    
    msg_type_actor = "user_i_blocked" if is_blocked else "user_i_unblocked"
    await manager.send_to_user(by_user_id, {
        "type": msg_type_actor,
        "target_user_id": target_user_id
    })
    
    if is_blocked:
        await manager.send_to_user(by_user_id, {
            "type": "user_status_change",
            "user_id": target_user_id,
            "is_online": False
        })
    else:
        target_user = await db["users"].find_one({"id": target_user_id})
        actor_user = await db["users"].find_one({"id": by_user_id})
        
        if target_user:
            eff_target_online = target_user.get("is_online", False) and target_user.get("show_online_status", True)
            await manager.send_to_user(by_user_id, {
                "type": "user_status_change",
                "user_id": target_user_id,
                "is_online": eff_target_online
            })
            
        if actor_user:
            eff_actor_online = actor_user.get("is_online", False) and actor_user.get("show_online_status", True)
            await manager.send_to_user(target_user_id, {
                "type": "user_status_change",
                "user_id": by_user_id,
                "is_online": eff_actor_online
            })
