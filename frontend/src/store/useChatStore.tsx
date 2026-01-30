import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Room, User } from '../types/chat';
import { chatService } from '../services/chat.service';
import { useAuthStore } from './useAuthStore';
import { useViewStore } from './useViewStore';
import { toast } from 'react-hot-toast';
import { MessageNotification } from '../components/common/MessageNotification';

interface ChatState {
    rooms: Room[];
    activeRoom: Room | null;
    messages: Message[];
    isConnected: boolean;
    socket: WebSocket | null;
    isLoading: boolean;
    aiSuggestion: { content: string, messageId: string, isStreaming: boolean } | null;
    replyingTo: Message | null;
    editingMessage: Message | null;
    forwardingMessage: Message | null;
    isMuted: boolean;
    searchResults: Message[];
    searchQuery: string;
    isViewingPinned: boolean;
    aiTypingRooms: Record<string, boolean>; // room_id: boolean
    typingUsers: Record<string, Record<string, string>>; // room_id: { user_id: username }
    activeDropdownId: string | null; // ID of the currently open dropdown
    viewingUser: User | null; // Profile view state
    roomMembers: User[]; // Members of the active room
    lastReadMessageIds: Record<string, string>; // room_id: last_message_id_viewed
    isHydrated: boolean;

    fetchRooms: (silent?: boolean) => Promise<void>;
    setActiveRoom: (room: Room | null) => Promise<void>;
    fetchRoomMembers: (roomId: string) => Promise<void>;
    setViewingUser: (user: User | null) => void;
    setLastReadMessageId: (roomId: string, messageId: string) => void;
    setHydrated: (val: boolean) => void;
    connect: (token: string) => void;
    disconnect: () => void;
    sendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file', name?: string }, receiverId?: string) => boolean;
    editMessage: (messageId: string, content: string) => void;
    recallMessage: (messageId: string) => void;
    deleteMessageForMe: (messageId: string) => void;
    pinMessage: (messageId: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
    reportMessage: (messageId: string, reason?: string) => void;
    forwardMessage: (msg: Message, targetRoomId: string) => Promise<boolean>;
    setReplyingTo: (msg: Message | null) => void;
    setEditingMessage: (msg: Message | null) => void;
    setForwardingMessage: (msg: Message | null) => void;
    addMessage: (msg: Message) => void;
    clearSuggestion: () => void;
    uploadFile: (file: File) => Promise<{ url: string, type: 'image' | 'file', filename: string }>;
    clearHistory: (roomId: string) => Promise<void>;
    togglePin: (roomId: string) => Promise<void>;
    deleteRoom: (roomId: string) => Promise<void>;
    updateRoomInfo: (roomId: string, data: { name?: string, avatar_url?: string }) => Promise<void>;
    addRoomMembers: (roomId: string, memberIds: string[]) => Promise<void>;
    changeMemberRole: (roomId: string, userId: string, role: string) => Promise<void>;
    sendReadReceipt: (roomId: string, messageId?: string) => void;
    searchMessages: (query: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    toggleMute: () => void;
    setViewingPinned: (val: boolean) => void;
    dismissSuggestions: (messageId: string) => void;
    setActiveDropdown: (id: string | null) => void;
    sendTypingStatus: (status: boolean) => void;
    reset: () => void;
}

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000];

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => {
    let reconnectAttempt = 0;
    let heartBeatTimer: number | null = null;

    const startHeartbeat = (socket: WebSocket) => {
        if (heartBeatTimer) clearInterval(heartBeatTimer);
        heartBeatTimer = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 30000);
    };

