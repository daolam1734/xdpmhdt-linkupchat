import React from 'react';
import { 
    Sparkles, Check
} from 'lucide-react';
import { clsx } from 'clsx';

interface AITabProps {
    aiStyle: 'NGẮN GỌN' | 'TIÊU CHUẨN' | 'CHI TIẾT';
    setAiStyle: (val: 'NGẮN GỌN' | 'TIÊU CHUẨN' | 'CHI TIẾT') => void;
    contextAccess: boolean;
    setContextAccess: (val: boolean) => void;
    handleSave: () => void;
    isLoading: boolean;
}

export const AITab: React.FC<AITabProps> = ({
    aiStyle,
    setAiStyle,
    contextAccess,
    setContextAccess,
    handleSave,
    isLoading
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 py-8 space-y-8 px-4">
            <div className="bg-gradient-to-br from-purple-600 to-blue-700 p-8 rounded-[32px] text-white shadow-xl shadow-purple-100 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10">
                    <Sparkles size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                            <Sparkles size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter">LinkUp Intelligence AI</h3>
                    </div>
                    <p className="text-white/80 text-[15px] leading-relaxed mb-6 font-medium">
                        Tối ưu hóa trợ lý AI để có trải nghiệm trò chuyện thông minh và hiệu quả hơn dành riêng cho bạn.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/20">
                            <label className="text-[10px] font-black text-purple-200 uppercase tracking-[0.2em] block mb-4">Phong cách trợ lý (Assistant Style)</label>
                            <div className="flex gap-2">
                                {(['NGẮN GỌN', 'TIÊU CHUẨN', 'CHI TIẾT'] as const).map((style) => (
                                    <button 
                                        key={style} 
                                        onClick={() => setAiStyle(style)}
                                        className={clsx(
                                            "flex-1 py-4 text-[11px] font-black rounded-xl transition-all uppercase tracking-widest",
                                            aiStyle === style ? "bg-white text-purple-700 shadow-lg scale-105" : "bg-white/10 text-white hover:bg-white/20"
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
                <div className="flex flex-col">
                    <h4 className="text-[18px] font-black text-gray-900">Bảo mật & Dữ liệu AI</h4>
                    <p className="text-sm text-gray-400 mt-1">Quản lý cách chúng tôi sử dụng dữ liệu của bạn</p>
                </div>
                
                <div className="space-y-5">
                    <div 
                        className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer" 
                        onClick={() => setContextAccess(!contextAccess)}
                    >
                        <div className={clsx(
                            "mt-1 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all",
                            contextAccess ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                        )}>
                            {contextAccess && <Check size={14} className="text-white focus:stroke-[4px]" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-gray-800">Truy cập ngữ cảnh cuộc hội thoại</span>
                            <span className="text-sm text-gray-400 mt-1 leading-relaxed">
                                Cho phép AI đọc tin nhắn để đưa ra câu trả lời chính xác nhất dựa trên lịch sử chat.
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 p-4 opacity-50 grayscale">
                        <div className="mt-1 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 border-gray-200">
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-gray-800 italic">Đào tạo mô hình cá nhân hóa</span>
                            <span className="text-sm text-gray-400 mt-1 leading-relaxed">
                                Cho phép AI học hỏi từ phong cách viết của bạn để phản hồi tự nhiên hơn.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => handleSave()}
                disabled={isLoading}
                className="w-full py-5 bg-purple-600 text-white rounded-[24px] font-black text-lg hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 mt-4 active:scale-[0.98] disabled:opacity-50"
            >
                {isLoading ? "ĐANG TỐI ƯU HÓA..." : "CẬP NHẬT TRỢ LÝ AI"}
            </button>
        </div>
    );
};
