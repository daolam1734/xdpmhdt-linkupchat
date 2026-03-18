import React from 'react';
import { 
    Key, RefreshCw, Eye, EyeOff, Save, 
    Bot, Cpu, ShieldCheck, MessageSquare, 
    HardDrive, Settings2, Bell, Construction,
    UploadCloud
} from 'lucide-react';
import type { SettingsTabProps } from './types';

export const SettingsTab: React.FC<SettingsTabProps> = ({
    config, onConfigChange, onSave, saving, showGoogleKey, showOpenAIKey, onToggleGoogleKey, onToggleOpenAIKey
}) => {

    return (
        <div className="max-w-4xl space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* 1. AI & API Keys */}
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

                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700">AI System Prompt (Hướng dẫn của trợ lý)</label>
                        <textarea 
                            value={config.ai_system_prompt || ''}
                            onChange={(e) => onConfigChange({...config, ai_system_prompt: e.target.value})}
                            rows={4}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:bg-white focus:border-indigo-400 transition-all text-sm leading-relaxed"
                            placeholder="Bạn là trợ lý ảo LinkUp AI..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
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
                        
                        <div className="flex items-center space-x-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
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
                </div>
            </div>

            {/* 2. System Limits & Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hạn mức hệ thống */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-slate-50/50">
                        <div className="p-2 bg-white shadow-sm border border-slate-100 text-blue-600 rounded-xl">
                            <Settings2 size={20} />
                        </div>
                        <h4 className="font-bold text-slate-900">Hạn mức hệ thống</h4>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 flex items-center">
                                    <MessageSquare size={14} className="mr-2 text-slate-400" />
                                    Độ dài tin nhắn tối đa
                                </label>
                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                    {config.max_message_length} ký tự
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="500" 
                                max="10000" 
                                step="500"
                                value={config.max_message_length}
                                onChange={(e) => onConfigChange({...config, max_message_length: parseInt(e.target.value)})}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 flex items-center">
                                    <HardDrive size={14} className="mr-2 text-slate-400" />
                                    Dung lượng file tối đa
                                </label>
                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    {config.max_file_size_mb} MB
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="100" 
                                step="1"
                                value={config.max_file_size_mb}
                                onChange={(e) => onConfigChange({...config, max_file_size_mb: parseInt(e.target.value)})}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Bật/tắt tính năng */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-slate-50/50">
                        <div className="p-2 bg-white shadow-sm border border-slate-100 text-purple-600 rounded-xl">
                            <Cpu size={20} />
                        </div>
                        <h4 className="font-bold text-slate-900">Bật/tắt tính năng</h4>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center space-x-3">
                                <Bot size={18} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">Dịch vụ AI</span>
                            </div>
                            <button 
                                onClick={() => onConfigChange({...config, ai_enabled: !config.ai_enabled})}
                                className={`w-10 h-5 rounded-full transition-all relative ${config.ai_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.ai_enabled ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center space-x-3">
                                <UploadCloud size={18} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">Tải lên File</span>
                            </div>
                            <button 
                                onClick={() => onConfigChange({...config, file_upload_enabled: !config.file_upload_enabled})}
                                className={`w-10 h-5 rounded-full transition-all relative ${config.file_upload_enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.file_upload_enabled ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center space-x-3">
                                <Bell size={18} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">Thông báo hệ thống</span>
                            </div>
                            <button 
                                onClick={() => onConfigChange({...config, system_notifications_enabled: !config.system_notifications_enabled})}
                                className={`w-10 h-5 rounded-full transition-all relative ${config.system_notifications_enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.system_notifications_enabled ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-rose-50 p-3 rounded-xl border border-rose-100">
                            <div className="flex items-center space-x-3">
                                <Construction size={18} className="text-rose-500" />
                                <span className="text-xs font-bold text-rose-900">Chế độ bảo trì</span>
                            </div>
                            <button 
                                onClick={() => onConfigChange({...config, maintenance_mode: !config.maintenance_mode})}
                                className={`w-10 h-5 rounded-full transition-all relative ${config.maintenance_mode ? 'bg-rose-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${config.maintenance_mode ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button block */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-500">
                        <RefreshCw size={18} className={saving ? "animate-spin text-indigo-600" : ""} />
                        <span className="text-sm font-medium">Lưu cấu hình sau khi hoàn tất thiết lập.</span>
                    </div>
                    <button 
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center space-x-2 px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black disabled:opacity-50 transition-all font-bold shadow-xl shadow-slate-200"
                    >
                        <Save size={20} />
                        <span>{saving ? 'ĐANG LƯU...' : 'LƯU TẤT CẢ CẤU HÌNH'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 flex items-start space-x-4">
                <div className="p-3 bg-white rounded-xl text-amber-600 shadow-sm">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h5 className="font-bold text-amber-900">Lưu ý quản trị viên</h5>
                    <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                        Các thay đổi về hạn mức và bật/tắt tính năng sẽ được áp dụng ngay lập tức cho toàn bộ người dùng trong hệ thống. Riêng API Keys có thể mất vài giây để đồng bộ với các worker AI.
                    </p>
                </div>
            </div>
        </div>
    );
};
