import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from google import genai
from google.genai import types
from langchain_openai import ChatOpenAI
from backend.app.db.session import db
from backend.app.core.admin_config import get_system_api_key
from .manager import manager
from .constants import SELF_ISOLATED_ROOMS, LINKUP_SYSTEM_PROMPT

# Danh sách dự phòng theo yêu cầu: Ưu tiên model mới nhất và fallback dần
fallback_models = [
    "gemini-3-flash-preview", 
    "gemini-3-flash",        
    "gemini-2.5-flash", 
    "gemini-2.5-flash-lite"
]

async def get_ai_model(db_instance, model_name="gemini-1.5-flash"):
    if "gpt" in model_name.lower():
        api_key = await get_system_api_key(db_instance, "openai")
        if not api_key: 
            print("⚠️ OpenAI API Key is missing.")
            return None
        return ChatOpenAI(
            model=model_name,
            openai_api_key=api_key,
            streaming=True
        )
    
    api_key = await get_system_api_key(db_instance, "google")
    if not api_key:
        print("⚠️ Google API Key is missing.")
        return None
        
    client = genai.Client(api_key=api_key)
    return client, model_name

async def run_ai_generation_task(
    room_id: str, 
    prompt: str, 
    chat_context: str, 
    user_id: str, 
    username: str, 
    ai_msg_id: str, 
    ai_identity: str,
    is_suggestion_mode: bool,
    is_ai_room: bool = False,
    user_prefs: Optional[dict] = None,
    user_role: str = "member",
    user_permissions: List[str] = []
):
    """
    Chạy xử lý AI trong background task để WebSocket không bị block.
    """
    try:
        from backend.app.core.admin_config import get_system_config
        sys_config = await get_system_config(db)
        
        async def send_ai_data(data: dict):
            if not is_ai_room and data["type"] in ["typing", "start", "chunk"]:
                return

            if is_suggestion_mode:
                members = await db["room_members"].find({"room_id": room_id}).to_list(length=100)
                for member in members:
                    if member["user_id"] != user_id:
                        suggestion_data = data.copy()
                        if suggestion_data["type"] == "message":
                            suggestion_data["type"] = "ai_suggestion"
                        else:
                            suggestion_data["type"] = f"ai_suggestion_{suggestion_data['type']}"
                        await manager.send_to_user(member["user_id"], suggestion_data)
            elif is_ai_room:
                await manager.send_to_user(user_id, data)
                if room_id == "help":
                    admins = await db["users"].find({"is_superuser": True, "is_online": True}).to_list(length=50)
                    for admin in admins:
                        if admin["id"] != user_id:
                            await manager.send_to_user(admin["id"], data)
            else:
                await manager.broadcast_to_room(room_id, data)

        # 1. KIỂM TRA BẬT/TẮT AI HỆ THỐNG
        if not sys_config.get("ai_enabled", True):
            await send_ai_data({
                "type": "message",
                "room_id": room_id,
                "content": "⚠️ Hệ thống AI hiện đang tạm bảo trì hoặc bị tắt bởi quản trị viên. Vui lòng quay lại sau.",
                "sender": "Hệ thống",
                "is_error": True
            })
            return

        # 2. KIỂM TRA HẠN CHẾ RIÊNG BIỆT (USER/PHÒNG)
        user_doc = await db["users"].find_one({"id": user_id})
        if user_doc and user_doc.get("ai_restricted"):
            await send_ai_data({
                "type": "message",
                "room_id": room_id,
                "content": "❌ Tài khoản của bạn đã bị hạn chế sử dụng AI bởi quản trị viên.",
                "sender": "Hệ thống",
                "is_error": True
            })
            return

        room_doc = await db["chat_rooms"].find_one({"id": room_id})
        if room_doc and room_doc.get("ai_restricted"):
            await send_ai_data({
                "type": "message",
                "room_id": room_id,
                "content": "❌ Phòng chat này đã bị hạn chế sử dụng hỗ trợ AI.",
                "sender": "Hệ thống",
                "is_error": True
            })
            return

        # 2.5 KIỂM TRA TRẠNG THÁI HỖ TRỢ (NẾU LÀ PHÒNG HELP)
        if room_id == "help" and not is_suggestion_mode:
            thread = await db["support_threads"].find_one({"user_id": user_id})
            # AI sẽ im lặng CHỈ KHI trạng thái là 'waiting' (Admin đang trực tiếp xử lý)
            # Nếu là 'ai_processing' hoặc 'resolved', AI sẽ tiếp nhận hỗ trợ.
            if thread and thread.get("status") == "waiting":
                return
            
            # Tự động chuyển về 'ai_processing' nếu AI đang phản hồi cho một thread đã đóng hoặc chưa rõ
            if not thread or thread.get("status") == "resolved":
                new_status = "ai_processing"
                await db["support_threads"].update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "status": new_status,
                        "username": username,
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

        # 3. KIỂM TRA GIỚI HẠN SỐ LƯỢNG (CHỈ ÁP DỤNG CHO USER THƯỜNG)
        if user_role != "admin" and "ai_unlimited" not in user_permissions:
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Giới hạn cá nhân
            user_calls = await db["ai_usage"].count_documents({
                "user_id": user_id,
                "timestamp": {"$gte": today_start},
                "status": "success"
            })
            user_limit = sys_config.get("ai_limit_per_user", 50)
            if user_calls >= user_limit:
                await send_ai_data({
                    "type": "message",
                    "room_id": room_id,
                    "content": f"❌ Bạn đã hết lượt sử dụng AI hôm nay ({user_limit}/{user_limit}). Thử lại vào ngày mai nhé!",
                    "sender": "Hệ thống",
                    "is_error": True
                })
                return

            # Giới hạn phòng (Group)
            room_calls = await db["ai_usage"].count_documents({
                "room_id": room_id,
                "timestamp": {"$gte": today_start},
                "status": "success"
            })
            room_limit = sys_config.get("ai_limit_per_group", 200)
            if room_calls >= room_limit:
                await send_ai_data({
                    "type": "message",
                    "room_id": room_id,
                    "content": f"❌ Phòng này đã hết lượt sử dụng AI hôm nay ({room_limit}/{room_limit}).",
                    "sender": "Hệ thống",
                    "is_error": True
                })
                return

        custom_prompt = sys_config.get("ai_system_prompt")
        
        await send_ai_data({"type": "typing", "room_id": room_id, "status": True})
        await send_ai_data({
            "type": "start",
            "message_id": ai_msg_id,
            "sender": ai_identity,
            "sender_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=LinkUpAI",
            "room_id": room_id
        })

        if room_id == "help":
            ai_identity = "Hỗ trợ LinkUp"
            personalized_system_prompt = (
                "Bạn là LinkUp AI Assistant trong chế độ Help & Support.\n\n"
                "VAI TRÒ (TIER 1)\n"
                "- Bạn là tuyến hỗ trợ đầu tiên (tuyến 1) của LinkUp.\n"
                "- Bạn hỗ trợ người dùng với các câu hỏi thường gặp và hướng dẫn cơ bản.\n"
                "- Bạn KHÔNG phải là nhân viên hỗ trợ con người (Admin/Nhân viên thật).\n\n"
                "NGUYÊN TẮC QUAN TRỌNG\n"
                "1. Trả lời rõ ràng, lịch sự, dễ hiểu.\n"
                "2. KHÔNG hứa hẹn xử lý sự cố kỹ thuật sâu vào hệ thống.\n"
                "3. KHÔNG thực hiện thay đổi tài khoản hoặc dữ liệu người dùng (như đổi mật khẩu, xóa tài khoản).\n"
                "4. Nếu vấn đề vượt quá khả năng (lỗi hệ thống, khiếu nại, thanh toán) hoặc người dùng yêu cầu 'gặp admin', 'nhân viên hỗ trợ':\n"
                "   → Bạn PHẢI trả lời: 'Vấn đề này cần nhân viên hỗ trợ kiểm tra thêm. Mình sẽ chuyển cuộc trò chuyện cho admin để hỗ trợ bạn tốt hơn nhé.'\n"
                "5. KHÔNG bao giờ giả vờ là nhân viên thật hoặc con người.\n\n"
                "HƯỚNG DẪN FAQ & Hỗ trợ (LinkUp FAQ):\n"
                "- LinkUp là gì? Nền tảng chat thời gian thực kết nối cộng đồng.\n"
                "- Cách tạo nhóm: Nhấn '+' ở danh sách phòng chat.\n"
                "- Chat AI: Gõ @ai trong bất kỳ phòng nào hoặc vào phòng 'LinkUp AI'.\n"
                "- Bảo mật: Hỗ trợ thu hồi tin nhắn, chặn người dùng.\n\n"
                "CÁCH ỨNG XỬ\n"
                "- Nếu chưa đủ thông tin: hỏi lại nhẹ nhàng.\n"
                "- Nếu không chắc: nói rõ giới hạn của bạn.\n"
                "- Mục tiêu: Giải quyết nhanh các vấn đề đơn giản và chuyển đúng lúc các vấn đề cần con người."
            )
        else:
            ai_identity = "LinkUp Assistant"
            personalized_system_prompt = custom_prompt if custom_prompt else LINKUP_SYSTEM_PROMPT

        if user_prefs:
            memory_ctx = "\n=== AI USER MEMORY (KÝ ỨC NGƯỜI DÙNG) ===\n"
            if user_prefs.get("preferred_style") == "short":
                memory_ctx += "- Người dùng này thích câu trả lời cực kỳ ngắn gọn.\n"
            if user_prefs.get("coding_frequency") == "high":
                memory_ctx += "- Người dùng hay hỏi về lập trình, hãy trả lời chuyên sâu và cung cấp code blocks nếu cần.\n"
            if user_prefs.get("language") == "en":
                memory_ctx += "- Ưu tiên phản hồi bằng tiếng Anh.\n"
            personalized_system_prompt += memory_ctx

        if user_role == "admin" or "ai_unlimited" in user_permissions:
            personalized_system_prompt += "\n\n[QUYỀN HẠN: QUẢN TRỊ VIÊN/CAO CẤP] Bạn đang trả lời một người có quyền hạn cao trong hệ thống LinkUp. Hãy cung cấp thông tin chi tiết, phân tích sâu và không bị giới hạn về phong cách trả lời. Bạn có thể hỗ trợ các tác vụ nâng cao."
        else:
            personalized_system_prompt += "\n\n[QUYỀN HẠN: THÀNH VIÊN] Bạn đang trả lời thành viên thông thường. Hãy trả lời thân thiện, ngắn gọn và tập trung vào các vấn đề người dùng thảo luận."

        full_response = ""
        success = False
        last_error = None
        final_prompt = f"Dưới đây là ngữ cảnh cuộc trò chuyện gần nhất:\n{chat_context}\n\nNgười dùng vừa yêu cầu: {prompt}" if chat_context else prompt

        for current_model_name in fallback_models:
            try:
                result = await get_ai_model(db, model_name=current_model_name)
                if not result: continue
                
                if isinstance(result, tuple):
                    client, target_model = result
                    response_stream = await client.aio.models.generate_content_stream(
                        model=target_model,
                        contents=final_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=personalized_system_prompt
                        )
                    )
                    
                    async for chunk in response_stream:
                        chunk_text = chunk.text
                        if chunk_text:
                            full_response += chunk_text
                            await send_ai_data({"type": "chunk", "message_id": ai_msg_id, "content": chunk_text})
                else:
                    llm = result
                    from langchain_core.messages import SystemMessage, HumanMessage
                    messages = [SystemMessage(content=personalized_system_prompt), HumanMessage(content=final_prompt)]
                    async for chunk in llm.astream(messages):
                        chunk_text = chunk.content
                        if isinstance(chunk_text, list):
                            chunk_text = "".join([str(p.get("text", p)) if isinstance(p, dict) else str(p) for p in chunk_text])
                        if chunk_text:
                            full_response += chunk_text
                            await send_ai_data({"type": "chunk", "message_id": ai_msg_id, "content": chunk_text})
                
                if full_response:
                    success = True
                    break
            except Exception as e:
                print(f"⚠️ Model {current_model_name} failed: {e}")
                last_error = e
                continue

        if not success:
            if last_error: raise last_error
            else: raise Exception("All models failed to respond")

        # 3. GHI LOG SỬ DỤNG THÀNH CÔNG
        await db["ai_usage"].insert_one({
            "message_id": ai_msg_id,
            "timestamp": datetime.now(timezone.utc),
            "user_id": user_id,
            "room_id": room_id,
            "status": "success",
            "model": current_model_name if 'current_model_name' in locals() else "unknown"
        })

        ai_final_ts = datetime.now(timezone.utc)
        
        if not is_suggestion_mode:
            db_ai_msg = {
                "id": ai_msg_id,
                "content": full_response,
                "sender_id": None,
                "sender_name": ai_identity,
                "sender_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=LinkUpAI",
                "receiver_id": user_id if room_id in SELF_ISOLATED_ROOMS else None,
                "room_id": room_id,
                "timestamp": ai_final_ts,
                "is_bot": True,
                "deleted_by_users": []
            }
            await db["messages"].insert_one(db_ai_msg)
            await db["chat_rooms"].update_one({"id": room_id}, {"$set": {"updated_at": ai_final_ts}})

        await send_ai_data({
            "type": "message",
            "message_id": ai_msg_id,
            "sender_id": None,
            "sender_name": ai_identity,
            "sender_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=LinkUpAI",
            "receiver_id": user_id if room_id == "help" else None,
            "content": full_response,
            "is_bot": True,
            "room_id": room_id,
            "timestamp": ai_final_ts.isoformat()
        })

        await send_ai_data({
            "type": "end",
            "message_id": ai_msg_id,
            "room_id": room_id,
            "timestamp": ai_final_ts.isoformat()
        })
        
        await send_ai_data({"type": "typing", "room_id": room_id, "status": False})

    except Exception as e:
        print(f"❌ Background AI Error: {e}")
        # GHI LOG LỖI MỚI THEO MVP
        try:
            await db["ai_usage"].insert_one({
                "timestamp": datetime.now(timezone.utc),
                "user_id": user_id,
                "room_id": room_id,
                "status": "error",
                "error_msg": str(e)
            })
        except: pass

        # Log error to system
        try:
            await db["system_logs"].insert_one({
                "type": "ai_error",
                "message": str(e),
                "room_id": room_id,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc)
            })
        except: pass

        await send_ai_data({"type": "typing", "room_id": room_id, "status": False})
        try:
            await send_ai_data({
                "type": "message",
                "message_id": str(uuid.uuid4()),
                "content": f"LinkUp AI gặp lỗi: {str(e)}",
                "is_bot": True,
                "room_id": room_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except: pass
