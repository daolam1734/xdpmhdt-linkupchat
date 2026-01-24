import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

export const useChat = () => {
    const { 
        messages, 
        isConnected, 
        rooms,
        activeRoom, 
        connect, 
        disconnect, 
        sendMessage,
        fetchRooms,
        setActiveRoom
    } = useChatStore();

    const { currentUser, logout, token } = useAuthStore();

    const handleSendMessage = (content: string, replyToId?: string) => {
        if (!content.trim() && content !== '👍') return;
        const success = sendMessage(content, replyToId);
        if (!success) {
            console.error('Message failed to send. Check connection.');
        }
    };

    return {
        messages,
        isConnected,
        currentUser,
        rooms,
        activeRoom,
        token,
        connect,
        disconnect,
        logout,
        sendMessage: handleSendMessage,
        fetchRooms,
        setActiveRoom
    };
};