    return {
        rooms: [],
        activeRoom: null,
        messages: [],
        isConnected: false,
        socket: null,
        isLoading: false,
        aiSuggestion: null,
        replyingTo: null,
        editingMessage: null,
        forwardingMessage: null,
        isMuted: false,
        searchResults: [],
        searchQuery: '',
        isViewingPinned: false,
        aiTypingRooms: {},
        typingUsers: {},
        activeDropdownId: null,
        viewingUser: null,
        roomMembers: [],
        lastReadMessageIds: {},
        isHydrated: false,

        fetchRooms: async (silent = false) => {
            if (!silent) set({ isLoading: true });
            try {
                const response = await chatService.getRooms();
                const sortedRooms = response.data.sort((a: any, b: any) => {
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                    const timeA = new Date(a.updated_at || 0).getTime();
                    const timeB = new Date(b.updated_at || 0).getTime();
                    return timeB - timeA;
                });
                
                set({ rooms: sortedRooms });
                
                const currentActive = get().activeRoom;
                if (currentActive) {
                    const freshRoom = sortedRooms.find((r: any) => r.id === currentActive.id);
                    if (freshRoom) {
                        // Nếu chưa có tin nhắn (thường là sau khi reload), tải lại context phòng
                        if (get().messages.length === 0) {
                            await get().setActiveRoom(freshRoom);
                        } else {
                            set({ activeRoom: freshRoom });
                        }
                    }
                }

                // Nếu đang view profile của chính mình khi reload, cập nhật lại data mới nhất
                const vUser = get().viewingUser;
                const cUser = useAuthStore.getState().currentUser;
                if (vUser && cUser && vUser.id === cUser.id) {
                    set({ viewingUser: cUser });
                }
            } catch (error) {
                console.error('Fetch rooms failed:', error);
            } finally {
                if (!silent) set({ isLoading: false });
            }
        },

        setActiveRoom: async (room: Room | null) => {
            if (!room) {
                set({ activeRoom: null, messages: [], roomMembers: [] });
                return;
            }
            // Xóa trạng thái chưa đọc khi vào phòng
            set(state => ({
                activeRoom: room,
                messages: [],
                isLoading: true,
                // Chỉ xóa viewingUser nếu đang ở chế độ xem chat thông thường (không phải đang xem profile)
                // Hoặc nếu room thay đổi mà không phải do reload
                viewingUser: state.viewingUser, 
                roomMembers: [],
                rooms: state.rooms.map(r => r.id === room.id ? { ...r, has_unread: false, unread_count: 0 } : r)
            }));

            // Tải thành viên song song với tin nhắn nếu là phòng nhóm hoặc public
            if (room.type !== 'ai' && room.id !== 'ai' && room.id !== 'help') {
                get().fetchRoomMembers(room.id);
            }

            try {
                const response = await chatService.getMessages(room.id);
                const formattedMessages: Message[] = response.data.map((m: any) => ({
                    id: m.id,
                    senderId: m.sender_id,
                    senderName: m.sender_name,
                    senderAvatar: m.sender_avatar,
                    content: m.content,
                    timestamp: m.timestamp,
                    isBot: m.is_bot,
                    file_url: m.file_url,
                    file_name: m.file_name,
                    file_type: m.file_type,
                    is_edited: m.is_edited,
                    is_recalled: m.is_recalled,
                    is_pinned: m.is_pinned,
                    status: m.status,
                    reply_to_id: m.reply_to_id,
                    reply_to_content: m.reply_to_content,
                    suggestions: m.suggestions
                }));
                set({ messages: formattedMessages });
                
                // Gửi thông báo đã đọc sau khi đã tải xong tin nhắn để đảm bảo logic scroll hoạt động
                get().sendReadReceipt(room.id);
            } catch (error) {
                console.error('Fetch message history failed:', error);
            } finally {
                set({ isLoading: false });
            }
        },

        fetchRoomMembers: async (roomId: string) => {
            try {
                const response = await chatService.getRoomMembers(roomId);
                set({ roomMembers: response.data });
            } catch (error) {
                console.error('Fetch room members failed:', error);
            }
        },

        setViewingUser: (user: User | null) => set({ viewingUser: user }),

        setLastReadMessageId: (roomId: string, messageId: string) => {
            set((state) => ({
                lastReadMessageIds: {
                    ...state.lastReadMessageIds,
                    [roomId]: messageId
                }
            }));
        },

        setHydrated: (val: boolean) => set({ isHydrated: val }),

        addMessage: (msg: Message) => {
            set((state) => {
                // Ensure room IDs are compared consistently
                const msgRoomId = String(msg.roomId);
                const activeRoomId = state.activeRoom ? String(state.activeRoom.id) : null;
                const isCurrentRoom = msgRoomId === activeRoomId;
                
                // If message already exists (e.g. from local optimistic update), update it
                const existingIndex = state.messages.findIndex(m => m.id === msg.id);
                let newMessages = [...state.messages];
                
                if (isCurrentRoom) {
                    if (existingIndex > -1) {
                        newMessages[existingIndex] = { ...newMessages[existingIndex], ...msg };
                    } else {
                        newMessages.push(msg);
                    }
                }

                const roomToUpdate = msgRoomId;
                let roomExists = false;
                
                const updatedRooms = state.rooms.map(room => {
                    if (String(room.id) === roomToUpdate) {
                        roomExists = true;
                        const currentUserId = useAuthStore.getState().currentUser?.id;
                        const isFromMe = msg.senderId === currentUserId;
                        
                        // Handle localized preview for files/images
                        let previewContent = msg.content;
                        if (!previewContent) {
                            if (msg.file_type === 'image') previewContent = '[Hình ảnh]';
                            else if (msg.file_type === 'file') previewContent = '[Tệp đính kèm]';
                            else if (msg.is_recalled) previewContent = 'Tin nhắn đã được thu hồi';
                        }
                        
                        return { 
                            ...room, 
                            updated_at: msg.timestamp,
                            last_message: previewContent,
                            last_message_id: msg.id,
                            last_message_sender: msg.senderName,
                            last_message_at: msg.timestamp,
                            has_unread: isCurrentRoom || isFromMe ? false : true,
                            unread_count: (isCurrentRoom || isFromMe) ? 0 : (room.unread_count || 0) + 1
                        };
                    }
                    return room;
                });

                // If room doesn't exist in list (e.g. new direct chat from stranger), 
                // we should probably trigger a refresh or add a placeholder
                if (!roomExists && roomToUpdate && roomToUpdate !== 'undefined') {
                    // Trigger a refresh of the room list in the background silently
                    setTimeout(() => get().fetchRooms(true), 200);
                }

                const sortedRooms = [...updatedRooms].sort((a, b) => {
                    // Ưu tiên các phòng được ghim
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                    // Sắp xếp theo thời gian cập nhật mới nhất
                    const timeA = new Date(a.updated_at || 0).getTime();
                    const timeB = new Date(b.updated_at || 0).getTime();
                    if (isNaN(timeA)) return 1;
                    if (isNaN(timeB)) return -1;
                    return timeB - timeA;
                });

                return {
                    messages: newMessages,
                    rooms: sortedRooms
                };
            });
        },

        clearSuggestion: () => set({ aiSuggestion: null }),

        connect: (token: string) => {
            if (get().isConnected) return;

            const socket = new WebSocket(`ws://localhost:8000/api/v1/ws/${token}`);

            socket.onopen = () => {
                set({ isConnected: true, socket });
                reconnectAttempt = 0;
                startHeartbeat(socket);
                console.log('✅ WebSocket Connected');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return;

                    switch (data.type) {
                        case 'message':
                            const currentUserId = useAuthStore.getState().currentUser?.id;
                            
                            // LinkUp: Isolation logic for help room
                            if (data.room_id === 'help') {
                                const isAdmin = useAuthStore.getState().currentUser?.role === 'admin' || 
                                               useAuthStore.getState().currentUser?.is_superuser;
                                const isPersonal = (data.sender_id === currentUserId && !data.receiver_id) || 
                                                 (data.receiver_id === currentUserId) ||
                                                 (isAdmin); // Admins see all help messages
                                if (!isPersonal) return;
                            }

                            const msgData = {
                                id: data.message_id || data.id || Math.random().toString(36).substr(2, 9),
                                roomId: data.room_id,
                                senderId: data.sender_id,
                                senderName: data.sender_name || data.sender,
                                senderAvatar: data.sender_avatar,
                                content: data.content,
                                file_url: data.file_url,
                                file_name: data.file_name,
                                file_type: data.file_type,
                                timestamp: data.timestamp || new Date().toISOString(),
                                isBot: data.is_bot,
                                is_edited: data.is_edited,
                                is_recalled: data.is_recalled,
                                is_pinned: data.is_pinned,
                                status: data.status || 'sent',
                                reply_to_id: data.reply_to_id,
                                reply_to_content: data.reply_to_content
                            };

                            console.log("📩 Mới nhận tin nhắn:", msgData.content, "từ", msgData.senderName);
                            get().addMessage(msgData);
                        
                            // Hiển thị thông báo nổi nếu:
                            // 1. Không phải tin nhắn của mình
                            // 2. Không đang ở trong phòng đó
                            const currentUser = useAuthStore.getState().currentUser;
                            const isMe = String(data.sender_id) === String(currentUserId);
                            const isActiveRoom = String(get().activeRoom?.id) === String(data.room_id);

                            console.log("🔔 KT Thông báo:", { isMe, isActiveRoom, notiSetting: currentUser?.app_settings?.notifications });

                            if (!isMe && !isActiveRoom && currentUser?.app_settings?.notifications !== false) {
                                console.log("✨ Đang hiển thị toast...");
                                // Thử nghiệm cả 2 loại toast
                                toast.success(`Tin nhắn mới từ ${msgData.senderName}: ${msgData.content.substring(0, 20)}...`);
                                
                                toast.custom((t) => (
                                    <MessageNotification
                                        t={t}
                                        senderName={msgData.senderName || 'Người dùng'}
                                        senderAvatar={msgData.senderAvatar}
                                        content={msgData.content || (msgData.file_type === 'image' ? '[Hình ảnh]' : '[Tập tin]')}
                                        onClick={() => {
                                            const room = get().rooms.find(r => String(r.id) === String(data.room_id));
                                            if (room) {
                                                get().setActiveRoom(room);
                                                useViewStore.getState().setView('chat');
                                            }
                                        }}
                                    />
                                ), { 
                                    duration: 5000,
                                    position: 'bottom-right' 
                                });
                            }

                            // Auto read receipt for active room
                            if (get().activeRoom?.id === data.room_id && data.sender_id !== currentUserId) {
                                get().sendReadReceipt(data.room_id, data.message_id);
                            }
                            break;
                    case 'read_receipt':
                        set(state => ({
                            messages: state.messages.map(m => {
                                if (data.message_id) {
                                    if (m.id === data.message_id) return { ...m, status: 'seen' };
                                } else {
                                    // Tất cả tin nhắn trong phòng từ người khác gửi
                                    if (m.senderId !== data.user_id && m.status !== 'seen') {
                                        return { ...m, status: 'seen' };
                                    }
                                }
                                return m;
                            })
                        }));
                        break;
                    case 'edit_message':
                        set(state => {
                            const newMessages = state.messages.map(m => {
                                if (m.id === data.message_id) {
                                    return { ...m, content: data.content, is_edited: true };
                                }
                                // Đồng bộ phần nội dung preview nếu tin nhắn này được người khác reply
                                if (m.reply_to_id === data.message_id) {
                                    return { ...m, reply_to_content: data.content };
                                }
                                return m;
                            });
                            
                            // Cập nhật xem tin nhắn vừa sửa có phải là tin nhắn cuối cùng ở Sidebar không
                            const updatedRooms = state.rooms.map(room => {
                                if (room.id === data.room_id && room.last_message_id === data.message_id) {
                                    return { ...room, last_message: data.content };
                                }
                                return room;
                            });
                            
                            return { messages: newMessages, rooms: updatedRooms };
                        });
                        break;
                    case 'recall_message':
                        set(state => {
                            const newMessages = state.messages.map(m => {
                                if (m.id === data.message_id) {
                                    return { ...m, is_recalled: true, content: 'Tin nhắn đã được thu hồi' };
                                }
                                // Đồng bộ phần nội dung preview nếu tin nhắn này được người khác reply
                                if (m.reply_to_id === data.message_id) {
                                    return { ...m, reply_to_content: 'Tin nhắn đã được thu hồi' };
                                }
                                return m;
                            });
                            
                            const updatedRooms = state.rooms.map(room => {
                                if (room.id === data.room_id && room.last_message_id === data.message_id) {
                                    return { ...room, last_message: 'Tin nhắn đã được thu hồi' };
                                }
                                return room;
                            });
                            
                            return { messages: newMessages, rooms: updatedRooms };
                        });
                        break;
                    case 'pin_message':
                        set(state => ({
                            messages: state.messages.map(m => 
                                m.id === data.message_id ? { ...m, is_pinned: data.is_pinned } : m
                            )
                        }));
                        break;
                    case 'member_role_updated':
                        if (get().activeRoom?.id === data.room_id) {
                            set(state => ({
                                roomMembers: state.roomMembers.map(m => 
                                    m.id === data.user_id ? { ...m, role: data.new_role } : m
                                )
                            }));
                        }
                        break;
                    case 'room_updated':
                        set(state => ({
                            rooms: state.rooms.map(r => r.id === data.room.id ? { ...r, ...data.room } : r),
                            activeRoom: state.activeRoom?.id === data.room.id ? { ...state.activeRoom, ...data.room } : state.activeRoom
                        }));
                        break;
                    case 'members_added':
                        if (get().activeRoom?.id === data.room_id) {
                            get().fetchRoomMembers(data.room_id);
                        }
                        break;
                    case 'member_left':
                        if (get().activeRoom?.id === data.room_id) {
                            if (data.user_id === useAuthStore.getState().currentUser?.id) {
                                // I was kicked or I left
                                set({ activeRoom: null, roomMembers: [] });
                                toast.error("Bạn đã không còn ở trong phòng này");
                            } else {
                                set(state => ({
                                    roomMembers: state.roomMembers.filter(m => m.id !== data.user_id)
                                }));
                            }
                        }
                        // Also update rooms list (remove if it was me)
                        if (data.user_id === useAuthStore.getState().currentUser?.id) {
                            set(state => ({
                                rooms: state.rooms.filter(r => r.id !== data.room_id)
                            }));
                        }
                        break;
                    case 'reaction':
                        set(state => ({
                            messages: state.messages.map(m => 
                                m.id === data.message_id ? { ...m, reactions: data.reactions } : m
                            )
                        }));
                        break;
                    case 'user_status_change':
                        set(state => {
                            const updatedRooms = state.rooms.map(room => {
                                if (room.type === 'direct' && room.id.includes(data.user_id)) {
                                    return { ...room, is_online: data.is_online };
                                }
                                return room;
                            });

                            let updatedActiveRoom = state.activeRoom;
                            if (updatedActiveRoom && updatedActiveRoom.type === 'direct' && updatedActiveRoom.id.includes(data.user_id)) {
                                updatedActiveRoom = { ...updatedActiveRoom, is_online: data.is_online };
                            }

                            let updatedViewingUser = state.viewingUser;
                            if (updatedViewingUser && updatedViewingUser.id === data.user_id) {
                                updatedViewingUser = { ...updatedViewingUser, is_online: data.is_online };
                            }

                            return {
                                rooms: updatedRooms,
                                activeRoom: updatedActiveRoom,
                                viewingUser: updatedViewingUser
                            };
                        });
                        break;
                    case 'force_logout':
                        toast.error(data.message || "Phiên đăng nhập của bạn đã bị kết thúc bởi quản trị viên.");
                        get().disconnect();
                        useAuthStore.getState().logout();
                        break;
                    case 'user_blocked_me':
                        // Cập nhật trạng thái bị chặn vào AuthStore
                        const authStore = useAuthStore.getState();
                        if (authStore.currentUser) {
                            const blockedBy = authStore.currentUser.blocked_by || [];
                            if (!blockedBy.includes(data.by_user_id)) {
                                useAuthStore.setState({
                                    currentUser: {
                                        ...authStore.currentUser,
                                        blocked_by: [...blockedBy, data.by_user_id]
                                    }
                                });
                            }
                        }
                        
                        set(state => {
                            // Cập nhật trong danh sách rooms
                            const updatedRooms = state.rooms.map(room => {
                                if (room.other_user_id === data.by_user_id || room.id.includes(data.by_user_id)) {
                                    return { ...room, blocked_by_other: true, is_online: false };
                                }
                                return room;
                            });

                            // Cập nhật trạng thái chặn trong activeRoom nếu đang chat với người đó
                            let updatedActiveRoom = state.activeRoom;
                            if (updatedActiveRoom && (updatedActiveRoom.other_user_id === data.by_user_id || updatedActiveRoom.id.includes(data.by_user_id))) {
                                updatedActiveRoom = { ...updatedActiveRoom, blocked_by_other: true, is_online: false };
                                toast.error("Bạn hiện không thể gửi tin nhắn cho người dùng này");
                            }

                            return { 
                                rooms: updatedRooms,
                                activeRoom: updatedActiveRoom
                            };
                        });
                        break;
                    case 'user_unblocked_me':
                        // Cập nhật trạng thái bỏ chặn vào AuthStore
                        const authStoreUnblock = useAuthStore.getState();
                        if (authStoreUnblock.currentUser && authStoreUnblock.currentUser.blocked_by) {
                            useAuthStore.setState({
                                currentUser: {
                                    ...authStoreUnblock.currentUser,
                                    blocked_by: authStoreUnblock.currentUser.blocked_by.filter(id => id !== data.by_user_id)
                                }
                            });
                        }

                        set(state => {
                            const updatedRooms = state.rooms.map(room => {
                                if (room.other_user_id === data.by_user_id || room.id.includes(data.by_user_id)) {
                                    return { ...room, blocked_by_other: false };
                                }
                                return room;
                            });

                            let updatedActiveRoom = state.activeRoom;
                            if (updatedActiveRoom && (updatedActiveRoom.other_user_id === data.by_user_id || updatedActiveRoom.id.includes(data.by_user_id))) {
                                updatedActiveRoom = { ...updatedActiveRoom, blocked_by_other: false };
                                toast.success("Bạn đã được bỏ chặn");
                            }

                            return { 
                                rooms: updatedRooms,
                                activeRoom: updatedActiveRoom
                            };
                        });
                        break;
                    case 'user_i_blocked':
                        const authStoreIBlocked = useAuthStore.getState();
                        if (authStoreIBlocked.currentUser) {
                            const blockedUsers = authStoreIBlocked.currentUser.blocked_users || [];
                            if (!blockedUsers.includes(data.target_user_id)) {
                                useAuthStore.setState({
                                    currentUser: {
                                        ...authStoreIBlocked.currentUser,
                                        blocked_users: [...blockedUsers, data.target_user_id]
                                    }
                                });
                            }
                        }
                        // Cập nhật trạng thái is_online trong danh sách chat cho session này
                        set(state => {
                            const updatedRooms = state.rooms.map(room => {
                                if (room.other_user_id === data.target_user_id || room.id.includes(data.target_user_id)) {
                                    return { ...room, is_online: false };
                                }
                                return room;
                            });
                            return { rooms: updatedRooms };
                        });
                        break;
                    case 'user_i_unblocked':
                        const authStoreIUnblocked = useAuthStore.getState();
                        if (authStoreIUnblocked.currentUser && authStoreIUnblocked.currentUser.blocked_users) {
                            useAuthStore.setState({
                                currentUser: {
                                    ...authStoreIUnblocked.currentUser,
                                    blocked_users: authStoreIUnblocked.currentUser.blocked_users.filter(id => id !== data.target_user_id)
                                }
                            });
                        }
                        break;
                    case 'ai_suggestion':
                        set({ 
                            aiSuggestion: { 
                                messageId: data.message_id || 'error', 
                                content: data.content, 
                                isStreaming: false 
                            } 
                        });
                        break;
                    case 'ai_suggestion_start':
                        set({ aiSuggestion: { messageId: data.message_id || 'suggest', content: '', isStreaming: true } });
                        break;
                    case 'ai_suggestion_chunk':
                        set((state) => {
                            if (state.aiSuggestion && state.aiSuggestion.messageId === data.message_id) {
                                return { 
                                    aiSuggestion: { 
                                        ...state.aiSuggestion, 
                                        content: state.aiSuggestion.content + data.content 
                                    } 
                                };
                            }
                            return state;
                        });
                        break;
                    case 'ai_suggestion_end':
                        set((state) => {
                            if (state.aiSuggestion && state.aiSuggestion.messageId === data.message_id) {
                                return { 
                                    aiSuggestion: { 
                                        ...state.aiSuggestion, 
                                        isStreaming: false 
                                    } 
                                };
                            }
                            return state;
                        });
                        break;
                    case 'start':
                        get().addMessage({
                            id: data.message_id,
                            roomId: data.room_id,
                            senderId: 'ai-bot',
                            senderName: data.sender || 'AI',
                            senderAvatar: data.sender_avatar,
                            content: '',
                            timestamp: new Date().toISOString(),
                            isBot: true,
                            isStreaming: true,
                        });
                        break;
                    case 'chunk':
                    case 'stream':
                        set((state) => {
                            const newMessages = [...state.messages];
                            const msgIndex = newMessages.findIndex(m => m.id === data.message_id);
                            if (msgIndex !== -1) {
                                newMessages[msgIndex] = {
                                    ...newMessages[msgIndex],
                                    content: newMessages[msgIndex].content + data.content,
                                    isStreaming: true,
                                };
                            }
                            return { messages: newMessages };
                        });
                        break;
                    case 'end':
                        set((state) => {
                            const newMessages = [...state.messages];
                            const msgIndex = newMessages.findIndex(m => m.id === data.message_id);
                            if (msgIndex !== -1) {
                                newMessages[msgIndex] = {
                                    ...newMessages[msgIndex],
                                    isStreaming: false,
                                    timestamp: data.timestamp || newMessages[msgIndex].timestamp
                                };
                            }

                            // Update room updated_at when AI finishes
                            const updatedRooms = state.rooms.map(room => 
                                room.id === data.room_id 
                                    ? { ...room, updated_at: data.timestamp || room.updated_at }
                                    : room
                            ).sort((a, b) => {
                                if (a.is_pinned && !b.is_pinned) return -1;
                                if (!a.is_pinned && b.is_pinned) return 1;
                                const timeA = new Date(a.updated_at || 0).getTime();
                                const timeB = new Date(b.updated_at || 0).getTime();
                                return timeB - timeA;
                            });

                            const newAiTyping = { ...state.aiTypingRooms };
                            delete newAiTyping[data.room_id];

                            return { 
                                messages: newMessages, 
                                rooms: updatedRooms, 
                                aiTypingRooms: newAiTyping
                            };
                        });
                        break;
                    case 'support_status_update':
                        set(state => {
                            const updatedRooms = state.rooms.map(room => {
                                if (room.id === data.room_id || room.id === 'help') {
                                    return { ...room, support_status: data.status };
                                }
                                return room;
                            });

                            let updatedActiveRoom = state.activeRoom;
                            if (updatedActiveRoom && (updatedActiveRoom.id === data.room_id || updatedActiveRoom.id === 'help')) {
                                updatedActiveRoom = { ...updatedActiveRoom, support_status: data.status };
                            }

                            return { 
                                rooms: updatedRooms,
                                activeRoom: updatedActiveRoom
                            };
                        });
                        break;
                    case 'typing':
                        set(state => {
                            const roomId = data.room_id || 'unknown';
                            if (data.user_id) {
                                // Ngăn hiển thị trạng thái đang soạn tin của chính mình
                                if (data.user_id === useAuthStore.getState().currentUser?.id) return state;

                                const newTyping = { ...state.typingUsers };
                                if (!newTyping[roomId]) {
                                    newTyping[roomId] = {};
                                } else {
                                    newTyping[roomId] = { ...newTyping[roomId] };
                                }

                                if (data.status) {
                                    newTyping[roomId][data.user_id] = data.full_name || data.username;
                                } else {
                                    delete newTyping[roomId][data.user_id];
                                }
                                
                                if (Object.keys(newTyping[roomId]).length === 0) {
                                    delete newTyping[roomId];
                                }
                                
                                return { ...state, typingUsers: newTyping };
                            } else {
                                // AI typing
                                const newAiTyping = { ...state.aiTypingRooms };
                                if (data.status) {
                                    newAiTyping[roomId] = true;
                                } else {
                                    delete newAiTyping[roomId];
                                }
                                return { ...state, aiTypingRooms: newAiTyping };
                            }
                        });
                        break;
                    case 'new_room':
                        set(state => {
                            if (state.rooms.some(r => r.id === data.room.id)) return state;
                            
                            const newRooms = [data.room, ...state.rooms].sort((a, b) => {
                                if (a.is_pinned && !b.is_pinned) return -1;
                                if (!a.is_pinned && b.is_pinned) return 1;
                                const timeA = new Date(a.updated_at || 0).getTime();
                                const timeB = new Date(b.updated_at || 0).getTime();
                                return timeB - timeA;
                            });
                            
                            return { rooms: newRooms };
                        });
                        toast.success(`Bạn có phòng chat mới: ${data.room.name}`);
                        break;
                    case 'ai_suggestions_list':
                        set((state) => {
                            const newMessages = state.messages.map(m => 
                                m.id === data.message_id ? { ...m, suggestions: data.suggestions } : m
                            );
                            return { messages: newMessages };
                        });
                        break;
                    case 'delete_for_me_success':
                        set((state) => {
                            const newMessages = state.messages.filter(m => m.id !== data.message_id);
                            
                            // Cập nhật last_message cho sidebar nếu tin nhắn bị xóa là cuối cùng
                            const updatedRooms = state.rooms.map(room => {
                                if (room.id === data.room_id && room.last_message_id === data.message_id) {
                                    // Tìm tin nhắn cuối cùng mới từ danh sách messages hiện có
                                    const nextLastMsg = [...newMessages].reverse()[0];
                                    return {
                                        ...room,
                                        last_message: nextLastMsg ? (nextLastMsg.is_recalled ? 'Tin nhắn đã được thu hồi' : nextLastMsg.content) : '',
                                        last_message_id: nextLastMsg ? nextLastMsg.id : undefined,
                                        last_message_sender: nextLastMsg ? nextLastMsg.senderName : undefined,
                                        last_message_at: nextLastMsg ? nextLastMsg.timestamp : undefined
                                    };
                                }
                                return room;
                            });

                            return { 
                                messages: newMessages,
                                rooms: updatedRooms
                            };
                        });
                        break;
                    case 'report_success':
                        toast.success(data.message || "Đã gửi báo cáo thành công");
                        break;
                }
                } catch (error) {
                    console.error('WebSocket message processing error:', error);
                }
            };

            socket.onclose = () => {
                set({ isConnected: false, socket: null });
                if (heartBeatTimer) clearInterval(heartBeatTimer);
                
                // Reconnect logic: Chỉ reconnect nếu vẫn còn token trong AuthStore
                const currentToken = useAuthStore.getState().token;
                if (!currentToken) {
                    console.log('🔇 No token found, stopping reconnection');
                    reconnectAttempt = 0;
                    return;
                }

                const interval = RECONNECT_INTERVALS[reconnectAttempt] || 10000;
                reconnectAttempt = Math.min(reconnectAttempt + 1, RECONNECT_INTERVALS.length - 1);
                
                console.log(`🔄 WebSocket closed. Reconnecting in ${interval}ms... (Attempt ${reconnectAttempt})`);
                
                setTimeout(() => {
                    const latestToken = useAuthStore.getState().token;
                    if (latestToken) {
                        get().connect(latestToken);
                    }
                }, interval);
            };
        },

