import React, { useState, useEffect, useRef } from 'react';
import { useBibleStore } from '@/stores/bibleStore';
import { Search, X, Loader2, Book, Hash, Copy, Check, ArrowRight, ChevronDown } from 'lucide-react';
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

const PAGE_SIZE = 100;

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
        searchMode,
        searchParsedRef,
        searchStrongsEntry,
        searchHighlightTerms,
        setSearchTestamentFilter,
        setSearchBookFilter,
        setSearchWholeWord,
        executeSearch,
        setBibleFocus
    } = useBibleStore();
    const { showToast } = useUIStore();

    const [localQuery, setLocalQuery] = useState(searchQuery);
    const [copiedStrongs, setCopiedStrongs] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Sync local state if store changes externally (e.g. from CommandPalette or Lexicon search)
    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    // Reset progressive pagination & scroll position when result set or filters change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
        resultsContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [searchQuery, searchTestamentFilter, searchBookFilter, searchWholeWord, mainVersion]);

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
        if (visibleCount >= searchResults.length) return;
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 280) {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, searchResults.length));
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
    const hasActiveQuery = localQuery.trim().length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-50 bg-light-surface dark:bg-dark-surface flex flex-col overflow-hidden"
            data-testid="bible-search-overlay"
        >
            {/* Header / Search Input Bar */}
            <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center gap-2.5 shrink-0">
                <Search className="text-primary shrink-0" size={17} />
                <input
                    autoFocus
                    type="text"
                    data-testid="bible-search-input"
                    placeholder="Search keywords, references (Gen 14:18), or Strong's (H3548)..."
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-semibold text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled"
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
                        onClick={() => {
                            setLocalQuery('');
                            setSearchQuery('');
                            executeSearch('');
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-light-background dark:bg-dark-background text-light-text-secondary hover:text-primary transition-colors shrink-0"
                        title="Clear search input"
                    >
                        Clear
                    </button>
                )}
                <button
                    onClick={() => setSearchOpen(false)}
                    className="p-1.5 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full text-light-text-secondary shrink-0"
                    title="Close Search (Esc)"
                    aria-label="Close Search"
                >
                    <X size={17} />
                </button>
            </div>

            {/* Canonical Filter & Match Count Bar */}
            {hasActiveQuery && !isSearching && (searchTotalCount > 0 || searchWholeWord || searchTestamentFilter !== 'all' || searchBookFilter) && (
                <div
                    className="px-3 py-2 border-b border-light-border/70 dark:border-dark-border/70 bg-light-background/40 dark:bg-dark-background/30 flex flex-wrap items-center gap-1.5 shrink-0"
                    data-testid="bible-search-filter-bar"
                >
                    {/* Testament Filter Pills */}
                    <button
                        onClick={() => setSearchTestamentFilter('all')}
                        data-testid="bible-filter-all"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            searchTestamentFilter === 'all' && !searchBookFilter
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white dark:bg-dark-surface text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary/40'
                        }`}
                    >
                        All ({searchTotalCount})
                    </button>
                    <button
                        onClick={() => setSearchTestamentFilter('ot')}
                        data-testid="bible-filter-ot"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            searchTestamentFilter === 'ot'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white dark:bg-dark-surface text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary/40'
                        }`}
                    >
                        OT ({searchOtCount})
                    </button>
                    <button
                        onClick={() => setSearchTestamentFilter('nt')}
                        data-testid="bible-filter-nt"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            searchTestamentFilter === 'nt'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white dark:bg-dark-surface text-light-text-secondary border border-light-border dark:border-dark-border hover:border-primary/40'
                        }`}
                    >
                        NT ({searchNtCount})
                    </button>

                    {/* Canonical Book Jump / Filter */}
                    {filteredBookOptions.length > 1 && (
                        <div className="relative flex items-center">
                            <select
                                value={searchBookFilter || ''}
                                onChange={(e) => setSearchBookFilter(e.target.value || null)}
                                data-testid="bible-filter-book"
                                className="appearance-none bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg pl-2 pr-6 py-1 text-[10px] font-bold text-light-text-primary dark:text-dark-text-primary cursor-pointer focus:outline-none focus:border-primary max-w-[145px] truncate"
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

                    {/* Exact Whole-Word Toggle (for Keyword Queries) */}
                    {(searchMode === 'keyword' || searchMode === 'phrase') && (
                        <button
                            onClick={() => setSearchWholeWord(!searchWholeWord)}
                            data-testid="bible-filter-whole-word"
                            className={`ml-auto px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
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
            )}

            {/* Results Scroll Area */}
            <div
                ref={resultsContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto custom-scrollbar"
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
                            onClick={() =>
                                handleResultClick(
                                    searchParsedRef.book,
                                    searchParsedRef.chapter,
                                    searchParsedRef.verse || 1
                                )
                            }
                            className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
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
                                onClick={handleCopyStrongs}
                                className="p-1.5 rounded-lg border border-primary/20 hover:bg-primary/10 text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shrink-0"
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
                ) : visibleResults.length > 0 ? (
                    <div className="py-1">
                        {visibleResults.map((v) => {
                            const segments = buildHighlightSegments(
                                v.text,
                                searchHighlightTerms,
                                searchWholeWord
                            );
                            return (
                                <button
                                    key={v.id}
                                    data-testid="bible-search-result-item"
                                    data-ref={`${v.book} ${v.chapter}:${v.verse}`}
                                    onClick={() => handleResultClick(v.book, v.chapter, v.verse)}
                                    className="w-full text-left px-4 py-3.5 hover:bg-primary/5 transition-colors border-b border-light-border/50 dark:border-dark-border/50 last:border-none group"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <Book size={12} className="text-primary opacity-60" />
                                            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                                                {v.book} {v.chapter}:{v.verse}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-light-text-disabled">
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
                        })}

                        {visibleCount < searchResults.length && (
                            <div className="p-4 flex flex-col items-center gap-2 border-t border-light-border/50 dark:border-dark-border/50">
                                <p className="text-[10px] font-bold text-light-text-secondary uppercase tracking-wider">
                                    Showing {visibleResults.length} of {searchResults.length} canonical matches
                                </p>
                                <button
                                    onClick={() =>
                                        setVisibleCount((prev) =>
                                            Math.min(prev + PAGE_SIZE, searchResults.length)
                                        )
                                    }
                                    data-testid="bible-search-load-more"
                                    className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                                >
                                    Show Next {Math.min(PAGE_SIZE, searchResults.length - visibleCount)} Verses
                                </button>
                            </div>
                        )}
                    </div>
                ) : hasActiveQuery ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-70">
                        <Search size={30} className="mb-3 text-light-text-disabled" />
                        <p className="text-xs font-black uppercase tracking-widest text-light-text-primary dark:text-dark-text-primary">
                            No Scripture Matches
                        </p>
                        <p className="text-xs text-light-text-secondary mt-1 max-w-[240px]">
                            {searchWholeWord || searchTestamentFilter !== 'all' || searchBookFilter
                                ? 'No verses match your active filters. Try resetting filters above.'
                                : 'Try a keyword ("priest"), phrase ("high priest"), reference ("Genesis 14:18"), or Strong\'s ID ("H3548").'}
                        </p>
                        {(searchWholeWord || searchTestamentFilter !== 'all' || searchBookFilter) && (
                            <button
                                onClick={() => {
                                    setSearchWholeWord(false);
                                    setSearchTestamentFilter('all');
                                    setSearchBookFilter(null);
                                }}
                                className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold"
                            >
                                Reset Search Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="space-y-4 max-w-[280px]">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5">
                                    Canonical Concordance Search
                                </p>
                                <p className="text-xs text-light-text-secondary leading-relaxed">
                                    Searches Genesis through Revelation in canonical order across keywords, multi-word phrases, references, and Strong's numbers.
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
                                        onClick={() => runQuickQuery(pill.query)}
                                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors"
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
