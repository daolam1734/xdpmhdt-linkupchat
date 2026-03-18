import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { getFriends } from '../../api/users';
import type { UserSearchItem } from '../../api/users';
import { Avatar } from '../common/Avatar';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (memberIds: string[]) => Promise<void>;
    existingMemberIds: string[];
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAdd, existingMemberIds }) => {
    const [friends, setFriends] = useState<UserSearchItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFriends();
        } else {
            setSelectedIds([]);
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchFriends = async () => {
        setFetching(true);
        try {
            const data = await getFriends();
            // Filter out existing members
            setFriends(data.filter(f => !existingMemberIds.includes(f.id)));
        } catch (error) {
            toast.error("Không thể tải danh sách bạn bè");
        } finally {
            setFetching(false);
        }
    };

    const toggleSelect = (userId: string) => {
        setSelectedIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId) 
                : [...prev, userId]
        );
    };

    const handleAdd = async () => {
        if (selectedIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 người");
            return;
        }

        setLoading(true);
        try {
            await onAdd(selectedIds);
            onClose();
        } catch (error) {
            // Error toast handled in store
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredFriends = friends.filter(f => 
        (f.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        f.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <UserPlus size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Thêm thành viên</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm bạn bè..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <p className="text-sm">Đang tải danh sách...</p>
                        </div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <p className="text-sm">{searchTerm ? "Không tìm thấy kết quả" : "Không có bạn bè khả dụng"}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredFriends.map(friend => (
                                <button
                                    key={friend.id}
                                    onClick={() => toggleSelect(friend.id)}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-3 rounded-2xl transition-all group active:scale-[0.98]",
                                        selectedIds.includes(friend.id) ? "bg-blue-50" : "hover:bg-gray-50"
                                    )}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            <Avatar 
                                                url={friend.avatar_url} 
                                                name={friend.full_name || friend.username} 
                                                size="md"
                                            />
                                            {selectedIds.includes(friend.id) && (
                                                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{friend.full_name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">@{friend.username}</p>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        selectedIds.includes(friend.id) 
                                            ? "border-blue-600 bg-blue-600 text-white" 
                                            : "border-gray-300 group-hover:border-blue-400"
                                    )}>
                                        {selectedIds.includes(friend.id) && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={handleAdd}
                        disabled={loading || selectedIds.length === 0}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                <Check size={20} />
                                <span>Thêm vào nhóm ({selectedIds.length})</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
