import React, { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, X, Reply, Edit2, Paperclip, Loader2, Sparkles } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import toast from 'react-hot-toast';

interface ChatInputProps {
  onSendMessage: (content: string, replyToId?: string, fileData?: { url: string, type: 'image' | 'file' }) => void;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { replyingTo, setReplyingTo, editingMessage, setEditingMessage, editMessage, uploadFile, activeRoom } = useChatStore();

  const isAiRoom = activeRoom?.type === 'ai';

  useEffect(() => {
    if (editingMessage) {
        setText(editingMessage.content);
        textareaRef.current?.focus();
    } else {
        setText('');
    }
  }, [editingMessage]);

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

