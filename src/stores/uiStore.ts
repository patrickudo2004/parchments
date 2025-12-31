import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
    theme: 'light' | 'dark';
    leftSidebarWidth: number;
    rightSidebarWidth: number;
    rightSidebarOpen: boolean;
    rightSidebarContent: 'bible' | 'search' | null;
    isBibleModalOpen: boolean;
    isStrongsModalOpen: boolean;

    // Actions
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleBibleModal: () => void;
    toggleStrongsModal: () => void;
    setLeftSidebarWidth: (width: number) => void;
    setRightSidebarWidth: (width: number) => void;
    openRightSidebar: (content: 'bible' | 'search') => void;
    closeRightSidebar: () => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            theme: 'light',
            leftSidebarWidth: 280,
            rightSidebarWidth: 350,
            rightSidebarOpen: false,
            rightSidebarContent: null,
            isBibleModalOpen: false,
            isStrongsModalOpen: false,

            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light';
                    if (newTheme === 'dark') {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                    return { theme: newTheme };
                }),

            toggleBibleModal: () => set((state) => ({ isBibleModalOpen: !state.isBibleModalOpen })),
            toggleStrongsModal: () => set((state) => ({ isStrongsModalOpen: !state.isStrongsModalOpen })),

            setTheme: (theme) =>
                set(() => {
                    if (theme === 'dark') {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                    return { theme };
                }),

            setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),

            setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),

            openRightSidebar: (content) =>
                set({ rightSidebarOpen: true, rightSidebarContent: content }),

            closeRightSidebar: () =>
                set({ rightSidebarOpen: false, rightSidebarContent: null }),
        }),
        {
            name: 'parchments-ui',
            onRehydrateStorage: () => (state) => {
                if (state && state.theme === 'dark') {
                    document.body.classList.add('dark');
                }
            }
        }
    )
);