        disconnect: () => {
            if (get().socket) {
                get().socket?.close();
            }
            if (heartBeatTimer) clearInterval(heartBeatTimer);
            set({ isConnected: false, socket: null, messages: [], replyingTo: null, editingMessage: null });
        },

        sendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file', name?: string }, receiverId?: string) => {
            const { socket, activeRoom } = get();
            if (activeRoom && (!socket || socket.readyState !== WebSocket.OPEN)) {
                toast.error("Mất kết nối server. Vui lòng chờ đang kết nối lại...");
                const token = useAuthStore.getState().token;
                if (token) get().connect(token);
                return false;
            }
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                // Optimistic Update
                const currentUserId = useAuthStore.getState().currentUser?.id;
                const currentUsername = useAuthStore.getState().currentUser?.username;
                const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                const optimisticMsg: Message = {
                    id: tempId,
                    roomId: activeRoom.id,
                    senderId: currentUserId || '',
                    senderName: currentUsername || 'Bạn',
                    content: content,
                    timestamp: new Date().toISOString(),
                    status: 'sending',
                    file_url: fileData?.url,
                    file_name: fileData?.name,
                    file_type: fileData?.type,
                    reply_to_id: replyToId,
                    isBot: false
                };
                
                get().addMessage(optimisticMsg);

