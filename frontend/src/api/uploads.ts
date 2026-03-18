import api from '../services/api';

export const uploadFile = async (file: File, category: 'avatar' | 'file' = 'file', roomId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    
    let url = `/files/upload?category=${category}`;
    if (roomId) url += `&room_id=${roomId}`;

    const response = await api.post(url, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    
    return response.data;
};
