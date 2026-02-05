import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';

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
    isSearchOpen: boolean;
    searchQuery: string;
    searchResults: any[];
    isSearching: boolean;

    // Actions
    setMainVersion: (version: string) => void;
    addParallelVersion: (version: string) => void;
    removeParallelVersion: (version: string) => void;
    setBibleFocus: (focus: BibleFocus | null) => void;
    toggleInterlinear: () => void;
    toggleVerseHoverPreviews: () => void;
    setSelectionRange: (range: { start: number, end: number } | null) => void;
    setSearchOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;
    executeSearch: () => Promise<void>;
}

export const useBibleStore = create<BibleStore>()(
    persist(
        (set, get) => ({
            mainVersion: 'kjv',
            parallelVersions: [],
            bibleFocus: { book: 'John', chapter: 1, verse: null },
            interlinearEnabled: false,
            verseHoverPreviews: true,
            selectionRange: null,
            isSearchOpen: false,
            searchQuery: '',
            searchResults: [],
            isSearching: false,

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

            setSearchOpen: (open) => set({ isSearchOpen: open, searchResults: open ? get().searchResults : [] }),
            setSearchQuery: (query) => set({ searchQuery: query }),

            executeSearch: async () => {
                const { searchQuery, mainVersion } = get();
                if (!searchQuery.trim()) return;

                set({ isSearching: true });

                try {
                    const query = searchQuery.toLowerCase().trim();
                    let results: any[] = [];

                    // 1. Strong's Search (e.g. "G26" or "#G26")
                    const strongsRegex = /^[gh]\d+$/i;
                    const cleanStrongs = query.startsWith('#') ? query.slice(1) : query;

                    if (strongsRegex.test(cleanStrongs)) {
                        const sId = cleanStrongs.toUpperCase();
                        const concordance = await db.strongsConcordance.where('strongsNumbers').equals(sId).toArray();
                        const verseIds = concordance.map(c => c.verseId);
                        const rawResults = await db.bibleVerses.bulkGet(verseIds);
                        results = rawResults.filter(v => v && v.versionId === mainVersion);
                    } else {
                        // 2. Lexical Keyword Search (e.g. "seed")
                        results = await db.bibleVerses
                            .where('versionId')
                            .equals(mainVersion)
                            .filter(v => v.text.toLowerCase().includes(query))
                            .toArray();
                    }

                    set({ searchResults: results, isSearching: false });
                } catch (error) {
                    console.error('Search failed:', error);
                    set({ isSearching: false });
                }
            }
        }),
        {
            name: 'parchments-bible-v2', // Increment version to clear KJV vs kjv confusion
        }
    )
);
