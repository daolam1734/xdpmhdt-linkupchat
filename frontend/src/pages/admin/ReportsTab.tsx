import React, { useState } from 'react';
import { 
    ShieldAlert, AlertTriangle, CheckCircle, 
    XCircle, Clock, User, 
    Flag, ShieldCheck, 
    Ban, VolumeX, RefreshCw,
    Search, Eye, Trash2
} from 'lucide-react';
import type { ReportsTabProps, Report } from './types';

export const ReportsTab: React.FC<ReportsTabProps> = ({ 
    stats, reports, onRefresh, onAction 
}) => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const filteredReports = reports.filter(r => {
        const matchesStatus = filter === 'all' || r.status === filter;
        const s = searchTerm.toLowerCase();
        const matchesSearch = 
            (r.reported_name || '').toLowerCase().includes(s) ||
            (r.reporter_name || '').toLowerCase().includes(s) ||
            (r.type || '').toLowerCase().includes(s) ||
            (r.message_snippet || '').toLowerCase().includes(s);
        return matchesStatus && matchesSearch;
    });

    const getReportTypeLabel = (type: string) => {
        switch (type) {
            case 'spam': return { label: 'Spam / Rác', color: 'text-amber-600 bg-amber-50 border-amber-100' };
            case 'harassment': return { label: 'Quấy rối', color: 'text-rose-600 bg-rose-50 border-rose-100' };
            case 'inappropriate': return { label: 'Nội dung không phù hợp', color: 'text-purple-600 bg-purple-50 border-purple-100' };
            default: return { label: 'Vi phạm khác', color: 'text-slate-600 bg-slate-50 border-slate-100' };
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-bold uppercase tracking-wider">
                    <Clock size={12} />
                    <span>Chờ xử lý</span>
                </span>
            );
            case 'resolved': return (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle size={12} />
                    <span>Đã giải quyết</span>
                </span>
            );
            default: return (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                    <XCircle size={12} />
                    <span>Đã đóng</span>
                </span>
            );
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Flag size={20} />
                        </div>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase">Pending</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Báo cáo mới</p>
                    <div className="text-2xl font-black text-slate-900 mt-1">{stats.unhandled_reports}</div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <ShieldAlert size={20} />
                        </div>
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase">Critical</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Vi phạm nghiêm trọng</p>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                        {reports.filter(r => r.type === 'harassment' && r.status === 'pending').length}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 flex items-center justify-between">
                    <div className="space-y-1">
                        <h4 className="font-bold text-slate-800">Cam kết bảo vệ cộng đồng</h4>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                            Admin chỉ được quyền xem đoạn nội dung bị báo cáo để làm bằng chứng. Quyền riêng tư của người dùng luôn được ưu tiên.
                        </p>
                    </div>
                    <ShieldCheck size={48} className="text-indigo-100" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h3 className="text-xl font-bold text-slate-900">Trung tâm Kiểm duyệt</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['pending', 'resolved', 'all'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    filter === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {t === 'pending' ? 'Chưa xử lý' : t === 'resolved' ? 'Đã xử lý' : 'Tất cả'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Tìm kiếm report..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-50 outline-none"
                        />
                    </div>
                    <button 
                        onClick={onRefresh}
                        className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reports List */}
                <div className="lg:col-span-2 space-y-4">
                    {filteredReports.length > 0 ? (
                        filteredReports.map(report => {
                            const typeData = getReportTypeLabel(report.type);
                            const isSelected = selectedReport?.id === report.id || selectedReport?._id === report._id;

                            return (
                                <div 
                                    key={report.id || report._id}
                                    onClick={() => setSelectedReport(report)}
                                    className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer group ${
                                        isSelected ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-slate-900">Bị báo cáo: {report.reported_name}</span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${typeData.color}`}>
                                                        {typeData.label}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Bởi {report.reporter_name} • {new Date(report.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        {getStatusBadge(report.status)}
                                    </div>

                                    {report.message_snippet && (
                                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-200"></div>
                                            <p className="text-sm text-slate-600 italic line-clamp-2">
                                                "{report.message_snippet}"
                                            </p>
                                        </div>
                                    )}

                                    {report.status === 'pending' && (
                                        <div className="mt-4 flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onAction(report.id || report._id!, 'dismiss'); }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                                            >
                                                Bỏ qua
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                                                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-sm hover:bg-indigo-700 transition-all"
                                            >
                                                Xem & Xử lý
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h4 className="font-bold text-slate-800">Tuyệt vời!</h4>
                            <p className="text-sm text-slate-500 mt-1">Không có báo cáo vi phạm nào cần xử lý.</p>
                        </div>
                    )}
                </div>

                {/* Inspector Panel */}
                <div className="lg:col-span-1">
                    {selectedReport ? (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
                            <div className="p-6 bg-slate-900 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold flex items-center space-x-2">
                                        <AlertTriangle size={18} className="text-amber-400" />
                                        <span>Chi tiết báo cáo</span>
                                    </h4>
                                    <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white">
                                        <XCircle size={20} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">ID Báo cáo:</span>
                                        <span className="font-mono">{(selectedReport.id || selectedReport._id!).slice(-8)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Hình thức:</span>
                                        <span className="text-amber-400 font-bold">{getReportTypeLabel(selectedReport.type).label}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Nội dung vi phạm (Chat Snippet)</label>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium">
                                        {selectedReport.message_snippet || "Cần kiểm tra log chi tiết..."}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">* Đây là nơi duy nhất admin được xem nội dung chat để kiểm duyệt.</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Báo cáo bổ sung</label>
                                    <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                                        {selectedReport.content || "Người báo cáo không để lại ghi chú."}
                                    </p>
                                </div>

                                {selectedReport.status === 'pending' ? (
                                    <div className="grid grid-cols-2 gap-3 pt-4">
                                        <button 
                                            onClick={() => onAction(selectedReport.id || selectedReport._id!, 'warn')}
                                            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all font-bold text-xs"
                                        >
                                            <AlertTriangle size={16} />
                                            <span>Cảnh cáo</span>
                                        </button>
                                        <button 
                                            onClick={() => onAction(selectedReport.id || selectedReport._id!, 'mute')}
                                            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 transition-all font-bold text-xs"
                                        >
                                            <VolumeX size={16} />
                                            <span>Mute User</span>
                                        </button>
                                        <button 
                                            onClick={() => onAction(selectedReport.id || selectedReport._id!, 'kick')}
                                            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all font-bold text-xs"
                                        >
                                            <Trash2 size={16} />
                                            <span>Kick Out</span>
                                        </button>
                                        <button 
                                            onClick={() => onAction(selectedReport.id || selectedReport._id!, 'ban')}
                                            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-slate-900 text-white hover:bg-black transition-all font-bold text-xs shadow-lg shadow-slate-200"
                                        >
                                            <Ban size={16} />
                                            <span>Ban Vĩnh viễn</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center space-y-2">
                                        <CheckCircle className="text-emerald-500" size={24} />
                                        <p className="text-emerald-700 font-bold text-sm">Đã xử lý: {selectedReport.action_taken?.toUpperCase()}</p>
                                        <p className="text-[10px] text-emerald-600">Bởi Admin vào {selectedReport.timestamp}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
                            <Eye size={48} className="text-slate-200 mb-4" />
                            <h4 className="font-bold text-slate-400">Trình kiểm duyệt</h4>
                            <p className="text-xs text-slate-400 mt-2">Chọn một báo cáo từ danh sách bên trái để xem chi tiết bằng chứng và thực hiện hành động kỷ luật.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
