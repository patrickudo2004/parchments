import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Folder, Sparkles, Zap, Loader2, BookOpen, Languages, Book } from 'lucide-react';
import { useNoteStore, type LocalItem } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { db, dbHelpers } from '@/lib/db';
import { SemanticSearchService } from '@/lib/search/semanticSearchService';
import {
    normalizeBibleQueryInput,
    searchBibleVerses,
    buildHighlightSegments
} from '@/lib/search/bibleSearchEngine';

export interface SearchResult {
    id: string;
    type: 'note' | 'folder' | 'scripture' | 'action' | 'semantic' | 'strongs' | 'bible_verse';
    category: 'scripture' | 'notes' | 'actions';
    title: string;
    subtitle?: string;
    highlightTerms?: string[];
    icon: React.ReactNode;
    handler: () => void;
}

function buildLocalDisplayPaths(items: LocalItem[]): { item: LocalItem; displayPath: string }[] {
    const byId = new Map<string, LocalItem>();
    for (const item of items) {
        byId.set(item.id, item);
    }
    return items.map((item) => {
        const parts = [item.name];
        let currParent = item.parentId;
        let guard = 0;
        while (currParent && guard < 20) {
            const parent = byId.get(currParent);
            if (!parent) break;
            parts.unshift(parent.name);
            currParent = parent.parentId;
            guard++;
        }
        return { item, displayPath: parts.join('/') };
    });
}

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void; initialQuery?: string }> = ({
    isOpen,
    onClose,
    initialQuery = ''
}) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [aiLoadingStatus, setAiLoadingStatus] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const searchSeqRef = useRef(0);

    const { setCurrentNote, localFiles, openLocalFile, isLocalMode } = useNoteStore();
    const { toggleTheme, openRightSidebar, openLexicon, toggleTemplateModal, toggleSettingsModal } = useUIStore();
    const { setBibleFocus, mainVersion, setSearchQuery, executeSearch, setSearchOpen } = useBibleStore();

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialQuery]);

    const performSearch = useCallback(
        async (rawQuery: string) => {
            const { cleanQuery, forcedBibleScope } = normalizeBibleQueryInput(rawQuery);

            if (!cleanQuery) {
                setResults([]);
                setIsSearching(false);
                return;
            }

            const seq = ++searchSeqRef.current;
            setIsSearching(true);

            const newResults: SearchResult[] = [];
            const lowerQuery = cleanQuery.toLowerCase();
            const seenIds = new Set<string>();
            const isSemanticQuery = !forcedBibleScope && cleanQuery.startsWith('?');

            // ── 1. Canonical Bible Search (References, Strong's IDs, Keywords, Phrases) ──
            if (!isSemanticQuery && (cleanQuery.length >= 2 || forcedBibleScope)) {
                try {
                    const bibleResp = await searchBibleVerses({
                        query: cleanQuery,
                        versionId: mainVersion
                    });

                    if (seq !== searchSeqRef.current) return;

                    // 1a. Direct Reference Match
                    if (bibleResp.mode === 'reference' && bibleResp.parsedReference) {
                        const ref = bibleResp.parsedReference;
                        const refTitle = `${ref.book} ${ref.chapter}${ref.verse ? ':' + ref.verse : ''}${ref.verseEnd ? '–' + ref.verseEnd : ''}`;
                        const previewText =
                            bibleResp.results.length > 0
                                ? bibleResp.results.map((v) => `${v.verse}. ${v.text}`).join(' ')
                                : 'Jump to Scripture in Bible Reader';

                        seenIds.add(`ref-${refTitle}`);
                        newResults.push({
                            id: `scripture-${ref.book}-${ref.chapter}-${ref.verse || 1}`,
                            type: 'scripture',
                            category: 'scripture',
                            title: `${refTitle} (${mainVersion.toUpperCase()})`,
                            subtitle: previewText,
                            icon: <BookOpen className="text-amber-500" size={16} />,
                            handler: () => {
                                setBibleFocus(ref);
                                openRightSidebar('bible');
                                onClose();
                            }
                        });
                    }

                    // 1b. Strong's Lexicon Entry Card + Canonical Occurrences
                    if (bibleResp.mode === 'strongs') {
                        const sId = bibleResp.cleanQuery;
                        if (bibleResp.strongsEntry) {
                            const entry = bibleResp.strongsEntry;
                            newResults.push({
                                id: `strongs-def-${sId}`,
                                type: 'strongs',
                                category: 'scripture',
                                title: `${sId} — ${entry.lemma} (${entry.xlit || ''})`,
                                subtitle: entry.strongs_def || entry.kjv_def || 'View in Lexicon',
                                icon: <Languages className="text-purple-500" size={16} />,
                                handler: () => {
                                    openLexicon(sId);
                                    onClose();
                                }
                            });
                        }

                        bibleResp.results.slice(0, 5).forEach((v) => {
                            const verseRef = `${v.book} ${v.chapter}:${v.verse}`;
                            newResults.push({
                                id: `strongs-verse-${v.id}`,
                                type: 'bible_verse',
                                category: 'scripture',
                                title: `${verseRef} (${(v.versionId || mainVersion).toUpperCase()})`,
                                subtitle: v.text,
                                icon: <Book className="text-primary" size={16} />,
                                handler: () => {
                                    setBibleFocus({ book: v.book, chapter: v.chapter, verse: v.verse });
                                    openRightSidebar('bible');
                                    onClose();
                                }
                            });
                        });

                        if (bibleResp.totalCount > 5) {
                            newResults.push({
                                id: `bible-view-all-${sId}`,
                                type: 'bible_verse',
                                category: 'scripture',
                                title: `View all ${bibleResp.totalCount} occurrences of ${sId} (Genesis → Revelation)`,
                                subtitle: `OT: ${bibleResp.otCount} • NT: ${bibleResp.ntCount} — Open in Bible Concordance Search`,
                                icon: <Sparkles className="text-primary" size={16} />,
                                handler: () => {
                                    setSearchQuery(sId);
                                    openRightSidebar('bible');
                                    setSearchOpen(true);
                                    executeSearch(sId);
                                    onClose();
                                }
                            });
                        }
                    }

                    // 1c. Canonical Keyword / Phrase Matches (Genesis -> Revelation)
                    if ((bibleResp.mode === 'keyword' || bibleResp.mode === 'phrase') && cleanQuery.length >= 2) {
                        const previewVerses = bibleResp.results.slice(0, 6);
                        previewVerses.forEach((v) => {
                            const verseRef = `${v.book} ${v.chapter}:${v.verse}`;
                            if (seenIds.has(verseRef)) return;
                            seenIds.add(verseRef);
                            newResults.push({
                                id: `bible-verse-${v.id}`,
                                type: 'bible_verse',
                                category: 'scripture',
                                title: `${verseRef} (${(v.versionId || mainVersion).toUpperCase()})`,
                                subtitle: v.text,
                                highlightTerms: bibleResp.highlightTerms,
                                icon: <Book className="text-amber-500" size={16} />,
                                handler: () => {
                                    setBibleFocus({ book: v.book, chapter: v.chapter, verse: v.verse });
                                    openRightSidebar('bible');
                                    onClose();
                                }
                            });
                        });

                        if (bibleResp.totalCount > 0) {
                            newResults.push({
                                id: `bible-view-all-${lowerQuery}`,
                                type: 'bible_verse',
                                category: 'scripture',
                                title: `View all ${bibleResp.totalCount} Scripture occurrences of "${bibleResp.cleanQuery}"`,
                                subtitle: `Canonical order (OT: ${bibleResp.otCount} • NT: ${bibleResp.ntCount}) — Filter by Testament or Book`,
                                icon: <Sparkles className="text-primary" size={16} />,
                                handler: () => {
                                    setSearchQuery(cleanQuery);
                                    openRightSidebar('bible');
                                    setSearchOpen(true);
                                    executeSearch(cleanQuery);
                                    onClose();
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.error('Bible keyword search failed:', err);
                }
            }

            if (!forcedBibleScope) {
                // ── 2. AI Semantic Search (triggered by ? prefix) ───────────────────────
                if (isSemanticQuery) {
                    const semanticText = cleanQuery.slice(1).trim();
                    if (semanticText && !isLocalMode) {
                        try {
                            const semanticHits = await SemanticSearchService.searchNotes(semanticText, (progressData) => {
                                setAiLoadingStatus(`Downloading AI Search Model: ${Math.round(progressData.progress || 0)}%`);
                            });
                            setAiLoadingStatus(null);

                            for (const hit of semanticHits) {
                                const note = await db.notes.get(hit.noteId);
                                if (note && !seenIds.has(note.id)) {
                                    seenIds.add(note.id);
                                    newResults.push({
                                        id: `semantic-${note.id}`,
                                        type: 'semantic',
                                        category: 'notes',
                                        title: note.title,
                                        subtitle: `Semantic Match: ${Math.round(hit.similarity * 100)}% similarity`,
                                        icon: <Zap className="text-amber-500" size={16} />,
                                        handler: () => {
                                            setCurrentNote(note);
                                            onClose();
                                        }
                                    });
                                }
                            }
                        } catch (err) {
                            console.error('Semantic search query execution failed:', err);
                            setAiLoadingStatus(null);
                        }
                    }
                }

                // ── 3. Notes & Files Search (Strictly Isolated by Active Storage Mode) ──
                if (isLocalMode) {
                    const flatLocal = buildLocalDisplayPaths(localFiles);
                    flatLocal
                        .filter(({ item, displayPath }) =>
                            item.name.toLowerCase().includes(lowerQuery) ||
                            displayPath.toLowerCase().includes(lowerQuery)
                        )
                        .forEach(({ item, displayPath }) => {
                            if (seenIds.has(item.id)) return;
                            seenIds.add(item.id);
                            newResults.push({
                                id: item.id,
                                type: item.kind === 'file' ? 'note' : 'folder',
                                category: 'notes',
                                title: item.name.replace(/\.(md|html)$/i, ''),
                                subtitle: item.kind === 'file' ? `Local Note • ${displayPath}` : `Local Folder • ${displayPath}`,
                                icon:
                                    item.kind === 'file' ? (
                                        <FileText className="text-primary" size={16} />
                                    ) : (
                                        <Folder className="text-amber-500" size={16} />
                                    ),
                                handler: () => {
                                    if (item.kind === 'file') {
                                        openLocalFile(item);
                                    }
                                    onClose();
                                }
                            });
                        });
                } else {
                    const dbHits = await dbHelpers.searchNotes(cleanQuery);
                    dbHits.forEach((note) => {
                        if (seenIds.has(note.id)) return;
                        seenIds.add(note.id);
                        newResults.push({
                            id: note.id,
                            type: 'note',
                            category: 'notes',
                            title: note.title,
                            subtitle: `In ${note.type || 'study'} notes (Browser DB)`,
                            icon: <FileText className="text-primary" size={16} />,
                            handler: () => {
                                setCurrentNote(note);
                                onClose();
                            }
                        });
                    });
                }

                // ── 4. Quick System Actions ──────────────────────────────────────────────
                const actions: (SearchResult & { queryMatch: string })[] = [
                    {
                        id: 'act-theme',
                        type: 'action',
                        category: 'actions',
                        title: 'Toggle Theme',
                        subtitle: 'Switch between light/dark mode',
                        icon: <Zap size={16} />,
                        handler: toggleTheme,
                        queryMatch: 'toggle theme dark light'
                    },
                    {
                        id: 'act-new-study',
                        type: 'action',
                        category: 'actions',
                        title: 'New Study',
                        subtitle: 'Start a new study template',
                        icon: <PenIcon size={16} />,
                        handler: toggleTemplateModal,
                        queryMatch: 'new study template soap inductive'
                    },
                    {
                        id: 'act-bible',
                        type: 'action',
                        category: 'actions',
                        title: 'Open Bible Reader',
                        subtitle: 'Open Scripture study workspace',
                        icon: <BookOpen size={16} />,
                        handler: () => openRightSidebar('bible'),
                        queryMatch: 'open bible reader scripture'
                    },
                    {
                        id: 'act-settings',
                        type: 'action',
                        category: 'actions',
                        title: 'Settings',
                        subtitle: 'Open app preferences',
                        icon: <Sparkles size={16} />,
                        handler: () => toggleSettingsModal(),
                        queryMatch: 'settings preferences'
                    }
                ];

                actions.forEach((a) => {
                    if (
                        a.queryMatch.toLowerCase().includes(lowerQuery) ||
                        a.title.toLowerCase().includes(lowerQuery)
                    ) {
                        newResults.push({
                            id: a.id,
                            type: 'action',
                            category: 'actions',
                            title: a.title,
                            subtitle: a.subtitle,
                            icon: <Zap className="text-purple-500" size={16} />,
                            handler: () => {
                                a.handler();
                                onClose();
                            }
                        });
                    }
                });
            }

            if (seq !== searchSeqRef.current) return;
            setResults(newResults);
            setSelectedIndex(0);
            setIsSearching(false);
        },
        [
            localFiles,
            isLocalMode,
            mainVersion,
            setCurrentNote,
            setBibleFocus,
            openRightSidebar,
            openLexicon,
            toggleTheme,
            toggleTemplateModal,
            toggleSettingsModal,
            setSearchQuery,
            setSearchOpen,
            executeSearch,
            onClose,
            openLocalFile
        ]
    );

    useEffect(() => {
        const timeout = setTimeout(() => performSearch(query), 150);
        return () => clearTimeout(timeout);
    }, [query, performSearch]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % (results.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % (results.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].handler();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Auto-scroll to selected index
    useEffect(() => {
        const selectedElement = scrollRef.current?.querySelector(`[data-result-index="${selectedIndex}"]`) as HTMLElement | null;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    const { cleanQuery, forcedBibleScope } = normalizeBibleQueryInput(query);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className={`fixed inset-0 z-[120] flex justify-center ${
                        isMobile ? 'items-end p-0' : 'items-start pt-[12vh] px-4'
                    }`}
                    data-testid="command-palette"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.96, y: -16 }}
                        animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.96, y: -16 }}
                        transition={isMobile ? { type: 'spring', damping: 25, stiffness: 200 } : {}}
                        className={`w-full bg-white dark:bg-dark-surface overflow-hidden border border-light-border dark:border-dark-border relative flex flex-col shadow-2xl ${
                            isMobile ? 'h-[85dvh] rounded-t-3xl' : 'max-w-2xl max-h-[75vh] rounded-2xl'
                        }`}
                    >
                        {isMobile && (
                            <div className="w-full flex justify-center py-3 shrink-0 cursor-pointer" onClick={onClose}>
                                <div className="w-12 h-1 rounded-full bg-light-border dark:bg-dark-border" />
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-light-border dark:border-dark-border shrink-0">
                            {isSearching ? (
                                <Loader2 className="text-primary animate-spin shrink-0" size={20} />
                            ) : (
                                <Search className="text-light-text-secondary dark:text-dark-text-secondary shrink-0" size={20} />
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                data-testid="command-palette-input"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search Scripture (priest, Gen 14:18), Strong's (H3548), Notes, or Commands..."
                                className="flex-1 bg-transparent border-none outline-none text-base sm:text-lg text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled"
                            />
                            {forcedBibleScope && (
                                <span
                                    data-testid="command-palette-bible-scope"
                                    className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black uppercase tracking-wider shrink-0"
                                >
                                    Bible Scope
                                </span>
                            )}
                            <div className="flex items-center gap-1 opacity-50 shrink-0">
                                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold">ESC</kbd>
                            </div>
                        </div>

                        {aiLoadingStatus && (
                            <div className="bg-primary/5 px-6 py-2.5 border-b border-light-border dark:border-dark-border flex items-center gap-3 text-xs text-primary font-bold animate-pulse shrink-0">
                                <Loader2 className="animate-spin text-primary shrink-0" size={14} />
                                <span>{aiLoadingStatus}</span>
                            </div>
                        )}

                        {/* Results Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                            {results.length > 0 ? (
                                results.map((result, idx) => {
                                    const showCategoryHeader = idx === 0 || results[idx - 1].category !== result.category;
                                    const categoryLabel =
                                        result.category === 'scripture'
                                            ? '📖 Scripture & Lexicon (Canonical Order)'
                                            : result.category === 'notes'
                                                ? '📝 Notes & Files'
                                                : '⚡ System Actions';

                                    const subtitleSegments =
                                        result.subtitle && result.highlightTerms && result.highlightTerms.length > 0
                                            ? buildHighlightSegments(result.subtitle, result.highlightTerms, false)
                                            : null;

                                    return (
                                        <React.Fragment key={result.id}>
                                            {showCategoryHeader && (
                                                <div className="px-6 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-light-text-disabled/80">
                                                    {categoryLabel}
                                                </div>
                                            )}
                                            <div
                                                data-testid="command-palette-result"
                                                data-result-index={idx}
                                                onClick={() => result.handler()}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={`px-6 py-3 flex items-center gap-4 cursor-pointer transition-colors ${
                                                    idx === selectedIndex
                                                        ? 'bg-primary/10 dark:bg-primary/20'
                                                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                        idx === selectedIndex
                                                            ? 'bg-primary text-white'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                    }`}
                                                >
                                                    {result.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                                                        {result.title}
                                                    </p>
                                                    {result.subtitle && (
                                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate line-clamp-1">
                                                            {subtitleSegments
                                                                ? subtitleSegments.map((seg, sIdx) =>
                                                                      seg.highlight ? (
                                                                          <mark
                                                                              key={sIdx}
                                                                              className="bg-primary/20 text-primary font-bold rounded-xs px-0.5"
                                                                          >
                                                                              {seg.text}
                                                                          </mark>
                                                                      ) : (
                                                                          <React.Fragment key={sIdx}>{seg.text}</React.Fragment>
                                                                      )
                                                                  )
                                                                : result.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                {idx === selectedIndex && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0">
                                                        Enter
                                                    </span>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            ) : cleanQuery ? (
                                <div className="px-6 py-12 text-center text-light-text-secondary dark:text-dark-text-secondary">
                                    <p className="text-sm font-medium">No results found for "{cleanQuery}"</p>
                                    <p className="text-xs text-light-text-disabled mt-1">
                                        Try a keyword (e.g. "priest"), verse (e.g. Genesis 14:18), or Strong's ID (e.g. H3548).
                                    </p>
                                </div>
                            ) : (
                                <div className="px-6 py-8 text-center text-light-text-secondary dark:text-dark-text-secondary opacity-70">
                                    <p className="text-xs uppercase font-black tracking-widest mb-1 text-primary">
                                        {forcedBibleScope ? 'Find in Bible' : 'Universal Search'}
                                    </p>
                                    <p className="text-xs font-medium">
                                        {forcedBibleScope
                                            ? 'Type any Scripture keyword (e.g. "priest"), passage (Genesis 14:18), or Strong\'s ID (H3548)'
                                            : 'Search Scripture (Genesis → Revelation), Strong\'s Concordance, Notes, or Commands'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gray-50 dark:bg-black/20 border-t border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-widest text-light-text-disabled">
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-xs">↑↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-xs">↵</kbd>
                                    <span>Select</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const PenIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
);
