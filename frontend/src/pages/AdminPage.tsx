import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import api from '../services/api';
import { 
    Users, MessageSquare, Layout, ShieldAlert, 
    ArrowLeft, Trash2, ShieldCheck, TrendingUp,
    LogOut, Search, Settings, Save, RefreshCw, Key,
    Eye, EyeOff, Headset, Send, MessageCircle, X,
    Activity, ArrowUpRight,
    Zap, Database, Bell, Download
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { formatRelativeTime } from '../utils/time';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface Stats {
    total_users: number; // Regular users
    total_admins: number;
    total_messages: number;
    total_rooms: number;
    new_messages_24h: number;
    online_users: number; // Online regular users
    new_users_24h: number;
    new_users_7d: number;
    pending_support: number;
    top_rooms: Array<{
        name: string;
        message_count: number;
        type: string;
    }>;
    hourly_stats: number[];
}

interface User {
    id: string;
    username: string;
    full_name?: string;
    email?: string;
    phone?: string;
    is_active: boolean;
    is_superuser: boolean;
    role: string;
    permissions: string[];
    is_online?: boolean;
    created_at: string;
    avatar_url?: string;
}

interface SystemConfig {
    google_api_key?: string;
    openai_api_key?: string;
}

interface SupportConversation {
    user_id: string;
    username: string;
    last_message: string;
    timestamp: string;
    unread_count: number;
}

interface SupportMessage {
    id: string;
    content: string;
    sender_id: string | null;
    sender_name: string;
    is_bot: boolean;
    timestamp: string;
}

interface Room {
    id: string;
    name: string;
    description: string;
    type: string;
    is_private: boolean;
    created_at: string;
    created_by: string;
    message_count: number;
    member_count: number;
}

export const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuthStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'admin' | 'user' | 'inactive'>('all');
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms' | 'settings' | 'support'>('overview');
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showGoogleKey, setShowGoogleKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);

    // Support State
    const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<SupportConversation | null>(null);
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [replyContent, setReplyContent] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const { socket } = useChatStore();

    useEffect(() => {
        if (activeTab !== 'support' || !socket) return;

        const handleSupportMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'message' && data.room_id === 'help') {
                    fetchSupportConversations();
                    
                    // Nếu đang chat với đúng user này
                    if (selectedUser && (data.sender_id === selectedUser.user_id || data.receiver_id === selectedUser.user_id)) {
                        setSupportMessages(prev => {
                            // Tránh trùng lặp nếu API refresh vừa chạy
                            if (prev.some(m => m.id === data.id)) return prev;
                            return [...prev, {
                                id: data.id,
                                content: data.content,
                                sender_id: data.sender_id,
                                sender_name: data.sender_name,
                                is_bot: data.is_bot || false,
                                timestamp: data.timestamp
                            }];
                        });
                    }
                }
            } catch (error) {
                // Ignore parsing errors for pings etc
            }
        };

        socket.addEventListener('message', handleSupportMessage);
        return () => socket.removeEventListener('message', handleSupportMessage);
    }, [activeTab, socket, selectedUser]);

    useEffect(() => {
        if (activeTab === 'support') {
            fetchSupportConversations();
        }
    }, [activeTab]);

    const fetchSupportConversations = async () => {
        try {
            const res = await api.get('/admin/support/conversations');
            setSupportConversations(res.data);
        } catch (error) {
            toast.error("Lỗi khi tải danh sách hỗ trợ");
        }
    };

    const fetchSupportMessages = async (user: SupportConversation) => {
        setSelectedUser(user);
        try {
            const res = await api.get(`/admin/support/messages/${user.user_id}`);
            setSupportMessages(res.data);
        } catch (error) {
            toast.error("Lỗi khi tải tin nhắn");
        }
    };

    const handleSendReply = async () => {
        if (!replyContent.trim() || !selectedUser) return;
        setSendingReply(true);
        try {
            await api.post('/admin/support/reply', {
                user_id: selectedUser.user_id,
                content: replyContent
            });
            setReplyContent('');
            // Refresh messages
            fetchSupportMessages(selectedUser);
        } catch (error) {
            toast.error("Lỗi khi gửi phản hồi");
        } finally {
            setSendingReply(false);
        }
    };

    const fetchAdminData = useCallback(async (showToast = false) => {
        try {
            const [statsRes, usersRes, roomsRes, configRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users'),
                api.get('/admin/rooms'),
                api.get('/admin/config')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setRooms(roomsRes.data);
            setConfig(configRes.data);
            if (showToast) toast.success("Dữ liệu đã được làm mới");
        } catch (error) {
            console.error('Admin fetch error:', error);
            toast.error("Lỗi khi tải dữ liệu hoặc bạn không có quyền!");
            if (!showToast) onBack(); // Chỉ back nếu là lần đầu load lỗi
        } finally {
            setLoading(false);
        }
    }, [onBack]);

    const handleDeleteRoom = async (roomId: string) => {
        if (roomId === 'general' || roomId === 'help') {
            toast.error("Không thể xóa phòng mặc định của hệ thống");
            return;
        }
        
        if (window.confirm("Xác nhận xóa phòng chat này? Toàn bộ tin nhắn trong phòng sẽ bị mất vĩnh viễn.")) {
            try {
                await api.delete(`/admin/rooms/${roomId}`);
                setRooms(rooms.filter(r => r.id !== roomId));
                toast.success("Đã xóa phòng chat");
            } catch (error) {
                toast.error("Lỗi khi xóa phòng chat");
            }
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    const handleManualRefresh = () => {
        setLoading(true);
        fetchAdminData(true);
    };

    const handleExportData = () => {
        if (!stats) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            stats,
            users,
            exportDate: new Date().toISOString()
        }, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `system_report_${new Date().toLocaleDateString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success("Đã xuất báo cáo JSON");
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/admin/users/export', {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `danh_sach_nguoi_dung_${new Date().toISOString().slice(0, 10)}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Đã xuất danh sách CSV");
        } catch (error) {
            toast.error("Lỗi khi xuất CSV");
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await api.post('/admin/config', { configs: config });
            toast.success("Cập nhật cấu hình thành công!");
        } catch (error) {
            toast.success("Lỗi khi cập nhật cấu hình");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setDeletingUserId(userId);
    };

    const confirmDeleteUser = async () => {
        if (!deletingUserId) return;
        try {
            await api.delete(`/admin/users/${deletingUserId}`);
            setUsers(users.filter(u => u.id !== deletingUserId));
            toast.success("Đã xóa người dùng");
            setDeletingUserId(null); // Clear deleting state after success
        } catch (error) {
            toast.error("Lỗi khi xóa người dùng");
        }
    };

    const handleToggleRole = async (userId: string, currentIsAdmin: boolean) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, null, { 
                params: { is_admin: !currentIsAdmin } 
            });
            setUsers(users.map(u => u.id === userId ? { ...u, is_superuser: !currentIsAdmin } : u));
            toast.success("Cập nhật vai trò thành công!");
        } catch (error) {
            toast.error("Lỗi khi cập nhật vai trò");
        }
    };

    const handleToggleStatus = async (userId: string, currentIsActive: boolean) => {
        try {
            await api.patch(`/admin/users/${userId}/status`, null, {
                params: { is_active: !currentIsActive }
            });
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentIsActive } : u));
            toast.success(`Đã ${!currentIsActive ? 'kích hoạt' : 'vô hiệu hóa'} người dùng!`);
        } catch (error) {
            toast.error("Lỗi khi cập nhật trạng thái");
        }
    };

    const handleSaveUserEdit = async (userId: string, data: { 
        username?: string, 
        full_name?: string,
        email?: string,
        phone?: string,
        password?: string, 
        role?: string, 
        permissions?: string[] 
    }) => {
        try {
            await api.patch(`/admin/users/${userId}/update`, data);
            setUsers(users.map(u => u.id === userId ? { 
                ...u, 
                username: data.username || u.username,
                full_name: data.full_name || u.full_name,
                email: data.email || u.email,
                phone: data.phone || u.phone,
                role: data.role || u.role,
                permissions: data.permissions || u.permissions
            } : u));
            toast.success("Cập nhật thông tin người dùng thành công!");
            setEditingUser(null);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Lỗi khi cập nhật thông tin");
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
                        onClick={() => setActiveTab('support')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'support' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Headset size={20} />
                        <span className="font-medium text-[15px]">Hỗ trợ khách hàng</span>
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
                        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
                            {/* Health & Quick Actions */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center space-x-8">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">API Server</p>
                                                <p className="text-sm font-bold text-slate-900 flex items-center">
                                                    Hoạt động <span className="ml-2 block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                <Database size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Database</p>
                                                <p className="text-sm font-bold text-slate-900">Kết nối tốt</p>
                                            </div>
                                        </div>
                                        <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                                        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('support')}>
                                            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                                <Headset size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Hỗ trợ</p>
                                                <p className="text-sm font-bold text-slate-900">{stats.pending_support} yêu cầu mới</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={handleManualRefresh}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            title="Làm mới"
                                        >
                                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                        </button>
                                        <button 
                                            onClick={() => toast.success('Đang phát triển hệ thống thông báo')}
                                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center space-x-2"
                                        >
                                            <Bell size={14} />
                                            <span>Thông báo</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-indigo-600 p-6 rounded-2xl shadow-indigo-200 shadow-xl text-white relative overflow-hidden">
                                    <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
                                    <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Quick Action</p>
                                    <h4 className="font-bold mb-4">Export Report</h4>
                                    <button 
                                        onClick={handleExportData}
                                        className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2"
                                    >
                                        <Download size={14} />
                                        <span>Download JSON</span>
                                    </button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Users size={24} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-indigo-600 font-bold">
                                                Staff: {stats.total_admins}
                                            </span>
                                            <span className="text-[10px] text-green-500 font-bold flex items-center">
                                                <TrendingUp size={10} className="mr-1" />
                                                +{stats.new_users_24h} mới
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Người dùng (Khách)</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.total_users}</h3>
                                    <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full" 
                                            style={{ width: `${(stats.online_users/Math.max(stats.total_users, 1))*100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                        <span className="text-emerald-500 font-bold">{stats.online_users}</span> khách đang trực tuyến
                                    </p>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-emerald-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <MessageSquare size={24} />
                                        </div>
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">LIVE</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Tin nhắn (24h)</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.new_messages_24h}</h3>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                        Tổng: <span className="font-bold">{stats.total_messages.toLocaleString()}</span> toàn thời gian
                                    </p>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Layout size={24} />
                                        </div>
                                        <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Phòng thảo luận</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stats.total_rooms}</h3>
                                    <div className="mt-4 flex -space-x-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
                                                R{i}
                                            </div>
                                        ))}
                                        <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                            +
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-rose-500 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">SECURE</span>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Uptime hệ thống</p>
                                    <h3 className="text-2xl font-bold text-slate-900">99.9%</h3>
                                    <div className="flex items-center space-x-1 mt-4">
                                        {[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1].map((ok, i) => (
                                            <div key={i} className={`h-4 w-1 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Charts & Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h4 className="font-bold text-slate-900">Xu hướng hoạt động</h4>
                                            <p className="text-xs text-slate-500 mt-1">Dữ liệu tin nhắn hệ thống theo thời gian</p>
                                        </div>
                                        <div className="flex bg-slate-50 p-1 rounded-lg">
                                            <button className="px-3 py-1 text-[10px] font-bold bg-white shadow-sm rounded-md text-slate-900">24h</button>
                                            <button className="px-3 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600">7 ngày</button>
                                        </div>
                                    </div>
                                    
                                    <div className="h-64 flex items-end justify-between space-x-1.5 pt-4">
                                        {stats.hourly_stats.map((val, i) => {
                                            const maxVal = Math.max(...stats.hourly_stats, 1);
                                            const height = (val / maxVal) * 100;
                                            return (
                                                <div key={i} className="flex-1 bg-slate-50 rounded-t-lg relative group h-full flex items-end">
                                                    <div 
                                                        className="w-full bg-indigo-500/20 rounded-t-lg group-hover:bg-indigo-500 transition-all duration-300" 
                                                        style={{ height: `${Math.max(height, 5)}%` }}
                                                    ></div>
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                                                        <div className="font-bold">{val} tin nhắn</div>
                                                        <div className="text-[8px] text-slate-400 opacity-80">Giờ {i}:00</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span>00:00</span>
                                        <span>06:00</span>
                                        <span>12:00</span>
                                        <span>18:00</span>
                                        <span>23:59</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-slate-900">Phòng sôi nổi nhất</h4>
                                            <Layout size={14} className="text-slate-400" />
                                        </div>
                                        <div className="space-y-4">
                                            {stats.top_rooms.map((room, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                                                            {room.name.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{room.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{room.type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-slate-800">{room.message_count}</p>
                                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Msgs</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {stats.top_rooms.length === 0 && (
                                                <p className="text-center py-8 text-xs text-slate-400">Chưa có dữ liệu phòng chat</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-slate-900 text-sm">Người dùng mới (7 ngày)</h4>
                                            <span className="text-[10px] text-indigo-600 font-bold">+{stats.new_users_7d}</span>
                                        </div>
                                        <div className="flex -space-x-3 overflow-hidden p-2">
                                            {users.slice(0, 8).map(u => (
                                                <div key={u.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white overflow-hidden">
                                                    <Avatar name={u.username} size="sm" />
                                                </div>
                                            ))}
                                            {users.length > 8 && (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                                                    +{users.length - 8}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => setActiveTab('users')}
                                            className="w-full mt-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-widest"
                                        >
                                            Quản lý người dùng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {/* User Stats Card */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Tổng người dùng</p>
                                        <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Quản trị viên</p>
                                        <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.is_superuser).length}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Đang trực tuyến</p>
                                        <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.is_online).length}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                                        <Trash2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Đã vô hiệu hóa</p>
                                        <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.is_active === false).length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filters & Search */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => setFilter('all')}
                                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Tất cả
                                        </button>
                                        <button 
                                            onClick={() => setFilter('admin')}
                                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filter === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Admin
                                        </button>
                                        <button 
                                            onClick={() => setFilter('user')}
                                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filter === 'user' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Thành viên
                                        </button>
                                        <button 
                                            onClick={() => setFilter('inactive')}
                                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filter === 'inactive' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            Đã chặn
                                        </button>
                                    </div>

                                    <div className="flex items-center space-x-3 w-full md:w-auto">
                                        <button 
                                            onClick={handleExportCSV}
                                            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 text-white text-[11px] font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 uppercase tracking-wider"
                                        >
                                            <Download size={16} />
                                            <span className="hidden sm:inline">Xuất CSV</span>
                                        </button>
                                        
                                        <div className="relative flex-1 md:w-80">
                                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Tìm kiếm theo tên hoặc ID..." 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                                                <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
                                                                    <span>#{u.id.substring(0, 8)}</span>
                                                                    {u.is_online && <span className="text-[10px] text-emerald-500 font-bold ml-2">• Trực tuyến</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col space-y-2">
                                                            <button 
                                                                onClick={() => handleToggleRole(u.id, u.is_superuser)}
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
                                                        <button 
                                                            onClick={() => handleToggleStatus(u.id, u.is_active !== false)}
                                                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                                                                u.is_active !== false
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 hover:scale-105'
                                                                : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100 hover:scale-105'
                                                            }`}
                                                        >
                                                            <div className={`w-2 h-2 rounded-full ${u.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            <span>{u.is_active !== false ? 'ĐANG HOẠT ĐỘNG' : 'BỊ VÔ HIỆU HÓA'}</span>
                                                        </button>
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
                                                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            {!u.is_superuser && (
                                                                <button 
                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-rose-200"
                                                                    title="Xóa vĩnh viễn"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => setEditingUser(u)}
                                                                className="p-2.5 bg-slate-50 text-slate-500 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                title="Chỉnh sửa thông tin"
                                                            >
                                                                <Settings size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.filter(u => {
                                                const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm);
                                                if (filter === 'admin') return matchesSearch && u.is_superuser;
                                                if (filter === 'user') return matchesSearch && !u.is_superuser;
                                                if (filter === 'inactive') return matchesSearch && u.is_active === false;
                                                return matchesSearch;
                                            }).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-3">
                                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
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
                    )}

                    {activeTab === 'rooms' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h4 className="text-lg font-bold text-slate-800">Danh sách phòng chat ({rooms.length})</h4>
                                    <div className="relative w-full md:w-80">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Tìm phòng theo tên hoặc ID..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 uppercase text-[11px] font-bold tracking-[0.1em]">
                                                <th className="px-8 py-4 border-b border-slate-100">Phòng chat</th>
                                                <th className="px-8 py-4 border-b border-slate-100">Loại / Quyền</th>
                                                <th className="px-8 py-4 border-b border-slate-100">Thống kê</th>
                                                <th className="px-8 py-4 border-b border-slate-100">Người tạo</th>
                                                <th className="px-8 py-4 border-b border-slate-100 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rooms
                                                .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.includes(searchTerm))
                                                .map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center space-x-4">
                                                            <div className={`p-3 rounded-xl ${r.id === 'help' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                {r.id === 'help' ? <Headset size={20} /> : <MessageSquare size={20} />}
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-slate-900 block">{r.name}</span>
                                                                <span className="text-[11px] text-slate-400 font-mono">#{r.id.substring(0, 8)}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                                            r.is_private 
                                                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        }`}>
                                                            {r.is_private ? 'RIÊNG TƯ' : 'CÔNG KHAI'}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 mt-1 uppercase">{r.type}</p>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center space-x-2 text-xs">
                                                                <MessageCircle size={12} className="text-slate-400" />
                                                                <span className="font-bold text-slate-700">{r.message_count}</span>
                                                                <span className="text-slate-400">tin nhắn</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-xs">
                                                                <Users size={12} className="text-slate-400" />
                                                                <span className="font-bold text-slate-700">{r.member_count}</span>
                                                                <span className="text-slate-400">thành viên</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm text-slate-600">
                                                        {r.created_by || 'Hệ thống'}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        {r.id !== 'general' && r.id !== 'help' && (
                                                            <button 
                                                                onClick={() => handleDeleteRoom(r.id)}
                                                                className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                                                                title="Xóa phòng"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
                                                type={showGoogleKey ? "text" : "password"} 
                                                value={config.google_api_key}
                                                onChange={(e) => setConfig({...config, google_api_key: e.target.value})}
                                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-mono text-sm"
                                                placeholder="AIzaSy..."
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowGoogleKey(!showGoogleKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title={showGoogleKey ? "Ẩn" : "Xem"}
                                            >
                                                {showGoogleKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
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
                                                type={showOpenAIKey ? "text" : "password"} 
                                                value={config.openai_api_key}
                                                onChange={(e) => setConfig({...config, openai_api_key: e.target.value})}
                                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all font-mono text-sm"
                                                placeholder="sk-..."
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title={showOpenAIKey ? "Ẩn" : "Xem"}
                                            >
                                                {showOpenAIKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
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

                    {activeTab === 'support' && (
                        <div className="flex h-[calc(100vh-160px)] gap-6 animate-in fade-in duration-300">
                            {/* Danh sách người dùng cần hỗ trợ */}
                            <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <MessageCircle size={18} className="text-indigo-600" />
                                        Cuộc hội thoại
                                    </h4>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {supportConversations.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-slate-400 text-sm">Chưa có yêu cầu hỗ trợ nào</p>
                                        </div>
                                    ) : (
                                        supportConversations.map(conv => (
                                            <button
                                                key={conv.user_id}
                                                onClick={() => fetchSupportMessages(conv)}
                                                className={`w-full p-4 rounded-xl text-left transition-all flex items-center space-x-3 ${selectedUser?.user_id === conv.user_id ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'hover:bg-slate-50 border-transparent border'}`}
                                            >
                                                <Avatar name={conv.username} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-bold text-slate-900 truncate text-[14px]">
                                                            {conv.username}
                                                        </p>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {formatRelativeTime(conv.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                        {conv.last_message}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Khung chat chi tiết */}
                            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                {selectedUser ? (
                                    <>
                                        {/* Header */}
                                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Avatar name={selectedUser.username} size="md" />
                                                <div>
                                                    <p className="font-bold text-slate-900">{selectedUser.username}</p>
                                                    <p className="text-[11px] text-green-500 font-semibold uppercase tracking-wider">Đang chờ hỗ trợ</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => fetchSupportMessages(selectedUser)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <RefreshCw size={20} />
                                            </button>
                                        </div>

                                        {/* Messages area */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                                            {supportMessages.map((msg, idx) => {
                                                const isCustomer = msg.sender_id === selectedUser.user_id;
                                                const isAI = msg.is_bot || !msg.sender_id;
                                                const isLeft = isCustomer || isAI;

                                                return (
                                                    <div 
                                                        key={msg.id || idx}
                                                        className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                                                    >
                                                        <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${isLeft ? 'bg-white border border-slate-200' : 'bg-indigo-600 text-white'}`}>
                                                            <div className="flex items-center justify-between mb-1 gap-4">
                                                                <span className={`text-[10px] font-bold ${isLeft ? 'text-indigo-600' : 'text-indigo-100'}`}>
                                                                    {msg.sender_name}
                                                                </span>
                                                                <span className={`text-[9px] ${isLeft ? 'text-slate-400' : 'text-indigo-200'}`}>
                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Input area */}
                                        <div className="p-4 border-t border-slate-100 bg-white">
                                            <div className="relative flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                                    placeholder="Nhập phản hồi hỗ trợ..."
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all"
                                                />
                                                <button 
                                                    onClick={handleSendReply}
                                                    disabled={sendingReply || !replyContent.trim()}
                                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all shadow-md shadow-indigo-200"
                                                >
                                                    {sendingReply ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 text-center">
                                                Ghi chú: Tin nhắn sẽ được gửi trực tiếp tới người dùng trong phòng Hỗ trợ.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <Headset size={40} className="text-slate-200" />
                                        </div>
                                        <p className="text-sm font-medium">Chọn một người dùng để bắt đầu hỗ trợ</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <ConfirmModal 
                isOpen={!!deletingUserId}
                title="Xóa người dùng"
                message="Xác nhận xóa người dùng này? Toàn bộ tin nhắn và dữ liệu cá nhân sẽ bị loại bỏ khỏi hệ thống."
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeletingUserId(null)}
            />

            {editingUser && (
                <UserEditModal 
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={(data) => handleSaveUserEdit(editingUser.id, data)}
                />
            )}
        </div>
    );
};

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

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave }) => {
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
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Settings size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Cài đặt người dùng</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex flex-col items-center space-y-4 mb-4">
                        <Avatar name={user.username} size="xl" />
                        <div className="text-center">
                            <p className="font-bold text-slate-900">{user.username}</p>
                            <p className="text-[11px] text-slate-400 font-mono">ID: {user.id}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tên hiển thị</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Họ và tên</label>
                                <input 
                                    type="text" 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Số điện thoại</label>
                                <input 
                                    type="text" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Địa chỉ Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Đặt lại mật khẩu</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Để trống nếu không muốn đổi"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 ml-1">Mật khẩu mới phải bao gồm các ký tự bảo mật.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Vai trò (Role)</label>
                                <select 
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Trạng thái</label>
                                <div className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                    <span>{user.is_online ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Quyền hạn (Permissions)</label>
                            <input 
                                type="text" 
                                value={permissions}
                                onChange={(e) => setPermissions(e.target.value)}
                                placeholder="all, manage_users, manage_rooms..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none"
                            />
                            <p className="text-[10px] text-slate-400 ml-1">Phân cách các quyền bằng dấu phẩy.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-white rounded-xl transition-all"
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
                            permissions: permissions.split(',').map(p => p.trim()).filter(p => p !== '')
                        })}
                        className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};
