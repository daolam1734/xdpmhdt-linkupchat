import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    X, Camera, ShieldCheck, 
    ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../common/Avatar';
import { ConfirmModal } from '../common/ConfirmModal';
import { sendFriendRequest, startDirectChat, getBlockedList, unfriendUser, getUserProfile } from '../../api/users';
import { uploadFile } from '../../api/uploads';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useChatStore } from '../../store/useChatStore';
import { useViewStore } from '../../store/useViewStore';

// New Tab Components
import { InfoTab } from './profile/InfoTab';
import { SecurityTab } from './profile/SecurityTab';
import { AppSettingsTab } from './profile/AppSettingsTab';
import { AITab } from './profile/AITab';

interface ProfileViewProps {
    user?: any;
    onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onBack }) => {
    const { currentUser, updateProfile, isLoading, logout, blockUser: blockUserStore, unblockUser: unblockUserStore } = useAuthStore();
    const { setActiveRoom } = useChatStore();
    const { profileTab: activeTab, setProfileTab: setActiveTab } = useViewStore();
    
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [work, setWork] = useState('');
    const [education, setEducation] = useState('');
    const [location, setLocation] = useState('');
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
    const [detailedUser, setDetailedUser] = useState<any>(null);

    // Settings States
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [language, setLanguage] = useState<'vi' | 'en'>('vi');
    const [notifications, setNotifications] = useState(true);
    const [enterToSend, setEnterToSend] = useState(true);
    const [contextAccess, setContextAccess] = useState(true);
    const [aiStyle, setAiStyle] = useState<'NGẮN GỌN' | 'TIÊU CHUẨN' | 'CHI TIẾT'>('TIÊU CHUẨN');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch detailed user info if viewing someone else
    useEffect(() => {
        const fetchDetails = async () => {
            if (user && user.id !== currentUser?.id) {
                try {
                    const data = await getUserProfile(user.id);
                    setDetailedUser(data);
                } catch (error) {
                    console.error('Fetch user detail error:', error);
                }
            } else {
                setDetailedUser(null);
            }
        };
        fetchDetails();
    }, [user?.id, currentUser?.id]);

    // Use detailedUser if available, else user prop, else currentUser
    const initialTarget = useMemo(() => detailedUser || user || currentUser, [detailedUser, user, currentUser]);
    const isOwnProfile = useMemo(() => initialTarget?.id === currentUser?.id, [initialTarget, currentUser]);

    // Real-time block status sync
    useEffect(() => {
        if (!initialTarget || isOwnProfile || !currentUser) return;
        
        const isCurrentlyBlocked = currentUser.blocked_users?.includes(initialTarget.id) || false;
        const isCurrentlyBlockedByOther = currentUser.blocked_by?.includes(initialTarget.id) || false;
        
        setIsBlocked(isCurrentlyBlocked);
        setBlockedByOther(isCurrentlyBlockedByOther);
    }, [currentUser?.blocked_users, currentUser?.blocked_by, initialTarget?.id, isOwnProfile]);

    // Reset local state when target user changes (e.g. switching between profiles)
    useEffect(() => {
        if (initialTarget) {
            setUsername(initialTarget.username || '');
            setFullName(initialTarget.full_name || '');
            setEmail(initialTarget.email || '');
            setPhone(initialTarget.phone || '');
            setBio(initialTarget.bio || '');
            setWork(initialTarget.app_settings?.profile?.work || '');
            setEducation(initialTarget.app_settings?.profile?.education || '');
            setLocation(initialTarget.app_settings?.profile?.location || '');
            setAllowStrangers(initialTarget.allow_stranger_messages ?? true);
            setShowOnlineStatus(initialTarget.show_online_status ?? true);
            setRequestSent(initialTarget.request_sent || false);
            setIsFriendLocal(initialTarget.is_friend || false);
            setIsBlocked(initialTarget.is_blocked || false);
            setBlockedByOther(initialTarget.blocked_by_other || false);
            
            setTheme(initialTarget.app_settings?.theme || 'light');
            setLanguage(initialTarget.app_settings?.language || 'vi');
            setNotifications(initialTarget.app_settings?.notifications ?? true);
            setEnterToSend(initialTarget.app_settings?.enter_to_send ?? true);
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
                allow_stranger_messages: allowStrangers,
                show_online_status: showOnlineStatus,
                app_settings: {
                    theme: theme as 'light' | 'dark',
                    language: language as 'vi' | 'en',
                    notifications,
                    enter_to_send: enterToSend,
                    profile: {
                        work,
                        education,
                        location
                    }
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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            toast.loading("Đang tải ảnh lên...", { id: 'upload' });
            const result = await uploadFile(file, 'avatar');
            await updateProfile({ avatar_url: result.url });
            toast.success("Đã cập nhật ảnh đại diện", { id: 'upload' });
        } catch (error) {
            toast.error("Tải ảnh thất bại", { id: 'upload' });
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
        <InfoTab
            initialTarget={initialTarget}
            isOwnProfile={isOwnProfile}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            username={username}
            setUsername={setUsername}
            bio={bio}
            setBio={setBio}
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            work={work}
            setWork={setWork}
            education={education}
            setEducation={setEducation}
            location={location}
            setLocation={setLocation}
            handleSave={handleSave}
            handleAction={handleAction}
            handleUnfriend={handleUnfriend}
            handleToggleBlock={handleToggleBlock}
            requestSent={requestSent}
            isFriendLocal={isFriendLocal}
            isBlocked={isBlocked}
            blockedByOther={blockedByOther}
        />
    ), [isEditing, username, bio, fullName, email, phone, initialTarget, isOwnProfile, requestSent, handleAction, isBlocked, handleToggleBlock, isFriendLocal, blockedByOther, handleUnfriend, handleSave]);

    const privacyContent = useMemo(() => (
        <SecurityTab 
            allowStrangers={allowStrangers}
            setAllowStrangers={setAllowStrangers}
            showOnlineStatus={showOnlineStatus}
            setShowOnlineStatus={setShowOnlineStatus}
            fetchBlockedUsers={fetchBlockedUsers}
            blockedUsersCount={(currentUser?.blocked_users || []).length}
            handleSave={handleSave}
            isLoading={isLoading}
        />
    ), [allowStrangers, showOnlineStatus, isLoading, currentUser?.blocked_users, handleSave]);

    const appContent = useMemo(() => (
        <AppSettingsTab 
            theme={theme}
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
            notifications={notifications}
            setNotifications={setNotifications}
            enterToSend={enterToSend}
            setEnterToSend={setEnterToSend}
            handleSave={handleSave}
            logout={logout}
        />
    ), [theme, language, notifications, enterToSend, logout, handleSave]);

    const aiContent = useMemo(() => (
        <AITab 
            aiStyle={aiStyle}
            setAiStyle={setAiStyle}
            contextAccess={contextAccess}
            setContextAccess={setContextAccess}
            handleSave={handleSave}
            isLoading={isLoading}
        />
    ), [contextAccess, aiStyle, isLoading, handleSave]);

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full animate-in fade-in duration-300 overflow-hidden">
            {/* Simple Navbar */}
            <div className="h-[56px] border-b border-gray-100 flex items-center px-4 shrink-0 bg-white">
                <button 
                  onClick={onBack}
                  className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors mr-2"
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-sm font-bold text-gray-900 tracking-tight">Hồ sơ người dùng</h1>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Simplified Header */}
                <div className="px-6 py-10 border-b border-gray-50 flex flex-col items-center">
                    <div className="relative mb-4">
                        <Avatar 
                            name={initialTarget.full_name || initialTarget.username} 
                            url={initialTarget.avatar_url} 
                            size="xl" 
                            isOnline={initialTarget.is_online}
                        />
                        {isOwnProfile && (
                            <>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow border border-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    <Camera size={14} />
                                </button>
                            </>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                        {fullName || initialTarget.full_name || username || initialTarget.username}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">@{username || initialTarget.username}</p>

                    {!isOwnProfile && (
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={handleAction}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                                {isFriendLocal ? "Gửi tin nhắn" : (requestSent ? "Đã gửi lời mời" : "Kết bạn")}
                            </button>
                            <button 
                                onClick={() => setShowBlockConfirm(true)}
                                className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Chặn người dùng"
                            >
                                <ShieldCheck size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="max-w-5xl mx-auto">
                    {/* Minimal Tabs */}
                    {isOwnProfile && (
                        <div className="flex px-6 border-b border-gray-50 sticky top-0 bg-white z-10">
                            {[
                                { id: 'profile', label: 'Thông tin' },
                                { id: 'privacy', label: 'Bảo mật' },
                                { id: 'app', label: 'Cài đặt' },
                                { id: 'ai', label: 'AI' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={clsx(
                                        "px-4 py-4 text-[13px] font-bold transition-all relative",
                                        activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-900"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="p-6 pb-20">
                        {activeTab === 'profile' && profileContent}
                        {activeTab === 'privacy' && privacyContent}
                        {activeTab === 'app' && appContent}
                        {activeTab === 'ai' && aiContent}
                    </div>
                </div>
            </div>

            {/* Modals remain same but can be styled simpler if needed */}
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
                                                <Avatar name={user.full_name || user.username} url={user.avatar_url} size="lg" />
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900">{user.full_name || user.username}</span>
                                                    <span className="text-xs text-gray-400 font-medium">@{user.username}</span>
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
