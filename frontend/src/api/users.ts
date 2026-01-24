import api from '../services/api';

export interface UserSearchItem {
    id: string;
    username: string;
    avatar_url?: string;
    bio?: string;
    is_friend?: boolean;
    is_online?: boolean;
    allow_stranger_messages?: boolean;
    request_sent?: boolean;
    request_id?: string;
}

export interface FriendRequest {
    request_id: string;
    user_id: string;
    username: string;
    avatar_url?: string;
    created_at: string;
}

export const searchUsers = async (q: string): Promise<UserSearchItem[]> => {
    const response = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    return response.data;
};

export const startDirectChat = async (userId: string) => {
    const response = await api.post(`/users/direct-chat/${userId}`);
    return response.data;
};

export const sendFriendRequest = async (userId: string) => {
    const response = await api.post(`/users/friend-request/${userId}`);
    return response.data;
};

export const acceptFriendRequest = async (requestId: string) => {
    const response = await api.post(`/users/friend-request/${requestId}/accept`);
    return response.data;
};

export const rejectFriendRequest = async (requestId: string) => {
    const response = await api.post(`/users/friend-request/${requestId}/reject`);
    return response.data;
};

export const getPendingRequests = async (): Promise<FriendRequest[]> => {
    const response = await api.get('/users/friend-requests/pending');
    return response.data;
};

export const getFriends = async (): Promise<UserSearchItem[]> => {
    const response = await api.get('/users/friends');
    return response.data;
};

export const getUserProfile = async (userId: string): Promise<UserSearchItem> => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
};