                socket.send(JSON.stringify({
                    type: 'message',
                    id: tempId, // Gửi tempId để backend trả về nếu cần (tùy backend hỗ trợ)
                    content,
                    room_id: activeRoom.id,
                    reply_to_id: replyToId,
                    receiver_id: receiverId,
                    file_url: fileData?.url,
                    file_name: fileData?.name,
                    file_type: fileData?.type
                }));
                set({ replyingTo: null });
                return true;
            }
            return false;
        },

        editMessage: (messageId: string, content: string) => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'edit',
                    message_id: messageId,
                    content: content,
                    room_id: activeRoom.id
                }));
                set({ editingMessage: null });
            }
        },

        recallMessage: (messageId: string) => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'recall',
                    message_id: messageId,
                    room_id: activeRoom.id
                }));
            }
        },

        deleteMessageForMe: (messageId: string) => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'delete_for_me',
                    message_id: messageId,
                    room_id: activeRoom.id
                }));
                // Tạm thời xóa khỏi store ngay để UI mượt mà
                set((state) => ({
                    messages: state.messages.filter(m => m.id !== messageId)
                }));
            }
        },

        pinMessage: (messageId: string) => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'pin',
                    message_id: messageId,
                    room_id: activeRoom.id
                }));
            }
        },

        addReaction: (messageId: string, emoji: string) => {
            const { socket, activeRoom } = get();
            const currentUserId = useAuthStore.getState().currentUser?.id;

            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'reaction',
                    message_id: messageId,
                    room_id: activeRoom.id,
                    emoji: emoji
                }));
            }

            if (!currentUserId) return;

            // Local update for immediate feedback
            set((state) => ({
                messages: state.messages.map(m => {
                    if (m.id === messageId) {
                        const reactions = { ...(m.reactions || {}) };
                        const users = [...(reactions[emoji] || [])];
                        
                        if (users.includes(currentUserId)) {
                            reactions[emoji] = users.filter(u => u !== currentUserId);
                            if (reactions[emoji].length === 0) delete reactions[emoji];
                        } else {
                            reactions[emoji] = [...users, currentUserId];
                        }
                        return { ...m, reactions };
                    }
                    return m;
                })
            }));
        },

        reportMessage: (messageId: string, reason: string = "Phàn nàn chung") => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'report',
                    message_id: messageId,
                    room_id: activeRoom.id,
                    reason: reason
                }));
            }
        },

        forwardMessage: async (msg: Message, targetRoomId: string) => {
            const { socket } = get();
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'message',
                    content: msg.content,
                    room_id: targetRoomId,
                    file_url: msg.file_url,
                    file_name: msg.file_name,
                    file_type: msg.file_type,
                    is_forwarded: true
                }));
                return true;
            }
            return false;
        },

        setReplyingTo: (msg: Message | null) => set({ replyingTo: msg }),
        setEditingMessage: (msg: Message | null) => set({ editingMessage: msg }),
        setForwardingMessage: (msg: Message | null) => set({ forwardingMessage: msg }),

        uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const activeRoomId = get().activeRoom?.id;
            const response = await chatService.uploadFile(formData, 'file', activeRoomId);
            return {
                url: response.data.url,
                type: response.data.type,
                filename: response.data.filename
            };
        },

        clearHistory: async (roomId: string) => {
            set({ isLoading: true });
            try {
                await chatService.clearHistory(roomId);
                if (get().activeRoom?.id === roomId) {
                    set({ messages: [] });
                }
                // Cập nhật danh sách room để xóa tin nhắn cuối
                set(state => ({
                    rooms: state.rooms.map(r => r.id === roomId ? { ...r, last_message: "" } : r)
                }));
            } catch (error) {
                console.error('Clear history error:', error);
            } finally {
                set({ isLoading: false });
            }
        },

        togglePin: async (roomId: string) => {
            try {
                await chatService.togglePin(roomId);
                set(state => ({
                    rooms: state.rooms.map(r => 
                        r.id === roomId ? { ...r, is_pinned: !r.is_pinned } : r
                    ).sort((a, b) => {
                        if (a.is_pinned && !b.is_pinned) return -1;
                        if (!a.is_pinned && b.is_pinned) return 1;
                        const timeA = new Date(a.updated_at || 0).getTime();
                        const timeB = new Date(b.updated_at || 0).getTime();
                        return timeB - timeA;
                    })
                }));
            } catch (error) {
                console.error('Toggle pin failed:', error);
            }
        },

        deleteRoom: async (roomId: string) => {
            set({ isLoading: true });
            try {
                await chatService.deleteRoom(roomId);
                set(state => ({
                    rooms: state.rooms.filter(r => r.id !== roomId),
                    activeRoom: state.activeRoom?.id === roomId ? null : state.activeRoom,
                    messages: state.activeRoom?.id === roomId ? [] : state.messages
                }));
            } catch (error) {
                console.error('Delete room error:', error);
                throw error;
            } finally {
                set({ isLoading: false });
            }
        },

        updateRoomInfo: async (roomId: string, data: { name?: string, avatar_url?: string }) => {
            try {
                const response = await chatService.updateRoom(roomId, data);
                const updatedRoom = response.data;
                set(state => ({
                    rooms: state.rooms.map(r => r.id === roomId ? { ...r, ...updatedRoom } : r),
                    activeRoom: state.activeRoom?.id === roomId ? { ...state.activeRoom, ...updatedRoom } : state.activeRoom
                }));
                toast.success('Cập nhật thông tin nhóm thành công');
            } catch (error) {
                console.error('Update room info failed:', error);
                toast.error('Không thể cập nhật thông tin nhóm');
                throw error;
            }
        },

        addRoomMembers: async (roomId: string, memberIds: string[]) => {
            try {
                await chatService.addMembers(roomId, memberIds);
                toast.success('Thêm thành viên thành công');
                // Refresh members list
                if (get().activeRoom?.id === roomId) {
                    await get().fetchRoomMembers(roomId);
                }
            } catch (error) {
                console.error('Add members failed:', error);
                toast.error('Không thể thêm thành viên');
                throw error;
            }
        },

        changeMemberRole: async (roomId: string, userId: string, role: string) => {
            try {
                await chatService.updateMemberRole(roomId, userId, role);
                // Local update for immediate feedback
                set(state => ({
                    roomMembers: state.roomMembers.map(m => 
                        m.id === userId ? { ...m, role } : m
                    )
                }));
                toast.success(role === 'admin' ? "Đã bổ nhiệm làm phó nhóm" : "Đã gỡ vai trò phó nhóm");
            } catch (error) {
                console.error('Change role error:', error);
                toast.error("Không thể thay đổi vai trò");
            }
        },

        removeMember: async (roomId: string, userId: string) => {
            try {
                await chatService.removeMember(roomId, userId);
                set(state => ({
                    roomMembers: state.roomMembers.filter(m => m.id !== userId)
                }));
                toast.success("Đã xóa thành viên khỏi nhóm");
            } catch (error) {
                console.error('Remove member error:', error);
                toast.error("Không thể xóa thành viên");
            }
        },

        sendReadReceipt: (roomId: string, messageId?: string) => {
            const { socket } = get();
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'read_receipt',
                    room_id: roomId,
                    message_id: messageId
                }));
            }
        },

        searchMessages: async (query: string) => {
            if (!query.trim()) {
                set({ searchResults: [], searchQuery: '' });
                return;
            }
            set({ isLoading: true, searchQuery: query });
            try {
                const response = await chatService.searchMessages(query, get().activeRoom?.id);
                set({ searchResults: response.data });
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                set({ isLoading: false });
            }
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),
        toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
        setViewingPinned: (val: boolean) => set({ isViewingPinned: val }),

        dismissSuggestions: (messageId: string) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, suggestionsDismissed: true } : msg
                ),
            }));
        },

        setActiveDropdown: (id: string | null) => set({ activeDropdownId: id }),

        sendTypingStatus: (status: boolean) => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'typing',
                    room_id: activeRoom.id,
                    status
                }));
            }
        },

        reset: () => {
            get().disconnect();
            set({
                rooms: [],
                activeRoom: null,
                messages: [],
                aiSuggestion: null,
                replyingTo: null,
                editingMessage: null,
                forwardingMessage: null,
                searchResults: [],
                searchQuery: '',
                isViewingPinned: false,
                aiTypingRooms: {},
                typingUsers: {},
                activeDropdownId: null,
                viewingUser: null,
                roomMembers: [],
            });
        },
    };
},
{
    name: 'linkup-chat-storage',
    partialize: (state: ChatState) => ({ 
        isMuted: state.isMuted,
        activeRoom: state.activeRoom,
        viewingUser: state.viewingUser,
        isViewingPinned: state.isViewingPinned,
        searchQuery: state.searchQuery,
        lastReadMessageIds: state.lastReadMessageIds
    }),
    onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
    }
}
));
