import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import api from '../services/api';
import { 
    Users, MessageSquare, ShieldAlert, 
    ArrowLeft, TrendingUp,
    LogOut, Settings, Zap, Headset,
    Layout
} from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/common/ConfirmModal';

// Sub-components
import type { Stats, User, SystemConfig, SupportConversation, SupportMessage, Room } from './admin/types';
import { OverviewTab } from './admin/OverviewTab';
import { UsersTab } from './admin/UsersTab';
import { RoomsTab } from './admin/RoomsTab';
import { SettingsTab } from './admin/SettingsTab';
import { SupportTab } from './admin/SupportTab';
import { ReportsTab } from './admin/ReportsTab';
import { AIAssistantTab } from './admin/AIAssistantTab';
import { UserEditModal } from './admin/UserEditModal';

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
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms' | 'settings' | 'support' | 'reports' | 'ai_assistant'>('overview');
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
                    
                    if (selectedUser && (data.sender_id === selectedUser.user_id || data.receiver_id === selectedUser.user_id)) {
                        setSupportMessages(prev => {
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
            } catch (error) {}
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
            if (!showToast) onBack();
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

    const handleToggleRoomLock = async (roomId: string) => {
        try {
            const res = await api.post(`/admin/rooms/${roomId}/toggle-lock`);
            const newLocked = res.data.is_locked;
            setRooms(rooms.map(r => r.id === roomId ? { ...r, is_locked: newLocked } : r));
            toast.success(newLocked ? "Đã khóa nhóm chat" : "Đã mở khóa nhóm chat");
        } catch (error) {
            toast.error("Lỗi khi thay đổi trạng thái khóa");
        }
    };

    const handleCleanupEmptyRooms = async () => {
        if (!window.confirm("Dọn dẹp các nhóm chat không có nội dung?")) return;
        try {
            const res = await api.post('/admin/rooms/cleanup/empty');
            toast.success(`Đã xóa ${res.data.deleted_count} phòng trống`);
            fetchAdminData();
        } catch (error) {
            toast.error("Không thể dọn dẹp phòng");
        }
    };

    useEffect(() => {
        fetchAdminData();
        const interval = setInterval(() => {
            if (activeTab === 'overview' && !loading) {
                fetchAdminData();
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchAdminData, activeTab, loading]);

    const handleManualRefresh = () => {
        setLoading(true);
        fetchAdminData(true);
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/admin/users/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `danh_sach_nguoi_dung_${new Date().toISOString().slice(0, 10)}.csv`);
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
            toast.success("Cấu hình hệ thống đã được cập nhật thành công!");
        } catch (error) {
            toast.error("Lỗi khi cập nhật cấu hình");
        } finally {
            setSaving(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (!deletingUserId) return;
        try {
            await api.delete(`/admin/users/${deletingUserId}`);
            setUsers(users.filter(u => u.id !== deletingUserId));
            toast.success("Đã xóa người dùng");
            setDeletingUserId(null);
        } catch (error) {
            toast.error("Lỗi khi xóa người dùng");
        }
    };

    const handleToggleRole = async (userId: string, currentIsAdmin: boolean) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, null, { params: { is_admin: !currentIsAdmin } });
            setUsers(users.map(u => u.id === userId ? { ...u, is_superuser: !currentIsAdmin } : u));
            toast.success("Cập nhật vai trò thành công!");
        } catch (error) {
            toast.error("Lỗi khi cập nhật vai trò");
        }
    };

    const handleSaveUserEdit = async (data: any) => {
        if (!editingUser) return;
        try {
            await api.patch(`/admin/users/${editingUser.id}/update`, data);
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...data } : u));
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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return stats && (
                    <OverviewTab 
                        stats={stats} 
                        loading={loading} 
                        onManualRefresh={handleManualRefresh}
                        onSetActiveTab={setActiveTab}
                    />
                );
            case 'users':
                return (
                    <UsersTab 
                        users={users}
                        searchTerm={searchTerm}
                        filter={filter}
                        onSearchChange={setSearchTerm}
                        onFilterChange={setFilter}
                        onRefresh={() => fetchAdminData(true)}
                        onAddUser={() => toast.error('Tính năng đang phát triển')}
                        onEditUser={setEditingUser}
                        onToggleRole={handleToggleRole}
                        onDeleteUser={setDeletingUserId}
                        onExportCSV={handleExportCSV}
                    />
                );
            case 'rooms':
                return (
                    <RoomsTab 
                        rooms={rooms}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onRefresh={() => fetchAdminData(true)}
                        onToggleLock={handleToggleRoomLock}
                        onDelete={handleDeleteRoom}
                        onCleanup={handleCleanupEmptyRooms}
                    />
                );
            case 'reports':
                return stats && <ReportsTab stats={stats} />;
            case 'ai_assistant':
                return config && (
                    <AIAssistantTab 
                        config={config} 
                        saving={saving} 
                        onConfigChange={setConfig} 
                        onSave={handleSaveConfig} 
                    />
                );
            case 'support':
                return (
                    <SupportTab 
                        conversations={supportConversations}
                        selectedUser={selectedUser}
                        messages={supportMessages}
                        replyContent={replyContent}
                        sendingReply={sendingReply}
                        onSelectUser={fetchSupportMessages}
                        onReplyChange={setReplyContent}
                        onSendReply={handleSendReply}
                    />
                );
            case 'settings':
                return config && (
                    <SettingsTab 
                        config={config} 
                        saving={saving}
                        showGoogleKey={showGoogleKey}
                        showOpenAIKey={showOpenAIKey}
                        onToggleGoogleKey={() => setShowGoogleKey(!showGoogleKey)}
                        onToggleOpenAIKey={() => setShowOpenAIKey(!showOpenAIKey)}
                        onConfigChange={setConfig}
                        onSave={handleSaveConfig}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
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
                    {[
                        { id: 'overview', icon: Layout, label: 'Dashboard' },
                        { id: 'users', icon: Users, label: 'Users' },
                        { id: 'rooms', icon: MessageSquare, label: 'Conversations' },
                        { id: 'reports', icon: TrendingUp, label: 'Reports' },
                        { id: 'ai_assistant', icon: Zap, label: 'AI Assistant' },
                        { id: 'support', icon: Headset, label: 'Help & Support' },
                        { id: 'settings', icon: Settings, label: 'Settings' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <tab.icon size={20} />
                            <span className="font-medium text-[15px]">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button onClick={onBack} className="w-full h-12 flex items-center space-x-3 px-4 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-medium">
                        <ArrowLeft size={20} />
                        <span>Quay lại Chat</span>
                    </button>
                    <button onClick={logout} className="w-full h-12 flex items-center space-x-3 px-4 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-medium">
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto">
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
                    <h2 className="text-[18px] font-bold text-slate-900">
                        {activeTab === 'overview' ? 'Bảng điều khiển hệ thống' : 
                         activeTab === 'users' ? 'Quản lý người dùng' : 
                         activeTab === 'rooms' ? 'Quản lý phòng chat' :
                         activeTab === 'reports' ? 'Báo cáo & Thống kê' :
                         activeTab === 'ai_assistant' ? 'Cấu hình AI Assistant' :
                         activeTab === 'settings' ? 'Cấu hình hệ thống' : 'Hỗ trợ khách hàng'}
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
                    {renderTabContent()}
                </div>
            </main>

            {editingUser && (
                <UserEditModal 
                    user={editingUser} 
                    onClose={() => setEditingUser(null)} 
                    onSave={handleSaveUserEdit} 
                />
            )}

            <ConfirmModal 
                isOpen={!!deletingUserId}
                onCancel={() => setDeletingUserId(null)}
                onConfirm={confirmDeleteUser}
                title="Xóa người dùng"
                message="Bạn có chắc chắn muốn xóa vĩnh viễn người dùng này? Hành động này không thể hoàn tác."
                confirmText="Xác nhận xóa"
                type="danger"
            />
        </div>
    );
};

export default AdminPage;
