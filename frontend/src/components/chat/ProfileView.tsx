import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    X, Camera, Save, FileText, Calendar, MessageCircle, 
    UserPlus, Check, Clock, ShieldCheck, ShieldAlert,
    Bell, Settings, User as UserIcon, LogOut,
    Sparkles, Languages, Globe, Moon, Sun,
    Lock, Eye, MessageSquare, ChevronRight, HelpCircle,
    ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { sendFriendRequest, startDirectChat, blockUser, unblockUser, getBlockedList, unfriendUser } from '../../api/users';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useChatStore } from '../../store/useChatStore';
import { UserMinus } from 'lucide-react';

interface ProfileViewProps {
    user?: any;
    onBack?: () => void;
}

type TabType = 'profile' | 'privacy' | 'app' | 'ai';

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onBack }) => {
    const { currentUser, updateProfile, isLoading, logout, blockUser: blockUserStore, unblockUser: unblockUserStore } = useAuthStore();
    const { setActiveRoom } = useChatStore();
    
    // Use useMemo to stabilize initialTarget reference
    const initialTarget = useMemo(() => user || currentUser, [user, currentUser]);
    const isOwnProfile = useMemo(() => initialTarget?.id === currentUser?.id, [initialTarget, currentUser]);
    
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [allowStrangers, setAllowStrangers] = useState(true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [requestSent, setRequestSent] = useState(false);
    const [isFriendLocal, setIsFriendLocal] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockedByOther, setBlockedByOther] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    
    const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

    // Real-time block status sync
    useEffect(() => {
        if (!initialTarget || isOwnProfile || !currentUser) return;
        
        const isCurrentlyBlocked = currentUser.blocked_users?.includes(initialTarget.id) || false;
        const isCurrentlyBlockedByOther = currentUser.blocked_by?.includes(initialTarget.id) || false;
        
        setIsBlocked(isCurrentlyBlocked);
        setBlockedByOther(isCurrentlyBlockedByOther);
    }, [currentUser?.blocked_users, currentUser?.blocked_by, initialTarget?.id, isOwnProfile]);

    // Settings States
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('vi');
    const [notifications, setNotifications] = useState(true);
    const [contextAccess, setContextAccess] = useState(true);
    const [aiStyle, setAiStyle] = useState<'NGẮN GỌN' | 'TIÊU CHUẨN' | 'CHI TIẾT'>('TIÊU CHUẨN');

    // Reset local state when target user changes (e.g. switching between profiles)
    useEffect(() => {
        if (initialTarget) {
            setUsername(initialTarget.username || '');
            setFullName(initialTarget.full_name || '');
            setEmail(initialTarget.email || '');
            setPhone(initialTarget.phone || '');
            setBio(initialTarget.bio || '');
            setAllowStrangers(initialTarget.allow_stranger_messages ?? true);
            setShowOnlineStatus(initialTarget.show_online_status ?? true);
            setRequestSent(initialTarget.request_sent || false);
            setIsFriendLocal(initialTarget.is_friend || false);
            setIsBlocked(initialTarget.is_blocked || false);
            setBlockedByOther(initialTarget.blocked_by_other || false);
            
            setTheme(initialTarget.app_settings?.theme || 'light');
            setLanguage(initialTarget.app_settings?.language || 'vi');
            setNotifications(initialTarget.app_settings?.notifications ?? true);
            setContextAccess(initialTarget.ai_settings?.context_access ?? true);
            
            const style = initialTarget.ai_preferences?.preferred_style;
            setAiStyle(
                style === 'short' ? 'NGẮN GỌN' : 
                style === 'detailed' ? 'CHI TIẾT' : 'TIÊU CHUẨN'
            );
        }
    }, [initialTarget?.id]); // Only re-run if ID changes to prevent typing flicker

    if (!initialTarget) return null;

    const handleSave = async (silent = false) => {
        try {
            await updateProfile({ 
                username, 
                full_name: fullName,
                email,
                phone,
                bio, 
                avatar_url: avatarUrl,
                allow_stranger_messages: allowStrangers,
                show_online_status: showOnlineStatus,
                app_settings: {
                    theme,
                    language,
                    notifications
                },
                ai_settings: {
                    context_access: contextAccess
                },
                ai_preferences: {
                    preferred_style: aiStyle === 'NGẮN GỌN' ? 'short' : aiStyle === 'CHI TIẾT' ? 'detailed' : 'balanced'
                }
            });
            setIsEditing(false);
            if (!silent) toast.success("Đã lưu thay đổi");
        } catch (error) {
            console.error('Update profile error:', error);
            if (!silent) toast.error("Không thể lưu thay đổi");
        }
    };

    const handleAction = useCallback(async () => {
        if (isBlocked) {
            toast.error("Vui lòng bỏ chặn để tiếp tục");
            return;
        }
        
        if (initialTarget.is_friend) {
            const room = await startDirectChat(initialTarget.id);
            if (room) setActiveRoom(room);
        } else if (!requestSent) {
            try {
                await sendFriendRequest(initialTarget.id);
                setRequestSent(true);
                toast.success("Đã gửi lời mời kết bạn");
            } catch (err) {
                toast.error("Gửi lời mời thất bại");
            }
        }
    }, [initialTarget.id, initialTarget.is_friend, requestSent, setActiveRoom]);

    const handleUnfriend = async () => {
        try {
            await unfriendUser(initialTarget.id);
            setIsFriendLocal(false);
            toast.success("Đã hủy kết bạn");
        } catch (err) {
            toast.error("Hủy kết bạn thất bại");
        }
    };

    const handleToggleBlock = async () => {
        if (!isBlocked && !showBlockConfirm) {
            setShowBlockConfirm(true);
            return;
        }

        try {
            if (isBlocked) {
                await unblockUserStore(initialTarget.id);
                setIsBlocked(false);
                toast.success("Đã bỏ chặn người dùng");
            } else {
                await blockUserStore(initialTarget.id);
                setIsBlocked(true);
                setShowBlockConfirm(false);
                toast.success("Đã chặn người dùng");
            }
        } catch (error) {
            toast.error("Thao tác thất bại");
        }
    };

    const fetchBlockedUsers = async () => {
        try {
            const data = await getBlockedList();
            setBlockedUsers(data);
            setIsBlockedListOpen(true);
        } catch (error) {
            toast.error("Không thể tải danh sách chặn");
        }
    };

    const profileContent = useMemo(() => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            {/* User Stats Grid */}
            <div className="grid grid-cols-2 gap-6">
                {[
                    { label: 'Tin nhắn', value: initialTarget.message_count || '0', icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Bạn bè', value: initialTarget.friend_count || '0', icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border-2 border-gray-50 flex flex-col items-center justify-center space-y-3 hover:shadow-xl hover:shadow-gray-100 transition-all hover:-translate-y-1 group">
                        <div className={clsx("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                            <stat.icon size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-gray-900">{stat.value}</span>
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Account Info Section */}
            <div className="bg-white border-2 border-gray-50 rounded-[40px] p-10 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                    <UserIcon size={180} />
                </div>
                
                <div className="relative z-10 space-y-8">
                    <div className="flex justify-between items-end">
                        <div className="space-y-6 flex-1 pr-10">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block">Tên hiển thị</label>
                                {isEditing ? (
                                    <input 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="text-4xl font-black text-gray-900 border-b-4 border-blue-500 bg-transparent focus:outline-none w-full pb-2"
                                        placeholder="Nhập tên của bạn..."
                                    />
                                ) : (
                                    <div className="flex items-center space-x-4">
                                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{username}</h2>
                                        {initialTarget.is_online && !blockedByOther && !isBlocked && (
                                            <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Trực tuyến</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block">Giới thiệu bản thân</label>
                                {isEditing ? (
                                    <textarea 
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all min-h-[120px] font-medium"
                                        placeholder="Chia sẻ đôi điều về bạn..."
                                    />
                                ) : (
                                    <p className="text-lg text-gray-600 font-medium leading-relaxed italic">
                                        "{blockedByOther ? "Người dùng này đã chặn bạn. Không thể xem thông tin." : (bio || "Nơi đây còn trống, hãy viết gì đó để mọi người hiểu bạn hơn!")}"
                                    </p>
                                )}
                            </div>

                            {/* Additional Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block">Họ và tên</label>
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all font-medium"
                                            placeholder="Họ và tên đầy đủ"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-bold">{fullName || 'Chưa cập nhật'}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block">Địa chỉ Email</label>
                                    {isEditing ? (
                                        <input 
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all font-medium"
                                            placeholder="email@example.com"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-bold">{email || 'Chưa cập nhật'}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block">Số điện thoại</label>
                                    {isEditing ? (
                                        <input 
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all font-medium"
                                            placeholder="0123 456 789"
                                        />
                                    ) : (
                                        <p className="text-gray-900 font-bold">{phone || 'Chưa cập nhật'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isOwnProfile ? (
                            <button 
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                className={clsx(
                                    "px-8 py-4 rounded-2xl font-black text-sm tracking-widest transition-all shadow-xl active:scale-95",
                                    isEditing 
                                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" 
                                        : "bg-gray-900 text-white hover:bg-gray-800 shadow-gray-200"
                                )}
                            >
                                {isEditing ? "LƯU THÔNG TIN" : "CHỈNH SỬA HỒ SƠ"}
                            </button>
                        ) : (
                            <div className="flex flex-col space-y-3">
                                <button 
                                    onClick={handleAction}
                                    disabled={requestSent || blockedByOther || isBlocked}
                                    className={clsx(
                                        "px-8 py-4 rounded-2xl font-black text-sm tracking-widest transition-all shadow-xl active:scale-95 flex items-center space-x-3",
                                        (requestSent || blockedByOther || isBlocked)
                                            ? "bg-gray-100 text-gray-400 cursor-default"
                                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                                    )}
                                >
                                    {isBlocked ? (
                                        <><ShieldAlert size={20} /> <span>ĐÃ CHẶN</span></>
                                    ) : blockedByOther ? (
                                        <><ShieldAlert size={20} /> <span>KHÔNG KHẢ DỤNG</span></>
                                    ) : isFriendLocal ? (
                                        <><MessageSquare size={20} /> <span>NHẮN TIN NGAY</span></>
                                    ) : requestSent ? (
                                        <><Clock size={20} /> <span>ĐÃ GỬI YÊU CẦU</span></>
                                    ) : (
                                        <><UserPlus size={20} /> <span>KẾT BẠN</span></>
                                    )}
                                </button>
                                
                                {isFriendLocal && !isOwnProfile && (
                                    <button 
                                        onClick={handleUnfriend}
                                        className="px-8 py-3 rounded-2xl font-black text-[11px] tracking-widest transition-all border-2 border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center space-x-2 shadow-sm"
                                    >
                                        <UserMinus size={18} />
                                        <span>HỦY KẾT BẠN</span>
                                    </button>
                                )}
                                
                                <button 
                                    onClick={handleToggleBlock}
                                    className={clsx(
                                        "px-8 py-3 rounded-2xl font-black text-[11px] tracking-widest transition-all border-2 flex items-center justify-center space-x-2",
                                        isBlocked 
                                            ? "border-gray-200 text-gray-500 hover:bg-gray-50" 
                                            : "border-red-100 text-red-500 hover:bg-red-50"
                                    )}
                                >
                                    {isBlocked ? (
                                        <><ShieldCheck size={16} /> <span>BỎ CHẶN NGƯỜI DÙNG</span></>
                                    ) : (
                                        <><ShieldAlert size={16} /> <span>CHẶN NGƯỜI DÙNG</span></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-8 border-t border-gray-50 flex items-center space-x-10">
                        <div className="flex items-center space-x-3">
                            <Calendar size={18} className="text-gray-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tham gia</span>
                                <span className="text-[14px] font-bold text-gray-700">
                                    {initialTarget.created_at ? new Date(initialTarget.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ), [isEditing, username, bio, initialTarget, isOwnProfile, requestSent, handleAction, isBlocked, handleToggleBlock, fetchBlockedUsers, blockedByOther]);

    const renderTabs = useMemo(() => {
        if (!isOwnProfile) return null;
        
        return (
            <div className="flex border-b border-gray-100 px-4 bg-white sticky top-0 z-10 transition-colors">
                {[
                    { id: 'profile', label: 'Thông tin', icon: UserIcon },
                    { id: 'privacy', label: 'Bảo mật', icon: ShieldCheck },
                    { id: 'app', label: 'Cài đặt', icon: Settings },
                    { id: 'ai', label: 'Trợ lý AI', icon: Sparkles },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={clsx(
                            "flex items-center space-x-2 px-6 py-4 text-sm font-semibold transition-all relative",
                            activeTab === tab.id ? "text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <tab.icon size={16} />
                        <span className="hidden sm:inline">{tab.label}</span>
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in" />
                        )}
                    </button>
                ))}
            </div>
        );
    }, [activeTab, isOwnProfile]);

    const privacyContent = useMemo(() => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto py-8 space-y-8 px-4">
            <h3 className="text-xl font-black text-gray-900 px-1">Quyền riêng tư</h3>
            
            <div 
                onClick={() => setAllowStrangers(!allowStrangers)}
                className={clsx(
                    "flex items-center justify-between p-6 rounded-[28px] transition-all border-2 cursor-pointer group shadow-sm",
                    allowStrangers ? "bg-blue-50/50 border-blue-200" : "bg-gray-50 border-gray-100"
                )}
            >
                <div className="flex items-center space-x-5">
                    <div className={clsx(
                        "p-4 rounded-2xl transition-all shadow-sm",
                        allowStrangers ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                    )}>
                        {allowStrangers ? <MessageSquare size={24} /> : <Lock size={24} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[17px] font-bold text-gray-900">Tin nhắn từ người lạ</span>
                        <span className="text-sm text-gray-500 mt-0.5">
                            {allowStrangers 
                                ? "Mọi thành viên đều có thể nhắn tin cho bạn" 
                                : "Chỉ bạn bè mới có thể liên lạc"}
                        </span>
                    </div>
                </div>
                <div className={clsx(
                    "w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner",
                    allowStrangers ? "bg-blue-600" : "bg-gray-300"
                )}>
                    <div className={clsx(
                        "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md",
                        allowStrangers ? "right-1" : "left-1"
                    )} />
                </div>
            </div>

            <div className="bg-white border-2 border-gray-50 rounded-[28px] overflow-hidden divide-y-2 divide-gray-50 shadow-sm">
                <div 
                    onClick={() => setShowOnlineStatus(!showOnlineStatus)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all group cursor-pointer"
                >
                    <div className="flex items-center space-x-4">
                        <div className={clsx(
                            "p-2 rounded-xl transition-all",
                            showOnlineStatus ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                        )}>
                            <Eye size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[16px] font-bold text-gray-700">Trạng thái hoạt động</span>
                            <span className="text-xs text-gray-400">Hiển thị khi bạn đang trực tuyến</span>
                        </div>
                    </div>
                    <div className={clsx(
                        "w-10 h-5 rounded-full relative transition-all",
                        showOnlineStatus ? "bg-blue-600" : "bg-gray-300"
                    )}>
                        <div className={clsx(
                            "absolute w-3 h-3 bg-white rounded-full shadow-sm transition-all top-1",
                            showOnlineStatus ? "right-1" : "left-1"
                        )} />
                    </div>
                </div>

                <button 
                    onClick={fetchBlockedUsers}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all group"
                >
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-xl text-gray-500 group-hover:bg-red-100 group-hover:text-red-600 transition-all">
                            <ShieldAlert size={20} />
                        </div>
                        <span className="text-[16px] font-bold text-gray-700">Người dùng đã chặn</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg">{(initialTarget.blocked_users || []).length}</span>
                        <ChevronRight size={20} className="text-gray-300" />
                    </div>
                </button>
            </div>
            
            <div className="p-6 bg-amber-50 rounded-[24px] border border-amber-100 flex items-start space-x-4">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                    <HelpCircle size={20} />
                </div>
                <p className="text-[13px] text-amber-700 leading-relaxed font-medium">
                    <b>Bảo mật:</b> Các dữ liệu này giúp bảo vệ tài khoản của bạn khỏi các truy cập trái phép.
                </p>
            </div>
            
            <button 
                onClick={() => handleSave()}
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 mt-4 active:scale-[0.98] disabled:opacity-50"
            >
                {isLoading ? "ĐANG LƯU..." : "CẬP NHẬT PHIÊN BẢN MỚI"}
            </button>
        </div>
    ), [allowStrangers, showOnlineStatus, isLoading, initialTarget.blocked_users]);

    const appContent = useMemo(() => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto py-8 space-y-10 px-4">
            <section className="space-y-5">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Giao diện người dùng</label>
                <div className="grid grid-cols-2 gap-5">
                    <button 
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "flex flex-col items-center p-8 rounded-[32px] transition-all shadow-lg",
                            theme === 'light' ? "bg-white border-4 border-blue-600 shadow-blue-50" : "bg-gray-50 border-4 border-transparent opacity-60"
                        )}
                    >
                        <Sun size={40} strokeWidth={2.5} className={theme === 'light' ? "text-blue-600 mb-4" : "text-gray-400 mb-4"} />
                        <span className={clsx("text-[15px] font-black", theme === 'light' ? "text-blue-900" : "text-gray-500")}>Giao diện Sáng</span>
                    </button>
                    <button 
                        onClick={() => {
                            setTheme('dark');
                            toast.error("Chế độ tối đang được hoàn thiện");
                        }}
                        className={clsx(
                            "flex flex-col items-center p-8 rounded-[32px] transition-all shadow-lg",
                            theme === 'dark' ? "bg-white border-4 border-blue-600 shadow-blue-50" : "bg-gray-50 border-4 border-transparent opacity-60"
                        )}
                    >
                        <Moon size={40} strokeWidth={2.5} className={theme === 'dark' ? "text-blue-600 mb-4" : "text-gray-400 mb-4"} />
                        <span className={clsx("text-[15px] font-black", theme === 'dark' ? "text-blue-900" : "text-gray-500")}>Giao diện Tối</span>
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Hệ thống</label>
                <div className="bg-white border-2 border-gray-50 rounded-[32px] overflow-hidden divide-y-2 divide-gray-50 shadow-sm">
                    <div className="flex items-center justify-between p-6">
                        <div className="flex items-center space-x-4">
                            <Languages size={20} className="text-gray-400" />
                            <span className="text-[16px] font-bold text-gray-700">Ngôn ngữ mặc định</span>
                        </div>
                        <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg outline-none cursor-pointer"
                        >
                            <option value="vi">TIẾNG VIỆT</option>
                            <option value="en">ENGLISH</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between p-6 cursor-pointer" onClick={() => setNotifications(!notifications)}>
                        <div className="flex items-center space-x-4">
                            <Bell size={20} className="text-gray-400" />
                            <span className="text-[16px] font-bold text-gray-700">Thông báo & Âm thanh</span>
                        </div>
                        <div className={clsx(
                            "w-12 h-6 rounded-full relative transition-all",
                            notifications ? "bg-blue-600" : "bg-gray-300"
                        )}>
                            <div className={clsx(
                                "absolute w-4 h-4 bg-white rounded-full shadow-sm transition-all top-1",
                                notifications ? "right-1" : "left-1"
                            )} />
                        </div>
                    </div>
                </div>
            </section>

            <button 
                onClick={() => handleSave()}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 mt-4 active:scale-[0.98]"
            >
                LƯU CÀI ĐẶT HỆ THỐNG
            </button>

            <button 
                onClick={() => {
                    logout();
                    toast.success("Hẹn gặp lại bạn!");
                }}
                className="w-full flex items-center justify-center space-x-3 py-5 text-red-600 font-black text-lg hover:bg-red-50 rounded-[28px] transition-all mt-8 border-2 border-red-50"
            >
                <LogOut size={24} strokeWidth={2.5} />
                <span>ĐĂNG XUẤT KHỎI HỆ THỐNG</span>
            </button>
        </div>
    ), [theme, language, notifications, logout]);

    const aiContent = useMemo(() => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto py-8 space-y-8 px-4">
            <div className="bg-gradient-to-br from-purple-600 to-blue-700 p-8 rounded-[32px] text-white shadow-xl shadow-purple-100 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10">
                    <Sparkles size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                            <Sparkles size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black">LinkUp Intelligence AI</h3>
                    </div>
                    <p className="text-white/80 text-[15px] leading-relaxed mb-6 font-medium">
                        Tối ưu hóa trợ lý AI để có trải nghiệm trò chuyện thông minh và hiệu quả hơn dành riêng cho bạn.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                            <label className="text-[10px] font-black text-purple-200 uppercase tracking-[0.2em] block mb-3">Phong cách trợ lý</label>
                            <div className="flex gap-2">
                                {(['NGẮN GỌN', 'TIÊU CHUẨN', 'CHI TIẾT'] as const).map((style) => (
                                    <button 
                                        key={style} 
                                        onClick={() => setAiStyle(style)}
                                        className={clsx(
                                            "flex-1 py-3 text-[11px] font-black rounded-xl transition-all",
                                            aiStyle === style ? "bg-white text-purple-700 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
                                        )}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-white border-2 border-gray-50 rounded-[32px] shadow-sm space-y-6">
                <h4 className="text-[16px] font-black text-gray-900 mb-2">Bảo mật & Dữ liệu AI</h4>
                <div className="space-y-5">
                    <div className="flex items-start space-x-4 cursor-pointer" onClick={() => setContextAccess(!contextAccess)}>
                        <div className={clsx(
                            "mt-1 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                            contextAccess ? "bg-blue-100 border-blue-200" : "bg-gray-100 border-gray-200"
                        )}>
                            {contextAccess && <Check size={14} className="text-blue-600 focus:stroke-[3px]" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-gray-800">Truy cập ngữ cảnh cuộc hội thoại</span>
                            <span className="text-sm text-gray-400 mt-1">Cho phép AI đọc tin nhắn để đưa ra câu trả lời chính xác nhất.</span>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => handleSave()}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 mt-4 active:scale-[0.98]"
            >
                CẬP NHẬT CẤU HÌNH AI
            </button>
        </div>
    ), [contextAccess, aiStyle]);

    return (
        <div className="flex-1 flex flex-col bg-white h-full animate-in fade-in duration-500 overflow-hidden">
            {/* Top Bar for Mobile/Back navigation if needed */}
            <div className="h-[60px] border-b border-gray-100 flex items-center px-6 shrink-0 bg-white/95 backdrop-blur-md z-20">
                <button 
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-all mr-4 flex"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Hồ sơ người dùng</h1>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Hero / Cover Section */}
                <div className="relative h-[250px] shrink-0">
                    {/* Cover Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-800" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    
                    {/* User Avatar Overlapping */}
                    <div className="absolute -bottom-20 left-12 p-2 bg-white rounded-full shadow-2xl ring-8 ring-white/10 z-10 transition-transform hover:scale-105 duration-300">
                        <div className="relative group cursor-pointer">
                            <Avatar 
                                name={initialTarget.username} 
                                url={initialTarget.avatar_url} 
                                size="xl" 
                                isOnline={initialTarget.is_online}
                            />
                            {isOwnProfile && isEditing && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-all animate-in fade-in">
                                    <Camera size={28} className="text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Detail Content */}
                <div className="mt-24 px-12 pb-12">
                    {/* Navigation Tabs (if own profile) */}
                    <div className="mb-8">
                        {renderTabs}
                    </div>

                    {/* Active Tab Content */}
                    <div className="bg-white min-h-[400px]">
                        {activeTab === 'profile' && profileContent}
                        {activeTab === 'privacy' && privacyContent}
                        {activeTab === 'app' && appContent}
                        {activeTab === 'ai' && aiContent}
                    </div>
                </div>

                {/* Footer Section */}
                <footer className="px-12 py-10 border-t border-gray-50 flex flex-col items-center justify-center space-y-4 bg-gray-50/20">
                    <div className="flex items-center space-x-6 text-gray-400">
                        <span className="text-xs font-bold hover:text-blue-600 cursor-pointer transition-colors uppercase tracking-widest">Trung tâm trợ giúp</span>
                        <span className="text-xs font-bold hover:text-blue-600 cursor-pointer transition-colors uppercase tracking-widest">Điều khoản</span>
                        <span className="text-xs font-bold hover:text-blue-600 cursor-pointer transition-colors uppercase tracking-widest">Bảo mật</span>
                    </div>
                    <div className="text-[10px] text-gray-300 font-black tracking-[0.3em] uppercase">
                        LinkUp Messenger &bull; Project Alpha 2024
                    </div>
                </footer>
            </div>

            {/* Blocked Users Modal */}
            {isBlockedListOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Danh sách chặn</h3>
                                <p className="text-sm text-gray-500 font-medium">Những người này sẽ không thể nhắn tin cho bạn</p>
                            </div>
                            <button 
                                onClick={() => setIsBlockedListOpen(false)}
                                className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                            {blockedUsers.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-4">
                                    <div className="p-6 bg-gray-50 rounded-full">
                                        <ShieldCheck size={48} className="opacity-20" />
                                    </div>
                                    <p className="font-black text-sm uppercase tracking-widest">Không có người dùng nào</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {blockedUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-3xl transition-all group">
                                            <div className="flex items-center space-x-4">
                                                <Avatar name={user.username} url={user.avatar_url} size="lg" />
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900">{user.username}</span>
                                                    <span className="text-xs text-gray-400 font-medium">ID: {user.id.substring(0, 8)}...</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await unblockUserStore(user.id);
                                                        setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
                                                        toast.success(`Đã bỏ chặn ${user.username}`);
                                                    } catch (error) {
                                                        toast.error("Không thể bỏ chặn");
                                                    }
                                                }}
                                                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[10px] tracking-widest hover:bg-blue-600 transition-all active:scale-95"
                                            >
                                                BỎ CHẶN
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex justify-end">
                            <button 
                                onClick={() => setIsBlockedListOpen(false)}
                                className="px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl font-black text-xs tracking-widest text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
                            >
                                ĐÓNG
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Confirmation Modal */}
            <ConfirmModal
                isOpen={showBlockConfirm}
                onCancel={() => setShowBlockConfirm(false)}
                onConfirm={handleToggleBlock}
                title="Chặn người dùng này?"
                message={`Bạn sẽ không thể nhìn thấy trạng thái hoạt động của ${initialTarget.username} và cả hai sẽ không thể gửi tin nhắn cho nhau. Nếu là bạn bè, quan hệ sẽ tự động bị hủy.`}
                confirmText="Xác nhận chặn"
                type="danger"
            />
        </div>
    );
};
