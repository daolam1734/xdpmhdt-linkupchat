import React, { useMemo, useState, useEffect } from 'react';
import type { Message } from '../../types/chat';
import { Avatar } from '../common/Avatar';
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
    Sparkles,
    Check,
    CheckCheck,
    CircleDashed,
    Share2,
    Maximize2,
    ThumbsUp,
    ThumbsDown,
    Info
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

const getFileName = (url: string, fileName?: string) => {
  if (fileName) return fileName;
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
    isLast = true
}) => {
  const { currentUser, token } = useAuthStore();
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
    setViewingUser
  } = useChatStore();
  
  const getAuthenticatedUrl = (url?: string) => {
    if (!url) return '';
    // If it's a relative URL and it's a secure download endpoint, append token
    if (url.startsWith('/api/v1/files/download/') && token) {
        return `${BASE_URL}${url}${url.includes('?') ? '&' : '?'}token=${token}`;
    }
    // If it's already a full URL or other static path
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

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
      return message.senderId === currentUser.id;
  }, [message.senderId, currentUser, message.isBot]);

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
      data-message-id={message.id}
      className={twMerge(
        'flex w-full animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out items-end space-x-2 px-4 scroll-mt-20 relative select-text',
        activeDropdownId?.includes(message.id) ? 'z-[45]' : 'z-0',
        isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        isLast ? 'mb-4' : 'mb-[2px]'
      )}
    >
      {!isMe && (
        <div className="w-9 shrink-0 flex flex-col items-center">
            {showAvatar && (
                <div 
                    className={clsx(
                        "transition-opacity",
                        !message.isBot && "cursor-pointer hover:opacity-80"
                    )}
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
                        name={message.isBot ? "LinkUp AI" : message.senderName} 
                        url={message.isBot ? message.senderAvatar : message.senderAvatar} 
                        isBot={message.isBot}
                        size="sm" 
                    />
                </div>
            )}
        </div>
      )}
      
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
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold group-hover/name:text-blue-500 transition-colors">
                    {message.isBot ? "LinkUp AI" : message.senderName}
                </span>
                {message.isBot && (
                    <div className="flex items-center space-x-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-md ml-1">
                        <Sparkles size={8} className="text-white fill-white" />
                        <span className="text-[9px] text-white font-black uppercase tracking-wider">Assistant</span>
                    </div>
                )}
            </div>
        )}

        {/* Reply Preview */}
        {message.reply_to_id && !message.is_recalled && (
            <div 
                onClick={() => document.getElementById(`msg-${message.reply_to_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className={clsx(
                "text-[12px] opacity-70 mb-[-8px] pb-3 px-3 pt-1.5 bg-gray-100/80 dark:bg-slate-700/80 rounded-t-[18px] border-l-4 border-blue-500/50 max-w-[90%] truncate cursor-pointer hover:bg-gray-200/80 transition-all z-0",
                isMe ? "mr-1 items-end" : "ml-1 items-start"
            )}>
                <span className="text-[10px] font-bold text-blue-600/70 block mb-0.5">Đang trả lời:</span>
                <span className="italic dark:text-gray-100">{message.reply_to_content || "Bản tin gốc không còn khả dụng"}</span>
            </div>
        )}

        <div className={clsx(
            "flex items-center",
            isMe ? "flex-row-reverse" : "flex-row"
        )}>
            <div
                className={twMerge(
                'px-3 py-1.5 text-[15px] leading-snug font-normal relative transition-all',
                bubbleRadius,
                isMe
                    ? 'bg-blue-600 text-white shadow-sm'
                    : message.isBot 
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-2 border-blue-100 dark:border-blue-900 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/5'
                        : 'bg-[#F0F2F5] dark:bg-slate-800 text-black dark:text-white',
                message.is_recalled && 'bg-gray-100 dark:bg-slate-700 text-gray-400 italic border border-gray-200 dark:border-slate-600',
                // Viền màu xanh đặc trưng cho tin nhắn chỉ chứa ảnh hoặc tệp
                message.file_url && !message.content && !message.is_recalled && 'bg-white dark:bg-slate-800 border-2 border-blue-500 p-[2px] shadow-lg ring-1 ring-blue-500/10'
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
                            
                            {/* Phản hồi cho tin nhắn AI */}
                            {message.isBot && (
                                <div className="mt-3 pt-2 border-t border-purple-100/30 flex flex-col gap-2">
                                    <div className="flex items-center space-x-1.5 opacity-60">
                                        <Info size={10} className="text-purple-400" />
                                        <span className="text-[9px] font-medium text-purple-600 italic">
                                            LinkUp AI có thể đưa ra thông tin chưa chính xác.
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
                            )}
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
                                             onClick={() => window.open(getAuthenticatedUrl(message.file_url), '_blank')}>
                                            <img 
                                                src={getAuthenticatedUrl(message.file_url)} 
                                                alt={getFileName(message.file_url || '', message.file_name)} 
                                                className="max-w-full max-h-full h-auto object-cover rounded-lg border border-black/[0.04] hover:brightness-95 transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                        </div>
                                    ) : (
                                        <div className={clsx(
                                            "flex items-center space-x-3 p-3 rounded-xl transition-all",
                                            isMe ? "bg-blue-50/50" : "bg-gray-50/50"
                                        )}>
                                            <div className="p-2 rounded-lg flex items-center justify-center bg-white shadow-sm">
                                                {getFileIcon(getFileName(message.file_url || '', message.file_name))}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate text-gray-800">
                                                    {getFileName(message.file_url || '', message.file_name)}
                                                </p>
                                                <p className="text-[11px] font-medium text-gray-500">
                                                    Tải về để xem chi tiết
                                                </p>
                                            </div>
                                            <a 
                                                href={getAuthenticatedUrl(message.file_url)} 
                                                target="_blank" 
                                                download
                                                className="p-2 rounded-full transition-all hover:scale-110 hover:bg-gray-100 text-gray-500"
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
                                    isMe ? "bg-white/10 border-white/10" : "bg-gray-50 border-gray-100 shadow-sm"
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

                {/* Reaction Display (Messenger Style Capsule) */}
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className={clsx(
                        "absolute -bottom-2 z-30 flex",
                        isMe ? "right-2" : "left-2"
                    )}>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                // Optional: View details of who reacted
                            }}
                            className="bg-white/95 backdrop-blur-md hover:bg-white px-2 py-0.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center space-x-1 transition-all active:scale-95 group"
                        >
                            <div className="flex -space-x-1">
                                {Object.keys(message.reactions).slice(0, 3).map((emoji) => (
                                    <span key={emoji} className="text-[14px] drop-shadow-sm group-hover:scale-110 transition-transform">
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                            {Object.values(message.reactions).reduce((acc, users) => acc + (users?.length || 0), 0) > 0 && (
                                <span className="text-[11px] font-bold text-slate-500 pl-0.5">
                                    {Object.values(message.reactions).reduce((acc, users) => acc + (users?.length || 0), 0)}
                                </span>
                            )}
                        </button>
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
                    "flex transition-all items-center space-x-0.5 rounded-full p-0.5 shadow-sm border border-gray-100/50",
                    activeDropdownId?.includes(message.id) ? "z-[160] opacity-100 bg-white" : "z-0 opacity-0 group-hover:opacity-100 bg-white/60 backdrop-blur-sm",
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
                        
                        {/* Quick Emoji Picker (Messenger Style) */}
                        {showEmoji && (
                            <div className={clsx(
                                "absolute flex bg-white/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] rounded-full border border-gray-100 p-1 z-[100] space-x-0.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 min-w-[280px] justify-between items-center px-2",
                                menuDirection === 'up' ? "bottom-full mb-3" : "top-full mt-3",
                                isMe ? "right-0" : "left-0",
                                menuDirection === 'up' 
                                    ? (isMe ? "origin-bottom-right" : "origin-bottom-left")
                                    : (isMe ? "origin-top-right" : "origin-top-left")
                            )}>
                                {[
                                    { e: '👍', label: 'Like' },
                                    { e: '❤️', label: 'Love' },
                                    { e: '😂', label: 'Haha' },
                                    { e: '😮', label: 'Wow' },
                                    { e: '😢', label: 'Sad' },
                                    { e: '😡', label: 'Angry' }
                                ].map(({ e, label }) => (
                                    <button 
                                        key={e} 
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            addReaction(message.id, e);
                                            setActiveDropdown(null);
                                        }}
                                        className="relative group/emoji hover:scale-[1.35] hover:-translate-y-2 active:scale-95 transition-all w-10 h-10 flex items-center justify-center text-2xl leading-none rounded-full hover:bg-gray-50/80"
                                        title={label}
                                    >
                                        <span className="drop-shadow-sm">{e}</span>
                                        <span className="absolute -top-10 scale-0 group-hover/emoji:scale-100 transition-all bg-gray-900/90 backdrop-blur-md text-white text-[10px] px-2 py-1.5 rounded-lg font-bold whitespace-nowrap z-[110] pointer-events-none shadow-xl border border-white/10">
                                            {label}
                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/90 rotate-45" />
                                        </span>
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
                        
                        {/* Dropdown Content - Messenger Inspired Style */}
                        {showMenu && (
                            <div className={clsx(
                                "absolute bg-white shadow-[0_4px_32px_rgba(0,0,0,0.16)] rounded-2xl border border-gray-100/50 py-1.5 z-[100] min-w-[210px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden",
                                menuDirection === 'up' ? "bottom-full mb-2" : "top-full mt-2",
                                isMe ? "right-0" : "left-0",
                                menuDirection === 'up' 
                                    ? (isMe ? "origin-bottom-right" : "origin-bottom-left")
                                    : (isMe ? "origin-top-right" : "origin-top-left")
                            )}>
                                {/* Primary Actions Group */}
                                <div className="px-1.5 space-y-0.5">
                                    {message.file_url && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const link = document.createElement('a');
                                                link.href = getAuthenticatedUrl(message.file_url || '');
                                                link.download = getFileName(message.file_url || '', message.file_name);
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                setActiveDropdown(null);
                                            }}
                                            className="w-full flex items-center px-3 py-2.5 hover:bg-blue-50 text-[14px] text-blue-600 font-bold rounded-xl transition-colors group/item"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Download size={18} className="text-blue-600" />
                                                <span>Lưu về máy</span>
                                            </div>
                                        </button>
                                    )}

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setReplyingTo(message);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center px-3 py-2.5 hover:bg-gray-100 text-[14px] text-gray-700 font-medium rounded-xl transition-colors group/item"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Reply size={18} className="text-gray-500 group-hover/item:text-blue-600" />
                                            <span>Trả lời</span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForwardingMessage(message);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center px-3 py-2.5 hover:bg-gray-100 text-[14px] text-gray-700 font-medium rounded-xl transition-colors group/item"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Share2 size={18} className="text-gray-500 group-hover/item:text-blue-600" />
                                            <span>Chuyển tiếp</span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (message.content) {
                                                navigator.clipboard.writeText(message.content);
                                                toast.success("Đã sao chép tin nhắn");
                                            } else if (message.file_url) {
                                                navigator.clipboard.writeText(getAuthenticatedUrl(message.file_url));
                                                toast.success("Đã sao chép liên kết tệp");
                                            }
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center px-3 py-2.5 hover:bg-gray-100 text-[14px] text-gray-700 font-medium rounded-xl transition-colors group/item"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Copy size={18} className="text-gray-500 group-hover/item:text-blue-600" />
                                            <span>{message.content ? "Sao chép" : "Sao chép liên kết"}</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="h-[1px] bg-gray-100 my-1 mx-3" />

                                {/* Secondary Actions Group */}
                                <div className="px-1.5 space-y-0.5">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            pinMessage(message.id);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-gray-100 text-[14px] text-gray-700 font-medium rounded-xl transition-colors"
                                    >
                                        <Pin size={18} className={message.is_pinned ? "text-orange-500 fill-orange-500" : "text-gray-500"} />
                                        <span>{message.is_pinned ? "Bỏ ghim" : "Ghim tin nhắn"}</span>
                                    </button>

                                    {message.file_type === 'image' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(getAuthenticatedUrl(message.file_url), '_blank');
                                                setActiveDropdown(null);
                                            }}
                                            className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-gray-100 text-[14px] text-gray-700 font-medium rounded-xl transition-colors"
                                        >
                                            <Maximize2 size={18} className="text-gray-500" />
                                            <span>Xem ảnh phóng to</span>
                                        </button>
                                    )}
                                </div>

                                <div className="h-[1px] bg-gray-100 my-1 mx-3" />

                                {/* Critical Actions Group */}
                                <div className="px-1.5 space-y-0.5">
                                    {isMe && !message.is_recalled && (
                                        <>
                                            {message.content && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingMessage(message);
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-gray-100 text-[14px] text-gray-700 font-medium rounded-xl transition-colors"
                                                >
                                                    <Edit2 size={18} className="text-gray-500" />
                                                    <span>Chỉnh sửa</span>
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    recallMessage(message.id);
                                                    setActiveDropdown(null);
                                                }}
                                                className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-red-50 text-[14px] text-red-600 font-bold rounded-xl transition-colors"
                                            >
                                                <RotateCcw size={18} />
                                                <span>Thu hồi</span>
                                            </button>
                                        </>
                                    )}

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMessageForMe(message.id);
                                            setActiveDropdown(null);
                                        }}
                                        className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-red-50 text-[14px] text-red-500 font-medium rounded-xl transition-colors"
                                    >
                                        <Trash2 size={18} />
                                        <span>Xóa ở phía tôi</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {isLast && (
             <div className="flex flex-col items-end mt-1 space-y-0.5">
                {isMe && !message.is_recalled && (
                    <div className="flex items-center justify-end space-x-1 mb-0.5 min-h-[14px]">
                        {message.status === 'sending' && (
                            <div className="flex items-center space-x-1 opacity-60">
                                <span className="text-[9px] text-gray-400 font-medium">Đang gửi</span>
                                <CircleDashed size={9} className="text-gray-400 animate-spin" />
                            </div>
                        )}
                        {message.status === 'sent' && (
                            <div className="flex items-center space-x-1 opacity-60">
                                <span className="text-[9px] text-gray-400 font-medium">Đã gửi</span>
                                <Check size={9} className="text-gray-400 border border-gray-400 rounded-full p-[0.5px]" />
                            </div>
                        )}
                        {message.status === 'delivered' && (
                            <div className="flex items-center space-x-1 opacity-70">
                                <span className="text-[9px] text-gray-500 font-medium">Đã nhận</span>
                                <CheckCheck size={11} className="text-gray-500" />
                            </div>
                        )}
                        {message.status === 'seen' && (
                            <div className="flex items-center space-x-1 animate-in fade-in duration-300">
                                <span className="text-[9px] text-blue-500 font-bold">Đã xem</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                                    <CheckCheck size={7} className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-center space-x-1">
                    {message.is_pinned && (
                        <Pin size={10} className="text-blue-500 fill-blue-500" />
                    )}
                    <span className="text-[10px] text-gray-400">
                        {formatChatTime(message.timestamp)}
                    </span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

