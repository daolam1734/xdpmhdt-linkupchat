import { create } from 'zustand';
import api from '../services/api';
import type { Post, Comment } from '../types/forum';

interface ForumState {
    posts: Post[];
    isLoading: boolean;
    error: string | null;
    postComments: { [postId: string]: Comment[] };
    
    fetchPosts: () => Promise<void>;
    fetchComments: (postId: string) => Promise<void>;
    createPost: (post: { title: string, content: string, tags: string[] }) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    addComment: (postId: string, content: string) => Promise<Comment>;
    deletePost: (postId: string) => Promise<void>;
    summarizePost: (postId: string) => Promise<string>;
    analyzePost: (postId: string) => Promise<string>;
}

const useForumStore = create<ForumState>((set) => ({
    posts: [],
    isLoading: false,
    error: null,
    postComments: {},

    fetchPosts: async () => {
        set({ isLoading: true });
        try {
            const response = await api.get('/forum/posts');
            set({ posts: response.data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchComments: async (postId) => {
        try {
            const response = await api.get(`/forum/posts/${postId}`);
            set(state => ({
                postComments: {
                    ...state.postComments,
                    [postId]: response.data.comments
                }
            }));
        } catch (error: any) {
            console.error('Fetch comments error:', error);
        }
    },

    createPost: async (postData) => {
        try {
            const response = await api.post('/forum/posts', postData);
            set(state => ({ posts: [response.data, ...state.posts] }));
        } catch (error: any) {
            throw error;
        }
    },

    likePost: async (postId) => {
        try {
            const response = await api.post(`/forum/posts/${postId}/like`);
            
            set(state => ({
                posts: state.posts.map(p => {
                    if (p.id === postId) {
                        return { 
                            ...p, 
                            is_liked: response.data.liked,
                            likes: response.data.likes
                        };
                    }
                    return p;
                })
            }));
        } catch (error) {
            console.error('Like error:', error);
        }
    },

    addComment: async (postId, content) => {
        try {
            const response = await api.post(`/forum/posts/${postId}/comments`, { content });
            const newComment = response.data;

            set(state => ({
                posts: state.posts.map(p => 
                    p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
                ),
                postComments: {
                    ...state.postComments,
                    [postId]: [...(state.postComments[postId] || []), newComment]
                }
            }));
            
            return newComment;
        } catch (error: any) {
            throw error;
        }
    },

    deletePost: async (postId) => {
        try {
            await api.delete(`/forum/posts/${postId}`);
            set(state => ({
                posts: state.posts.filter(p => p.id !== postId)
            }));
        } catch (error: any) {
            throw error;
        }
    },

    summarizePost: async (postId) => {
        try {
            const response = await api.post(`/forum/posts/${postId}/summarize`);
            return response.data.summary;
        } catch (error: any) {
            throw error;
        }
    },

    analyzePost: async (postId) => {
        try {
            const response = await api.post(`/forum/posts/${postId}/analyze`);
            return response.data.analysis;
        } catch (error: any) {
            throw error;
        }
    }
}));

export { useForumStore };
