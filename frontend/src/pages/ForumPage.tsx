import React, { useEffect, useState, useRef } from 'react';
import { useForumStore } from '../store/useForumStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useViewStore } from '../store/useViewStore';
import { 
    MessageSquare, 
    Heart, 
    Share2, 
    Plus, 
    Search, 
    Image as ImageIcon,
    Send,
    ArrowLeft,
    Sparkles,
    Trash2,
    X,
    MessageCircle,
    UserCircle
} from 'lucide-react';
import { formatRelativeTime } from '../utils/time';
import { Avatar } from '../components/common/Avatar';
import { clsx } from 'clsx';
import type { Post } from '../types/forum';

interface ForumPageProps {
    onBack: () => void;
}

export const ForumPage: React.FC<ForumPageProps> = ({ onBack }) => {
    const { 
        posts, fetchPosts, createPost, likePost, addComment, isLoading, deletePost, 
        summarizePost, analyzePost, fetchComments, postComments 
    } = useForumStore();
    const { currentUser } = useAuthStore();
    const { rooms, fetchRooms, socket } = useChatStore();
    const { targetPostId, clearTargetPost } = useViewStore();
    
    const postRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [newPost, setNewPost] = useState({ title: '', content: '', tags: [] as string[] });
    const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});
    const [summaries, setSummaries] = useState<{[key: string]: { text: string, loading: boolean }}>({});
    const [analyses, setAnalyses] = useState<{[key: string]: { text: string, loading: boolean }}>({});
    const [expandedComments, setExpandedComments] = useState<{[key: string]: boolean}>({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPosts();
        fetchRooms();
    }, []);

    // Deep link scroll logic
    useEffect(() => {
        if (targetPostId && posts.length > 0 && !isLoading) {
            // Wait a bit for the DOM to be ready
            const timer = setTimeout(() => {
                const element = postRefs.current[targetPostId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                    
                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                        clearTargetPost();
                    }, 3000);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [targetPostId, posts, isLoading, clearTargetPost]);

    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleToggleComments = (postId: string) => {
        const isExpanded = !expandedComments[postId];
        setExpandedComments(prev => ({ ...prev, [postId]: isExpanded }));
        if (isExpanded) {
            fetchComments(postId);
        }
    };

    const handleShare = (post: Post) => {
        setSharingPost(post);
        setShowShareModal(true);
    };

    const handleShareToWall = async () => {
        if (!sharingPost) return;
        try {
            await createPost({
                title: `[Shared] ${sharingPost.title}`,
                content: `Chia sẻ từ ${sharingPost.author_name}:\n\n${sharingPost.content}`,
                tags: sharingPost.tags
            });
            setShowShareModal(false);
            setSharingPost(null);
            alert("Đã chia sẻ bài viết lên trang cá nhân của bạn!");
        } catch (error) {
            alert("Lỗi khi chia sẻ bài viết");
        }
    };

    const handleShareToChat = (roomId: string) => {
        if (!sharingPost || !socket || socket.readyState !== WebSocket.OPEN) return;
        
        socket.send(JSON.stringify({
            type: 'message',
            content: `[Shared Post] ${sharingPost.title}`,
            room_id: roomId,
            shared_post: {
                post_id: sharingPost.id,
                title: sharingPost.title,
                content: sharingPost.content,
                author_name: sharingPost.author_name
            }
        }));
        
        setShowShareModal(false);
        setSharingPost(null);
        alert("Đã gửi bài viết cho bạn bè!");
    };

    const handleAnalyze = async (postId: string) => {
        if (analyses[postId]?.text) {
            setAnalyses(prev => {
                const updated = { ...prev };
                delete updated[postId];
                return updated;
            });
            return;
        }

        setAnalyses(prev => ({ ...prev, [postId]: { text: '', loading: true } }));
        try {
            const analysis = await analyzePost(postId);
            setAnalyses(prev => ({ ...prev, [postId]: { text: analysis, loading: false } }));
        } catch (error) {
            setAnalyses(prev => ({ ...prev, [postId]: { text: 'Lỗi phân tích.', loading: false } }));
        }
    };

    const handleSummarize = async (postId: string) => {
        if (summaries[postId]?.text) {
            // Toggle off if already exists
            setSummaries(prev => {
                const updated = { ...prev };
                delete updated[postId];
                return updated;
            });
            return;
        }

        setSummaries(prev => ({ ...prev, [postId]: { text: '', loading: true } }));
        try {
            const summary = await summarizePost(postId);
            setSummaries(prev => ({ ...prev, [postId]: { text: summary, loading: false } }));
        } catch (error) {
            setSummaries(prev => ({ ...prev, [postId]: { text: 'Không thể tóm tắt.', loading: false } }));
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.title.trim() || !newPost.content.trim()) return;
        try {
            await createPost(newPost);
            setNewPost({ title: '', content: '', tags: [] });
            setShowCreateModal(false);
        } catch (error) {
            alert("Lỗi khi đăng bài");
        }
    };

    const handleAddComment = async (postId: string) => {
        const text = commentTexts[postId];
        if (!text?.trim()) return;
        try {
            await addComment(postId, text);
            setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        } catch (error) {
            alert("Lỗi khi bình luận");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#F0F2F5] overflow-hidden">
            {/* Header */}
            <header className="h-[60px] bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Diễn đàn cộng đồng</h1>
                </div>
                
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 w-64">
                        <Search size={16} className="text-gray-500 mr-2" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm bài viết..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm w-full" 
                        />
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Đăng bài</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-6 pb-10 px-4">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Create Post Card */}
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
                        <div className="flex items-center space-x-3">
                            <Avatar name={currentUser?.username || ''} size="md" />
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full py-2.5 px-5 text-left text-gray-500 transition-colors"
                            >
                                {currentUser?.username}, bạn đang nghĩ gì?
                            </button>
                        </div>
                        <div className="h-[1px] bg-gray-100 my-3" />
                        <div className="flex items-center justify-around">
                            <button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors">
                                <ImageIcon size={20} className="text-green-500" />
                                <span className="font-semibold text-sm">Ảnh/Video</span>
                            </button>
                            <button className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors">
                                <MessageSquare size={20} className="text-orange-500" />
                                <span className="font-semibold text-sm">Chủ đề</span>
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center py-20 animate-pulse">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-gray-500">Đang tải bài viết...</p>
                        </div>
                    ) : (
                        filteredPosts.map(post => (
                            <div 
                                key={post.id} 
                                ref={el => { postRefs.current[post.id] = el; }}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24 transition-all duration-500"
                            >
                                {/* Post Header */}
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Avatar name={post.author_name} url={post.author_avatar} size="md" />
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-tight hover:underline cursor-pointer">{post.author_name}</h3>
                                            <p className="text-[12px] text-gray-500">{formatRelativeTime(post.timestamp)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button 
                                            onClick={() => handleSummarize(post.id)}
                                            className={clsx(
                                                "flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all",
                                                summaries[post.id] 
                                                    ? "bg-purple-600 text-white shadow-md" 
                                                    : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                                            )}
                                            title="Tóm tắt nội dung bằng AI"
                                        >
                                            <Sparkles size={14} className={summaries[post.id]?.loading ? "animate-spin" : ""} />
                                            <span>{summaries[post.id] ? "Đang xem tóm tắt" : "AI Tóm tắt"}</span>
                                        </button>
                                        <button 
                                            onClick={() => handleAnalyze(post.id)}
                                            className={clsx(
                                                "flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all",
                                                analyses[post.id] 
                                                    ? "bg-blue-600 text-white shadow-md" 
                                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            )}
                                            title="AI nhận xét & góp ý"
                                        >
                                            <Sparkles size={14} className={analyses[post.id]?.loading ? "animate-spin" : ""} />
                                            <span>{analyses[post.id] ? "Góp ý AI" : "Buddy Insight"}</span>
                                        </button>
                                        {(post.author_id === currentUser?.id || currentUser?.is_superuser) && (
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm("Bạn có chắc muốn xóa bài viết này?")) {
                                                        deletePost(post.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* AI Summary View */}
                                {summaries[post.id] && (
                                    <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <div className="p-1 bg-purple-600 rounded-lg">
                                                <Sparkles size={12} className="text-white" />
                                            </div>
                                            <span className="text-[12px] font-black uppercase tracking-widest text-purple-700">LinkUp AI Insight</span>
                                        </div>
                                        {summaries[post.id].loading ? (
                                            <div className="flex space-x-1 py-1">
                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                            </div>
                                        ) : (
                                            <p className="text-[14px] text-slate-700 leading-relaxed italic italic-serif">
                                                "{summaries[post.id].text}"
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* AI Analysis View */}
                                {analyses[post.id] && (
                                    <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <div className="p-1 bg-blue-600 rounded-lg">
                                                <Sparkles size={12} className="text-white" />
                                            </div>
                                            <span className="text-[12px] font-black uppercase tracking-widest text-blue-700">LinkUp AI Analysis</span>
                                        </div>
                                        {analyses[post.id].loading ? (
                                            <div className="flex space-x-1 py-1">
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                            </div>
                                        ) : (
                                            <p className="text-[14px] text-slate-700 leading-relaxed italic italic-serif">
                                                "{analyses[post.id].text}"
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Post Content */}
                                <div className="px-4 pb-3">
                                    <h2 className="text-lg font-extrabold text-gray-900 mb-2">{post.title}</h2>
                                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                    {post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {post.tags.map(tag => (
                                                <span key={tag} className="text-sm text-blue-600 font-medium">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="px-4 py-2 flex items-center justify-between border-t border-gray-50">
                                    <div className="flex items-center space-x-1 text-gray-500 text-sm">
                                        <div className="bg-blue-500 p-1 rounded-full">
                                            <Heart size={10} className="text-white fill-white" />
                                        </div>
                                        <span>{post.likes.length} lượt thích</span>
                                    </div>
                                    <div className="text-gray-500 text-sm">
                                        <span>{post.comment_count} bình luận</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-2 py-1 flex items-center justify-around border-t border-gray-100">
                                    <button 
                                        onClick={() => likePost(post.id)}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center space-x-2 py-2 hover:bg-gray-50 rounded-lg transition-colors font-semibold",
                                            post.is_liked ? "text-blue-600" : "text-gray-600"
                                        )}
                                    >
                                        <Heart size={20} className={post.is_liked ? "fill-blue-600" : ""} />
                                        <span>Thích</span>
                                    </button>
                                    <button 
                                        onClick={() => handleToggleComments(post.id)}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center space-x-2 py-2 hover:bg-gray-50 rounded-lg transition-colors font-semibold",
                                            expandedComments[post.id] ? "text-blue-600 bg-blue-50" : "text-gray-600"
                                        )}
                                    >
                                        <MessageSquare size={20} />
                                        <span>Bình luận</span>
                                    </button>
                                    <button 
                                        onClick={() => handleShare(post)}
                                        className="flex-1 flex items-center justify-center space-x-2 py-2 hover:bg-gray-50 rounded-lg text-gray-600 transition-colors font-semibold"
                                    >
                                        <Share2 size={20} />
                                        <span>Chia sẻ</span>
                                    </button>
                                </div>

                                {/* Comments List */}
                                {expandedComments[post.id] && (
                                    <div className="px-4 py-2 border-t border-gray-50 space-y-3 bg-gray-50/20">
                                        {postComments[post.id]?.map((comment) => (
                                            <div key={comment.id} className="flex space-x-2">
                                                <Avatar name={comment.author_name} url={comment.author_avatar} size="sm" />
                                                <div className="flex-1">
                                                    <div className="bg-gray-100 rounded-2xl px-3 py-1.5 inline-block max-w-[90%]">
                                                        <p className="font-bold text-[12px] text-gray-900">{comment.author_name}</p>
                                                        <p className="text-sm text-gray-800">{comment.content}</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 ml-2">
                                                        {formatRelativeTime(comment.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!postComments[post.id] || postComments[post.id].length === 0) && (
                                            <p className="text-center text-gray-400 text-xs py-2 italic font-medium">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                                        )}
                                    </div>
                                )}

                                {/* Comment Input */}
                                <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center space-x-2">
                                    <Avatar name={currentUser?.username || ''} size="sm" />
                                    <div className="flex-1 relative">
                                        <input 
                                            type="text" 
                                            placeholder="Viết bình luận..." 
                                            value={commentTexts[post.id] || ''}
                                            onChange={(e) => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                            className="w-full bg-gray-100 border-none rounded-full py-2 px-4 text-sm focus:ring-1 focus:ring-blue-100"
                                        />
                                        <button 
                                            onClick={() => handleAddComment(post.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-full"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Create Post Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-center flex-1">Tạo bài viết mới</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePost} className="p-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <Avatar name={currentUser?.username || ''} size="md" />
                                <div>
                                    <p className="font-bold">{currentUser?.username}</p>
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[12px] font-bold text-gray-600">Công khai</span>
                                </div>
                            </div>
                            
                            <input 
                                type="text"
                                placeholder="Tiêu đề bài viết..."
                                value={newPost.title}
                                onChange={(e) => setNewPost(prev => ({...prev, title: e.target.value}))}
                                className="w-full border-none text-xl font-bold placeholder:text-gray-400 focus:ring-0 mb-2"
                            />
                            
                            <textarea 
                                placeholder={`${currentUser?.username} ơi, bạn đang nghĩ gì thế?`}
                                value={newPost.content}
                                onChange={(e) => setNewPost(prev => ({...prev, content: e.target.value}))}
                                className="w-full border-none text-lg min-h-[150px] placeholder:text-gray-400 focus:ring-0 resize-none"
                            />
                            
                            <div className="mt-4 flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                                <span className="font-bold text-sm">Thêm vào bài viết</span>
                                <div className="flex space-x-1">
                                    <button type="button" className="p-2 hover:bg-gray-100 rounded-full"><ImageIcon size={20} className="text-green-500" /></button>
                                    <button type="button" className="p-2 hover:bg-gray-100 rounded-full"><MessageSquare size={20} className="text-blue-500" /></button>
                                </div>
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={!newPost.title.trim() || !newPost.content.trim()}
                                className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                            >
                                Đăng
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && sharingPost && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold">Chia sẻ bài viết</h2>
                            <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-4">
                            {/* Share to Wall */}
                            <button 
                                onClick={handleShareToWall}
                                className="w-full flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors space-x-3 border border-gray-100 shadow-sm"
                            >
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full">
                                    <UserCircle size={22} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900">Chia sẻ về trang cá nhân của bạn</p>
                                    <p className="text-xs text-gray-500">Bài viết sẽ xuất hiện dưới dạng lượt chia sẻ trên bảng tin</p>
                                </div>
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold tracking-wider">Hoặc gửi cho bạn bè</span></div>
                            </div>

                            {/* Share to Friends/Rooms */}
                            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {rooms.filter(r => 
                                    r.type !== 'ai' && 
                                    !['Help & Support', 'General', 'AI Assistant'].includes(r.name)
                                ).length > 0 ? (
                                    rooms
                                        .filter(r => r.type !== 'ai' && !['Help & Support', 'General', 'AI Assistant'].includes(r.name))
                                        .map(room => (
                                            <button 
                                                key={room.id}
                                                onClick={() => handleShareToChat(room.id)}
                                                className="w-full flex items-center p-2.5 hover:bg-blue-50 rounded-xl transition-colors space-x-3 group"
                                            >
                                                <Avatar name={room.name} url={room.avatar_url} size="sm" />
                                                <div className="flex-1 text-left">
                                                    <p className="font-bold text-sm text-gray-900 group-hover:text-blue-700">{room.name}</p>
                                                    <p className="text-[11px] text-gray-500">Gửi trong tin nhắn</p>
                                                </div>
                                                <MessageCircle size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                            </button>
                                        ))
                                ) : (
                                    <p className="text-center text-gray-400 text-sm py-8 italic">Không tìm thấy bạn bè để chia sẻ</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${sharingPost.title}\n${window.location.href}`);
                                    alert("Đã sao chép liên kết!");
                                }}
                                className="w-full py-2 text-gray-600 font-bold text-sm hover:text-blue-600 transition-colors"
                            >
                                Sao chép liên kết bài viết
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
