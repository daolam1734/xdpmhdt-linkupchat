import { create } from 'zustand';

type ViewType = 'chat' | 'admin' | 'forum';

interface ViewState {
    currentView: ViewType;
    targetPostId: string | null;
    setView: (view: ViewType, postId?: string) => void;
    clearTargetPost: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
    currentView: 'chat',
    targetPostId: null,
    setView: (view, postId) => set({ currentView: view, targetPostId: postId || null }),
    clearTargetPost: () => set({ targetPostId: null }),
}));
