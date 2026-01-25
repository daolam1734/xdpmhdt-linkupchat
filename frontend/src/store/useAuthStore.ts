import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { setAuthToken } from '../services/api';
import { blockUser, unblockUser } from '../api/users';
import type { User } from '../types/chat';

interface AuthState {
    token: string | null;
    currentUser: User | null;
    isLoading: boolean;
    error: string | null;

    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, password: string) => Promise<void>;
    logout: () => void;
    fetchCurrentUser: () => Promise<void>;
    blockUser: (userId: string) => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    updateProfile: (data: { 
        username?: string; 
        avatar_url?: string; 
        bio?: string; 
        allow_stranger_messages?: boolean;
        ai_preferences?: {
            preferred_style?: 'short' | 'balanced' | 'detailed';
            coding_frequency?: 'low' | 'medium' | 'high';
            language?: 'vi' | 'en';
        };
        app_settings?: {
            theme?: 'light' | 'dark';
            language?: 'vi' | 'en';
            notifications?: boolean;
        };
        ai_settings?: {
            context_access?: boolean;
            personalized_training?: boolean;
        };
    }) => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    token: localStorage.getItem('chat_token'),
    currentUser: null,
    isLoading: false,
    error: null,

    initialize: async () => {
        const token = localStorage.getItem('chat_token');
        if (token) {
            setAuthToken(token);
            await get().fetchCurrentUser();
        }
    },

    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await authService.login(params);
            const { access_token } = response.data;

            setAuthToken(access_token);
            set({ token: access_token });
            
            await get().fetchCurrentUser();
        } catch (error: any) {
            const msg = error.response?.data?.detail || 'Đăng nhập thất bại';
            set({ error: msg });
            throw new Error(msg);
        } finally {
            set({ isLoading: false });
        }
    },

    signup: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            await authService.signup({ username, password });
        } catch (error: any) {
            const msg = error.response?.data?.detail || 'Đăng ký thất bại';
            set({ error: msg });
            throw new Error(msg);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchCurrentUser: async () => {
        try {
            const response = await authService.getMe();
            set({ currentUser: { ...response.data, isOnline: true } });
        } catch (error) {
            set({ token: null, currentUser: null });
            setAuthToken(null);
        }
    },

    blockUser: async (userId: string) => {
        try {
            await blockUser(userId);
            set(state => {
                if (!state.currentUser) return state;
                const blocked = state.currentUser.blocked_users || [];
                if (!blocked.includes(userId)) {
                    return {
                        currentUser: {
                            ...state.currentUser,
                            blocked_users: [...blocked, userId]
                        }
                    };
                }
                return state;
            });
        } catch (error) {
            console.error('Block failed:', error);
            throw error;
        }
    },

    unblockUser: async (userId: string) => {
        try {
            await unblockUser(userId);
            set(state => {
                if (!state.currentUser) return state;
                const blocked = state.currentUser.blocked_users || [];
                return {
                    currentUser: {
                        ...state.currentUser,
                        blocked_users: blocked.filter(id => id !== userId)
                    }
                };
            });
        } catch (error) {
            console.error('Unblock failed:', error);
            throw error;
        }
    },

    updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.updateMe(data);
            set({ currentUser: { ...response.data, isOnline: true } });
        } catch (error: any) {
            const msg = error.response?.data?.detail || 'Cập nhật thất bại';
            set({ error: msg });
            throw new Error(msg);
        } finally {
            set({ isLoading: false });
        }
    },

    logout: () => {
        setAuthToken(null);
        set({ token: null, currentUser: null });
    }
}));
