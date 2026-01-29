import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Editor } from '@tiptap/react';

interface UIStore {
    theme: 'light' | 'dark' | 'system';
    density: 'comfortable' | 'compact';

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
    leftSidebarContent: 'files' | 'outline' | 'voice' | null;
    rightSidebarWidth: number;
    rightSidebarOpen: boolean;
    rightSidebarContent: 'bible' | 'search' | 'lexicon' | 'crossrefs' | 'pins' | 'connections' | 'assistant' | null;
    isBibleModalOpen: boolean;
    isStrongsModalOpen: boolean;
    selectedStrongsId: string | null;
    selectedVerseId: string | null;
    isSettingsModalOpen: boolean;
    isTemplateModalOpen: boolean;
    isSearchModalOpen: boolean;
    searchQuery: string;
    isShortcutModalOpen: boolean;
    isFocusMode: boolean;
    focusedHeadingPos: number | null;
    activeEditor: Editor | null;
    toast: { message: string, type: 'success' | 'error' | 'info' } | null;
    isExportModalOpen: boolean;
    exportFormat: 'pdf' | 'docx' | 'md' | 'html' | 'txt' | null;

    // Editor stats
    wordCount: number;
    characterCount: number;
    isMobile: boolean;

    // Actions
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    updateSettings: (settings: Partial<UIStore>) => void;
    toggleBibleModal: () => void;
    toggleStrongsModal: (id?: string | null) => void;
    toggleSettingsModal: () => void;
    toggleTemplateModal: () => void;
    toggleSearchModal: (query?: string) => void;
    toggleShortcutModal: () => void;
    toggleFocusMode: () => void;
    setFocusedHeadingPos: (pos: number | null) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    setEditor: (editor: Editor | null) => void;
    openExportModal: (format: 'pdf' | 'docx' | 'md' | 'html' | 'txt') => void;
    closeExportModal: () => void;
    toggleLeftSidebar: (content?: 'files' | 'outline' | 'voice') => void;
    toggleRightSidebar: (content?: 'bible' | 'search' | 'lexicon' | 'crossrefs' | 'pins' | 'connections' | 'assistant') => void;
    setLeftSidebarWidth: (width: number) => void;
    setRightSidebarWidth: (width: number) => void;
    openRightSidebar: (content: 'bible' | 'search' | 'lexicon' | 'crossrefs' | 'pins' | 'connections' | 'assistant') => void;
    closeRightSidebar: () => void;
    openLexicon: (id?: string) => void;
    openCrossRefs: (verseId?: string) => void;
    setEditorStats: (words: number, characters: number) => void;
    setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            theme: 'light',
            density: 'comfortable',

            editorFontFamily: 'serif',
            editorFontSize: 16,
            editorLineSpacing: 1.5,
            writingLayout: 'centered',
            autoSaveFrequency: 5000,
            markdownSupport: true,
            highAccuracyTranscription: false,

            leftSidebarWidth: 280,
            isLeftSidebarOpen: true,
            leftSidebarContent: 'files',
            rightSidebarWidth: 350,
            rightSidebarOpen: false,
            rightSidebarContent: null,
            isBibleModalOpen: false,
            isStrongsModalOpen: false,
            selectedStrongsId: null,
            selectedVerseId: null,
            isSettingsModalOpen: false,
            isTemplateModalOpen: false,
            isSearchModalOpen: false,
            searchQuery: '',
            isShortcutModalOpen: false,
            isFocusMode: false,
            focusedHeadingPos: null,
            activeEditor: null,
            toast: null,
            isExportModalOpen: false,
            exportFormat: null,

            wordCount: 0,
            characterCount: 0,
            isMobile: false,

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
                if (id === null) return { isStrongsModalOpen: false, selectedStrongsId: null };
                if (typeof id === 'string') return { isStrongsModalOpen: true, selectedStrongsId: id };

