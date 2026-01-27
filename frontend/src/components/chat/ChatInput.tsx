import React, { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, X, Reply, Edit2, Paperclip, Loader2, Sparkles, Settings, FileIcon, FileText, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file' }, receiverId?: string) => void;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string, type: 'image' | 'file', filename: string } | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
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

  const isAiRoom = activeRoom?.type === 'ai' || activeRoom?.id === 'ai' || activeRoom?.id === 'help';
  const isHelpRoom = activeRoom?.id === 'help';
  const isGeneralRoom = activeRoom?.id === 'general';
  const isStaff = currentUser?.is_superuser || currentUser?.role === 'admin';
  
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

  const handleUpdatePreference = async (key: string, value: string) => {
    try {
        const currentPrefs = currentUser?.ai_preferences || {};
        await updateProfile({
            ai_preferences: {
                ...currentPrefs,
                [key]: value
            }
        });
        toast.success("Đã lưu sở thích AI");
    } catch (e) {
        toast.error("Không thể lưu cấu hình");
    }
  };

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
        pendingFile ? { url: pendingFile.url, type: pendingFile.type } : undefined, 
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

  const insertAiPrefix = () => {
      setText(prev => prev.startsWith('@ai ') ? prev : `@ai ${prev}`);
      textareaRef.current?.focus();
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
                {/* AI Modes Bar */}
                {!isGeneralRoom && (
                    <div className={clsx(
                        "flex flex-col mb-2 rounded-xl transition-all duration-200",
                        isAiRoom ? "bg-purple-50/50" : "bg-gray-50/50 border border-gray-100/50"
                    )}>
                        <div className="flex items-center space-x-2 px-3 py-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                            {isAiRoom && (
                                <>
                                    <button
                                        onClick={() => setShowAiSettings(!showAiSettings)}
                                        className={clsx(
                                            "flex-shrink-0 p-1.5 rounded-full transition-all duration-200 border",
                                            showAiSettings ? "bg-purple-600 text-white border-purple-600" : "bg-white text-purple-600 border-purple-100 hover:bg-purple-100"
                                        )}
                                        title="Cấu hình AI Memory"
                                    >
                                        <Settings size={14} />
                                    </button>
                                    <div className="w-[1px] h-4 bg-purple-200 mx-1 flex-shrink-0" />
                                </>
                            )}
                            {isHelpRoom && !isStaff && (
                                <>
                                    {[
                                        { label: 'Gặp Admin', icon: '👨‍💼', prompt: 'Mình muốn gặp admin để hỗ trợ trực tiếp.' },
                                        { label: 'Lỗi tài khoản', icon: '🔐', prompt: 'Tài khoản của mình đang gặp sự cố đăng nhập/bảo mật.' },
                                        { label: 'Góp ý', icon: '📝', prompt: 'Mình có một vài góp ý cho ứng dụng: ' },
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                setText(item.prompt);
                                                textareaRef.current?.focus();
                                            }}
                                            className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 border shadow-sm bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-100 active:scale-95"
                                        >
                                            <span>{item.icon}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                    <div className="w-[1px] h-4 bg-indigo-200 mx-1 flex-shrink-0" />
                                </>
                            )}
                            {[
                                { label: 'Giải thích', icon: '💡', prefix: 'Giải thích giúp mình: ' },
                                { label: 'Viết lại', icon: '📝', prefix: 'Viết lại tin nhắn này hay hơn: ' },
                                { label: 'Tóm tắt', icon: '📊', prefix: 'Tóm tắt nội dung sau: ' },
                                { label: 'Dịch', icon: '🌐', prefix: 'Dịch sang tiếng Việt: ' },
                            ].map((mode) => (
                                <button
                                    key={mode.label}
                                    onClick={() => {
                                        const isPrivateOrAi = activeRoom?.type === 'direct' || activeRoom?.type === 'ai' || activeRoom?.id === 'ai' || activeRoom?.id === 'help';
                                        const finalPrefix = isPrivateOrAi ? mode.prefix : `@ai ${mode.prefix}`;
                                        setText(finalPrefix);
                                        textareaRef.current?.focus();
                                    }}
                                    className={clsx(
                                        "flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 border shadow-sm whitespace-nowrap active:scale-95",
                                        isAiRoom 
                                            ? "bg-white hover:bg-purple-100 text-purple-700 border-purple-100" 
                                            : "bg-white hover:bg-blue-50 text-blue-600 border-blue-100"
                                    )}
                                >
                                    <span>{mode.icon}</span>
                                    <span>{mode.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* AI Settings dropdown refinement */}
                        {isAiRoom && showAiSettings && (
                            <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-t border-purple-50 animate-in fade-in slide-in-from-top-2 duration-300 rounded-b-xl">
                                <div className="flex flex-col space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">AI Memory Preference</span>
                                        <button onClick={() => setShowAiSettings(false)} className="p-1 hover:bg-purple-50 rounded-full transition-colors"><X size={14} className="text-gray-400" /></button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Phong cách</label>
                                            <div className="flex bg-gray-100/50 rounded-lg p-0.5">
                                                {['short', 'balanced', 'detailed'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleUpdatePreference('preferred_style', s)}
                                                        className={clsx(
                                                            "flex-1 py-1 text-[10px] rounded-md transition-all duration-200",
                                                            currentUser?.ai_preferences?.preferred_style === s 
                                                                ? "bg-white text-purple-600 shadow-sm font-bold" 
                                                                : "text-gray-500 hover:text-gray-700"
                                                        )}
                                                    >
                                                        {s === 'short' ? 'Ngắn' : s === 'balanced' ? 'Vừa' : 'Chi tiết'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Hỏi về Code</label>
                                            <div className="flex bg-gray-100/50 rounded-lg p-0.5">
                                                {['low', 'medium', 'high'].map((v) => (
                                                    <button
                                                        key={v}
                                                        onClick={() => handleUpdatePreference('coding_frequency', v)}
                                                        className={clsx(
                                                            "flex-1 py-1 text-[10px] rounded-md transition-all duration-200",
                                                            currentUser?.ai_preferences?.coding_frequency === v 
                                                                ? "bg-white text-purple-600 shadow-sm font-bold" 
                                                                : "text-gray-500 hover:text-gray-700"
                                                        )}
                                                    >
                                                        {v === 'low' ? 'Ít' : v === 'medium' ? 'Vừa' : 'Nhiều'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Ngôn ngữ</label>
                                            <div className="flex bg-gray-100/50 rounded-lg p-0.5">
                                                {['vi', 'en'].map((l) => (
                                                    <button
                                                        key={l}
                                                        onClick={() => handleUpdatePreference('language', l)}
                                                        className={clsx(
                                                            "flex-1 py-1 text-[10px] rounded-md transition-all duration-200",
                                                            currentUser?.ai_preferences?.language === l 
                                                                ? "bg-white text-purple-600 shadow-sm font-bold" 
                                                                : "text-gray-500 hover:text-gray-700"
                                                        )}
                                                    >
                                                        {l === 'vi' ? 'Tiếng Việt' : 'English'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending File Preview ABOVE input row */}
                {pendingFile && (
                    <div className="mx-2 mb-2 p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center group animate-in slide-in-from-bottom-2 duration-200">
                        <div className="relative">
                            {pendingFile.type === 'image' ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white">
                                    <img 
                                        src={pendingFile.url} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex flex-col items-center justify-center">
                                    <FileText size={20} className="text-blue-500" />
                                </div>
                            )}
                            <button 
                                onClick={handleRemovePendingFile}
                                className="absolute -top-2 -right-2 p-1 bg-white text-gray-500 rounded-full shadow-md hover:bg-red-50 hover:text-red-500 transition-all duration-200 border border-gray-100"
                                title="Xóa tệp"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-700 truncate">{pendingFile.filename}</p>
                            <p className="text-[11px] text-gray-400 uppercase font-bold tracking-tighter">
                                {pendingFile.filename.split('.').pop()} file • Ready to send
                            </p>
                        </div>
                    </div>
                )}

                {/* Reply/Edit Bar Aboverounded input */}
                {(replyingTo || editingMessage) && (
                    <div className="mx-2 mb-2 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="text-blue-500 flex-shrink-0">
                                {replyingTo ? <Reply size={16} /> : <Edit2 size={16} />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[12px] font-semibold text-gray-700">
                                    {replyingTo ? (
                                        (activeRoom?.id === 'help' && (currentUser?.is_superuser || currentUser?.role === 'admin'))
                                        ? `Hỗ trợ khách hàng: ${(!replyingTo.isBot ? replyingTo.senderName : 'Người dùng đang chờ')}`
                                        : `Đang trả lời ${replyingTo.senderName}`
                                    ) : "Đang sửa tin nhắn"}
                                </span>
                                <span className="text-[11px] text-gray-500 truncate">
                                    {replyingTo ? replyingTo.content : editingMessage?.content}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={handleCancelAction}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors duration-200"
                        >
                            <X size={16} className="text-gray-500" />
                        </button>
                    </div>
                )}

                <div className="flex items-end space-x-2">
                    {/* Rounded bubble container */}
                    <div className="flex-1 flex items-end bg-[#F0F2F5] hover:bg-[#E4E6EB] transition-colors duration-200 rounded-[24px] px-2 py-1 ml-0 shadow-sm border border-transparent focus-within:border-gray-200 focus-within:bg-white group cursor-text">
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
                            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-40 font-normal text-black text-[15px] py-1.5 px-2 placeholder:text-gray-500"
                            rows={1}
                            disabled={isLoading}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = '40px';
                                target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                            }}
                        />

                        <div className="pb-1 transition-all duration-200">
                            {!isAiRoom && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        insertAiPrefix();
                                    }}
                                    className={clsx(
                                        "p-2 rounded-full transition-all duration-200",
                                        text.startsWith('@ai') ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-200'
                                    )}
                                    title="Hỏi AI với @ai"
                                >
                                    <Sparkles size={20} fill={text.startsWith('@ai') ? "currentColor" : "none"} />
                                </button>
                            )}
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

