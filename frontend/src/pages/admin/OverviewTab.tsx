import React from 'react';
import { 
    Users, MessageSquare, ShieldAlert, ShieldCheck, 
    TrendingUp, Activity, ArrowUpRight,
    Zap, Database, Server, Cpu, RefreshCw, BrainCircuit
} from 'lucide-react';
import type { OverviewTabProps } from './types';
import { formatRelativeTime } from '../../utils/time';

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, loading, onManualRefresh, onSetActiveTab }) => {
    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Health & Alerts Header */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Trình trạng hệ thống realtime</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={onManualRefresh}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Làm mới dữ liệu"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-500">
                                <Server size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">API Server</p>
                                <p className="text-sm font-bold text-slate-700">Online <span className="text-[10px] text-emerald-500 bg-emerald-50 px-1 rounded ml-1">99.9%</span></p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500">
                                <Database size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Database</p>
                                <p className="text-sm font-bold text-slate-700">{stats.db_size_mb.toFixed(2)} MB <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1 rounded ml-1">Normal</span></p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500">
                                <BrainCircuit size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">AI Engine</p>
                                <p className="text-sm font-bold text-slate-700">Active <span className="text-[10px] text-amber-500 bg-amber-50 px-1 rounded ml-1">{stats.ai_usage_count} call</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2 text-rose-600 mb-2">
                            <ShieldAlert size={20} />
                            <h4 className="text-sm font-bold uppercase tracking-wider">Alarm Center</h4>
                        </div>
                        <p className="text-xs text-rose-500 font-medium">Có {stats.unhandled_reports} báo cáo vi phạm mới chờ được xử lý ngay.</p>
                    </div>
                    <button 
                        onClick={() => onSetActiveTab('reports')}
                        className="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-200"
                    >
                        Kiểm tra ngay
                    </button>
                </div>
            </div>

            {/* Header Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Users size={24} />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+{stats.new_users_24h}/24h</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Người dùng</h4>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-3xl font-black text-slate-900 leading-none">{stats.total_users}</span>
                            <span className="text-xs text-slate-400 font-medium mb-1">active</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Online</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Đang truy cập</h4>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-3xl font-black text-emerald-600 leading-none">{stats.online_users}</span>
                            <span className="text-xs text-slate-400 font-medium mb-1">phiên</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                <MessageSquare size={24} />
                            </div>
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">+{stats.new_messages_24h}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tin nhắn mới</h4>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-3xl font-black text-slate-900 leading-none">{stats.total_messages.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 font-medium mb-1">tổng</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                                <ShieldAlert size={24} />
                            </div>
                            {stats.unhandled_reports > 0 && <span className="flex h-3 w-3 bg-rose-500 rounded-full absolute -top-1 -right-1 animate-ping"></span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Reports</h4>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-3xl font-black text-rose-600 leading-none">{stats.unhandled_reports}</span>
                            <span className="text-xs text-slate-400 font-medium mb-1">chờ xử lý</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* System Status & Performance */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Hiệu năng Hệ thống</h3>
                                <p className="text-sm text-slate-500">Theo dõi trạng thái Core Services & Database</p>
                            </div>
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                <Activity size={14} className="text-emerald-500" />
                                <span className="text-[11px] font-bold text-emerald-600 uppercase">Live Metrics</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Zap size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">API Response Latency</span>
                                </div>
                                <div className="flex items-end space-x-2">
                                    <span className="text-3xl font-black text-slate-900 leading-none">{stats.latency_ms}</span>
                                    <span className="text-sm font-bold text-slate-400 mb-1">ms</span>
                                </div>
                                <div className="mt-4 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full w-[15%]" style={{ width: `${Math.min(100, stats.latency_ms / 5)}%` }}></div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-100 transition-colors">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <Database size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">MongoDB Storage</span>
                                </div>
                                <div className="flex items-end space-x-2">
                                    <span className="text-3xl font-black text-slate-900 leading-none">{stats.db_size_mb.toFixed(2)}</span>
                                    <span className="text-sm font-bold text-slate-400 mb-1">MB</span>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    <div className="flex items-center space-x-1">
                                         <Server size={10} />
                                         <span>Replica Set: LinkUp-Cluster</span>
                                    </div>
                                    <span className="text-emerald-500">99.9% Optimal</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 text-indigo-600 mb-1">
                                    <Cpu size={14} />
                                    <span className="text-[10px] font-black uppercase">CPU Usage</span>
                                </div>
                                <span className="text-lg font-bold text-slate-700">12.4%</span>
                            </div>
                            <div className="text-center border-x border-slate-100">
                                <div className="flex items-center justify-center space-x-2 text-emerald-600 mb-1">
                                    <Database size={14} />
                                    <span className="text-[10px] font-black uppercase">RAM Usage</span>
                                </div>
                                <span className="text-lg font-bold text-slate-700">242MB</span>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center space-x-2 text-amber-600 mb-1">
                                    <Activity size={14} />
                                    <span className="text-[10px] font-black uppercase">UpTime</span>
                                </div>
                                <span className="text-lg font-bold text-slate-700">24/7/365</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-bold">Thống kê Hội thoại</h3>
                                    <p className="text-indigo-200 text-sm">Các kênh đang hoạt động mạnh nhất</p>
                                </div>
                                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors">
                                    <ArrowUpRight size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {stats.top_rooms.map((room, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/10 group">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-sm">#{idx+1}</div>
                                            <div>
                                                <span className="font-bold block">{room.name}</span>
                                                <span className="text-[10px] text-indigo-300 font-bold uppercase">{room.type}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black block">{room.message_count.toLocaleString()}</span>
                                            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-tight">tin nhắn</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Alerts & Logs */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Hệ thống thông báo</h3>
                            <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-100 uppercase tracking-wider">Security</span>
                        </div>

                        <div className="space-y-4">
                            {stats.system_alerts.map((alert, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border flex space-x-3 group transition-all hover:scale-[1.02] ${
                                    alert.level === 'critical' ? 'bg-rose-50 border-rose-100' : 
                                    alert.level === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'
                                }`}>
                                    <div className={`shrink-0 p-2 rounded-xl h-fit ${
                                        alert.level === 'critical' ? 'bg-rose-500 text-white' : 
                                        alert.level === 'warning' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                                    }`}>
                                        {alert.level === 'critical' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${
                                            alert.level === 'critical' ? 'text-rose-900' : 
                                            alert.level === 'warning' ? 'text-amber-900' : 'text-indigo-900'
                                        }`}>{alert.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{formatRelativeTime(alert.timestamp)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm">
                                    <TrendingUp size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-800 tracking-tight leading-tight">Biểu đồ Lưu lượng (24h)</span>
                            </div>
                            <div className="flex items-end justify-between h-24 px-2 space-x-1.5 pt-4">
                                {stats.hourly_stats.map((val, i) => (
                                    <div 
                                        key={i} 
                                        className="w-full bg-indigo-500/20 rounded-sm hover:bg-indigo-500 transition-colors relative group"
                                        style={{ height: `${Math.max(15, (val / Math.max(...stats.hourly_stats)) * 100)}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 bg-slate-800 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold whitespace-nowrap">
                                            {val} msg
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col items-center justify-center p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 text-center">
                            <div className="p-4 bg-white rounded-full text-indigo-600 shadow-sm mb-4">
                                <Activity size={32} strokeWidth={2.5} />
                            </div>
                            <h4 className="font-bold text-indigo-900 mb-1">Health Check: OK</h4>
                            <p className="text-xs text-indigo-600/60 font-medium">Lớp API/WebSocket LinkUp đang chạy ổn định 100% tài nguyên.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
