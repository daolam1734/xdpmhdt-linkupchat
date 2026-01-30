import React, { useState } from 'react';
import { X, UserPlus, Save, Eye, EyeOff, Mail, Phone, Lock, User } from 'lucide-react';

interface UserAddModalProps {
    onClose: () => void;
    onSave: (data: any) => void;
}

export const UserAddModal: React.FC<UserAddModalProps> = ({ onClose, onSave }) => {
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('member');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            username,
            full_name: fullName,
            email,
            phone,
            password,
            role,
            permissions: []
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                            <UserPlus size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Thêm Người dùng mới</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    <User size={12} className="mr-1" /> Tên tài khoản *
                                </label>
                                <input 
                                    required
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="vd: nguyenvana"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-50 focus:border-green-400 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên</label>
                                <input 
                                    type="text" 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="vd: Nguyễn Văn A"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-50 focus:border-green-400 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    <Mail size={12} className="mr-1" /> Email
                                </label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="vd: a@example.com"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-50 focus:border-green-400 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                    <Phone size={12} className="mr-1" /> Số điện thoại
                                </label>
                                <input 
                                    type="tel" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="vd: 0912345678"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-50 focus:border-green-400 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                <Lock size={12} className="mr-1" /> Mật khẩu *
                            </label>
                            <div className="relative">
                                <input 
                                    required
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-50 focus:border-green-400 transition-all outline-none"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vai trò hệ thống</label>
                            <select 
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-green-50 focus:border-green-400 transition-all outline-none appearance-none"
                            >
                                <option value="member">Thành viên (Member)</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-4 border-t border-slate-50 sticky bottom-0 bg-white pb-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit"
                            className="flex-2 flex items-center justify-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
                        >
                            <Save size={18} />
                            <span>Tạo người dùng</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
