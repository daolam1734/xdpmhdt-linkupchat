import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewType = 'landing' | 'chat' | 'admin' | 'auth';

interface ViewState {
    currentView: ViewType;
    setView: (view: ViewType) => void;
}

export const useViewStore = create<ViewState>()(
    persist(
        (set) => ({
            currentView: 'landing',
            setView: (view) => set({ currentView: view }),
        }),
        {
            name: 'linkup-view-storage',
        }
    )
);
