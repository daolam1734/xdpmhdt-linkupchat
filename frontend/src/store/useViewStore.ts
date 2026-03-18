import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewType = 'landing' | 'chat' | 'admin' | 'auth';
type ProfileTabType = 'profile' | 'privacy' | 'app' | 'ai';
type AdminTabType = 'overview' | 'users' | 'rooms' | 'settings' | 'support' | 'reports' | 'ai_assistant';

interface ViewState {
    currentView: ViewType;
    profileTab: ProfileTabType;
    adminTab: AdminTabType;
    isHydrated: boolean;
    setView: (view: ViewType) => void;
    setProfileTab: (tab: ProfileTabType) => void;
    setAdminTab: (tab: AdminTabType) => void;
    setHydrated: (val: boolean) => void;
    reset: () => void;
}

export const useViewStore = create<ViewState>()(
    persist(
        (set) => ({
            currentView: 'landing',
            profileTab: 'profile',
            adminTab: 'overview',
            isHydrated: false,
            setView: (view) => set({ currentView: view }),
            setProfileTab: (tab) => set({ profileTab: tab }),
            setAdminTab: (tab) => set({ adminTab: tab }),
            setHydrated: (val) => set({ isHydrated: val }),
            reset: () => set({ currentView: 'landing', profileTab: 'profile', adminTab: 'overview' }),
        }),
        {
            name: 'linkup-view-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            }
        }
    )
);
