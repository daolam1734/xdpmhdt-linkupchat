import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

/**
 * Utility to set/remove auth token from headers
 */
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('chat_token', token);
    } else {
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('chat_token');
    }
};

// Request interceptor to ensure latest token (backup for refetching)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('chat_token');
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('Session expired. Redirecting to login...');
            setAuthToken(null);
            // This will trigger state changes in components observing the token
        }
        return Promise.reject(error);
    }
);

export default api;
