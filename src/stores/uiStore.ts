import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    density: 'comfortable' | 'compact';
    sidebarDefaultState: 'expanded' | 'collapsed';

    // Bible & Study
    preferredBibleVersion: string;
    verseHoverPreviews: boolean;

    // Editor
    editorFontFamily: 'sans' | 'serif';
    editorFontSize: number;
    editorLineSpacing: number;
    writingLayout: 'centered' | 'full';
    autoSaveFrequency: number;
    markdownSupport: boolean;

    leftSidebarWidth: number;
    isLeftSidebarOpen: boolean;
    rightSidebarWidth: number;
    rightSidebarOpen: boolean;
    rightSidebarContent: 'bible' | 'search' | null;
    isBibleModalOpen: boolean;
    isStrongsModalOpen: boolean;
    isSettingsModalOpen: boolean;

    // Editor stats
    wordCount: number;
    characterCount: number;

    // Actions
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    updateSettings: (settings: Partial<UIStore>) => void;
    toggleBibleModal: () => void;
    toggleStrongsModal: () => void;
    toggleSettingsModal: () => void;
    toggleLeftSidebar: () => void;
    toggleRightSidebar: (content?: 'bible' | 'search') => void;
    setLeftSidebarWidth: (width: number) => void;
    setRightSidebarWidth: (width: number) => void;
    openRightSidebar: (content: 'bible' | 'search') => void;
    closeRightSidebar: () => void;
    setEditorStats: (words: number, characters: number) => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            theme: 'light',
            accentColor: '#1a73e8', // Default blue
            density: 'comfortable',
            sidebarDefaultState: 'expanded',

            preferredBibleVersion: 'KJV',
            verseHoverPreviews: true,

            editorFontFamily: 'serif',
            editorFontSize: 16,
            editorLineSpacing: 1.5,
            writingLayout: 'centered',
            autoSaveFrequency: 5000,
            markdownSupport: true,

            leftSidebarWidth: 280,
            isLeftSidebarOpen: true,
            rightSidebarWidth: 350,
            rightSidebarOpen: false,
            rightSidebarContent: null,
            isBibleModalOpen: false,
            isStrongsModalOpen: false,
            isSettingsModalOpen: false,

            wordCount: 0,
            characterCount: 0,

            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light';
                    const isDark = newTheme === 'dark';
                    if (isDark) {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                    return { theme: newTheme };
                }),

            toggleBibleModal: () => set((state) => ({ isBibleModalOpen: !state.isBibleModalOpen })),
            toggleStrongsModal: () => set((state) => ({ isStrongsModalOpen: !state.isStrongsModalOpen })),
            toggleSettingsModal: () => set((state) => ({ isSettingsModalOpen: !state.isSettingsModalOpen })),

            toggleLeftSidebar: () => set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),

            toggleRightSidebar: (content) => set((state) => {
                const isOpen = !state.rightSidebarOpen;
                return {
                    rightSidebarOpen: isOpen,
                    rightSidebarContent: isOpen ? (content || state.rightSidebarContent || 'bible') : null
                };
            }),

            setTheme: (theme) =>
                set(() => {
                    let isDark = theme === 'dark';
                    if (theme === 'system') {
                        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    }
                    if (isDark) {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                    return { theme };
                }),

            updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),

            setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),

            setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),

            openRightSidebar: (content) =>
                set({ rightSidebarOpen: true, rightSidebarContent: content }),

            closeRightSidebar: () =>
                set({ rightSidebarOpen: false, rightSidebarContent: null }),

            setEditorStats: (words, characters) =>
                set({ wordCount: words, characterCount: characters }),
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
