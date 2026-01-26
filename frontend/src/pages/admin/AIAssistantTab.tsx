import React from 'react';
import { 
    Zap, BrainCircuit, Bot, MessageSquare, 
    ShieldCheck, Sparkles, Wand2, Lightbulb
} from 'lucide-react';
import type { AIAssistantTabProps } from './types';

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
    config, onConfigChange, onSave, saving
}) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">Quản trị Trí tuệ Nhân tạo</h3>
                    <p className="text-slate-500 mt-1">Cấu hình hành vi và giám sát hiệu năng của LinkUp AI Assistant.</p>
                </div>
                <div className="flex space-x-3">
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 flex items-center space-x-2">
                        <Sparkles size={16} className="text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Model: Gemini 2.0 Flash</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Zap size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">Offline</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Yêu cầu đã xử lý hôm nay</p>
                    <div className="mt-4 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[65%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <BrainCircuit size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">94.2%</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Độ chính xác phản hồi (Ước tính)</p>
                    <div className="mt-4 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[94%] rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Bot size={24} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latency</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">0.8s</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Thời gian phản hồi trung bình</p>
                    <div className="mt-4 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[40%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Wand2 size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900">Cấu hình Trợ lý Ảo</h4>
                            <p className="text-xs text-slate-500 font-medium">Tùy chỉnh cá tính và khả năng của Bot hỗ trợ.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-xs font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2"
                    >
                        {saving ? <BrainCircuit className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                        <span>{saving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}</span>
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                                <MessageSquare size={16} className="text-indigo-500" />
                                <span>AI System Prompt (Cấu hình hành vi)</span>
                            </label>
                            <span className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 bg-slate-100 rounded-lg">Markdown Supported</span>
                        </div>
                        <div className="relative group">
                            <textarea 
                                value={config.ai_system_prompt || ''}
                                onChange={(e) => onConfigChange({...config, ai_system_prompt: e.target.value})}
                                rows={8}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium focus:ring-4 focus:ring-indigo-100/50 focus:bg-white focus:border-indigo-400 transition-all leading-relaxed"
                                placeholder="Nhập chỉ dẫn cho AI, ví dụ: 'Bạn là trợ lý thân thiện của LinkUp Chat...'"
                            />
                            <div className="absolute right-4 bottom-4 opacity-50">
                                <Bot size={40} className="text-slate-200" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h5 className="font-bold text-slate-900 text-sm">Auto-Response (Tự động phản hồi)</h5>
                                    <p className="text-xs text-slate-500 leading-relaxed">AI sẽ tự động trả lời khi có thành viên tag @AI-Assistant trong tất cả các phòng chat công khai.</p>
                                </div>
                                <button 
                                    onClick={() => onConfigChange({...config, ai_auto_reply: !config.ai_auto_reply})}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${config.ai_auto_reply ? 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.3)]' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.ai_auto_reply ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h5 className="font-bold text-slate-900 text-sm">Sentiment Detection (Phân tích cảm xúc)</h5>
                                    <p className="text-xs text-slate-500 leading-relaxed">Tự động gắn nhãn thái độ tin nhắn (Tích cực/Tiêu cực) để hỗ trợ Admin trong việc kiểm soát nội dung.</p>
                                </div>
                                <button 
                                    onClick={() => onConfigChange({...config, ai_sentiment_analysis: !config.ai_sentiment_analysis})}
                                    className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${config.ai_sentiment_analysis ? 'bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.ai_sentiment_analysis ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-4">
                        <div className="p-2.5 bg-white rounded-xl text-amber-600 shadow-sm border border-amber-100">
                            <Lightbulb size={20} />
                        </div>
                        <div>
                            <h5 className="text-sm font-bold text-amber-900">Mẹo tối ưu hóa</h5>
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                Hãy giữ System Prompt ngắn gọn và rõ ràng. Việc đưa ra các ví dụ cụ thể (Few-shot prompting) sẽ giúp AI phản hồi chính xác hơn về ngữ cảnh của LinkUp.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
