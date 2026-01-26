import React from 'react';
import { 
    Key, RefreshCw, Eye, EyeOff, Save, 
    Bot, Cpu, ShieldCheck
} from 'lucide-react';
import type { SettingsTabProps } from './types';

export const SettingsTab: React.FC<SettingsTabProps> = ({
    config, onConfigChange, onSave, saving, showGoogleKey, showOpenAIKey, onToggleGoogleKey, onToggleOpenAIKey
}) => {

    return (
        <div className="max-w-4xl space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h4 className="text-xl font-bold text-slate-900">Quản lý AI & API Keys</h4>
                        <p className="text-sm text-slate-500 mt-1">Thay đổi cấu hình AI của toàn hệ thống LinkUp.</p>
                    </div>
                    <div className="p-4 bg-white shadow-sm border border-slate-100 text-indigo-600 rounded-2xl">
                        <Key size={28} />
                    </div>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700 flex items-center">
                                Google Gemini API Key
                                <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded-lg border border-emerald-100 uppercase font-heavy">Active</span>
                            </label>
                            <div className="relative group">
                                <input 
                                    type={showGoogleKey ? "text" : "password"} 
                                    value={config.google_api_key || ''}
                                    onChange={(e) => onConfigChange({...config, google_api_key: e.target.value})}
                                    className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-400 transition-all font-mono text-sm"
                                    placeholder="AIzaSy..."
                                />
                                <button 
                                    type="button"
                                    onClick={onToggleGoogleKey}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showGoogleKey ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700 flex items-center opacity-60">
                                OpenAI API Key
                                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-lg border border-slate-200 uppercase">Optional</span>
                            </label>
                            <div className="relative group grayscale opacity-60 transition-all hover:grayscale-0 hover:opacity-100">
                                <input 
                                    type={showOpenAIKey ? "text" : "password"} 
                                    value={config.openai_api_key || ''}
                                    onChange={(e) => onConfigChange({...config, openai_api_key: e.target.value})}
                                    className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-400 transition-all font-mono text-sm"
                                    placeholder="sk-..."
                                />
                                <button 
                                    type="button"
                                    onClick={onToggleOpenAIKey}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showOpenAIKey ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <label className="text-sm font-bold text-slate-700">AI System Prompt (Hướng dẫn của trợ lý)</label>
                        <textarea 
                            value={config.ai_system_prompt || ''}
                            onChange={(e) => onConfigChange({...config, ai_system_prompt: e.target.value})}
                            rows={4}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-400 transition-all text-sm leading-relaxed"
                            placeholder="Bạn là trợ lý ảo LinkUp AI..."
                        />
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-indigo-100 flex-1 min-w-[200px]">
                            <Bot className="text-indigo-500" size={24} />
                            <div className="flex-1">
                                <span className="text-xs font-bold text-slate-900 block">Auto Reply</span>
                                <span className="text-[10px] text-slate-500">Tự động trả lời tin nhắn mới</span>
                            </div>
                            <button 
                                onClick={() => onConfigChange({...config, ai_auto_reply: !config.ai_auto_reply})}
                                className={`w-12 h-6 rounded-full transition-all relative ${config.ai_auto_reply ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.ai_auto_reply ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                        
                        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-indigo-100 flex-1 min-w-[200px]">
                            <Cpu className="text-emerald-500" size={24} />
                            <div className="flex-1">
                                <span className="text-xs font-bold text-slate-900 block">Sentiment Analysis</span>
                                <span className="text-[10px] text-slate-500">Phân tích thái độ người dùng</span>
                            </div>
                            <button 
                                onClick={() => onConfigChange({...config, ai_sentiment_analysis: !config.ai_sentiment_analysis})}
                                className={`w-12 h-6 rounded-full transition-all relative ${config.ai_sentiment_analysis ? 'bg-emerald-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.ai_sentiment_analysis ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-500">
                            <RefreshCw size={14} className={saving ? "animate-spin text-indigo-600" : ""} />
                            <span className="text-xs font-medium">Thay đổi sẽ có hiệu lực ngay sau khi lưu.</span>
                        </div>
                        <button 
                            onClick={onSave}
                            disabled={saving}
                            className="flex items-center space-x-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-bold shadow-lg shadow-indigo-200"
                        >
                            <Save size={18} />
                            <span>{saving ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 flex items-start space-x-4">
                <div className="p-3 bg-white rounded-xl text-amber-600 shadow-sm">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h5 className="font-bold text-amber-900">Lưu ý bảo mật quan trọng</h5>
                    <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                        API Keys được mã hóa khi lưu trữ trong database. Tuy nhiên, hành động thay đổi Key sẽ làm gián đoạn tạm thời các tính năng AI hiện có. Đảm bảo bạn đã kiểm tra Key mới trước khi lưu.
                    </p>
                </div>
            </div>
        </div>
    );
};
