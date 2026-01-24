import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import { useChatStore } from './store/useChatStore'
import { useViewStore } from './store/useViewStore'
import { ChatPage } from './pages/ChatPage'
import { AuthPage } from './pages/AuthPage'
import { AdminPage } from './pages/AdminPage'
import { ForumPage } from './pages/ForumPage'
import { MessageCircle } from 'lucide-react'

function App() {
  const { token, currentUser, isLoading: authLoading, initialize } = useAuthStore();
  const { fetchRooms, connect, disconnect } = useChatStore();
  const { currentView, setView } = useViewStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (token && currentUser) {
        fetchRooms();
        connect(token);
    } else {
        disconnect();
        setView('chat');
    }
  }, [token, currentUser, fetchRooms, connect, disconnect, setView]);

  // Loading state for initial session check
  if (authLoading && !currentUser) {
     return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <MessageCircle size={32} className="text-white fill-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">LinkUp</h2>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-blue-500 font-medium animate-pulse text-sm">Nơi mọi cuộc trò chuyện bắt đầu...</p>
        </div>
     );
  }

  // Final view decision: Role Based Guard
  if (token && currentUser) {
     if (currentView === 'admin' && currentUser.is_superuser) {
        return <AdminPage onBack={() => setView('chat')} />;
     }
     if (currentView === 'forum') {
        return <ForumPage onBack={() => setView('chat')} />;
     }
     return <ChatPage 
        onNavigateToAdmin={() => setView('admin')} 
        onNavigateToForum={() => setView('forum')}
     />;
  }

  return <AuthPage />;
}

export default App
