import React, { useState } from 'react';
import { 
    MessageSquare, ShieldAlert, 
    ChevronRight, HelpCircle, ShieldCheck,
    Key, Smartphone, Monitor, LogOut
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../../store/useAuthStore';
import toast from 'react-hot-toast';

interface SecurityTabProps {
    allowStrangers: boolean;
    setAllowStrangers: (val: boolean) => void;
    showOnlineStatus: boolean;
    setShowOnlineStatus: (val: boolean) => void;
    fetchBlockedUsers: () => void;
    blockedUsersCount: number;
    handleSave: () => void;
    isLoading: boolean;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
    allowStrangers,
    setAllowStrangers,
    showOnlineStatus,
    setShowOnlineStatus,
    fetchBlockedUsers,
    blockedUsersCount,
    handleSave,
    isLoading
}) => {
    const { updateProfile } = useAuthStore();
    
    // Local state for password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [isUpdatingPass, setIsUpdatingPass] = useState(false);

    const handleUpdatePassword = async () => {
        if (!newPass) return;
        if (newPass !== confirmPass) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        if (newPass.length < 6) {
            toast.error('Mật khẩu phải từ 6 ký tự');
            return;
        }

        setIsUpdatingPass(true);
        try {
            await updateProfile({ password: newPass });
            toast.success('Đã đổi mật khẩu thành công');
            setNewPass('');
            setConfirmPass('');
            setShowPasswordForm(false);
        } catch (error) {
            toast.error('Lỗi khi đổi mật khẩu');
        } finally {
            setIsUpdatingPass(false);
        }
    };

    const handleToggleAllowStrangers = async () => {
        const newValue = !allowStrangers;
        setAllowStrangers(newValue);
        try {
            await updateProfile({ allow_stranger_messages: newValue });
            toast.success(newValue ? 'Đã cho phép tin nhắn từ người lạ' : 'Đã chặn tin nhắn từ người lạ');
        } catch (error) {
            setAllowStrangers(!newValue);
            toast.error('Lỗi kết nối máy chủ');
        }
    };

    const handleToggleOnlineStatus = async () => {
        const newValue = !showOnlineStatus;
        setShowOnlineStatus(newValue);
        try {
            await updateProfile({ show_online_status: newValue });
            toast.success(newValue ? 'Đang hiện trạng thái hoạt động' : 'Đã ẩn trạng thái hoạt động');
        } catch (error) {
            setShowOnlineStatus(!newValue);
            toast.error('Lỗi kết nối máy chủ');
        }
    };

    const sessions = [
        { device: 'Thiết bị hiện tại', browser: navigator.userAgent.split(') ')[0].split(' (')[1] || 'Trình duyệt Web', current: true },
        { device: 'iPhone 13 Pro', browser: 'LinkUp Mobile', current: false }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-8 space-y-8 px-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Quyền riêng tư & Bảo mật</h3>
            </div>
            
            <div className="space-y-3">
                <div 
                    onClick={handleToggleAllowStrangers}
                    className={clsx(
                        "flex items-center justify-between p-5 rounded-[24px] transition-all border-2 cursor-pointer group",
                        allowStrangers ? "bg-blue-50/30 border-blue-100" : "bg-gray-50/50 border-gray-100"
                    )}
                >
                    <div className="flex items-center space-x-4">
                        <div className={clsx(
                            "p-3 rounded-2xl transition-all shadow-sm",
                            allowStrangers ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
                        )}>
                            <MessageSquare size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900">Tin nhắn từ người lạ</span>
                            <span className="text-[11px] text-gray-500">
                                {allowStrangers ? "Ai cũng có thể nhắn tin" : "Chỉ bạn bè"}
                            </span>
                        </div>
                    </div>
                    <div className={clsx(
                        "w-11 h-6 rounded-full relative transition-all duration-300",
                        allowStrangers ? "bg-blue-600" : "bg-gray-300"
                    )}>
                        <div className={clsx(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                            allowStrangers ? "right-1" : "left-1"
                        )} />
                    </div>
                </div>

                <div 
                    onClick={handleToggleOnlineStatus}
                    className={clsx(
                        "flex items-center justify-between p-5 rounded-[24px] transition-all border-2 cursor-pointer group",
                        showOnlineStatus ? "bg-green-50/30 border-green-100" : "bg-gray-50/50 border-gray-100"
                    )}
                >
                    <div className="flex items-center space-x-4">
                        <div className={clsx(
                            "p-3 rounded-2xl transition-all shadow-sm",
                            showOnlineStatus ? "bg-green-600 text-white" : "bg-gray-200 text-gray-400"
                        )}>
                            <div className="w-5 h-5 border-2 border-current rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-current rounded-full" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900">Trạng thái hoạt động</span>
                            <span className="text-[11px] text-gray-500">Hiển thị khi đang online</span>
                        </div>
                    </div>
                    <div className={clsx(
                        "w-11 h-6 rounded-full relative transition-all duration-300",
                        showOnlineStatus ? "bg-green-600" : "bg-gray-300"
                    )}>
                        <div className={clsx(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                            showOnlineStatus ? "right-1" : "left-1"
                        )} />
                    </div>
                </div>
            </div>

            <div className="bg-white border-2 border-gray-50 rounded-[28px] overflow-hidden shadow-sm">
                <button 
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all group"
                >
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-xl text-gray-500">
                            <Key size={20} />
                        </div>
                        <span className="text-sm font-black text-gray-700">Thay đổi mật khẩu</span>
                    </div>
                    <ChevronRight size={18} className={clsx("text-gray-300 transition-transform", showPasswordForm && "rotate-90")} />
                </button>

                {showPasswordForm && (
                    <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2">
                        <input 
                            type="password"
                            placeholder="Mật khẩu mới"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none text-sm transition-all"
                        />
                        <input 
                            type="password"
                            placeholder="Xác nhận mật khẩu mới"
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none text-sm transition-all"
                        />
                        <button 
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPass || !newPass}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                            {isUpdatingPass ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT MẬT KHẨU'}
                        </button>
                    </div>
                )}

                <div className="h-[2px] bg-gray-50" />

                <button 
                    onClick={fetchBlockedUsers}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all group"
                >
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-xl text-gray-500">
                            <ShieldAlert size={20} />
                        </div>
                        <span className="text-sm font-black text-gray-700">Danh sách chặn</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{blockedUsersCount}</span>
                        <ChevronRight size={18} className="text-gray-300" />
                    </div>
                </button>

                <div className="h-[2px] bg-gray-50" />
                
                <div className="w-full flex items-center justify-between p-6 opacity-60">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-xl text-gray-500">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-sm font-black text-gray-700">Xác thực 2 yếu tố</span>
                            <span className="text-[10px] text-blue-500 font-black">SẮP RA MẮT</span>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-200" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Thiết bị đăng nhập</span>
                </div>
                <div className="space-y-2">
                    {sessions.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className={clsx("p-2 rounded-lg", s.current ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
                                    {s.device.includes('Máy tính') ? <Monitor size={16} /> : <Smartphone size={16} />}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900">{s.device} {s.current && <span className="text-green-500 ml-1">●</span>}</p>
                                    <p className="text-[10px] text-gray-400">{s.browser}</p>
                                </div>
                            </div>
                            {!s.current && <button className="text-gray-300 hover:text-red-500"><LogOut size={14} /></button>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-5 bg-amber-50 rounded-[24px] border border-amber-100 flex items-start space-x-4 shadow-sm">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                    <HelpCircle size={18} />
                </div>
                <div className="space-y-1">
                    <p className="text-[12px] text-amber-900 font-bold uppercase tracking-tight">Mẹo bảo mật:</p>
                    <p className="text-[12px] text-amber-700 leading-relaxed font-medium">
                        Sử dụng mật khẩu mạnh và định kỳ thay đổi để bảo vệ tài khoản tốt nhất.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                    onClick={() => handleSave()}
                    disabled={isLoading}
                    className="py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                    {isLoading ? "ĐANG LƯU..." : "LƯU CÀI ĐẶT"}
                </button>
                <button 
                    disabled
                    className="py-4 bg-red-50 text-red-300 border border-red-50 rounded-2xl font-black text-sm cursor-not-allowed opacity-50"
                >
                    XÓA TÀI KHOẢN
                </button>
            </div>
        </div>
    );
};
