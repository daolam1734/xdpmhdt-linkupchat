import React from 'react';
import { 
    Sun, Moon, Languages, Bell, LogOut, Send, ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface AppSettingsTabProps {
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    language: 'vi' | 'en';
    setLanguage: (val: 'vi' | 'en') => void;
    notifications: boolean;
    setNotifications: (val: boolean) => void;
    enterToSend: boolean;
    setEnterToSend: (val: boolean) => void;
    handleSave: () => void;
    logout: () => void;
}

export const AppSettingsTab: React.FC<AppSettingsTabProps> = ({
    theme,
    setTheme,
    language,
    setLanguage,
    notifications,
    setNotifications,
    enterToSend,
    setEnterToSend,
    handleSave,
    logout
}) => {
    const handleNotificationToggle = () => {
        if (!notifications && "Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    setNotifications(true);
                    toast.success("Đã bật thông báo hệ thống");
                } else {
                    toast.error("Vui lòng cấp quyền thông báo trong cài đặt trình duyệt");
                }
            });
        } else {
            setNotifications(!notifications);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-8 space-y-8 px-4 max-w-2xl mx-auto pb-24">
            <section className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Giao diện (Theme)</label>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => {
                            setTheme('light');
                            document.documentElement.classList.remove('dark');
                            document.body.classList.remove('dark');
                        }}
                        className={clsx(
                            "flex flex-col items-center p-6 rounded-[24px] transition-all group",
                            theme === 'light' ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-50 dark:bg-slate-800 dark:shadow-none" : "bg-gray-50 border-2 border-transparent opacity-60 hover:opacity-100 dark:bg-slate-900"
                        )}
                    >
                        <Sun size={32} strokeWidth={2.5} className={theme === 'light' ? "text-blue-600 mb-3" : "text-gray-400 mb-3 group-hover:text-amber-500 transition-colors"} />
                        <span className={clsx("text-[14px] font-bold", theme === 'light' ? "text-blue-900 dark:text-blue-400" : "text-gray-500")}>Giao diện Sáng</span>
                    </button>
                    <button 
                        onClick={() => {
                            setTheme('dark');
                            document.documentElement.classList.add('dark');
                            document.body.classList.add('dark');
                        }}
                        className={clsx(
                            "flex flex-col items-center p-6 rounded-[24px] transition-all group",
                            theme === 'dark' ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-50 dark:bg-slate-800 dark:shadow-none" : "bg-gray-50 border-2 border-transparent opacity-60 hover:opacity-100 dark:bg-slate-900"
                        )}
                    >
                        <Moon size={32} strokeWidth={2.5} className={theme === 'dark' ? "text-blue-600 mb-3" : "text-gray-400 mb-3 group-hover:text-indigo-600 transition-colors"} />
                        <span className={clsx("text-[14px] font-bold", theme === 'dark' ? "text-blue-900 dark:text-blue-400" : "text-gray-500")}>Giao diện Tối</span>
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Cấu hình tính năng</label>
                <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden divide-y divide-gray-50 shadow-sm">
                    {/* Enter to Send */}
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setEnterToSend(!enterToSend)}>
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <Send size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Phím Enter để gửi</span>
                                <span className="text-xs text-gray-400">Điều chỉnh hành vi phím Enter trong khung chat</span>
                            </div>
                        </div>
                        <div className={clsx(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            enterToSend ? "bg-blue-600" : "bg-gray-200"
                        )}>
                            <div className={clsx(
                                "absolute w-4 h-4 bg-white rounded-full shadow-md transition-all top-1",
                                enterToSend ? "left-7" : "left-1"
                            )} />
                        </div>
                    </div>

                    {/* Language Settings */}
                    <div className="flex items-center justify-between p-5">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                                <Languages size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Ngôn ngữ AI & Hệ thống</span>
                                <span className="text-xs text-gray-400">Thay đổi ngôn ngữ phản hồi từ trợ lý</span>
                            </div>
                        </div>
                        <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="text-[12px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl outline-none cursor-pointer hover:bg-blue-100 transition-colors border-none"
                        >
                            <option value="vi">TIẾNG VIỆT</option>
                            <option value="en">ENGLISH</option>
                        </select>
                    </div>

                    {/* Notifications Toggle */}
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleNotificationToggle}>
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Bell size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Thông báo trình duyệt</span>
                                <span className="text-xs text-gray-400">Nhận cảnh báo ngay cả khi không ở tab chat</span>
                            </div>
                        </div>
                        <div className={clsx(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            notifications ? "bg-amber-600" : "bg-gray-200"
                        )}>
                            <div className={clsx(
                                "absolute w-4 h-4 bg-white rounded-full shadow-md transition-all top-1",
                                notifications ? "left-7" : "left-1"
                            )} />
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex flex-col space-y-4 pt-4">
                <button 
                    onClick={() => handleSave()}
                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-bold text-[15px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                    <ShieldCheck size={20} />
                    <span>Lưu cấu hình & Áp dụng</span>
                </button>

                <button 
                    onClick={() => {
                        logout();
                        toast.success("Đã đăng xuất an toàn");
                    }}
                    className="w-full flex items-center justify-center space-x-3 py-5 text-red-600 font-bold text-[15px] hover:bg-red-50 rounded-[24px] transition-all"
                >
                    <LogOut size={20} />
                    <span>Đăng xuất tài khoản</span>
                </button>
            </div>
        </div>
    );
};
