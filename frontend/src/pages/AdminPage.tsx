import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { 
    Users, MessageSquare, Layout, ShieldAlert, 
    ArrowLeft, Trash2, ShieldCheck, TrendingUp,
    LogOut, MoreVertical, Search, Filter, Settings, Save, RefreshCw, Key
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { formatRelativeTime } from '../utils/time';

interface Stats {
    total_users: number;
    total_messages: number;
    total_rooms: number;
    new_messages_24h: number;
    online_users: number;
}

interface User {
    id: string;
    username: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    avatar_url?: string;
}

interface SystemConfig {
    google_api_key?: string;
    openai_api_key?: string;
}

export const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuthStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms' | 'settings'>('overview');

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsRes, usersRes, configRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/users'),
                    api.get('/admin/config')
                ]);
                setStats(statsRes.data);
                setUsers(usersRes.data);
                setConfig(configRes.data);
            } catch (error) {
                console.error('Admin fetch error:', error);
                alert("Bạn không có quyền truy cập trang này!");
                onBack();
            } finally {
                setLoading(false);
            }
        };
        fetchAdminData();
    }, [onBack]);

    const handleSaveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await api.post('/admin/config', { configs: config });
            alert("Cập nhật cấu hình thành công! Hệ thống đã áp dụng API Key mới.");
        } catch (error) {
            alert("Lỗi khi cập nhật cấu hình");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm("Xác nhận xóa người dùng này?")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            alert("Lỗi khi xóa người dùng");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0F172A] text-white flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                            <ShieldAlert size={20} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">LinkUp Admin</h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Layout size={20} />
                        <span className="font-medium text-[15px]">Tổng quan</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Users size={20} />
                        <span className="font-medium text-[15px]">Người dùng</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('rooms')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'rooms' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <MessageSquare size={20} />
                        <span className="font-medium text-[15px]">Phòng chat</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Settings size={20} />
                        <span className="font-medium text-[15px]">Cấu hình hệ thống</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button 
                        onClick={onBack}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-medium"
                    >
                        <ArrowLeft size={20} />
                        <span>Quay lại Chat</span>
                    </button>
                    <button 
                        onClick={logout}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-medium"
                    >
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
                    <h2 className="text-[18px] font-bold text-slate-900">
                        {activeTab === 'overview' ? 'Bảng điều khiển hệ thống' : activeTab === 'users' ? 'Quản lý người dùng' : 'Quản lý phòng chat'}
                    </h2>

                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 leading-none">{currentUser?.username}</p>
                            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mt-1">Administrator</p>
                        </div>
                        <Avatar name={currentUser?.username || ''} size="md" />
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'overview' && stats && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Users size={24} />
                                        </div>
                                        <TrendingUp size={16} className="text-green-500" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Tổng người dùng</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.total_users}</h3>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <MessageSquare size={24} />
                                        </div>
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">LIVE</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Tin nhắn hệ thống</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.total_messages}</h3>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Layout size={24} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Phòng thảo luận</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.total_rooms}</h3>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-rose-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">ONLINE</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Đang trực tuyến</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.online_users} / {stats.total_users}</h3>
                                </div>
                            </div>

                            {/* Activity Placeholder */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <h4 className="font-bold text-slate-900 mb-6 flex items-center">
                                        Hoạt động tin nhắn 24h qua
                                        <span className="ml-3 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] rounded-md">+{stats.new_messages_24h} mới</span>
                                    </h4>
                                    <div className="h-64 flex items-end justify-between space-x-2">
                                        {[40, 70, 45, 90, 65, 80, 50, 60, 85, 40, 100, 70].map((h, i) => (
                                            <div key={i} className="flex-1 bg-slate-100 rounded-t-lg relative group">
                                                <div 
                                                    className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-lg transition-all duration-1000 group-hover:bg-indigo-400" 
                                                    style={{ height: `${h}%` }}
                                                ></div>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {Math.floor(stats.total_messages * (h/100))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-4 text-xs text-slate-400 font-medium">
                                        <span>00:00</span>
                                        <span>06:00</span>
                                        <span>12:00</span>
                                        <span>18:00</span>
                                        <span>23:59</span>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <h4 className="font-bold text-slate-900 mb-6">Recent Users</h4>
                                    <div className="space-y-4">
                                        {users.slice(0, 5).map(u => (
                                            <div key={u.id} className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <Avatar name={u.username} size="sm" />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{u.username}</p>
                                                        <p className="text-[10px] text-slate-500">{formatRelativeTime(u.created_at)}</p>
                                                    </div>
                                                </div>
                                                {u.is_superuser && <ShieldCheck size={14} className="text-indigo-600" />}
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('users')}
                                        className="w-full mt-8 py-3 bg-slate-50 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
                                    >
                                        Xem tất cả
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="relative w-64">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm kiếm user..." 
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-normal"
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <button className="flex items-center space-x-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                                        <Filter size={16} />
                                        <span>Bộ lọc</span>
                                    </button>
                                </div>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Người dùng</th>
                                        <th className="px-8 py-4">Vai trò</th>
                                        <th className="px-8 py-4">Ngày tham gia</th>
                                        <th className="px-8 py-4 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center space-x-4">
                                                    <Avatar name={u.username} size="md" />
                                                    <span className="font-bold text-slate-900">{u.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                {u.is_superuser ? (
                                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md border border-indigo-100">ADMIN</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md border border-slate-200">USER</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4 text-sm text-slate-500 font-medium">
                                                {new Date(u.created_at).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="px-8 py-4 text-right space-x-2">
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                    <MoreVertical size={16} />
                                                </button>
                                                {!u.is_superuser && (
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'settings' && config && (
                        <div className="max-w-2xl animate-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">Quản lý API Keys</h4>
                                        <p className="text-sm text-slate-500 mt-1">Thay đổi cấu hình AI của toàn hệ thống LinkUp.</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Key size={24} />
                                    </div>
                                </div>
                                
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 flex items-center">
                                            Google Gemini API Key
                                            <span className="ml-2 px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded uppercase">Active</span>
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="password" 
                                                value={config.google_api_key}
                                                onChange={(e) => setConfig({...config, google_api_key: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-mono text-sm"
                                                placeholder="AIzaSy..."
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Được sử dụng cho Gemini 3 Flash, Gemini 2.0 Flash.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 flex items-center">
                                            OpenAI API Key
                                            <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded uppercase">Optional</span>
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="password" 
                                                value={config.openai_api_key}
                                                onChange={(e) => setConfig({...config, openai_api_key: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-mono text-sm"
                                                placeholder="sk-..."
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Dự phòng cho các dịch vụ GPT (nếu được kích hoạt).</p>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-amber-600">
                                            <RefreshCw size={14} className={saving ? "animate-spin" : ""} />
                                            <span className="text-xs font-medium">Thay đổi sẽ có hiệu lực ngay lập tức.</span>
                                        </div>
                                        <button 
                                            onClick={handleSaveConfig}
                                            disabled={saving}
                                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                                        >
                                            {saving ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    <span>Lưu cấu hình</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start space-x-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-blue-900">Mẹo bảo mật</h5>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                        API Key được lưu trữ mã hóa trong database. Bạn không nên chia sẻ key này cho bất kỳ ai không có quyền quản trị tối cao.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
