import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Editor } from '@tiptap/react';

interface UIStore {
    theme: 'light' | 'dark' | 'system';
    density: 'comfortable' | 'compact';

    // Bible & Study
    preferredBibleVersion: string;
    verseHoverPreviews: boolean;
    interlinearEnabled: boolean;

    // Editor
    editorFontFamily: 'sans' | 'serif';
    editorFontSize: number;
    editorLineSpacing: number;
    writingLayout: 'centered' | 'full';
    autoSaveFrequency: number;
    markdownSupport: boolean;
    highAccuracyTranscription: boolean;

    leftSidebarWidth: number;
    isLeftSidebarOpen: boolean;
    rightSidebarWidth: number;
    rightSidebarOpen: boolean;
    rightSidebarContent: 'bible' | 'search' | null;
    isBibleModalOpen: boolean;
    isStrongsModalOpen: boolean;
    selectedStrongsId: string | null;
    isSettingsModalOpen: boolean;
    isSearchModalOpen: boolean;
    searchQuery: string;
    isShortcutModalOpen: boolean;
    isFocusMode: boolean;
    activeEditor: Editor | null;
    toast: { message: string, type: 'success' | 'error' | 'info' } | null;
    isExportModalOpen: boolean;
    exportFormat: 'pdf' | 'docx' | 'md' | 'html' | 'txt' | null;

    // Bible Navigation
    bibleFocus: { book: string; chapter: number; verse: number | null; verseEnd?: number | null } | null;

    // Editor stats
    wordCount: number;
    characterCount: number;

    // Actions
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    updateSettings: (settings: Partial<UIStore>) => void;
    toggleBibleModal: () => void;
    toggleStrongsModal: (id?: string | null) => void;
    toggleSettingsModal: () => void;
    toggleSearchModal: (query?: string) => void;
    toggleShortcutModal: () => void;
    toggleFocusMode: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setEditor: (editor: Editor | null) => void;
    openExportModal: (format: 'pdf' | 'docx' | 'md' | 'html' | 'txt') => void;
    closeExportModal: () => void;
    toggleInterlinear: () => void;
    toggleLeftSidebar: () => void;
    toggleRightSidebar: (content?: 'bible' | 'search') => void;
    setLeftSidebarWidth: (width: number) => void;
    setRightSidebarWidth: (width: number) => void;
    openRightSidebar: (content: 'bible' | 'search') => void;
    closeRightSidebar: () => void;
    setEditorStats: (words: number, characters: number) => void;
    setBibleFocus: (focus: { book: string; chapter: number; verse: number | null; verseEnd?: number | null } | null) => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            theme: 'light',
            density: 'comfortable',

            preferredBibleVersion: 'KJV',
            verseHoverPreviews: true,
            interlinearEnabled: false,

            editorFontFamily: 'serif',
            editorFontSize: 16,
            editorLineSpacing: 1.5,
            writingLayout: 'centered',
            autoSaveFrequency: 5000,
            markdownSupport: true,
            highAccuracyTranscription: false,

            leftSidebarWidth: 280,
            isLeftSidebarOpen: true,
            rightSidebarWidth: 350,
            rightSidebarOpen: false,
            rightSidebarContent: null,
            isBibleModalOpen: false,
            isStrongsModalOpen: false,
            selectedStrongsId: null,
            isSettingsModalOpen: false,
            isSearchModalOpen: false,
            searchQuery: '',
            isShortcutModalOpen: false,
            isFocusMode: false,
            activeEditor: null,
            toast: null,
            isExportModalOpen: false,
            exportFormat: null,

            bibleFocus: null,

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
            toggleStrongsModal: (id) => set((state) => {
                // If id is explicitly null, we close.
                // If it's a string, we open with that ID.
                // If it's undefined (no args), we toggle.
                if (id === null) return { isStrongsModalOpen: false, selectedStrongsId: null };
                if (typeof id === 'string') return { isStrongsModalOpen: true, selectedStrongsId: id };

                return {
                    isStrongsModalOpen: !state.isStrongsModalOpen,
                    selectedStrongsId: state.selectedStrongsId
                };
            }),
            toggleSettingsModal: () => set((state) => ({ isSettingsModalOpen: !state.isSettingsModalOpen })),
            toggleSearchModal: (query) => set((state) => ({
                isSearchModalOpen: !state.isSearchModalOpen,
                searchQuery: query || ''
            })),
            toggleShortcutModal: () => set((state) => ({ isShortcutModalOpen: !state.isShortcutModalOpen })),
            toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
            showToast: (message, type = 'success') => {
                set({ toast: { message, type } });
                setTimeout(() => set({ toast: null }), 3000);
            },
            setEditor: (editor) => set({ activeEditor: editor }),
            openExportModal: (format) => set({ isExportModalOpen: true, exportFormat: format }),
            closeExportModal: () => set({ isExportModalOpen: false, exportFormat: null }),
            toggleInterlinear: () => set((state) => ({ interlinearEnabled: !state.interlinearEnabled })),

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

            setBibleFocus: (focus) => set({ bibleFocus: focus }),
        }),
        {
            name: 'parchments-ui',
            partialize: (state) => ({
                theme: state.theme,
                density: state.density,
                preferredBibleVersion: state.preferredBibleVersion,
                verseHoverPreviews: state.verseHoverPreviews,
                interlinearEnabled: state.interlinearEnabled,
                editorFontFamily: state.editorFontFamily,
                editorFontSize: state.editorFontSize,
                editorLineSpacing: state.editorLineSpacing,
                writingLayout: state.writingLayout,
                autoSaveFrequency: state.autoSaveFrequency,
                markdownSupport: state.markdownSupport,
                highAccuracyTranscription: state.highAccuracyTranscription,
                leftSidebarWidth: state.leftSidebarWidth,
                isLeftSidebarOpen: state.isLeftSidebarOpen,
                rightSidebarWidth: state.rightSidebarWidth,
                rightSidebarOpen: state.rightSidebarOpen,
                rightSidebarContent: state.rightSidebarContent,
                bibleFocus: state.bibleFocus,
            }),
            onRehydrateStorage: () => (state) => {
                if (state && state.theme === 'dark') {
                    document.body.classList.add('dark');
                }
            }
        }
    )
);
