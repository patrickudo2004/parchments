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

// Biblical Book Order for sorting
const BOOK_ORDER: Record<string, number> = {
    "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5, "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10, "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14, "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Proverbs": 20, "Ecclesiastes": 21, "Song of Solomon": 22, "Isaiah": 23, "Jeremiah": 24, "Lamentations": 25, "Ezekiel": 26, "Daniel": 27, "Hosea": 28, "Joel": 29, "Amos": 30, "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34, "Habakkuk": 35, "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39, "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44, "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49, "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53, "1 Timothy": 54, "2 Timothy": 55, "Titus": 56, "Philemon": 57, "Hebrews": 58, "James": 59, "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63, "3 John": 64, "Jude": 65, "Revelation": 66
};

const versionVersesCache: Record<string, any[]> = {};
let lastEffectSearchId = 0;

export const useBibleStore = create<BibleStore>()(
    persist(
        (set, get) => ({
            mainVersion: 'kjv',
            parallelVersions: [],
            bibleFocus: { book: 'John', chapter: 1, verse: null },
            interlinearEnabled: false,
            selectionRange: null,
            isSearchOpen: false,
            searchQuery: '',
            searchResults: [],
            isSearching: false,
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

            setSearchOpen: (open) => set({
                isSearchOpen: open,
                // Clear search state when closing
                ...(open ? {} : { searchQuery: '', searchResults: [], isSearching: false })
            }),

            setSearchQuery: (query) => set({ searchQuery: query }),

            executeSearch: async () => {
                const { searchQuery, mainVersion } = get();
                if (!searchQuery.trim()) return;

                const searchId = ++lastEffectSearchId;
                set({ isSearching: true, searchResults: [] });

                try {
                    const querySnippet = searchQuery.toLowerCase().trim();
                    let results: any[] = [];

                    // 1. Strong's Search (e.g. "G26" or "#G26")
                    const strongsRegex = /^[gh]\d+$/i;
                    const cleanStrongs = querySnippet.startsWith('#') ? querySnippet.slice(1) : querySnippet;

                    if (strongsRegex.test(cleanStrongs)) {
                        const sId = cleanStrongs.toUpperCase();
                        const concordance = await db.strongsConcordance.where('strongsNumbers').equals(sId).toArray();
                        const verseIds = concordance.map(c => c.verseId);
                        const rawResults = await db.bibleVerses.bulkGet(verseIds);
                        const validRaw = (rawResults.filter(Boolean) as any[]).filter(v => v.versionId === mainVersion);
                        const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
                        results = await decryptVerses(validRaw);
                    } else {
                        // 2. Lexical Keyword Search - Direct In-Memory Filter Cache
                        let versionVerses = versionVersesCache[mainVersion];
                        if (!versionVerses) {
                            console.log(`[bibleStore] ⚡ Loading version ${mainVersion} into memory cache for instant searching...`);
                            const rawVerses = await db.bibleVerses
                                .where('versionId')
                                .equals(mainVersion)
                                .toArray();
                            const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
                            versionVerses = await decryptVerses(rawVerses);
                            versionVersesCache[mainVersion] = versionVerses;
                        }

                        results = versionVerses
                            .filter(v => v.text.toLowerCase().includes(querySnippet))
                            .slice(0, 100);
                    }

                    // Abort if a newer search has started
                    if (searchId !== lastEffectSearchId) return;

                    // Sort results in biblical order
                    const sortedResults = results.sort((a, b) => {
                        const orderA = BOOK_ORDER[a.book] || 999;
                        const orderB = BOOK_ORDER[b.book] || 999;
                        if (orderA !== orderB) return orderA - orderB;
                        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                        return a.verse - b.verse;
                    });

                    set({ searchResults: sortedResults, isSearching: false });
                } catch (error) {
                    console.error('Search failed:', error);
                    if (searchId === lastEffectSearchId) {
                        set({ isSearching: false });
                    }
                }
            }
        }),
        {
            name: 'parchments-bible-v2', // Increment version to clear KJV vs kjv confusion
        }
    )
);
