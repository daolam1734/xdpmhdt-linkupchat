import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useViewStore } from '../store/useViewStore';
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
import { UserAddModal } from './admin/UserAddModal';

export const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, logout } = useAuthStore();
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [restrictedUsers, setRestrictedUsers] = useState<string[]>([]);
    const [restrictedRooms, setRestrictedRooms] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [displaySearchTerm, setDisplaySearchTerm] = useState('');
    const [processingIds, setProcessingIds] = useState<string[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'admin' | 'user'>('all');
    const { adminTab: activeTab, setAdminTab: setActiveTab } = useViewStore();
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [showGoogleKey, setShowGoogleKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);

    // Support State
    const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<SupportConversation | null>(null);
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [replyContent, setReplyContent] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const { socket } = useChatStore();

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(displaySearchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [displaySearchTerm]);

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

                // Xử lý cập nhật/thu hồi tin nhắn real-time
                if (data.type === 'edit_message' && data.room_id === 'help') {
                    setSupportMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, content: data.content, is_edited: true } : m));
                }
                
                if (data.type === 'recall_message' && data.room_id === 'help') {
                    setSupportMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, is_recalled: true, content: "Tin nhắn đã được thu hồi bởi Admin" } : m));
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

    const handleUpdateSupportStatus = async (userId: string, status: string) => {
        try {
            await api.post(`/admin/support/thread/${userId}/status`, { status });
            setSupportConversations(prev => prev.map(conv => 
                conv.user_id === userId ? { ...conv, status: status as any } : conv
            ));
            if (selectedUser?.user_id === userId) {
                setSelectedUser(prev => prev ? { ...prev, status: status as any } : null);
            }
            toast.success("Đã cập nhật trạng thái hỗ trợ");
        } catch (error) {
            toast.error("Lỗi khi cập nhật trạng thái");
        }
    };

    const handleUpdateInternalNote = async (userId: string, note: string) => {
        try {
            await api.post(`/admin/support/thread/${userId}/note`, { note });
            setSupportConversations(prev => prev.map(conv => 
                conv.user_id === userId ? { ...conv, internal_note: note } : conv
            ));
            if (selectedUser?.user_id === userId) {
                setSelectedUser(prev => prev ? { ...prev, internal_note: note } : null);
            }
            toast.success("Đã lưu ghi chú nội bộ");
        } catch (error) {
            toast.error("Lỗi khi lưu ghi chú");
        }
    };

    const handleUpdateSupportMessage = async (messageId: string, content: string) => {
        try {
            await api.put(`/admin/support/messages/${messageId}`, { content });
            setSupportMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, is_edited: true } : m));
            toast.success("Đã cập nhật tin nhắn");
        } catch (error) {
            toast.error("Lỗi khi cập nhật tin nhắn");
        }
    };

    const handleDeleteSupportMessage = async (messageId: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn thu hồi tin nhắn này?")) return;
        try {
            await api.delete(`/admin/support/messages/${messageId}`);
            setSupportMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_recalled: true, content: "Tin nhắn đã được thu hồi bởi Admin" } : m));
            toast.success("Đã thu hồi tin nhắn");
        } catch (error) {
            toast.error("Lỗi khi thu hồi tin nhắn");
        }
    };

    const fetchAdminData = useCallback(async (showToast = false) => {
        try {
            const [statsRes, usersRes, roomsRes, reportsRes, configRes, restrictedRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users'),
                api.get('/admin/rooms'),
                api.get('/admin/reports'),
                api.get('/admin/config'),
                api.get('/admin/ai/restricted-entities')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setRooms(roomsRes.data);
            setReports(reportsRes.data);
            setConfig(configRes.data);
            setRestrictedUsers(restrictedRes.data.users);
            setRestrictedRooms(restrictedRes.data.rooms);
            if (showToast) toast.success("Dữ liệu đã được làm mới");
        } catch (error) {
            console.error('Admin fetch error:', error);
            toast.error("Lỗi khi tải dữ liệu hoặc bạn không có quyền!");
            if (!showToast) onBack();
        } finally {
            setLoading(false);
        }
    }, [onBack]);

    const handleToggleUserAIRestriction = async (userId: string) => {
        try {
            await api.post(`/admin/users/${userId}/toggle-ai`);
            setRestrictedUsers(prev => 
                prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
            );
            toast.success("Đã cập nhật hạn chế AI cho người dùng");
        } catch (error) {
            toast.error("Lỗi khi cập nhật hạn chế AI");
        }
    };

    const handleToggleRoomAIRestriction = async (roomId: string) => {
        try {
            await api.post(`/admin/rooms/${roomId}/toggle-ai`);
            setRestrictedRooms(prev => 
                prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
            );
            toast.success("Đã cập nhật hạn chế AI cho phòng chat");
        } catch (error) {
            toast.error("Lỗi khi cập nhật hạn chế AI");
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (roomId === 'general' || roomId === 'help') {
            toast.error("Không thể xóa phòng mặc định của hệ thống");
            return;
        }
        
        if (window.confirm("Xác nhận xóa phòng chat này? Toàn bộ tin nhắn trong phòng sẽ bị mất vĩnh viễn.")) {
            setProcessingIds(prev => [...prev, roomId]);
            try {
                await api.delete(`/admin/rooms/${roomId}`);
                setRooms(rooms.filter(r => r.id !== roomId));
                toast.success("Đã xóa phòng chat");
            } catch (error) {
                toast.error("Lỗi khi xóa phòng chat");
            } finally {
                setProcessingIds(prev => prev.filter(id => id !== roomId));
            }
        }
    };

    const handleToggleRoomLock = async (roomId: string) => {
        setProcessingIds(prev => [...prev, roomId]);
        try {
            const res = await api.post(`/admin/rooms/${roomId}/toggle-lock`);
            const newLocked = res.data.is_locked;
            setRooms(rooms.map(r => r.id === roomId ? { ...r, is_locked: newLocked } : r));
            toast.success(newLocked ? "Đã khóa nhóm chat" : "Đã mở khóa nhóm chat");
        } catch (error) {
            toast.error("Lỗi khi thay đổi trạng thái khóa");
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== roomId));
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

    const handleReportAction = async (reportId: string, action: string, note?: string) => {
        try {
            await api.post(`/admin/reports/${reportId}/action`, { action, note });
            setReports(reports.map(r => (r.id === reportId || r._id === reportId) ? { ...r, status: 'resolved' as const, action_taken: action } : r));
            toast.success("Đã xử lý báo cáo");
            fetchAdminData();
        } catch (error) {
            toast.error("Lỗi khi xử lý báo cáo");
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

    const handleAddUser = async (userData: any) => {
        try {
            await api.post('/admin/users', userData);
            toast.success('Tạo người dùng thành công');
            setIsAddUserModalOpen(false);
            fetchAdminData(true);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Lỗi khi tạo người dùng');
        }
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
        setProcessingIds(prev => [...prev, deletingUserId]);
        try {
            await api.delete(`/admin/users/${deletingUserId}`);
            setUsers(users.filter(u => u.id !== deletingUserId));
            toast.success("Đã xóa người dùng");
            setDeletingUserId(null);
        } catch (error) {
            toast.error("Lỗi khi xóa người dùng");
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== deletingUserId));
        }
    };

    const handleToggleRole = async (userId: string, currentIsAdmin: boolean) => {
        setProcessingIds(prev => [...prev, userId]);
        try {
            await api.patch(`/admin/users/${userId}/role`, null, { params: { is_admin: !currentIsAdmin } });
            setUsers(users.map(u => u.id === userId ? { ...u, is_superuser: !currentIsAdmin } : u));
            toast.success("Cập nhật vai trò thành công!");
        } catch (error) {
            toast.error("Lỗi khi cập nhật vai trò");
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handleToggleBan = async (userId: string) => {
        setProcessingIds(prev => [...prev, userId]);
        try {
            await api.post(`/admin/users/${userId}/toggle-active`);
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
            toast.success("Đã cập nhật trạng thái hoạt động");
        } catch (error) {
            toast.error("Lỗi khi cập nhật trạng thái");
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handleForceLogout = async (userId: string) => {
        setProcessingIds(prev => [...prev, userId]);
        try {
            await api.post(`/admin/users/${userId}/force-logout`);
            setUsers(users.map(u => u.id === userId ? { ...u, is_online: false } : u));
            toast.success("Đã yêu cầu đăng xuất bắt buộc");
        } catch (error) {
            toast.error("Lỗi khi force logout");
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handleResetStatus = async (userId: string) => {
        setProcessingIds(prev => [...prev, userId]);
        try {
            await api.post(`/admin/users/${userId}/reset-status`);
            setUsers(users.map(u => u.id === userId ? { ...u, is_online: false } : u));
            toast.success("Đã reset trạng thái online");
        } catch (error) {
            toast.error("Lỗi khi reset trạng thái");
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== userId));
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
                        searchTerm={displaySearchTerm}
                        filterTerm={searchTerm}
                        filter={filter}
                        processingIds={processingIds}
                        onSearchChange={setDisplaySearchTerm}
                        onFilterChange={setFilter}
                        onRefresh={() => fetchAdminData(true)}
                        onAddUser={() => setIsAddUserModalOpen(true)}
                        onEditUser={setEditingUser}
                        onToggleRole={handleToggleRole}
                        onToggleBan={handleToggleBan}
                        onForceLogout={handleForceLogout}
                        onResetStatus={handleResetStatus}
                        onDeleteUser={setDeletingUserId}
                        onExportCSV={handleExportCSV}
                    />
                );
            case 'rooms':
                return (
                    <RoomsTab 
                        rooms={rooms}
                        searchTerm={displaySearchTerm}
                        filterTerm={searchTerm}
                        processingIds={processingIds}
                        onSearchChange={setDisplaySearchTerm}
                        onRefresh={() => fetchAdminData(true)}
                        onToggleLock={handleToggleRoomLock}
                        onDelete={handleDeleteRoom}
                        onCleanup={handleCleanupEmptyRooms}
                    />
                );
            case 'reports':
                return stats && (
                    <ReportsTab 
                        stats={stats} 
                        reports={reports}
                        onRefresh={() => fetchAdminData(true)}
                        onAction={handleReportAction}
                    />
                );
            case 'ai_assistant':
                return config && stats && (
                    <AIAssistantTab 
                        config={config} 
                        stats={stats}
                        saving={saving} 
                        restrictedUsers={restrictedUsers}
                        restrictedRooms={restrictedRooms}
                        onToggleUserRestriction={handleToggleUserAIRestriction}
                        onToggleRoomRestriction={handleToggleRoomAIRestriction}
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
                        onStatusChange={handleUpdateSupportStatus}
                        onNoteChange={handleUpdateInternalNote}
                        onUpdateMessage={handleUpdateSupportMessage}
                        onDeleteMessage={handleDeleteSupportMessage}
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
                        {activeTab === 'overview' ? 'System Dashboard' : 
                         activeTab === 'users' ? 'User Management' : 
                         activeTab === 'rooms' ? 'Conversations Management' :
                         activeTab === 'reports' ? 'Reports & Statistics' :
                         activeTab === 'ai_assistant' ? 'AI Assistant configuration' :
                         activeTab === 'settings' ? 'System configuration' : 'Help & Support'}
                    </h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 leading-none">{currentUser?.full_name || currentUser?.username}</p>
                            <p className="text-[10px] text-slate-400 font-medium">@{currentUser?.username}</p>
                        </div>
                        <Avatar name={currentUser?.full_name || currentUser?.username || ''} size="md" />
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

            {isAddUserModalOpen && (
                <UserAddModal 
                    onClose={() => setIsAddUserModalOpen(false)}
                    onSave={handleAddUser}
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
