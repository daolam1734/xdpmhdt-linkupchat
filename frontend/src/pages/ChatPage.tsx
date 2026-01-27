import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/useChatStore';
import { MessageItem } from '../components/chat/MessageItem';
import { ChatInput } from '../components/chat/ChatInput';
import { Sidebar } from '../components/layout/Sidebar';
import { ProfileView } from '../components/chat/ProfileView';
import { ForwardModal } from '../components/chat/ForwardModal';
import { Avatar } from '../components/common/Avatar';
import { 
    Info, LogOut, Pin, Search, Trash2, 
    BellOff, Flag, X, MessageCircle,
    Headset, Bot, AlertCircle, CheckCircle,
    MoreHorizontal, ChevronRight, Image as ImageIcon,
    FileText, UserPlus, Bell, Settings,
    Search as SearchIcon, Users, User
} from 'lucide-react';
import { formatChatTime } from '../utils/time';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { clsx } from 'clsx';

interface ChatPageProps {
    onNavigateToAdmin?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigateToAdmin }) => {
  const { 
    messages, 
    rooms,
    activeRoom,
    setActiveRoom,
    logout,
    sendMessage,
    currentUser,
    fetchRooms
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
    roomMembers
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [lastScrolledRoomId, setLastScrolledRoomId] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    customization: false,
    members: true,
    pinned: false,
    photos: true,
    files: true
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

  // Handle scrolling: initial load (to unread or bottom) and new messages
  useEffect(() => {
    if (!activeRoom?.id || messages.length === 0) {
      if (!activeRoom?.id) setLastScrolledRoomId(null);
      return;
    }

    // CASE 1: Initial load for this room
    if (lastScrolledRoomId !== activeRoom.id) {
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
        
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        setLastScrolledRoomId(activeRoom.id);
        return;
    }

    // CASE 2: New messages arriving while already in the room
    if (!mainRef.current) return;
    
    const container = mainRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
    const lastMessage = messages[messages.length - 1];
    const isMyMessage = lastMessage?.senderId === currentUser?.id || lastMessage?.senderName === currentUser?.username;

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
                <div key={`date-${item.date}`} className="flex justify-center my-6 sticky top-2 z-10">
                    <span className="bg-gray-100/80 backdrop-blur-md text-gray-500 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-gray-200/50">
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
                showAvatar={!item.message.isBot && !item.isLast}
                showName={item.isFirst}
                isLatest={idx === grouped.length - 1}
            />
        );
    });
  };

  const renderInfoPanel = () => {
    if (!activeRoom) return null;

    const mediaMessages = messages.filter(m => m.file_url && m.file_type === 'image');
    const fileMessages = messages.filter(m => m.file_url && m.file_type === 'file');

    return (
      <aside className={clsx(
        "w-[320px] border-l border-gray-100 bg-white flex flex-col transition-all duration-300 overflow-hidden shrink-0 h-full",
        !isInfoOpen && "w-0 border-l-0"
      )}>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Header profile info */}
            <div className="flex flex-col items-center py-8 px-4 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="relative mb-4">
                    <Avatar 
                        name={activeRoom.name} 
                        url={activeRoom.avatar_url}
                        isOnline={activeRoom.type === 'ai' ? true : (activeRoom.is_online && !activeRoom.blocked_by_other)} 
                        size="xl" 
                    />
                </div>
                <h2 className="text-[18px] font-black text-gray-900 text-center leading-tight">
                    {activeRoom.name}
                </h2>
                <div className="flex items-center mt-2 space-x-1">
                    <span className={clsx(
                        "w-2 h-2 rounded-full",
                        (activeRoom.is_online || activeRoom.type === 'ai') ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span className="text-[12px] text-gray-500 font-medium">
                        {activeRoom.type === 'ai' ? 'LinkUp AI Assistant' : 
                        activeRoom.type === 'direct' ? (activeRoom.is_online ? 'Đang hoạt động' : 'Ngoại tuyến') : 
                        `${roomMembers.length} thành viên`}
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
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Trang cá nhân</span>
                        </button>
                    ) : activeRoom.type !== 'ai' && (
                        <button 
                            onClick={() => toast.success("Tính năng thêm thành viên đang được phát triển")}
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
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">{isMuted ? 'Mở' : 'Tắt'} thông báo</span>
                    </button>
                </div>
            </div>

            <div className="p-2 space-y-1">
                {/* Customization section */}
                <div className="rounded-xl overflow-hidden">
                    <button 
                        onClick={() => toggleSection('customization')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Settings size={16} />
                            </div>
                            <span className="text-[14px] font-bold text-gray-700">Tùy chỉnh đoạn chat</span>
                        </div>
                        <ChevronRight size={16} className={clsx("text-gray-400 transition-transform", expandedSections.customization && "rotate-90")} />
                    </button>
                    {expandedSections.customization && (
                        <div className="px-11 pb-3 space-y-2 animate-in slide-in-from-top-1">
                            <button className="w-full text-left text-[13px] text-gray-600 hover:text-blue-600 font-medium py-1 transition-colors">Đổi tên đoạn chat</button>
                            <button className="w-full text-left text-[13px] text-gray-600 hover:text-blue-600 font-medium py-1 transition-colors">Thay đổi ảnh đại diện</button>
                        </div>
                    )}
                </div>

                {/* Members Section for Groups */}
                {(activeRoom.type === 'group' || activeRoom.type === 'public') && (
                    <div className="rounded-xl overflow-hidden">
                        <button 
                            onClick={() => toggleSection('members')}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Users size={16} />
                                </div>
                                <span className="text-[14px] font-bold text-gray-700">Thành viên nhóm ({roomMembers.length})</span>
                            </div>
                            <ChevronRight size={16} className={clsx("text-gray-400 transition-transform", expandedSections.members && "rotate-90")} />
                        </button>
                        {expandedSections.members && (
                            <div className="px-3 pb-3 space-y-0.5 animate-in slide-in-from-top-1">
                                {roomMembers.map(member => (
                                    <div 
                                        key={member.id} 
                                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                                        onClick={() => setViewingUser(member)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Avatar name={member.username} url={member.avatar_url} size="sm" isOnline={member.is_online} />
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-gray-700 truncate max-w-[120px]">
                                                    {member.id === currentUser?.id ? 'Bạn (Tôi)' : (member.full_name || member.username)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 uppercase font-black">{member.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</span>
                                            </div>
                                        </div>
                                        <MoreHorizontal size={14} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                                    </div>
                                ))}
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
                        <div className="grid grid-cols-3 gap-1 animate-in duration-200 fade-in">
                            {mediaMessages.length > 0 ? mediaMessages.slice(0, 6).map((m, idx) => (
                                <div 
                                    key={m.id} 
                                    onClick={() => window.open(m.file_url, '_blank')}
                                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 cursor-pointer border border-gray-100 relative group/img"
                                >
                                    <img src={m.file_url} className="w-full h-full object-cover" alt="Media" />
                                    {idx === 5 && mediaMessages.length > 6 && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[14px] font-black">
                                            +{mediaMessages.length - 6}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="col-span-3 py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <ImageIcon size={20} className="text-gray-300 mx-auto mb-2" />
                                    <span className="text-[11px] text-gray-400 font-medium">Chưa có ảnh nào</span>
                                </div>
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
                            {fileMessages.length > 0 ? fileMessages.slice(0, 3).map(m => (
                                <button 
                                    key={m.id} 
                                    onClick={() => window.open(m.file_url, '_blank')}
                                    className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-gray-700 truncate">
                                            {m.file_url?.split('/').pop() || 'Tài liệu.pdf'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tighter">
                                            {new Date(m.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            )) : (
                                <div className="py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <span className="text-[11px] text-gray-400 font-medium italic">Không có tệp tin</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-[1px] bg-gray-50 my-6 mx-4" />

                {/* Danger Zone */}
                <div className="px-2 pb-8 space-y-1">
                    {activeRoom.type === 'direct' ? (
                        <button 
                            onClick={() => toast.error("Tính năng chặn người dùng đang được bảo trì")}
                            className="w-full flex items-center space-x-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-[14px] group"
                        >
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                                <Flag size={16} />
                            </div>
                            <span>Chặn người dùng</span>
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
          <div className="flex-1 flex flex-col items-center justify-center bg-white">
            <div className="w-32 h-32 bg-blue-600 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-100 transform -rotate-6 animate-in zoom-in duration-500">
                <MessageCircle size={64} className="text-white fill-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Chào mừng bạn đến với LinkUp</h2>
            <p className="text-slate-500 font-medium max-w-sm text-center text-lg leading-relaxed">
                Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
             {/* Main Chat Content */}
             <div className="flex-1 flex flex-col relative bg-white overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-[60px] border-b border-gray-100 px-3 flex items-center justify-between bg-white/95 backdrop-blur-sm z-10 shadow-sm shrink-0">
                  <div 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-xl transition-colors"
                    onClick={() => setIsInfoOpen(!isInfoOpen)}
                  >
                    <Avatar 
                        name={activeRoom.name} 
                        url={activeRoom.avatar_url}
                        isOnline={activeRoom.type === 'ai' ? true : (activeRoom.is_online && !activeRoom.blocked_by_other && !(activeRoom.other_user_id && currentUser?.blocked_users?.includes(activeRoom.other_user_id)))} 
                        size="md" 
                    />
                    <div>
                      <h1 className="text-[16px] font-bold text-black leading-tight">
                        {activeRoom.name}
                      </h1>
                      <div className="flex items-center">
                        {activeRoom.id === 'help' ? (
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
                              : (activeRoom.type === 'ai' || (activeRoom.is_online && !activeRoom.blocked_by_other && !(activeRoom.other_user_id && currentUser?.blocked_users?.includes(activeRoom.other_user_id)))) ? 'Đang hoạt động' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                  </div>
                </header>

                {/* Pinned Marker */}
                {messages.some(m => m.is_pinned && !m.is_recalled) && (
                    <div className="bg-blue-50/50 border-b border-blue-100 flex items-center justify-between px-4 py-1.5 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center space-x-2 overflow-hidden flex-1 cursor-pointer group"
                            onClick={() => {
                                const pinned = messages.find(m => m.is_pinned && !m.is_recalled);
                                if (pinned) {
                                    document.getElementById(`msg-${pinned.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        >
                            <Pin size={12} className="text-blue-500 fill-blue-500 shrink-0" />
                            <div className="text-[12px] text-blue-700 truncate group-hover:underline">
                                <span className="font-semibold mr-1">Đã ghim:</span>
                                {messages.find(m => m.is_pinned && !m.is_recalled)?.content}
                            </div>
                        </div>
                        {messages.filter(m => m.is_pinned && !m.is_recalled).length > 1 && (
                            <span className="text-[11px] text-blue-600 font-medium whitespace-nowrap ml-2 bg-blue-100 px-1.5 rounded-full">
                                +{messages.filter(m => m.is_pinned && !m.is_recalled).length - 1} tin khác
                            </span>
                        )}
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
                        <h3 className="text-xl font-bold text-black">{activeRoom.name}</h3>
                        <div className="max-w-xs mt-3">
                          <p className="text-gray-500 text-[14px] px-2 leading-relaxed">
                            {activeRoom.id === 'ai' 
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
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 animate-in fade-in duration-200">
                        <div className="h-[60px] border-b border-gray-100 px-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center">
                                <Pin size={18} className="mr-2 text-blue-500 fill-blue-500" />
                                Tin nhắn đã ghim
                            </h2>
                            <button 
                                onClick={() => setViewingPinned(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                            {messages.filter(m => m.is_pinned && !m.is_recalled).length === 0 ? (
                                <p className="text-center text-gray-500 mt-10">Chưa có tin nhắn nào được ghim</p>
                            ) : (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {messages.filter(m => m.is_pinned && !m.is_recalled).map(msg => (
                                        <div 
                                            key={`pinned-${msg.id}`} 
                                            onClick={() => {
                                                setViewingPinned(false);
                                                document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}
                                            className="p-4 bg-blue-50 border border-blue-100 rounded-2xl cursor-pointer hover:bg-blue-100 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm text-blue-700">{msg.senderName}</span>
                                                <span className="text-[10px] text-blue-500">{formatChatTime(msg.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 line-clamp-3">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {searchQuery && (
                    <div className="absolute inset-0 bg-white z-30 animate-in slide-in-from-right duration-300">
                        <div className="h-[60px] border-b border-gray-100 px-4 flex items-center space-x-4">
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
                                <SearchIcon size={18} className="text-gray-400 mr-2" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Tìm kiếm tin nhắn..."
                                    value={searchQuery === ' ' ? '' : searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchMessages(e.target.value);
                                    }}
                                    className="bg-transparent border-none focus:ring-0 text-sm w-full"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar h-[calc(100vh-60px)]">
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
