import React, { useMemo } from 'react';
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
import { 
    Reply, 
    Edit2, 
    RotateCcw, 
    Pin, 
    MoreHorizontal,
    File as FileIcon,
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
    Info
} from 'lucide-react';

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
  const { setReplyingTo, setEditingMessage, recallMessage, pinMessage, deleteMessageForMe } = useChatStore();
  const { setView } = useViewStore();

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
    if (message.isBot) return 'rounded-2xl rounded-tl-none';
    
    if (isMe) {
        return clsx(
            "rounded-l-[18px]",
            isFirst ? "rounded-tr-[18px]" : "rounded-tr-[4px]",
            isLast ? "rounded-br-[4px]" : "rounded-br-[18px]"
        );
    } else {
        return clsx(
            "rounded-r-[18px]",
            isFirst ? "rounded-tl-[18px]" : "rounded-tl-[4px]",
            isLast ? "rounded-bl-[4px]" : "rounded-bl-[18px]"
        );
    }
  }, [isMe, isFirst, isLast, message.isBot]);

  return (
    <div
      id={`msg-${message.id}`}
      className={twMerge(
        'flex w-full animate-in fade-in duration-300 ease-out items-end space-x-2 scroll-mt-20',
        isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row',
        isLast ? 'mb-4' : 'mb-[2px]'
      )}
    >
      <div className="w-7 shrink-0">
        {!isMe && showAvatar && (
            <Avatar 
                name={message.senderName} 
                url={message.isBot ? undefined : (message as any).senderAvatar} 
                size="sm" 
            />
        )}
      </div>
      
      <div className={clsx(
          "flex flex-col max-w-[75%] group",
          isMe ? "items-end" : "items-start"
      )}>
        {!isMe && showName && (
            <div className="flex items-center space-x-1 ml-1 mb-1">
                <span className="text-[11px] text-gray-500 font-bold">
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
                "text-[12px] opacity-70 mb-1 px-2 py-1 bg-gray-100 rounded-lg border-l-4 border-blue-400 max-w-full truncate cursor-pointer hover:bg-gray-200 transition-colors",
                isMe ? "mr-1" : "ml-1"
            )}>
                {message.reply_to_content || "Bản tin gốc không còn khả dụng"}
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
                    ? 'bg-[#0084FF] text-white shadow-sm'
                    : message.isBot 
                        ? 'bg-gradient-to-br from-white to-purple-50/50 text-slate-800 border border-purple-100 shadow-md shadow-purple-500/5'
                        : 'bg-[#F0F2F5] text-black',
                message.is_recalled && 'bg-gray-100 text-gray-400 italic border border-gray-200'
                )}
            >
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
                            <div className="mt-3 pt-2 border-t border-purple-100/50 flex items-center space-x-1.5 opacity-50">
                                <Info size={10} className="text-purple-400" />
                                <span className="text-[9px] font-medium text-purple-600 italic">
                                    LinkUp AI có thể đưa ra thông tin không chính xác. Hãy kiểm tra các phản hồi quan trọng.
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="tracking-tight">
                            {message.file_url && (
                                <div className="mb-2 max-w-sm rounded-lg overflow-hidden">
                                    {message.file_type === 'image' ? (
                                        <img 
                                            src={`http://localhost:8000${message.file_url}`} 
                                            alt="Đính kèm" 
                                            className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(`http://localhost:8000${message.file_url}`, '_blank')}
                                        />
                                    ) : (
                                        <div className="flex items-center space-x-3 bg-white/20 p-3 rounded-lg border border-white/30">
                                            <div className="bg-white/40 p-2 rounded-lg text-gray-600">
                                                <FileIcon size={24} className={isMe ? "text-white" : ""} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">Tệp đính kèm</p>
                                                <p className="text-[10px] opacity-70">Nhấn để tải về</p>
                                            </div>
                                            <a 
                                                href={`http://localhost:8000${message.file_url}`} 
                                                target="_blank" 
                                                download
                                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                                            >
                                                <Download size={18} />
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
                            <div className="prose prose-sm max-w-none">
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

            {/* Quick Actions (Messenger style) */}
            {!message.is_recalled && !message.isBot && (
                <div className={clsx(
                    "flex opacity-0 group-hover:opacity-100 transition-opacity items-center space-x-0.5",
                    isMe ? "mr-2 flex-row-reverse space-x-reverse" : "ml-2 flex-row"
                )}>
                    {/* Reaction Icon (Placeholder) */}
                    <div className="relative group/emoji">
                        <button className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <Smile size={18} />
                        </button>
                        
                        {/* Quick Emoji Picker */}
                        <div className={clsx(
                            "absolute bottom-full mb-2 hidden group-hover/emoji:flex bg-white shadow-xl rounded-full border border-gray-100 p-1.5 z-50 space-x-1 animate-in fade-in zoom-in-95 duration-100",
                            isMe ? "right-0" : "left-0"
                        )}>
                            {['❤️', '😆', '😮', '😢', '😠', '👍'].map(emoji => (
                                <button key={emoji} className="hover:scale-125 transition-transform p-1 text-lg leading-none">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Reply Icon */}
                    <button 
                        onClick={() => setReplyingTo(message)}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                        title="Trả lời"
                    >
                        <Reply size={18} />
                    </button>
                    
                    {/* More Menu Dropdown */}
                    <div className="relative group/menu">
                        <button className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <MoreHorizontal size={18} />
                        </button>
                        
                        {/* Dropdown Content */}
                        <div className={clsx(
                            "absolute bottom-full mb-2 hidden group-hover/menu:block bg-white shadow-xl rounded-xl border border-gray-100 py-1.5 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100",
                            isMe ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left"
                        )}>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    // Optional: toast notification
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700"
                            >
                                <Copy size={16} />
                                <span>Sao chép</span>
                            </button>

                            <button 
                                onClick={() => pinMessage(message.id)}
                                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700 font-medium"
                            >
                                <Pin size={16} className={message.is_pinned ? "text-blue-500 fill-blue-500" : ""} />
                                <span>{message.is_pinned ? "Bỏ ghim" : "Ghim"}</span>
                            </button>

                            <div className="h-[1px] bg-gray-100 my-1 mx-2" />

                            <button 
                                onClick={() => deleteMessageForMe(message.id)}
                                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 text-[13px] text-red-500 group/recall"
                            >
                                <Trash2 size={16} />
                                <span>Gỡ ở phía bạn</span>
                            </button>

                            {isMe && !message.is_recalled && (
                                <>
                                    <button 
                                        onClick={() => setEditingMessage(message)}
                                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-700"
                                    >
                                        <Edit2 size={16} />
                                        <span>Chỉnh sửa</span>
                                    </button>
                                    <button 
                                        onClick={() => recallMessage(message.id)}
                                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 text-[13px] text-red-600 font-semibold"
                                    >
                                        <RotateCcw size={16} />
                                        <span>Thu hồi</span>
                                    </button>
                                </>
                            )}
                        </div>
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
                {isMe && !message.is_recalled && (
                    <span className="text-[10px] text-gray-400">· Đã gửi</span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

