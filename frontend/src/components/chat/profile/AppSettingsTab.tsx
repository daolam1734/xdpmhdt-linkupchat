import React from 'react';
import { 
    Sun, Moon, Languages, Bell, LogOut
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
    handleSave,
    logout
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-8 space-y-10 px-4">
            <section className="space-y-5">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Giao diện (Theme)</label>
                <div className="grid grid-cols-2 gap-5">
                    <button 
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "flex flex-col items-center p-8 rounded-[32px] transition-all shadow-lg group",
                            theme === 'light' ? "bg-white border-4 border-blue-600 shadow-blue-50" : "bg-gray-50 border-4 border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                        <Sun size={40} strokeWidth={2.5} className={theme === 'light' ? "text-blue-600 mb-4" : "text-gray-400 mb-4 group-hover:text-amber-500 transition-colors"} />
                        <span className={clsx("text-[15px] font-black", theme === 'light' ? "text-blue-900" : "text-gray-500")}>Giao diện Sáng</span>
                    </button>
                    <button 
                        onClick={() => {
                            setTheme('dark');
                            toast.error("Chế độ tối đang được hoàn thiện");
                        }}
                        className={clsx(
                            "flex flex-col items-center p-8 rounded-[32px] transition-all shadow-lg group",
                            theme === 'dark' ? "bg-white border-4 border-blue-600 shadow-blue-50" : "bg-gray-50 border-4 border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                        <Moon size={40} strokeWidth={2.5} className={theme === 'dark' ? "text-blue-600 mb-4" : "text-gray-400 mb-4 group-hover:text-indigo-600 transition-colors"} />
                        <span className={clsx("text-[15px] font-black", theme === 'dark' ? "text-blue-900" : "text-gray-500")}>Giao diện Tối</span>
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Hệ thống & Trải nghiệm</label>
                <div className="bg-white border-2 border-gray-50 rounded-[32px] overflow-hidden divide-y-2 divide-gray-50 shadow-sm">
                    <div className="flex items-center justify-between p-6">
                        <div className="flex items-center space-x-4">
                            <Languages size={20} className="text-gray-400" />
                            <div className="flex flex-col">
                                <span className="text-[16px] font-bold text-gray-700">Ngôn ngữ hiển thị</span>
                                <span className="text-xs text-gray-400">Thay đổi ngôn ngữ toàn hệ thống</span>
                            </div>
                        </div>
                        <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                            <option value="vi">TIẾNG VIỆT</option>
                            <option value="en">ENGLISH</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setNotifications(!notifications)}>
                        <div className="flex items-center space-x-4">
                            <Bell size={20} className="text-gray-400" />
                            <div className="flex flex-col">
                                <span className="text-[16px] font-bold text-gray-700">Thông báo & Âm thanh</span>
                                <span className="text-xs text-gray-400">Nhận thông báo khi có tin nhắn mới</span>
                            </div>
                        </div>
                        <div className={clsx(
                            "w-12 h-6 rounded-full relative transition-all shadow-inner",
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

            <div className="flex flex-col space-y-4 pt-4">
                <button 
                    onClick={() => handleSave()}
                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-[0.98]"
                >
                    LƯU THAY ĐỔI CÀI ĐẶT
                </button>

                <button 
                    onClick={() => {
                        logout();
                        toast.success("Hẹn gặp lại bạn!");
                    }}
                    className="w-full flex items-center justify-center space-x-3 py-6 text-red-600 font-black text-lg hover:bg-red-50 rounded-[32px] transition-all border-4 border-red-50 hover:border-red-100"
                >
                    <LogOut size={24} strokeWidth={2.5} />
                    <span>ĐĂNG XUẤT TÀI KHOẢN</span>
                </button>
            </div>
        </div>
    );
};
