import React from 'react';
import { 
    Users, MessageSquare, ShieldAlert, AlertTriangle, 
    Activity, Database, Server, RefreshCw, BrainCircuit,
    Shield, CheckCircle2, ChevronRight
} from 'lucide-react';
import type { OverviewTabProps } from './types';
import { formatRelativeTime } from '../../utils/time';

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, loading, onManualRefresh, onSetActiveTab }) => {
    if (!stats) return null;

    const criticalAlerts = stats.system_alerts.filter(a => a.level === 'critical');
    const isSystemHealthy = criticalAlerts.length === 0 && stats.unhandled_reports === 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 1. Header Section: System Health */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl ${isSystemHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isSystemHealthy ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
                        <span className={`absolute -top-1 -right-1 flex h-4 w-4 bg-${isSystemHealthy ? 'emerald' : 'rose'}-500 rounded-full border-4 border-white animate-pulse`}></span>
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                {isSystemHealthy ? 'Hệ thống hoạt động tốt' : 'Cần kiểm tra hệ thống'}
                            </h2>
                        </div>
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            <Activity size={12} className="text-indigo-500" />
                            <span>Realtime Status</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>Last update: {new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button 
                        onClick={onManualRefresh}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all font-bold text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span>Làm mới</span>
                    </button>
                    <button 
                        onClick={() => onSetActiveTab('settings')}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100 transition-all font-bold text-sm"
                    >
                        Cấu hình hệ thống
                    </button>
                </div>
            </div>

            {/* 2. Core Metrics (4 Big Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="p-3 bg-indigo-50 text-indigo-600 w-fit rounded-2xl mb-4">
                            <Users size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng người dùng</p>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-4xl font-black text-slate-900 leading-none">{stats.total_users.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">+{stats.new_users_24h}h</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-500 text-white rounded-full animate-pulse">
                                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                <span className="text-[9px] font-black uppercase tracking-tighter">Live</span>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Online Realtime</p>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-4xl font-black text-emerald-600 leading-none">{stats.online_users}</span>
                            <span className="text-xs text-slate-400 font-bold mb-1">người dùng</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="p-3 bg-amber-50 text-amber-600 w-fit rounded-2xl mb-4">
                            <MessageSquare size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phòng / Hội thoại</p>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-4xl font-black text-slate-900 leading-none">{stats.total_rooms}</span>
                            <span className="text-xs text-slate-400 font-bold mb-1">active</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="relative">
                        <div className="p-3 bg-violet-50 text-violet-600 w-fit rounded-2xl mb-4">
                            <BrainCircuit size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Usage Today</p>
                        <div className="flex items-end space-x-2 mt-1">
                            <span className="text-4xl font-black text-slate-900 leading-none">{stats.ai_usage_count}</span>
                            <span className="text-xs text-slate-400 font-bold mb-1">requests</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Alert Center & 4. Specific Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Alert Center (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    {stats.unhandled_reports > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-rose-900 leading-tight">Báo cáo vi phạm chưa xử lý!</h4>
                                    <p className="text-sm text-rose-600/80 font-medium">Phát hiện {stats.unhandled_reports} khiếu nại/báo cáo từ người dùng cần kiểm duyệt ngay.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onSetActiveTab('reports')}
                                className="flex items-center space-x-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                            >
                                <span>Xử lý ngay</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Alert Center</h3>
                                <p className="text-sm text-slate-500 font-medium">Nhật ký cảnh báo và sự cố hệ thống</p>
                            </div>
                            <div className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Realtime Logs</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {stats.system_alerts.length > 0 ? (
                                stats.system_alerts.map((alert, idx) => {
                                    const isCritical = alert.level === 'critical';
                                    const isWarning = alert.level === 'warning';
                                    const isInfo = alert.level === 'info';
                                    
                                    let Icon = Server;
                                    if (alert.type === 'ai') Icon = BrainCircuit;
                                    if (alert.type === 'security') Icon = Shield;
                                    if (isCritical) Icon = AlertTriangle;

                                    return (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all flex items-start space-x-4 ${
                                            isCritical ? 'bg-rose-50 border-rose-100' : 
                                            isWarning ? 'bg-amber-50 border-amber-100' : 
                                            isInfo ? 'bg-emerald-50 border-emerald-100' :
                                            'bg-slate-50 border-slate-100'
                                        }`}>
                                            <div className={`p-2.5 rounded-xl shrink-0 ${
                                                isCritical ? 'bg-rose-500 text-white' : 
                                                isWarning ? 'bg-amber-500 text-white' : 
                                                isInfo ? 'bg-emerald-500 text-white' :
                                                'bg-indigo-500 text-white'
                                            }`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                        isCritical ? 'text-rose-500' : 
                                                        isWarning ? 'text-amber-500' : 
                                                        isInfo ? 'text-emerald-500' :
                                                        'text-indigo-500'
                                                    }`}>
                                                        {alert.type || 'System'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{formatRelativeTime(alert.timestamp)}</span>
                                                </div>
                                                <p className={`text-sm font-bold leading-tight ${
                                                    isCritical ? 'text-rose-900' : 
                                                    isWarning ? 'text-amber-900' : 
                                                    isInfo ? 'text-emerald-900' :
                                                    'text-slate-800'
                                                }`}>
                                                    {alert.message}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                    <CheckCircle2 size={48} strokeWidth={1} />
                                    <p className="mt-4 font-bold text-sm">Không có cảnh báo nào</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Specific Metrics (1/3 width) */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16"></div>
                        <h3 className="text-lg font-black mb-6 relative z-10">Infrastructure</h3>
                        
                        <div className="space-y-6 relative z-10">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2 text-indigo-300">
                                        <Database size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Database Size</span>
                                    </div>
                                    <span className="text-xl font-black">{stats.db_size_mb.toFixed(1)} MB</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full w-[45%]" style={{ width: `${Math.min(100, (stats.db_size_mb / 500) * 100)}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2 text-emerald-300">
                                        <Activity size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">API Latency</span>
                                    </div>
                                    <span className={`text-xl font-black ${stats.latency_ms > 200 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {stats.latency_ms} ms
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${stats.latency_ms > 200 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (stats.latency_ms / 500) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/10">
                            <div className="flex items-center justify-between text-white/40 text-[10px] font-black uppercase tracking-tighter">
                                <span>Platform Health</span>
                                <span className="text-emerald-400">Stable</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center justify-center flex-col text-center">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                            <Server size={32} />
                        </div>
                        <h4 className="font-black text-slate-800 tracking-tight">System Monitor</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1 px-4">Giám sát tài nguyên và phản hồi của LinkUp Server realtime.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

