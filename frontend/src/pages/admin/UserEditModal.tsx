import React, { useState } from 'react';
import { X, Users, Save, Eye, EyeOff } from 'lucide-react';
import type { User } from './types';
import { Avatar } from '../../components/common/Avatar';

interface UserEditModalProps {
    user: User;
    onClose: () => void;
    onSave: (data: { 
        username: string, 
        full_name?: string,
        email?: string,
        phone?: string,
        password?: string, 
        role: string, 
        permissions: string[] 
    }) => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave }) => {
    const [username, setUsername] = useState(user.username);
    const [fullName, setFullName] = useState(user.full_name || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user.role || 'member');
    const [permissions, setPermissions] = useState(user.permissions?.join(', ') || '');
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Chi tiết Người dùng</h3>
                            <p className="text-[11px] text-slate-400 font-mono">UUID: {user.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Header profile info */}
                    <div className="flex items-center space-x-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Avatar name={user.username} size="xl" />
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                                <span className="text-lg font-bold text-slate-900">{user.username}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {user.is_active ? 'ACTIVE' : 'BANNED'}
                                </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className="text-xs text-slate-500 font-medium">Tham gia: {new Date(user.created_at).toLocaleDateString()}</span>
                                <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                                    <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                    <span>{user.is_online ? 'Đang online' : 'Offline'}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest ml-1">Thông tin cơ bản</h4>
                            
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên tài khoản</label>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Họ và tên</label>
                                <input 
                                    type="text" 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest ml-1">Liên lạc & Phân quyền</h4>
                            
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Địa chỉ Email</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Số điện thoại</label>
                                <input 
                                    type="text" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col space-y-4">
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Vai trò (Role)</label>
                                <select 
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                >
                                    <option value="member">Thành viên (Member)</option>
                                    <option value="admin">Quản trị viên (Admin)</option>
                                </select>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Đổi mật khẩu</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Bỏ trống nếu không đổi"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none font-mono"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                         </div>

                         <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Quyền hạn (Cách nhau bởi dấu phẩy)</label>
                                <input 
                                    type="text" 
                                    value={permissions}
                                    onChange={(e) => setPermissions(e.target.value)}
                                    placeholder="all, read, write..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none font-mono"
                                />
                         </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 hover:text-slate-900 transition-colors text-sm font-bold"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={() => onSave({
                            username,
                            full_name: fullName,
                            email,
                            phone,
                            password: password || undefined,
                            role,
                            permissions: permissions.split(',').map(p => p.trim()).filter(Boolean)
                        })}
                        className="flex items-center space-x-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-100"
                    >
                        <Save size={18} />
                        <span>Lưu thay đổi</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
