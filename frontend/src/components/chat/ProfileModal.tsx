import React, { useState } from 'react';
import { X, Camera, Save, FileText, Calendar, MessageCircle, UserPlus, Check, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../common/Avatar';
import { sendFriendRequest, startDirectChat } from '../../api/users';
import { clsx } from 'clsx';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user?: {
        id: string;
        username: string;
        avatar_url?: string;
        bio?: string;
        created_at?: string;
        is_friend?: boolean;
        is_online?: boolean;
        last_seen?: string;
        request_sent?: boolean;
        allow_stranger_messages?: boolean;
    };
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
    const { currentUser, updateProfile, isLoading } = useAuthStore();
    
    // Nếu không truyền user, mặc định là currentUser
    const targetUser = user || currentUser;
    const isOwnProfile = targetUser?.id === currentUser?.id;
    
    const [username, setUsername] = useState(targetUser?.username || '');
    const [bio, setBio] = useState(targetUser?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(targetUser?.avatar_url || '');
    const [isEditing, setIsEditing] = useState(false);
    const [allowStrangers, setAllowStrangers] = useState(targetUser?.allow_stranger_messages ?? true);
    const [requestSent, setRequestSent] = useState(targetUser?.request_sent || false);

    if (!isOpen || !targetUser) return null;

    const handleSave = async () => {
        try {
            await updateProfile({ 
                username, 
                bio, 
                avatar_url: avatarUrl,
                allow_stranger_messages: allowStrangers 
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Update profile error:', error);
        }
    };

    const handleAction = async () => {
        if (targetUser.is_friend) {
            // Start chat
            await startDirectChat(targetUser.id);
            onClose();
            // Note: Cần reload hoặc redirect ở đây nếu cần
        } else if (!requestSent) {
            try {
                await sendFriendRequest(targetUser.id);
                setRequestSent(true);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-full shadow-lg">
                        <div className="relative group cursor-pointer">
                            <Avatar 
                                name={targetUser.username} 
                                url={targetUser.avatar_url} 
                                size="lg" 
                                isOnline={targetUser.is_online}
                            />
                            {isOwnProfile && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full flex items-center justify-center transition-all">
                                    <Camera size={20} className="text-white opacity-0 group-hover:opacity-100" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-16 pb-8 px-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            {isEditing ? (
                                <input 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                                />
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <h2 className="text-2xl font-bold text-gray-900">{targetUser.username}</h2>
                                    {targetUser.is_online && (
                                        <span className="flex items-center px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded">Active</span>
                                    )}
                                </div>
                            )}
                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                                <Calendar size={14} className="mr-1" />
                                Tham gia từ {targetUser.created_at ? new Date(targetUser.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        
                        {isOwnProfile ? (
                            <button 
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                disabled={isLoading}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                    isEditing 
                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" 
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                {isEditing ? (
                                    <><Save size={16} /> <span>Lưu</span></>
                                ) : (
                                    <span>Chỉnh sửa</span>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center space-x-2">
                                {(targetUser.is_friend || targetUser.allow_stranger_messages) && (
                                    <button 
                                        onClick={async () => {
                                            await startDirectChat(targetUser.id);
                                            onClose();
                                        }}
                                        className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                    >
                                        <MessageCircle size={16} />
                                        <span>Nhắn tin</span>
                                    </button>
                                )}
                                
                                {!targetUser.is_friend && (
                                    <button 
                                        onClick={handleAction}
                                        disabled={requestSent}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                            requestSent
                                            ? "bg-gray-100 text-gray-400 cursor-default"
                                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95"
                                        }`}
                                    >
                                        {requestSent ? (
                                            <><Clock size={16} /> <span>Đã gửi</span></>
                                        ) : (
                                            <><UserPlus size={16} /> <span>Kết bạn</span></>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {isEditing && (
                            <section>
                                <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    <Camera size={14} className="mr-1.5" />
                                    Link ảnh đại diện
                                </label>
                                <input 
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
                                />
                            </section>
                        )}

                        <section>
                            <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                <FileText size={14} className="mr-1.5" />
                                Tiểu sử (Bio)
                            </label>
                            {isEditing ? (
                                <textarea 
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Viết gì đó về bạn..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none"
                                />
                            ) : (
                                <p className="text-[15px] text-gray-700 bg-gray-50 rounded-xl p-3 min-h-[46px]">
                                    {targetUser.bio || "Chưa có tiểu sử."}
                                </p>
                            )}
                        </section>

                        {!isOwnProfile && targetUser.is_friend && (
                            <section className="bg-green-50 rounded-2xl p-4 flex items-center justify-center space-x-2">
                                <Check size={16} className="text-green-600" />
                                <span className="text-sm font-bold text-green-700">Các bạn đã là bạn bè trên LinkUp</span>
                            </section>
                        )}

                        {isOwnProfile && (
                            <section className="space-y-4">
                                <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    <ShieldCheck size={14} className="mr-1.5" />
                                    Quyền riêng tư
                                </label>
                                <div 
                                    onClick={() => isEditing && setAllowStrangers(!allowStrangers)}
                                    className={clsx(
                                        "flex items-center justify-between p-4 rounded-2xl transition-all border",
                                        allowStrangers ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100",
                                        isEditing ? "cursor-pointer" : "cursor-default"
                                    )}
                                >
                                    <div className="flex items-center space-x-3">
                                        {allowStrangers ? (
                                            <ShieldCheck size={20} className="text-blue-600" />
                                        ) : (
                                            <ShieldAlert size={20} className="text-amber-600" />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900">Nhận tin nhắn từ người lạ</span>
                                            <span className="text-[11px] text-gray-500">
                                                {allowStrangers 
                                                    ? "Mọi người có thể nhắn tin cho bạn" 
                                                    : "Chỉ bạn bè mới có thể nhắn tin cho bạn"}
                                            </span>
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <div className={clsx(
                                            "w-10 h-6 rounded-full relative transition-colors",
                                            allowStrangers ? "bg-blue-600" : "bg-gray-300"
                                        )}>
                                            <div className={clsx(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                allowStrangers ? "right-1" : "left-1"
                                            )} />
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {isOwnProfile && (
                            <section className="bg-blue-50 rounded-2xl p-4">
                                <h4 className="text-[13px] font-bold text-blue-800 mb-2">Tính năng & Thiết lập</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white rounded-lg text-center cursor-pointer hover:shadow-sm transition-shadow">
                                        <span className="text-[11px] font-bold text-gray-600">Quyền riêng tư</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg text-center cursor-pointer hover:shadow-sm transition-shadow">
                                        <span className="text-[11px] font-bold text-gray-600">Thông báo</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg text-center cursor-pointer hover:shadow-sm transition-shadow">
                                        <span className="text-[11px] font-bold text-gray-600">Giao diện</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg text-center cursor-pointer hover:shadow-sm transition-shadow">
                                        <span className="text-[11px] font-bold text-gray-600">Bảo mật</span>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};