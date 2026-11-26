import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { ChevronRight, ChevronLeft, Plus, X as CloseIcon, ExternalLink, Maximize2, Minimize2, AlignLeft, Search, SlidersHorizontal } from 'lucide-react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BibleVerse, BibleVersion } from '@/types/database';
import { BookChapterPicker } from './BookChapterPicker';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { Languages } from 'lucide-react';
import { ParallelVerseRow } from './ParallelVerseRow';
import { Pin, X, BookOpen, Copy, Quote, GitBranch } from 'lucide-react';
import { useResearchStore } from '@/stores/researchStore';
import { motion, AnimatePresence } from 'framer-motion';
import { popoutService } from '@/lib/utils/popoutService';
import { BibleSearchOverlay } from './BibleSearchOverlay';

interface BibleReaderProps {
    isIndependent?: boolean;
    hideSearchButton?: boolean;
}

export const BibleReader: React.FC<BibleReaderProps> = ({ isIndependent = false, hideSearchButton = false }) => {
    const {
        bibleFocus,
        mainVersion,
        parallelVersions,
        setMainVersion,
        addParallelVersion,
        removeParallelVersion,
        setBibleFocus,
        interlinearEnabled,
        toggleInterlinear,
        selectionRange,
        setSelectionRange,
        isSearchOpen,
        setSearchOpen
    } = useBibleStore();

    const { pinItem } = useResearchStore();

    const { showToast, isMobile, isRightSidebarFloating, toggleRightSidebarFloating, closeRightSidebar, openCrossRefs, selectedVerseId, setSelectedVerseId, bibleFontSize, setBibleFontSize } = useUIStore();
    const [readingFlowMode, setReadingFlowMode] = useState<'study' | 'paragraph'>('study');
    const [isToolsOpen, setIsToolsOpen] = useState(false);

    // Auto-expand/dock logic based on mode
    useEffect(() => {
        if (isIndependent) {
            // In pop-out mode, we might want different defaults
        }
    }, [isIndependent]);
    const contentRef = useRef<HTMLDivElement>(null);

    // Current Navigation State
    const [book, setBook] = useState(bibleFocus?.book || 'John');
    const [chapter, setChapter] = useState(bibleFocus?.chapter || 1);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isAddParallelOpen, setIsAddParallelOpen] = useState(false);

    const activeVersions = React.useMemo(() => [mainVersion, ...parallelVersions], [mainVersion, parallelVersions.join(',')]);
    const activeVersionsKey = `${mainVersion}:${parallelVersions.join(',')}`;

    const installedVersions = useLiveQuery(async () => {
        const all = await db.bibleVersions.toArray();
        return all.filter(v => v.isDownloaded);
    }) || [];

    // Fetch all verses for all active versions in the current chapter
    const allVerses = useLiveQuery(async () => {
        if (!activeVersions.length) return [];

        // Use parallel queries with the compound index for maximum speed
        const results = await Promise.all(
            activeVersions.map(vid =>
                db.bibleVerses.where('[versionId+book+chapter]').equals([vid, book, chapter]).toArray()
            )
        );
        const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
        return await decryptVerses(results.flat());
    }, [activeVersionsKey, book, chapter]) || [];

    // Group verses by verse number
    const groupedVerses = React.useMemo(() => {
        const groups: Record<number, Record<string, BibleVerse>> = {};
        allVerses.forEach(v => {
            if (!groups[v.verse]) groups[v.verse] = {};
            groups[v.verse][v.versionId] = v;
        });
        return groups;
    }, [allVerses]);

    const sortedVerseNums = Object.keys(groupedVerses).map(Number).sort((a, b) => a - b);

    // Sync with bibleFocus from global store (only if NOT independent)
    useEffect(() => {
        if (bibleFocus && !isIndependent) {
            setBook(bibleFocus.book);
            setChapter(bibleFocus.chapter);

            if (bibleFocus.verse !== null && bibleFocus.verse !== undefined) {
                setTimeout(() => {
                    const el = contentRef.current?.querySelector(`#verse-${bibleFocus.verse}`) || document.getElementById(`verse-${bibleFocus.verse}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [bibleFocus, isIndependent]);

    const handleNavigation = (direction: 'next' | 'prev') => {
        const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === book);
        const currentBookData = BIBLE_BOOKS[currentBookIndex];
        let newBook = book;
        let newChapter = chapter;

        if (direction === 'next') {
            if (chapter < currentBookData.chapters) {
                newChapter = chapter + 1;
            } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
                const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
                newBook = nextBook.name;
                newChapter = 1;
            }
        } else {
            if (chapter > 1) {
                newChapter = chapter - 1;
            } else if (currentBookIndex > 0) {
                const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
                newBook = prevBook.name;
                newChapter = prevBook.chapters;
            }
        }

        if (newBook !== book || newChapter !== chapter) {
            setBook(newBook);
            setChapter(newChapter);
            if (!isIndependent) {
                setBibleFocus({ book: newBook, chapter: newChapter, verse: null });
            }
        }
        contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    };

    const handlePickerSelect = (newBook: string, newChapter: number) => {
        setBook(newBook);
        setChapter(newChapter);
        if (!isIndependent) {
            setBibleFocus({ book: newBook, chapter: newChapter, verse: null });
        }
        setIsPickerOpen(false);
        contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    };

    const handlePinSelection = async () => {
        if (!selectionRange) return;
        const start = Math.min(selectionRange.start, selectionRange.end);
        const end = Math.max(selectionRange.start, selectionRange.end);

        // Fetch direct from DB to ensure we have all verses in the range
        // regardless of local state/loading
        const rangeVerses = await db.bibleVerses
            .where('[versionId+book+chapter]')
            .equals([mainVersion, book, chapter])
            .and(v => v.verse >= start && v.verse <= end)
            .sortBy('verse');

        if (rangeVerses.length === 0) {
            showToast('No verses found in selection', 'error');
            return;
        }

        const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
        const decryptedVerses = await decryptVerses(rangeVerses);

        const combinedText = decryptedVerses.map(v => `<sup class="text-[10px] opacity-50 mr-1">${v.verse}</sup>${v.text}`).join(' ');
        const ref = `${book} ${chapter}:${start}${start !== end ? `-${end}` : ''} (${mainVersion.toUpperCase()})`;
        const id = `range-${book}-${chapter}-${start}-${end}-${mainVersion}`;

        pinItem({
            id,
            type: 'verse',
            title: ref,
            content: combinedText,
            reference: ref,
            metadata: {
                book,
                chapter: Number(chapter),
                verse: Number(start),
                verseEnd: end !== start ? Number(end) : undefined,
                versionId: mainVersion
            },
            sourceIds: rangeVerses.map(v => v.id)
        });

        showToast(`Pinned ${rangeVerses.length} verses!`, 'success');
        setSelectionRange(null);
    };

    const handleCopyCitation = async (style: 'standard' | 'sbl' | 'chicago' = 'standard') => {
        if (!selectionRange) return;
        const start = Math.min(selectionRange.start, selectionRange.end);
        const end = Math.max(selectionRange.start, selectionRange.end);

        const rangeVerses = await db.bibleVerses
            .where('[versionId+book+chapter]')
            .equals([mainVersion, book, chapter])
            .and(v => v.verse >= start && v.verse <= end)
            .sortBy('verse');

        if (rangeVerses.length === 0) return;

        const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
        const decryptedVerses = await decryptVerses(rangeVerses);
        const plainText = decryptedVerses.map(v => `${v.verse} ${v.text}`).join(' ');
        const refRange = `${book} ${chapter}:${start}${start !== end ? `–${end}` : ''}`;
        const verTag = mainVersion.toUpperCase();

        let formattedText = '';
        if (style === 'sbl') {
            formattedText = `"${plainText}" (${refRange} ${verTag}).`;
        } else if (style === 'chicago') {
            formattedText = `${refRange} (${verTag}): "${plainText}"`;
        } else {
            formattedText = `"${plainText}" — ${refRange} (${verTag})`;
        }

        await navigator.clipboard.writeText(formattedText);
        showToast(`Copied ${refRange} (${style.toUpperCase()}) to clipboard`, 'success');
        setSelectionRange(null);
    };

    const handleInsertIntoNote = async () => {
        if (!selectionRange) return;
        const { activeEditor } = useUIStore.getState();
        const start = Math.min(selectionRange.start, selectionRange.end);
        const end = Math.max(selectionRange.start, selectionRange.end);

        const rangeVerses = await db.bibleVerses
            .where('[versionId+book+chapter]')
            .equals([mainVersion, book, chapter])
            .and(v => v.verse >= start && v.verse <= end)
            .sortBy('verse');

        if (rangeVerses.length === 0) return;

        const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
        const decryptedVerses = await decryptVerses(rangeVerses);
        const quoteHtml = `<blockquote><p>${decryptedVerses.map(v => `<sup>${v.verse}</sup> ${v.text}`).join(' ')}</p><p>— <em>${book} ${chapter}:${start}${start !== end ? `–${end}` : ''} (${mainVersion.toUpperCase()})</em></p></blockquote>`;

        if (activeEditor) {
            activeEditor.commands.insertContent(quoteHtml);
            showToast('Inserted scripture into note!', 'success');
        } else {
            await navigator.clipboard.writeText(quoteHtml);
            showToast('Copied HTML quote to clipboard', 'info');
        }
        setSelectionRange(null);
    };

    if (installedVersions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-light-surface dark:bg-dark-surface p-8 text-center relative overflow-hidden">
                {/* Background Shimmer Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:to-transparent pointer-events-none" />

                <div className="max-w-md w-full space-y-6 relative z-10">
                    {/* Pulsing circular icon wrapper */}
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center bg-primary/10 rounded-full border border-primary/20 animate-pulse">
                        <BookOpen className="text-primary animate-bounce" size={40} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                            Preparing Your Study Space...
                        </h2>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                            Parchments is downloading and preparing the King James Version (KJV 1769) for offline, privacy-first study. This will take only a few moments.
                        </p>
                    </div>

                    {/* Progress details */}
                    <div className="bg-light-background/55 dark:bg-dark-background/40 backdrop-blur-md rounded-2xl p-6 border border-light-border dark:border-dark-border text-left space-y-4 shadow-xl">
                        <h3 className="text-xs font-black uppercase tracking-widest text-light-text-disabled">Ingestion Progress</h3>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                    Downloading KJV Scripture Database
                                </span>
                                <span className="text-[10px] font-black uppercase text-primary">In Progress</span>
                            </div>
                            <div className="w-full bg-light-border dark:bg-dark-border h-1.5 rounded-full overflow-hidden">
                                <div className="bg-primary h-full w-2/3 rounded-full animate-pulse" />
                            </div>

                            <div className="flex items-center justify-between text-xs text-light-text-disabled">
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-light-border dark:bg-dark-border" />
                                    Indexing 31,102 Verses for Deep Querying
                                </span>
                                <span className="text-[10px] uppercase font-bold">Waiting</span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-light-text-disabled">
                                <span className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-light-border dark:bg-dark-border" />
                                    Caching Hebrew & Greek Strong's Concordance
                                </span>
                                <span className="text-[10px] uppercase font-bold">Waiting</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            onClick={async () => {
                                showToast('Re-triggering Bible Ingestion...', 'info');
                                const { seedBibleData } = await import('@/lib/db/bibleSeed');
                                seedBibleData().catch(err => {
                                    console.error('Manual seed failed:', err);
                                    showToast('Ingestion failed. Please check network connection.', 'error');
                                });
                            }}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/45 transition-all text-sm shrink-0 active:scale-98"
                        >
                            Retry Ingestion
                        </button>
                        <span className="text-[10px] text-light-text-disabled uppercase font-black tracking-widest">
                            Privacy first • 100% Offline Studying
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface relative overflow-hidden">
            {/* Compact Nav Header — keeps long book/chapter names unobstructed; extra controls live in collapsible Tools bar */}
            <div className="border-b border-light-border dark:border-dark-border bg-light-background/30 dark:bg-dark-background/20 shrink-0">
                <div className="h-12 sm:h-13 flex items-center justify-between px-2.5 sm:px-3 gap-2">
                    {/* Left: Version + Book/Chapter (full width priority, never covered by icons) */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <select
                            value={mainVersion}
                            onChange={(e) => setMainVersion(e.target.value)}
                            aria-label="Bible translation"
                            className="bg-transparent border-none text-xs font-black uppercase tracking-tight focus:ring-0 cursor-pointer hover:text-primary transition-colors shrink-0 min-h-[34px] py-1 bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                        >
                            {installedVersions.map((v: BibleVersion) => (
                                <option
                                    key={v.id}
                                    value={v.id}
                                    className="bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                                >
                                    {v.abbreviation}
                                </option>
                            ))}
                        </select>

                        {parallelVersions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsToolsOpen(true)}
                                className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black shrink-0 hover:bg-primary/25 transition-colors"
                                title={`Parallel active (${parallelVersions.length + 1} columns) — click to manage`}
                            >
                                +{parallelVersions.length}
                            </button>
                        )}

                        <div className="w-[1px] h-3.5 bg-light-border dark:bg-dark-border shrink-0" />

                        <button
                            type="button"
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                            data-testid="bible-chapter-picker-btn"
                            title={`${book} ${chapter} — click to change book or chapter`}
                            className={`text-xs sm:text-[13px] font-black tracking-tight hover:text-primary transition-colors min-w-0 flex-1 max-w-full min-h-[34px] px-1.5 py-1 flex items-center gap-1 rounded-lg text-left ${isPickerOpen ? 'text-primary bg-primary/5' : 'text-light-text-primary dark:text-dark-text-primary'}`}
                        >
                            <span className="truncate">{book} {chapter}</span>
                            <span className="shrink-0 text-[10px] opacity-70">{isPickerOpen ? '▴' : '▾'}</span>
                        </button>
                    </div>

                    {/* Right: Essential Chapter Nav + Collapsible Tools Toggle */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleNavigation('prev')}
                            title="Previous Chapter"
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNavigation('next')}
                            title="Next Chapter"
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsToolsOpen(prev => !prev)}
                            data-testid="bible-reader-tools-toggle"
                            aria-expanded={isToolsOpen}
                            aria-label={isToolsOpen ? 'Hide Bible Tools' : 'Show Bible Tools'}
                            title={isToolsOpen ? 'Hide Bible Tools' : 'Show Bible Tools (Parallel, Search, Interlinear, Font Size)'}
                            className={`relative min-w-[34px] min-h-[34px] flex items-center justify-center rounded-full transition-colors ${
                                isToolsOpen
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'
                            }`}
                        >
                            <SlidersHorizontal size={15} />
                            {!isToolsOpen && (interlinearEnabled || parallelVersions.length > 0 || readingFlowMode === 'paragraph' || isSearchOpen) && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </button>
                        {isMobile && !isIndependent && (
                            <button
                                type="button"
                                onClick={closeRightSidebar}
                                title="Close Bible"
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-red-500/10 text-light-text-secondary hover:text-red-500 rounded-full transition-colors"
                            >
                                <CloseIcon size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Collapsible Secondary Tools Tray */}
                {isToolsOpen && (
                    <div
                        data-testid="bible-reader-tools-bar"
                        className="px-2.5 sm:px-3 py-2 border-t border-light-border/70 dark:border-dark-border/70 bg-light-surface/70 dark:bg-dark-surface/70 flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                        {/* Parallel Columns & Add Button */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {parallelVersions.map(vid => (
                                <div key={vid} className="flex items-center bg-primary/10 rounded-full pl-2 pr-1 py-0.5 shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-primary mr-1">
                                        {installedVersions.find(v => v.id === vid)?.abbreviation || vid.toUpperCase()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeParallelVersion(vid)}
                                        className="text-primary hover:text-primary/70 p-0.5"
                                        title={`Remove ${vid.toUpperCase()} parallel column`}
                                    >
                                        <CloseIcon size={11} />
                                    </button>
                                </div>
                            ))}

                            {activeVersions.length < 4 && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddParallelOpen(!isAddParallelOpen)}
                                    data-testid="bible-add-parallel-btn"
                                    className={`flex items-center gap-1 px-2 py-1 min-h-[30px] rounded-lg text-[10px] font-bold border transition-colors ${
                                        isAddParallelOpen
                                            ? 'bg-primary text-white border-primary'
                                            : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:border-primary/40 hover:text-primary'
                                    }`}
                                    title="Add Parallel Bible Version"
                                >
                                    <Plus size={13} />
                                    <span>Parallel</span>
                                </button>
                            )}

                            {/* Inline Bible Font Size Adjuster (A- / A+) */}
                            <div className="flex items-center rounded-lg border border-light-border dark:border-dark-border bg-light-background/70 dark:bg-dark-background/60 overflow-hidden">
                                <button
                                    type="button"
                                    data-testid="bible-font-decrease"
                                    onClick={() => setBibleFontSize((bibleFontSize || 16) - 1)}
                                    disabled={(bibleFontSize || 16) <= 12}
                                    className="px-2 py-1 min-h-[28px] text-[11px] font-black hover:bg-primary/10 hover:text-primary disabled:opacity-30 transition-colors"
                                    title="Decrease Bible text size"
                                >
                                    A-
                                </button>
                                <span
                                    data-testid="bible-font-size-label"
                                    className="px-1.5 text-[10px] font-mono font-bold text-light-text-secondary dark:text-dark-text-secondary select-none"
                                >
                                    {bibleFontSize || 16}px
                                </span>
                                <button
                                    type="button"
                                    data-testid="bible-font-increase"
                                    onClick={() => setBibleFontSize((bibleFontSize || 16) + 1)}
                                    disabled={(bibleFontSize || 16) >= 24}
                                    className="px-2 py-1 min-h-[28px] text-[11px] font-black hover:bg-primary/10 hover:text-primary disabled:opacity-30 transition-colors"
                                    title="Increase Bible text size"
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                        {/* Feature Action Icons */}
                        <div className="flex items-center gap-1 ml-auto">
                            {!hideSearchButton && (
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(!isSearchOpen)}
                                    data-testid="bible-reader-search-btn"
                                    className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg transition-colors ${isSearchOpen ? 'bg-primary text-white' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'}`}
                                    title={isSearchOpen ? 'Close Scripture Search' : "Search Scripture (Keywords, References, Strong's)"}
                                    aria-label="Search Scripture"
                                >
                                    <Search size={15} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={toggleInterlinear}
                                className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg transition-colors ${interlinearEnabled ? 'bg-primary/15 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'}`}
                                title="Toggle Greek/Hebrew Interlinear"
                            >
                                <Languages size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setReadingFlowMode(prev => prev === 'study' ? 'paragraph' : 'study')}
                                className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg transition-colors ${readingFlowMode === 'paragraph' ? 'bg-primary/15 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'}`}
                                title={readingFlowMode === 'paragraph' ? 'Switch to Verse Study Grid' : 'Switch to Continuous Paragraph Flow'}
                            >
                                <AlignLeft size={16} />
                            </button>
                            {!isIndependent && !isMobile && (
                                <button
                                    type="button"
                                    onClick={toggleRightSidebarFloating}
                                    className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg transition-colors ${isRightSidebarFloating ? 'bg-primary/15 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'}`}
                                    title={isRightSidebarFloating ? 'Dock Sidebar' : 'Undock Sidebar'}
                                >
                                    {isRightSidebarFloating ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                </button>
                            )}
                            {!isMobile && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        popoutService.open('bible');
                                        if (!isIndependent) closeRightSidebar();
                                    }}
                                    className="min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-light-text-secondary dark:text-dark-text-secondary hover:text-primary"
                                    title="Open in New Window"
                                >
                                    <ExternalLink size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Parallel Selector Popover */}
            {isAddParallelOpen && (
                <div className="absolute top-16 left-4 z-[100] bg-white dark:bg-dark-surface shadow-2xl rounded-2xl border border-light-border dark:border-dark-border p-2 min-w-[280px] max-h-80 overflow-y-auto custom-scrollbar">
                    <div className="p-2 text-[10px] font-black uppercase tracking-wider text-light-text-disabled border-b border-light-border dark:border-dark-border mb-1">
                        Add Parallel Translation
                    </div>
                    {installedVersions.filter(v => !activeVersions.includes(v.id)).map(v => {
                        const isHebrew = v.id === 'wlc' || v.language === 'hbo';
                        const isGreek = v.id === 'tr' || v.id === 'lxx' || v.language === 'grc';
                        const badgeLabel = isHebrew
                            ? 'עִבְרִית • OT'
                            : v.id === 'tr'
                                ? 'Ἑλληνικά • NT'
                                : v.id === 'lxx'
                                    ? 'Ἑλληνικά • LXX'
                                    : v.abbreviation;

                        return (
                            <button
                                key={v.id}
                                onClick={() => {
                                    addParallelVersion(v.id);
                                    setIsAddParallelOpen(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-primary/10 rounded-xl transition-all flex items-center justify-between gap-3 group"
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors truncate">
                                        {v.name}
                                    </span>
                                    {(isHebrew || isGreek) && (
                                        <span className="text-[10px] text-light-text-disabled truncate">
                                            {isHebrew
                                                ? 'Hebrew Old Testament (RTL)'
                                                : v.id === 'tr'
                                                    ? 'Greek New Testament'
                                                    : 'Brenton Greek Septuagint'}
                                        </span>
                                    )}
                                </div>
                                <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${isHebrew
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : isGreek
                                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                        : 'bg-light-background dark:bg-dark-background/60 text-light-text-secondary dark:text-dark-text-secondary'
                                    }`}>
                                    {badgeLabel}
                                </span>
                            </button>
                        );
                    })}
                    {installedVersions.length <= activeVersions.length && (
                        <div className="p-4 text-center">
                            <p className="text-xs text-light-text-disabled italic mb-2">No other bibles found.</p>
                            <button
                                onClick={() => showToast('Go to Settings to download more versions', 'info')}
                                className="text-[10px] font-black text-primary uppercase"
                            >
                                Download Bibles
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Picker Overlay */}
            {isPickerOpen && (
                <BookChapterPicker
                    currentBook={book}
                    currentChapter={chapter}
                    onSelect={handlePickerSelect}
                    onClose={() => setIsPickerOpen(false)}
                />
            )}

            {/* Reading Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className={`${activeVersions.length > 1 ? 'max-w-[1400px]' : 'max-w-4xl'} mx-auto ${isMobile ? 'p-5 pt-6' : 'p-5 sm:p-8'}`}>
                    <h1
                        data-testid="bible-chapter-heading"
                        style={{ fontSize: `${Math.round((bibleFontSize || 16) * 1.65)}px` }}
                        className="font-extrabold leading-tight mb-5 pb-3 border-b border-light-border/60 dark:border-dark-border/60 text-light-text-primary dark:text-dark-text-primary tracking-tight"
                    >
                        {book} <span className="text-primary">{chapter}</span>
                    </h1>

                    {/* Scripture Text — Paragraph Flow vs Verse Study Grid */}
                    {readingFlowMode === 'paragraph' ? (
                        <div
                            style={{ fontSize: `${bibleFontSize || 16}px`, lineHeight: 1.72 }}
                            className="font-serif text-light-text-primary dark:text-dark-text-primary py-3 select-text"
                        >
                            {sortedVerseNums.map((vNum) => {
                                const v = groupedVerses[vNum]?.[mainVersion];
                                if (!v) return null;
                                const isSelected = selectionRange && vNum >= Math.min(selectionRange.start, selectionRange.end) && vNum <= Math.max(selectionRange.start, selectionRange.end);
                                return (
                                    <span
                                        key={vNum}
                                        onClick={(e) => {
                                            if (e.shiftKey && selectionRange) {
                                                setSelectionRange({ ...selectionRange, end: vNum });
                                            } else {
                                                setSelectionRange({ start: vNum, end: vNum });
                                                const vId = `${v.book.toLowerCase()}-${v.chapter}-${v.verse}`;
                                                setSelectedVerseId(vId);
                                            }
                                        }}
                                        className={`inline cursor-pointer transition-colors hover:text-primary rounded px-0.5 ${isSelected ? 'bg-primary/20 text-primary font-medium' : ''}`}
                                    >
                                        <sup className="font-bold text-xs text-primary/90 dark:text-primary mr-1 select-none">{vNum}</sup>
                                        <span className="mr-1.5">{v.text}</span>
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {sortedVerseNums.length > 0 ? (
                                sortedVerseNums.map((vNum) => (
                                    <ParallelVerseRow
                                        key={vNum}
                                        verseNum={vNum}
                                        versions={activeVersions}
                                        versesByVersion={groupedVerses[vNum]}
                                    />
                                ))
                            ) : (
                                <div className="py-20 text-center space-y-4">
                                    <p className="text-light-text-disabled italic text-xl font-serif">Scripture text loading or not available.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chapter End Navigation */}
                    <div className="mt-20 py-10 border-t border-light-border dark:border-dark-border flex justify-between items-center">
                        <button
                            onClick={() => handleNavigation('prev')}
                            className="flex flex-col items-start gap-1 p-4 hover:bg-light-background dark:hover:bg-dark-background rounded-xl transition-all"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Previous</span>
                            <span className="font-bold flex items-center text-lg"><ChevronLeft /> Previous Chapter</span>
                        </button>
                        <button
                            onClick={() => handleNavigation('next')}
                            className="flex flex-col items-end gap-1 p-4 hover:bg-light-background dark:hover:bg-dark-background rounded-xl transition-all"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Next</span>
                            <span className="font-bold flex items-center text-lg">Next Chapter <ChevronRight /></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="h-10 border-t border-light-border dark:border-dark-border bg-light-background/20 dark:bg-dark-background/10 flex items-center justify-between px-6 shrink-0 text-[9px] font-black uppercase tracking-widest text-light-text-disabled select-none">
                <button onClick={() => handleNavigation('prev')} className="flex items-center hover:text-primary transition-colors hover:scale-105 transform"><ChevronLeft size={16} className="mr-1" /> Previous</button>
                <div className="flex gap-4">
                    {activeVersions.map(vid => (
                        <span key={vid}>
                            {installedVersions.find(v => v.id === vid)?.abbreviation || vid.toUpperCase()}
                        </span>
                    ))}
                </div>
                <button onClick={() => handleNavigation('next')} className="flex items-center hover:text-primary transition-colors hover:scale-105 transform">Next <ChevronRight size={16} className="ml-1" /></button>
            </div>

            {/* Floating Selection Bar */}
            <AnimatePresence>
                {selectionRange && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-16 left-1/2 -translate-x-1/2 z-[100] bg-dark-surface border border-white/10 shadow-2xl rounded-2xl p-2 px-3 sm:px-4 flex flex-wrap items-center gap-2 sm:gap-3 text-white max-w-[95vw]"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-slate-900 font-black">
                                <Pin size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {book} {chapter}:{Math.min(selectionRange.start, selectionRange.end)}{selectionRange.start !== selectionRange.end ? `–${Math.max(selectionRange.start, selectionRange.end)}` : ''}
                                </span>
                                <span className="text-[9px] text-neutral-400 font-medium">
                                    {selectionRange.start === selectionRange.end ? '1 verse' : `${Math.abs(selectionRange.end - selectionRange.start) + 1} verses`}
                                </span>
                            </div>
                        </div>

                        <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

                        {/* Pin Range */}
                        <button
                            onClick={handlePinSelection}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm"
                            title="Pin selected verses to Research Board"
                        >
                            Pin Range
                        </button>

                        {/* Copy Options */}
                        <div className="flex items-center bg-white/10 rounded-xl p-0.5 text-[10px] font-bold">
                            <button
                                onClick={() => handleCopyCitation('standard')}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1"
                                title="Copy citation: &quot;Verse Text&quot; — Ref (Version)"
                            >
                                <Copy size={11} /> Copy
                            </button>
                            <button
                                onClick={() => handleCopyCitation('sbl')}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-[9px] opacity-80 hover:opacity-100"
                                title="Copy in SBL Academic Style"
                            >
                                SBL
                            </button>
                            <button
                                onClick={() => handleCopyCitation('chicago')}
                                className="px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-[9px] opacity-80 hover:opacity-100"
                                title="Copy in Chicago Turabian Footnote Style"
                            >
                                Chicago
                            </button>
                        </div>

                        {/* Insert into Note */}
                        <button
                            onClick={handleInsertIntoNote}
                            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95"
                            title="Insert scripture blockquote directly into active note"
                        >
                            <Quote size={11} className="text-primary" />
                            <span className="text-[10px] font-bold">Quote</span>
                        </button>

                        {/* Optional TSK References */}
                        <button
                            onClick={() => {
                                const vId = selectedVerseId || `${book.toLowerCase()}-${chapter}-${selectionRange.start}`;
                                openCrossRefs(vId);
                            }}
                            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95"
                            title="Open TSK Cross-References in sidebar"
                        >
                            <GitBranch size={11} className="text-primary" />
                            <span className="text-[10px] font-bold">TSK</span>
                        </button>

                        <button
                            onClick={() => setSelectionRange(null)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors opacity-70 hover:opacity-100"
                            title="Clear Selection (Esc)"
                        >
                            <X size={15} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Overlay */}
            <AnimatePresence>
                {isSearchOpen && (
                    <BibleSearchOverlay
                        key="search-overlay"
                        onSelectVerse={(target) => {
                            setBook(target.book);
                            setChapter(target.chapter);
                            setTimeout(() => {
                                const el =
                                    contentRef.current?.querySelector(`#verse-${target.verse}`) ||
                                    document.getElementById(`verse-${target.verse}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 120);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
