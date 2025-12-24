import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
    theme: 'light' | 'dark';
    leftSidebarWidth: number;
    rightSidebarWidth: number;
    rightSidebarOpen: boolean;
    rightSidebarContent: 'bible' | 'search' | null;

    // Actions
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setLeftSidebarWidth: (width: number) => void;
    setRightSidebarWidth: (width: number) => void;
    openRightSidebar: (content: 'bible' | 'search') => void;
    closeRightSidebar: () => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            theme: 'light',
            leftSidebarWidth: 250,
            rightSidebarWidth: 350,
            rightSidebarOpen: false,
            rightSidebarContent: null,

            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light';
                    // Update document class for Tailwind dark mode
                    if (newTheme === 'dark') {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                    return { theme: newTheme };
                }),

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
            name: 'parchments-ui-storage',
            partialize: (state) => ({
                theme: state.theme,
                leftSidebarWidth: state.leftSidebarWidth,
                rightSidebarWidth: state.rightSidebarWidth,
            }),
        }
    )
);

// Initialize theme on app load
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('parchments-ui-storage');
    if (stored) {
        const { state } = JSON.parse(stored);
        if (state.theme === 'dark') {
            document.body.classList.add('dark');
        }
    }
}
