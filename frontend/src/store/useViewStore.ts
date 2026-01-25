import { create } from 'zustand';

type ViewType = 'chat' | 'admin';

interface ViewState {
    currentView: ViewType;
    setView: (view: ViewType) => void;
}

export const useViewStore = create<ViewState>((set) => ({
    currentView: 'chat',
    setView: (view) => set({ currentView: view }),
}));
