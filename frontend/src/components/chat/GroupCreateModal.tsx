import React, { useState, useEffect } from 'react';
import { X, Search, Users, Check, Loader2 } from 'lucide-react';
import { getFriends } from '../../api/users';
import type { UserSearchItem } from '../../api/users';
import { createGroupChat } from '../../api/rooms';
import { Avatar } from '../common/Avatar';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface GroupCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (room: any) => void;
}

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [friends, setFriends] = useState<UserSearchItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFriends();
        } else {
            // Reset state
            setGroupName('');
            setSelectedIds([]);
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchFriends = async () => {
        setFetching(true);
        try {
            const data = await getFriends();
            setFriends(data);
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

    const handleCreate = async () => {
        if (!groupName.trim()) {
            toast.error("Vui lòng nhập tên nhóm");
            return;
        }
        if (selectedIds.length < 2) {
            toast.error("Nhóm phải có ít nhất 3 người (bao gồm bạn)");
            return;
        }

        setLoading(true);
        try {
            const room = await createGroupChat({
                name: groupName,
                member_ids: selectedIds
            });
            toast.success("Đã tạo nhóm chat!");
            onSuccess(room);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Lỗi khi tạo nhóm");
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
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Tạo nhóm mới</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Group Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Tên nhóm</label>
                        <input 
                            type="text" 
                            placeholder="Nhập tên nhóm của bạn..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    {/* Friend Search & Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-sm font-bold text-gray-700">Chọn thành viên ({selectedIds.length})</label>
                            {fetching && <Loader2 size={14} className="animate-spin text-blue-500" />}
                        </div>
                        
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Tìm kiếm bạn bè..."
                                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1 mt-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredFriends.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="text-sm text-gray-400 italic">
                                        {searchTerm ? "Không tìm thấy bạn nào phù hợp" : "Bạn chưa có người bạn nào"}
                                    </p>
                                </div>
                            ) : (
                                filteredFriends.map(friend => (
                                    <div 
                                        key={friend.id}
                                        onClick={() => toggleSelect(friend.id)}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all group",
                                            selectedIds.includes(friend.id) 
                                                ? "bg-blue-50 text-blue-700" 
                                                : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Avatar name={friend.full_name || friend.username} url={friend.avatar_url} size="md" />
                                            <div>
                                                <p className="text-sm font-bold">{friend.full_name || friend.username}</p>
                                                <p className="text-[10px] opacity-70">@{friend.username}</p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedIds.includes(friend.id)
                                                ? "bg-blue-500 border-blue-500 text-white"
                                                : "border-gray-200 group-hover:border-gray-300"
                                        )}>
                                            {selectedIds.includes(friend.id) && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 flex items-center space-x-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-2xl transition-all"
                    >
                        Hủy
                    </button>
                    <button 
                        disabled={loading || !groupName.trim() || selectedIds.length < 2}
                        onClick={handleCreate}
                        className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <span>Tạo nhóm ngay</span>
                                <Check size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
