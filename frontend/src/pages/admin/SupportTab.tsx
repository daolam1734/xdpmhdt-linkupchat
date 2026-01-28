import React, { useRef, useEffect, useState } from 'react';
import { 
    Headset, Send, Bot, Clock, 
    CheckCircle2, Search, StickyNote,
    AlertCircle, CheckCircle, Edit2, Trash2, X, Check
} from 'lucide-react';
import type { SupportTabProps } from './types';
import { Avatar } from '../../components/common/Avatar';
import { formatRelativeTime } from '../../utils/time';

export const SupportTab: React.FC<SupportTabProps> = ({
    conversations, selectedUser, onSelectUser,
    messages, replyContent, onReplyChange, onSendReply, sendingReply,
    onStatusChange, onNoteChange, onUpdateMessage, onDeleteMessage
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [note, setNote] = useState(selectedUser?.internal_note || '');
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        setNote(selectedUser?.internal_note || '');
    }, [selectedUser]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const activeConv = selectedUser;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ai_processing': return <Bot size={14} className="text-indigo-500" />;
            case 'waiting': return <AlertCircle size={14} className="text-amber-500" />;
            case 'resolved': return <CheckCircle size={14} className="text-emerald-500" />;
            default: return null;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ai_processing': return 'AI';
            case 'waiting': return 'Chờ Admin';
            case 'resolved': return 'Đã xong';
            default: return status;
        }
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)] animate-in fade-in duration-500">
            {/* Conversations List */}
            <div className="col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="font-bold text-slate-900 flex items-center space-x-2">
                        <Headset size={18} className="text-indigo-600" />
                        <span>Hội thoại hỗ trợ</span>
                    </h4>
                    <div className="mt-4 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm người dùng..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {conversations.map(conv => (
                        <button 
                            key={conv.user_id}
                            onClick={() => onSelectUser(conv)}
                            className={`w-full p-4 rounded-2xl border transition-all flex items-start space-x-3 text-left group ${
                                selectedUser?.user_id === conv.user_id 
                                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                            }`}
                        >
                            <div className="relative flex-shrink-0">
                                <Avatar name={conv.full_name || conv.username} size="md" />
                                {conv.unread_count > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold truncate ${selectedUser?.user_id === conv.user_id ? 'text-white' : 'text-slate-900'}`}>
                                        {conv.full_name || conv.username}
                                    </span>
                                    <span className={`text-[10px] flex-shrink-0 ${selectedUser?.user_id === conv.user_id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {formatRelativeTime(conv.timestamp)}
                                    </span>
                                </div>
                                <p className={`text-[11px] truncate mt-0.5 ${selectedUser?.user_id === conv.user_id ? 'text-indigo-100/80' : 'text-slate-500'}`}>
                                    {conv.last_message}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center space-x-1 ${
                                        selectedUser?.user_id === conv.user_id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {getStatusIcon(conv.status)}
                                        <span>{getStatusLabel(conv.status)}</span>
                                    </div>
                                    {conv.internal_note && (
                                        <StickyNote size={10} className={selectedUser?.user_id === conv.user_id ? 'text-indigo-200' : 'text-slate-300'} />
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}

                    {conversations.length === 0 && (
                        <div className="py-20 text-center space-y-3 px-4">
                            <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-200">
                                <Headset size={32} />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Chưa có hội thoại hỗ trợ nào mới.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Interface */}
            <div className="col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                {selectedUser?.user_id ? (
                    <>
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center space-x-4">
                                <Avatar name={activeConv?.full_name || activeConv?.username || ''} size="md" />
                                <div>
                                    <h5 className="font-bold text-slate-900 leading-tight">{activeConv?.full_name || activeConv?.username}</h5>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-1">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Online</span>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                            {getStatusIcon(activeConv?.status || 'ai_processing')}
                                            <select 
                                                value={activeConv?.status || 'ai_processing'}
                                                onChange={(e) => onStatusChange(activeConv!.user_id, e.target.value)}
                                                className="bg-transparent text-[10px] font-bold text-slate-600 outline-none uppercase tracking-tight cursor-pointer"
                                            >
                                                <option value="ai_processing">AI đang xử lý</option>
                                                <option value="waiting">Chờ Admin</option>
                                                <option value="resolved">Đã giải quyết</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="hidden lg:flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                    <StickyNote size={14} className="text-slate-400 mr-2" />
                                    <input 
                                        type="text" 
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        onBlur={() => onNoteChange(activeConv!.user_id, note)}
                                        placeholder="Ghi chú nội bộ..."
                                        className="bg-transparent text-[11px] font-medium text-slate-600 outline-none w-40"
                                    />
                                </div>
                                <button 
                                    onClick={() => onStatusChange(activeConv!.user_id, 'resolved')}
                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                    title="Đánh dấu hoàn thành"
                                >
                                    <CheckCircle2 size={20} />
                                </button>
                                <button 
                                    onClick={() => onStatusChange(activeConv!.user_id, 'ai_processing')}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                    title="Chuyển cho AI"
                                >
                                    <Bot size={20} />
                                </button>
                            </div>
                        </div>

                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30"
                        >
                            {messages.map((msg, idx) => {
                                const isMe = !msg.is_bot && msg.sender_id !== selectedUser?.user_id;
                                const isEditing = editingMsgId === msg.id;

                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg`}>
                                        <div className={`flex max-w-[80%] items-end space-x-2 ${isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                                            <div className="flex-shrink-0 mb-1">
                                                {msg.is_bot ? (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center p-1.5 shadow-md">
                                                        <Bot size={16} />
                                                    </div>
                                                ) : (
                                                    <Avatar name={msg.sender_name} size="sm" />
                                                )}
                                            </div>
                                            <div className="relative">
                                                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                                    isMe 
                                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                                    : msg.is_bot 
                                                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-bl-none italic'
                                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                                } ${msg.is_recalled ? 'opacity-50 !italic !bg-slate-100 !text-slate-400 !border-slate-200' : ''}`}>
                                                    {isEditing ? (
                                                        <div className="flex flex-col space-y-2 min-w-[200px]">
                                                            <textarea
                                                                className="w-full p-2 bg-white/20 text-white border border-white/30 rounded focus:ring-0 outline-none text-sm resize-none"
                                                                rows={2}
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end space-x-2">
                                                                <button 
                                                                    onClick={() => setEditingMsgId(null)}
                                                                    className="p-1 hover:bg-white/10 rounded"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        onUpdateMessage(msg.id, editContent);
                                                                        setEditingMsgId(null);
                                                                    }}
                                                                    className="p-1 bg-white/20 hover:bg-white/30 rounded"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {msg.content}
                                                            {msg.is_edited && !msg.is_recalled && (
                                                                <span className="text-[9px] opacity-60 ml-1">(đã sửa)</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Actions for Admin messages */}
                                                {isMe && !msg.is_recalled && !isEditing && (
                                                    <div className="absolute top-0 -left-12 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col space-y-1">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingMsgId(msg.id);
                                                                setEditContent(msg.content);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                                            title="Sửa tin nhắn"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => onDeleteMessage(msg.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                                                            title="Thu hồi tin nhắn"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className={`text-[10px] text-slate-400 mt-1.5 flex items-center space-x-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <Clock size={10} />
                                                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white">
                            <div className="relative group">
                                <textarea 
                                    rows={2}
                                    value={replyContent}
                                    onChange={(e) => onReplyChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            onSendReply();
                                        }
                                    }}
                                    placeholder="Viết câu trả lời hỗ trợ..."
                                    className="w-full pl-5 pr-20 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all outline-none resize-none"
                                />
                                <button 
                                    onClick={onSendReply}
                                    disabled={!replyContent.trim() || sendingReply}
                                    className="absolute right-3 bottom-3 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-indigo-200"
                                >
                                    {sendingReply ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Send size={18} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                        <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent animate-pulse"></div>
                            <Headset size={64} className="relative z-10" />
                        </div>
                        <div className="max-w-sm">
                            <h5 className="text-xl font-bold text-slate-900">Trung tâm Hỗ trợ Khách hàng</h5>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                                Chọn một hội thoại ở danh sách bên trái để phản hồi yêu cầu hỗ trợ từ người dùng trong thời gian thực.
                            </p>
                        </div>
                        <div className="flex items-center justify-center space-x-8 text-slate-400">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-indigo-600">{conversations.length}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Đang chờ</span>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-emerald-500">98%</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Phản hồi</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
