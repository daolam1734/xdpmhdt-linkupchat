import React, { useState, useEffect } from 'react';
import { 
    Search, X, 
    MessageCircle, Users,
    UserPlus, Clock
} from 'lucide-react';
import type { Room } from '../../types/chat';
import { Avatar } from '../common/Avatar';
import { clsx } from 'clsx';
import { searchUsers, startDirectChat, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getPendingRequests } from '../../api/users';
import type { UserSearchItem, FriendRequest } from '../../api/users';
import { formatRelativeTime } from '../../utils/time';
import { useAuthStore } from '../../store/useAuthStore';
import { ProfileModal } from '../chat/ProfileModal';
import toast from 'react-hot-toast';

interface SidebarProps {
    rooms: Room[];
    activeRoomId?: string;
    onSelectRoom?: (room: Room) => void;
    onRoomCreated?: () => void;
    onNavigateToForum?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ rooms, activeRoomId, onSelectRoom, onRoomCreated, onNavigateToForum }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [viewingUser, setViewingUser] = useState<UserSearchItem | null>(null);
    const { currentUser } = useAuthStore();

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
            await acceptFriendRequest(requestId);
            setPendingRequests(prev => prev.filter(r => r.request_id !== requestId));
            if (onRoomCreated) await onRoomCreated();
            toast.success("Đã chấp nhận kết bạn!");
        } catch (error) {
            console.error('Accept error:', error);
            toast.error("Lỗi khi chấp nhận kết bạn");
        }
    };

    return (
        <aside className="flex w-80 md:w-90 bg-white border-r border-gray-100 flex-col z-20 h-screen shrink-0 overflow-hidden shadow-sm">
            {/* Nav Rail + Header (Slightly combined) */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h1 className="text-2xl font-bold text-black tracking-tight cursor-pointer" onClick={() => setViewingUser(currentUser as any)}>Đoạn chat</h1>
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

                        {/* Stories / Active People (Horizontal Scroll) */}
                        <div className="flex overflow-x-auto px-1 py-3 space-x-4 no-scrollbar mb-1">
                            {/* Hiển thị những người đang online từ danh sách chat direct */}
                            {rooms.filter(r => r.type === 'direct' && r.is_online).slice(0, 10).map((room) => (
                                <div key={room.id} className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer" onClick={() => onSelectRoom?.(room)}>
                                    <div className="relative">
                                        <Avatar name={room.name} url={room.avatar_url} isOnline={room.is_online} size="lg" />
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-500 truncate w-14 text-center">{room.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>

                        {/* Special AI Room section if exists */}
                        {rooms.filter(r => r.id === 'ai').map((room) => (
                            <button
                                key={room.id}
                                onClick={() => onSelectRoom?.(room)}
                                className={clsx(
                                    "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all group relative border border-secondary/10 shadow-sm mb-1",
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
                                {activeRoomId === room.id && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
                                )}
                            </button>
                        ))}

                        {rooms.filter(r => r.id !== 'ai').map((room) => (
                            <button
                                key={room.id}
                                onClick={() => onSelectRoom?.(room)}
                                className={clsx(
                                    "w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all group relative",
                                    activeRoomId === room.id 
                                        ? "bg-[#E7F3FF]" 
                                        : "hover:bg-gray-100"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <Avatar name={room.name} url={room.avatar_url} size="lg" isOnline={room.is_online} />
                                </div>
                                
                                <div className="flex-1 text-left overflow-hidden pr-2">
                                    <div className="flex justify-between items-baseline">
                                        <span className={clsx(
                                            "truncate text-[15px]",
                                            activeRoomId === room.id ? "font-bold text-blue-600" : "font-semibold text-gray-900"
                                        )}>
                                            {room.name}
                                        </span>
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

                                {activeRoomId !== room.id && (
                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Profile Modal for any user */}
            {viewingUser && (
                <ProfileModal 
                    isOpen={!!viewingUser} 
                    onClose={() => setViewingUser(null)} 
                    user={viewingUser}
                />
            )}

            {/* Bottom Nav */}
            <div className="flex items-center justify-around py-2 border-t border-gray-100 bg-white">
                <div className="flex flex-col items-center text-blue-600 cursor-pointer">
                    <MessageCircle size={24} fill="currentColor" fillOpacity={0.1} />
                    <span className="text-[10px] font-medium mt-1">Đoạn chat</span>
                </div>
                <div 
                    onClick={onNavigateToForum}
                    className="flex flex-col items-center text-gray-400 hover:text-blue-600 cursor-pointer group"
                >
                    <Users size={24} className="group-hover:text-blue-600 transition-colors" />
                    <span className="text-[10px] font-medium mt-1">Diễn đàn</span>
                </div>
                <div 
                    onClick={() => setViewingUser(currentUser as any)}
                    className="flex flex-col items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                    <Avatar name={currentUser?.username || 'User'} url={currentUser?.avatar_url} size="sm" />
                    <span className="text-[10px] font-medium mt-1">Cá nhân</span>
                </div>
            </div>
        </aside>
    );
};
