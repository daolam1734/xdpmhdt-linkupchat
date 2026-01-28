import React from 'react';
import { 
    Users, Search, Download, Shield, RefreshCw, 
    Trash2, LogOut, Edit
} from 'lucide-react';
import type { UsersTabProps } from './types';
import { Avatar } from '../../components/common/Avatar';

export const UsersTab: React.FC<UsersTabProps> = ({
    users, filter, onFilterChange, searchTerm, onSearchChange,
    onRefresh, onAddUser, onEditUser, onToggleRole, onDeleteUser, 
    onExportCSV, onToggleBan, onForceLogout, onResetStatus
}) => {
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.id.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filter === 'admin') return matchesSearch && u.is_superuser;
        if (filter === 'user') return matchesSearch && !u.is_superuser;
        if (filter === 'banned') return matchesSearch && !u.is_active;
        if (filter === 'active') return matchesSearch && u.is_active;
        return matchesSearch;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý Tài khoản</h3>
                    <p className="text-slate-500 text-sm mt-1">Danh sách người dùng và hệ thống phân quyền</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={onExportCSV}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold border border-slate-200 shadow-sm"
                        title="Xuất dữ liệu người dùng ra CSV"
                    >
                        <Download size={16} />
                        <span>Xuất CSV</span>
                    </button>
                    <button 
                        onClick={onRefresh}
                        className="p-2.5 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 shadow-sm transition-all"
                        title="Làm mới danh sách"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={onAddUser}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-200"
                    >
                        <Users size={16} />
                        <span>Thêm tài khoản</span>
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Search and Filters */}
                <div className="px-6 py-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl w-fit">
                        {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'active', label: 'Đang hoạt động' },
                            { id: 'banned', label: 'Bị chặn' },
                        ].map((f) => (
                            <button 
                                key={f.id}
                                onClick={() => onFilterChange(f.id as any)}
                                className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                    filter === f.id 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm theo tên đăng nhập hoặc ID..." 
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 uppercase text-[11px] font-black tracking-[0.15em]">
                                <th className="px-6 py-4 border-b border-slate-100">Người dùng</th>
                                <th className="px-6 py-4 border-b border-slate-100">Ngày tạo</th>
                                <th className="px-6 py-4 border-b border-slate-100">Trạng thái</th>
                                <th className="px-6 py-4 border-b border-slate-100">Vai trò</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative flex-shrink-0">
                                                <Avatar name={u.full_name || u.username} size="lg" />
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${u.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-800 truncate">{u.full_name || u.username}</div>
                                                <div className="text-[10px] font-mono text-slate-400 flex items-center mt-0.5">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-1 lowercase italic opacity-70">@{u.username}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-600">
                                            {new Date(u.created_at).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-medium">
                                            {new Date(u.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.is_active ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider border border-rose-100">
                                                <div className="w-1 h-1 rounded-full bg-rose-500 mr-1.5" />
                                                Banned
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => onToggleRole(u.id, u.is_superuser)}
                                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                                                u.is_superuser 
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm shadow-indigo-100' 
                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}
                                        >
                                            <Shield size={12} className={u.is_superuser ? 'text-indigo-600' : 'text-slate-400'} />
                                            <span>{u.is_superuser ? 'Admin' : 'User'}</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-1">
                                            <button 
                                                onClick={() => onToggleBan(u.id)}
                                                className={`p-2 rounded-xl transition-all ${u.is_active ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-rose-600 bg-rose-50 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                                title={u.is_active ? "Chặn tài khoản" : "Bỏ chặn tài khoản"}
                                            >
                                                <Shield size={18} />
                                            </button>
                                            
                                            <button 
                                                onClick={() => onForceLogout(u.id)}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                title="Đăng xuất bắt buộc"
                                            >
                                                <LogOut size={18} />
                                            </button>

                                            <button 
                                                onClick={() => onResetStatus(u.id)}
                                                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                                title="Reset trạng thái Offline"
                                            >
                                                <RefreshCw size={18} />
                                            </button>

                                            <button 
                                                onClick={() => onEditUser(u)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Chỉnh sửa thông tin"
                                            >
                                                <Edit size={18} />
                                            </button>

                                            <button 
                                                onClick={() => onDeleteUser(u.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Xóa vĩnh viễn"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
                                                <Search size={32} />
                                            </div>
                                            <h4 className="text-slate-900 font-bold">Không tìm thấy kết quả</h4>
                                            <p className="text-slate-500 text-sm mt-1">Không tìm thấy người dùng nào khớp với tiêu chí tìm kiếm của bạn.</p>
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

