import React from 'react';
import { 
    Users, Search, Trash2, 
    Hash, Lock, Globe, MessageSquare, 
    Clock, Archive, ShieldCheck, RefreshCw
} from 'lucide-react';
import type { RoomsTabProps } from './types';

export const RoomsTab: React.FC<RoomsTabProps> = ({
    rooms, searchTerm, onSearchChange, onRefresh, onToggleLock, onDelete, onCleanup
}) => {
    const [roomFilter, setRoomFilter] = React.useState<'all' | 'public' | 'private' | 'empty'>('all');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Quản lý Phòng chat & Hội thoại</h3>
                <div className="flex space-x-3">
                    <button 
                        onClick={onRefresh}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Làm mới"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={onCleanup}
                        className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all text-sm font-bold border border-rose-100"
                    >
                        <Archive size={16} />
                        <span>Dọn dẹp phòng trống</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
                        {(['all', 'public', 'private', 'empty'] as const).map((f) => (
                            <button 
                                key={f}
                                onClick={() => setRoomFilter(f)}
                                className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${roomFilter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                {f === 'all' ? 'Tất cả' : f === 'public' ? 'Công khai' : f === 'private' ? 'Riêng tư' : 'Phòng trống'}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 md:max-w-md">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên phòng..." 
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 uppercase text-[11px] font-bold tracking-[0.1em]">
                                <th className="px-8 py-4 border-b border-slate-100">Thông tin phòng</th>
                                <th className="px-8 py-4 border-b border-slate-100">Chế độ</th>
                                <th className="px-8 py-4 border-b border-slate-100">Thành viên</th>
                                <th className="px-8 py-4 border-b border-slate-100">Hoạt động</th>
                                <th className="px-8 py-4 border-b border-slate-100 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rooms
                                .filter(r => {
                                    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
                                    if (roomFilter === 'public') return matchesSearch && !r.is_private;
                                    if (roomFilter === 'private') return matchesSearch && r.is_private;
                                    if (roomFilter === 'empty') return matchesSearch && r.member_count === 0;
                                    return matchesSearch;
                                })
                                .map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                                <Hash size={24} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 block">{r.name}</span>
                                                <span className="text-[11px] text-slate-400 font-medium">#{r.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
                                            r.is_private 
                                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                            {r.is_private ? <Lock size={12} /> : <Globe size={12} />}
                                            <span>{r.is_private ? 'RIÊNG TƯ' : 'CÔNG KHAI'}</span>
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-slate-600 font-bold flex flex-col space-y-1">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Users size={16} className="text-slate-400" />
                                            <span>{r.member_count}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1">
                                            <span>Tạo lúc:</span>
                                            <span className="text-indigo-500 font-bold">{new Date(r.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col space-y-2">
                                            <div className="flex items-center space-x-2 text-orange-600 font-bold text-[11px]">
                                                <MessageSquare size={14} />
                                                <span>{r.message_count || 0} TIN NHẮN</span>
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-orange-400 rounded-full" 
                                                    style={{ width: `${Math.min(100, (r.message_count || 0) / 10)}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => onToggleLock(r.id)}
                                                className={`p-2.5 rounded-xl transition-all ${r.is_locked ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                                                title={r.is_locked ? "Mở khóa phòng" : "Khóa phòng"}
                                            >
                                                {r.is_locked ? <ShieldCheck size={18} /> : <Lock size={18} />}
                                            </button>
                                            <button 
                                                onClick={() => onDelete(r.id)}
                                                className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Xóa phòng"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rooms.length === 0 && (
                        <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                            <div className="p-6 bg-slate-50 rounded-full text-slate-200">
                                <MessageSquare size={32} />
                            </div>
                            <div className="max-w-xs mx-auto text-slate-500">
                                <p className="font-bold text-slate-900 text-lg">Hệ thống chưa có phòng chat</p>
                                <p className="text-sm mt-1">Các kênh cộng đồng và hội thoại riêng tư sẽ được liệt kê tại đây.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">Bảo trì Tin nhắn định kỳ</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">Tự động xóa tin nhắn trong các phòng công khai cũ hơn 30 ngày để tối ưu hóa bộ nhớ và hiệu năng truy vấn database.</p>
                        <div className="mt-4 flex items-center space-x-4">
                            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">
                                LẦN CUỐI: 2 GIỜ TRƯỚC
                            </div>
                            <button className="text-indigo-600 font-bold text-sm hover:underline">Cấu hình tự động →</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Archive size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">Lưu trữ Dữ liệu (Archiving)</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">Đóng băng các hội thoại không hoạt động trên 6 tháng. Dữ liệu vẫn được giữ lại nhưng không thể chat trực tiếp trừ khi được khôi phục.</p>
                        <div className="mt-4">
                            <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all">CHẠY NGAY BÂY GIỜ</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
