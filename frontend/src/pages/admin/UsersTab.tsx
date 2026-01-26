import React from 'react';
import { 
    Users, Search, Download, ShieldCheck, RefreshCw, 
    Trash2
} from 'lucide-react';
import type { UsersTabProps } from './types';
import { Avatar } from '../../components/common/Avatar';

export const UsersTab: React.FC<UsersTabProps> = ({
    users, filter, onFilterChange, searchTerm, onSearchChange,
    onRefresh, onAddUser, onEditUser, onToggleRole, onDeleteUser, onExportCSV
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Quản lý Tài khoản</h3>
                <div className="flex space-x-3">
                    <button 
                        onClick={onExportCSV}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all text-sm font-bold border border-emerald-200"
                    >
                        <Download size={16} />
                        <span>Xuất CSV</span>
                    </button>
                    <button 
                        onClick={onRefresh}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Làm mới"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={onAddUser}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all text-sm font-bold border border-indigo-200"
                    >
                        <Users size={16} />
                        <span>Thêm nhân sự</span>
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        {(['all', 'admin', 'user', 'inactive'] as const).map((f) => (
                            <button 
                                key={f}
                                onClick={() => onFilterChange(f)}
                                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                {f === 'all' ? 'Tất cả' : f === 'admin' ? 'Admin' : f === 'user' ? 'Thành viên' : 'Đã chặn'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm theo tên hoặc ID..." 
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 uppercase text-[11px] font-bold tracking-[0.1em]">
                                <th className="px-8 py-4 border-b border-slate-100">Thông tin người dùng</th>
                                <th className="px-8 py-4 border-b border-slate-100">Vai trò / Quyền</th>
                                <th className="px-8 py-4 border-b border-slate-100">Trạng thái tài khoản</th>
                                <th className="px-8 py-4 border-b border-slate-100">Ngày đăng ký</th>
                                <th className="px-8 py-4 border-b border-slate-100 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users
                                .filter(u => {
                                    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm);
                                    if (filter === 'admin') return matchesSearch && u.is_superuser;
                                    if (filter === 'user') return matchesSearch && !u.is_superuser;
                                    if (filter === 'inactive') return matchesSearch && u.is_active === false;
                                    return matchesSearch;
                                })
                                .map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative cursor-pointer">
                                                <Avatar name={u.username} size="lg" />
                                                {u.is_online && (
                                                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">{u.username}</span>
                                                <span className="text-[11px] text-slate-400 font-mono flex flex-col mt-0.5">
                                                    <span className="text-indigo-400 font-bold">{u.id}</span>
                                                    {u.is_online && <span className="text-[10px] text-emerald-500 font-bold mt-1">• Đang trực tuyến</span>}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col space-y-2">
                                            <button 
                                                onClick={() => onToggleRole(u.id, u.is_superuser)}
                                                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all w-fit ${
                                                    u.is_superuser 
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                {u.is_superuser ? <ShieldCheck size={14} /> : <Users size={14} />}
                                                <span>{u.is_superuser ? 'ADMINISTRATOR' : 'MEMBER'}</span>
                                            </button>
                                            <p className="text-[10px] text-slate-400 max-w-[120px]">
                                                {u.is_superuser ? 'Toàn quyền truy cập hệ thống quản trị.' : 'Sử dụng các tính năng chat cơ bản.'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div 
                                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                                                u.is_active !== false
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${u.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span>{u.is_active !== false ? 'ACTIVE' : 'BANNED'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-semibold text-slate-700">
                                            {new Date(u.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase">
                                            Lúc {new Date(u.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {!u.is_superuser && (
                                                <button 
                                                    onClick={() => onDeleteUser(u.id)}
                                                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-rose-200"
                                                    title="Xóa vĩnh viễn"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onEditUser(u)}
                                                className="p-2.5 bg-slate-50 text-slate-500 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Chỉnh sửa chi tiết"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="p-6 bg-slate-50 rounded-full text-slate-200">
                                                <Search size={32} />
                                            </div>
                                            <div className="max-w-xs mx-auto text-slate-500">
                                                <p className="font-bold text-slate-900 text-lg">Không tìm thấy người dùng</p>
                                                <p className="text-sm mt-1">Vui lòng thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