                return {
                    isStrongsModalOpen: !state.isStrongsModalOpen,
                    selectedStrongsId: state.selectedStrongsId
                };
            }),
            toggleSettingsModal: () => set((state) => ({ isSettingsModalOpen: !state.isSettingsModalOpen })),
            toggleTemplateModal: () => set((state) => ({ isTemplateModalOpen: !state.isTemplateModalOpen })),
            toggleSearchModal: (query) => set((state) => ({
                isSearchModalOpen: !state.isSearchModalOpen,
                searchQuery: query || ''
            })),
            toggleShortcutModal: () => set((state) => ({ isShortcutModalOpen: !state.isShortcutModalOpen })),
            toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
            setFocusedHeadingPos: (pos) => set({ focusedHeadingPos: pos }),
            showToast: (message, type = 'success') => {
                set({ toast: { message, type } });
                setTimeout(() => set({ toast: null }), 3000);
            },
            setEditor: (editor) => set({ activeEditor: editor }),
            openExportModal: (format) => set({ isExportModalOpen: true, exportFormat: format }),
            closeExportModal: () => set({ isExportModalOpen: false, exportFormat: null }),

            toggleLeftSidebar: (content) => set((state) => {
                if (!state.isLeftSidebarOpen) {
                    return {
                        isLeftSidebarOpen: true,
                        leftSidebarContent: content || state.leftSidebarContent || 'files'
                    };
                }

                if (!content || state.leftSidebarContent === content) {
                    return {
                        isLeftSidebarOpen: false,
                        leftSidebarContent: null
                    };
                }

                return {
                    leftSidebarContent: content
                };
            }),

            toggleRightSidebar: (content) => set((state) => {
                if (!state.rightSidebarOpen) {
                    return {
                        rightSidebarOpen: true,
                        rightSidebarContent: content || state.rightSidebarContent || 'bible'
                    };
                }

                if (!content || state.rightSidebarContent === content) {
                    return {
                        rightSidebarOpen: false,
                        rightSidebarContent: null
                    };
                }

                return {
                    rightSidebarContent: content
                };
            }),

            openLexicon: (id) => set((state) => ({
                rightSidebarOpen: true,
                rightSidebarContent: 'lexicon',
                selectedStrongsId: id || state.selectedStrongsId
            })),

            openCrossRefs: (verseId) => set((state) => ({
                rightSidebarOpen: true,
                rightSidebarContent: 'crossrefs',
                selectedVerseId: verseId || state.selectedVerseId
            })),

            setTheme: (theme) =>
                set((state) => {
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
            openRightSidebar: (content) => set({ rightSidebarOpen: true, rightSidebarContent: content }),
            closeRightSidebar: () => set({ rightSidebarOpen: false, rightSidebarContent: null }),
            setEditorStats: (words, characters) => set({ wordCount: words, characterCount: characters }),
            setIsMobile: (isMobile) => set({ isMobile }),
        }),
        {
            name: 'parchments-ui',
            partialize: (state) => ({
                theme: state.theme,
                density: state.density,
                editorFontFamily: state.editorFontFamily,
                editorFontSize: state.editorFontSize,
                editorLineSpacing: state.editorLineSpacing,
                writingLayout: state.writingLayout,
                autoSaveFrequency: state.autoSaveFrequency,
                markdownSupport: state.markdownSupport,
                highAccuracyTranscription: state.highAccuracyTranscription,
                leftSidebarWidth: state.leftSidebarWidth,
                isLeftSidebarOpen: state.isLeftSidebarOpen,
                leftSidebarContent: state.leftSidebarContent,
                rightSidebarWidth: state.rightSidebarWidth,
                rightSidebarOpen: state.rightSidebarOpen,
                rightSidebarContent: state.rightSidebarContent,
                focusedHeadingPos: null,
            }),
            onRehydrateStorage: () => (state) => {
                if (state && state.theme === 'dark') {
                    document.body.classList.add('dark');
                }
            }
        }
    )
);
