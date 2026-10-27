import React, { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import { useBibleStore, type SearchHistoryItem } from '@/stores/bibleStore';
import type { BibleVerse } from '@/types/database';
import {
    Search,
    X,
    Loader2,
    Book,
    Hash,
    Copy,
    Check,
    ArrowRight,
    ChevronDown,
    ChevronRight,
    List,
    Layers,
    ChevronsUpDown,
    ChevronsDownUp,
    Trash2,
    History
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import {
    buildHighlightSegments,
    isOldTestamentBook,
    isNewTestamentBook
} from '@/lib/search/bibleSearchEngine';

interface BibleSearchOverlayProps {
    onSelectVerse?: (focus: { book: string; chapter: number; verse: number }) => void;
}

interface CanonicalBookGroup {
    book: string;
    testament: 'ot' | 'nt';
    verses: BibleVerse[];
    minChapter: number;
    maxChapter: number;
}

const PAGE_SIZE = 100;
const SAFE_LIST_EXPAND_STEP = 2000;

export const BibleSearchOverlay: React.FC<BibleSearchOverlayProps> = ({ onSelectVerse }) => {
    const {
        mainVersion,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchTotalCount,
        searchOtCount,
        searchNtCount,
        searchBookCounts,
        searchTestamentFilter,
        searchBookFilter,
        searchWholeWord,
        searchViewMode,
        searchMode,
        searchParsedRef,
        searchStrongsEntry,
        searchHighlightTerms,
        setSearchTestamentFilter,
        setSearchBookFilter,
        setSearchWholeWord,
        setSearchViewMode,
        executeSearch,
        setBibleFocus,
        searchHistory,
        removeSearchHistoryItem,
        clearSearchHistory
    } = useBibleStore();
    const { showToast } = useUIStore();

    const [localQuery, setLocalQuery] = useState(searchQuery);
    const [copiedStrongs, setCopiedStrongs] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
    const [fullyExpandedBooks, setFullyExpandedBooks] = useState<Set<string>>(new Set());
    const [isPendingExpand, startExpandTransition] = useTransition();

    const handleApplyHistory = (item: SearchHistoryItem) => {
        setLocalQuery(item.query);
        setSearchQuery(item.query);
        setSearchWholeWord(item.wholeWord);
        setSearchTestamentFilter(item.testament);
        setSearchBookFilter(item.bookFilter);
        executeSearch(item.query);
    };

    const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        removeSearchHistoryItem(id);
        showToast('Removed search from history', 'info');
    };

    const handleClearAllHistory = () => {
        clearSearchHistory();
        showToast('Search history cleared', 'success');
    };

    const formatHistoryTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Group canonically-sorted searchResults by Book in O(N) while preserving exact canonical order
    const { groupedBooks, otGroups, ntGroups, maxBookCount } = useMemo(() => {
        const groups: CanonicalBookGroup[] = [];
        const byBook = new Map<string, CanonicalBookGroup>();
        let maxCount = 1;

        for (const v of searchResults) {
            let group = byBook.get(v.book);
            if (!group) {
                group = {
                    book: v.book,
                    testament: isOldTestamentBook(v.book) ? 'ot' : 'nt',
                    verses: [],
                    minChapter: v.chapter,
                    maxChapter: v.chapter
                };
                byBook.set(v.book, group);
                groups.push(group);
            }
            group.verses.push(v);
            if (v.chapter < group.minChapter) group.minChapter = v.chapter;
            if (v.chapter > group.maxChapter) group.maxChapter = v.chapter;
            if (group.verses.length > maxCount) maxCount = group.verses.length;
        }

        return {
            groupedBooks: groups,
            otGroups: groups.filter((g) => g.testament === 'ot'),
            ntGroups: groups.filter((g) => g.testament === 'nt'),
            maxBookCount: maxCount
        };
    }, [searchResults]);

    // Sync local state if store changes externally (e.g. from CommandPalette or Lexicon search)
    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    // Reset progressive pagination, book accordion state, and scroll position when result set or filters change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
        setFullyExpandedBooks(new Set());
        // Auto-expand when <= 2 books match (e.g. single-book filter or focused query like 'melchizedek priest')
        if (groupedBooks.length > 0 && groupedBooks.length <= 2) {
            setExpandedBooks(new Set(groupedBooks.map((g) => g.book)));
        } else {
            setExpandedBooks(new Set());
        }
        resultsContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [searchQuery, searchTestamentFilter, searchBookFilter, searchWholeWord, mainVersion, groupedBooks]);

    // Debounce input changes (250ms) and execute canonical search
    useEffect(() => {
        const trimmed = localQuery.trim();
        if (!trimmed) {
            if (searchQuery) {
                setSearchQuery('');
                executeSearch('');
            }
            return;
        }

        const timer = setTimeout(() => {
            if (localQuery !== searchQuery) {
                setSearchQuery(localQuery);
                executeSearch(localQuery);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [localQuery, searchQuery, setSearchQuery, executeSearch]);

    const handleResultClick = (book: string, chapter: number, verse: number) => {
        const target = { book, chapter, verse };
        setBibleFocus(target);
        onSelectVerse?.(target);
        setSearchOpen(false);
    };

    const handleCopyStrongs = () => {
        if (!searchStrongsEntry) return;
        const text = `[Strong's ${searchStrongsEntry.id}] ${searchStrongsEntry.lemma} (${searchStrongsEntry.xlit})\nPronunciation: ${searchStrongsEntry.pron || 'N/A'}\nDefinition: ${searchStrongsEntry.strongs_def}\nKJV Usage: ${searchStrongsEntry.kjv_def || 'N/A'}`;
        navigator.clipboard.writeText(text);
        setCopiedStrongs(true);
        showToast(`Copied Strong's ${searchStrongsEntry.id} to clipboard`, 'success');
        setTimeout(() => setCopiedStrongs(false), 2000);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (searchViewMode !== 'list' || visibleCount >= searchResults.length) return;
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 280) {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, searchResults.length));
        }
    };

    const handleExpandAllList = () => {
        startExpandTransition(() => {
            setVisibleCount((prev) => Math.min(prev + SAFE_LIST_EXPAND_STEP, searchResults.length));
        });
    };

    const handleCollapseList = () => {
        setVisibleCount(PAGE_SIZE);
        resultsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleBookExpanded = (bookName: string) => {
        setExpandedBooks((prev) => {
            const next = new Set(prev);
            if (next.has(bookName)) {
                next.delete(bookName);
            } else {
                next.add(bookName);
            }
            return next;
        });
    };

    const areAllBooksExpanded =
        groupedBooks.length > 0 && groupedBooks.every((g) => expandedBooks.has(g.book));

    const handleToggleAllBooks = () => {
        if (areAllBooksExpanded) {
            setExpandedBooks(new Set());
            resultsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            startExpandTransition(() => {
                setExpandedBooks(new Set(groupedBooks.map((g) => g.book)));
            });
        }
    };

    const runQuickQuery = (q: string) => {
        setLocalQuery(q);
        setSearchQuery(q);
        executeSearch(q);
    };

    const filteredBookOptions = searchBookCounts.filter((b) => {
        if (searchTestamentFilter === 'ot') return isOldTestamentBook(b.book);
        if (searchTestamentFilter === 'nt') return isNewTestamentBook(b.book);
        return true;
    });

    const visibleResults = searchResults.slice(0, visibleCount);
    const hasActiveQuery = (localQuery || searchQuery).trim().length > 0;
    const hasActiveFilters = searchWholeWord || searchTestamentFilter !== 'all' || !!searchBookFilter;
    const canExpandAllInOneStep = searchResults.length - visibleCount <= SAFE_LIST_EXPAND_STEP;

    // Per-book render cap guards ultra-broad queries (>1,000 total matches like 'the'/'lord') while rendering 100% of normal word studies (e.g. 'priest' = 846)
    const perBookInitialCap = searchResults.length > 1000 ? 50 : 250;

    const renderVerseRow = (v: BibleVerse, compactBookHeader = false) => {
        const segments = buildHighlightSegments(v.text, searchHighlightTerms, searchWholeWord);
        return (
            <button
                key={v.id}
                data-testid="bible-search-result-item"
                data-ref={`${v.book} ${v.chapter}:${v.verse}`}
                onClick={() => handleResultClick(v.book, v.chapter, v.verse)}
                className="w-full text-left px-3.5 sm:px-4 py-3 min-h-[52px] hover:bg-primary/5 active:bg-primary/10 transition-colors border-b border-light-border/50 dark:border-dark-border/50 last:border-none group touch-manipulation"
            >
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Book size={12} className="text-primary opacity-60 shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-primary truncate">
                            {compactBookHeader ? `${v.book} ${v.chapter}:${v.verse}` : `${v.book} ${v.chapter}:${v.verse}`}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-light-text-disabled shrink-0">
                        {(v.versionId || mainVersion).toUpperCase()}
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-light-text-primary dark:text-dark-text-primary leading-relaxed line-clamp-3 font-serif opacity-90 group-hover:opacity-100 transition-opacity">
                    {segments.map((seg, idx) =>
                        seg.highlight ? (
                            <mark
                                key={idx}
                                className="bg-primary/20 text-primary font-bold rounded-xs px-0.5 not-italic"
                            >
                                {seg.text}
                            </mark>
                        ) : (
                            <React.Fragment key={idx}>{seg.text}</React.Fragment>
                        )
                    )}
                </p>
            </button>
        );
    };

    const renderBookGroup = (group: CanonicalBookGroup) => {
        const isExpanded = expandedBooks.has(group.book);
        const isFullyExpanded = fullyExpandedBooks.has(group.book);
        const cap = isFullyExpanded ? group.verses.length : perBookInitialCap;
        const shownVerses = isExpanded ? group.verses.slice(0, cap) : [];
        const remainingInBook = group.verses.length - shownVerses.length;
        const densityPct = Math.max(8, Math.round((group.verses.length / maxBookCount) * 100));
        const chapterSpan =
            group.minChapter === group.maxChapter
                ? `ch. ${group.minChapter}`
                : `ch. ${group.minChapter}–${group.maxChapter}`;

        return (
            <div
                key={group.book}
                className="border-b border-light-border/60 dark:border-dark-border/60 last:border-none"
                data-testid="bible-book-group"
                data-book={group.book}
            >
                <button
                    type="button"
                    data-testid="bible-book-group-header"
                    data-book={group.book}
                    aria-expanded={isExpanded}
                    onClick={() => toggleBookExpanded(group.book)}
                    className={`w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors touch-manipulation active:bg-primary/10 ${
                        isExpanded
                            ? 'bg-primary/8 dark:bg-primary/12'
                            : 'hover:bg-light-background/60 dark:hover:bg-dark-background/40'
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight
                            size={15}
                            className={`text-primary shrink-0 transition-transform duration-150 ${
                                isExpanded ? 'rotate-90' : ''
                            }`}
                        />
                        <span className="text-xs sm:text-[13px] font-black tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">
                            {group.book}
                        </span>
                        <span className="text-[10px] font-semibold text-light-text-disabled shrink-0">
                            {chapterSpan}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div
                            className="w-10 sm:w-14 h-1.5 rounded-full bg-light-border/70 dark:bg-dark-border/70 overflow-hidden"
                            aria-hidden="true"
                        >
                            <div
                                className="h-full rounded-full bg-primary/75 transition-all"
                                style={{ width: `${densityPct}%` }}
                            />
                        </div>
                        <span
                            className={`min-w-[28px] text-center px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                                isExpanded
                                    ? 'bg-primary text-white shadow-2xs'
                                    : 'bg-primary/12 text-primary'
                            }`}
                        >
                            {group.verses.length}
                        </span>
                    </div>
                </button>

                {isExpanded && (
                    <div
                        data-testid="bible-book-group-panel"
                        data-book={group.book}
                        className="border-l-2 border-primary/30 ml-3 sm:ml-4 bg-light-background/25 dark:bg-dark-background/20"
                    >
                        {shownVerses.map((v) => renderVerseRow(v, true))}

                        {remainingInBook > 0 && (
                            <div className="p-2.5 flex justify-center border-t border-light-border/40 dark:border-dark-border/40">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFullyExpandedBooks((prev) => {
                                            const next = new Set(prev);
                                            next.add(group.book);
                                            return next;
                                        })
                                    }
                                    className="min-h-[34px] px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 active:scale-95 text-primary text-[11px] font-bold transition-all touch-manipulation"
                                >
                                    Show all {group.verses.length} verses in {group.book} (+{remainingInBook})
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-50 bg-light-surface dark:bg-dark-surface flex flex-col overflow-hidden"
            data-testid="bible-search-overlay"
        >
            {/* Header / Search Input Bar (16px text-base on mobile prevents unwanted iOS/Android auto-zoom) */}
            <div className="px-3.5 py-2.5 border-b border-light-border dark:border-dark-border flex items-center gap-2 shrink-0">
                <Search className="text-primary shrink-0" size={17} />
                <input
                    autoFocus
                    type="text"
                    data-testid="bible-search-input"
                    placeholder="Search keywords, references (Gen 14:18), or Strong's (H3548)..."
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-base sm:text-sm font-semibold text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setSearchQuery(localQuery);
                            executeSearch(localQuery);
                        } else if (e.key === 'Escape') {
                            setSearchOpen(false);
                        }
                    }}
                />
                {localQuery && (
                    <button
                        type="button"
                        onClick={() => {
                            setLocalQuery('');
                            setSearchQuery('');
                            executeSearch('');
                        }}
                        className="min-h-[30px] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-light-background dark:bg-dark-background text-light-text-secondary hover:text-primary active:scale-95 transition-all shrink-0 touch-manipulation"
                        title="Clear search input"
                    >
                        Clear
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center hover:bg-light-sidebar dark:hover:bg-dark-sidebar active:scale-95 rounded-full text-light-text-secondary shrink-0 touch-manipulation transition-all"
                    title="Close Search (Esc)"
                    aria-label="Close Search"
                >
                    <X size={17} />
                </button>
            </div>

            {/* Canonical Filter & View Switcher Bar */}
            {hasActiveQuery && !isSearching && (searchTotalCount > 0 || hasActiveFilters) && (
                <div className="border-b border-light-border/70 dark:border-dark-border/70 bg-light-background/40 dark:bg-dark-background/30 shrink-0">
                    {/* Row A: Testament Scope, Book Filter & Exact Whole-Word */}
                    <div
                        className="px-3 py-2 flex flex-wrap items-center gap-1.5"
                        data-testid="bible-search-filter-bar"
                    >
                        <button
                            type="button"
                            onClick={() => setSearchTestamentFilter('all')}
                            data-testid="bible-filter-all"
                            className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 touch-manipulation ${
                                searchTestamentFilter === 'all' && !searchBookFilter
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white dark:bg-dark-surface text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary/40'
                            }`}
                        >
                            All ({searchTotalCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSearchTestamentFilter('ot')}
                            data-testid="bible-filter-ot"
                            className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 touch-manipulation ${
                                searchTestamentFilter === 'ot'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white dark:bg-dark-surface text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary/40'
                            }`}
                        >
                            OT ({searchOtCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSearchTestamentFilter('nt')}
                            data-testid="bible-filter-nt"
                            className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 touch-manipulation ${
                                searchTestamentFilter === 'nt'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-white dark:bg-dark-surface text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary/40'
                            }`}
                        >
                            NT ({searchNtCount})
                        </button>

                        {filteredBookOptions.length > 1 && (
                            <div className="relative flex items-center">
                                <select
                                    value={searchBookFilter || ''}
                                    onChange={(e) => setSearchBookFilter(e.target.value || null)}
                                    data-testid="bible-filter-book"
                                    className="min-h-[30px] appearance-none bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg pl-2.5 pr-6 py-1 text-[10px] font-bold text-light-text-primary dark:text-dark-text-primary cursor-pointer focus:outline-none focus:border-primary max-w-[145px] truncate touch-manipulation"
                                    title="Filter results by Bible book"
                                >
                                    <option value="">All Books ({filteredBookOptions.length})</option>
                                    {filteredBookOptions.map((b) => (
                                        <option key={b.book} value={b.book}>
                                            {b.book} ({b.count})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={11} className="absolute right-1.5 pointer-events-none text-light-text-disabled" />
                            </div>
                        )}

                        {(searchMode === 'keyword' || searchMode === 'phrase') && (
                            <button
                                type="button"
                                onClick={() => setSearchWholeWord(!searchWholeWord)}
                                data-testid="bible-filter-whole-word"
                                className={`ml-auto min-h-[30px] px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border active:scale-95 touch-manipulation ${
                                    searchWholeWord
                                        ? 'bg-primary/15 text-primary border-primary/40'
                                        : 'bg-white dark:bg-dark-surface text-light-text-secondary border-light-border dark:border-dark-border hover:border-primary/40'
                                }`}
                                title="Match exact whole words only (e.g. 'priest' without 'priests' or 'priesthood')"
                            >
                                Exact Word
                            </button>
                        )}
                    </div>

                    {/* Row B: Presentation Mode (List vs. By Book) & Expand All / Collapse Controls */}
                    {searchResults.length > 1 && (
                        <div
                            className="px-3 pb-2 pt-0.5 flex flex-wrap items-center justify-between gap-2 border-t border-light-border/40 dark:border-dark-border/40"
                            data-testid="bible-search-view-bar"
                        >
                            {/* Segmented View Toggle */}
                            <div className="inline-flex items-center p-0.5 rounded-xl bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border">
                                <button
                                    type="button"
                                    data-testid="bible-view-list"
                                    onClick={() => setSearchViewMode('list')}
                                    className={`min-h-[28px] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all touch-manipulation ${
                                        searchViewMode === 'list'
                                            ? 'bg-primary text-white shadow-2xs'
                                            : 'text-light-text-secondary hover:text-primary'
                                    }`}
                                >
                                    <List size={12} />
                                    <span>List</span>
                                </button>
                                <button
                                    type="button"
                                    data-testid="bible-view-books"
                                    onClick={() => setSearchViewMode('books')}
                                    className={`min-h-[28px] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all touch-manipulation ${
                                        searchViewMode === 'books'
                                            ? 'bg-primary text-white shadow-2xs'
                                            : 'text-light-text-secondary hover:text-primary'
                                    }`}
                                >
                                    <Layers size={12} />
                                    <span>By Book ({groupedBooks.length})</span>
                                </button>
                            </div>

                            {/* Contextual Batch / Accordion Expansion Control */}
                            <div className="flex items-center gap-2 ml-auto">
                                {searchViewMode === 'list' ? (
                                    visibleCount < searchResults.length ? (
                                        <>
                                            <span className="text-[10px] font-bold text-light-text-disabled tabular-nums">
                                                {visibleResults.length}/{searchResults.length}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={isPendingExpand}
                                                onClick={handleExpandAllList}
                                                data-testid="bible-expand-all-btn"
                                                className="min-h-[28px] px-2.5 py-1 rounded-lg bg-primary/12 hover:bg-primary/20 active:scale-95 text-primary text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all touch-manipulation"
                                                title={
                                                    canExpandAllInOneStep
                                                        ? `Display all ${searchResults.length} canonical matches`
                                                        : `Expand next ${SAFE_LIST_EXPAND_STEP.toLocaleString()} matches`
                                                }
                                            >
                                                <ChevronsUpDown size={12} />
                                                <span>
                                                    {canExpandAllInOneStep
                                                        ? `Expand All (${searchResults.length})`
                                                        : `Expand +${SAFE_LIST_EXPAND_STEP.toLocaleString()}`}
                                                </span>
                                            </button>
                                        </>
                                    ) : searchResults.length > PAGE_SIZE ? (
                                        <>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                All {searchResults.length} shown
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCollapseList}
                                                data-testid="bible-collapse-list-btn"
                                                className="min-h-[28px] px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-primary/40 active:scale-95 text-light-text-secondary text-[10px] font-bold flex items-center gap-1 transition-all touch-manipulation"
                                            >
                                                <ChevronsDownUp size={12} />
                                                <span>Collapse</span>
                                            </button>
                                        </>
                                    ) : null
                                ) : groupedBooks.length > 1 ? (
                                    <button
                                        type="button"
                                        disabled={isPendingExpand}
                                        onClick={handleToggleAllBooks}
                                        data-testid="bible-books-expand-all-btn"
                                        className={`min-h-[28px] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 touch-manipulation ${
                                            areAllBooksExpanded
                                                ? 'bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-text-secondary hover:border-primary/40'
                                                : 'bg-primary/12 hover:bg-primary/20 text-primary'
                                        }`}
                                    >
                                        {areAllBooksExpanded ? (
                                            <>
                                                <ChevronsDownUp size={12} />
                                                <span>Collapse All</span>
                                            </>
                                        ) : (
                                            <>
                                                <ChevronsUpDown size={12} />
                                                <span>Expand All</span>
                                            </>
                                        )}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results Scroll Area */}
            <div
                ref={resultsContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain"
                data-testid="bible-search-results"
            >
                {/* Direct Scripture Reference Jump Banner */}
                {searchMode === 'reference' && searchParsedRef && (
                    <div className="m-3 p-3.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                                Direct Passage Match
                            </p>
                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                                {searchParsedRef.book} {searchParsedRef.chapter}
                                {searchParsedRef.verse ? `:${searchParsedRef.verse}` : ''}
                                {searchParsedRef.verseEnd ? `–${searchParsedRef.verseEnd}` : ''}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                handleResultClick(
                                    searchParsedRef.book,
                                    searchParsedRef.chapter,
                                    searchParsedRef.verse || 1
                                )
                            }
                            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shrink-0 touch-manipulation"
                        >
                            <span>Open Chapter</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                )}

                {/* Strong's Concordance Lexicon Card */}
                {searchStrongsEntry && (
                    <div className="m-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Hash size={11} />
                                    <span>{searchStrongsEntry.id}</span>
                                </span>
                                <span className="font-serif text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {searchStrongsEntry.lemma}
                                </span>
                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary italic">
                                    ({searchStrongsEntry.xlit})
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyStrongs}
                                className="min-h-[30px] px-2.5 py-1 rounded-lg border border-primary/20 hover:bg-primary/10 active:scale-95 text-primary transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0 touch-manipulation"
                                title="Copy Strong's Definition"
                            >
                                {copiedStrongs ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                <span>{copiedStrongs ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>

                        {searchStrongsEntry.pron && (
                            <p className="text-[11px] font-mono text-light-text-disabled">
                                Pronunciation:{' '}
                                <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                    {searchStrongsEntry.pron}
                                </span>
                            </p>
                        )}

                        <div className="text-xs text-light-text-primary dark:text-dark-text-primary leading-relaxed space-y-1 font-serif">
                            <p className="font-sans font-bold text-[10px] uppercase tracking-wider text-primary opacity-80">
                                Strong's Definition:
                            </p>
                            <p className="opacity-95">{searchStrongsEntry.strongs_def}</p>
                        </div>

                        {searchStrongsEntry.kjv_def && (
                            <div className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed pt-2 border-t border-light-border/40 dark:border-dark-border/40 font-sans">
                                <span className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                    KJV Translation Usage:{' '}
                                </span>
                                <span className="italic">{searchStrongsEntry.kjv_def}</span>
                            </div>
                        )}
                    </div>
                )}

                {isSearching ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                        <Loader2 className="animate-spin text-primary" size={22} />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-light-text-disabled">
                            Searching Scripture...
                        </span>
                    </div>
                ) : searchResults.length > 0 ? (
                    searchViewMode === 'books' ? (
                        <div className="pb-6" data-testid="bible-books-accordion">
                            {/* Old Testament Section */}
                            {otGroups.length > 0 && (
                                <div>
                                    {ntGroups.length > 0 && (
                                        <div className="sticky top-0 z-10 px-3.5 py-2 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                Old Testament
                                            </span>
                                            <span className="text-[10px] font-bold text-light-text-disabled">
                                                {otGroups.length} {otGroups.length === 1 ? 'Book' : 'Books'} • {searchOtCount} {searchOtCount === 1 ? 'Verse' : 'Verses'}
                                            </span>
                                        </div>
                                    )}
                                    {otGroups.map(renderBookGroup)}
                                </div>
                            )}

                            {/* New Testament Section */}
                            {ntGroups.length > 0 && (
                                <div>
                                    {otGroups.length > 0 && (
                                        <div className="sticky top-0 z-10 px-3.5 py-2 bg-light-surface dark:bg-dark-surface border-b border-t border-light-border dark:border-dark-border flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                New Testament
                                            </span>
                                            <span className="text-[10px] font-bold text-light-text-disabled">
                                                {ntGroups.length} {ntGroups.length === 1 ? 'Book' : 'Books'} • {searchNtCount} {searchNtCount === 1 ? 'Verse' : 'Verses'}
                                            </span>
                                        </div>
                                    )}
                                    {ntGroups.map(renderBookGroup)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-1 pb-6">
                            {visibleResults.map((v) => renderVerseRow(v, false))}

                            {visibleCount < searchResults.length && (
                                <div className="p-4 flex flex-col items-center gap-3 border-t border-light-border/60 dark:border-dark-border/60 bg-light-background/25 dark:bg-dark-background/20">
                                    <div className="w-full max-w-[260px] space-y-1.5 text-center">
                                        <p className="text-[10px] font-bold text-light-text-secondary uppercase tracking-wider">
                                            Showing {visibleResults.length} of {searchResults.length} canonical matches
                                        </p>
                                        <div className="w-full h-1.5 rounded-full bg-light-border dark:bg-dark-border overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{
                                                    width: `${Math.min(100, Math.round((visibleResults.length / searchResults.length) * 100))}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setVisibleCount((prev) =>
                                                    Math.min(prev + PAGE_SIZE, searchResults.length)
                                                )
                                            }
                                            data-testid="bible-search-load-more"
                                            className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-primary/40 active:scale-95 text-light-text-primary dark:text-dark-text-primary text-xs font-bold transition-all touch-manipulation"
                                        >
                                            Show Next {Math.min(PAGE_SIZE, searchResults.length - visibleCount)} Verses
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isPendingExpand}
                                            onClick={handleExpandAllList}
                                            data-testid="bible-search-expand-all-footer"
                                            className="min-h-[40px] px-4 py-2 rounded-xl bg-primary text-white shadow-xs hover:opacity-95 active:scale-95 text-xs font-bold flex items-center gap-1.5 transition-all touch-manipulation"
                                        >
                                            <ChevronsUpDown size={14} />
                                            <span>
                                                {canExpandAllInOneStep
                                                    ? `Expand All (${searchResults.length})`
                                                    : `Expand +${SAFE_LIST_EXPAND_STEP.toLocaleString()}`}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ) : hasActiveQuery ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-70">
                        <Search size={30} className="mb-3 text-light-text-disabled" />
                        <p className="text-xs font-black uppercase tracking-widest text-light-text-primary dark:text-dark-text-primary">
                            No Scripture Matches
                        </p>
                        <p className="text-xs text-light-text-secondary mt-1 max-w-[240px]">
                            {hasActiveFilters
                                ? 'No verses match your active filters. Try resetting filters above.'
                                : 'Try a keyword ("priest"), phrase ("high priest"), reference ("Genesis 14:18"), or Strong\'s ID ("H3548").'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchWholeWord(false);
                                    setSearchTestamentFilter('all');
                                    setSearchBookFilter(null);
                                }}
                                className="mt-3 min-h-[36px] px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 touch-manipulation"
                            >
                                Reset Search Filters
                            </button>
                        )}
                    </div>
                ) : searchHistory && searchHistory.length > 0 ? (
                    <div className="h-full flex flex-col p-4 sm:p-5" data-testid="bible-search-history-container">
                        {/* History Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-light-border dark:border-dark-border shrink-0">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-primary" aria-hidden="true" />
                                <span className="text-xs font-black uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary">
                                    Recent Searches
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary">
                                    {searchHistory.length}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleClearAllHistory}
                                data-testid="clear-search-history-btn"
                                className="min-h-[36px] px-2.5 py-1 text-xs font-bold text-light-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95"
                                title="Clear all recent search history"
                                aria-label="Clear search history"
                            >
                                <Trash2 size={13} aria-hidden="true" />
                                <span>Clear History</span>
                            </button>
                        </div>

                        {/* History Items List */}
                        <div
                            className="flex-1 overflow-y-auto space-y-1.5 pr-1"
                            role="list"
                            aria-label="Recent search history"
                        >
                            {searchHistory.map((item) => (
                                <div
                                    key={item.id}
                                    role="listitem"
                                    onClick={() => handleApplyHistory(item)}
                                    data-testid="search-history-item"
                                    className="group flex items-center justify-between p-2.5 rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-light-surface dark:bg-dark-surface hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all active:scale-[0.99] touch-manipulation min-h-[46px]"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="p-1.5 rounded-lg bg-light-background dark:bg-dark-background text-primary shrink-0 group-hover:scale-105 transition-transform">
                                            {item.mode === 'reference' ? (
                                                <Book size={15} aria-hidden="true" />
                                            ) : item.mode === 'strongs' ? (
                                                <Hash size={15} aria-hidden="true" />
                                            ) : (
                                                <Search size={15} aria-hidden="true" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-light-text-primary dark:text-dark-text-primary truncate">
                                                    {item.query}
                                                </span>
                                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-light-border dark:bg-dark-border text-light-text-secondary uppercase">
                                                    {item.versionId}
                                                </span>
                                                {item.wholeWord && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        Exact
                                                    </span>
                                                )}
                                                {item.testament !== 'all' && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                                        {item.testament.toUpperCase()}
                                                    </span>
                                                )}
                                                {item.bookFilter && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                        {item.bookFilter}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-light-text-disabled">
                                                <span>
                                                    {item.mode === 'reference'
                                                        ? 'Direct Reference'
                                                        : item.mode === 'strongs'
                                                          ? "Strong's Lexicon"
                                                          : `${item.totalCount} matches`}
                                                </span>
                                                <span>•</span>
                                                <span>{formatHistoryTime(item.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => handleRemoveHistory(e, item.id)}
                                        data-testid="remove-history-item-btn"
                                        className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-light-text-disabled hover:text-red-500 hover:bg-red-500/10 opacity-70 group-hover:opacity-100 transition-all ml-2 shrink-0 touch-manipulation cursor-pointer"
                                        title="Remove from history"
                                        aria-label={`Remove ${item.query} from history`}
                                    >
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Collapsible suggested quick queries at bottom */}
                        <div className="mt-4 pt-3 border-t border-light-border/60 dark:border-dark-border/60 shrink-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-disabled mb-2">
                                Suggested Topics
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { label: 'priest', query: 'priest' },
                                    { label: 'melchizedek priest', query: 'melchizedek priest' },
                                    { label: 'Genesis 14:18', query: 'Genesis 14:18' },
                                    { label: 'H3548 (Kohen)', query: 'H3548' },
                                    { label: 'G26 (Agape)', query: 'G26' }
                                ].map((pill) => (
                                    <button
                                        key={pill.query}
                                        type="button"
                                        onClick={() => runQuickQuery(pill.query)}
                                        className="min-h-[28px] px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-light-background dark:bg-dark-background text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary hover:text-primary active:scale-95 transition-all touch-manipulation cursor-pointer"
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="space-y-4 max-w-[280px]">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5">
                                    Canonical Concordance Search
                                </p>
                                <p className="text-xs text-light-text-secondary leading-relaxed">
                                    Searches Genesis through Revelation in canonical order. Browse in batches, expand all matches, or group occurrences by Bible book.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                                {[
                                    { label: 'priest', query: 'priest' },
                                    { label: 'melchizedek priest', query: 'melchizedek priest' },
                                    { label: 'Genesis 14:18', query: 'Genesis 14:18' },
                                    { label: 'H3548 (Kohen)', query: 'H3548' },
                                    { label: 'G26 (Agape)', query: 'G26' }
                                ].map((pill) => (
                                    <button
                                        key={pill.query}
                                        type="button"
                                        onClick={() => runQuickQuery(pill.query)}
                                        className="min-h-[30px] px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white active:scale-95 transition-all touch-manipulation"
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
