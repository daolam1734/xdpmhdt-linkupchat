import React, { useState } from 'react';
import { 
    Zap, BrainCircuit, Bot, MessageSquare, 
    ShieldCheck, Sparkles, Wand2, Lightbulb,
    ThumbsUp, ThumbsDown, AlertCircle, 
    Search, UserMinus, ShieldAlert, Settings,
    Activity, Clock, Ban, Globe
} from 'lucide-react';
import type { AIAssistantTabProps } from './types';

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
    stats, config, onConfigChange, onSave, saving,
    restrictedUsers = [], restrictedRooms = [], 
    onToggleUserRestriction = () => {}, onToggleRoomRestriction = () => {}
}) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'config' | 'restrictions'>('stats');
    const [searchTerm, setSearchTerm] = useState('');

    const feedbackTotal = (stats?.ai_feedback_positive || 0) + (stats?.ai_feedback_negative || 0);
    const positiveRate = feedbackTotal > 0 ? ((stats?.ai_feedback_positive || 0) / feedbackTotal) * 100 : 0;
    const errorRate = (stats?.ai_calls_today || 0) > 0 ? ((stats?.ai_errors_count || 0) / (stats?.ai_calls_today || 1)) * 100 : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl">
            {/* Header with Master Toggle */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Bot size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">LinkUp AI Assistant</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${config.ai_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                {config.ai_enabled ? 'Hệ thống đang hoạt động' : 'Hệ thống đã tạm dừng'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button
                        onClick={() => onConfigChange({ ...config, ai_enabled: !config.ai_enabled })}
                        className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                            config.ai_enabled 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700'
                        }`}
                    >
                        {config.ai_enabled ? (
                            <><Ban size={18} /> Tắt AI Toàn hệ thống</>
                        ) : (
                            <><Globe size={18} /> Bật AI Toàn hệ thống</>
                        )}
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="p-3 bg-white text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all font-bold"
                    >
                        {saving ? <BrainCircuit className="animate-spin" size={18} /> : <Settings size={18} />}
                    </button>
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
                {[
                    { id: 'stats', label: 'Thống kê & Hiệu năng', icon: Activity },
                    { id: 'config', label: 'Cấu hình giới hạn', icon: Settings },
                    { id: 'restrictions', label: 'Danh mục hạn chế', icon: ShieldAlert },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Primary Stats */}
                    <StatCard 
                        icon={<Zap className="text-blue-600" />} 
                        bg="bg-blue-50"
                        label="Yêu cầu hôm nay" 
                        value={stats.ai_calls_today.toLocaleString()} 
                        subValue="API Calls"
                    />
                    <StatCard 
                        icon={<ThumbsUp className="text-emerald-600" />} 
                        bg="bg-emerald-50"
                        label="Phản hồi tốt" 
                        value={`${positiveRate.toFixed(1)}%`} 
                        subValue={`${stats.ai_feedback_positive} lượt 👍`}
                        percentage={positiveRate}
                    />
                    <StatCard 
                        icon={<ThumbsDown className="text-orange-600" />} 
                        bg="bg-orange-50"
                        label="Cần cải thiện" 
                        value={stats.ai_feedback_negative.toLocaleString()} 
                        subValue="Lượt dislike 👎"
                    />
                    <StatCard 
                        icon={<AlertCircle className="text-rose-600" />} 
                        bg="bg-rose-50"
                        label="Tỷ lệ lỗi" 
                        value={`${errorRate.toFixed(2)}%`} 
                        subValue={`${stats.ai_errors_count} sự cố`}
                        percentage={errorRate}
                        isError
                    />

                    {/* Feedback Detail chart (Mock Visualization) */}
                    <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-slate-800 flex items-center gap-2">
                                <MessageSquare size={20} className="text-indigo-500" />
                                Phân tích Phản hồi Người dùng
                            </h4>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-600">Sự hài lòng của khách hàng</span>
                                    <span className="text-sm font-black text-indigo-600">{positiveRate.toFixed(1)}%</span>
                                </div>
                                <div className="h-4 bg-slate-50 rounded-full overflow-hidden flex">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${positiveRate}%` }}
                                    />
                                    <div 
                                        className="h-full bg-slate-200 transition-all duration-1000"
                                        style={{ width: `${100 - positiveRate}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Negative ({(100-positiveRate).toFixed(1)}%)</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Positive ({positiveRate.toFixed(1)}%)</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <FeedbackMetric label="Tốc độ xử lý" value="1.2s" icon={<Clock size={14} />} />
                                <FeedbackMetric label="Tokens trung bình" value="240" icon={<BrainCircuit size={14} />} />
                                <FeedbackMetric label="Uptime AI" value="99.9%" icon={<Activity size={14} />} />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
                                <Lightbulb size={24} />
                            </div>
                            <h4 className="text-xl font-black mb-2">Trạng thái LinkUp AI</h4>
                            <p className="text-indigo-100 font-medium text-sm leading-relaxed">
                                AI hiện đang chạy ở chế độ tối ưu hóa hiệu năng. Bạn có thể giới hạn tốc độ phản hồi 
                                cho những người dùng spam hoặc tắt AI hoàn toàn nếu phát hiện sự cố hệ thống.
                            </p>
                        </div>
                        <div className="flex gap-4 mt-6 relative z-10">
                            <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase text-indigo-200">Model Active</p>
                                <p className="text-sm font-bold">Gemini 2.0 Flash</p>
                            </div>
                            <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-black uppercase text-indigo-200">Session Mode</p>
                                <p className="text-sm font-bold">Standard</p>
                            </div>
                        </div>
                        <Sparkles className="absolute -right-8 -bottom-8 w-64 h-64 text-white/5 rotate-12" />
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Wand2 size={24} />
                            </div>
                            <h4 className="font-extrabold text-slate-800">Cấu hình Giới hạn</h4>
                        </div>
                        
                        <div className="space-y-6">
                            <ConfigSlider 
                                label="Giới hạn AI / người dùng / ngày"
                                value={config.ai_limit_per_user || 50}
                                min={5}
                                max={500}
                                step={5}
                                onChange={(val: number) => onConfigChange({...config, ai_limit_per_user: val})}
                                unit="Lượt"
                            />

                            <ConfigSlider 
                                label="Giới hạn AI / phòng nhóm / ngày"
                                value={config.ai_limit_per_group || 200}
                                min={10}
                                max={1000}
                                step={10}
                                onChange={(val: number) => onConfigChange({...config, ai_limit_per_group: val})}
                                unit="Lượt"
                            />

                            <div className="pt-4 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-700">Chế độ Giám sát</p>
                                        <p className="text-xs text-slate-500 font-medium">Ghi lại nhật ký chi tiết tất cả các cuộc hội thoại với AI</p>
                                    </div>
                                    <Switch active={true} onToggle={() => {}} />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-700">Tự động báo cáo</p>
                                        <p className="text-xs text-slate-500 font-medium">Thông báo cho admin khi AI phát hiện spam hoặc quấy rối</p>
                                    </div>
                                    <Switch active={true} onToggle={() => {}} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                            <ShieldCheck size={20} className="text-emerald-500" />
                            An toàn Hệ thống
                        </h4>
                        <p className="text-sm text-slate-500 font-medium">
                            Các quy tắc an toàn mặc định được Gemini áp dụng. Bạn có thể điều chỉnh mức độ lọc nội dung tại đây.
                        </p>
                        <div className="space-y-3 pt-2">
                            {['Bạo lực', 'Ngôn từ thù ghét', 'Nội dung người lớn', 'Quấy rối'].map((item) => (
                                <div key={item} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                                    <span className="text-sm font-bold text-slate-700">{item}</span>
                                    <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg uppercase">Mức độ Cao</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-semibold leading-relaxed">
                            Mọi thay đổi cấu hình sẽ có hiệu lực ngay lập tức cho tất cả người dùng cuối mà không cần khởi động lại.
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'restrictions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Restricted Users */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-slate-100">
                            <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                                <UserMinus size={20} className="text-rose-500" />
                                Người dùng bị hạn chế AI
                            </h4>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text"
                                    placeholder="Tìm ID người dùng..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-medium border border-transparent focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {restrictedUsers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
                                    <Bot size={48} className="stroke-1" />
                                    <p className="font-bold text-sm">Chưa có ai bị chặn</p>
                                </div>
                            ) : (
                                restrictedUsers
                                    .filter(id => id.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(userId => (
                                        <div key={userId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group animate-in slide-in-from-left-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-bold">
                                                    {userId.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">User ID: {userId}</p>
                                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">AI Disabled for this user</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onToggleUserRestriction(userId)}
                                                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="Bỏ chặn AI"
                                            >
                                                <ShieldCheck size={20} />
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Restricted Rooms */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-slate-100">
                            <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                                <ShieldAlert size={20} className="text-orange-500" />
                                Nhóm bị hạn chế AI
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mb-4">Những nhóm này sẽ không thể gọi bot LinkUp.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {restrictedRooms.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
                                    <Activity size={48} className="stroke-1" />
                                    <p className="font-bold text-sm">Tất cả các nhóm đều được dùng AI</p>
                                </div>
                            ) : (
                                restrictedRooms.map(roomId => (
                                    <div key={roomId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-bold">
                                                G
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">Room ID: {roomId}</p>
                                                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-tight">AI Blocked in Room</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onToggleRoomRestriction(roomId)}
                                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                        >
                                            <ShieldCheck size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Components
const StatCard = ({ icon, label, value, subValue, bg, percentage, isError = false }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:scale-[1.02] transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${bg} rounded-2xl group-hover:rotate-12 transition-transform`}>
                {icon}
            </div>
            {percentage !== undefined && (
                <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${isError ? (percentage > 5 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600') : 'bg-indigo-100 text-indigo-600'}`}>
                    {isError ? (percentage > 5 ? 'Nguy cấp' : 'Ổn định') : 'Tốt'}
                </div>
            )}
        </div>
        <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tighter">{subValue}</span>
        </div>
    </div>
);

const FeedbackMetric = ({ label, value, icon }: any) => (
    <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
        </div>
        <span className="text-sm font-black text-slate-700">{value}</span>
    </div>
);

const ConfigSlider = ({ label, value, min, max, step, onChange, unit }: any) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-700">{label}</label>
            <span className="text-sm font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg">{value} {unit}</span>
        </div>
        <input 
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <span>Minimum</span>
            <span>Recommended</span>
            <span>Maximum</span>
        </div>
    </div>
);

const Switch = ({ active, onToggle }: any) => (
    <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);
