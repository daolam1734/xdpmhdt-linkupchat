import { create } from 'zustand';

type ViewType = 'landing' | 'chat' | 'admin' | 'auth';

interface ViewState {
    currentView: ViewType;
    setView: (view: ViewType) => void;
}

export const useViewStore = create<ViewState>((set) => ({
    currentView: 'landing',
    setView: (view) => set({ currentView: view }),
}));
