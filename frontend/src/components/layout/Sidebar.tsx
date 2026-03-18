import React, { useState, useEffect } from 'react';
import { 
    Search, X, 
    MessageCircle, Users,
    UserPlus, Clock,
    MoreHorizontal, Trash2,
    User, BellOff,
    Pin, PinOff,
    LayoutDashboard,
    Plus, Bot, AlertCircle, CheckCircle,
    RotateCcw, Check, HelpCircle
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
    const [deleteHistoryRoomId, setDeleteHistoryRoomId] = useState<string | null>(null);
    const [showContactSearch, setShowContactSearch] = useState(false);
    const [isDeletingChat, setIsDeletingChat] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'personal' | 'group'>('all');
    const { currentUser } = useAuthStore();
    const { 
        clearHistory, 
        togglePin, 
        deleteRoom, 
        activeDropdownId, 
        setActiveDropdown, 
        setViewingUser, 
        viewingUser,
        typingUsers,
        aiTypingRooms
    } = useChatStore();

    const menuRoomId = activeDropdownId?.startsWith('sidebar-room-') ? activeDropdownId.replace('sidebar-room-', '') : null;

    const filteredRooms = rooms.filter(room => {
        if (activeTab === 'unread') return room.has_unread;
        if (activeTab === 'personal') return room.type === 'direct' || room.type === 'bot' || room.type === 'support';
        if (activeTab === 'group') return room.type === 'community' || room.type === 'group';
        return true;
    });

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
            if (onRoomCreated) {
                await onRoomCreated();
                // Tìm lại phòng trong store sau khi đã fetch mới để có đầy đủ thông tin (avatar, online,...)
                const freshRooms = useChatStore.getState().rooms;
                const freshRoom = freshRooms.find(r => r.id === room.id);
                if (freshRoom) {
                    onSelectRoom?.(freshRoom);
                    return;
                }
            }
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

    const handleTogglePin = async (roomId: string, currentPinned: boolean) => {
        try {
            await togglePin(roomId);
            toast.success(currentPinned ? 'Đã bỏ ghim' : 'Đã ghim đoạn chat');
        } catch (error) {
            toast.error('Lỗi khi thao tác ghim');
        }
    };

    return (
        <aside className="flex w-80 md:w-[360px] bg-white dark:bg-[#242526] border-r border-gray-100 dark:border-[#3e4042] flex-col z-20 h-screen shrink-0 overflow-hidden shadow-sm">
            {/* Header Area */}
            <div className="pt-4 pb-2">
                <div className="flex items-center justify-between mb-3 px-4">
                    <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight cursor-pointer" onClick={() => setViewingUser(currentUser as any)}>LinkUp Chat</h1>
                    
                    <div className="flex items-center space-x-1.5">
                        <button 
                            onClick={() => {
                                const searchInput = document.querySelector('input[placeholder="Tìm kiếm trên LinkUp"]') as HTMLInputElement;
                                if (searchInput) searchInput.focus();
                            }}
                            className="p-2 bg-gray-100/50 dark:bg-[#3a3b3c] text-gray-600 dark:text-[#b0b3b8] rounded-full hover:bg-gray-100 dark:hover:bg-[#4b4c4f] transition-all active:scale-95"
                            title="Thêm bạn bè"
                        >
                            <UserPlus size={20} />
                        </button>

                        <button 
                            onClick={() => setIsGroupModalOpen(true)}
                            className="p-2 bg-gray-100/50 dark:bg-[#3a3b3c] text-gray-600 dark:text-[#b0b3b8] rounded-full hover:bg-gray-100 dark:hover:bg-[#4b4c4f] transition-all active:scale-95"
                            title="Tạo nhóm mới"
                        >
                            <Users size={20} />
                        </button>

                        {(currentUser?.role === 'admin' || currentUser?.is_superuser) && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToAdmin?.();
                                }}
                                className="p-2 bg-gray-100/50 dark:bg-[#3a3b3c] text-gray-600 dark:text-[#b0b3b8] rounded-full hover:bg-gray-100 dark:hover:bg-[#4b4c4f] transition-all active:scale-95 group relative"
                                title="Quản trị"
                            >
                                <LayoutDashboard size={20} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#242526]"></span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar - Zalo-like Style */}
                <div className="relative group px-4 mb-3">
                    <div className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#0068ff]">
                        <Search size={16} />
                    </div>
                    {isSearching && (
                        <button 
                            onClick={() => {setSearchQuery(''); setIsSearching(false);}}
                            className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <input 
                        type="text"
                        placeholder="Tìm kiếm trên LinkUp"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#f0f2f5] dark:bg-[#3a3b3c] dark:text-white border-none rounded-full py-2.5 pl-10 pr-4 text-[14px] focus:ring-0 placeholder:text-gray-500 font-medium transition-all"
                    />
                </div>

                {/* Filter Tabs - Zalo Style */}
                {!isSearching && (
                    <div className="flex items-center space-x-1 px-4 mb-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'unread', label: 'Chưa đọc' },
                            { id: 'personal', label: 'Cá nhân' },
                            { id: 'group', label: 'Nhóm' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all border",
                                    activeTab === tab.id 
                                        ? "bg-blue-50 dark:bg-[#1c2c4c] text-[#0068ff] dark:text-[#4599ff] border-blue-100 dark:border-[#263c66]" 
                                        : "bg-white dark:bg-transparent text-gray-500 dark:text-[#b0b3b8] border-transparent hover:bg-gray-50 dark:hover:bg-[#3a3b3c]"
                                )}
                            >
                                {tab.label}
                                {tab.id === 'unread' && rooms.some(r => r.has_unread) && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded-full">
                                        {rooms.filter(r => r.has_unread).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Results or Main List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                {isSearching ? (
                    <div className="py-2 px-3">
                        <h3 className="text-[13px] font-semibold text-gray-500 mb-3 px-1 uppercase tracking-wider">Kết quả tìm kiếm</h3>
                        {searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <div 
                                    key={user.id} 
                                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all group mb-0.5"
                                >
                                    <div className="flex items-center space-x-3 cursor-pointer overflow-hidden flex-1" onClick={() => setViewingUser(user as any)}>
                                        <Avatar 
                                            name={user.full_name || user.username} 
                                            url={user.avatar_url} 
                                            size="lg" 
                                            isOnline={user.is_online}
                                        />
                                        <div className="flex flex-col">
                                            <div className="flex items-center">
                                                <span className="font-semibold text-[15px] text-black">{user.full_name || user.username}</span>
                                            </div>
                                            <span className="text-[12px] text-gray-500">
                                                {user.is_online ? 'Đang hoạt động' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
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
                    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar no-scrollbar pb-10">
                        {/* Recent Friends (Horizontal Scroll) */}
                        {activeTab === 'all' && recentFriends.length > 0 && (
                            <div className="mb-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="px-3 flex items-center justify-between mb-2">
                                    <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-tight">Bạn bè đang hoạt động</h3>
                                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                </div>
                                <div className="flex space-x-4 overflow-x-auto no-scrollbar px-3 py-1">
                                    {recentFriends.map(friend => (
                                        <div 
                                            key={friend.id} 
                                            className="flex flex-col items-center space-y-1 cursor-pointer shrink-0 group transition-all"
                                            onClick={() => handleStartDirectChat(friend.id)}
                                        >
                                            <div className="relative p-0.5 rounded-full ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                                                <Avatar 
                                                    name={friend.full_name || friend.username} 
                                                    url={friend.avatar_url} 
                                                    size="lg" 
                                                    isOnline={friend.is_online}
                                                />
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-600 max-w-[64px] truncate group-hover:text-blue-600">
                                                {(friend.full_name || friend.username).split(' ')[0]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friend Requests (Only on All tab) */}
                        {activeTab === 'all' && pendingRequests.length > 0 && (
                            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="px-3 flex items-center justify-between mb-3">
                                    <h3 className="text-[13px] font-bold text-red-600 uppercase tracking-tight flex items-center">
                                        <Users size={14} className="mr-1.5" />
                                        Lời mời kết bạn ({pendingRequests.length})
                                    </h3>
                                    <button 
                                        onClick={() => setShowContactSearch(true)}
                                        className="text-[11px] text-blue-600 font-semibold hover:underline"
                                    >
                                        Xem tất cả
                                    </button>
                                </div>
                                <div className="space-y-1 px-1">
                                    {pendingRequests.slice(0, 3).map((request) => (
                                        <div key={request.request_id} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-2xl border border-red-100/50 group mx-1 shadow-sm">
                                            <div className="flex items-center space-x-2.5 overflow-hidden">
                                                <Avatar name={request.full_name || request.username} url={request.avatar_url} size="md" />
                                                <div className="flex flex-col truncate">
                                                    <span className="text-[13.5px] font-bold text-gray-900 truncate tracking-tight">{request.full_name || request.username}</span>
                                                    <span className="text-[10px] text-gray-500 font-medium italic">Muốn kết nối với bạn</span>
                                                </div>
                                            </div>
                                            <div className="flex space-x-1.5 shrink-0">
                                                <button 
                                                    onClick={(e) => handleAcceptRequest(e, request.request_id)}
                                                    className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all shadow-sm"
                                                    title="Chấp nhận"
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>
                                                <button 
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await rejectFriendRequest(request.request_id);
                                                        setPendingRequests(prev => prev.filter(r => r.request_id !== request.request_id));
                                                    }}
                                                    className="p-1.5 bg-white text-gray-400 rounded-full hover:text-red-500 hover:bg-red-50 transition-all border border-gray-100"
                                                    title="Từ chối"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Special AI & Support - Highlighted UI */}
                        {filteredRooms.some(r => r.type === 'bot' || r.type === 'support') && (
                             <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] px-4 mb-2 mt-2">Dịch vụ & Trợ giúp</h3>
                        )}
                        <div className="px-1 mb-4 select-none">
                            {filteredRooms.filter(r => r.type === 'bot' || r.type === 'support').map((room) => (
                                <div
                                    key={room.id}
                                    className={clsx(
                                        "w-full flex items-center px-3 py-3 rounded-2xl transition-all cursor-pointer group mb-1.5 border border-transparent relative overflow-hidden",
                                        activeRoomId === room.id 
                                            ? (room.type === 'bot' ? "bg-purple-50 border-purple-100 shadow-sm" : "bg-blue-50 border-blue-100 shadow-sm") 
                                            : "hover:bg-gray-50 active:scale-[0.98]"
                                    )}
                                    onClick={() => {
                                        onSelectRoom?.(room);
                                        setViewingUser(null);
                                    }}
                                >
                                    <div className="relative">
                                        <Avatar 
                                            name={room.name} 
                                            url={room.avatar_url} 
                                            size="lg" 
                                            isBot={room.type === 'bot'}
                                            isOnline={true}
                                            className={room.type === 'bot' ? "ring-2 ring-purple-100" : "ring-2 ring-blue-100"}
                                        />
                                        {room.unread_count > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full ring-2 ring-white animate-bounce-short">
                                                {room.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 ml-3.5 overflow-hidden">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="flex items-center overflow-hidden">
                                                <span className={clsx(
                                                    "font-bold text-[15px] truncate",
                                                    activeRoomId === room.id ? (room.type === 'bot' ? "text-purple-700 dark:text-purple-400" : "text-blue-700 dark:text-blue-400") : "text-gray-900 dark:text-white"
                                                )}>
                                                    {room.name}
                                                </span>
                                                {room.type === 'bot' && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded uppercase tracking-wider shrink-0">Trợ lý AI</span>
                                                )}
                                                {room.type === 'support' && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded uppercase tracking-wider shrink-0">Hệ thống</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[12px] truncate font-medium text-gray-500 dark:text-gray-400">
                                            {room.type === 'bot' ? 'Trợ lý thông minh LinkUp AI' : 'Hệ thống hỗ trợ 24/7'}
                                        </p>
                                    </div>
                                    {activeRoomId === room.id && (
                                        <div className={clsx(
                                            "w-1.5 h-1.5 rounded-full",
                                            room.type === 'bot' ? "bg-purple-600" : "bg-blue-600"
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Recent Chats Section */}
                        <div className="px-3 flex items-center justify-between mb-3 mt-2">
                             <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Trò chuyện gần đây</h3>
                             <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">
                                {activeTab === 'all' ? 'Tất cả' : activeTab === 'unread' ? 'Chưa đọc' : activeTab === 'personal' ? 'Cá nhân' : 'Nhóm'}
                             </span>
                        </div>
                        
                        <div className="flex flex-col space-y-0.5 px-1 pb-10">
                            {filteredRooms.filter(r => r.type !== 'bot' && r.type !== 'support').length > 0 ? (
                                filteredRooms.filter(r => r.type !== 'bot' && r.type !== 'support').map((room) => {
                                    const isActive = activeRoomId === room.id;
                                    
                                    return (
                                        <div
                                            key={room.id}
                                            onClick={() => {
                                                onSelectRoom?.(room);
                                                setActiveDropdown(null);
                                                setViewingUser(null);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center px-3 py-3 rounded-2xl transition-all group relative cursor-pointer border border-transparent mx-1",
                                                isActive 
                                                    ? "bg-blue-50 dark:bg-[#1c2c4c] border-blue-50 dark:border-[#263c66] shadow-sm" 
                                                    : "hover:bg-gray-50 dark:hover:bg-[#3a3b3c] active:scale-[0.98]"
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <Avatar 
                                                    name={room.name} 
                                                    url={room.avatar_url} 
                                                    size="lg" 
                                                    isBot={room.type === 'bot'}
                                                    isOnline={room.type === 'bot' ? true : (room.is_online && !room.blocked_by_other && !(room.other_user_id && currentUser?.blocked_users?.includes(room.other_user_id)))} 
                                                />
                                            </div>
                                            
                                            <div className="flex-1 text-left overflow-hidden ml-3.5 pr-1">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <div className="flex items-center overflow-hidden">
                                                        <span className={clsx(
                                                            "truncate text-[15.5px] tracking-tight",
                                                            isActive ? "font-bold text-blue-700 dark:text-blue-400" : (room.has_unread ? "font-bold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300")
                                                        )}>
                                                            {room.name}
                                                        </span>
                                                        {room.type === 'community' && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded uppercase tracking-wider shrink-0">Cộng đồng</span>
                                                        )}
                                                        {room.type === 'group' && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded uppercase tracking-wider shrink-0">Nhóm kín</span>
                                                        )}
                                                        {room.type === 'direct' && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded uppercase tracking-wider shrink-0">Cá nhân</span>
                                                        )}
                                                        {room.type === 'bot' && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded uppercase tracking-wider shrink-0">Trợ lý AI</span>
                                                        )}
                                                        {room.type === 'support' && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded uppercase tracking-wider shrink-0">Hệ thống</span>
                                                        )}
                                                        {room.is_pinned && (
                                                            <Pin size={11} className="ml-1.5 text-blue-500 fill-blue-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    {(room.last_message_at || room.updated_at) && (
                                                        <span className={clsx(
                                                            "text-[10px] flex-shrink-0 ml-2",
                                                            room.has_unread ? "text-blue-600 dark:text-blue-400 font-bold" : "text-gray-400 dark:text-[#b0b3b8] font-medium"
                                                        )}>
                                                            {formatRelativeTime(room.last_message_at || room.updated_at || '')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-1 overflow-hidden">
                                                    <p className={clsx(
                                                        "text-[13px] truncate flex items-center",
                                                        isActive ? "text-blue-600 dark:text-blue-400 font-medium" : (room.has_unread ? "text-gray-900 dark:text-white font-bold" : "text-gray-400 dark:text-[#b0b3b8] font-medium")
                                                    )}>
                                                        {typingUsers[room.id] && Object.keys(typingUsers[room.id]).length > 0 ? (
                                                            <span className="text-blue-600 font-bold italic animate-pulse">Đang soạn...</span>
                                                        ) : aiTypingRooms[room.id] ? (
                                                            <span className="text-blue-600 font-bold italic animate-pulse">LinkUp AI đang soạn...</span>
                                                        ) : (
                                                            <span className="flex items-center truncate">
                                                                {room.last_message_sender && (
                                                                    <span className="font-bold mr-1 shrink-0">
                                                                        {(room.last_message_sender === (currentUser?.full_name || currentUser?.username)) ? 'Bạn: ' : (room.type !== 'direct' ? `${room.last_message_sender}: ` : '')}
                                                                    </span>
                                                                )}
                                                                <span className="truncate">
                                                                    {room.last_message || (
                                                                        room.id === 'general' ? 'Cùng tham gia thảo luận ngay' :
                                                                        room.type === 'direct' ? 'Bắt đầu trò chuyện' : 'Nhóm chưa có tin nhắn'
                                                                    )}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="relative flex items-center h-full mr-1">
                                                {room.has_unread && !isActive && (
                                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm" />
                                                )}
                                                
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const roomMenuId = `sidebar-room-${room.id}`;
                                                        setActiveDropdown(activeDropdownId === roomMenuId ? null : roomMenuId);
                                                    }}
                                                    className={clsx(
                                                        "ml-1 p-2 hover:bg-white/50 rounded-full text-gray-400 hover:text-gray-600 transition-all",
                                                        activeDropdownId === `sidebar-room-${room.id}` ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                    )}
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>

                                                {activeDropdownId === `sidebar-room-${room.id}` && (
                                                    <div className="absolute right-0 top-10 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-[9999] py-1.5 animate-in fade-in zoom-in duration-200">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTogglePin(room.id, room.is_pinned);
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="w-full flex items-center px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Pin size={16} className="mr-3 text-gray-400" />
                                                            {room.is_pinned ? 'Bỏ ghim' : 'Ghim đoạn chat'}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(null);
                                                                setDeleteHistoryRoomId(room.id);
                                                            }}
                                                            className="w-full flex items-center px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <RotateCcw size={16} className="mr-3 text-gray-400" />
                                                            Xóa lịch sử 
                                                        </button>
                                                        <div className="h-px bg-gray-50 my-1 mx-2"></div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(null);
                                                                setDeleteConfirmRoomId(room.id);
                                                            }}
                                                            className="w-full flex items-center px-4 py-2.5 text-[14px] font-bold text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 size={16} className="mr-3 text-red-500" />
                                                            Xóa đoạn chat
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3 text-gray-300">
                                        <MessageCircle size={32} />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">Chưa có đoạn chat nào trong mục này</p>
                                </div>
                            )}
                        </div>
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
                    <Avatar name={currentUser?.full_name || currentUser?.username || 'User'} url={currentUser?.avatar_url} size="sm" />
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
