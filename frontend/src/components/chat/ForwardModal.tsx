import React, { useState } from 'react';
import { X, Search, Send, Share2 } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { Avatar } from '../common/Avatar';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export const ForwardModal: React.FC = () => {
    const { 
        forwardingMessage, 
        setForwardingMessage, 
        rooms, 
        forwardMessage 
    } = useChatStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [forwardedIds, setForwardedIds] = useState<string[]>([]);

    if (!forwardingMessage) return null;

    const filteredRooms = rooms.filter(room => 
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        room.id !== 'ai' // Typically don't forward to AI general bot like this
    );

    const handleForward = async (roomId: string) => {
        if (forwardedIds.includes(roomId)) return;
        
        const success = await forwardMessage(forwardingMessage, roomId);
        if (success) {
            setForwardedIds(prev => [...prev, roomId]);
            toast.success(`Đã chuyển tiếp tới ${rooms.find(r => r.id === roomId)?.name}`);
        } else {
            toast.error("Không thể chuyển tiếp tin nhắn");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Share2 size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Chuyển tiếp tin nhắn</h2>
                    </div>
                    <button 
                        onClick={() => setForwardingMessage(null)} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng hoặc nhóm..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Rooms List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredRooms.length > 0 ? (
                        filteredRooms.map(room => (
                            <div 
                                key={room.id}
                                className="flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/50 transition-colors group"
                            >
                                <div className="flex items-center space-x-3 min-w-0">
                                    <Avatar 
                                        url={room.avatar_url} 
                                        name={room.name} 
                                        size="sm"
                                        isOnline={room.is_online}
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">{room.name}</h3>
                                        <p className="text-[11px] text-gray-500 truncate capitalize">{room.type}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleForward(room.id)}
                                    disabled={forwardedIds.includes(room.id)}
                                    className={clsx(
                                        "px-4 py-1.5 rounded-full text-[12px] font-bold transition-all flex items-center space-x-1.5 shadow-sm",
                                        forwardedIds.includes(room.id)
                                            ? "bg-emerald-100 text-emerald-600 cursor-default"
                                            : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                                    )}
                                >
                                    {forwardedIds.includes(room.id) ? (
                                        <>
                                            <Send size={12} className="fill-current" />
                                            <span>Đã gửi</span>
                                        </>
                                    ) : (
                                        <span>Gửi</span>
                                    )}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-gray-400 text-sm">Không tìm thấy kết quả</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={() => setForwardingMessage(null)}
                        className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                    >
                        Xong
                    </button>
                </div>
            </div>
        </div>
    );
};
