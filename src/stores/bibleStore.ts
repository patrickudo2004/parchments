import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BibleFocus {
    book: string;
    chapter: number;
    verse: number | null;
    verseEnd?: number | null;
}

interface BibleStore {
    // Versions
    mainVersion: string;
    parallelVersions: string[];

    // Navigation
    bibleFocus: BibleFocus | null;

    // View Settings
    interlinearEnabled: boolean;
    verseHoverPreviews: boolean;
    selectionRange: { start: number, end: number } | null;

    // Actions
    setMainVersion: (version: string) => void;
    addParallelVersion: (version: string) => void;
    removeParallelVersion: (version: string) => void;
    setBibleFocus: (focus: BibleFocus | null) => void;
    toggleInterlinear: () => void;
    toggleVerseHoverPreviews: () => void;
    setSelectionRange: (range: { start: number, end: number } | null) => void;
}

export const useBibleStore = create<BibleStore>()(
    persist(
        (set) => ({
            mainVersion: 'kjv',
            parallelVersions: [],
            bibleFocus: { book: 'John', chapter: 1, verse: null },
            interlinearEnabled: false,
            verseHoverPreviews: true,

            setMainVersion: (version) => set({ mainVersion: version.toLowerCase() }),

            addParallelVersion: (version) => set((state) => {
                const lower = version.toLowerCase();
                if (state.parallelVersions.includes(lower) || state.mainVersion === lower) return state;
                if (state.parallelVersions.length >= 3) return state; // Limit to 4 columns total
                return { parallelVersions: [...state.parallelVersions, lower] };
            }),

            removeParallelVersion: (version) => set((state) => ({
                parallelVersions: state.parallelVersions.filter(v => v !== version.toLowerCase())
            })),

            setBibleFocus: (focus) => set({ bibleFocus: focus }),

            toggleInterlinear: () => set((state) => ({ interlinearEnabled: !state.interlinearEnabled })),

            toggleVerseHoverPreviews: () => set((state) => ({ verseHoverPreviews: !state.verseHoverPreviews })),
            setSelectionRange: (range) => set({ selectionRange: range }),
        }),
        {
            name: 'parchments-bible-v2', // Increment version to clear KJV vs kjv confusion
        }
    )
);
