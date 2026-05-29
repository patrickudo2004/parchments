import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReadingPlanStore, getDailySegments } from '@/stores/readingPlanStore';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BibleVerse, BibleVersion, ReadingPlanTrack } from '@/types/database';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import {
    BookOpen,
    Calendar,
    Plus,
    Trash2,
    Play,
    CheckCircle2,
    ArrowLeft,
    X,
    PlusCircle,
    RotateCcw,
    Pin,
    Layers,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    FolderOpen,
    Sun,
    Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LectioMode: React.FC = () => {
    const {
        activePlans,
        activePlanId,
        activeNoteId,
        isLectioModeActive,
        readerStyle,
        loadPlans,
        createPlan,
        startDailySession,
        pinVerseToActiveJournal,
        completeDailySession,
        recalculatePlanGrace,
        deletePlan,
        exitLectioMode,
        setReaderStyle
    } = useReadingPlanStore();

    const { setCurrentNote, hasStudyspace, openLocalFolder, isLocalMode, localFiles, openLocalFile } = useNoteStore();
    const { isMobile, showToast, theme, setTheme } = useUIStore();

    const handleToggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
    };

    // Local UI states
    const [isCreating, setIsCreating] = useState(false);
    const [planName, setPlanName] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [tracksInput, setTracksInput] = useState<Omit<ReadingPlanTrack, 'currentBook' | 'currentChapter'>[]>([
        { name: 'Old Testament', startBook: 'Genesis', chaptersPerDay: 3 },
        { name: 'New Testament', startBook: 'Matthew', chaptersPerDay: 1 }
    ]);

    // Header popovers
    const [showSettingsPopover, setShowSettingsPopover] = useState(false);

    // Active study session states
    const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
    const [versionId, setVersionId] = useState('kjv');
    const [verses, setVerses] = useState<BibleVerse[]>([]);
    const [isLoadingVerses, setIsLoadingVerses] = useState(false);
    const [selectedVerse, setSelectedVerse] = useState<{ text: string; ref: string } | null>(null);
    const [pipScripture, setPipScripture] = useState<{ book: string; chapter: number; verse: number; verseEnd?: number | null } | null>(null);

    // Mobile Swipe Navigation State
    const [activeMobileTab, setActiveMobileTab] = useState<'read' | 'journal'>('read');
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);

    // 1. Initial Data Loading
    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const activePlan = activePlans.find(p => p.id === activePlanId);

    // 2. Sync daily session Note into global NoteStore so RichTextEditor loads it
    useEffect(() => {
        if (isLectioModeActive && activeNoteId) {
            if (isLocalMode) {
                const localFileItem = localFiles.find(f => f.id === activeNoteId && f.kind === 'file');
                if (localFileItem) {
                    openLocalFile(localFileItem);
                } else {
                    console.log('[LectioMode] Active session note not found in localFiles yet:', activeNoteId);
                }
            } else {
                db.notes.get(activeNoteId).then(note => {
                    if (note) {
                        setCurrentNote(note);
                    }
                });
            }
        }
    }, [isLectioModeActive, activeNoteId, isLocalMode, localFiles, openLocalFile, setCurrentNote]);

    // 3. Load installed Bible versions
    const installedVersions = useLiveQuery(async () => {
        const all = await db.bibleVersions.toArray();
        return all.filter(v => v.isDownloaded);
    }) || [];

    useEffect(() => {
        if (installedVersions.length > 0 && !installedVersions.some(v => v.id === versionId)) {
            setVersionId(installedVersions[0].id);
        }
    }, [installedVersions, versionId]);

    // 4. Fetch Assigned Chapters for the Active Track
    const activeTrack = activePlan?.tracks[selectedTrackIndex];
    const dailySegments = useMemo(() => {
        return activeTrack ? getDailySegments(activeTrack) : [];
    }, [activeTrack]);

    // Flatten daily track segments into individual sequential pages for single-page reading
    const pages = useMemo(() => {
        const list: { book: string; chapter: number }[] = [];
        dailySegments.forEach(segment => {
            segment.chapters.forEach(ch => {
                list.push({ book: segment.book, chapter: ch });
            });
        });
        return list;
    }, [dailySegments]);

    const [activePageIndex, setActivePageIndex] = useState(0);

    // Reset local page cursor when swapping reading tracks
    useEffect(() => {
        setActivePageIndex(0);
        setSelectedVerse(null);
    }, [selectedTrackIndex]);

    // 5. Fetch scriptures based on Reading Flow (Seamless Scroll vs Paginated Page-by-Page)
    useEffect(() => {
        if (!isLectioModeActive || !activePlanId || !activeTrack || dailySegments.length === 0) {
            setVerses([]);
            return;
        }

        const fetchScriptures = async () => {
            setIsLoadingVerses(true);
            try {
                const allVerses: BibleVerse[] = [];
                
                if (readerStyle === 'page') {
                    const currentPage = pages[activePageIndex];
                    if (currentPage) {
                        const chapterVerses = await db.bibleVerses
                            .where('[versionId+book+chapter]')
                            .equals([versionId, currentPage.book, currentPage.chapter])
                            .sortBy('verse');
                        allVerses.push(...chapterVerses);
                    }
                } else {
                    // Classic Stacked Scroll Sequential View
                    for (const segment of dailySegments) {
                        for (const ch of segment.chapters) {
                            const chapterVerses = await db.bibleVerses
                                .where('[versionId+book+chapter]')
                                .equals([versionId, segment.book, ch])
                                .sortBy('verse');
                            allVerses.push(...chapterVerses);
                        }
                    }
                }
                setVerses(allVerses);
            } catch (err) {
                console.error('Failed to load Lectio scriptures:', err);
                showToast('Failed to load daily scriptures.', 'error');
            } finally {
                setIsLoadingVerses(false);
            }
        };

        fetchScriptures();
    }, [isLectioModeActive, activePlanId, selectedTrackIndex, versionId, activeTrack, readerStyle, activePageIndex, pages, dailySegments]);

    // Click interceptor inside editor for Scripture links or blockquotes to slide up PiP drawer
    const handleJournalPanelClick = async (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Check if a .scripture-ref link inside the text editor was clicked
        const scriptureSpan = target.closest('.scripture-ref');
        if (scriptureSpan) {
            const book = scriptureSpan.getAttribute('data-book');
            const chapter = Number(scriptureSpan.getAttribute('data-chapter'));
            const verse = Number(scriptureSpan.getAttribute('data-verse'));
            const verseEnd = Number(scriptureSpan.getAttribute('data-verse-end')) || null;

            if (book && chapter && verse) {
                e.preventDefault();
                e.stopPropagation();
                setPipScripture({ book, chapter, verse, verseEnd });
                return;
            }
        }

        // Also check if they clicked inside a blockquote
        const blockquote = target.closest('blockquote');
        if (blockquote) {
            const text = blockquote.textContent || '';
            const match = text.match(/([1-3]?\s?[A-Za-z]+)\s(\d+):(\d+)/);
            if (match) {
                e.preventDefault();
                e.stopPropagation();
                const book = match[1].trim();
                const chapter = Number(match[2]);
                const verse = Number(match[3]);
                setPipScripture({ book, chapter, verse, verseEnd: null });
            }
        }
    };

    // Mobile Edge Swiping Gesture Handler (Excludes tip-tap rich editor block)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        const target = e.target as HTMLElement;
        if (
            target.closest('.tiptap-editor') ||
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('blockquote')
        ) {
            return;
        }
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile) return;
        const target = e.target as HTMLElement;
        if (
            target.closest('.tiptap-editor') ||
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('blockquote')
        ) {
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX.current;
        const diffY = touchEndY - touchStartY.current;

        if (Math.abs(diffX) > 60 && Math.abs(diffY) < 30) {
            if (diffX > 0 && activeMobileTab === 'journal') {
                setActiveMobileTab('read');
            } else if (diffX < 0 && activeMobileTab === 'read') {
                setActiveMobileTab('journal');
            }
        }
    };

    // Preset Creators for faster onboarding
    const createPresetPlan = async (type: '24ch' | 'canonical') => {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();

        if (type === '24ch') {
            await createPlan('Lectio 24-Chapter Daily', startTimestamp, endTimestamp, [
                { name: 'Old Testament Reading', startBook: 'Genesis', chaptersPerDay: 10 },
                { name: 'New Testament Reading', startBook: 'Matthew', chaptersPerDay: 10 },
                { name: 'Psalms', startBook: 'Psalms', chaptersPerDay: 2 },
                { name: 'Proverbs', startBook: 'Proverbs', chaptersPerDay: 2 }
            ]);
            showToast('Lectio 24-Chapter Plan created!', 'success');
        } else {
            await createPlan('One-Year Canonical Plan', startTimestamp, endTimestamp, [
                { name: 'Old Testament', startBook: 'Genesis', chaptersPerDay: 3 },
                { name: 'New Testament', startBook: 'Matthew', chaptersPerDay: 1 }
            ]);
            showToast('One-Year Plan created!', 'success');
        }
        setIsCreating(false);
    };

    const handleCreateCustomPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planName.trim()) {
            showToast('Please enter a plan name.', 'error');
            return;
        }

        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();

        await createPlan(planName, startTimestamp, endTimestamp, tracksInput);
        showToast(`Plan "${planName}" created successfully!`, 'success');
        setIsCreating(false);
        setPlanName('');
    };

    // Render nothing if Lectio mode is entirely inactive in the Zustand store
    if (!isLectioModeActive) return null;

    // Enforce local library studyspace is unlocked first
    if (isLocalMode && !hasStudyspace) {
        return (
            <div className="fixed inset-0 z-[80] bg-light-background dark:bg-dark-background overflow-y-auto custom-scrollbar p-6 flex flex-col items-center justify-center select-none text-center animate-in fade-in zoom-in duration-300">
                <div className="max-w-md w-full p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-2xl animate-pulse" />
                    
                    {/* Header Exit Button */}
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={() => exitLectioMode()}
                            className="p-1.5 rounded-full hover:bg-light-sidebar dark:hover:bg-dark-elevated text-light-text-secondary dark:text-dark-text-secondary transition-all"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="w-16 h-16 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-6">
                        <FolderOpen className="text-primary animate-bounce" size={30} />
                    </div>

                    <h2 className="text-2xl font-black mb-3 text-light-text-primary dark:text-dark-text-primary">Unlock your Study Plans</h2>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-8 leading-relaxed">
                        To create or start your study plans in **Lectio Mode**, please select a folder on your computer. Your notes will be saved as physical files in your workspace.
                    </p>

                    <button
                        onClick={openLocalFolder}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-98"
                    >
                        <FolderOpen size={20} />
                        <span>Open Local Folder</span>
                    </button>
                </div>
            </div>
        );
    }

    // RENDER CASE 1: Immersive Daily Study Zen Workspace
    if (activePlan) {
        return (
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="fixed inset-0 z-[80] bg-light-background dark:bg-dark-background flex flex-col overflow-hidden text-light-text-primary dark:text-dark-text-primary"
            >
                {/* Immersive Session Header */}
                <header className="h-14 border-b border-light-border dark:border-dark-border px-4 flex items-center justify-between bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md shrink-0 z-[90] relative">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => exitLectioMode()}
                            className="p-2 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"
                            title="Exit Study Session"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 className="text-sm font-black tracking-tight uppercase text-primary">Lectio Mode</h2>
                            <p className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary truncate max-w-[200px] sm:max-w-none">
                                {activePlan.name}
                            </p>
                        </div>
                    </div>

                    {/* Header Toolbar: Version Picker, Settings Popover Toggle, Complete Button */}
                    <div className="flex items-center gap-2 relative">
                        <select
                            value={versionId}
                            onChange={(e) => setVersionId(e.target.value)}
                            className="bg-transparent border-none text-[10px] font-black uppercase tracking-wider focus:ring-0 cursor-pointer text-primary bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
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

                        {/* Theme Toggle Button */}
                        <button
                            onClick={handleToggleTheme}
                            className="p-2 rounded-full transition-all duration-200 hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary"
                            title="Toggle Light/Dark Theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Real-time E-Reader Settings Gear */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                                className={`p-2 rounded-full transition-all duration-200 hover:bg-light-background dark:hover:bg-dark-background ${showSettingsPopover ? 'text-primary bg-primary/10' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                                title="Scripture Layout Style"
                            >
                                <Settings size={18} />
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {showSettingsPopover && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setShowSettingsPopover(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-2xl p-4 z-30 space-y-3"
                                        >
                                            <div className="border-b border-light-border dark:border-dark-border pb-1.5">
                                                <p className="text-[9px] font-black uppercase tracking-wider text-light-text-disabled">Scripture Layout</p>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setReaderStyle('scroll');
                                                        setShowSettingsPopover(false);
                                                        showToast('Switched to Zen Scrolling layout', 'info');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-transparent ${readerStyle === 'scroll' ? 'bg-primary/15 text-primary border-primary/20' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary'}`}
                                                >
                                                    <span className="text-base">📜</span>
                                                    <span>Zen Scroll</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReaderStyle('page');
                                                        setShowSettingsPopover(false);
                                                        showToast('Switched to Page-by-Page layout', 'info');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-transparent ${readerStyle === 'page' ? 'bg-primary/15 text-primary border-primary/20' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary'}`}
                                                >
                                                    <span className="text-base">📖</span>
                                                    <span>Page-by-Page</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={() => {
                                if (window.confirm('Mark today\'s reading segments as complete and advance?')) {
                                    completeDailySession();
                                    showToast('Scribe session completed! Advanced chapter tracks.', 'success');
                                }
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-primary-hover shadow-md active:scale-95 transition-all"
                        >
                            <CheckCircle2 size={12} />
                            <span>Complete Day</span>
                        </button>
                    </div>
                </header>

                {/* Track Selector Bar */}
                <div className="bg-light-sidebar/55 dark:bg-dark-sidebar/45 border-b border-light-border dark:border-dark-border py-2 px-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {activePlan.tracks.map((track, idx) => {
                        const segments = getDailySegments(track);
                        const labelString = segments
                            .map(s => `${s.book} ${s.chapters[0]}${s.chapters.length > 1 ? `-${s.chapters[s.chapters.length - 1]}` : ''}`)
                            .join(', ');

                        return (
                            <button
                                key={track.name}
                                onClick={() => {
                                    setSelectedTrackIndex(idx);
                                }}
                                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border transition-all shrink-0 active:scale-98 ${selectedTrackIndex === idx
                                    ? 'bg-primary/20 border-primary text-primary shadow-sm'
                                    : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                                    }`}
                            >
                                {track.name}: <span className="font-bold text-[10px] opacity-75">{labelString}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Mobile Traditional Tap-to-Switch Header (Only visible on mobile) */}
                {isMobile && (
                    <div className="grid grid-cols-2 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border shrink-0">
                        <button
                            onClick={() => setActiveMobileTab('read')}
                            className={`py-2 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeMobileTab === 'read'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary opacity-60'
                                }`}
                        >
                            📖 Read Scripture
                        </button>
                        <button
                            onClick={() => setActiveMobileTab('journal')}
                            className={`py-2 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeMobileTab === 'journal'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary opacity-60'
                                }`}
                        >
                            ✏️ Study Journal
                        </button>
                    </div>
                )}

                {/* Dual Split Content Workspace */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* LEFT PANEL: Clean Scripture Reader */}
                    <div
                        className={`flex-1 h-full flex flex-col bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border overflow-hidden relative ${isMobile && activeMobileTab !== 'read' ? 'hidden' : 'block'
                            }`}
                    >
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar flex flex-col">
                            <div className="flex-1 select-text">
                                {isLoadingVerses ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                            <p className="text-xs uppercase font-black tracking-widest text-light-text-disabled">Loading Scripture Context...</p>
                                        </div>
                                    </div>
                                ) : verses.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                                        <HelpCircle className="text-light-text-disabled" size={40} />
                                        <p className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase">No scripture loaded</p>
                                        <p className="text-xs text-light-text-disabled leading-relaxed max-w-sm">Please make sure the selected Bible version ({versionId.toUpperCase()}) is fully downloaded for offline study.</p>
                                    </div>
                                ) : (
                                    <div className="max-w-2xl mx-auto space-y-8">
                                        {readerStyle === 'page' ? (
                                            /* VIEW A: Paginated Single-Chapter Paging View */
                                            pages[activePageIndex] && (
                                                <div className="space-y-4">
                                                    <h3 className="text-xl md:text-2xl font-serif font-bold text-primary border-b border-light-border dark:border-dark-border pb-1">
                                                        {pages[activePageIndex].book} Chapter {pages[activePageIndex].chapter}
                                                    </h3>
                                                    <div className="font-serif text-base md:text-lg leading-relaxed text-justify space-y-2">
                                                        {verses.map(v => (
                                                            <span
                                                                key={v.id}
                                                                onClick={() => setSelectedVerse({
                                                                    text: v.text,
                                                                    ref: `${v.book} ${v.chapter}:${v.verse} (${versionId.toUpperCase()})`
                                                                })}
                                                                className={`inline mr-2 cursor-pointer transition-all duration-150 rounded px-0.5 ${selectedVerse?.ref.startsWith(`${v.book} ${v.chapter}:${v.verse}`)
                                                                    ? 'bg-primary/30 text-light-text-primary dark:text-dark-text-primary outline-none ring-2 ring-primary/45'
                                                                    : 'hover:bg-primary/10'
                                                                    }`}
                                                            >
                                                                <sup className="text-[10px] font-sans font-bold opacity-50 mr-0.5 select-none">{v.verse}</sup>
                                                                {v.text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            /* VIEW B: Stacking Scroll Sequential View */
                                            dailySegments.map(segment => (
                                                <div key={segment.book} className="space-y-6">
                                                    {segment.chapters.map(ch => {
                                                        const chapterVerses = verses.filter(v => v.book === segment.book && v.chapter === ch);
                                                        return (
                                                            <div key={`${segment.book}-${ch}`} className="space-y-4">
                                                                <h3 className="text-xl md:text-2xl font-serif font-bold text-primary border-b border-light-border dark:border-dark-border pb-1">
                                                                    {segment.book} Chapter {ch}
                                                                </h3>
                                                                <div className="font-serif text-base md:text-lg leading-relaxed text-justify space-y-2">
                                                                    {chapterVerses.map(v => (
                                                                        <span
                                                                            key={v.id}
                                                                            onClick={() => setSelectedVerse({
                                                                                text: v.text,
                                                                                ref: `${v.book} ${v.chapter}:${v.verse} (${versionId.toUpperCase()})`
                                                                            })}
                                                                            className={`inline mr-2 cursor-pointer transition-all duration-150 rounded px-0.5 ${selectedVerse?.ref.startsWith(`${v.book} ${v.chapter}:${v.verse}`)
                                                                                ? 'bg-primary/30 text-light-text-primary dark:text-dark-text-primary outline-none ring-2 ring-primary/45'
                                                                                : 'hover:bg-primary/10'
                                                                                }`}
                                                                        >
                                                                            <sup className="text-[10px] font-sans font-bold opacity-50 mr-0.5 select-none">{v.verse}</sup>
                                                                            {v.text}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Page-by-Page Floating Pager Bar (Only visible in single-page mode) */}
                            {readerStyle === 'page' && pages.length > 1 && (
                                <div className="border-t border-light-border dark:border-dark-border mt-8 pt-4 flex items-center justify-between shrink-0 max-w-2xl w-full mx-auto">
                                    <button
                                        disabled={activePageIndex === 0}
                                        onClick={() => {
                                            setActivePageIndex(prev => Math.max(0, prev - 1));
                                            setSelectedVerse(null);
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 border border-light-border dark:border-dark-border text-xs font-black uppercase tracking-wider rounded-xl transition-all hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 text-light-text-secondary dark:text-dark-text-secondary"
                                    >
                                        <ChevronLeft size={16} />
                                        <span>Previous</span>
                                    </button>

                                    <span className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled select-none">
                                        Chapter {activePageIndex + 1} of {pages.length}
                                    </span>

                                    <button
                                        disabled={activePageIndex === pages.length - 1}
                                        onClick={() => {
                                            setActivePageIndex(prev => Math.min(pages.length - 1, prev + 1));
                                            setSelectedVerse(null);
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 border border-light-border dark:border-dark-border text-xs font-black uppercase tracking-wider rounded-xl transition-all hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-40 disabled:hover:bg-transparent active:scale-95 text-light-text-secondary dark:text-dark-text-secondary"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Tap Selection Bottom Overlay Panel */}
                        <AnimatePresence>
                            {selectedVerse && (
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                    className="absolute bottom-4 left-4 right-4 bg-light-background/95 dark:bg-dark-surface/95 border border-light-border dark:border-dark-border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 z-30"
                                >
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-[10px] font-black uppercase text-primary tracking-wider">{selectedVerse.ref}</p>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate mt-0.5 italic">"{selectedVerse.text}"</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={async () => {
                                                await pinVerseToActiveJournal(selectedVerse.text, selectedVerse.ref);
                                                setSelectedVerse(null);
                                                showToast('Pinned quote to daily study note!', 'success');
                                            }}
                                            className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95"
                                        >
                                            <Pin size={10} />
                                            <span>Pin</span>
                                        </button>
                                        <button
                                            onClick={() => setSelectedVerse(null)}
                                            className="px-3 py-2 bg-light-sidebar dark:bg-dark-sidebar text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-border dark:hover:bg-dark-border text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT PANEL: Daily Summary Journal Editor */}
                    <div
                        onClick={handleJournalPanelClick}
                        className={`flex-1 h-full flex flex-col bg-white dark:bg-dark-surface overflow-hidden relative ${isMobile && activeMobileTab !== 'journal' ? 'hidden' : 'block'
                            }`}
                    >
                        {activeNoteId ? (
                            <div className="flex-1 h-full flex flex-col overflow-hidden relative">
                                <RichTextEditor activeRoom={null} identity={null} shouldSync={false} />
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center p-8 text-center text-light-text-disabled">
                                <div className="space-y-2">
                                    <FileText className="mx-auto" size={32} />
                                    <p className="text-xs uppercase font-black tracking-widest">Awaiting session note...</p>
                                </div>
                            </div>
                        )}

                        {/* Interactive PiP Verse context drawer */}
                        <AnimatePresence>
                            {pipScripture && (
                                <PipContextDrawer
                                    scripture={pipScripture}
                                    versionId={versionId}
                                    onClose={() => setPipScripture(null)}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    // RENDER CASE 2: Lectio Study Center Dashboard
    return (
        <div className="fixed inset-0 z-[80] bg-light-background dark:bg-dark-background overflow-y-auto custom-scrollbar p-6 flex flex-col select-none">
            {/* Top Close Bar */}
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between shrink-0 mb-4">
                {/* Theme Toggle Button */}
                <button
                    onClick={handleToggleTheme}
                    className="p-2.5 rounded-full bg-light-surface hover:bg-light-sidebar dark:bg-dark-surface dark:hover:bg-dark-elevated border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary shadow-sm hover:scale-105 active:scale-95 transition-all"
                    title="Toggle Light/Dark Theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button
                    onClick={() => exitLectioMode()}
                    className="p-2.5 rounded-full bg-light-surface hover:bg-light-sidebar dark:bg-dark-surface dark:hover:bg-dark-elevated border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary shadow-sm hover:scale-105 active:scale-95 transition-all"
                    title="Close Lectio Center"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Dashboard Workspace */}
            <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col space-y-8 pb-12">
                {/* Branded Title */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                        <BookOpen className="text-primary" size={30} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                        Lectio Study Center
                    </h1>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-md mx-auto leading-relaxed">
                        Create and manage date-driven Scripture plans with isolation from standard workspaces. Privacy-first & 100% offline.
                    </p>
                </div>

                {isCreating ? (
                    /* CREATE PLAN WORKFLOW */
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-xl space-y-6"
                    >
                        <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-3">
                            <h3 className="text-base font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <PlusCircle size={18} />
                                <span>Create Scripture Plan</span>
                            </h3>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="text-xs font-bold uppercase tracking-wider text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary"
                            >
                                Back
                            </button>
                        </div>

                        {/* Form Presets */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => createPresetPlan('24ch')}
                                className="bg-light-background dark:bg-dark-background/60 border border-light-border dark:border-dark-border hover:border-primary/50 rounded-xl p-4 cursor-pointer text-left transition-all hover:shadow-md"
                            >
                                <h4 className="text-xs font-black uppercase text-primary mb-1">📖 The Lectio 24-Chapter Devotional</h4>
                                <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                    Our optimized deep-study preset: read 10 chapters Old Testament, 10 chapters New Testament, 2 Psalms, and 2 Proverbs daily.
                                </p>
                            </div>
                            <div
                                onClick={() => createPresetPlan('canonical')}
                                className="bg-light-background dark:bg-dark-background/60 border border-light-border dark:border-dark-border hover:border-primary/50 rounded-xl p-4 cursor-pointer text-left transition-all hover:shadow-md"
                            >
                                <h4 className="text-xs font-black uppercase text-primary mb-1">📅 Classical One-Year Canonical</h4>
                                <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                    The standard daily devotional route: read 3 chapters Old Testament and 1 chapter New Testament daily to complete in a year.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-[1px] bg-light-border dark:bg-dark-border" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-light-text-disabled">Or Build Custom Plan</span>
                            <div className="flex-1 h-[1px] bg-light-border dark:bg-dark-border" />
                        </div>

                        {/* Custom Form */}
                        <form onSubmit={handleCreateCustomPlan} className="space-y-4 text-left">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    value={planName}
                                    onChange={(e) => setPlanName(e.target.value)}
                                    placeholder="e.g. Forgiveness Study, Whole Bible, Grace plan..."
                                    className="input py-2.5 rounded-xl text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="input py-2.5 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="input py-2.5 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Tracks List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Scripture Chapter Tracks</label>
                                    <button
                                        type="button"
                                        onClick={() => setTracksInput([
                                            ...tracksInput,
                                            { name: 'Custom Track', startBook: 'Genesis', chaptersPerDay: 1 }
                                        ])}
                                        className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                                    >
                                        <Plus size={12} />
                                        <span>Add Track</span>
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {tracksInput.map((track, idx) => (
                                        <div key={idx} className="bg-light-background dark:bg-dark-background/60 p-3 rounded-xl border border-light-border dark:border-dark-border flex flex-col md:flex-row gap-3">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    required
                                                    value={track.name}
                                                    onChange={(e) => {
                                                        const copy = [...tracksInput];
                                                        copy[idx].name = e.target.value;
                                                        setTracksInput(copy);
                                                    }}
                                                    placeholder="Track Name"
                                                    className="w-full bg-transparent border-b border-light-border dark:border-dark-border text-xs font-bold py-1 focus:outline-none focus:border-primary"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={track.startBook}
                                                    onChange={(e) => {
                                                        const copy = [...tracksInput];
                                                        copy[idx].startBook = e.target.value;
                                                        setTracksInput(copy);
                                                    }}
                                                    className="bg-transparent border-b border-light-border dark:border-dark-border text-xs py-1 focus:outline-none focus:border-primary cursor-pointer font-semibold bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                                                >
                                                    {BIBLE_BOOKS.map(b => (
                                                        <option 
                                                            key={b.name} 
                                                            value={b.name}
                                                            className="bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                                                        >
                                                            {b.name}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <input
                                                        type="number"
                                                        required
                                                        min={1}
                                                        max={150}
                                                        value={track.chaptersPerDay}
                                                        onChange={(e) => {
                                                            const copy = [...tracksInput];
                                                            copy[idx].chaptersPerDay = Math.max(1, Number(e.target.value));
                                                            setTracksInput(copy);
                                                        }}
                                                        className="w-12 bg-transparent border-b border-light-border dark:border-dark-border text-xs text-center py-1 focus:outline-none focus:border-primary font-bold"
                                                    />
                                                    <span className="text-[10px] text-light-text-disabled font-medium uppercase">ch/day</span>
                                                </div>

                                                {tracksInput.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTracksInput(tracksInput.filter((_, i) => i !== idx))}
                                                        className="p-1 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                                                        title="Delete Track"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/25 active:scale-98 transition-all shrink-0"
                            >
                                Build Plan
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    /* PLANS LISTING & METRICS VIEW */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-light-text-disabled tracking-widest flex items-center gap-2">
                                <Layers size={14} strokeWidth={2.5} />
                                <span>Active Scripture Plans</span>
                            </h3>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-xl border border-primary/10 hover:bg-primary/20 transition-all"
                            >
                                <Plus size={14} />
                                <span>Add New Plan</span>
                            </button>
                        </div>

                        {activePlans.length === 0 ? (
                            <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-12 text-center space-y-4 shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-light-background dark:bg-dark-background/60 flex items-center justify-center mx-auto text-light-text-disabled border border-light-border dark:border-dark-border">
                                    <BookOpen size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase">No Active Plans Found</h4>
                                    <p className="text-xs text-light-text-disabled leading-relaxed max-w-xs mx-auto">Create a customized, offline Scripture reading plan to jumpstart your Lectio Study journey.</p>
                                </div>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="px-6 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-primary-hover transition-all active:scale-95"
                                >
                                    + Start Lectio Plan
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {activePlans.map(plan => {
                                    const startStr = new Date(plan.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                    const endStr = new Date(plan.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

                                    return (
                                        <div
                                            key={plan.id}
                                            className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-primary/20 rounded-2xl p-5 text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                                        >
                                            {/* Left Card info */}
                                            <div className="flex-1 space-y-3 min-w-0">
                                                <div className="space-y-1">
                                                    <h4 className="font-serif font-bold text-lg md:text-xl text-light-text-primary dark:text-dark-text-primary tracking-tight">
                                                        {plan.name}
                                                    </h4>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-disabled flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        <span>{startStr} — {endStr}</span>
                                                    </p>
                                                </div>

                                                {/* Active track states */}
                                                <div className="flex flex-wrap gap-2">
                                                    {plan.tracks.map(track => (
                                                        <div key={track.name} className="px-2.5 py-1 bg-light-background dark:bg-dark-background/60 rounded-lg border border-light-border/70 dark:border-dark-border/75 text-[10px] font-semibold text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5 shadow-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            <span>{track.name}: <b>{track.currentBook} {track.currentChapter}</b> ({track.chaptersPerDay} ch/d)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Card actions */}
                                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                                                <button
                                                    onClick={() => startDailySession(plan.id)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 hover:scale-103 active:scale-97 transition-all"
                                                >
                                                    <Play size={12} fill="white" />
                                                    <span>Study Session</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Grace recalculation redistributes unread chapters evenly across remaining days. Would you like to proceed?')) {
                                                            recalculatePlanGrace(plan.id);
                                                            showToast('Recalculated track metrics! Enjoy the Grace catch-up!', 'success');
                                                        }
                                                    }}
                                                    className="p-2.5 rounded-xl border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-colors group/btn relative"
                                                    title="Catch-Up Recalculation (Grace)"
                                                >
                                                    <RotateCcw size={16} />
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                                                        Grace Catch-up
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Are you absolutely sure you want to delete "${plan.name}"? This will wipe all track completions and histories.`)) {
                                                            deletePlan(plan.id);
                                                            showToast('Plan deleted.', 'info');
                                                        }
                                                    }}
                                                    className="p-2.5 rounded-xl border border-red-500/10 hover:bg-red-500/10 text-red-500 transition-colors"
                                                    title="Delete Plan"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Picture-in-Picture Drawer showing scripture context inside daily study notes
interface PipContextDrawerProps {
    scripture: { book: string; chapter: number; verse: number; verseEnd?: number | null };
    versionId: string;
    onClose: () => void;
}

const PipContextDrawer: React.FC<PipContextDrawerProps> = ({ scripture, versionId, onClose }) => {
    const [verses, setVerses] = useState<BibleVerse[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!scripture) return;

        const loadChapter = async () => {
            setIsLoading(true);
            try {
                // Query entire chapter to provide true context
                const res = await db.bibleVerses
                    .where('[versionId+book+chapter]')
                    .equals([versionId, scripture.book, scripture.chapter])
                    .sortBy('verse');
                setVerses(res);

                // Auto Scroll to selected verse inside PiP drawer
                setTimeout(() => {
                    const el = document.getElementById(`pip-verse-${scripture.verse}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            } catch (err) {
                console.error('Failed to load PiP context:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadChapter();
    }, [scripture, versionId]);

    return (
        <div className="absolute inset-x-0 bottom-0 bg-light-background/95 dark:bg-dark-surface/95 border-t border-light-border dark:border-dark-border backdrop-blur-md shadow-2xl p-4 z-40 max-h-[40vh] flex flex-col rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-2 mb-3 shrink-0">
                <span className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen size={14} />
                    <span>PiP Reader: {scripture.book} {scripture.chapter} ({versionId.toUpperCase()})</span>
                </span>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded text-light-text-secondary dark:text-dark-text-secondary transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar text-sm leading-relaxed text-light-text-primary dark:text-dark-text-primary select-text font-serif text-justify">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : verses.length === 0 ? (
                    <p className="text-xs italic text-light-text-disabled text-center py-4">No verses found.</p>
                ) : (
                    <div className="space-y-1">
                        {verses.map(v => {
                            const isMatched = v.verse === scripture.verse || (scripture.verseEnd && v.verse >= scripture.verse && v.verse <= scripture.verseEnd);
                            return (
                                <span
                                    key={v.id}
                                    id={`pip-verse-${v.verse}`}
                                    className={`inline mr-2 transition-all p-0.5 rounded ${isMatched
                                        ? 'bg-primary/20 text-light-text-primary dark:text-dark-text-primary font-bold border border-primary/30'
                                        : 'opacity-70'
                                        }`}
                                >
                                    <sup className="text-[9px] font-sans font-bold opacity-50 mr-0.5 select-none">{v.verse}</sup>
                                    {v.text}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
