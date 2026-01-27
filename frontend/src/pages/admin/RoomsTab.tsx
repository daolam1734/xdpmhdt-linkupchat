import React from 'react';
import { 
    Users, Search, Trash2, 
    Hash, Lock, Unlock, Globe, MessageSquare, 
    ShieldAlert, RefreshCw, Archive, CheckCircle2,
    AlertCircle, FileText
} from 'lucide-react';
import type { RoomsTabProps } from './types';

export const RoomsTab: React.FC<RoomsTabProps> = ({
    rooms, searchTerm, onSearchChange, onRefresh, onToggleLock, onDelete, onCleanup
}) => {
    const [roomFilter, setRoomFilter] = React.useState<'all' | 'public' | 'private' | 'locked' | 'empty'>('all');

    // Calculate quick stats
    const stats = {
        total: rooms.length,
        public: rooms.filter(r => !r.is_private).length,
        private: rooms.filter(r => r.is_private).length,
        locked: rooms.filter(r => r.is_locked).length,
        empty: rooms.filter(r => r.member_count === 0).length
    };

    const filteredRooms = rooms.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.id.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
        
        switch (roomFilter) {
            case 'public': return !r.is_private;
            case 'private': return r.is_private;
            case 'locked': return r.is_locked;
            case 'empty': return r.member_count === 0;
            default: return true;
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                    { label: 'Tổng số nhóm', value: stats.total, icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Công khai', value: stats.public, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Riêng tư', value: stats.private, icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Đang khóa', value: stats.locked, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Nhóm trống', value: stats.empty, icon: Archive, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
                            <s.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-xl font-black text-slate-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold text-slate-900">Danh sách Conversations</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">{filteredRooms.length}</span>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={onRefresh}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all hover:border-indigo-100 hover:shadow-sm"
                        title="Làm mới"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button 
                        onClick={onCleanup}
                        className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all text-sm font-bold border border-rose-100 shadow-sm"
                    >
                        <Archive size={16} />
                        <span>Dọn dẹp nhóm trống</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                        {(['all', 'public', 'private', 'locked', 'empty'] as const).map((f) => (
                            <button 
                                key={f}
                                onClick={() => setRoomFilter(f)}
                                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                                    roomFilter === f 
                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {f === 'all' ? 'Tất cả' : 
                                 f === 'public' ? 'Công khai' : 
                                 f === 'private' ? 'Riêng tư' : 
                                 f === 'locked' ? 'Đã khóa' : 'Nhóm trống'}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 md:max-w-md">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên hoặc ID nhóm..." 
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-[0.15em]">
                                <th className="px-8 py-4 border-b border-slate-100">Thông tin nhóm</th>
                                <th className="px-8 py-4 border-b border-slate-100">Phân loại</th>
                                <th className="px-8 py-4 border-b border-slate-100 text-center">Thành viên</th>
                                <th className="px-8 py-4 border-b border-slate-100 text-center">Tin nhắn</th>
                                <th className="px-8 py-4 border-b border-slate-100">Trạng thái</th>
                                <th className="px-8 py-4 border-b border-slate-100 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRooms.length > 0 ? (
                                filteredRooms.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                                    r.is_locked 
                                                    ? 'bg-rose-50 text-rose-500' 
                                                    : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                }`}>
                                                    {r.is_private ? <Lock size={20} /> : <Hash size={20} />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 block truncate max-w-[200px]">{r.name}</span>
                                                    <div className="flex items-center space-x-2 mt-0.5">
                                                        <span className="text-[10px] text-slate-400 font-mono">ID: {r.id.slice(0, 8)}...</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <span className="text-[10px] text-slate-400">Tạo bởi: {r.created_by}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col space-y-1">
                                                <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                    r.is_private 
                                                    ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                }`}>
                                                    {r.is_private ? 'Riêng tư' : 'Công khai'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 italic">
                                                    {r.type === 'direct' ? 'Chat 1-1' : 'Nhóm chat'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="inline-flex items-center space-x-1 justify-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="font-bold text-slate-700 text-sm">{r.member_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="inline-flex items-center space-x-1 justify-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                <MessageSquare size={14} className="text-slate-400" />
                                                <span className="font-bold text-slate-700 text-sm">{r.message_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {r.is_locked ? (
                                                <div className="flex items-center space-x-1.5 text-rose-600">
                                                    <AlertCircle size={14} />
                                                    <span className="text-xs font-bold uppercase tracking-wide">Vi phạm / Bị khóa</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-1.5 text-emerald-600">
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-xs font-bold uppercase tracking-wide">Hoạt động</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => {/* Link to content ONLY if report is mentioned or just show warning */}}
                                                    title="Chỉ xem nội dung khi có Report"
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 group/btn"
                                                >
                                                    <FileText size={18} className="transition-transform group-hover/btn:scale-110" />
                                                </button>
                                                <button 
                                                    onClick={() => onToggleLock(r.id)}
                                                    title={r.is_locked ? "Mở khóa nhóm" : "Khóa nhóm vi phạm"}
                                                    className={`p-2 rounded-xl transition-all border border-transparent ${
                                                        r.is_locked 
                                                        ? 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100' 
                                                        : 'text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                                                    } group/btn`}
                                                >
                                                    {r.is_locked ? (
                                                        <Unlock size={18} className="transition-transform group-hover/btn:scale-110" />
                                                    ) : (
                                                        <ShieldAlert size={18} className="transition-transform group-hover/btn:scale-110" />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(r.id)}
                                                    title="Xóa nhóm"
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 group/btn"
                                                >
                                                    <Trash2 size={18} className="transition-transform group-hover/btn:scale-110" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                                                <MessageSquare size={32} />
                                            </div>
                                            <p className="text-slate-400 font-medium">Không tìm thấy cuộc hội thoại nào</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span>Quản lý ở mức Metadata - Đảm bảo quyền riêng tư người dùng</span>
                    </span>
                    <p className="text-[10px] text-slate-400 italic">
                        * Chỉ xem nội dung tin nhắn khi có báo cáo vi phạm chính thức.
                    </p>
                </div>
            </div>
        </div>
    );
};
