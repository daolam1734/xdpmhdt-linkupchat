import React, { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, X, Reply, Edit2, Paperclip, Loader2, Sparkles, Settings, Check } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file' }) => void;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { replyingTo, setReplyingTo, editingMessage, setEditingMessage, editMessage, uploadFile, activeRoom } = useChatStore();
  const { currentUser, updateProfile } = useAuthStore();

  const isAiRoom = activeRoom?.type === 'ai' || activeRoom?.id === 'ai' || activeRoom?.id === 'help';

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

  const handleSend = () => {
    if (editingMessage) {
        if (text.trim() && text !== editingMessage.content) {
            editMessage(editingMessage.id, text);
        }
        setEditingMessage(null);
        setText('');
        return;
    }

    if (text.trim()) {
      onSendMessage(text, replyingTo?.id);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    } else {
        // Gửi Like nếu không có text
        onSendMessage('👍');
    }
  };

  const insertAiPrefix = () => {
      setText(prev => prev.startsWith('@ai ') ? prev : `@ai ${prev}`);
      textareaRef.current?.focus();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ràng buộc 5MB
    if (file.size > 5 * 1024 * 1024) {
        toast.error("Tệp quá lớn. Giới hạn tối đa là 5MB.");
        return;
    }

    setUploading(true);
    try {
        const result = await uploadFile(file);
        // Gửi tin nhắn chứa file ngay lập tức
        onSendMessage("", replyingTo?.id, { url: result.url, type: result.type });
        toast.success("Tải tệp lên thành công!");
    } catch (error: any) {
        toast.error(error.response?.data?.detail || "Lỗi khi tải tệp lên.");
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelAction = () => {
      setReplyingTo(null);
      setEditingMessage(null);
      setText('');
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
    <div className="flex flex-col bg-white border-t border-gray-100">
        {/* AI Modes (Meta Style) - Available in all rooms */}
        <div className={clsx(
            "flex flex-col border-b border-gray-50",
            isAiRoom ? "bg-purple-50/30" : "bg-gray-50/20"
        )}>
            <div className="flex items-center space-x-2 px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth">
                {isAiRoom && (
                    <>
                        <button
                            onClick={() => setShowAiSettings(!showAiSettings)}
                            className={clsx(
                                "flex-shrink-0 p-1.5 rounded-full transition-all border",
                                showAiSettings ? "bg-purple-600 text-white border-purple-600" : "bg-white text-purple-600 border-purple-100 hover:bg-purple-100"
                            )}
                            title="Cấu hình AI Memory"
                        >
                            <Settings size={14} />
                        </button>
                        <div className="w-[1px] h-4 bg-purple-200 mx-1 flex-shrink-0" />
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
                            // Nếu trong phòng không phải AI/Help, thêm @ai vào prefix
                            const isPrivateOrAi = activeRoom?.type === 'direct' || activeRoom?.type === 'ai' || activeRoom?.id === 'ai' || activeRoom?.id === 'help';
                            const finalPrefix = isPrivateOrAi ? mode.prefix : `@ai ${mode.prefix}`;
                            setText(finalPrefix);
                            textareaRef.current?.focus();
                        }}
                        className={clsx(
                            "flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border shadow-sm whitespace-nowrap active:scale-95",
                            isAiRoom 
                                ? "bg-white hover:bg-purple-100 text-purple-700 border-purple-100 shadow-purple-900/5" 
                                : "bg-white hover:bg-blue-50 text-blue-600 border-blue-100 shadow-blue-900/5"
                        )}
                    >
                        <span>{mode.icon}</span>
                        <span>{mode.label}</span>
                    </button>
                ))}
            </div>

            {isAiRoom && showAiSettings && (
                <div className="px-4 py-3 bg-white border-t border-purple-50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">AI Memory Preference</span>
                                <button onClick={() => setShowAiSettings(false)}><X size={14} className="text-gray-400" /></button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Style */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Phong cách</label>
                                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                                        {['short', 'balanced', 'detailed'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => handleUpdatePreference('preferred_style', s)}
                                                className={clsx(
                                                    "flex-1 py-1 text-[10px] rounded-md transition-all",
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

                                {/* Coding */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Hỏi về Code</label>
                                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                                        {['low', 'medium', 'high'].map((v) => (
                                            <button
                                                key={v}
                                                onClick={() => handleUpdatePreference('coding_frequency', v)}
                                                className={clsx(
                                                    "flex-1 py-1 text-[10px] rounded-md transition-all",
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

                                {/* Language */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngôn ngữ ưu tiên</label>
                                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                                        {['vi', 'en'].map((l) => (
                                            <button
                                                key={l}
                                                onClick={() => handleUpdatePreference('language', l)}
                                                className={clsx(
                                                    "flex-1 py-1 text-[10px] rounded-md transition-all",
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
                            <p className="text-[9px] text-gray-400 italic mt-1">* Các lựa chọn này giúp AI điều chỉnh câu trả lời nhanh mà không cần huấn luyện lại.</p>
                        </div>
                    </div>
                )}
            </div>

        {/* Reply/Edit Bar */}
        {(replyingTo || editingMessage) && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <div className="text-blue-500">
                        {replyingTo ? <Reply size={16} /> : <Edit2 size={16} />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[12px] font-semibold text-gray-700">
                            {replyingTo ? `Đang trả lời ${replyingTo.senderName}` : "Đang sửa tin nhắn"}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">
                            {replyingTo ? replyingTo.content : editingMessage?.content}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={handleCancelAction}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <X size={16} className="text-gray-500" />
                </button>
            </div>
        )}

        <div className="flex items-end space-x-2 py-3">
        <div className="flex items-center pl-2 pb-1">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,.pdf,.docx,.txt,.xlsx"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isLoading}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Gửi nội dung đính kèm"
            >
                {uploading ? <Loader2 size={24} className="animate-spin" /> : <Paperclip size={24} />}
            </button>
        </div>

        <div className="flex-1 relative flex items-center bg-[#F0F2F5] rounded-[24px] px-3 py-1 ml-1">
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Aa"
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-40 font-normal text-black text-[15px] py-2 placeholder:text-gray-500"
                rows={1}
                disabled={isLoading}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '40px';
                    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                }}
            />
        </div>

        <div className="pb-1 pr-2 flex items-center gap-1">
            {!isAiRoom && (
                <button 
                    onClick={insertAiPrefix}
                    className={`p-2 rounded-full transition-all duration-200 ${text.startsWith('@ai') ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title="Hỏi AI với @ai"
                >
                    <Sparkles size={22} fill={text.startsWith('@ai') ? "currentColor" : "none"} />
                </button>
            )}
            <button
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 text-blue-600 hover:bg-gray-100 rounded-full transition-all active:scale-90"
            >
                {text.trim() ? (
                    <Send size={24} />
                ) : (
                    <ThumbsUp size={24} />
                )}
            </button>
        </div>
    </div>
    </div>
  );
};

