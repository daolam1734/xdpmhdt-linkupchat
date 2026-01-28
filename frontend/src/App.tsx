import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import { useChatStore } from './store/useChatStore'
import { useViewStore } from './store/useViewStore'
import { ChatPage } from './pages/ChatPage'
import { AuthPage } from './pages/AuthPage'
import { LandingPage } from './pages/LandingPage'
import { AdminPage } from './pages/AdminPage'
import { MessageCircle } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

function App() {
  const { token, currentUser, isLoading: authLoading, initialize } = useAuthStore();
  const { fetchRooms, connect, disconnect, isHydrated: chatHydrated } = useChatStore();
  const { currentView, setView, isHydrated: viewHydrated } = useViewStore();

  const isFullyHydrated = chatHydrated && viewHydrated;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isFullyHydrated) return;

    if (token && currentUser) {
        fetchRooms();
        connect(token);
        // Chỉ chuyển sang view 'chat' nếu đang ở view ngoài (landing/auth)
        if (currentView === 'landing' || currentView === 'auth') {
            setView('chat');
        }
    } else if (!token && !authLoading) {
        // Khi logout thực sự (không có token và không đang load), reset trạng thái
        useChatStore.getState().reset();
        useViewStore.getState().reset();
    }
  }, [token, currentUser, authLoading, fetchRooms, connect, setView, currentView, isFullyHydrated]);

  const renderContent = () => {
    if ((authLoading && !currentUser) || !isFullyHydrated) {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                  <MessageCircle size={32} className="text-white fill-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">LinkUp</h2>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-blue-500 font-medium animate-pulse text-sm text-center max-w-[280px]">
                  LinkUp giúp cộng đồng kết nối và thảo luận hiệu quả
              </p>
          </div>
      );
    }

    if (token && currentUser) {
      if (currentView === 'admin' && (currentUser.role === 'admin' || currentUser.is_superuser)) {
          return <AdminPage onBack={() => setView('chat')} />;
      }
      return (
          <ChatPage 
              onNavigateToAdmin={() => setView('admin')} 
          />
      );
    }

    if (currentView === 'auth') {
        return <AuthPage onBack={() => setView('landing')} />;
    }

    return <LandingPage />;
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {renderContent()}
    </>
  );
}

export default App
