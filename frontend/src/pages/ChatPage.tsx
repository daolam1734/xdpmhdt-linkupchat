import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/useChatStore';
import { MessageItem } from '../components/chat/MessageItem';
import { ChatInput } from '../components/chat/ChatInput';
import { Sidebar } from '../components/layout/Sidebar';
import { ProfileView } from '../components/chat/ProfileView';
import { ForwardModal } from '../components/chat/ForwardModal';
import { Avatar } from '../components/common/Avatar';
import { AddMemberModal } from '../components/chat/AddMemberModal';
import { 
    LogOut, Pin, Trash2, 
    BellOff, Flag, X, MessageCircle,
    Bot, CheckCircle,
    MoreHorizontal, ChevronRight, Image as ImageIcon,
    FileText, UserPlus, Bell, Settings,
    Search as SearchIcon, Users, User,
    PanelRight, ShieldAlert, Info, Archive, Camera, Edit2, 
    ExternalLink, File as FileIcon
} from 'lucide-react';
import { formatChatTime } from '../utils/time';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { clsx } from 'clsx';

interface ChatPageProps {
    onNavigateToAdmin?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigateToAdmin }) => {
  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
  
  const getAuthenticatedUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('/api/v1/files/download/') && token) {
        return `${BASE_URL}${url}${url.includes('?') ? '&' : '?'}token=${token}`;
    }
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const { 
    messages, 
    rooms,
    activeRoom,
    setActiveRoom,
    sendMessage,
    currentUser,
    fetchRooms,
    token
  } = useChat();
  const { 
    aiSuggestion, 
    clearSuggestion, 
    isMuted, 
    toggleMute, 
    clearHistory, 
    deleteRoom,
    searchMessages,
    searchResults,
    searchQuery,
    setSearchQuery,
    isViewingPinned,
    setViewingPinned,
    aiTypingRooms,
    activeDropdownId,
    setActiveDropdown,
    viewingUser,
    setViewingUser,
    typingUsers,
    roomMembers,
    removeMember,
    updateRoomInfo,
    addRoomMembers,
    changeMemberRole,
    pinMessage,
    lastReadMessageIds,
    setLastReadMessageId
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [lastScrolledRoomId, setLastScrolledRoomId] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleRenameRoom = async () => {
    if (!activeRoom) return;
    const newName = prompt('Nhập tên mới cho nhóm:', activeRoom.name);
    if (newName && newName.trim() && newName !== activeRoom.name) {
      try {
        await updateRoomInfo(activeRoom.id, { name: newName.trim() });
      } catch (error) {
        // Error toast handled in store
      }
    }
  };

  const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeRoom || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    try {
      toast.loading("Đang cập nhật ảnh nhóm...", { id: 'upload-avatar' });
      const { uploadFile } = useChatStore.getState();
      const result = await uploadFile(file);
      await updateRoomInfo(activeRoom.id, { avatar_url: result.url });
      toast.success("Đã cập nhật ảnh đại diện nhóm", { id: 'upload-avatar' });
    } catch (error) {
      toast.error("Lỗi khi tải ảnh lên", { id: 'upload-avatar' });
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleAddMembers = async (memberIds: string[]) => {
    if (!activeRoom) return;
    try {
      await addRoomMembers(activeRoom.id, memberIds);
    } catch (error) {
      // Error toast handled in store
    }
  };

  const [expandedSections, setExpandedSections] = useState({
    customization: false,
    members: true,
    pinned: false,
    photos: true,
    files: true,
    links: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Close menus on click outside
  useEffect(() => {
    if (!activeDropdownId) return;
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdownId, setActiveDropdown]);

  // Track last seen message for each room
  useEffect(() => {
    if (!activeRoom || messages.length === 0) return;

    const options = {
      root: mainRef.current,
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const msgId = entry.target.getAttribute('data-message-id');
          if (msgId) {
            setLastReadMessageId(activeRoom.id, msgId);
          }
        }
      });
    }, options);

    // Observe message elements - wait for render
    const timeoutId = setTimeout(() => {
      const msgElements = document.querySelectorAll('[data-message-id]');
      msgElements.forEach((el) => observer.observe(el));
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [activeRoom?.id, messages.length, setLastReadMessageId]);

  // Handle scrolling: initial load (to unread or last seen or bottom) and new messages
  useEffect(() => {
    if (!activeRoom?.id || messages.length === 0) {
      if (!activeRoom?.id) setLastScrolledRoomId(null);
      return;
    }

    // CASE 1: Initial load for this room
    if (lastScrolledRoomId !== activeRoom.id) {
        // First priority: Unread marker
        const firstUnread = messages.find(m => 
            m.senderId !== currentUser?.id && 
            m.status !== 'seen' && 
            !m.isBot
        );

        if (firstUnread) {
            const marker = document.getElementById('unread-marker');
            if (marker) {
                marker.scrollIntoView({ behavior: 'auto', block: 'center' });
                setLastScrolledRoomId(activeRoom.id);
                return;
            }
            
            const element = document.getElementById(`msg-${firstUnread.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                setLastScrolledRoomId(activeRoom.id);
                return;
            }
        }

        // Second priority: Last read message from persistence
        const lastReadId = lastReadMessageIds[activeRoom.id];
        if (lastReadId) {
            const element = document.getElementById(`msg-${lastReadId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                setLastScrolledRoomId(activeRoom.id);
                return;
            }
        }
        
        // Default: Bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        setLastScrolledRoomId(activeRoom.id);
        return;
    }

    // CASE 2: New messages arriving while already in the room
    if (!mainRef.current) return;
    
    const container = mainRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
    const lastMessage = messages[messages.length - 1];
    const isMyMessage = lastMessage?.senderId === currentUser?.id;

    if (isAtBottom || isMyMessage) {
        messagesEndRef.current?.scrollIntoView({ 
            behavior: isMyMessage ? 'smooth' : 'auto' 
        });
    }
  }, [messages, activeRoom?.id, currentUser, lastScrolledRoomId]);

  // Group messages by date and add unread marker
  const renderMessages = () => {
    if (!messages || messages.length === 0) return null;

    const grouped: ( 
        { type: 'date', date: string } | 
        { type: 'message', message: any, isFirst: boolean, isLast: boolean } |
        { type: 'unread-marker' }
    )[] = [];
    
    const firstUnreadIdx = messages.findIndex(msg => 
        msg.senderId !== currentUser?.id && 
        msg.status !== 'seen' && 
        !msg.isBot
    );

    messages.forEach((msg, idx) => {
        if (idx === firstUnreadIdx) {
            grouped.push({ type: 'unread-marker' });
        }

        const msgDate = new Date(msg.timestamp || (msg as any).createdAt).toLocaleDateString();
        const prevMsg = messages[idx - 1];
        const prevDate = prevMsg ? new Date(prevMsg.timestamp || (prevMsg as any).createdAt).toLocaleDateString() : null;

        if (msgDate !== prevDate) {
            grouped.push({ type: 'date', date: msgDate });
        }

        const nextMsg = messages[idx + 1];
        const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId || prevDate !== msgDate;
        const isLast = !nextMsg || nextMsg.senderId !== msg.senderId || 
                 (nextMsg ? new Date(nextMsg.timestamp || (nextMsg as any).createdAt).toLocaleDateString() : null) !== msgDate;

        grouped.push({ 
            type: 'message', 
            message: msg, 
            isFirst, 
            isLast 
        });
    });

    return grouped.map((item, idx) => {
        if (item.type === 'unread-marker') {
            return (
                <div key="unread-marker" id="unread-marker" className="flex items-center my-8">
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-red-200 to-red-400"></div>
                    <div className="mx-4 flex items-center space-x-2 bg-red-50 px-4 py-1.5 rounded-full border border-red-100 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Tin nhắn mới</span>
                    </div>
                    <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-red-200 to-red-400"></div>
                </div>
            );
        }

        if (item.type === 'date') {
            return (
                <div key={`date-${item.date}`} className="flex justify-center my-6 sticky top-2 z-[40]">
                    <span className="bg-gray-200/80 text-gray-600 text-[12px] font-semibold px-4 py-1 rounded-full shadow-none border-none transition-all">
                        {item.date === new Date().toLocaleDateString() ? 'Hôm nay' : 
                         item.date === new Date(Date.now() - 86400000).toLocaleDateString() ? 'Hôm qua' : 
                         item.date}
                    </span>
                </div>
            );
        }

        return (
            <MessageItem 
                key={item.message.id} 
                message={item.message}
                isFirst={item.isFirst}
                isLast={item.isLast}
                showAvatar={item.isLast}
                showName={item.isFirst}
                isLatest={idx === grouped.length - 1}
            />
        );
    });
  };

  const renderInfoPanel = () => {
    if (!activeRoom) return null;

    // Phân quyền trong phòng
    const currentUserMembership = roomMembers.find(m => m.id === currentUser?.id);
    const isOwner = currentUserMembership?.role === 'owner' || currentUser?.is_superuser;
    const isAdminOfRoom = currentUserMembership?.role === 'admin' || isOwner;

    const mediaMessages = messages.filter(m => m.file_url && m.file_type === 'image');
    const fileMessages = messages.filter(m => m.file_url && m.file_type === 'file');
    
    // Extract links from messages
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const linkMessages = messages.filter(m => {
        if (m.is_recalled) return false;
        return m.content && m.content.match(linkRegex);
    });

    const isSpecialRoom = activeRoom.type === 'bot' || activeRoom.type === 'support';
    const isGroup = activeRoom.type === 'community' || activeRoom.type === 'group';

    return (
      <aside className={clsx(
        "border-l border-gray-100 bg-white flex flex-col transition-all duration-300 overflow-hidden shrink-0 h-full",
        isInfoOpen ? "w-[320px]" : "w-0 border-l-0"
      )}>
        <div className="h-[64px] px-4 border-b border-gray-50 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-gray-900">
                {activeRoom.type === 'support' ? 'Hỗ trợ & CSKH' : 
                 activeRoom.type === 'bot' ? 'Trợ lý AI' : 
                 isGroup ? 'Thông tin nhóm' : 'Thông tin cá nhân'}
            </h3>
            <button 
                onClick={() => setIsInfoOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                title="Đóng"
            >
                <X size={20} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Header profile info */}
            <div className="flex flex-col items-center py-8 px-4 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="relative mb-4 group">
                    <Avatar 
                        name={activeRoom.name} 
                        url={activeRoom.avatar_url}
                        isBot={activeRoom.type === 'bot'}
                        isOnline={activeRoom.type === 'bot' ? true : (activeRoom.is_online && !activeRoom.blocked_by_other)} 
                        size="xl" 
                    />
                    {isGroup && isAdminOfRoom && (
                        <button 
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Camera size={24} />
                        </button>
                    )}
                    <input 
                        type="file"
                        ref={avatarInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpdateAvatar}
                    />
                    {activeRoom.type === 'bot' && (
                        <div className="absolute -bottom-1 -right-1 p-1 bg-purple-600 text-white rounded-full border-2 border-white">
                            <Bot size={14} />
                        </div>
                    )}
                </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-[18px] font-black text-gray-900 dark:text-white text-center leading-tight">
                                {activeRoom.name}
                            </h2>
                            {isGroup && isAdminOfRoom && (
                                <button 
                                    onClick={handleRenameRoom}
                                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="Đổi tên nhóm"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                        {/* Type Tag */}
                        <div className="mt-1">
                            {activeRoom.type === 'community' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full uppercase tracking-wider">Phòng cộng đồng</span>
                            )}
                            {activeRoom.type === 'group' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full uppercase tracking-wider">Nhóm trò chuyện</span>
                            )}
                            {activeRoom.type === 'direct' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full uppercase tracking-wider">Hội thoại cá nhân</span>
                            )}
                            {activeRoom.type === 'bot' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full uppercase tracking-wider">Trợ lý AI LinkUp</span>
                            )}
                            {activeRoom.type === 'support' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full uppercase tracking-wider">Hỗ trợ hệ thống</span>
                            )}
                        </div>
                    </div>
                <div className="flex items-center mt-2 space-x-1">
                    <span className={clsx(
                        "w-2 h-2 rounded-full",
                        (activeRoom.is_online || activeRoom.type === 'bot' || activeRoom.type === 'support') ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span className="text-[12px] text-gray-500 font-medium">
                        {activeRoom.type === 'support' ? 'Phòng hỗ trợ LinkUp' :
                         activeRoom.type === 'bot' ? 'LinkUp AI Assistant' : 
                         (activeRoom.is_online && !activeRoom.blocked_by_other) ? 'Đang hoạt động' : 'Ngoại tuyến'}
                    </span>
                </div>

                <div className="flex items-center space-x-4 mt-6">
                    <button 
                        onClick={() => setSearchQuery(' ')}
                        className="flex flex-col items-center space-y-1.5 group"
                    >
                        <div className="p-2.5 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-all text-gray-700">
                            <SearchIcon size={18} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Tìm kiếm</span>
                    </button>
                    
                    {activeRoom.type === 'direct' ? (
                        <button 
                            onClick={() => setViewingUser(roomMembers.find(m => m.id !== currentUser?.id) || null)}
                            className="flex flex-col items-center space-y-1.5 group"
                        >
                            <div className="p-2.5 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-all text-gray-700">
                                <User size={18} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Cá nhân</span>
                        </button>
                    ) : (activeRoom.type === 'public' || activeRoom.type === 'private') && !isSpecialRoom && (
                        <button 
                            onClick={() => setIsAddMemberModalOpen(true)}
                            className="flex flex-col items-center space-y-1.5 group"
                        >
                            <div className="p-2.5 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-all text-gray-700">
                                <UserPlus size={18} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Thêm người</span>
                        </button>
                    )}
                    
                    <button 
                        onClick={() => toggleMute()}
                        className="flex flex-col items-center space-y-1.5 group"
                    >
                        <div className={clsx(
                            "p-2.5 rounded-full transition-all",
                            isMuted ? "bg-amber-50 text-amber-600 shadow-sm" : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
                        )}>
                            {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">{isMuted ? 'Mở' : 'Tắt'} báo</span>
                    </button>
                </div>
            </div>

            <div className="p-2 space-y-1">
                {/* AI / Help specialized info */}
                {activeRoom.type === 'bot' && (
                    <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 mb-2">
                        <div className="flex items-center space-x-2 text-purple-700 mb-2">
                            <Info size={16} />
                            <span className="text-[13px] font-bold">Giới thiệu LinkUp AI</span>
                        </div>
                        <p className="text-[12px] text-purple-600/80 leading-relaxed font-medium">
                            Tôi là trợ lý AI thông minh tích hợp sẵn trong LinkUp. Bạn có thể hỏi tôi về bất cứ điều gì, tóm tắt tin nhắn hoặc yêu cầu hỗ trợ kỹ thuật.
                        </p>
                    </div>
                )}

                {activeRoom.type === 'support' && (
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-2">
                        <div className="flex items-center space-x-2 text-blue-700 mb-2">
                            <ShieldAlert size={16} />
                            <span className="text-[13px] font-bold">Trạng thái hỗ trợ</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-gray-500">Mã yêu cầu:</span>
                                <span className="text-[12px] font-black text-gray-700">#{currentUser?.id?.slice(-6).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-gray-500">Tình trạng:</span>
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                    activeRoom.support_status === 'waiting' ? "bg-amber-100 text-amber-700" :
                                    activeRoom.support_status === 'resolved' ? "bg-green-100 text-green-700" :
                                    "bg-blue-100 text-blue-700"
                                )}>
                                    {activeRoom.support_status === 'waiting' ? 'Đang chờ' :
                                     activeRoom.support_status === 'resolved' ? 'Đã xong' : 'Đang xử lý'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customization section for Groups (Chỉ Admin/Owner thấy) */}
                {isGroup && !isSpecialRoom && isAdminOfRoom && (
                    <div className="rounded-xl overflow-hidden">
                        <button 
                            onClick={() => toggleSection('customization')}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Settings size={16} />
                                </div>
                                <span className="text-[14px] font-bold text-gray-700">Cài đặt nhóm</span>
                            </div>
                            <ChevronRight size={16} className={clsx("text-gray-400 transition-transform", expandedSections.customization && "rotate-90")} />
                        </button>
                        {expandedSections.customization && (
                            <div className="px-11 pb-3 space-y-2 animate-in slide-in-from-top-1">
                                <button 
                                    onClick={handleRenameRoom}
                                    className="w-full text-left text-[13px] text-gray-600 hover:text-blue-600 font-medium py-1 transition-colors flex items-center space-x-2"
                                >
                                    <Edit2 size={14} />
                                    <span>Đổi tên nhóm</span>
                                </button>
                                <button 
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="w-full text-left text-[13px] text-gray-600 hover:text-blue-600 font-medium py-1 transition-colors flex items-center space-x-2"
                                >
                                    <Camera size={14} />
                                    <span>Thay đổi ảnh nhóm</span>
                                </button>
                                <input 
                                    type="file" 
                                    ref={avatarInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleUpdateAvatar} 
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Members Section for Groups */}
                {isGroup && !isSpecialRoom && (
                    <div className="rounded-xl overflow-hidden">
                        <button 
                            onClick={() => toggleSection('members')}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Users size={16} />
                                </div>
                                <span className="text-[14px] font-bold text-gray-700">Thành viên ({roomMembers.length})</span>
                            </div>
                            <ChevronRight size={16} className={clsx("text-gray-400 transition-transform", expandedSections.members && "rotate-90")} />
                        </button>
                        {expandedSections.members && (
                            <div className="px-3 pb-3 space-y-0.5 animate-in slide-in-from-top-1">
                                {isAdminOfRoom && (
                                    <button 
                                        onClick={() => setIsAddMemberModalOpen(true)}
                                        className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group text-blue-600"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-dashed border-blue-200">
                                            <UserPlus size={16} />
                                        </div>
                                        <span className="text-[13px] font-bold">Thêm thành viên</span>
                                    </button>
                                )}
                                {[...roomMembers].sort((a, b) => {
                                    const roleWeight = { 'owner': 0, 'admin': 1, 'member': 2 };
                                    return (roleWeight[a.role as keyof typeof roleWeight] ?? 3) - 
                                           (roleWeight[b.role as keyof typeof roleWeight] ?? 3);
                                }).map(member => {
                                    const currentUserMembership = roomMembers.find(m => m.id === currentUser?.id);
                                    const isOwner = currentUserMembership?.role === 'owner' || currentUser?.is_superuser;
                                    const isAdmin = currentUserMembership?.role === 'admin' || isOwner;
                                    const isSelf = member.id === currentUser?.id;
                                    
                                    return (
                                        <div 
                                            key={member.id} 
                                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-all group relative"
                                            onClick={() => setViewingUser(member)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Avatar name={member.full_name || member.username} url={member.avatar_url} size="sm" isOnline={member.is_online} />
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[13px] font-bold text-gray-700 truncate max-w-[120px]">
                                                        {isSelf ? 'Bạn' : (member.full_name || member.username)}
                                                    </span>
                                                    <p className={clsx(
                                                        "text-[9px] uppercase font-black px-1.5 py-0.5 rounded w-fit",
                                                        member.role === 'owner' ? "bg-red-100 text-red-700" : 
                                                        member.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                                                    )}>
                                                        {member.role === 'owner' ? 'Trưởng nhóm' : 
                                                         member.role === 'admin' ? 'Phó nhóm' : 'Thành viên'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Thao tác quản lý */}
                                            {!isSelf && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                                    {/* Chỉ Trưởng nhóm mới có quyền đổi Role */}
                                                    {isOwner && member.role !== 'owner' && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newRole = member.role === 'admin' ? 'member' : 'admin';
                                                                if (confirm(`Xác nhận ${newRole === 'admin' ? 'bổ nhiệm làm phó nhóm' : 'gỡ vai trò phó nhóm'} cho ${member.full_name || member.username}?`)) {
                                                                    changeMemberRole(activeRoom.id, member.id, newRole);
                                                                }
                                                            }}
                                                            className={clsx(
                                                                "p-1.5 rounded-lg transition-colors",
                                                                member.role === 'admin' ? "hover:bg-red-50 text-red-500" : "hover:bg-amber-50 text-amber-600"
                                                            )}
                                                            title={member.role === 'admin' ? "Gỡ phó nhóm" : "Bổ nhiệm phó nhóm"}
                                                        >
                                                            <ShieldAlert size={14} />
                                                        </button>
                                                    )}
                                                    
                                                    {/* Admin + Owner có thể mở menu quản lý member khác */}
                                                    {isAdmin && member.role !== 'owner' && (member.role !== 'admin' || isOwner) && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdown(activeDropdownId === `member-${member.id}` ? null : `member-${member.id}`);
                                                            }}
                                                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                                                        >
                                                            <MoreHorizontal size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            
                                                    {activeDropdownId === `member-${member.id}` && (
                                                <div className="absolute right-0 top-10 bg-white shadow-xl border border-gray-100 rounded-xl py-1.5 z-50 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDropdown(null);
                                                            if (confirm(`Bạn có chắc chắn muốn mời ${member.full_name || member.username} ra khỏi nhóm không?`)) {
                                                                removeMember(activeRoom.id, member.id);
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 font-bold flex items-center"
                                                    >
                                                        <Trash2 size={14} className="mr-2" />
                                                        Mời ra khỏi nhóm
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button 
                                    onClick={() => setIsAddMemberModalOpen(true)}
                                    className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-blue-600 font-bold text-[13px] mt-1"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                        <UserPlus size={16} />
                                    </div>
                                    <span>Thêm thành viên</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pinned Messages */}
                <div className="rounded-xl overflow-hidden">
                    <button 
                        onClick={() => toggleSection('pinned')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                <Pin size={16} />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[14px] font-bold text-gray-700">Tin nhắn đã ghim</span>
                                <span className="text-[11px] text-gray-400 font-medium">{messages.filter(m => m.is_pinned).length} tin nhắn</span>
                            </div>
                        </div>
                        <ChevronRight size={16} className={clsx("text-gray-400 transition-transform", expandedSections.pinned && "rotate-90")} />
                    </button>
                    {expandedSections.pinned && (
                        <div className="px-3 pb-3">
                            <button 
                                onClick={() => setViewingPinned(true)}
                                className="w-full py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[12px] font-bold text-gray-600 transition-colors"
                            >
                                Xem tất cả tin nhắn đã ghim
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-[1px] bg-gray-50 my-2 mx-4" />

                {/* Media Section */}
                <div className="px-3 py-1">
                    <button 
                        onClick={() => toggleSection('photos')}
                        className="w-full flex items-center justify-between mb-3 group"
                    >
                        <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Ảnh đã chia sẻ</span>
                        <ChevronRight size={14} className={clsx("text-gray-400 transition-transform", expandedSections.photos && "rotate-90")} />
                    </button>
                        {expandedSections.photos && (
                        <div className="space-y-4 animate-in duration-200 fade-in">
                            <div className="grid grid-cols-3 gap-1">
                                {mediaMessages.length > 0 ? mediaMessages.slice(0, 6).map((m, idx) => {
                                    const authUrl = m.file_url?.startsWith('/api/v1/files/download/') 
                                        ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${m.file_url}${m.file_url.includes('?') ? '&' : '?'}token=${token}`
                                        : (m.file_url?.startsWith('http') ? m.file_url : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${m.file_url}`);
                                    
                                    return (
                                        <div 
                                            key={m.id} 
                                            onClick={() => window.open(authUrl, '_blank')}
                                            className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 cursor-pointer border border-gray-100 relative group/img shadow-sm"
                                        >
                                            <img src={authUrl} className="w-full h-full object-cover" alt={m.file_name || "Media"} />
                                            {idx === 5 && mediaMessages.length > 6 && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[14px] font-black">
                                                    +{mediaMessages.length - 6}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-3 py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <ImageIcon size={20} className="text-gray-300 mx-auto mb-2" />
                                        <span className="text-[11px] text-gray-400 font-medium">Chưa có ảnh nào</span>
                                    </div>
                                )}
                            </div>
                            {mediaMessages.length > 6 && (
                                <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[12px] font-bold text-gray-500 transition-colors">
                                    Xem tất cả ảnh/video
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Files Section */}
                <div className="px-3 py-1">
                    <button 
                        onClick={() => toggleSection('files')}
                        className="w-full flex items-center justify-between mb-2 group"
                    >
                        <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">File đã chia sẻ</span>
                        <ChevronRight size={14} className={clsx("text-gray-400 transition-transform", expandedSections.files && "rotate-90")} />
                    </button>
                    {expandedSections.files && (
                        <div className="space-y-1 animate-in duration-200 fade-in">
                            {fileMessages.length > 0 ? (
                                <>
                                    {fileMessages.slice(0, 5).map(m => {
                                        const authUrl = m.file_url?.startsWith('/api/v1/files/download/') 
                                            ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${m.file_url}${m.file_url.includes('?') ? '&' : '?'}token=${token}`
                                            : (m.file_url?.startsWith('http') ? m.file_url : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${m.file_url}`);
                                        
                                        return (
                                            <button 
                                                key={m.id} 
                                                onClick={() => window.open(authUrl, '_blank')}
                                                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold text-gray-700 truncate">
                                                        {m.file_name || m.file_url?.split('/').pop() || 'Tài liệu.pdf'}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tighter">
                                                        {new Date(m.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {fileMessages.length > 5 && (
                                        <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[12px] font-bold text-gray-500 transition-colors mt-2">
                                            Xem tất cả tệp tin ({fileMessages.length})
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <span className="text-[11px] text-gray-400 font-medium italic">Không có tệp tin</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Shared Links Section */}
                <div className="px-3 py-1">
                    <button 
                        onClick={() => toggleSection('links')}
                        className="w-full flex items-center justify-between mb-2 group"
                    >
                        <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Link đã chia sẻ</span>
                        <ChevronRight size={14} className={clsx("text-gray-400 transition-transform", expandedSections.links && "rotate-90")} />
                    </button>
                    {expandedSections.links && (
                        <div className="space-y-1 animate-in duration-200 fade-in">
                            {linkMessages.length > 0 ? (
                                <>
                                    {linkMessages.slice(0, 5).map(m => {
                                        const links = m.content.match(linkRegex);
                                        const firstLink = links ? links[0] : '';
                                        return (
                                            <button 
                                                key={`link-${m.id}`} 
                                                onClick={() => window.open(firstLink, '_blank')}
                                                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <Info size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold text-gray-700 truncate">
                                                        {firstLink}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tighter">
                                                        {new Date(m.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <span className="text-[11px] text-gray-400 font-medium italic">Không có liên kết</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-[1px] bg-gray-50 my-6 mx-4" />

                {/* Danger Zone */}
                <div className="px-2 pb-8 space-y-1">
                    {activeRoom.type === 'bot' ? (
                        <button 
                            onClick={() => setShowClearConfirm(true)}
                            className="w-full flex items-center space-x-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-[14px] group"
                        >
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                                <Trash2 size={16} />
                            </div>
                            <span>Làm mới hội thoại AI</span>
                        </button>
                    ) : activeRoom.type === 'support' ? (
                        <button 
                            className="w-full flex items-center space-x-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors font-bold text-[14px] group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors shrink-0">
                                <Archive size={16} />
                            </div>
                            <span>Lưu trữ yêu cầu</span>
                        </button>
                    ) : (
                        <>
                            {activeRoom.type === 'direct' ? (
                                <button 
                                    onClick={() => toast.error("Tính năng chặn đang bảo trì")}
                                    className="w-full flex items-center space-x-3 p-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors font-bold text-[14px] group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors shrink-0">
                                        <BellOff size={16} />
                                    </div>
                                    <span>Tắt thông báo</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setShowLeaveConfirm(true)}
                                    className="w-full flex items-center space-x-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-[14px] group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                                        <LogOut size={16} />
                                    </div>
                                    <span>Rời khỏi nhóm</span>
                                </button>
                            )}
                            <button 
                                onClick={() => setShowClearConfirm(true)}
                                className="w-full flex items-center space-x-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-[14px] group"
                            >
                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                                    <Trash2 size={16} />
                                </div>
                                <span>Xóa lịch sử trò chuyện</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      </aside>
    );
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden select-none">
      <Sidebar 
        rooms={rooms} 
        activeRoomId={activeRoom?.id || ''} 
        onSelectRoom={setActiveRoom}
        onRoomCreated={fetchRooms}
        onNavigateToAdmin={onNavigateToAdmin}
      />

      <ForwardModal />

      <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {viewingUser ? (
          <ProfileView 
            user={viewingUser} 
            onBack={() => setViewingUser(null)} 
          />
        ) : !activeRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]">
            <div className="w-32 h-32 bg-blue-600 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-100 dark:shadow-none transform -rotate-6 animate-in zoom-in duration-500">
                <MessageCircle size={64} className="text-white fill-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Chào mừng bạn đến với LinkUp</h2>
            <p className="text-slate-500 dark:text-[#b0b3b8] font-medium max-w-sm text-center text-lg leading-relaxed">
                Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
             {/* Main Chat Content */}
             <div className="flex-1 flex flex-col relative bg-white dark:bg-[#1a1a1a] overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-[64px] border-b border-gray-100 dark:border-[#3e4042] px-4 flex items-center justify-between bg-white/90 dark:bg-[#242526]/90 backdrop-blur-md z-[50] shadow-sm shrink-0 sticky top-0">
                  <div 
                    className="flex items-center space-x-2 px-2 py-1"
                  >
                    <Avatar 
                        name={activeRoom.name} 
                        url={activeRoom.avatar_url}
                        isBot={activeRoom.type === 'bot'}
                        isOnline={activeRoom.type === 'bot' ? true : (activeRoom.is_online && !activeRoom.blocked_by_other && !(activeRoom.other_user_id && currentUser?.blocked_users?.includes(activeRoom.other_user_id)))} 
                        size="md" 
                    />
                    <div>
                      <div className="flex items-center">
                        <h1 className="text-[16px] font-bold text-black dark:text-white leading-tight">
                          {activeRoom.name}
                        </h1>
                        {activeRoom.type === 'community' && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded uppercase tracking-wider">Cộng đồng</span>
                        )}
                        {activeRoom.type === 'group' && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded uppercase tracking-wider">Nhóm kín</span>
                        )}
                        {activeRoom.type === 'direct' && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded uppercase tracking-wider">Cá nhân</span>
                        )}
                        {activeRoom.type === 'bot' && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded uppercase tracking-wider">Trợ lý AI</span>
                        )}
                        {activeRoom.type === 'support' && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded uppercase tracking-wider">Hệ thống</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        {activeRoom.type === 'support' ? (
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            {activeRoom.support_status === 'waiting' ? (
                                <>
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                                    <span className="text-[11px] text-amber-600 font-bold uppercase tracking-tight">Đợi Admin tiếp nhận</span>
                                </>
                            ) : activeRoom.support_status === 'resolved' ? (
                                <>
                                    <CheckCircle size={10} className="text-emerald-500" />
                                    <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-tight">Vấn đề đã xong</span>
                                </>
                            ) : (
                                <>
                                    <Bot size={10} className="text-blue-500" />
                                    <span className="text-[11px] text-blue-600 font-bold uppercase tracking-tight">AI đang hỗ trợ</span>
                                </>
                            )}
                          </div>
                        ) : (
                          <p className="text-[12px] text-gray-500 font-normal mt-0.5">
                            {activeRoom.blocked_by_other 
                              ? '' 
                              : (activeRoom.type === 'bot' || (activeRoom.is_online && !activeRoom.blocked_by_other && !(activeRoom.other_user_id && currentUser?.blocked_users?.includes(activeRoom.other_user_id)))) ? 'Đang hoạt động' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                        className={clsx(
                            "p-2.5 rounded-lg transition-colors hidden sm:flex",
                            searchQuery ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
                        )}
                        title="Tìm kiếm tin nhắn"
                    >
                        <SearchIcon size={20} />
                    </button>
                    <button 
                        onClick={() => setIsInfoOpen(!isInfoOpen)}
                        className={clsx(
                            "p-2.5 rounded-lg transition-colors",
                            isInfoOpen ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"
                        )}
                        title="Thông tin hội thoại"
                    >
                        <PanelRight size={20} />
                    </button>
                  </div>
                </header>

                {/* Pinned Marker */}
                {messages.some(m => m.is_pinned && !m.is_recalled) && (
                    <div className="bg-blue-50/50 border-b border-blue-100 flex items-center justify-between px-4 py-1.5 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center space-x-2 overflow-hidden flex-1 cursor-pointer group"
                            onClick={() => {
                                const pinnedMessages = messages.filter(m => m.is_pinned && !m.is_recalled);
                                if (pinnedMessages.length === 1) {
                                    document.getElementById(`msg-${pinnedMessages[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                } else {
                                    setViewingPinned(true);
                                }
                            }}
                        >
                            <Pin size={12} className="text-blue-500 fill-blue-500 shrink-0" />
                            <div className="text-[12px] text-blue-700 truncate group-hover:underline flex items-center">
                                <span className="font-semibold mr-1 shrink-0">Đã ghim:</span>
                                {(() => {
                                    const m = messages.find(msg => msg.is_pinned && !msg.is_recalled);
                                    if (!m) return null;
                                    if (m.file_type === 'image') return <span className="flex items-center italic"><ImageIcon size={12} className="mr-1 inline" /> [Hình ảnh]</span>;
                                    if (m.file_type === 'file') return <span className="flex items-center italic"><FileText size={12} className="mr-1 inline" /> {m.file_name || 'Tệp tin'}</span>;
                                    return m.content;
                                })()}
                            </div>
                        </div>
                        <div className="flex items-center">
                            {messages.filter(m => m.is_pinned && !m.is_recalled).length === 1 && (
                                <button 
                                    onClick={() => {
                                        const pinned = messages.find(m => m.is_pinned && !m.is_recalled);
                                        if (pinned) pinMessage(pinned.id);
                                    }}
                                    className="p-1 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600 transition-colors mr-1"
                                    title="Bỏ ghim"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            {messages.filter(m => m.is_pinned && !m.is_recalled).length > 1 && (
                                <span 
                                    onClick={() => setViewingPinned(true)}
                                    className="text-[11px] text-blue-600 font-bold whitespace-nowrap ml-2 bg-blue-100 hover:bg-blue-200 cursor-pointer px-2 py-0.5 rounded-full transition-colors"
                                >
                                    +{messages.filter(m => m.is_pinned && !m.is_recalled).length - 1} khác
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <main ref={mainRef} className="flex-1 overflow-y-auto px-4 custom-scrollbar bg-[#F9FAFB]/50">
                  <div className="max-w-4xl mx-auto flex flex-col min-h-full pt-10 pb-4">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-500 max-w-sm mx-auto text-center">
                        <div className="mb-6 relative">
                          <Avatar name={activeRoom.name} url={activeRoom.avatar_url} size="xl" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                           <h3 className="text-xl font-bold text-black dark:text-white">{activeRoom.name}</h3>
                           {activeRoom.type === 'community' && (
                             <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded uppercase tracking-wider">Cộng đồng</span>
                           )}
                           {activeRoom.type === 'group' && (
                             <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded uppercase tracking-wider">Nhóm kín</span>
                           )}
                           {activeRoom.type === 'bot' && (
                             <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded uppercase tracking-wider">Trợ lý AI</span>
                           )}
                        </div>
                        <div className="max-w-xs mt-3">
                          <p className="text-gray-500 text-[14px] px-2 leading-relaxed">
                            {activeRoom.type === 'bot' 
                              ? "Chào bạn! Tôi là LinkUp AI. Hôm nay tôi có thể giúp gì cho bạn không?"
                              : activeRoom.type === 'direct' 
                              ? `Hãy gửi một lời chào để bắt đầu kết nối với ${activeRoom.name}!`
                              : `Chào mừng bạn đến với nhóm ${activeRoom.name}!`}
                          </p>
                        </div>
                        <button 
                          onClick={() => document.querySelector('textarea')?.focus()}
                          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-[14px] hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"
                        >
                          Bắt đầu trò chuyện
                        </button>
                      </div>
                    ) : (
                        <div className="flex flex-col">
                            {renderMessages()}
                        </div>
                    )}
                    
                    {/* Typing Indicators */}
                    {activeRoom && aiTypingRooms[activeRoom.id] && !messages.some(m => m.isBot && m.isStreaming) && (
                        <div className="flex items-end space-x-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold shadow-sm shrink-0">
                                AI
                            </div>
                            <div className="bg-[#F0F2F5] px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-duration:0.8s]" />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}

                    {activeRoom && typingUsers[activeRoom.id] && Object.keys(typingUsers[activeRoom.id]).length > 0 && (
                        <div className="flex items-center space-x-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ml-9">
                            <div className="bg-[#F0F2F5] px-3 py-1.5 rounded-2xl shadow-sm flex items-center space-x-2">
                                <div className="flex space-x-1">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-duration:0.8s]" />
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                                </div>
                                <span className="text-[12px] text-gray-500 font-medium italic">
                                    {Object.values(typingUsers[activeRoom.id])[0]}{Object.keys(typingUsers[activeRoom.id]).length > 1 ? ` và ${Object.keys(typingUsers[activeRoom.id]).length - 1} người khác` : ''} đang soạn tin...
                                </span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-4" />
                  </div>
                </main>

                {/* Sub-Views (Pinned/Search) */}
                {isViewingPinned && (
                    <div className="absolute inset-0 bg-white z-50 animate-in slide-in-from-bottom duration-300 flex flex-col">
                        <div className="h-[64px] border-b border-gray-100 px-4 flex items-center justify-between bg-white shrink-0 shadow-sm relative z-10">
                            <h2 className="text-lg font-black flex items-center text-slate-800">
                                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                    <Pin size={20} className="text-blue-600 fill-blue-600" />
                                </div>
                                Danh sách tin nhắn đã ghim
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full font-bold">
                                    {messages.filter(m => m.is_pinned && !m.is_recalled).length}
                                </span>
                            </h2>
                            <button 
                                onClick={() => setViewingPinned(false)}
                                className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors font-bold text-sm"
                            >
                                <span>Đóng</span>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
                            <div className="max-w-2xl mx-auto space-y-4 py-4">
                            {messages.filter(m => m.is_pinned && !m.is_recalled).length === 0 ? (
                                <p className="text-center text-gray-500 mt-10">Chưa có tin nhắn nào được ghim</p>
                            ) : (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {messages.filter(m => m.is_pinned && !m.is_recalled).map(msg => {
                                        const linkRegex = /(https?:\/\/[^\s]+)/g;
                                        const links = msg.content?.match(linkRegex);
                                        
                                        return (
                                            <div 
                                                key={`pinned-${msg.id}`} 
                                                onClick={() => {
                                                    setViewingPinned(false);
                                                    document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }}
                                                className="p-4 bg-[#F0F7FF] border border-blue-100 rounded-2xl cursor-pointer hover:bg-[#E1EFFF] transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                                                            {msg.senderName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-blue-800">{msg.senderName}</p>
                                                            <p className="text-[10px] text-blue-500 uppercase font-medium">{formatChatTime(msg.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pinMessage(msg.id);
                                                            }}
                                                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors group/unpin"
                                                            title="Bỏ ghim"
                                                        >
                                                            <Pin size={14} className="fill-blue-500 text-blue-500 group-hover:fill-transparent" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="pl-10">
                                                    {msg.file_type === 'image' ? (
                                                        <div className="rounded-xl overflow-hidden border border-blue-200 bg-white max-w-sm">
                                                            <img 
                                                                src={getAuthenticatedUrl(msg.file_url)} 
                                                                alt="Pinned" 
                                                                className="w-full h-auto max-h-[200px] object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Image+Unavailable';
                                                                }}
                                                            />
                                                            <div className="p-2 bg-white/80 backdrop-blur-sm border-t border-blue-100 flex items-center">
                                                                <ImageIcon size={14} className="text-blue-500 mr-2" />
                                                                <span className="text-[12px] text-gray-600 truncate">{msg.file_name || 'Hình ảnh'}</span>
                                                            </div>
                                                        </div>
                                                    ) : msg.file_type === 'file' ? (
                                                        <div className="flex items-center p-3 bg-white rounded-xl border border-blue-100 hover:border-blue-300 transition-colors shadow-sm">
                                                            <div className="p-2.5 bg-blue-50 rounded-lg mr-3 shrink-0">
                                                                <FileIcon size={24} className="text-blue-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900 truncate">{msg.file_name || 'Tệp tin'}</p>
                                                                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Tệp đính kèm</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                            {links && links.length > 0 && (
                                                                <div className="space-y-1 mt-2">
                                                                    {links.map((link, i) => (
                                                                        <a 
                                                                            key={i}
                                                                            href={link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="flex items-center p-2 bg-white border border-blue-100 rounded-lg text-[13px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors group/link"
                                                                        >
                                                                            <ExternalLink size={14} className="mr-2 shrink-0" />
                                                                            <span className="truncate flex-1 font-medium">{link}</span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            </div> 
                        </div>
                    </div>
                )}

                {searchQuery && (
                    <div className="absolute inset-0 top-[64px] bg-white z-[60] animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="h-[50px] border-b border-gray-100 px-4 flex items-center space-x-4 shrink-0 bg-gray-50/50">
                            <div className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-1.5 flex items-center transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                                <SearchIcon size={16} className="text-gray-400 mr-2" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Tìm kiếm tin nhắn..."
                                    value={searchQuery === ' ' ? '' : searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchMessages(e.target.value);
                                    }}
                                    className="bg-transparent border-none focus:ring-0 text-sm w-full h-8"
                                />
                                {searchQuery.trim() && (
                                    <button onClick={() => {setSearchQuery(' '); searchMessages('');}} className="text-gray-400 hover:text-gray-600">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="text-[13px] font-bold text-blue-600 hover:text-blue-700 px-2"
                            >
                                Đóng
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {searchResults.length === 0 ? (
                                <div className="text-center py-20 text-gray-500">
                                    {searchQuery.trim() ? "Không tìm thấy kết quả" : "Nhập để tìm kiếm tin nhắn"}
                                </div>
                            ) : (
                                <div className="space-y-2 max-w-2xl mx-auto">
                                    <p className="text-[13px] font-semibold text-gray-500 px-2 uppercase tracking-wider">Kết quả tìm kiếm ({searchResults.length})</p>
                                    {searchResults.map(msg => (
                                        <div 
                                            key={`search-${msg.id}`} 
                                            onClick={() => {
                                                setSearchQuery('');
                                                document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}
                                            className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer border-b border-gray-50 last:border-none group"
                                        >
                                            <div className="flex justify-between items-start mb-0.5">
                                                <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{msg.senderName}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">{formatChatTime(msg.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="px-4 pb-4">
                    {activeRoom.id !== 'general' && aiSuggestion && (
                        <div className="mb-2 p-3 bg-purple-50 border border-purple-100 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                     <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                                     <span className="text-[12px] font-bold text-purple-700 uppercase tracking-tight">LinkUp AI gợi ý</span>
                                </div>
                                <button onClick={clearSuggestion} className="text-gray-400 hover:text-gray-600">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="text-[14px] text-gray-700 mb-3 line-clamp-3">{aiSuggestion.content}</div>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => {
                                        sendMessage(aiSuggestion.content);
                                        clearSuggestion();
                                    }}
                                    className="flex-1 py-1.5 bg-purple-600 text-white rounded-lg text-[13px] font-bold"
                                >
                                    Gửi ngay
                                </button>
                                <button onClick={clearSuggestion} className="px-4 py-1.5 bg-white border rounded-lg text-[13px]">Xóa</button>
                            </div>
                        </div>
                    )}
                    <ChatInput onSendMessage={sendMessage} />
                </div>
             </div>
             
             {/* Right Info Sidebar */}
             {renderInfoPanel()}
          </div>
        )}
      </div>

      <AddMemberModal 
        isOpen={isAddMemberModalOpen} 
        onClose={() => setIsAddMemberModalOpen(false)} 
        onAdd={handleAddMembers}
        existingMemberIds={roomMembers.map(m => m.id)}
      />

      <ConfirmModal 
        isOpen={showClearConfirm}
        title="Xóa lịch sử"
        message="Xác nhận xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác."
        onConfirm={() => {
            if (activeRoom) {
                clearHistory(activeRoom.id);
                toast.success("Đã xóa lịch sử trò chuyện");
            }
            setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <ConfirmModal 
        isOpen={showLeaveConfirm}
        title="Rời khỏi trò chuyện"
        message="Xác nhận rời khỏi hoặc xóa cuộc trò chuyện này?"
        onConfirm={async () => {
            if (activeRoom) {
                await deleteRoom(activeRoom.id);
                toast.success("Đã rời khỏi cuộc trò chuyện");
                setActiveRoom(rooms.find(r => r.id !== activeRoom.id) || null);
            }
            setShowLeaveConfirm(false);
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
};
