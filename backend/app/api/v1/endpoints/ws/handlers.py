import uuid
import asyncio
from datetime import datetime, timezone
from backend.app.db.session import db
from .manager import manager
from .ai_logic import run_ai_generation_task
from .constants import SELF_ISOLATED_ROOMS

async def handle_edit_message(user_id: str, data: dict):
    msg_id = data.get("message_id")
    new_content = data.get("content") or data.get("new_content")
    room_id = data.get("room_id")
    
    if not msg_id or not new_content: return

    result = await db["messages"].update_one(
        {"id": msg_id, "sender_id": user_id},
        {"$set": {"content": new_content, "is_edited": True, "edited_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count > 0:
        # Update preview for replies
        await db["messages"].update_many(
            {"reply_to_id": msg_id},
            {"$set": {"reply_to_content": new_content}}
        )
        await manager.broadcast_to_room(room_id, {
            "type": "edit_message",
            "message_id": msg_id,
            "content": new_content,
            "room_id": room_id
        })

async def handle_recall_message(user_id: str, data: dict):
    msg_id = data.get("message_id")
    room_id = data.get("room_id")
    
    if not msg_id: return

    result = await db["messages"].update_one(
        {"id": msg_id, "sender_id": user_id},
        {"$set": {"is_recalled": True, "content": "Tin nhắn đã được thu hồi", "recalled_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.modified_count > 0:
        # Update preview for replies
        await db["messages"].update_many(
            {"reply_to_id": msg_id},
            {"$set": {"reply_to_content": "Tin nhắn đã được thu hồi"}}
        )
        await manager.broadcast_to_room(room_id, {
            "type": "recall_message",
            "message_id": msg_id,
            "room_id": room_id
        })

async def handle_delete_message(user_id: str, data: dict):
    msg_id = data.get("message_id")
    room_id = data.get("room_id")
    
    if not msg_id: return

    await db["messages"].update_one(
        {"id": msg_id},
        {"$addToSet": {"deleted_by_users": user_id}}
    )
    
    await manager.send_to_user(user_id, {
        "type": "delete_for_me_success",
        "message_id": msg_id,
        "room_id": room_id
    })

async def handle_pin_message(user_id: str, data: dict):
    msg_id = data.get("message_id")
    room_id = data.get("room_id")
    if not msg_id: return
    
    msg = await db["messages"].find_one({"id": msg_id})
    if msg:
        new_pinned_state = not msg.get("is_pinned", False)
        await db["messages"].update_one({"id": msg_id}, {"$set": {"is_pinned": new_pinned_state}})
        await manager.broadcast_to_room(room_id, {
            "type": "pin_message",
            "message_id": msg_id,
            "is_pinned": new_pinned_state,
            "room_id": room_id
        })

async def handle_read_receipt(user_id: str, data: dict):
    room_id = data.get("room_id")
    msg_id = data.get("message_id")
    if not room_id: return
    
    if msg_id:
        await db["messages"].update_one(
            {"id": msg_id, "room_id": room_id},
            {"$set": {"status": "seen"}}
        )
    else:
        await db["messages"].update_many(
            {"room_id": room_id, "sender_id": {"$ne": user_id}, "status": {"$ne": "seen"}},
            {"$set": {"status": "seen"}}
        )
    
    if room_id not in SELF_ISOLATED_ROOMS:
        await manager.broadcast_to_room(room_id, {
            "type": "read_receipt",
            "room_id": room_id,
            "user_id": user_id,
            "message_id": msg_id
        })

async def handle_reaction(user_id: str, data: dict):
    msg_id = data.get("message_id")
    room_id = data.get("room_id")
    emoji = data.get("emoji")
    
    if not msg_id or not emoji: return

    msg = await db["messages"].find_one({"id": msg_id})
    if not msg: return

    reactions = msg.get("reactions", {})
    # MongoDB có thể trả về None nếu field không tồn tại
    if reactions is None: reactions = {}
    
    users = reactions.get(emoji, [])
    
    if user_id in users:
        users.remove(user_id)
        if not users:
            if emoji in reactions:
                del reactions[emoji]
        else:
            reactions[emoji] = users
    else:
        if users is None: users = []
        users.append(user_id)
        reactions[emoji] = users

    await db["messages"].update_one(
        {"id": msg_id},
        {"$set": {"reactions": reactions}}
    )
    
    await manager.broadcast_to_room(room_id, {
        "type": "reaction",
        "message_id": msg_id,
        "room_id": room_id,
        "reactions": reactions
    })

async def handle_report_message(user_id: str, data: dict):
    msg_id = data.get("message_id")
    room_id = data.get("room_id")
    reason = data.get("reason", "Phàn nàn chung")
    
    if not msg_id or not room_id: return

    # Fetch more details for better admin experience
    reporter = await db["users"].find_one({"id": user_id})
    message = await db["messages"].find_one({"id": msg_id})
    
    reported_user = None
    if message:
        reported_user = await db["users"].find_one({"id": message.get("sender_id")})

    # Save to reports collection
    report_data = {
        "id": str(uuid.uuid4()),
        "reporter_id": user_id,
        "reporter_name": reporter.get("full_name") or reporter.get("username") if reporter else "Unknown",
        "reported_id": message.get("sender_id") if message else "Unknown",
        "reported_name": reported_user.get("full_name") or reported_user.get("username") if reported_user else "Unknown",
        "message_id": msg_id,
        "message_snippet": message.get("content")[:200] if message and message.get("content") else "No content",
        "room_id": room_id,
        "type": reason if reason in ['spam', 'harassment', 'inappropriate', 'other'] else 'other',
        "content": reason, # Detailed reason
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "pending"
    }
    
    await db["reports"].insert_one(report_data)
    
    # Notify admins if any are online
    await manager.broadcast_to_admins({
        "type": "new_report",
        "report_id": report_data["id"],
        "message_id": msg_id,
        "reported_name": report_data["reported_name"]
    })
    
    # Send success response to reporter
    await manager.send_to_user(user_id, {
        "type": "report_success",
        "message_id": msg_id,
        "message": "Cảm ơn bạn! Báo cáo của bạn đã được gửi tới quản trị viên."
    })

async def handle_send_message(user_id: str, user, data: dict):
    room_id = data.get("room_id")
    content = data.get("content", "").strip()
    file_url = data.get("file_url")
    file_name = data.get("file_name")
    file_type = data.get("file_type")
    reply_to_id = data.get("reply_to_id")
    receiver_id = data.get("receiver_id")
    shared_post = data.get("shared_post")
    is_forwarded = data.get("is_forwarded", False)
    
    if not room_id or (not content and not file_url): return

    from backend.app.core.admin_config import get_system_config
    sys_config = await get_system_config(db)
    
    # Check Maintenance Mode
    if sys_config.get("maintenance_mode", False) and not (user.get("is_superuser") or user.get("role") == "admin"):
        await manager.send_to_user(user_id, {
            "type": "error", 
            "message": "Hệ thống đang bảo trì. Vui lòng quay lại sau."
        })
        return

    # Check Max Message Length
    max_len = sys_config.get("max_message_length", 2000)
    if content and len(content) > max_len:
        await manager.send_to_user(user_id, {
            "type": "error", 
            "message": f"Tin nhắn quá dài (Tối đa {max_len} ký tự)."
        })
        return

    now = datetime.now(timezone.utc)

    # Check Block - Improved room lookup
    room_obj = await db["chat_rooms"].find_one({"$or": [{"id": room_id}, {"_id": room_id}]})
    if not room_obj and len(room_id) == 24: # Try as ObjectId
        try:
            from bson import ObjectId
            room_obj = await db["chat_rooms"].find_one({"_id": ObjectId(room_id)})
        except:
            pass

    if room_obj and room_obj.get("type") == "direct":
        members = await db["room_members"].find({"room_id": room_id}).to_list(length=2)
        other_member_id = next((m["user_id"] for m in members if m["user_id"] != user_id), None)
        if other_member_id:
            other_user = await db["users"].find_one({"id": other_member_id})
            if other_user and user_id in other_user.get("blocked_users", []):
                await manager.send_to_user(user_id, {"type": "error", "message": "Bạn đã bị chặn."})
                return
            if other_member_id in user.get("blocked_users", []):
                await manager.send_to_user(user_id, {"type": "error", "message": "Bạn đang chặn người này."})
                return

    # Auto join room
    await db["room_members"].update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"joined_at": now}},
        upsert=True
    )

    # For direct chats, also ensure the other person is in the room
    if room_obj and room_obj.get("type") == "direct":
        recipient_id = receiver_id
        if not recipient_id and room_id.startswith("direct_"):
            parts = room_id.split("_")
            if len(parts) >= 3:
                recipient_id = parts[1] if parts[2] == user_id else parts[2]
        
        if recipient_id:
            await db["room_members"].update_one(
                {"room_id": room_id, "user_id": recipient_id},
                {"$setOnInsert": {"joined_at": now}},
                upsert=True
            )

    # Reply logic
    reply_to_content = None
    if reply_to_id:
        parent = await db["messages"].find_one({"id": reply_to_id})
        if parent:
            reply_to_content = parent.get("content")

    # Use client provided ID if available (for optimistic sync)
    message_id = data.get("id") or str(uuid.uuid4())
    message_data = {
        "id": message_id,
        "room_id": room_id,
        "sender_id": user_id,
        "sender_name": user.get("full_name") or user.get("username"),
        "sender_avatar": user.get("avatar") or user.get("avatar_url"),
        "content": content,
        "file_url": file_url,
        "file_name": file_name,
        "file_type": file_type,
        "timestamp": now,
        "is_bot": False,
        "is_edited": False,
        "is_recalled": False,
        "is_pinned": False,
        "is_forwarded": is_forwarded,
        "status": "sent",
        "reply_to_id": reply_to_id,
        "reply_to_content": reply_to_content,
        "shared_post": shared_post,
        "receiver_id": receiver_id,
        "deleted_by_users": []
    }

    await db["messages"].insert_one(message_data)
    
    # Update room last activity
    if room_obj:
        # Sử dụng _id thật của room từ DB để update cho chính xác
        await db["chat_rooms"].update_one({"_id": room_obj["_id"]}, {"$set": {"updated_at": now}})
    else:
        # Fallback
        await db["chat_rooms"].update_one({"id": room_id}, {"$set": {"updated_at": now}})
    
    # Broadcast
    metadata = message_data.copy()
    metadata["timestamp"] = (metadata["timestamp"] if isinstance(metadata["timestamp"], str) else metadata["timestamp"].isoformat())
    metadata["type"] = "message"
    metadata["message_id"] = message_id 

    if room_id == "help":
        # Always send to the sender
        await manager.send_to_user(user_id, metadata)
        
        # If user sent, notify admins. If admin sent, notify targeted user + other admins.
        is_staff = user.get("is_superuser") or user.get("role") == "admin"
        if not is_staff:
            await manager.broadcast_to_admins(metadata)
        else:
            if receiver_id:
                await manager.send_to_user(receiver_id, metadata)
            # Notify other admins except the sender (who already got it via send_to_user)
            admins = await db["users"].find({
                "$or": [{"is_superuser": True}, {"role": "admin"}], 
                "is_online": True,
                "id": {"$ne": user_id}
            }).to_list(length=100)
            for admin in admins:
                await manager.send_to_user(admin["id"], metadata)
    elif room_id in SELF_ISOLATED_ROOMS:
        await manager.send_to_user(user_id, metadata)
    else:
        # For public/private/direct rooms, broadcast to all members
        # This includes the sender because they were upserted into room_members above
        await manager.broadcast_to_room(room_id, metadata)

    # AI Triggers
    is_ai_room = (room_obj and room_obj.get("is_ai_room", False)) or room_id in SELF_ISOLATED_ROOMS
    content_lower = content.lower() if content else ""
    is_explicit_call = any(t in content_lower for t in ["@ai", "/ai", "@ ai", "bot ai"])
    
    # Check global AI configuration
    from backend.app.core.admin_config import get_system_config
    sys_config = await get_system_config(db)
    ai_auto_reply_enabled = sys_config.get("ai_auto_reply", True)
    ai_enabled_globally = sys_config.get("ai_enabled", True)
    
    should_ai_respond = False
    # Only respond if AI is enabled globally AND (it's an explicit call OR auto-reply is enabled in AI rooms)
    if ai_enabled_globally:
        if is_explicit_call:
            should_ai_respond = True
        elif is_ai_room and ai_auto_reply_enabled:
            should_ai_respond = True
        
        if room_id == "help" and not user.get("is_superuser"):
            is_escalation_request = any(k in content_lower for k in ["gặp admin", "nhân viên hỗ trợ", "nói chuyện với người", "gặp nhân viên"])
            
            # Check explicit support thread status
            thread = await db["support_threads"].find_one({"user_id": user_id})
            thread_status = thread.get("status") if thread else "ai_processing"

            if not user.get("is_superuser") and thread_status == "resolved":
                # Tự động mở lại hội thoại nếu người dùng nhắn tin sau khi đã giải quyết
                new_status = "ai_processing"
                await db["support_threads"].update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "status": new_status,
                        "username": user.get("username"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
                # Thông báo thời gian thực
                await manager.send_to_user(user_id, {
                    "type": "support_status_update",
                    "room_id": "help",
                    "status": new_status
                })
                # Thông báo cho admin
                await manager.broadcast_to_admins({
                    "type": "support_status_update",
                    "user_id": user_id,
                    "username": user.get("username"),
                    "status": new_status
                })
                thread_status = new_status

            if is_escalation_request:
                should_ai_respond = True
                # Automatically switch to waiting status if user asks for admin
                new_status = "waiting"
                await db["support_threads"].update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "status": new_status, 
                        "username": user.get("username"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
                # Thông báo thời gian thực
                await manager.send_to_user(user_id, {
                    "type": "support_status_update",
                    "room_id": "help",
                    "status": new_status
                })
                # Thông báo cho admin
                await manager.broadcast_to_admins({
                    "type": "support_status_update",
                    "user_id": user_id,
                    "username": user.get("username"),
                    "status": new_status
                })
                thread_status = new_status # Cập nhật local variable để check bên dưới
            elif thread_status != "ai_processing" and not is_explicit_call:
                # If thread is being handled by Admin or resolved, AI stays silent
                should_ai_respond = False
            else:
                # Optimized admin activity check (fallback)
                from datetime import timedelta
                time_threshold = datetime.now(timezone.utc) - timedelta(minutes=5)
                
                # Check recent history for non-bot messages from non-senders (admins)
                recent_admin_msg = await db["messages"].find_one({
                    "room_id": "help",
                    "sender_id": {"$ne": user_id},
                    "is_bot": False,
                    "timestamp": {"$gt": time_threshold}
                })
                
                if recent_admin_msg and not is_explicit_call:
                    should_ai_respond = False
                else:
                    should_ai_respond = True
    elif is_explicit_call and room_id != "general":
        should_ai_respond = True

    if should_ai_respond:
        ai_msg_id = str(uuid.uuid4())
        prompt_clean = content
        if is_explicit_call:
            import re
            for trigger in ["@ai", "/ai", "@ ai", "bot ai"]:
                prompt_clean = re.sub(re.escape(trigger), '', prompt_clean, flags=re.IGNORECASE).strip()
        
        chat_context = f"--- Lịch sử chat gần đây ---\n"
        recent_msgs = await db["messages"].find({"room_id": room_id}).sort("timestamp", -1).limit(5).to_list(length=5)
        recent_msgs.reverse()
        for m in recent_msgs:
            if m.get("id") == message_id: continue
            sender = m.get("sender_name") or "AI"
            chat_context += f"[{sender}]: {m.get('content')}\n"

        asyncio.create_task(run_ai_generation_task(
            room_id=room_id,
            prompt=prompt_clean or "Chào bạn!",
            chat_context=chat_context,
            user_id=user_id,
            username=user.get("username"),
            ai_msg_id=ai_msg_id,
            ai_identity="LinkUp Support" if room_id == "help" else "LinkUp Assistant",
            is_suggestion_mode=False,
            is_ai_room=is_ai_room or is_explicit_call,
            user_prefs=user.get("ai_preferences"),
            user_role=user.get("role", "member"),
            user_permissions=user.get("permissions", [])
        ))

