import api from './api';

export const authService = {
    login: (params: URLSearchParams) => api.post('/auth/login', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
    signup: (data: { username: string; password: string }) => api.post('/auth/signup', data),
    getMe: () => api.get('/auth/me'),
    updateMe: (data: { username?: string; avatar_url?: string; bio?: string }) => api.patch('/auth/me', data),
};
