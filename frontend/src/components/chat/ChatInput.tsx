import React, { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, X, Reply, Edit2, Paperclip, Loader2, FileIcon, FileText, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file', name?: string }, receiverId?: string) => void;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string, type: 'image' | 'file', filename: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    replyingTo, 
    setReplyingTo, 
    editingMessage, 
    setEditingMessage, 
    editMessage, 
    uploadFile, 
    activeRoom,
    sendTypingStatus
  } = useChatStore();
  const { currentUser, updateProfile, unblockUser: unblockUserStore } = useAuthStore();

  // Real-time block detection using both activeRoom state and currentUser block lists
  const isBlockedByMe = activeRoom?.type === 'direct' && activeRoom.other_user_id && 
    currentUser?.blocked_users?.includes(activeRoom.other_user_id);
    
  const isBlockedByOther = activeRoom?.type === 'direct' && activeRoom.other_user_id && (
    activeRoom.blocked_by_other || 
    currentUser?.blocked_by?.includes(activeRoom.other_user_id)
  );

  const isBlocked = isBlockedByMe || isBlockedByOther;

  const handleUnblock = async () => {
    if (activeRoom?.other_user_id) {
        try {
            await unblockUserStore(activeRoom.other_user_id);
            toast.success("Đã bỏ chặn người dùng");
        } catch (error) {
            toast.error("Không thể bỏ chặn");
        }
    }
  };

  useEffect(() => {
    if (editingMessage) {
        setText(editingMessage.content);
        textareaRef.current?.focus();
    } else {
        setText('');
    }
  }, [editingMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Typing notification logic
    if (!typingTimeoutRef.current) {
        sendTypingStatus(true);
    } else {
        clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
        typingTimeoutRef.current = null;
    }, 3000);
  };

  const handleSend = () => {
    if (isBlocked) {
        toast.error("Bạn không thể thực hiện hành động này");
        return;
    }
    if (editingMessage) {
        if (text.trim() && text !== editingMessage.content) {
            editMessage(editingMessage.id, text);
        }
        setEditingMessage(null);
        setText('');
        setPendingFile(null);
        return;
    }

    if (text.trim() || pendingFile) {
      // Logic đặc biệt cho Admin trong phòng Help & Support
      let receiverId = undefined;
      const currentUser = useAuthStore.getState().currentUser;
      const { activeRoom, replyingTo } = useChatStore.getState();
      
      if (activeRoom?.id === 'help' && (currentUser?.is_superuser || currentUser?.role === 'admin')) {
          if (replyingTo) {
                // Ưu tiên senderId nếu không phải bot, ngược lại lấy receiver_id của bot
                receiverId = !replyingTo.isBot ? replyingTo.senderId : replyingTo.receiver_id;
          } else {
                // Tự động tìm người dùng cuối cùng gửi tin nhắn trong phòng này để phản hồi (trường hợp admin không click trả lời)
                const messages = useChatStore.getState().messages;
                const lastUserMsg = [...messages].reverse().find(m => !m.isBot && m.senderId !== currentUser?.id);
                if (lastUserMsg) {
                    receiverId = lastUserMsg.senderId;
                } else {
                    toast.error("Vui lòng 'Trả lời' một tin nhắn cụ thể để phản hồi cho người dùng.");
                    return;
                }
          }
      }

      onSendMessage(
        text, 
        replyingTo?.id, 
        pendingFile ? { url: pendingFile.url, type: pendingFile.type, name: pendingFile.filename } : undefined, 
        receiverId
      );
      
      setText('');
      setPendingFile(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    } else {
        // Gửi Like nếu không có text và không có file
        onSendMessage('👍');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBlocked) {
        toast.error("Bạn không thể thực hiện hành động này");
        return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Ràng buộc động (Mặc định 20MB theo backend mới)
    const MAX_MB = 20;
    if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`Tệp quá lớn. Giới hạn tối đa là ${MAX_MB}MB.`);
        return;
    }

    setUploading(true);
    try {
        const result = await uploadFile(file);
        // Lưu vào pendingFile thay vì gửi ngay
        setPendingFile({
            url: result.url,
            type: result.type,
            filename: file.name
        });
        toast.success("Tải tệp lên thành công!");
    } catch (error: any) {
        toast.error(error.response?.data?.detail || "Lỗi khi tải tệp lên.");
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingFile = () => {
      setPendingFile(null);
  };

  const handleCancelAction = () => {
      setReplyingTo(null);
      setEditingMessage(null);
      setText('');
      setPendingFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const enterToSend = currentUser?.app_settings?.enter_to_send ?? true;
    
    if (e.key === 'Enter') {
      if (enterToSend) {
        if (!e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSend();
        }
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
    }
  }, []);

  return (
    <div className="flex flex-col bg-white border-t border-gray-100 px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
        {isBlocked ? (
            <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center justify-center space-y-2 mt-2">
                <p className="text-gray-500 font-medium text-[14px] text-center">
                    {isBlockedByMe 
                        ? "Bạn đã chặn người dùng này." 
                        : "Bạn hiện không thể gửi tin nhắn cho người dùng này vì họ đã chặn bạn."}
                </p>
                {isBlockedByMe && (
                    <button 
                        onClick={handleUnblock}
                        className="text-blue-600 font-bold text-sm hover:underline active:scale-95 transition-all duration-200"
                    >
                        Bỏ chặn để gửi tin nhắn
                    </button>
                )}
            </div>
        ) : (
            <>
                {/* Pending File Preview ABOVE input row */}
                {pendingFile && (
                    <div className="mx-2 mb-2 p-2 bg-gray-50 dark:bg-[#242526] rounded-xl border border-gray-100 dark:border-[#3e4042] flex items-center group animate-in slide-in-from-bottom-2 duration-200">
                        <div className="relative">
                            {pendingFile.type === 'image' ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-[#3e4042] bg-white dark:bg-[#3a3b3c]">
                                    <img 
                                        src={pendingFile.url} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-[#3e4042] bg-white dark:bg-[#3a3b3c] flex flex-col items-center justify-center">
                                    <FileText size={20} className="text-blue-500" />
                                </div>
                            )}
                            <button 
                                onClick={handleRemovePendingFile}
                                className="absolute -top-2 -right-2 p-1 bg-white dark:bg-[#3a3b3c] text-gray-500 dark:text-[#b0b3b8] rounded-full shadow-md hover:bg-red-50 hover:text-red-500 transition-all duration-200 border border-gray-100 dark:border-[#4b4c4f]"
                                title="Xóa tệp"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200 truncate">{pendingFile.filename}</p>
                            <p className="text-[11px] text-gray-400 dark:text-[#b0b3b8] uppercase font-bold tracking-tighter">
                                {pendingFile.filename.split('.').pop()} file • Ready to send
                            </p>
                        </div>
                    </div>
                )}

                {/* Reply/Edit Bar Aboverounded input */}
                {(replyingTo || editingMessage) && (
                    <div className="mx-2 mb-2 flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#242526] rounded-xl border border-gray-100 dark:border-[#3e4042] animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="text-blue-500 flex-shrink-0">
                                {replyingTo ? <Reply size={16} /> : <Edit2 size={16} />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">
                                    {replyingTo ? (
                                        (activeRoom?.id === 'help' && (currentUser?.is_superuser || currentUser?.role === 'admin'))
                                        ? `Hỗ trợ khách hàng: ${(!replyingTo.isBot ? replyingTo.senderName : 'Người dùng đang chờ')}`
                                        : `Đang trả lời ${replyingTo.senderName}`
                                    ) : "Đang sửa tin nhắn"}
                                </span>
                                <span className="text-[11px] text-gray-500 dark:text-[#b0b3b8] truncate">
                                    {replyingTo ? replyingTo.content : editingMessage?.content}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={handleCancelAction}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-[#3a3b3c] rounded-full transition-colors duration-200"
                        >
                            <X size={16} className="text-gray-500" />
                        </button>
                    </div>
                )}

                <div className="flex items-end space-x-2">
                    {/* Rounded bubble container */}
                    <div className="flex-1 flex items-end bg-[#F0F2F5] dark:bg-slate-800 hover:bg-[#E4E6EB] dark:hover:bg-slate-700 transition-colors duration-200 rounded-[24px] px-2 py-1 ml-0 shadow-sm border border-transparent focus-within:border-gray-200 dark:focus-within:border-slate-600 focus-within:bg-white dark:focus-within:bg-slate-800 group cursor-text">
                        <div className="flex items-center pb-1">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept="image/*,.pdf,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt,.csv,.zip,.rar,.7z,.mp3,.wav,.mp4,.mov"
                            />
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                                disabled={uploading || isLoading}
                                className={clsx(
                                    "p-2 rounded-full transition-all duration-200 disabled:opacity-50",
                                    pendingFile ? "text-blue-600 bg-blue-100 shadow-sm" : "text-gray-500 hover:bg-gray-200"
                                )}
                                title={pendingFile ? "Thay đổi tệp đính kèm" : "Gửi nội dung đính kèm"}
                            >
                                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Aa"
                            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-40 font-normal text-black dark:text-gray-100 text-[15px] py-1.5 px-2 placeholder:text-gray-500"
                            rows={1}
                            disabled={isLoading}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = '40px';
                                target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                            }}
                        />

                        <div className="pb-1 transition-all duration-200">
                        </div>
                    </div>

                    <div className="pb-1 pr-0 flex items-center">
                        <button
                            onClick={handleSend}
                            disabled={isLoading || uploading}
                            className={clsx(
                                "p-2 rounded-full transition-all duration-200 active:scale-90 disabled:opacity-50",
                                (text.trim() || pendingFile) 
                                    ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                                    : "text-blue-600 hover:bg-blue-50"
                            )}
                        >
                            {text.trim() || pendingFile ? (
                                <Send size={24} />
                            ) : (
                                <ThumbsUp size={24} className="fill-current" />
                            )}
                        </button>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

