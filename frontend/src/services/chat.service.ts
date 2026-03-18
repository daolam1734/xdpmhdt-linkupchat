import api from './api';

export const chatService = {
    getRooms: () => api.get('/rooms/'),
    getMessages: (roomId: string) => api.get(`/messages/${roomId}/messages/`),
    uploadFile: (formData: FormData, category: string = 'file', roomId?: string) => {
        let url = `/files/upload?category=${category}`;
        if (roomId) url += `&room_id=${roomId}`;
        return api.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    clearHistory: (roomId: string) => api.delete(`/messages/${roomId}/clear/`),
    searchMessages: (query: string, roomId?: string) => api.get(`/messages/search/`, {
        params: { query, room_id: roomId }
    }),
    togglePin: (roomId: string) => api.post(`/rooms/${roomId}/pin`),
    deleteRoom: (roomId: string) => api.delete(`/rooms/${roomId}`),
    getRoomMembers: (roomId: string) => api.get(`/rooms/${roomId}/members`),
    updateRoom: (roomId: string, data: { name?: string, avatar_url?: string }) => api.patch(`/rooms/${roomId}`, data),
    addMembers: (roomId: string, memberIds: string[]) => api.post(`/rooms/${roomId}/members`, { member_ids: memberIds }),
    updateMemberRole: (roomId: string, userId: string, role: string) => api.patch(`/rooms/${roomId}/members/${userId}/role`, { role }),
    removeMember: (roomId: string, userId: string) => api.delete(`/rooms/${roomId}/members/${userId}`),
};
