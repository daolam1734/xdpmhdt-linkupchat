import api from '../services/api';

export interface GroupCreateData {
    name: string;
    member_ids: string[];
}

export const createGroupChat = async (data: GroupCreateData) => {
    const response = await api.post('/rooms/group', data);
    return response.data;
};
