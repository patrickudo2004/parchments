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

export interface SearchHistoryItem {
    id: string;
    query: string;
    timestamp: number;
    mode: 'text' | 'reference' | 'strongs';
    totalCount: number;
    versionId: string;
    wholeWord: boolean;
    testament: 'all' | 'ot' | 'nt';
    bookFilter: string | null;
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
    searchHistory: SearchHistoryItem[];

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
    addSearchHistory: (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => void;
    removeSearchHistoryItem: (id: string) => void;
    clearSearchHistory: () => void;
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
            searchHistory: [],
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

                    // Record completed search in search history (cap: 30)
                    const normalizedMode: 'text' | 'reference' | 'strongs' =
                        response.mode === 'keyword' || response.mode === 'phrase'
                            ? 'text'
                            : response.mode === 'reference'
                              ? 'reference'
                              : response.mode === 'strongs'
                                ? 'strongs'
                                : 'text';

                    if (response.mode !== 'empty' && activeQuery.trim().length >= 2) {
                        get().addSearchHistory({
                            query: activeQuery.trim(),
                            mode: normalizedMode,
                            totalCount: response.totalCount,
                            versionId: mainVersion,
                            wholeWord: searchWholeWord,
                            testament: searchTestamentFilter,
                            bookFilter: searchBookFilter
                        });
                    }
                } catch (error) {
                    console.error('Search failed:', error);
                    if (searchId === lastEffectSearchId) {
                        set({ isSearching: false });
                    }
                }
            },

            addSearchHistory: (item) => {
                const query = item.query.trim();
                if (!query || query.length < 2) return;
                set((state) => {
                    const filtered = state.searchHistory.filter((h) => {
                        const sameFilters =
                            h.wholeWord === item.wholeWord &&
                            h.testament === item.testament &&
                            h.bookFilter === item.bookFilter &&
                            h.versionId === item.versionId;
                        if (!sameFilters) return true;
                        if (h.query.toLowerCase() === query.toLowerCase()) return false;
                        // Replace prefix if user was typing this query within 5 seconds
                        const isTypingContinuation =
                            query.toLowerCase().startsWith(h.query.toLowerCase()) &&
                            Date.now() - h.timestamp < 5000;
                        return !isTypingContinuation;
                    });

                    const newItem: SearchHistoryItem = {
                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        timestamp: Date.now(),
                        ...item,
                        query
                    };

                    // Cap history at exactly 30 entries
                    return {
                        searchHistory: [newItem, ...filtered].slice(0, 30)
                    };
                });
            },

            removeSearchHistoryItem: (id) =>
                set((state) => ({
                    searchHistory: state.searchHistory.filter((h) => h.id !== id)
                })),

            clearSearchHistory: () => set({ searchHistory: [] })
        }),
        {
            name: 'parchments-bible-v2',
            partialize: (state) => ({
                mainVersion: state.mainVersion,
                parallelVersions: state.parallelVersions,
                bibleFocus: state.bibleFocus,
                interlinearEnabled: state.interlinearEnabled,
                verseHoverPreviews: state.verseHoverPreviews,
                searchViewMode: state.searchViewMode,
                searchHistory: state.searchHistory
            })
        }
    )
);
