import React from 'react';
import { 
    UserPlus, User as UserIcon, 
    MessageSquare, Clock, ShieldAlert,
    Mail, Phone, Info, MapPin, Briefcase, GraduationCap
} from 'lucide-react';
import { clsx } from 'clsx';

interface InfoTabProps {
    initialTarget: any;
    isOwnProfile: boolean;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    username: string;
    setUsername: (val: string) => void;
    bio: string;
    setBio: (val: string) => void;
    fullName: string;
    setFullName: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    phone: string;
    setPhone: (val: string) => void;
    work: string;
    setWork: (val: string) => void;
    education: string;
    setEducation: (val: string) => void;
    location: string;
    setLocation: (val: string) => void;
    handleSave: () => void;
    handleAction: () => void;
    handleUnfriend: () => void;
    handleToggleBlock: () => void;
    requestSent: boolean;
    isFriendLocal: boolean;
    isBlocked: boolean;
    blockedByOther: boolean;
}

export const InfoTab: React.FC<InfoTabProps> = ({
    initialTarget,
    isOwnProfile,
    isEditing,
    setIsEditing,
    username,
    setUsername,
    bio,
    setBio,
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    work,
    setWork,
    education,
    setEducation,
    location,
    setLocation,
    handleSave,
    handleAction,
    handleUnfriend,
    handleToggleBlock,
    requestSent,
    isFriendLocal,
    isBlocked,
    blockedByOther
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side: Intro & Quick Meta (Facebook Style Sidebar) */}
                <div className="lg:w-1/3 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Giới thiệu</h3>
                        
                        <div className="space-y-4">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiểu sử</label>
                                    <textarea 
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all min-h-[100px]"
                                        placeholder="Mô tả bản thân..."
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 font-semibold text-center py-2 italic leading-relaxed px-2">
                                    {blockedByOther ? "Tiểu sử bị ẩn" : (bio || "Chưa có tiểu sử.")}
                                </p>
                            )}

                            {isOwnProfile && (
                                <button 
                                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                    className={clsx(
                                        "w-full py-2 rounded-xl font-black text-xs transition-all active:scale-95 uppercase tracking-widest",
                                        isEditing 
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100" 
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    {isEditing ? "Lưu tiểu sử" : "Chỉnh sửa tiểu sử"}
                                </button>
                            )}

                            <div className="space-y-5 pt-5 border-t border-gray-50">
                                <div className="space-y-4">
                                    {/* Work Section */}
                                    <div className="flex items-start space-x-3 text-gray-600 group">
                                        <Briefcase size={20} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <input 
                                                    value={work}
                                                    onChange={(e) => setWork(e.target.value)}
                                                    placeholder="Nơi làm việc"
                                                    className="w-full bg-gray-50 border-gray-100 border rounded-lg px-3 py-1.5 text-xs text-gray-900 font-bold focus:border-blue-500 focus:outline-none"
                                                />
                                            ) : (
                                                <span className="text-sm font-medium whitespace-nowrap">Làm việc tại <b className="text-gray-900 font-black">{work || "Chưa cập nhật"}</b></span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Education Section */}
                                    <div className="flex items-start space-x-3 text-gray-600">
                                        <GraduationCap size={20} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <input 
                                                    value={education}
                                                    onChange={(e) => setEducation(e.target.value)}
                                                    placeholder="Trường học"
                                                    className="w-full bg-gray-50 border-gray-100 border rounded-lg px-3 py-1.5 text-xs text-gray-900 font-bold focus:border-blue-500 focus:outline-none"
                                                />
                                            ) : (
                                                <span className="text-sm font-medium whitespace-nowrap">Từng học tại <b className="text-gray-900 font-black">{education || "Chưa cập nhật"}</b></span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Section */}
                                    <div className="flex items-start space-x-3 text-gray-600">
                                        <MapPin size={20} className="text-gray-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <input 
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="Tỉnh/Thành phố"
                                                    className="w-full bg-gray-50 border-gray-100 border rounded-lg px-3 py-1.5 text-xs text-gray-900 font-bold focus:border-blue-500 focus:outline-none"
                                                />
                                            ) : (
                                                <span className="text-sm font-medium whitespace-nowrap">Sống tại <b className="text-gray-900 font-black">{location || "Chưa cập nhật"}</b></span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <Clock size={20} className="text-gray-400 shrink-0" />
                                        <span className="text-sm font-medium whitespace-nowrap">Tham gia vào <b className="text-gray-900 font-black">{initialTarget.created_at ? new Date(initialTarget.created_at).toLocaleDateString() : 'tháng 1, 2024'}</b></span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-gray-600">
                                        <UserPlus size={20} className="text-gray-400 shrink-0" />
                                        <span className="text-sm font-medium whitespace-nowrap">Có <b className="text-gray-900 font-black">{initialTarget.friend_count || 0} người bạn</b></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isOwnProfile && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                            <button 
                                onClick={handleAction}
                                disabled={requestSent || blockedByOther || isBlocked}
                                className={clsx(
                                    "w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center space-x-2",
                                    (requestSent || blockedByOther || isBlocked)
                                        ? "bg-gray-100 text-gray-400 cursor-default"
                                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100"
                                )}
                            >
                                {isBlocked ? (
                                    <><ShieldAlert size={18} /> <span>Đã chặn</span></>
                                ) : blockedByOther ? (
                                    <><ShieldAlert size={18} /> <span>Không khả dụng</span></>
                                ) : isFriendLocal ? (
                                    <><MessageSquare size={18} /> <span>Nhắn tin</span></>
                                ) : requestSent ? (
                                    <><Clock size={18} /> <span>Đã gửi yêu cầu</span></>
                                ) : (
                                    <><UserPlus size={18} /> <span>Thêm bạn bè</span></>
                                )}
                            </button>
                            
                            {isFriendLocal && (
                                <button 
                                    onClick={handleUnfriend}
                                    className="w-full py-2.5 rounded-xl font-bold text-xs text-red-500 hover:bg-red-50 transition-all border border-red-50"
                                >
                                    Hủy kết bạn
                                </button>
                            )}

                            <button 
                                onClick={handleToggleBlock}
                                className={clsx(
                                    "w-full py-2.5 rounded-xl font-bold text-xs transition-all",
                                    isBlocked 
                                        ? "text-blue-600 hover:bg-blue-50" 
                                        : "text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {isBlocked ? "Bỏ chặn" : "Chặn người dùng"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Side: Detailed About Content */}
                <div className="lg:w-2/3 space-y-6">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-full">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                            <h3 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
                                <Info size={24} className="mr-3 text-blue-600" />
                                Chi tiết tài khoản
                            </h3>
                            {isOwnProfile && !isEditing && (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95"
                                >
                                    Chỉnh sửa
                                </button>
                            )}
                        </div>

                        <div className="space-y-10">
                            <div className="group">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 block">Tên người dùng</label>
                                <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 shrink-0 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <UserIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <input 
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-gray-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all"
                                            />
                                        ) : (
                                            <p className="text-xl font-black text-gray-900 tracking-tight">{username}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 block">Họ và tên đầy đủ</label>
                                <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 shrink-0 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        <Info size={20} />
                                    </div>
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <input 
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-gray-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all"
                                            />
                                        ) : (
                                            <p className="text-lg font-black text-gray-900 uppercase tracking-tight">{fullName || 'Chưa thiết lập'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 block">Thông tin liên hệ</label>
                                <div className="space-y-6">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 shrink-0 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <Mail size={20} />
                                        </div>
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <input 
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-gray-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all"
                                                />
                                            ) : (
                                                <p className="font-bold text-gray-800 text-lg">{email || 'Chưa thiết lập'}</p>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Email cá nhân</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 shrink-0 border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <Phone size={20} />
                                        </div>
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <input 
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-gray-900 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all"
                                                />
                                            ) : (
                                                <p className="font-bold text-gray-800 text-lg">{phone || 'Chưa thiết lập'}</p>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Số điện thoại</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="mt-12 pt-8 border-t border-gray-50 flex space-x-4">
                                <button 
                                    onClick={handleSave}
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                                >
                                    Lưu thay đổi
                                </button>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    Hủy
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
