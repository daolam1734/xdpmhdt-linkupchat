import { create } from 'zustand';
import type { Message, Room, User } from '../types/chat';
import { chatService } from '../services/chat.service';
import { useAuthStore } from './useAuthStore';
import { toast } from 'react-hot-toast';

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
    isMuted: boolean;
    searchResults: Message[];
    searchQuery: string;
    isViewingPinned: boolean;
    isAiTyping: boolean;
    activeDropdownId: string | null; // ID of the currently open dropdown
    viewingUser: User | null; // Profile view state

    fetchRooms: () => Promise<void>;
    setActiveRoom: (room: Room | null) => Promise<void>;
    setViewingUser: (user: User | null) => void;
    connect: (token: string) => void;
    disconnect: () => void;
    sendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file' }, receiverId?: string) => boolean;
    editMessage: (messageId: string, content: string) => void;
    recallMessage: (messageId: string) => void;
    deleteMessageForMe: (messageId: string) => void;
    pinMessage: (messageId: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
    setReplyingTo: (msg: Message | null) => void;
    setEditingMessage: (msg: Message | null) => void;
    addMessage: (msg: Message) => void;
    clearSuggestion: () => void;
    uploadFile: (file: File) => Promise<{ url: string, type: 'image' | 'file', filename: string }>;
    clearHistory: (roomId: string) => Promise<void>;
    togglePin: (roomId: string) => Promise<void>;
    sendReadReceipt: (roomId: string, messageId?: string) => void;
    searchMessages: (query: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    toggleMute: () => void;
    setViewingPinned: (val: boolean) => void;
    dismissSuggestions: (messageId: string) => void;
    setActiveDropdown: (id: string | null) => void;
}

const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000];

export const useChatStore = create<ChatState>((set, get) => {
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
        isMuted: false,
        searchResults: [],
        searchQuery: '',
        isViewingPinned: false,
        isAiTyping: false,
        activeDropdownId: null,
        viewingUser: null,

        fetchRooms: async () => {
            set({ isLoading: true });
            try {
                const response = await chatService.getRooms();
                const sortedRooms = response.data.sort((a: any, b: any) => {
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                    // Nếu cùng trạng thái ghim, sắp xếp theo thời gian cập nhật
                    const timeA = new Date(a.updated_at || 0).getTime();
                    const timeB = new Date(b.updated_at || 0).getTime();
                    return timeB - timeA;
                });
                set({ rooms: sortedRooms });
                if (sortedRooms.length > 0 && !get().activeRoom && !get().viewingUser) {
                    get().setActiveRoom(sortedRooms[0]);
                }
            } catch (error) {
                console.error('Fetch rooms failed:', error);
            } finally {
                set({ isLoading: false });
            }
        },

        setActiveRoom: async (room: Room | null) => {
            if (!room) {
                set({ activeRoom: null, messages: [] });
                return;
            }
            set({ activeRoom: room, messages: [], isLoading: true, viewingUser: null });
            get().sendReadReceipt(room.id);
            try {
                const response = await chatService.getMessages(room.id);
                const formattedMessages: Message[] = response.data.map((m: any) => ({
                    id: m.id,
                    senderId: m.sender_id,
                    senderName: m.sender_name,
                    content: m.content,
                    timestamp: m.timestamp,
                    isBot: m.is_bot,
                    file_url: m.file_url,
                    file_type: m.file_type,
                    is_edited: m.is_edited,
                    is_recalled: m.is_recalled,
                    is_pinned: m.is_pinned,
                    reply_to_id: m.reply_to_id,
                    reply_to_content: m.reply_to_content,
                    suggestions: m.suggestions
                }));
                set({ messages: formattedMessages });
            } catch (error) {
                console.error('Fetch message history failed:', error);
            } finally {
                set({ isLoading: false });
            }
        },

        setViewingUser: (user: User | null) => set({ viewingUser: user }),

        addMessage: (msg: Message) => {
            set((state) => {
                const isCurrentRoom = msg.roomId === state.activeRoom?.id;
                
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

                const roomToUpdate = msg.roomId;
                let roomExists = false;
                
                const updatedRooms = state.rooms.map(room => {
                    if (room.id === roomToUpdate) {
                        roomExists = true;
                        return { 
                            ...room, 
                            updated_at: msg.timestamp,
                            last_message: msg.is_recalled ? 'Tin nhắn đã được thu hồi' : msg.content,
                            last_message_id: msg.id,
                            last_message_sender: msg.senderName,
                            last_message_at: msg.timestamp
                        };
                    }
                    return room;
                });

                // If room doesn't exist in list (e.g. new direct chat from stranger), 
                // we should probably trigger a refresh or add a placeholder
                if (!roomExists && roomToUpdate) {
                    // Trigger a refresh of the room list in the background
                    setTimeout(() => get().fetchRooms(), 500);
                }

                const sortedRooms = [...updatedRooms].sort((a, b) => {
                    // Ưu tiên các phòng được ghim
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                    // Sắp xếp theo thời gian cập nhật mới nhất
                    const timeA = new Date(a.updated_at || 0).getTime();
                    const timeB = new Date(b.updated_at || 0).getTime();
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
                const data = JSON.parse(event.data);
                if (data.type === 'pong') return;

                switch (data.type) {
                    case 'message':
                        get().addMessage({
                            id: data.message_id || Math.random().toString(36).substr(2, 9),
                            roomId: data.room_id,
                            senderId: data.sender_id,
                            senderName: data.sender_name || data.sender,
                            content: data.content,
                            file_url: data.file_url,
                            file_type: data.file_type,
                            timestamp: data.timestamp || new Date().toISOString(),
                            isBot: data.is_bot,
                            is_edited: data.is_edited,
                            is_recalled: data.is_recalled,
                            is_pinned: data.is_pinned,
                            status: data.status,
                            reply_to_id: data.reply_to_id,
                            reply_to_content: data.reply_to_content
                        });
                        
                        // Nếu đang ở đúng phòng, tự động gửi read receipt cho tin nhắn mới
                        const currentUserId = useAuthStore.getState().currentUser?.id;
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
                            senderId: 'ai-bot',
                            senderName: data.sender || 'AI',
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

                            return { messages: newMessages, rooms: updatedRooms, isAiTyping: false };
                        });
                        break;
                    case 'typing':
                        if (data.room_id === get().activeRoom?.id) {
                            set({ isAiTyping: data.status });
                        }
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
                        set((state) => ({
                            messages: state.messages.filter(m => m.id !== data.message_id)
                        }));
                        break;
                }
            };

            socket.onclose = () => {
                set({ isConnected: false, socket: null });
                if (heartBeatTimer) clearInterval(heartBeatTimer);
                
                // Reconnect logic
                const interval = RECONNECT_INTERVALS[reconnectAttempt] || 10000;
                reconnectAttempt = Math.min(reconnectAttempt + 1, RECONNECT_INTERVALS.length - 1);
                setTimeout(() => {
                    if (token) get().connect(token);
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

        sendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file' }, receiverId?: string) => {
            const { socket, activeRoom } = get();
            if (socket && socket.readyState === WebSocket.OPEN && activeRoom) {
                socket.send(JSON.stringify({
                    type: 'message',
                    content,
                    room_id: activeRoom.id,
                    reply_to_id: replyToId,
                    receiver_id: receiverId,
                    file_url: fileData?.url,
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

        setReplyingTo: (msg: Message | null) => set({ replyingTo: msg }),
        setEditingMessage: (msg: Message | null) => set({ editingMessage: msg }),

        uploadFile: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await chatService.uploadFile(formData);
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
    };
});
