import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReadingPlanStore, getDailySegments } from '@/stores/readingPlanStore';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/lib/db';
import { useSyncStore } from '@/stores/syncStore';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BibleVerse, BibleVersion, ReadingPlanTrack } from '@/types/database';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { downloadPlanIcs } from '@/lib/bible/icsExportService';
import { LectioStudyPopover } from '@/components/bible/LectioStudyPopover';
import { LECTIO_PRESETS, parsePastedCuratedText, type LectioPreset } from '@/lib/bible/lectioPresets';
import { QRCodeSVG } from 'qrcode.react';
import { exportPlanToJsonFile, importPlanFromJson, calculatePlanMetrics } from '@/lib/bible/planHistoryService';
import { PlanHistoryModal } from '@/components/bible/PlanHistoryModal';
import {
    BookOpen,
    Calendar,
    Plus,
    Trash2,
    Play,
    Pause,
    Timer,
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
    Moon,
    Share2,
    Copy,
    Check,
    Users,
    Lock,
    Maximize2,
    Minimize2,
    CheckSquare,
    Square,
    Sparkles,
    Flame,
    Download,
    Upload,
    QrCode
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
        createCuratedPlan,
        startDailySession,
        pinVerseToActiveJournal,
        completeDailySession,
        toggleChapterCompletion,
        updateReadingDuration,
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

    // Workspace Split & Focus states
    const [zenFocus, setZenFocus] = useState(false);
    const [splitRatio, setSplitRatio] = useState(50);

    // Devotional Timer states
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Subtle Inline Study Popover state
    const [studyPopoverData, setStudyPopoverData] = useState<{
        verse: { book: string; chapter: number; verse: number; text: string };
        strongsId?: string | null;
        wordText?: string | null;
    } | null>(null);

    // Plan Creation Modal states
    const [isCreating, setIsCreating] = useState(false);
    const [creationTab, setCreationTab] = useState<'preset' | 'custom' | 'smart_paste'>('preset');
    const [templateChoice, setTemplateChoice] = useState<'lectio_divina' | 'freeform'>('lectio_divina');
    const [pastedScheduleText, setPastedScheduleText] = useState('');
    const [planName, setPlanName] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [tracksInput, setTracksInput] = useState<Omit<ReadingPlanTrack, 'currentBook' | 'currentChapter'>[]>([
        { name: 'Old Testament', startBook: 'Genesis', endBook: 'Malachi', chaptersPerDay: 3 },
        { name: 'New Testament', startBook: 'Matthew', endBook: 'Revelation', chaptersPerDay: 1 }
    ]);

    // Header popovers
    const [showSettingsPopover, setShowSettingsPopover] = useState(false);

    const [sharingPlan, setSharingPlan] = useState<any | null>(null);
    const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);

    const [historyModalPlan, setHistoryModalPlan] = useState<any | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const allHistory = useLiveQuery(async () => {
        return await db.readingPlanHistory.toArray();
    }) || [];

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
    const touchStartTime = useRef<number>(0);

    // 1. Initial Data Loading
    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const activePlan = activePlans.find(p => p.id === activePlanId);

    // Timer Interval Effect
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning]);

    // Today's History & Granular Checkoffs query
    const dateKey = new Date().toISOString().split('T')[0];
    const todayHistoryId = activePlanId ? `${activePlanId}-${dateKey}` : null;
    const todayHistory = useLiveQuery(async () => {
        if (!todayHistoryId) return null;
        return await db.readingPlanHistory.get(todayHistoryId);
    }, [todayHistoryId]);
    const completedItems = todayHistory?.completedItems || [];

    // Curated plan determination
    const isCuratedPlan = activePlan?.type === 'curated' || activePlan?.type === 'topical' || activePlan?.type === 'word_study' || activePlan?.type === 'chronological';
    const completedHistoryCount = useLiveQuery(async () => {
        if (!activePlanId) return 0;
        return await db.readingPlanHistory.where('planId').equals(activePlanId).filter(h => h.completedAt > 0).count();
    }, [activePlanId]) || 0;

    const activeCuratedDay = useMemo(() => {
        if (!activePlan?.curatedSchedule || activePlan.curatedSchedule.length === 0) return null;
        return activePlan.curatedSchedule[completedHistoryCount] || activePlan.curatedSchedule[0];
    }, [activePlan?.curatedSchedule, completedHistoryCount]);

    const isPlanShared = useMemo(() => {
        return !!activePlanId && !!localStorage.getItem(`plan-salt-${activePlanId}`);
    }, [activePlanId]);

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

    // 4. Fetch Assigned Chapters for the Active Track (for sequential plans)
    const activeTrack = activePlan?.tracks[selectedTrackIndex];
    const dailySegments = useMemo(() => {
        return activeTrack ? getDailySegments(activeTrack) : [];
    }, [
        activeTrack?.currentBook,
        activeTrack?.currentChapter,
        activeTrack?.chaptersPerDay,
        activeTrack?.startBook,
        activeTrack?.endBook
    ]);

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
        if (!isLectioModeActive || !activePlanId || !activePlan) {
            setVerses([]);
            return;
        }

        const fetchScriptures = async () => {
            setIsLoadingVerses(true);
            try {
                const allVerses: BibleVerse[] = [];
                
                if (isCuratedPlan && activeCuratedDay) {
                    // Fetch curated day's explicit passages (with verseStart & verseEnd support!)
                    for (const p of activeCuratedDay.passages) {
                        const chapterVerses = await db.bibleVerses
                            .where('[versionId+book+chapter]')
                            .equals([versionId, p.book, p.chapter])
                            .sortBy('verse');
                        const filtered = p.verseStart != null
                            ? chapterVerses.filter(v => v.verse >= p.verseStart! && (p.verseEnd == null || v.verse <= p.verseEnd!))
                            : chapterVerses;
                        allVerses.push(...filtered);
                    }
                } else if (activeTrack && dailySegments.length > 0) {
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
                }

                const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
                const decryptedAll = await decryptVerses(allVerses);
                setVerses(decryptedAll);
            } catch (err) {
                console.error('Failed to load Lectio scriptures:', err);
                showToast('Failed to load daily scriptures.', 'error');
            } finally {
                setIsLoadingVerses(false);
            }
        };

        fetchScriptures();
    }, [
        isLectioModeActive,
        activePlanId,
        activePlan,
        isCuratedPlan,
        activeCuratedDay,
        selectedTrackIndex,
        versionId,
        readerStyle,
        activePageIndex,
        activeTrack?.currentBook,
        activeTrack?.currentChapter,
        activeTrack?.chaptersPerDay,
        activeTrack?.startBook,
        activeTrack?.endBook,
        pages,
        dailySegments
    ]);

    // Granular chapter checklist items for today's session
    const currentChecklistItems = useMemo(() => {
        if (isCuratedPlan && activeCuratedDay) {
            return activeCuratedDay.passages.map(p => {
                const range = p.verseStart ? `:${p.verseStart}${p.verseEnd ? `-${p.verseEnd}` : ''}` : '';
                return `${p.book} ${p.chapter}${range}`;
            });
        }
        const list: string[] = [];
        dailySegments.forEach(seg => {
            seg.chapters.forEach(ch => {
                list.push(`${seg.book} ${ch}`);
            });
        });
        return list;
    }, [isCuratedPlan, activeCuratedDay, dailySegments]);

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

    // Mobile Edge Swiping Gesture Handler (Excludes tip-tap rich editor block and verse text spans)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        const target = e.target as HTMLElement;
        if (
            target.closest('.tiptap-editor') ||
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('blockquote') ||
            target.closest('span')
        ) {
            return;
        }
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile) return;
        const target = e.target as HTMLElement;
        if (
            target.closest('.tiptap-editor') ||
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('blockquote') ||
            target.closest('span')
        ) {
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const duration = Date.now() - touchStartTime.current;

        const diffX = touchEndX - touchStartX.current;
        const diffY = touchEndY - touchStartY.current;

        // Require: ≥90px horizontal, vertical drift <35px, and a deliberate swipe (>150ms, not a tap)
        if (Math.abs(diffX) > 90 && Math.abs(diffY) < 35 && duration > 150) {
            if (diffX > 0 && activeMobileTab === 'journal') {
                setActiveMobileTab('read');
            } else if (diffX < 0 && activeMobileTab === 'read') {
                setActiveMobileTab('journal');
            }
        }
    };

    // Preset Creators for faster onboarding
    const createPresetPlan = async (presetId: string) => {
        const preset = LECTIO_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = startTimestamp + (preset.durationDays * 24 * 60 * 60 * 1000);

        if (preset.type === 'topical' || preset.type === 'curated' || preset.type === 'chronological') {
            await createCuratedPlan(
                preset.title,
                startTimestamp,
                endTimestamp,
                preset.type,
                preset.curatedSchedule || [],
                preset.templateType || 'lectio_divina'
            );
        } else {
            await createPlan(
                preset.title,
                startTimestamp,
                endTimestamp,
                preset.tracks || [],
                preset.templateType || 'freeform'
            );
        }
        showToast(`Plan "${preset.title}" created successfully!`, 'success');
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

        if (creationTab === 'smart_paste') {
            const schedule = parsePastedCuratedText(pastedScheduleText);
            if (schedule.length === 0) {
                showToast('Could not parse any scripture passages. Please check the format.', 'error');
                return;
            }
            await createCuratedPlan(
                planName,
                startTimestamp,
                endTimestamp,
                'curated',
                schedule,
                templateChoice
            );
            showToast(`Custom topical plan "${planName}" created with ${schedule.length} days!`, 'success');
        } else {
            await createPlan(planName, startTimestamp, endTimestamp, tracksInput, templateChoice);
            showToast(`Plan "${planName}" created successfully!`, 'success');
        }
        setIsCreating(false);
        setPlanName('');
        setPastedScheduleText('');
    };

    const formatDuration = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDividerPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const initialRatio = splitRatio;
        const container = (e.currentTarget as HTMLElement).parentElement;
        if (!container) return;
        const containerWidth = container.getBoundingClientRect().width;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaPercent = (deltaX / containerWidth) * 100;
            const newRatio = Math.min(80, Math.max(20, initialRatio + deltaPercent));
            setSplitRatio(newRatio);
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Render nothing if Lectio mode is entirely inactive in the Zustand store
    if (!isLectioModeActive) return null;

    // Enforce local library studyspace is unlocked first
    if (isLocalMode && !hasStudyspace) {
        return (
            <div className="fixed inset-0 z-[150] bg-light-background dark:bg-dark-background overflow-y-auto custom-scrollbar p-6 flex flex-col items-center justify-center select-none text-center animate-in fade-in zoom-in duration-300">
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
                className="fixed inset-0 z-[150] bg-light-background dark:bg-dark-background flex flex-col overflow-hidden text-light-text-primary dark:text-dark-text-primary"
            >
                {/* Immersive Session Header */}
                <header className="h-14 border-b border-light-border dark:border-dark-border px-4 flex items-center justify-between bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md shrink-0 z-[160] relative">
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

                    {/* Header Toolbar: Version Picker, Settings Popover Toggle, Timer, Zen Focus, Complete Button */}
                    <div className="flex items-center gap-2 relative">
                        {/* Devotional Timer */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-light-background dark:bg-dark-background/60 border border-light-border dark:border-dark-border rounded-xl text-xs font-mono font-bold text-light-text-secondary dark:text-dark-text-secondary">
                            <Timer size={13} className={isTimerRunning ? "text-primary animate-pulse" : "opacity-60"} />
                            <span>{formatDuration(timerSeconds)}</span>
                            <button
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className="p-0.5 hover:text-primary transition-colors ml-0.5"
                                title={isTimerRunning ? "Pause Timer" : "Start Devotional Timer"}
                            >
                                {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                        </div>

                        {/* Zen Focus Toggle Button (Desktop & Tablet) */}
                        <button
                            onClick={() => setZenFocus(!zenFocus)}
                            className={`p-2 rounded-full transition-all duration-200 hover:bg-light-background dark:hover:bg-dark-background ${zenFocus ? 'text-primary bg-primary/10' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                            title={zenFocus ? "Exit Zen Focus (Show Journal)" : "Zen Focus (Full Scripture View)"}
                        >
                            {zenFocus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>

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
                                    updateReadingDuration(activePlan.id, timerSeconds);
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

                {/* Track Selector Bar (or Curated Day Indicator) */}
                <div className="bg-light-sidebar/55 dark:bg-dark-sidebar/45 border-b border-light-border dark:border-dark-border py-2 px-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {isCuratedPlan ? (
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-primary/20 border border-primary text-primary text-xs font-black uppercase tracking-wider rounded-lg">
                                Day {completedHistoryCount + 1}: {activeCuratedDay?.title || 'Daily Passage'}
                            </span>
                            {activeCuratedDay?.topic && (
                                <span className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary italic">
                                    "{activeCuratedDay.topic}"
                                </span>
                            )}
                        </div>
                    ) : (
                        activePlan.tracks.map((track, idx) => {
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
                        })
                    )}
                </div>

                {/* Daily Granular Chapter Checklist Bar */}
                {currentChecklistItems.length > 0 && (
                    <div className="bg-light-surface/90 dark:bg-dark-surface/90 border-b border-light-border dark:border-dark-border py-1.5 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
                        <span className="text-[10px] uppercase font-black tracking-widest text-light-text-disabled shrink-0 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Assigned:
                        </span>
                        {currentChecklistItems.map(item => {
                            const isDone = completedItems.includes(item);
                            return (
                                <button
                                    key={item}
                                    onClick={() => {
                                        if (activePlan) {
                                            toggleChapterCompletion(activePlan.id, item);
                                        }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 border ${
                                        isDone
                                            ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                                            : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:border-primary/40'
                                    }`}
                                >
                                    {isDone ? <CheckSquare size={12} className="text-green-500" /> : <Square size={12} />}
                                    <span>{item}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

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
                        style={{
                            width: isMobile
                                ? '100%'
                                : zenFocus
                                    ? '100%'
                                    : `${splitRatio}%`
                        }}
                        className={`h-full flex flex-col bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border overflow-hidden relative ${isMobile && activeMobileTab !== 'read' ? 'hidden' : 'flex'
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
                                                                <sup
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setStudyPopoverData({
                                                                            verse: { book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }
                                                                        });
                                                                    }}
                                                                    className="text-[10px] font-sans font-bold opacity-50 mr-1 select-none hover:text-primary hover:opacity-100 hover:scale-125 inline-block transition-transform cursor-pointer"
                                                                    title="Lookup Strong's & Cross-References"
                                                                >
                                                                    {v.verse}
                                                                </sup>
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
                                                                            <sup
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setStudyPopoverData({
                                                                                        verse: { book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }
                                                                                    });
                                                                                }}
                                                                                className="text-[10px] font-sans font-bold opacity-50 mr-1 select-none hover:text-primary hover:opacity-100 hover:scale-125 inline-block transition-transform cursor-pointer"
                                                                                title="Lookup Strong's & Cross-References"
                                                                            >
                                                                                {v.verse}
                                                                            </sup>
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

                    {/* Resizable Divider Handle (Hidden on Mobile or Zen Focus) */}
                    {!isMobile && !zenFocus && (
                        <div
                            onPointerDown={handleDividerPointerDown}
                            className="w-1.5 hover:w-2 bg-light-border dark:border-dark-border hover:bg-primary/50 cursor-col-resize transition-all shrink-0 relative group flex items-center justify-center select-none z-20"
                            title="Drag to resize Scripture / Journal split"
                        >
                            <div className="h-8 w-1 bg-light-text-disabled group-hover:bg-primary rounded-full transition-colors" />
                        </div>
                    )}

                    {/* RIGHT PANEL: Daily Summary Journal Editor */}
                    <div
                        onClick={handleJournalPanelClick}
                        style={{
                            width: isMobile
                                ? '100%'
                                : zenFocus
                                    ? '0%'
                                    : `${100 - splitRatio}%`
                        }}
                        className={`h-full flex flex-col bg-white dark:bg-dark-surface overflow-hidden relative ${zenFocus || (isMobile && activeMobileTab !== 'journal') ? 'hidden' : 'flex'
                            }`}
                    >
                        {activeNoteId ? (
                            <div className="flex-1 h-full flex flex-col overflow-hidden relative">
                                <RichTextEditor activeRoom={null} identity={null} shouldSync={isPlanShared} />
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

                {/* Inline Study Popover (Strong's Concordance + TSK Cross-References) */}
                <AnimatePresence>
                    {studyPopoverData && (
                        <LectioStudyPopover
                            verse={studyPopoverData.verse}
                            strongsId={studyPopoverData.strongsId}
                            wordText={studyPopoverData.wordText}
                            versionId={versionId}
                            onClose={() => setStudyPopoverData(null)}
                            onPinVerse={async (text: string, ref: string) => {
                                await pinVerseToActiveJournal(text, ref);
                                showToast(`Pinned ${ref} to study notes!`, 'success');
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // RENDER CASE 2: Lectio Study Center Dashboard
    return (
        <div className="fixed inset-0 z-[150] bg-light-background dark:bg-dark-background overflow-y-auto custom-scrollbar p-6 flex flex-col select-none">
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
                        className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 md:p-8 shadow-xl space-y-6"
                    >
                        <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <PlusCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase text-light-text-primary dark:text-dark-text-primary tracking-wider">
                                        Create Scripture Study Plan
                                    </h3>
                                    <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary font-medium">
                                        Select from curated classical schedules, custom book tracks, or paste your own study list
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all"
                            >
                                Back
                            </button>
                        </div>

                        {/* Top Category Tabs */}
                        <div className="grid grid-cols-3 gap-2 bg-light-background dark:bg-dark-background/60 p-1.5 rounded-2xl border border-light-border dark:border-dark-border">
                            <button
                                type="button"
                                onClick={() => setCreationTab('preset')}
                                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    creationTab === 'preset'
                                        ? 'bg-light-surface dark:bg-dark-surface text-primary shadow-sm border border-light-border dark:border-dark-border'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary'
                                }`}
                            >
                                <Sparkles size={14} />
                                <span className="hidden sm:inline">Curated</span> Presets
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationTab('custom')}
                                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    creationTab === 'custom'
                                        ? 'bg-light-surface dark:bg-dark-surface text-primary shadow-sm border border-light-border dark:border-dark-border'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary'
                                }`}
                            >
                                <Layers size={14} />
                                <span className="hidden sm:inline">Custom</span> Tracks
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationTab('smart_paste')}
                                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    creationTab === 'smart_paste'
                                        ? 'bg-light-surface dark:bg-dark-surface text-primary shadow-sm border border-light-border dark:border-dark-border'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary'
                                }`}
                            >
                                <FileText size={14} />
                                <span className="hidden sm:inline">Smart</span> Paste
                            </button>
                        </div>

                        {/* TAB 1: CURATED PRESETS */}
                        {creationTab === 'preset' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                                    {LECTIO_PRESETS.map((preset: LectioPreset) => (
                                        <div
                                            key={preset.id}
                                            onClick={() => createPresetPlan(preset.id)}
                                            className="bg-light-background dark:bg-dark-background/60 border border-light-border dark:border-dark-border hover:border-primary/50 hover:shadow-md rounded-2xl p-4 cursor-pointer text-left transition-all group flex flex-col justify-between space-y-3"
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        {preset.durationDays} Days
                                                    </span>
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-light-text-disabled">
                                                        {preset.type}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-serif font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors">
                                                    {preset.title}
                                                </h4>
                                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed line-clamp-2">
                                                    {preset.description}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    createPresetPlan(preset.id);
                                                }}
                                                className="w-full py-2 bg-light-surface dark:bg-dark-surface group-hover:bg-primary group-hover:text-white border border-light-border dark:border-dark-border group-hover:border-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Play size={10} />
                                                <span>Start Plan</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: CUSTOM SEQUENTIAL TRACKS */}
                        {creationTab === 'custom' && (
                            <form onSubmit={handleCreateCustomPlan} className="space-y-4 text-left">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Plan Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={planName}
                                        onChange={(e) => setPlanName(e.target.value)}
                                        placeholder="e.g. Romans Deep Dive, Whole Bible, Gospels in 90 Days..."
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

                                {/* Template Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Journal Template Style</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTemplateChoice('lectio_divina')}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                templateChoice === 'lectio_divina'
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                                            }`}
                                        >
                                            <p className="text-xs font-black uppercase tracking-wider">🌿 5-Stage Lectio Divina</p>
                                            <p className="text-[10px] opacity-75 mt-0.5">Lectio, Meditatio, Oratio, Contemplatio & Actio</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTemplateChoice('freeform')}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                templateChoice === 'freeform'
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                                            }`}
                                        >
                                            <p className="text-xs font-black uppercase tracking-wider">📝 Freeform Journal</p>
                                            <p className="text-[10px] opacity-75 mt-0.5">Clean notes with scripture citation headers</p>
                                        </button>
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
                                                { name: 'Custom Track', startBook: 'Genesis', endBook: 'Revelation', chaptersPerDay: 1 }
                                            ])}
                                            className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1"
                                        >
                                            <Plus size={12} />
                                            <span>Add Track</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                        {tracksInput.map((track, idx) => (
                                            <div key={idx} className="bg-light-background dark:bg-dark-background/60 p-3.5 rounded-2xl border border-light-border dark:border-dark-border flex flex-col md:flex-row gap-3">
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
                                                        placeholder="Track Name (e.g. Epistles)"
                                                        className="w-full bg-transparent border-b border-light-border dark:border-dark-border text-xs font-bold py-1 focus:outline-none focus:border-primary"
                                                    />
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-light-text-disabled font-bold uppercase">From:</span>
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
                                                                <option key={b.name} value={b.name}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-light-text-disabled font-bold uppercase">To:</span>
                                                        <select
                                                            value={track.endBook || 'Revelation'}
                                                            onChange={(e) => {
                                                                const copy = [...tracksInput];
                                                                copy[idx].endBook = e.target.value;
                                                                setTracksInput(copy);
                                                            }}
                                                            className="bg-transparent border-b border-light-border dark:border-dark-border text-xs py-1 focus:outline-none focus:border-primary cursor-pointer font-semibold bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                                                        >
                                                            {BIBLE_BOOKS.map(b => (
                                                                <option key={b.name} value={b.name}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

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
                                    Build Custom Plan
                                </button>
                            </form>
                        )}

                        {/* TAB 3: SMART TEXT PASTE (Topical / Curated / Word Study) */}
                        {creationTab === 'smart_paste' && (
                            <form onSubmit={handleCreateCustomPlan} className="space-y-4 text-left">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Plan Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={planName}
                                        onChange={(e) => setPlanName(e.target.value)}
                                        placeholder="e.g. 30 Days on Faith, Wisdom Literature, Word Study: Grace..."
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Journal Template Style</label>
                                        <select
                                            value={templateChoice}
                                            onChange={(e: any) => setTemplateChoice(e.target.value)}
                                            className="input py-2.5 rounded-xl text-xs font-bold"
                                        >
                                            <option value="lectio_divina">🌿 5-Stage Lectio Divina</option>
                                            <option value="freeform">📝 Freeform Notes</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                            Paste Passage Schedule
                                        </label>
                                        {pastedScheduleText.trim() && (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                                {parsePastedCuratedText(pastedScheduleText).length} Days Parsed
                                            </span>
                                        )}
                                    </div>
                                    <textarea
                                        required
                                        rows={8}
                                        value={pastedScheduleText}
                                        onChange={(e) => setPastedScheduleText(e.target.value)}
                                        placeholder={"Paste reading schedule lines here...\n\nExample:\nDay 1: Genesis 1:1-2:3\nDay 2: Romans 8:1-39\nDay 3: Psalm 23:1-6\nDay 4: Hebrews 11:1-40\nDay 5: John 15:1-17"}
                                        className="w-full bg-light-background dark:bg-dark-background/60 border border-light-border dark:border-dark-border rounded-2xl p-3 text-xs font-mono focus:outline-none focus:border-primary custom-scrollbar"
                                    />
                                    <p className="text-[10px] text-light-text-disabled">
                                        Supports partial chapters, single psalms, verses, and multiple passages per day separated by commas or semicolons.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={parsePastedCuratedText(pastedScheduleText).length === 0}
                                    className="w-full py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/25 active:scale-98 transition-all shrink-0 disabled:opacity-50"
                                >
                                    Build Topical / Curated Plan
                                </button>
                            </form>
                        )}
                    </motion.div>
                ) : (
                    /* PLANS LISTING & METRICS VIEW */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-light-text-disabled tracking-widest flex items-center gap-2">
                                <Layers size={14} strokeWidth={2.5} />
                                <span>Active Scripture Plans</span>
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSharingPlan(null); // Indicates empty / inbound only
                                        setIsSharingModalOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-light-surface hover:bg-light-sidebar dark:bg-dark-surface dark:hover:bg-dark-elevated text-xs font-black uppercase tracking-widest rounded-xl border border-light-border dark:border-dark-border transition-all text-light-text-secondary dark:text-dark-text-secondary"
                                >
                                    <Users size={14} />
                                    <span>Join Plan</span>
                                </button>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-xl border border-primary/10 hover:bg-primary/20 transition-all"
                                >
                                    <Plus size={14} />
                                    <span>Add New Plan</span>
                                </button>
                            </div>
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
                                    const planHistory = allHistory.filter(h => h.planId === plan.id);
                                    const metrics = calculatePlanMetrics(plan, planHistory);

                                    return (
                                        <div
                                            key={plan.id}
                                            className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-primary/20 rounded-2xl p-5 text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                                        >
                                            {/* Left Card info */}
                                            <div className="flex-1 space-y-3 min-w-0 w-full">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="font-serif font-bold text-lg md:text-xl text-light-text-primary dark:text-dark-text-primary tracking-tight">
                                                            {plan.name}
                                                        </h4>
                                                        {metrics.streakDays > 0 && (
                                                            <span className="flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 border border-amber-500/20">
                                                                <Flame size={12} className="fill-amber-500 animate-pulse" />
                                                                <span>{metrics.streakDays}-day streak</span>
                                                            </span>
                                                        )}
                                                    </div>
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

                                                {/* Progress Bar & Paper Trail Indicator */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex items-center justify-between text-[11px] font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                                        <span>Progress: <b>{metrics.completedDays}</b> / {metrics.totalDays} Days ({metrics.percentage}%)</span>
                                                        <span className="text-[10px] text-light-text-disabled uppercase font-black tracking-wider">
                                                            {metrics.notesCount > 0 ? `${metrics.notesCount} study notes` : 'No notes yet'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-light-background dark:bg-dark-background/80 rounded-full h-2 overflow-hidden border border-light-border/60 dark:border-dark-border/60">
                                                        <div
                                                            className="bg-primary h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${metrics.percentage}%` }}
                                                        />
                                                    </div>
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
                                                        setHistoryModalPlan(plan);
                                                        setIsHistoryModalOpen(true);
                                                    }}
                                                    className="p-2.5 rounded-xl border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-colors group/btn relative"
                                                    title="History & Calendar View"
                                                >
                                                    <FileText size={16} />
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                                                        Paper Trail / History
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        downloadPlanIcs(plan);
                                                        showToast(`Exported "${plan.name}" to Calendar (.ics)`, 'success');
                                                    }}
                                                    className="p-2.5 rounded-xl border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-colors group/btn relative"
                                                    title="Export to Calendar (.ics)"
                                                >
                                                    <Calendar size={16} />
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                                                        Calendar (.ics)
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setSharingPlan(plan);
                                                        setIsSharingModalOpen(true);
                                                    }}
                                                    className="p-2.5 rounded-xl border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-colors group/btn relative"
                                                    title="Share Study Plan"
                                                >
                                                    <Share2 size={16} />
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                                                        Share Plan
                                                    </div>
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

            <SharePlanModal
                isOpen={isSharingModalOpen}
                onClose={() => setIsSharingModalOpen(false)}
                plan={sharingPlan}
                onToast={showToast}
            />

            <PlanHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                plan={historyModalPlan}
            />
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
                const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
                const decryptedRes = await decryptVerses(res);
                setVerses(decryptedRes);

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

interface SharePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: any | null; // Null indicates empty / inbound only
    onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SharePlanModal: React.FC<SharePlanModalProps> = ({ isOpen, onClose, plan, onToast }) => {
    const { identity } = useSyncStore();
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);
    const [inboundInput, setInboundInput] = useState('');
    const [isSyncingPlan, setIsSyncingPlan] = useState(false);
    const [showQr, setShowQr] = useState(false);

    // Cryptographically Secure Salt derived or generated
    const [planSalt, setPlanSalt] = useState('');

    React.useEffect(() => {
        if (isOpen && plan) {
            // Generate or fetch plan salt to secure P2P discovery
            const storedSalt = localStorage.getItem(`plan-salt-${plan.id}`);
            if (storedSalt) {
                setPlanSalt(storedSalt);
            } else {
                const newSalt = Array.from(crypto.getRandomValues(new Uint8Array(8)))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                localStorage.setItem(`plan-salt-${plan.id}`, newSalt);
                setPlanSalt(newSalt);
            }
        }
    }, [isOpen, plan]);

    const roomHash = plan && planSalt
        ? identity 
            ? `plan-sync-${identity.vaultHash.slice(0, 8)}-${plan.id}-${planSalt}`
            : `plan-sync-local-${plan.id}-${planSalt}`
        : '';

    const getBaseOrigin = () => {
        if (typeof window === 'undefined') return 'https://parchments.app';
        const origin = window.location.origin;
        if (!origin || origin.startsWith('tauri://') || origin.startsWith('capacitor://') || origin.startsWith('file://') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return 'https://parchments.app';
        }
        return origin;
    };

    const shareUrl = roomHash 
        ? `${getBaseOrigin()}/join/${roomHash}?title=${encodeURIComponent(plan.name)}`
        : '';

    // Join the room as the host when opening the share UI & save syncRoomHash
    React.useEffect(() => {
        if (isOpen && roomHash && plan && plan.id) {
            import('@/lib/sync/PlanSyncManager').then(({ PlanSyncManager }) => {
                PlanSyncManager.joinPlanRoom(roomHash);
                PlanSyncManager.broadcastPlanUpdate(plan.id);
            });
            db.readingPlans.update(plan.id, { syncRoomHash: roomHash }).catch(console.error);
        }
    }, [isOpen, roomHash, plan]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            onToast('Share Link copied!', 'success');
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleCopyHash = async () => {
        try {
            await navigator.clipboard.writeText(roomHash);
            setCopiedHash(true);
            onToast('Room Hash copied!', 'success');
            setTimeout(() => setCopiedHash(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleReceivePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const inputVal = inboundInput.trim();
        if (!inputVal) {
            onToast('Please enter a valid link or room hash.', 'error');
            return;
        }

        setIsSyncingPlan(true);
        onToast('Connecting to plan sync room...', 'info');

        try {
            let targetHash = inputVal;
            if (inputVal.includes('/join/')) {
                const parts = inputVal.split('/join/');
                targetHash = parts[1].split('?')[0];
            }

            if (!targetHash.startsWith('plan-sync-')) {
                onToast('Invalid plan share key format.', 'error');
                setIsSyncingPlan(false);
                return;
            }

            // Extract planId and salt to store locally on the receiver
            const hashParts = targetHash.split('-');
            const planSalt = hashParts[hashParts.length - 1];
            const planIdIndex = hashParts.findIndex((p, idx) => p === 'plan' && idx > 0 && /^\d+$/.test(hashParts[idx + 1] || ''));
            if (planIdIndex !== -1 && hashParts[planIdIndex + 1] && planSalt) {
                const planId = `plan-${hashParts[planIdIndex + 1]}`;
                localStorage.setItem(`plan-salt-${planId}`, planSalt);
                console.log(`[Sync Ingest] Stored plan salt for: ${planId} -> ${planSalt}`);
            }

            // Join the sync room
            const { PlanSyncManager } = await import('@/lib/sync/PlanSyncManager');
            await PlanSyncManager.joinPlanRoom(targetHash);

            onToast('Connected! Sibling notes and tracks are synchronizing in the background.', 'success');
            setInboundInput('');
            setIsSyncingPlan(false);
            onClose();
        } catch (err) {
            console.error('[SharePlanModal] Sync fail:', err);
            onToast('Failed to join synchronization room.', 'error');
            setIsSyncingPlan(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-light-surface dark:bg-dark-surface rounded-3xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden"
                >
                    {/* Modal Header */}
                    <div className="p-5 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-lg text-light-text-primary dark:text-dark-text-primary">
                                    {plan ? 'Share Reading Plan' : 'Join Shared Plan'}
                                </h3>
                                <p className="text-[10px] text-light-text-secondary uppercase tracking-widest font-black opacity-60">
                                    {plan ? plan.name : 'Lectio Synchronization Hub'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full transition-colors text-light-text-secondary dark:text-dark-text-secondary">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        {plan && (
                            /* OUTBOUND SHARING VIEW */
                            <div className="space-y-4 text-left">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">P2P Collaboration Link</h4>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[9px] font-black uppercase">
                                        <Lock size={10} />
                                        <span>Secure P2P Salt</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="p-3 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl text-xs font-mono break-all text-light-text-secondary dark:text-dark-text-secondary max-h-24 overflow-y-auto">
                                        {shareUrl}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={handleCopy}
                                            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${copiedLink ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98'}`}
                                        >
                                            {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                                            {copiedLink ? 'Link Copied' : 'Copy Share Link'}
                                        </button>
                                        <button
                                            onClick={handleCopyHash}
                                            className={`px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all ${copiedHash ? 'bg-green-500 text-white' : 'bg-light-sidebar dark:bg-dark-sidebar border border-light-border dark:border-dark-border hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary'}`}
                                        >
                                            {copiedHash ? <Check size={14} /> : <Copy size={14} />}
                                            <span>Hash</span>
                                        </button>
                                        <button
                                            onClick={() => setShowQr(!showQr)}
                                            className={`px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all ${showQr ? 'bg-primary text-white' : 'bg-light-sidebar dark:bg-dark-sidebar border border-light-border dark:border-dark-border hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary'}`}
                                            title="Toggle QR Code"
                                        >
                                            <QrCode size={14} />
                                            <span>{showQr ? 'Hide QR' : 'QR Code'}</span>
                                        </button>
                                    </div>

                                    {showQr && (
                                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-light-border dark:border-dark-border shadow-inner mx-auto my-2 text-center">
                                            <QRCodeSVG value={shareUrl} size={160} level="M" />
                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-2.5">
                                                Scan with phone camera or mobile Parchments
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[9px] text-light-text-disabled uppercase font-black leading-relaxed">
                                    Copy this secure cryptographic link or scan the QR code. Open it on your other device to synchronize your tracks, completions, and all sibling journal notes recursively.
                                </p>

                                {/* Offline Export */}
                                <button
                                    onClick={() => {
                                        exportPlanToJsonFile(plan);
                                        onToast(`Exported "${plan.name}" as .plan.json file!`, 'success');
                                    }}
                                    className="w-full py-2.5 px-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-xl text-light-text-secondary dark:text-dark-text-secondary text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={14} />
                                    <span>Export Offline .plan.json File</span>
                                </button>
                            </div>
                        )}

                        {plan && <div className="h-[1px] bg-light-border dark:bg-dark-border my-4" />}

                        {/* INBOUND RECEIVING VIEW */}
                        <div className="space-y-4 text-left">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                {plan ? 'Receive / Sync Another Plan' : 'Enter Shared Plan Key'}
                            </h4>

                            <form onSubmit={handleReceivePlan} className="flex flex-col gap-2.5">
                                <input
                                    type="text"
                                    required
                                    value={inboundInput}
                                    onChange={(e) => setInboundInput(e.target.value)}
                                    placeholder="Paste Link or Room Hash (e.g. plan-sync-...)"
                                    className="input py-2.5 px-4 rounded-xl text-xs bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border focus:ring-1 focus:ring-primary font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={isSyncingPlan}
                                    className="w-full py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-99 disabled:opacity-50"
                                >
                                    {isSyncingPlan ? (
                                        <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                    ) : (
                                        <Users size={12} />
                                    )}
                                    <span>{isSyncingPlan ? 'Connecting...' : 'Receive & Sync Plan'}</span>
                                </button>
                            </form>

                            {/* Offline Import */}
                            <div className="pt-2 border-t border-light-border dark:border-dark-border">
                                <label className="w-full cursor-pointer flex items-center justify-center gap-2 py-2.5 px-4 bg-light-background dark:bg-dark-background border border-dashed border-primary/40 hover:border-primary rounded-xl text-primary text-[10px] font-black uppercase tracking-wider transition-all">
                                    <Upload size={14} />
                                    <span>Import Offline .plan.json File</span>
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                const text = await file.text();
                                                const importedPlan = await importPlanFromJson(text);
                                                onToast(`Imported plan "${importedPlan.name}" successfully!`, 'success');
                                                useReadingPlanStore.getState().loadPlans();
                                                onClose();
                                            } catch (err: any) {
                                                onToast(err.message || 'Failed to import plan file', 'error');
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* E2EE Info Block */}
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2.5 text-left">
                            <div className="flex items-center gap-2 text-primary">
                                <Lock size={16} />
                                <h5 className="font-bold text-xs">End-to-End P2P Architecture</h5>
                            </div>
                            <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-semibold">
                                Syncing is completely local-first and serverless. Your daily notes are transferred directly peer-to-peer and saved locally onto your workspace disk handle in real-time.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
