import React, { useMemo, useState, useEffect } from 'react';
import type { Message } from '../../types/chat';
import { Avatar } from '../common/Avatar';
import { useViewStore } from '../../store/useViewStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { useAuthStore } from '../../store/useAuthStore';
import { formatChatTime } from '../../utils/time';
import { useChatStore } from '../../store/useChatStore';
import toast from 'react-hot-toast';
import { getUserProfile } from '../../api/users';
import { 
    Reply, 
    Edit2, 
    RotateCcw, 
    Pin, 
    MoreHorizontal,
    File as FileIcon,
    FileText,
    FileSpreadsheet,
    Music,
    Video,
    Archive,
    FilePieChart,
    Download,
    Copy,
    Trash2,
    Smile,
    ExternalLink,
    Sparkles,
    Check,
    CheckCheck,
    CircleDashed,
    X,
    Info,
    ThumbsUp,
    ThumbsDown,
    Share2,
    Save
} from 'lucide-react';
import api from '../../services/api';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText size={28} className="text-blue-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={28} className="text-green-500" />;
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music size={28} className="text-purple-500" />;
  if (['mp4', 'mov', 'avi'].includes(ext || '')) return <Video size={28} className="text-red-500" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <Archive size={28} className="text-yellow-600" />;
  if (['ppt', 'pptx'].includes(ext || '')) return <FilePieChart size={28} className="text-orange-500" />;
  return <FileIcon size={28} className="text-gray-500" />;
};

const getFileName = (url: string) => {
  const decoded = decodeURIComponent(url);
  return decoded.split('/').pop() || 'Tệp đính kèm';
};

