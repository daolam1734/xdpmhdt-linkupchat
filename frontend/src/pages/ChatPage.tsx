import React, { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/useChatStore';
import { MessageItem } from '../components/chat/MessageItem';
import { ChatInput } from '../components/chat/ChatInput';
import { Sidebar } from '../components/layout/Sidebar';
import { Avatar } from '../components/common/Avatar';
import { Info, LogOut, Pin, Search, Trash2, BellOff, Flag, X, LayoutDashboard } from 'lucide-react';
import { formatChatTime } from '../utils/time';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/common/ConfirmModal';

interface ChatPageProps {
    onNavigateToAdmin?: () => void;
    onNavigateToForum?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigateToAdmin, onNavigateToForum }) => {
  const { 
    messages, 
    isConnected, 
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
    searchMessages,
    searchResults,
    searchQuery,
    setSearchQuery,
    isViewingPinned,
    setViewingPinned,
    isAiTyping
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      <Sidebar 
        rooms={rooms} 
        activeRoomId={activeRoom?.id || ''} 
        onSelectRoom={setActiveRoom}
        onRoomCreated={fetchRooms}
        onNavigateToForum={onNavigateToForum}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* Messenger Style Header */}
        <header className="h-[60px] border-b border-gray-100 px-3 flex items-center justify-between bg-white/95 backdrop-blur-sm z-10 shadow-sm">
          <div className="flex items-center space-x-2">
            {activeRoom && (
                <Avatar 
                    name={activeRoom.name} 
                    isOnline={activeRoom.type === 'ai' ? true : activeRoom.is_online} 
                    size="md" 
                />
            )}
            <div>
              <h1 className="text-[16px] font-bold text-black leading-tight">
                {activeRoom?.name || 'Đang tải...'}
              </h1>
              <p className="text-[12px] text-gray-500 font-normal">
                {(activeRoom?.type === 'ai' || activeRoom?.is_online) ? 'Đang hoạt động' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
             {/* Header More Menu */}
             <div className="relative group/headermenu">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors font-medium">
                    <Info size={20} />
                </button>
                
                <div className="absolute top-full right-0 mt-1 hidden group-hover/headermenu:block bg-white shadow-xl rounded-xl border border-gray-100 py-2 z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-[14px] font-bold text-gray-900">Tùy chỉnh đoạn chat</p>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setViewingPinned(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 text-[14px] text-gray-700 font-medium"
                    >
                        <Pin size={18} className="text-blue-500 fill-blue-500" />
                        <span>Xem tin nhắn đã ghim</span>
                    </button>

                    <button 
                        onClick={() => setSearchQuery(' ')}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 text-[14px] text-gray-700"
                    >
                        <Search size={18} className="text-gray-400" />
                        <span>Tìm kiếm tin nhắn</span>
                    </button>
                    
                    <button 
                        onClick={() => toggleMute()}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 text-[14px] text-gray-700"
                    >
                        {isMuted ? (
                            <>
                                <BellOff size={18} className="text-rose-500" />
                                <span className="text-rose-500">Bật thông báo</span>
                            </>
                        ) : (
                            <>
                                <BellOff size={18} className="text-gray-400" />
                                <span>Tắt thông báo</span>
                            </>
                        )}
                    </button>

                    <div className="h-[1px] bg-gray-100 my-1 mx-2" />
                    
                    <button 
                        onClick={() => {
                            if (activeRoom) {
                                setShowClearConfirm(true);
                            }
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 text-[14px] text-gray-700"
                    >
                        <Trash2 size={18} className="text-gray-400" />
                        <span>Xóa lịch sử trò chuyện</span>
                    </button>
                    
                    <button 
                        onClick={() => toast.success("Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xử lý sớm nhất có thể!")}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 text-[14px] text-red-500"
                    >
                        <Flag size={18} />
                        <span>Báo cáo sự cố</span>
                    </button>

                    <div className="h-[1px] bg-gray-100 my-1 mx-2" />
                    
                    {currentUser?.is_superuser && (
                        <button 
                            onClick={onNavigateToAdmin}
                            className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-indigo-50 text-[14px] text-indigo-600 font-semibold"
                        >
                            <LayoutDashboard size={18} />
                            <span>Trang quản trị hệ thống</span>
                        </button>
                    )}

                    <button 
                        onClick={() => logout()}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-rose-50 text-[14px] text-rose-600 font-medium"
                    >
                        <LogOut size={18} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
             </div>
          </div>
        </header>

        {/* Pinned Messages Area */}
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

        {/* Message Area */}
        <main className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto flex flex-col min-h-full">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-500">
                <Avatar name={activeRoom?.name || '?'} size="lg" />
                <h3 className="text-xl font-bold text-black mt-4">{activeRoom?.name}</h3>
                <p className="text-gray-500 text-sm mt-1">Các yêu cầu và tin nhắn mới sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
                <div className="space-y-0.5">
                    {messages.map((msg, idx) => {
                        const prevMsg = messages[idx - 1];
                        const nextMsg = messages[idx + 1];
                        
                        // Xác định xem tin nhắn này có cùng người gửi với tin trước/sau không
                        const isSameSenderAsPrev = prevMsg && 
                            (prevMsg.senderId === msg.senderId || prevMsg.senderName === msg.senderName) &&
                            !prevMsg.isBot && !msg.isBot;
                        
                        const isSameSenderAsNext = nextMsg && 
                            (nextMsg.senderId === msg.senderId || nextMsg.senderName === msg.senderName) &&
                            !nextMsg.isBot && !msg.isBot;

                        return (
                            <MessageItem 
                                key={msg.id || idx} 
                                message={msg} 
                                showAvatar={!isSameSenderAsNext && !msg.isBot}
                                showName={!isSameSenderAsPrev && !msg.isBot}
                                isFirst={!isSameSenderAsPrev}
                                isLast={!isSameSenderAsNext}
                                isLatest={idx === messages.length - 1}
                            />
                        );
                    })}
                </div>
            )}
            
            {/* AI Typing Indicator */}
            {isAiTyping && !messages.some(m => m.isBot && m.isStreaming) && (
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

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

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
                                    <div className="flex justify-between items-start mb-1" title="Xem vị trí">
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
                        <Search size={18} className="text-gray-400 mr-2" />
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
                            <p className="text-[13px] font-semibold text-gray-500 px-2">KẾT QUẢ TÌM KIẾM ({searchResults.length})</p>
                            {searchResults.map(msg => (
                                <div 
                                    key={`search-${msg.id}`} 
                                    onClick={() => {
                                        const originalMsg = messages.find(m => m.id === msg.id);
                                        if (originalMsg) {
                                            setSearchQuery('');
                                            document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        } else {
                                            toast.error("Tin nhắn này đã cũ, không thể chuyển hướng tới vị trí chính xác hiện tại.");
                                        }
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

        {/* Chat Input */}
        <div className="px-4 pb-4">
            {aiSuggestion && (
                <div className="mb-2 p-3 bg-purple-50 border border-purple-100 rounded-xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                             <span className="text-[12px] font-bold text-purple-700 uppercase tracking-tight">LinkUp AI gợi ý trả lời</span>
                        </div>
                        <button 
                            onClick={clearSuggestion}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <LogOut size={14} className="rotate-180" /> {/* Reusing Icon for brevity */}
                        </button>
                    </div>
                    <div className="text-[14px] text-gray-700 mb-3 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {aiSuggestion.content}
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => {
                                sendMessage(aiSuggestion.content);
                                clearSuggestion();
                            }}
                            disabled={aiSuggestion.isStreaming}
                            className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
                        >
                            {aiSuggestion.isStreaming ? 'Đang soạn...' : 'Gửi ngay'}
                        </button>
                        <button 
                            onClick={clearSuggestion}
                            className="px-4 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-[13px] font-medium transition-all"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            )}
            <ChatInput onSendMessage={sendMessage} />
        </div>
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
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

