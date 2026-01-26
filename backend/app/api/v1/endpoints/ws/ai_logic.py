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
        custom_prompt = sys_config.get("ai_system_prompt")

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