interface MessageItemProps {
  message: Message;
  showAvatar?: boolean;
  showName?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isLatest?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
    message, 
    showAvatar = true, 
    showName = true,
    isFirst = true,
    isLast = true,
    isLatest = false
}) => {
  const { currentUser } = useAuthStore();
  const { 
    setReplyingTo, 
    setEditingMessage, 
    setForwardingMessage,
    recallMessage, 
    pinMessage, 
    deleteMessageForMe, 
    addReaction, 
    activeDropdownId, 
    setActiveDropdown,
    setViewingUser,
    reportMessage 
  } = useChatStore();
  const { setView } = useViewStore();
  
  const handleFeedback = async (type: 'like' | 'dislike') => {
    try {
        await api.post('/chat/ai/feedback', {
            message_id: message.id,
            feedback: type
        });
        toast.success("Cảm ơn phản hồi của bạn!");
    } catch (error) {
        toast.error("Không thể gửi phản hồi");
    }
  };

  const showMenu = activeDropdownId === `menu-${message.id}`;
  const showEmoji = activeDropdownId === `emoji-${message.id}`;
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('up');

  // Close menu on click outside
  useEffect(() => {
    if (!activeDropdownId) return;
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdownId, setActiveDropdown]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const menuId = `menu-${message.id}`;
    if (activeDropdownId !== menuId) {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuDirection(rect.top < 250 ? 'down' : 'up');
        setActiveDropdown(menuId);
    } else {
        setActiveDropdown(null);
    }
  };

  const handleToggleEmoji = (e: React.MouseEvent) => {
    e.stopPropagation();
    const emojiId = `emoji-${message.id}`;
    if (activeDropdownId !== emojiId) {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuDirection(rect.top < 250 ? 'down' : 'up');
        setActiveDropdown(emojiId);
    } else {
        setActiveDropdown(null);
    }
  };

  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(message.content);
  }, [message.content]);

  const isMe = useMemo(() => {
      if (message.isBot) return false;
      if (!currentUser) return false;
      return message.senderId === currentUser.id || message.senderName === currentUser.username;
  }, [message.senderId, message.senderName, currentUser, message.isBot]);

  // Messenger Style Corner Radii
  const bubbleRadius = useMemo(() => {
    if (isMe) {
        return clsx(
            "rounded-l-[22px]",
            isFirst ? "rounded-tr-[22px]" : "rounded-tr-[4px]",
            isLast ? "rounded-br-[22px]" : "rounded-br-[4px]"
        );
    } else {
        return clsx(
            "rounded-r-[22px]",
            isFirst ? "rounded-tl-[22px]" : "rounded-tl-[4px]",
            isLast ? "rounded-bl-[22px]" : "rounded-bl-[4px]"
        );
    }
  }, [isMe, isFirst, isLast]);

  return (
    <div
      id={`msg-${message.id}`}
      className={twMerge(
        'flex w-full animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out items-end space-x-2 px-4 scroll-mt-20',
        isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        isLast ? 'mb-4' : 'mb-[2px]'
      )}
    >
      <div className="w-9 shrink-0 flex flex-col items-center">
        {!isMe && showAvatar && (
            <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={async () => {
                    if (message.isBot) return;
                    try {
                        const profile = await getUserProfile(message.senderId);
                        setViewingUser(profile as any);
                    } catch (error) {
                        toast.error("Không thể tải thông tin người dùng");
                    }
                }}
            >
                <Avatar 
                    name={message.senderName} 
                    url={message.isBot ? undefined : message.senderAvatar} 
                    size="sm" 
                />
            </div>
        )}
      </div>
      
      <div className={clsx(
          "flex flex-col max-w-[75%] group",
          isMe ? "items-end" : "items-start"
      )}>
        {!isMe && showName && (
            <div 
                className="flex items-center space-x-1 ml-1 mb-1 cursor-pointer group/name"
                onClick={async () => {
                    if (message.isBot) return;
                    try {
                        const profile = await getUserProfile(message.senderId);
                        setViewingUser(profile as any);
                    } catch (error) {
                        toast.error("Không thể tải thông tin người dùng");
                    }
                }}
            >
                <span className="text-[11px] text-gray-500 font-bold group-hover/name:text-blue-500 transition-colors">
                    {message.senderName}
                </span>
                {message.isBot && (
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 text-[9px] text-white rounded-full font-black uppercase tracking-tighter shadow-sm">
                        AI
                    </span>
                )}
            </div>
        )}

        {/* Reply Preview */}
        {message.reply_to_id && !message.is_recalled && (
            <div 
                onClick={() => document.getElementById(`msg-${message.reply_to_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={clsx(
                "text-[12px] opacity-70 mb-[-8px] pb-3 px-3 pt-1.5 bg-gray-100/80 rounded-t-[18px] border-l-4 border-blue-500/50 max-w-[90%] truncate cursor-pointer hover:bg-gray-200/80 transition-all z-0",
                isMe ? "mr-1 items-end" : "ml-1 items-start"
            )}>
                <span className="text-[10px] font-bold text-blue-600/70 block mb-0.5">Đang trả lời:</span>
                <span className="italic">{message.reply_to_content || "Bản tin gốc không còn khả dụng"}</span>
            </div>
        )}

        <div className={clsx(
            "flex items-center z-10",
            isMe ? "flex-row-reverse" : "flex-row"
        )}>
            <div
                className={twMerge(
                'px-3 py-1.5 text-[15px] leading-snug font-normal relative transition-all',
                bubbleRadius,
                isMe
                    ? 'bg-blue-600 text-white shadow-sm'
                    : message.isBot 
                        ? 'bg-white text-slate-800 border-2 border-blue-100 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/5'
                        : 'bg-[#F0F2F5] text-black',
                message.is_recalled && 'bg-gray-100 text-gray-400 italic border border-gray-200'
                )}
            >
                {message.is_forwarded && (
                    <div className="flex items-center space-x-1 mb-1 opacity-70 italic text-[10px]">
                        <Share2 size={10} />
                        <span>Chuyển tiếp</span>
                    </div>
                )}
                <div className={twMerge(
                    "whitespace-pre-wrap",
                    message.isBot ? "prose prose-sm max-w-none prose-p:mb-2 prose-pre:rounded-xl prose-pre:bg-slate-900" : ""
                )}>
                    {message.is_recalled ? (
                        "Tin nhắn đã được thu hồi"
                    ) : (message.isBot && !message.content) ? (
                        <div className="flex items-center space-x-1.5 py-2 px-1">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-duration:0.8s]" />
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                        </div>
                    ) : message.isBot ? (
                        <div className="prose prose-sm max-w-none prose-purple">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({node, ...props}) => <p className="leading-relaxed mb-2 last:mb-0" {...props} />,
                                    code: ({node, inline, ...props}: any) => 
                                        inline ? 
                                        <code className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-mono text-[11px]" {...props} /> :
                                        <div className="relative group/code my-3">
                                            <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => navigator.clipboard.writeText(String(props.children))}
                                                    className="p-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-gray-400"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <pre className="bg-[#1e1e1e] text-purple-50 p-4 rounded-xl overflow-x-auto text-[12px] font-mono border border-white/5" {...props} />
                                        </div>,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-purple-900" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-base font-bold mb-1.5 text-purple-800" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-300 pl-4 py-1 my-2 italic text-gray-600 bg-purple-50/50 rounded-r" {...props} />
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                            <div className="mt-3 pt-2 border-t border-purple-100/50 flex flex-col gap-2">
                                <div className="flex items-center space-x-1.5 opacity-50">
                                    <Info size={10} className="text-purple-400" />
                                    <span className="text-[9px] font-medium text-purple-600 italic">
                                        LinkUp AI có thể đưa ra thông tin không chính xác. Hãy kiểm tra các phản hồi quan trọng.
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleFeedback('like')}
                                        className="p-1 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-500 transition-colors flex items-center gap-1"
                                        title="Hữu ích"
                                    >
                                        <ThumbsUp size={12} />
                                        <span className="text-[10px] font-bold">Hữu ích</span>
                                    </button>
                                    <button 
                                        onClick={() => handleFeedback('dislike')}
                                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                                        title="Không hữu ích"
                                    >
                                        <ThumbsDown size={12} />
                                        <span className="text-[10px] font-bold">Không hữu ích</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="tracking-tight">
                            {message.file_url && (
                                <div className={clsx(
                                    "mb-2 overflow-hidden",
                                    message.file_type === 'image' ? "rounded-lg" : "w-full"
                                )}>
                                    {message.file_type === 'image' ? (
                                        <div className="relative group/img cursor-pointer max-w-[320px] max-h-[400px] w-fit rounded-lg overflow-hidden"
                                             onClick={() => window.open(`${BASE_URL}${message.file_url}`, '_blank')}>
                                            <img 
                                                src={`${BASE_URL}${message.file_url}`} 
                                                alt="Đính kèm" 
                                                className="max-w-full max-h-full h-auto object-cover rounded-lg border border-black/5 hover:brightness-95 transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                        </div>
                                    ) : (
                                        <div className={clsx(
                                            "flex items-center space-x-3 p-3 rounded-xl border transition-all",
                                            isMe 
                                                ? "bg-white/10 border-white/20 hover:bg-white/20" 
                                                : "bg-white border-gray-100 hover:border-blue-200 shadow-sm text-gray-800 font-normal"
                                        )}>
                                            <div className={clsx(
                                                "p-2 rounded-lg flex items-center justify-center",
                                                isMe ? "bg-white/20" : "bg-gray-50"
                                            )}>
                                                {getFileIcon(getFileName(message.file_url || ''))}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={clsx(
                                                    "text-sm font-semibold truncate",
                                                    isMe ? "text-white" : "text-gray-800"
                                                )}>
                                                    {getFileName(message.file_url || '')}
                                                </p>
                                                <p className={clsx(
                                                    "text-[11px] font-medium",
                                                    isMe ? "text-blue-50" : "text-gray-500"
                                                )}>
                                                    Tải về để xem chi tiết
                                                </p>
                                            </div>
                                            <a 
                                                href={`${BASE_URL}${message.file_url}`} 
                                                target="_blank" 
                                                download
                                                className={clsx(
                                                    "p-2 rounded-full transition-all hover:scale-110",
                                                    isMe ? "hover:bg-white/20 text-white" : "hover:bg-gray-100 text-gray-500"
                                                )}
                                            >
                                                <Download size={20} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                            {message.shared_post && (
                                <div className={clsx(
                                    "mb-3 w-full max-w-[300px] overflow-hidden rounded-xl border transition-all hover:shadow-lg",
                                    isMe ? "bg-white/10 border-white/20" : "bg-gray-50 border-gray-200 shadow-sm"
                                )}>
                                    <div className="p-3">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <div className="p-1 px-2 bg-blue-600 rounded text-white shadow-sm flex items-center space-x-1">
                                                <Sparkles size={10} />
                                                <span className="text-[9px] font-black uppercase tracking-widest italic">LinkUp Share</span>
                                            </div>
                                        </div>
                                        <h4 className={clsx(
                                            "font-extrabold text-[15px] mb-1.5 leading-tight line-clamp-2",
                                            isMe ? "text-white" : "text-gray-900"
                                        )}>
                                            {message.shared_post.title}
                                        </h4>
                                        <p className={clsx(
                                            "text-[12px] mb-3 line-clamp-2 leading-relaxed opacity-80 italic",
                                            isMe ? "text-blue-50" : "text-gray-600"
                                        )}>
                                            "{message.shared_post.content}"
                                        </p>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                                            <div className="flex items-center space-x-1.5">
                                                <div className="w-5 h-5 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-[8px] text-white font-black">
                                                    {message.shared_post.author_name[0]}
                                                </div>
                                                <span className={clsx(
                                                    "text-[10px] font-bold",
                                                    isMe ? "text-blue-200" : "text-gray-500"
                                                )}>
                                                    {message.shared_post.author_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className={twMerge(
                                "prose prose-sm max-w-none break-words",
                                isMe 
                                    ? "prose-invert text-white prose-a:text-white prose-a:font-bold prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-50" 
                                    : "text-gray-800 prose-a:text-blue-600 prose-a:font-bold prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-700"
                            )}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {sanitizedContent}
                                </ReactMarkdown>
                            </div>
                            {message.is_edited && (
                                <span className="text-[10px] ml-1 opacity-60">(đã sửa)</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Reaction Display (Messenger Style) */}
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className={clsx(
                        "absolute -bottom-2 z-10 flex flex-wrap gap-0.5",
                        isMe ? "right-2 flex-row-reverse" : "left-2"
                    )}>
                        <div className="bg-white px-1.5 py-0.5 rounded-full shadow-md border border-gray-100 flex items-center space-x-1 animate-in zoom-in-50 duration-200">
                            {Object.entries(message.reactions).map(([emoji, users]) => (
                                <div key={emoji} className="flex items-center">
                                    <span className="text-[14px] leading-none">{emoji}</span>
                                    {users.length > 1 && (
                                        <span className="text-[10px] font-bold text-gray-400 ml-0.5">{users.length}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isMe && !message.is_recalled && (
                    <div className={clsx(
                        "flex items-center mt-1 mb-1",
                        isMe ? "justify-end mr-1" : "justify-start ml-1"
                    )}>
                        {message.status === 'sending' && (
                            <CircleDashed size={10} className="text-gray-400 animate-spin" />
                        )}
                        {message.status === 'sent' && (
                            <Check size={10} className="text-gray-400 border border-gray-400 rounded-full p-[1px]" />
                        )}
                        {message.status === 'delivered' && (
                            <CheckCheck size={12} className="text-gray-400" />
                        )}
                        {message.status === 'seen' && (
                            <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                                <CheckCheck size={8} className="text-white" />
                            </div>
                        )}
                    </div>
                )}
              
                {message.isStreaming && (
                    <div className="flex items-center space-x-1 mt-2 mb-1 ml-1 opacity-60">
                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-purple-600 font-medium italic">LinkUp AI đang soạn thảo...</span>
                    </div>
                )}
            </div>

            {/* Quick Actions (Zalo/Telegram Refined) */}
            {!message.is_recalled && !message.isBot && (
                <div className={clsx(
                    "flex transition-all items-center space-x-0.5 z-[60]",
                    (showMenu || showEmoji) ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    isMe ? "mr-2 flex-row-reverse space-x-reverse" : "ml-2 flex-row"
                )}>
                    {/* Reaction Icon */}
                    <div className="relative">
                        <button 
                            onClick={handleToggleEmoji}
                            className={clsx(
                                "p-1.5 rounded-full transition-all active:scale-90",
                                showEmoji ? "bg-gray-100 text-blue-600" : "hover:bg-gray-100 text-gray-400"
                            )}
                        >
                            <Smile size={18} />
                        </button>
                        
                        {/* Quick Emoji Picker (Zalo Style) */}
                        {showEmoji && (
                            <div className={clsx(
                                "absolute flex bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-white/20 p-1.5 z-[10000] space-x-1 animate-in fade-in zoom-in-95 duration-200 min-w-[240px] justify-center items-center",
                                menuDirection === 'up' ? "bottom-full mb-3" : "top-full mt-3",
                                isMe ? "right-0" : "left-0",
                                menuDirection === 'up' 
                                    ? (isMe ? "origin-bottom-right" : "origin-bottom-left")
                                    : (isMe ? "origin-top-right" : "origin-top-left")
                            )}>
                                {['❤️', '😆', '😮', '😢', '😠', '👍', '🔥', '🎉'].map(emoji => (
                                    <button 
                                        key={emoji} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addReaction(message.id, emoji);
                                            setActiveDropdown(null);
                                        }}
                                        className="hover:scale-150 active:scale-95 transition-all w-8 h-8 flex items-center justify-center text-xl leading-none hover:bg-gray-100/50 rounded-xl"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Reply Icon */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(message);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-500 transition-all active:scale-90"
                        title="Trả lời"
                    >
                        <Reply size={18} />
                    </button>
                    
                    {/* More Menu Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={handleToggleMenu}
                            className={clsx(
                                "p-1.5 rounded-full transition-all active:scale-90",
                                showMenu ? "bg-gray-100 text-blue-600" : "hover:bg-gray-100 text-gray-400"
                            )}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        
                        {/* Dropdown Content - Telegram/Zalo Refined Style */}
                        {showMenu && (
                            <div className={clsx(
                                "absolute bg-white/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl border border-gray-100/50 py-2 z-[9999] min-w-[200px] animate-in fade-in zoom-in-95 duration-150 overflow-hidden",
                                menuDirection === 'up' ? "bottom-full mb-3" : "top-full mt-3",
                                isMe ? "right-0" : "left-0",
                                menuDirection === 'up' 
                                    ? (isMe ? "origin-bottom-right" : "origin-bottom-left")
                                    : (isMe ? "origin-top-right" : "origin-top-left")
                            )}>
                                {/* Primary Actions Group */}
                                <div className="px-1.5 space-y-0.5">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setReplyingTo(message);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors group/item"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <Reply size={16} className="text-blue-500" />
                                            <span>Trả lời</span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForwardingMessage(message);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors group/item"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <Share2 size={16} className="text-blue-500" />
                                            <span>Chuyển tiếp</span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(message.content);
                                            toast.success("Đã sao chép tin nhắn");
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors group/item"
                                    >
                                        <div className="flex items-center space-x-2.5">
                                            <Copy size={16} className="text-blue-500" />
                                            <span>Sao chép bản tin</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="h-[1px] bg-gray-100 my-1.5 mx-3" />

                                {/* Secondary Actions Group */}
                                <div className="px-1.5 space-y-0.5">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            pinMessage(message.id);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors"
                                    >
                                        <Pin size={16} className={message.is_pinned ? "text-orange-500 fill-orange-500" : "text-gray-400"} />
                                        <span>{message.is_pinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}</span>
                                    </button>

                                    {message.file_url && (
                                        <>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`${BASE_URL}${message.file_url}`, '_blank');
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors"
                                            >
                                                <Download size={16} className="text-gray-400" />
                                                <span>Tải xuống tệp</span>
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const fileUrl = `${BASE_URL}${message.file_url}`;
                                                    navigator.clipboard.writeText(fileUrl);
                                                    toast.success("Đã sao chép liên kết tệp");
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors"
                                            >
                                                <ExternalLink size={16} className="text-gray-400" />
                                                <span>Sao chép liên kết</span>
                                            </button>
                                        </>
                                    )}

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const details = `Thời gian: ${new Date(message.timestamp).toLocaleString()}\nID: ${message.id}\nNgười gửi: ${message.senderName}`;
                                            toast.custom((t) => (
                                                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100 flex flex-col space-y-2 max-w-xs animate-in slide-in-from-bottom duration-200">
                                                    <div className="flex items-center space-x-2 text-blue-600 font-bold">
                                                        <Info size={16} />
                                                        <span>Thông tin tin nhắn</span>
                                                    </div>
                                                    <div className="text-[12px] text-gray-600 whitespace-pre-wrap font-mono">
                                                        {details}
                                                    </div>
                                                    <button onClick={() => toast.dismiss(t.id)} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium self-end">Đóng</button>
                                                </div>
                                            ));
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700 font-medium rounded-xl transition-colors"
                                    >
                                        <Info size={16} className="text-gray-400" />
                                        <span>Chi tiết</span>
                                    </button>
                                </div>

                                <div className="h-[1px] bg-gray-100 my-1.5 mx-3" />

                                {/* Critical Actions Group */}
                                <div className="px-1.5 space-y-0.5">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            reportMessage(message.id);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-orange-50 text-[13px] text-orange-600 font-medium rounded-xl transition-colors"
                                    >
                                        <X size={16} />
                                        <span>Báo cáo vi phạm</span>
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMessageForMe(message.id);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-red-50 text-[13px] text-red-500 font-medium rounded-xl transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        <span>Gỡ ở phía bạn</span>
                                    </button>

                                    {isMe && !message.is_recalled && (
                                        <>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingMessage(message);
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-blue-50 text-[13px] text-blue-600 font-bold rounded-xl transition-colors"
                                            >
                                                <Edit2 size={16} />
                                                <span>Chỉnh sửa</span>
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    recallMessage(message.id);
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-red-50 text-[13px] text-red-600 font-black rounded-xl transition-colors"
                                            >
                                                <RotateCcw size={16} />
                                                <span>Thu hồi</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {isLast && (
             <div className="flex items-center space-x-1 mt-1">
                {message.is_pinned && (
                    <Pin size={10} className="text-blue-500 fill-blue-500" />
                )}
                <span className="text-[10px] text-gray-400">
                    {formatChatTime(message.timestamp)}
                </span>
                {isMe && !message.is_recalled && isLatest && (
                    <CheckCheck size={13} className="text-blue-600 ml-0.5 animate-in zoom-in duration-300" />
                )}
            </div>
        )}
      </div>
    </div>
  );
};

