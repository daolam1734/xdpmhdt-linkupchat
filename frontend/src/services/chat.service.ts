import api from './api';

export const chatService = {
    getRooms: () => api.get('/rooms/'),
    getMessages: (roomId: string) => api.get(`/messages/${roomId}/messages/`),
    uploadFile: (formData: FormData) => api.post('/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }),
    clearHistory: (roomId: string) => api.delete(`/messages/${roomId}/clear/`),
    searchMessages: (query: string, roomId?: string) => api.get(`/messages/search/`, {
        params: { query, room_id: roomId }
    }),
};
