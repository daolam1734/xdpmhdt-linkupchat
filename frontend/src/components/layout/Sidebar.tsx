import React, { useState, useEffect } from 'react';
import { 
    Search, X, 
    MessageCircle, Users,
    UserPlus, Clock,
    MoreHorizontal, Trash2,
    User, BellOff,
    Pin, PinOff,
    LayoutDashboard,
    Plus
} from 'lucide-react';
import type { Room } from '../../types/chat';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { GroupCreateModal } from '../chat/GroupCreateModal';
import { clsx } from 'clsx';
import { searchUsers, startDirectChat, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getPendingRequests, getUserProfile, getFriends } from '../../api/users';
import type { UserSearchItem, FriendRequest } from '../../api/users';
import { formatRelativeTime } from '../../utils/time';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import toast from 'react-hot-toast';

interface SidebarProps {
    rooms: Room[];
    activeRoomId?: string;
    onSelectRoom?: (room: Room) => void;
    onRoomCreated?: () => void;
    onNavigateToAdmin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    rooms, 
    activeRoomId, 
    onSelectRoom, 
    onRoomCreated,
    onNavigateToAdmin
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [recentFriends, setRecentFriends] = useState<UserSearchItem[]>([]);
    const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);
    const [isDeletingChat, setIsDeletingChat] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const { currentUser } = useAuthStore();
    const { clearHistory, togglePin, deleteRoom, activeDropdownId, setActiveDropdown, setViewingUser, viewingUser } = useChatStore();

    const menuRoomId = activeDropdownId?.startsWith('sidebar-room-') ? activeDropdownId.replace('sidebar-room-', '') : null;

    useEffect(() => {
        if (!activeDropdownId) return;
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeDropdownId, setActiveDropdown]);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const friends = await getFriends();
                // Sắp xếp theo created_at nếu có, hoặc chỉ lấy vài người mới nhất
                setRecentFriends(friends.slice(0, 10));
            } catch (error) {
                console.error('Fetch friends error:', error);
            }
        };
        fetchFriends();
    }, [rooms]); // Refresh khi có room mới (kết bạn xong thường tạo room)

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const requests = await getPendingRequests();
                setPendingRequests(requests);
            } catch (error) {
                console.error('Fetch requests error:', error);
            }
        };
        fetchPending();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                try {
                    const results = await searchUsers(searchQuery);
                    setSearchResults(results);
                    setIsSearching(true);
                } catch (error) {
                    console.error('Search error:', error);
                }
            } else {
                setSearchResults([]);
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleStartDirectChat = async (userId: string) => {
        try {
            const room = await startDirectChat(userId);
            setSearchQuery('');
            setSearchResults([]);
            setIsSearching(false);
            if (onRoomCreated) await onRoomCreated();
            onSelectRoom?.(room);
        } catch (error: any) {
            console.error('Start chat error:', error);
            if (error.response?.status === 403) {
                toast.error(error.response.data.detail || "Người dùng này chỉ nhận tin nhắn từ bạn bè.");
            }
        }
    };

    const handleSendRequest = async (e: React.MouseEvent, user: UserSearchItem) => {
        e.stopPropagation();
        try {
            await sendFriendRequest(user.id);
            setSearchResults(prev => prev.map(u => 
                u.id === user.id ? { ...u, request_sent: true } : u
            ));
            toast.success("Đã gửi lời mời kết bạn!");
        } catch (error) {
            console.error('Send request error:', error);
            toast.error("Lỗi khi gửi lời mời kết bạn");
        }
    };

    const handleAcceptRequest = async (e: React.MouseEvent, requestId: string) => {
        e.stopPropagation();
        try {
            const result = await acceptFriendRequest(requestId);
            setPendingRequests(prev => prev.filter(r => r.request_id !== requestId));
            
            if (onRoomCreated) {
                await onRoomCreated(); // fetchRooms
                
                // Nếu backend trả về room_id, tự động mở đoạn chat đó
                if (result.room_id) {
                    const freshRooms = useChatStore.getState().rooms;
                    const newRoom = freshRooms.find(r => r.id === result.room_id);
                    if (newRoom) {
                        onSelectRoom?.(newRoom);
                    }
                }
            }
            
            toast.success("Đã chấp nhận kết bạn!");
        } catch (error) {
            console.error('Accept error:', error);
            toast.error("Lỗi khi chấp nhận kết bạn");
        }
    };

    const handleDeleteHistory = async (roomId: string) => {
        try {
            await clearHistory(roomId);
            toast.success('Đã xóa lịch sử trò chuyện');
            setDeleteConfirmRoomId(null);
        } catch (error) {
            toast.error('Lỗi khi xóa lịch sử');
        }
    };

    const handleDeleteChat = async (roomId: string) => {
        try {
            await deleteRoom(roomId);
            toast.success('Đã xóa đoạn chat');
            setDeleteConfirmRoomId(null);
            setIsDeletingChat(false);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Lỗi khi xóa đoạn chat');
        }
    };

    return (
        <aside className="flex w-80 md:w-90 bg-white border-r border-gray-100 flex-col z-20 h-screen shrink-0 overflow-hidden shadow-sm">
            {/* Nav Rail + Header (Slightly combined) */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h1 className="text-2xl font-bold text-black tracking-tight cursor-pointer" onClick={() => setViewingUser(currentUser as any)}>Đoạn chat</h1>
                    
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setIsGroupModalOpen(true)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all group relative"
                            title="Tạo nhóm mới"
                        >
                            <Plus size={20} />
                        </button>

                        {(currentUser?.role === 'admin' || currentUser?.is_superuser) && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToAdmin?.();
                                }}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all group relative"
                                title="Quản trị hệ thống"
                            >
                                <LayoutDashboard size={20} />
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar - Messenger Style */}
                <div className="relative group mb-2 px-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Search size={16} />
                    </div>
                    {isSearching && (
                        <button 
                            onClick={() => {setSearchQuery(''); setIsSearching(false);}}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <input 
                        type="text"
                        placeholder="Tìm kiếm trên LinkUp"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F0F2F5] border-none rounded-full py-2 pl-10 pr-4 text-[15px] focus:ring-0 placeholder:text-gray-500 font-normal"
                    />
                </div>
            </div>

            {/* Results or Main List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                {isSearching ? (
                    <div className="px-3 py-2">
                        <h3 className="text-[13px] font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Người dùng</h3>
                        {searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                                    onClick={() => setViewingUser(user)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Avatar 
                                            name={user.username} 
                                            url={user.avatar_url} 
                                            size="lg" 
                                            isOnline={user.is_online}
                                        />
                                        <div className="flex flex-col">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-[15px] text-black">{user.username}</span>
                                            </div>
                                            <span className="text-[12px] text-gray-500">
                                                {user.is_online ? 'Đang hoạt động' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                                        {/* Hiển thị nút nhắn tin nếu là bạn bè HOẶC cho phép người lạ nhắn tin */}
                                        {(user.is_friend || user.allow_stranger_messages) && (
                                            <button 
                                                onClick={() => handleStartDirectChat(user.id)}
                                                className={clsx(
                                                    "p-2 rounded-full transition-all",
                                                    user.is_friend ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                )}
                                                title="Nhắn tin"
                                            >
                                                <MessageCircle size={18} />
                                            </button>
                                        )}

                                        {!user.is_friend && (
                                            user.request_sent ? (
                                                <button className="p-2 bg-gray-50 text-gray-400 rounded-full cursor-default" title="Đã gửi lời mời">
                                                    <Clock size={18} />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => handleSendRequest(e, user)}
                                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 transition-all"
                                                    title="Thêm bạn bè"
                                                >
                                                    <UserPlus size={18} />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="px-2 text-gray-500 text-sm italic py-4 text-center">Không tìm thấy người dùng nào</p>
                        )}
                    </div>
                ) : (
                    <div className="py-1 px-2 space-y-0.5">
                        {/* Friend Requests Section */}
                        {pendingRequests.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-[13px] font-semibold text-gray-500 mb-2 px-3 uppercase tracking-wider flex items-center">
                                    <Users size={14} className="mr-1.5" />
                                    Lời mời kết bạn ({pendingRequests.length})
                                </h3>
                                {pendingRequests.map(req => (
                                    <div key={req.request_id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 rounded-xl transition-all">
                                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setViewingUser({id: req.user_id, username: req.username, avatar_url: req.avatar_url} as any)}>
                                            <Avatar name={req.username} url={req.avatar_url} size="lg" />
                                            <span className="font-semibold text-[14px] text-black">{req.username}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={(e) => handleAcceptRequest(e, req.request_id)}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-[13px] font-bold rounded-lg hover:bg-blue-700"
                                            >
                                                Chấp nhận
                                            </button>
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await rejectFriendRequest(req.request_id);
                                                    setPendingRequests(prev => prev.filter(r => r.request_id !== req.request_id));
                                                }}
                                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-[13px] font-bold rounded-lg hover:bg-gray-300"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recently Added Friends (Horizontal Scroll) */}
                        {recentFriends.length > 0 && (
                            <div className="mb-2">
                                <h3 className="text-[11px] font-bold text-gray-400 mb-2 px-3 uppercase tracking-[0.15em]">Bạn bè mới</h3>
                                <div className="flex overflow-x-auto px-1 pb-2 space-x-4 no-scrollbar">
                                    {recentFriends.map((friend) => (
                                        <div 
                                            key={friend.id} 
                                            className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer group" 
                                            onClick={() => handleStartDirectChat(friend.id)}
                                        >
                                            <div className="relative transform transition-transform group-hover:scale-110 active:scale-95">
                                                <Avatar name={friend.username} url={friend.avatar_url} isOnline={friend.is_online} size="lg" />
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-600 truncate w-16 text-center group-hover:text-blue-600 transition-colors">{friend.username.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Special AI Room section if exists */}
                        {rooms.filter(r => r.id === 'ai').map((room) => (
                            <div
                                key={room.id}
                                onClick={() => {
                                    onSelectRoom?.(room);
                                    setActiveDropdown(null);
                                }}
                                className={clsx(
                                    "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all group relative border border-secondary/10 shadow-sm mb-1 cursor-pointer",
                                    activeRoomId === room.id 
                                        ? "bg-purple-50 border-purple-200" 
                                        : "bg-white hover:bg-gray-50"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <Avatar name={room.name} url={room.avatar_url} isBot={true} size="lg" isOnline={true} />
                                </div>
                                <div className="flex-1 text-left overflow-hidden pr-2">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className="text-[15px] font-bold text-gray-900 truncate flex items-center gap-1.5">
                                            {room.name}
                                            <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md font-bold uppercase tracking-wider shadow-sm">LinkUp AI</span>
                                        </h3>
                                    </div>
                                    <p className="text-[12.5px] text-gray-500 font-medium truncate">Đang hoạt động • Luôn phản hồi</p>
                                </div>
                                
                                <div className="relative flex items-center">
                                    {activeRoomId === room.id ? (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const roomMenuId = `sidebar-room-${room.id}`;
                                                setActiveDropdown(activeDropdownId === roomMenuId ? null : roomMenuId);
                                            }}
                                            className={clsx(
                                                "ml-2 p-1.5 hover:bg-purple-100 rounded-full text-purple-400 transition-all",
                                                activeDropdownId === `sidebar-room-${room.id}` ? "opacity-100 bg-purple-50" : "opacity-0 group-hover:opacity-100"
                                            )}
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    )}

                                    {activeDropdownId === `sidebar-room-${room.id}` && (
                                        <div className="absolute right-0 top-10 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in duration-200">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    setDeleteConfirmRoomId(room.id);
                                                }}
                                                className="w-full flex items-center px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} className="mr-3 text-red-400" />
                                                Xóa lịch sử trò chuyện
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {rooms.filter(r => r.id !== 'ai').map((room) => (
                            <div
                                key={room.id}
                                onClick={() => {
                                    onSelectRoom?.(room);
                                    setActiveDropdown(null);
                                }}
                                className={clsx(
                                    "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all group relative cursor-pointer",
                                    activeRoomId === room.id 
                                        ? "bg-[#E7F3FF]" 
                                        : "hover:bg-gray-100"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <Avatar 
                                        name={room.name} 
                                        url={room.avatar_url} 
                                        size="lg" 
                                        isOnline={room.is_online && !room.blocked_by_other && !(room.other_user_id && currentUser?.blocked_users?.includes(room.other_user_id))} 
                                    />
                                </div>
                                
                                <div className="flex-1 text-left overflow-hidden pr-2">
                                    <div className="flex justify-between items-baseline">
                                        <div className="flex items-center overflow-hidden">
                                            <span className={clsx(
                                                "truncate text-[15px]",
                                                activeRoomId === room.id ? "font-bold text-blue-600" : "font-semibold text-gray-900"
                                            )}>
                                                {room.name}
                                            </span>
                                            {room.is_pinned && (
                                                <Pin size={12} className="ml-1.5 text-blue-500 fill-blue-500 shrink-0" />
                                            )}
                                        </div>
                                        {(room.last_message_at || room.updated_at) && (
                                            <span className="text-[11px] text-gray-500 flex-shrink-0 ml-2">
                                                {formatRelativeTime(room.last_message_at || room.updated_at || '')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-1 overflow-hidden">
                                        <p className={clsx(
                                            "text-[13px] truncate flex items-center",
                                            activeRoomId === room.id ? "text-blue-500 font-medium" : "text-gray-500"
                                        )}>
                                            {room.last_message_sender && room.type !== 'direct' && (
                                                <span className="font-medium mr-1">{room.last_message_sender}: </span>
                                            )}
                                            {room.last_message || (room.type === 'ai' ? 'Trợ lý AI đang chờ bạn...' : 'Bắt đầu cuộc trò chuyện mới')}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative flex items-center">
                                    {activeRoomId !== room.id && (
                                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full opacity-0 group-hover:opacity-40 transition-opacity" />
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const roomMenuId = `sidebar-room-${room.id}`;
                                            setActiveDropdown(activeDropdownId === roomMenuId ? null : roomMenuId);
                                        }}
                                        className={clsx(
                                            "ml-2 p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-all",
                                            menuRoomId === room.id ? "opacity-100 bg-gray-100" : "opacity-0 group-hover:opacity-100"
                                        )}
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>

                                    {menuRoomId === room.id && (
                                        <div className="absolute right-0 top-10 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in duration-200">
                                            {room.type === 'direct' && room.other_user_id && (
                                                <button 
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(null);
                                                        try {
                                                            const userData = await getUserProfile(room.other_user_id!);
                                                            setViewingUser(userData);
                                                        } catch (error) {
                                                            toast.error("Không thể tải thông tin cá nhân");
                                                        }
                                                    }}
                                                    className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50"
                                                >
                                                    <User size={16} className="mr-3 text-gray-400" />
                                                    Xem trang cá nhân
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    togglePin(room.id);
                                                    toast.success(room.is_pinned ? "Đã bỏ ghim" : "Đã ghim đoạn chat");
                                                }}
                                                className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                {room.is_pinned ? (
                                                    <>
                                                        <PinOff size={16} className="mr-3 text-gray-400" />
                                                        Bỏ ghim
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pin size={16} className="mr-3 text-gray-400" />
                                                        Ghim đoạn chat
                                                    </>
                                                )}
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    toast.success("Đã tắt thông báo");
                                                }}
                                                className="w-full flex items-center px-4 py-2.5 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <BellOff size={16} className="mr-3 text-gray-400" />
                                                Tắt thông báo
                                            </button>
                                            <div className="h-px bg-gray-100 my-1"></div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    setDeleteConfirmRoomId(room.id);
                                                    setIsDeletingChat(false);
                                                }}
                                                className="w-full flex items-center px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} className="mr-3 text-red-400" />
                                                Xóa lịch sử trò chuyện
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(null);
                                                    setDeleteConfirmRoomId(room.id);
                                                    setIsDeletingChat(true);
                                                }}
                                                className="w-full flex items-center px-4 py-2.5 text-[14px] text-red-600 font-bold hover:bg-red-50 transition-colors"
                                            >
                                                <X size={16} className="mr-3 text-red-400" />
                                                Xóa đoạn chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete History/Chat Confirm Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmRoomId}
                onCancel={() => {
                    setDeleteConfirmRoomId(null);
                    setIsDeletingChat(false);
                }}
                onConfirm={() => {
                    if (deleteConfirmRoomId) {
                        if (isDeletingChat) {
                            handleDeleteChat(deleteConfirmRoomId);
                        } else {
                            handleDeleteHistory(deleteConfirmRoomId);
                        }
                    }
                }}
                title={isDeletingChat ? "Xóa đoạn chat" : "Xóa lịch sử trò chuyện"}
                message={isDeletingChat 
                    ? "Bạn có chắc chắn muốn xóa đoạn chat này khỏi danh sách? Bạn vẫn có thể tìm lại người dùng này để nhắn tin sau." 
                    : "Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác và tin nhắn sẽ bị ẩn khỏi phía bạn."
                }
                confirmText={isDeletingChat ? "Xóa đoạn chat" : "Xác nhận xóa"}
                type="danger"
            />

            {/* Bottom Nav */}
            <div className="flex items-center justify-around py-2 border-t border-gray-100 bg-white">
                <div className="flex flex-col items-center text-blue-600 cursor-pointer">
                    <MessageCircle size={24} fill="currentColor" fillOpacity={0.1} />
                    <span className="text-[10px] font-medium mt-1">Đoạn chat</span>
                </div>
                <div 
                    onClick={() => setViewingUser(currentUser as any)}
                    className="flex flex-col items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                    <Avatar name={currentUser?.username || 'User'} url={currentUser?.avatar_url} size="sm" />
                    <span className="text-[10px] font-medium mt-1">Cá nhân</span>
                </div>
            </div>

            <GroupCreateModal 
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSuccess={(room) => {
                    if (onRoomCreated) onRoomCreated();
                    onSelectRoom?.(room);
                }}
            />
        </aside>
    );
};
