import React from 'react';
import { 
    Sun, Moon, Languages, Bell, LogOut, Send, Eye, Volume2
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
    readReceipts: boolean;
    setReadReceipts: (val: boolean) => void;
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
    readReceipts,
    setReadReceipts,
    handleSave,
    logout
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-8 space-y-8 px-4 max-w-2xl mx-auto">
            <section className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Giao diện (Theme)</label>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "flex flex-col items-center p-6 rounded-[24px] transition-all group",
                            theme === 'light' ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-50" : "bg-gray-50 border-2 border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                        <Sun size={32} strokeWidth={2.5} className={theme === 'light' ? "text-blue-600 mb-3" : "text-gray-400 mb-3 group-hover:text-amber-500 transition-colors"} />
                        <span className={clsx("text-[14px] font-bold", theme === 'light' ? "text-blue-900" : "text-gray-500")}>Giao diện Sáng</span>
                    </button>
                    <button 
                        onClick={() => {
                            setTheme('dark');
                        }}
                        className={clsx(
                            "flex flex-col items-center p-6 rounded-[24px] transition-all group",
                            theme === 'dark' ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-50" : "bg-gray-50 border-2 border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                        <Moon size={32} strokeWidth={2.5} className={theme === 'dark' ? "text-blue-600 mb-3" : "text-gray-400 mb-3 group-hover:text-indigo-600 transition-colors"} />
                        <span className={clsx("text-[14px] font-bold", theme === 'dark' ? "text-blue-900" : "text-gray-500")}>Giao diện Tối</span>
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Cài đặt trò chuyện</label>
                <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden divide-y divide-gray-50 shadow-sm">
                    {/* Enter to Send */}
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setEnterToSend(!enterToSend)}>
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <Send size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Phím Enter để gửi</span>
                                <span className="text-xs text-gray-400">Tắt để nhấn Ctrl+Enter (hoặc nút Gửi) để gửi</span>
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

                    {/* Read Receipts */}
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setReadReceipts(!readReceipts)}>
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                <Eye size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Trạng thái "Đã xem"</span>
                                <span className="text-xs text-gray-400">Cho người khác biết bạn đã đọc tin nhắn</span>
                            </div>
                        </div>
                        <div className={clsx(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            readReceipts ? "bg-green-600" : "bg-gray-200"
                        )}>
                            <div className={clsx(
                                "absolute w-4 h-4 bg-white rounded-full shadow-md transition-all top-1",
                                readReceipts ? "left-7" : "left-1"
                            )} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Hệ thống & Ngôn ngữ</label>
                <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden divide-y divide-gray-50 shadow-sm">
                    <div className="flex items-center justify-between p-5">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                                <Languages size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Ngôn ngữ hiển thị</span>
                                <span className="text-xs text-gray-400">Thay đổi ngôn ngữ toàn hệ thống</span>
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

                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setNotifications(!notifications)}>
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Volume2 size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-700">Thông báo & Âm thanh</span>
                                <span className="text-xs text-gray-400">Nhận thông báo khi có tin nhắn mới</span>
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
                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-bold text-[15px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                >
                    Lưu các thay đổi
                </button>

                <button 
                    onClick={() => {
                        logout();
                        toast.success("Hẹn gặp lại bạn!");
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
