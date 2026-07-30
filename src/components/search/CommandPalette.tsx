import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Folder, Sparkles, Zap, Loader2, BookOpen, Languages, Book } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { db, dbHelpers } from '@/lib/db';
import { parseScriptureReference } from '@/lib/scriptureParser';
import { SemanticSearchService } from '@/lib/search/semanticSearchService';

const paletteVersesCache: Record<string, any[]> = {};

export interface SearchResult {
    id: string;
    type: 'note' | 'folder' | 'scripture' | 'action' | 'semantic' | 'strongs' | 'bible_verse';
    category: 'scripture' | 'notes' | 'actions';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    handler: () => void;
}

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void; initialQuery?: string }> = ({ isOpen, onClose, initialQuery = '' }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [aiLoadingStatus, setAiLoadingStatus] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { setCurrentNote, localFiles, openLocalFile } = useNoteStore();
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

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const newResults: SearchResult[] = [];
        const lowerQuery = searchQuery.toLowerCase().trim();
        const seenIds = new Set<string>();

        // ── 1. Scripture Reference Jump ──────────────────────────────────────────
        const scripture = parseScriptureReference(searchQuery);
        if (scripture) {
            const refTitle = `${scripture.book} ${scripture.chapter}${scripture.verse ? ':' + scripture.verse : ''}`;
            seenIds.add(`ref-${refTitle}`);
            newResults.push({
                id: `scripture-${scripture.book}-${scripture.chapter}-${scripture.verse || 0}`,
                type: 'scripture',
                category: 'scripture',
                title: refTitle,
                subtitle: 'Jump to Scripture in Bible Reader',
                icon: <BookOpen className="text-amber-500" size={16} />,
                handler: () => {
                    setBibleFocus(scripture);
                    openRightSidebar('bible');
                    onClose();
                }
            });
        }

        // ── 2. Strong's Concordance / Original Language Search ───────────────────
        const strongsRegex = /^[gh]\d+$/i;
        const cleanStrongs = lowerQuery.startsWith('#') ? lowerQuery.slice(1) : lowerQuery;
        if (strongsRegex.test(cleanStrongs)) {
            const sId = cleanStrongs.toUpperCase();
            try {
                const entry = await db.strongsEntries.get(sId);
                if (entry) {
                    newResults.push({
                        id: `strongs-def-${sId}`,
                        type: 'strongs',
                        category: 'scripture',
                        title: `${sId} - ${entry.lemma} (${entry.xlit || ''})`,
                        subtitle: entry.strongs_def || entry.kjv_def || 'View in Lexicon',
                        icon: <Languages className="text-purple-500" size={16} />,
                        handler: () => {
                            openLexicon(sId);
                            onClose();
                        }
                    });
                }

                const concordance = await db.strongsConcordance.where('strongsNumbers').equals(sId).limit(5).toArray();
                if (concordance.length > 0) {
                    const verseIds = concordance.map(c => c.verseId);
                    const rawVerses = await db.bibleVerses.bulkGet(verseIds);
                    const validRaw = (rawVerses.filter(Boolean) as any[]).filter(v => v.versionId === mainVersion);
                    const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
                    const decrypted = await decryptVerses(validRaw);

                    decrypted.forEach(v => {
                        const verseRef = `${v.book} ${v.chapter}:${v.verse}`;
                        newResults.push({
                            id: `strongs-verse-${v.id}`,
                            type: 'bible_verse',
                            category: 'scripture',
                            title: `${verseRef} (${mainVersion.toUpperCase()})`,
                            subtitle: v.text,
                            icon: <Book className="text-primary" size={16} />,
                            handler: () => {
                                setBibleFocus({ book: v.book, chapter: v.chapter, verse: v.verse });
                                openRightSidebar('bible');
                                onClose();
                            }
                        });
                    });
                }
            } catch (err) {
                console.error('Strong\'s search failed:', err);
            }
        }

        // ── 3. Full-Text Bible Verse Search ─────────────────────────────────────
        if (lowerQuery.length >= 3 && !scripture && !searchQuery.startsWith('?')) {
            try {
                let versionVerses = paletteVersesCache[mainVersion];
                if (!versionVerses) {
                    const rawVerses = await db.bibleVerses
                        .where('versionId')
                        .equals(mainVersion)
                        .toArray();
                    const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
                    versionVerses = await decryptVerses(rawVerses);
                    paletteVersesCache[mainVersion] = versionVerses;
                }

                const verseHits = versionVerses
                    .filter(v => v.text.toLowerCase().includes(lowerQuery))
                    .slice(0, 5);

                verseHits.forEach(v => {
                    const verseRef = `${v.book} ${v.chapter}:${v.verse}`;
                    if (seenIds.has(verseRef)) return;
                    seenIds.add(verseRef);
                    newResults.push({
                        id: `bible-verse-${v.id}`,
                        type: 'bible_verse',
                        category: 'scripture',
                        title: `${verseRef} (${mainVersion.toUpperCase()})`,
                        subtitle: v.text,
                        icon: <Book className="text-amber-500" size={16} />,
                        handler: () => {
                            setBibleFocus({ book: v.book, chapter: v.chapter, verse: v.verse });
                            openRightSidebar('bible');
                            onClose();
                        }
                    });
                });

                if (verseHits.length >= 5) {
                    newResults.push({
                        id: `bible-view-all-${lowerQuery}`,
                        type: 'bible_verse',
                        category: 'scripture',
                        title: `Search all Scripture occurrences of "${searchQuery}"`,
                        subtitle: 'Open full search in Bible Reader',
                        icon: <Sparkles className="text-primary" size={16} />,
                        handler: () => {
                            setSearchQuery(searchQuery);
                            openRightSidebar('bible');
                            setSearchOpen(true);
                            executeSearch();
                            onClose();
                        }
                    });
                }
            } catch (err) {
                console.error('Bible keyword search failed:', err);
            }
        }

        // ── 4. AI Semantic Search (triggered by ? prefix) ───────────────────────
        if (searchQuery.startsWith('?')) {
            const cleanQuery = searchQuery.slice(1).trim();
            if (cleanQuery) {
                try {
                    const semanticHits = await SemanticSearchService.searchNotes(cleanQuery, (progressData) => {
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

        // ── 5. Keyword Search - Database Notes ─────────────────────────────────
        const dbHits = await dbHelpers.searchNotes(searchQuery);
        dbHits.forEach(note => {
            if (seenIds.has(note.id)) return;
            seenIds.add(note.id);
            newResults.push({
                id: note.id,
                type: 'note',
                category: 'notes',
                title: note.title,
                subtitle: `In ${note.type || 'study'} notes`,
                icon: <FileText className="text-primary" size={16} />,
                handler: () => {
                    setCurrentNote(note);
                    onClose();
                }
            });
        });

        // ── 6. Keyword Search - Local Files ────────────────────────────────────
        localFiles.filter(f => f.name.toLowerCase().includes(lowerQuery)).forEach(file => {
            if (seenIds.has(file.id)) return;
            seenIds.add(file.id);
            newResults.push({
                id: file.id,
                type: file.kind === 'file' ? 'note' : 'folder',
                category: 'notes',
                title: file.name,
                subtitle: file.kind === 'file' ? 'Local File' : 'Local Folder',
                icon: file.kind === 'file' ? <FileText className="text-primary" size={16} /> : <Folder className="text-amber-500" size={16} />,
                handler: () => {
                    if (file.kind === 'file') {
                        openLocalFile(file as any);
                    }
                    onClose();
                }
            });
        });

        // ── 7. Quick System Actions ──────────────────────────────────────────────
        const actions: (SearchResult & { queryMatch: string })[] = [
            { id: 'act-theme', type: 'action', category: 'actions', title: 'Toggle Theme', subtitle: 'Switch between light/dark mode', icon: <Zap size={16} />, handler: toggleTheme, queryMatch: 'toggle theme dark light' },
            { id: 'act-new-study', type: 'action', category: 'actions', title: 'New Study', subtitle: 'Start a new study template', icon: <PenIcon size={16} />, handler: toggleTemplateModal, queryMatch: 'new study template soap inductive' },
            { id: 'act-bible', type: 'action', category: 'actions', title: 'Open Bible Reader', subtitle: 'Open Scripture study workspace', icon: <BookOpen size={16} />, handler: () => openRightSidebar('bible'), queryMatch: 'open bible reader scripture' },
            { id: 'act-settings', type: 'action', category: 'actions', title: 'Settings', subtitle: 'Open app preferences', icon: <Sparkles size={16} />, handler: () => toggleSettingsModal(), queryMatch: 'settings preferences' },
        ];

        actions.forEach(a => {
            if (a.queryMatch.toLowerCase().includes(lowerQuery) || a.title.toLowerCase().includes(lowerQuery)) {
                newResults.push({
                    id: a.id,
                    type: 'action',
                    category: 'actions',
                    title: a.title,
                    subtitle: a.subtitle,
                    icon: <Zap className="text-purple-500" size={16} />,
                    handler: () => { a.handler(); onClose(); }
                });
            }
        });

        setResults(newResults);
        setSelectedIndex(0);
    }, [localFiles, mainVersion, setCurrentNote, setBibleFocus, openRightSidebar, openLexicon, toggleTheme, toggleTemplateModal, toggleSettingsModal, setSearchQuery, setSearchOpen, executeSearch, onClose, openLocalFile]);

    useEffect(() => {
        const timeout = setTimeout(() => performSearch(query), 150);
        return () => clearTimeout(timeout);
    }, [query, performSearch]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (results.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
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
        const selectedElement = scrollRef.current?.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={`fixed inset-0 z-[100] flex justify-center ${isMobile ? 'items-end p-0' : 'items-start pt-[12vh] px-4'}`}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.95, y: -20 }}
                        animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.95, y: -20 }}
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
                        <div className="flex items-center gap-4 px-6 py-4 border-b border-light-border dark:border-dark-border shrink-0">
                            <Search className="text-light-text-secondary dark:text-dark-text-secondary" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search Scripture, Strong's (G26), Notes, or Commands..."
                                className="flex-1 bg-transparent border-none outline-none text-base sm:text-lg text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled"
                            />
                            <div className="flex items-center gap-1 opacity-50">
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
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto py-2 custom-scrollbar"
                        >
                            {results.length > 0 ? (
                                results.map((result, idx) => {
                                    const showCategoryHeader = idx === 0 || results[idx - 1].category !== result.category;
                                    const categoryLabel =
                                        result.category === 'scripture' ? '📖 Scripture & Lexicon' :
                                        result.category === 'notes' ? '📝 Notes & Files' : '⚡ System Actions';

                                    return (
                                        <React.Fragment key={result.id}>
                                            {showCategoryHeader && (
                                                <div className="px-6 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-light-text-disabled/70">
                                                    {categoryLabel}
                                                </div>
                                            )}
                                            <div
                                                onClick={() => result.handler()}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={`px-6 py-3 flex items-center gap-4 cursor-pointer transition-colors ${idx === selectedIndex
                                                    ? 'bg-primary/10 dark:bg-primary/20'
                                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${idx === selectedIndex ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {result.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                                                        {result.title}
                                                    </p>
                                                    {result.subtitle && (
                                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate line-clamp-1">
                                                            {result.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                {idx === selectedIndex && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0">Enter</span>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            ) : query.trim() ? (
                                <div className="px-6 py-12 text-center text-light-text-secondary dark:text-dark-text-secondary">
                                    <p className="text-sm font-medium">No results found for "{query}"</p>
                                    <p className="text-xs text-light-text-disabled mt-1">Try a verse (e.g. John 3:16), Strong's ID (e.g. G26), or a keyword like "grace".</p>
                                </div>
                            ) : (
                                <div className="px-6 py-8 text-center text-light-text-secondary dark:text-dark-text-secondary opacity-60">
                                    <p className="text-xs uppercase font-black tracking-widest mb-1">Universal Search</p>
                                    <p className="text-xs font-medium">Search Scripture, Strong's Concordance, Notes, Files, or Commands</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gray-50 dark:bg-black/20 border-t border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-widest text-light-text-disabled">
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">↑↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">↵</kbd>
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
