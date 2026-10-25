import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VerseSegment, BibleReference } from '@/lib/scriptureParser';
import type { BibleVerse, StrongsEntry } from '@/types/database';
import {
    searchBibleVerses,
    type BookMatchCount,
    type BibleSearchResponse
} from '@/lib/search/bibleSearchEngine';

interface BibleFocus {
    book: string;
    chapter: number;
    verse: number | null;
    verseEnd?: number | null;
    segments?: VerseSegment[];
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
    selectionRange: { start: number; end: number } | null;
    isSearchOpen: boolean;
    searchQuery: string;
    searchResults: BibleVerse[];
    isSearching: boolean;
    searchTotalCount: number;
    searchOtCount: number;
    searchNtCount: number;
    searchBookCounts: BookMatchCount[];
    searchTestamentFilter: 'all' | 'ot' | 'nt';
    searchBookFilter: string | null;
    searchWholeWord: boolean;
    searchViewMode: 'list' | 'books';
    searchMode: BibleSearchResponse['mode'];
    searchParsedRef: BibleReference | null;
    searchStrongsEntry: StrongsEntry | null;
    searchHighlightTerms: string[];

    // Actions
    setMainVersion: (version: string) => void;
    addParallelVersion: (version: string) => void;
    removeParallelVersion: (version: string) => void;
    setBibleFocus: (focus: BibleFocus | null) => void;
    toggleInterlinear: () => void;
    toggleVerseHoverPreviews: () => void;
    setSelectionRange: (range: { start: number; end: number } | null) => void;
    setSearchOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;
    setSearchTestamentFilter: (testament: 'all' | 'ot' | 'nt') => void;
    setSearchBookFilter: (book: string | null) => void;
    setSearchWholeWord: (wholeWord: boolean) => void;
    setSearchViewMode: (mode: 'list' | 'books') => void;
    executeSearch: (overrideQuery?: string) => Promise<void>;
}

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
            searchTotalCount: 0,
            searchOtCount: 0,
            searchNtCount: 0,
            searchBookCounts: [],
            searchTestamentFilter: 'all',
            searchBookFilter: null,
            searchWholeWord: false,
            searchViewMode: 'list',
            searchMode: 'empty',
            searchParsedRef: null,
            searchStrongsEntry: null,
            searchHighlightTerms: [],
            verseHoverPreviews: true,

            setMainVersion: (version) => {
                set({ mainVersion: version.toLowerCase() });
                if (get().isSearchOpen && get().searchQuery.trim()) {
                    get().executeSearch();
                }
            },

            addParallelVersion: (version) => set((state) => {
                const lower = version.toLowerCase();
                if (state.parallelVersions.includes(lower) || state.mainVersion === lower) return state;
                if (state.parallelVersions.length >= 3) return state; // Limit to 4 columns total
                return { parallelVersions: [...state.parallelVersions, lower] };
            }),

            removeParallelVersion: (version) => set((state) => ({
                parallelVersions: state.parallelVersions.filter((v) => v !== version.toLowerCase())
            })),

            setBibleFocus: (focus) => set({ bibleFocus: focus }),

            toggleInterlinear: () => set((state) => ({ interlinearEnabled: !state.interlinearEnabled })),

            toggleVerseHoverPreviews: () => set((state) => ({ verseHoverPreviews: !state.verseHoverPreviews })),
            setSelectionRange: (range) => set({ selectionRange: range }),

            setSearchOpen: (open) => set({
                isSearchOpen: open,
                ...(open
                    ? {}
                    : {
                          searchQuery: '',
                          searchResults: [],
                          isSearching: false,
                          searchTotalCount: 0,
                          searchOtCount: 0,
                          searchNtCount: 0,
                          searchBookCounts: [],
                          searchTestamentFilter: 'all',
                          searchBookFilter: null,
                          searchWholeWord: false,
                          searchMode: 'empty',
                          searchParsedRef: null,
                          searchStrongsEntry: null,
                          searchHighlightTerms: []
                      })
            }),

            setSearchQuery: (query) => set({
                searchQuery: query,
                // Reset book filter if user enters a completely new query
                searchBookFilter: null
            }),

            setSearchTestamentFilter: (testament) => {
                set({ searchTestamentFilter: testament, searchBookFilter: null });
                if (get().searchQuery.trim()) {
                    get().executeSearch();
                }
            },

            setSearchBookFilter: (book) => {
                set({ searchBookFilter: book });
                if (get().searchQuery.trim()) {
                    get().executeSearch();
                }
            },

            setSearchWholeWord: (wholeWord) => {
                set({ searchWholeWord: wholeWord });
                if (get().searchQuery.trim()) {
                    get().executeSearch();
                }
            },

            setSearchViewMode: (mode) => set({ searchViewMode: mode }),

            executeSearch: async (overrideQuery?: string) => {
                const state = get();
                const activeQuery = overrideQuery !== undefined ? overrideQuery : state.searchQuery;
                if (overrideQuery !== undefined && overrideQuery !== state.searchQuery) {
                    set({ searchQuery: overrideQuery, searchBookFilter: null });
                }

                if (!activeQuery.trim()) {
                    set({
                        searchResults: [],
                        isSearching: false,
                        searchTotalCount: 0,
                        searchOtCount: 0,
                        searchNtCount: 0,
                        searchBookCounts: [],
                        searchMode: 'empty',
                        searchParsedRef: null,
                        searchStrongsEntry: null,
                        searchHighlightTerms: []
                    });
                    return;
                }

                const searchId = ++lastEffectSearchId;
                set({ isSearching: true });

                try {
                    const { mainVersion, searchWholeWord, searchTestamentFilter, searchBookFilter } = get();
                    const response = await searchBibleVerses({
                        query: activeQuery,
                        versionId: mainVersion,
                        wholeWord: searchWholeWord,
                        testament: searchTestamentFilter,
                        bookFilter: searchBookFilter
                    });

                    // Abort if a newer search has started
                    if (searchId !== lastEffectSearchId) return;

                    set({
                        searchResults: response.results,
                        searchTotalCount: response.totalCount,
                        searchOtCount: response.otCount,
                        searchNtCount: response.ntCount,
                        searchBookCounts: response.bookCounts,
                        searchMode: response.mode,
                        searchParsedRef: response.parsedReference,
                        searchStrongsEntry: response.strongsEntry,
                        searchHighlightTerms: response.highlightTerms,
                        isSearching: false
                    });
                } catch (error) {
                    console.error('Search failed:', error);
                    if (searchId === lastEffectSearchId) {
                        set({ isSearching: false });
                    }
                }
            }
        }),
        {
            name: 'parchments-bible-v2',
            partialize: (state) => ({
                mainVersion: state.mainVersion,
                parallelVersions: state.parallelVersions,
                bibleFocus: state.bibleFocus,
                interlinearEnabled: state.interlinearEnabled,
                verseHoverPreviews: state.verseHoverPreviews,
                searchViewMode: state.searchViewMode
            })
        }
    )
);
