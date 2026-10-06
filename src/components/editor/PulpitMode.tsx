import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Editor, EditorContent } from '@tiptap/react';
import {
    Play,
    Pause,
    RotateCcw,
    ChevronUp,
    ChevronDown,
    Clock,
    LogOut,
    Eye,
    EyeOff,
    Sun,
    Moon,
    Contrast,
    Maximize,
    Minimize,
    FileText,
    BookOpen,
    Timer,
    X
} from 'lucide-react';
import { ScriptureTooltipProvider } from './ScriptureTooltip';
import { PulpitScriptureModal, type PulpitScriptureTarget } from './PulpitScriptureModal';
import { PulpitNoteSwitcher } from './PulpitNoteSwitcher';
import { useNoteStore } from '@/stores/noteStore';
import { parseScriptureReference } from '@/lib/scriptureParser';
import { db } from '@/lib/db';

interface PulpitModeProps {
    editor: Editor;
    title: string;
    onExit: () => void;
}

export const PulpitMode: React.FC<PulpitModeProps> = ({ editor, title, onExit }) => {
    const { currentNote, notes, localFiles, isLocalMode } = useNoteStore();
    const displayTitle = currentNote?.title || (currentNote as any)?.name || title || 'Untitled Sermon';

    const [scriptureTarget, setScriptureTarget] = useState<PulpitScriptureTarget | null>(null);
    const [isNoteSwitcherOpen, setIsNoteSwitcherOpen] = useState(false);

    // Sunday Pulpit Deck: Quick-switch chips for multi-part sermons & announcements
    const pulpitDeckNotes = useMemo(() => {
        const deck: any[] = [];
        const seen = new Set<string>();
        if (currentNote) {
            seen.add(String(currentNote.id));
            deck.push(currentNote);
        }
        if (isLocalMode) {
            localFiles
                .filter(f => f.kind === 'file' && !seen.has(String(f.id)))
                .slice(0, 3)
                .forEach(f => {
                    seen.add(String(f.id));
                    deck.push({
                        id: f.id,
                        title: f.name.replace(/\.(md|html|txt)$/i, ''),
                        name: f.name,
                        kind: 'file',
                        handle: f.handle
                    });
                });
        }
        notes
            .filter(n => !seen.has(String(n.id)))
            .slice(0, 4 - deck.length)
            .forEach(n => {
                seen.add(String(n.id));
                deck.push(n);
            });
        return deck;
    }, [currentNote, isLocalMode, localFiles, notes]);

    const {
        pulpitModeType,
        setPulpitModeType,
        pulpitScrollSpeed,
        setPulpitScrollSpeed,
        pulpitFontSize,
        setPulpitFontSize,
        pulpitTheme,
        setPulpitTheme,
        isBibleModalOpen,
        toggleBibleModal
    } = useUIStore();

    // Timer State (Silent Timer & Preaching Target Countdown)
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
    const [customMinutesInput, setCustomMinutesInput] = useState<string>('35');
    const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);

    // Auto-scroll State
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Distraction-Free mode toggle (floating pill when preacher wants zero chrome)
    const [isDistractionFree, setIsDistractionFree] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Ensure TipTap editor content updates immediately when selecting another note in Pulpit Mode
    useEffect(() => {
        if (editor && currentNote?.content !== undefined) {
            editor.commands.setContent(currentNote.content || '');
        }
    }, [currentNote?.id, currentNote?.content, editor]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }, []);

    const handleExit = useCallback(() => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        onExit();
    }, [onExit]);

    // Real-time Wall Clock ticker
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Preaching Timer ticker
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning]);

    // Format MM:SS for preaching timer
    const formatTimer = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalTargetSeconds = targetMinutes ? targetMinutes * 60 : null;
    const remainingSeconds = totalTargetSeconds !== null ? totalTargetSeconds - elapsedSeconds : null;
    const isOvertime = remainingSeconds !== null && remainingSeconds < 0;
    const isWarningStage = remainingSeconds !== null && remainingSeconds <= 300 && remainingSeconds >= 0; // Final 5 minutes

    const timerDisplay = useMemo(() => {
        if (remainingSeconds === null) {
            return formatTimer(elapsedSeconds);
        }
        if (remainingSeconds < 0) {
            return `+${formatTimer(Math.abs(remainingSeconds))}`;
        }
        return formatTimer(remainingSeconds);
    }, [remainingSeconds, elapsedSeconds]);

    const timerColorClass = useMemo(() => {
        if (isOvertime) {
            return 'text-red-500 bg-red-500/15 border-red-500/60 animate-pulse font-black';
        }
        if (isWarningStage) {
            return 'text-amber-400 bg-amber-500/15 border-amber-500/40 font-bold';
        }
        return isTimerRunning ? 'text-emerald-500 border-current/20' : 'text-neutral-400 border-current/20';
    }, [isOvertime, isWarningStage, isTimerRunning]);

    // Calculate pagination pages
    const updatePagination = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const pageHeight = container.clientHeight;
        if (pageHeight <= 0) return;
        const total = Math.max(1, Math.ceil(container.scrollHeight / pageHeight));
        const current = Math.min(total, Math.max(1, Math.floor(container.scrollTop / pageHeight) + 1));
        setTotalPages(total);
        setCurrentPage(current);
    }, []);

    useEffect(() => {
        updatePagination();
        window.addEventListener('resize', updatePagination);
        return () => window.removeEventListener('resize', updatePagination);
    }, [updatePagination, pulpitFontSize]);

    // Handle discrete page navigation (Clicker friendly)
    const handleNextPage = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const pageHeight = container.clientHeight * 0.85; // 85% view advance for context continuity
        container.scrollBy({ top: pageHeight, behavior: 'smooth' });
    }, []);

    const handlePrevPage = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const pageHeight = container.clientHeight * 0.85;
        container.scrollBy({ top: -pageHeight, behavior: 'smooth' });
    }, []);

    // Continuous Auto-Scroll Engine (flawless 60fps, no smooth-scroll collision)
    useEffect(() => {
        if (!isAutoScrolling || pulpitModeType !== 'scroll') {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            return;
        }

        let lastTimestamp = performance.now();

        const step = (now: number) => {
            const deltaSec = (now - lastTimestamp) / 1000;
            lastTimestamp = now;

            const container = scrollContainerRef.current;
            if (container) {
                const pxToScroll = pulpitScrollSpeed * deltaSec;
                container.scrollTop += pxToScroll;

                // Stop if reached the very bottom
                if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) {
                    setIsAutoScrolling(false);
                    return;
                }
            }

            animFrameRef.current = requestAnimationFrame(step);
        };

        animFrameRef.current = requestAnimationFrame(step);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
        };
    }, [isAutoScrolling, pulpitModeType, pulpitScrollSpeed]);

    // Keyboard Shortcuts for Pulpit & Remote Clickers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const targetEl = e.target as HTMLElement | null;
            const isTyping = targetEl && (
                targetEl.tagName === 'INPUT' ||
                targetEl.tagName === 'TEXTAREA' ||
                targetEl.isContentEditable
            );

            // Escape dismisses active overlays first before exiting pulpit mode
            if (e.key === 'Escape') {
                e.preventDefault();
                if (isTimerSettingsOpen) {
                    setIsTimerSettingsOpen(false);
                    return;
                }
                if (scriptureTarget) {
                    setScriptureTarget(null);
                    return;
                }
                if (isNoteSwitcherOpen) {
                    setIsNoteSwitcherOpen(false);
                    return;
                }
                if (isBibleModalOpen) {
                    toggleBibleModal();
                    return;
                }
                handleExit();
                return;
            }

            // Do not trigger hotkeys if user is searching/typing
            if (isTyping) {
                return;
            }

            // Alt+1 to Alt+4 switches between Sunday Pulpit Deck notes
            if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const noteIndex = parseInt(e.key, 10) - 1;
                if (pulpitDeckNotes[noteIndex]) {
                    handleSelectNoteFromSwitcher(pulpitDeckNotes[noteIndex]);
                }
                return;
            }

            // Alt+B (or Cmd+B / Ctrl+B) toggles Mini Bible modal — prevents clicker black-screen trap
            if ((e.key === 'b' || e.key === 'B') && (e.altKey || e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggleBibleModal();
                return;
            }

            // F5 toggles exit or fullscreen
            if (e.key === 'F5') {
                e.preventDefault();
                handleExit();
                return;
            }

            // Spacebar toggles auto-scroll in scroll mode, or advances page in paginate mode
            if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (pulpitModeType === 'scroll') {
                    setIsAutoScrolling(prev => !prev);
                } else {
                    handleNextPage();
                }
                return;
            }

            // Remote clicker buttons: PageDown / ArrowRight / ArrowDown -> Next
            if (e.key === 'PageDown' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                handleNextPage();
                return;
            }

            // Remote clicker buttons: PageUp / ArrowLeft / ArrowUp -> Previous
            if (e.key === 'PageUp' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                handlePrevPage();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pulpitModeType, handleNextPage, handlePrevPage, handleExit, scriptureTarget, isNoteSwitcherOpen, isBibleModalOpen, toggleBibleModal, isTimerSettingsOpen, pulpitDeckNotes]);

    // Cycle through themes: standard (linen/charcoal) -> dark (charcoal/linen) -> contrast (pure black/white)
    const cycleTheme = () => {
        if (pulpitTheme === 'standard') {
            setPulpitTheme('dark');
        } else if (pulpitTheme === 'dark') {
            setPulpitTheme('contrast');
        } else {
            setPulpitTheme('standard');
        }
    };

    const handleContentClick = (e: React.MouseEvent) => {
        const target = (e.target as HTMLElement).closest('.scripture-ref') as HTMLElement | null;
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            let book = target.getAttribute('data-book');
            let chapter = parseInt(target.getAttribute('data-chapter') || '0', 10);
            let verse = parseInt(target.getAttribute('data-verse') || '0', 10);
            let verseEnd = parseInt(target.getAttribute('data-verse-end') || '0', 10);
            let rawSegments = target.getAttribute('data-segments');

            // Fallback / Enhanced Parsing: If attributes are incomplete or missing segments, parse visible text
            if (!book || !chapter || !rawSegments) {
                const parsed = parseScriptureReference(target.innerText.trim());
                if (parsed) {
                    book = parsed.book;
                    chapter = parsed.chapter;
                    verse = parsed.verse || 1;
                    verseEnd = parsed.verseEnd || 0;
                    if (parsed.segments && parsed.segments.length > 0) {
                        rawSegments = parsed.segments.map(s => s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`).join(', ');
                    }
                }
            }

            if (book && chapter) {
                setScriptureTarget({
                    book,
                    chapter,
                    verse: verse || 1,
                    verseEnd: verseEnd || undefined,
                    segments: rawSegments
                });
            }
        }
    };

    const handleSelectNoteFromSwitcher = async (note: any) => {
        if (note.handle) {
            await useNoteStore.getState().openLocalFile(note);
        } else if (note.id) {
            const dbNote = await db.notes.get(note.id);
            if (dbNote) {
                useNoteStore.getState().setCurrentNote(dbNote);
            } else {
                useNoteStore.getState().setCurrentNote(note);
            }
        } else {
            useNoteStore.getState().setCurrentNote(note);
        }
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setCurrentPage(1);
    };

    const isContrast = pulpitTheme === 'contrast';
    const isDark = pulpitTheme === 'dark';

    // Theme color mappings with guaranteed WCAG AAA contrast
    const bgClass = isContrast
        ? 'pulpit-theme-contrast bg-black text-white'
        : isDark
            ? 'pulpit-theme-dark bg-[#121212] text-[#F4F4F0]'
            : 'pulpit-theme-standard bg-[#FBFBF4] text-[#121212]';

    const headerBgClass = isContrast
        ? 'bg-neutral-950 border-neutral-800 text-white'
        : isDark
            ? 'bg-[#1A1A1A] border-[#2C2C2C] text-[#F4F4F0]'
            : 'bg-white border-[#E8E8D9] text-[#121212]';

    const buttonBase = isContrast
        ? 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700'
        : isDark
            ? 'bg-white/10 hover:bg-white/15 text-[#F4F4F0] border border-white/10'
            : 'bg-black/5 hover:bg-black/10 text-[#121212] border border-black/10';

    const footerBgClass = isContrast
        ? 'bg-black border-neutral-800 text-neutral-300'
        : isDark
            ? 'bg-[#161616] border-[#2C2C2C] text-[#A8A8A8]'
            : 'bg-[#F5F5ED] border-[#E8E8D9] text-[#4A4A4A]';

    return (
        <div
            className={`flex-1 flex flex-col h-full w-full overflow-hidden ${bgClass} relative select-none`}
        >
            {/* Distraction-Free Minimalist Lectern Bar (shown when preacher toggles Focus) */}
            {isDistractionFree ? (
                <div className="h-10 px-4 sm:px-6 flex items-center justify-between border-b shrink-0 z-40 bg-neutral-900/95 dark:bg-black/95 text-white backdrop-blur-md transition-colors select-none">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                        <button
                            onClick={() => setIsTimerSettingsOpen(true)}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            title="Set Target Countdown Timer"
                        >
                            <Clock size={14} className={isTimerRunning ? "text-emerald-400 animate-pulse" : "text-neutral-400"} />
                            <span className={`px-1.5 py-0.5 rounded border ${timerColorClass}`}>{timerDisplay}</span>
                        </button>
                        <button
                            onClick={() => setIsTimerRunning(prev => !prev)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                        >
                            {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleBibleModal}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${isBibleModalOpen ? 'bg-primary text-white' : 'bg-white/15 hover:bg-white/25 text-white'}`}
                            title="Open Mini Bible (Alt+B)"
                        >
                            <BookOpen size={13} />
                            <span>Bible</span>
                        </button>
                        <button
                            onClick={() => setIsDistractionFree(false)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-all active:scale-95"
                            title="Show Pulpit Controls"
                        >
                            <Eye size={13} />
                            <span>Show Tools</span>
                        </button>
                        <button
                            onClick={handleExit}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-all active:scale-95"
                            title="Exit Pulpit Mode (Esc)"
                        >
                            <LogOut size={13} />
                            <span className="hidden sm:inline">Exit</span>
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top Control Bar — Docked Permanently at the top of the editor workspace */}
                    <header
                        className={`border-b shrink-0 ${headerBgClass} transition-colors duration-200 select-none`}
                    >
                        {/* Desktop Header Layout (>= 1024px) — Full single row */}
                        <div className="hidden lg:flex h-14 px-6 items-center justify-between gap-3">
                            {/* Left: Preaching Timer & Wall Clock */}
                            <div className="flex items-center gap-3 shrink-0">
                                {/* Silent Preaching Timer */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${buttonBase}`}>
                                    <button
                                        onClick={() => setIsTimerSettingsOpen(true)}
                                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                                        title="Click to set Target Preaching Duration"
                                    >
                                        <Clock size={16} className={isTimerRunning ? "text-emerald-500 animate-pulse" : "text-neutral-400"} />
                                        <span className={`font-mono text-base font-black tracking-tight select-none min-w-[50px] text-center px-1.5 py-0.5 rounded-md border ${timerColorClass}`}>
                                            {timerDisplay}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setIsTimerRunning(prev => !prev)}
                                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-xs transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95"
                                        title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                                    >
                                        {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                                    </button>
                                    <button
                                        onClick={() => setElapsedSeconds(0)}
                                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-xs transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95"
                                        title="Reset Timer"
                                    >
                                        <RotateCcw size={13} />
                                    </button>
                                </div>

                                {/* Wall Clock */}
                                <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold opacity-75">
                                    <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {/* Sermon Note Switcher Pill */}
                                <button
                                    onClick={() => setIsNoteSwitcherOpen(true)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs max-w-[240px] transition-all active:scale-95 touch-manipulation min-h-[38px] ${buttonBase}`}
                                    title="Switch Sermon Note"
                                >
                                    <FileText size={15} className="shrink-0 text-primary" />
                                    <span className="truncate">{displayTitle}</span>
                                    <ChevronDown size={13} className="shrink-0 opacity-60" />
                                </button>

                                {/* Mini Bible Quick-Launch Button */}
                                <button
                                    onClick={toggleBibleModal}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all active:scale-95 touch-manipulation min-h-[38px] ${isBibleModalOpen ? (isContrast ? 'bg-amber-500 text-black font-black' : 'bg-primary text-white shadow-sm') : buttonBase}`}
                                    title="Open Mini Bible Studyspace (Alt+B)"
                                >
                                    <BookOpen size={15} className={isBibleModalOpen ? "" : "text-primary"} />
                                    <span>Mini Bible</span>
                                </button>
                            </div>

                            {/* Center: Mode Toggle & Scroll/Page Controls */}
                            <div className="flex items-center gap-2">
                                {/* Mode Selector: Scroll vs Paginate */}
                                <div className={`flex p-1 rounded-xl border ${buttonBase}`}>
                                    <button
                                        onClick={() => {
                                            setPulpitModeType('scroll');
                                            setIsAutoScrolling(false);
                                        }}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pulpitModeType === 'scroll'
                                            ? isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white shadow-sm'
                                            : 'opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        Auto-Scroll
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPulpitModeType('paginate');
                                            setIsAutoScrolling(false);
                                        }}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pulpitModeType === 'paginate'
                                            ? isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white shadow-sm'
                                            : 'opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        Paginate
                                    </button>
                                </div>

                                {/* Scroll Mode Controls */}
                                {pulpitModeType === 'scroll' && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setIsAutoScrolling(prev => !prev)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 ${isAutoScrolling
                                                ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
                                                : isContrast ? 'bg-emerald-500 text-black hover:bg-emerald-400 font-black' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                }`}
                                            title="Toggle Auto-Scroll (Spacebar)"
                                        >
                                            {isAutoScrolling ? <Pause size={14} /> : <Play size={14} />}
                                            <span>{isAutoScrolling ? 'Pause' : 'Scroll'}</span>
                                        </button>

                                        {/* Speed Adjuster */}
                                        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl text-xs border ${buttonBase}`}>
                                            <button
                                                onClick={() => setPulpitScrollSpeed(Math.max(20, pulpitScrollSpeed - 15))}
                                                className="px-2 py-0.5 font-black opacity-80 hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95"
                                                title="Slower Scroll"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono text-xs font-bold w-10 text-center select-none">
                                                {Math.round(pulpitScrollSpeed / 10)}x
                                            </span>
                                            <button
                                                onClick={() => setPulpitScrollSpeed(Math.min(250, pulpitScrollSpeed + 15))}
                                                className="px-2 py-0.5 font-black opacity-80 hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95"
                                                title="Faster Scroll"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Paginate Mode Controls */}
                                {pulpitModeType === 'paginate' && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={handlePrevPage}
                                            className={`p-1.5 rounded-xl text-xs min-w-[34px] min-h-[34px] flex items-center justify-center border active:scale-95 ${buttonBase}`}
                                            title="Previous Page (PageUp / Up Arrow)"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <span className="font-mono text-xs font-bold px-1 select-none min-w-[50px] text-center">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={handleNextPage}
                                            className={`p-1.5 rounded-xl text-xs min-w-[34px] min-h-[34px] flex items-center justify-center shadow-sm active:scale-95 ${isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                            title="Next Page (PageDown / Spacebar)"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right: Font Size A- / A+, Theme, Fullscreen, Focus, Exit */}
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Font Size Adjuster A- / A+ */}
                                <div className={`flex items-center gap-0.5 p-1 rounded-xl border ${buttonBase}`}>
                                    <button
                                        onClick={() => setPulpitFontSize(Math.max(18, pulpitFontSize - 3))}
                                        className="px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-black min-w-[30px] min-h-[28px] flex items-center justify-center active:scale-95"
                                        title="Decrease Text Size"
                                    >
                                        A-
                                    </button>
                                    <span className="font-mono text-xs font-bold px-1.5 select-none min-w-[34px] text-center">{pulpitFontSize}px</span>
                                    <button
                                        onClick={() => setPulpitFontSize(Math.min(64, pulpitFontSize + 3))}
                                        className="px-2 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-black min-w-[30px] min-h-[28px] flex items-center justify-center active:scale-95"
                                        title="Increase Text Size"
                                    >
                                        A+
                                    </button>
                                </div>

                                {/* Theme Switcher (Standard Light -> Dark -> High Contrast) */}
                                <button
                                    onClick={cycleTheme}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${buttonBase}`}
                                    title="Switch Theme: Standard (Light) · Dark · Lectern (Contrast)"
                                >
                                    {isContrast ? (
                                        <>
                                            <Contrast size={14} className="text-yellow-400" />
                                            <span className="font-black text-yellow-400">Contrast</span>
                                        </>
                                    ) : isDark ? (
                                        <>
                                            <Moon size={14} />
                                            <span>Dark</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sun size={14} />
                                            <span>Standard</span>
                                        </>
                                    )}
                                </button>

                                {/* Fullscreen Toggle */}
                                <button
                                    onClick={toggleFullscreen}
                                    className={`p-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${buttonBase}`}
                                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                                </button>

                                {/* Focus (Distraction-Free) Mode */}
                                <button
                                    onClick={() => setIsDistractionFree(true)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${buttonBase}`}
                                    title="Distraction-Free Reading (Hides tools)"
                                >
                                    <EyeOff size={14} />
                                    <span className="hidden lg:inline">Focus</span>
                                </button>

                                {/* Exit Pulpit Mode */}
                                <button
                                    onClick={handleExit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                                    title="Exit Pulpit Mode (Esc)"
                                >
                                    <LogOut size={14} />
                                    <span>Exit</span>
                                </button>
                            </div>
                        </div>

                        {/* Tablet Header Layout (640px - 1023px) — Dual Row, 100% Non-Clipping */}
                        <div className="hidden sm:flex lg:hidden flex-col px-4 py-2.5 gap-2.5 border-b border-inherit">
                            {/* Tablet Row 1: Timer, Note Switcher and Global Actions */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {/* Silent Preaching Timer */}
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${buttonBase}`}>
                                        <button
                                            onClick={() => setIsTimerSettingsOpen(true)}
                                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                                            title="Click to set Target Preaching Duration"
                                        >
                                            <Clock size={15} className={isTimerRunning ? "text-emerald-500 animate-pulse" : "text-neutral-400"} />
                                            <span className={`font-mono text-sm font-black tracking-tight select-none px-1.5 py-0.5 rounded border ${timerColorClass}`}>
                                                {timerDisplay}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setIsTimerRunning(prev => !prev)}
                                            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-xs min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95 touch-manipulation"
                                            title={isTimerRunning ? "Pause" : "Start"}
                                        >
                                            {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                                        </button>
                                        <button
                                            onClick={() => setElapsedSeconds(0)}
                                            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-xs min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95 touch-manipulation"
                                            title="Reset Timer"
                                        >
                                            <RotateCcw size={13} />
                                        </button>
                                    </div>

                                    {/* Sermon Note Switcher Pill */}
                                    <button
                                        onClick={() => setIsNoteSwitcherOpen(true)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs max-w-[180px] sm:max-w-[220px] transition-all active:scale-95 touch-manipulation min-h-[38px] ${buttonBase}`}
                                        title="Switch Sermon Note"
                                    >
                                        <FileText size={14} className="shrink-0 text-primary" />
                                        <span className="truncate">{displayTitle}</span>
                                        <ChevronDown size={12} className="shrink-0 opacity-60" />
                                    </button>

                                    {/* Mini Bible Quick-Launch Button */}
                                    <button
                                        onClick={toggleBibleModal}
                                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border font-bold text-xs transition-all active:scale-95 touch-manipulation min-h-[38px] ${isBibleModalOpen ? (isContrast ? 'bg-amber-500 text-black font-black' : 'bg-primary text-white shadow-sm') : buttonBase}`}
                                        title="Open Mini Bible (Alt+B)"
                                    >
                                        <BookOpen size={14} className={isBibleModalOpen ? "" : "text-primary"} />
                                        <span className="hidden sm:inline">Mini Bible</span>
                                    </button>
                                </div>

                                {/* Right: Font Size, Theme, Fullscreen, Focus, Exit */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className={`flex items-center gap-0.5 p-1 rounded-xl border ${buttonBase}`}>
                                        <button
                                            onClick={() => setPulpitFontSize(Math.max(18, pulpitFontSize - 3))}
                                            className="px-2.5 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-black min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95 touch-manipulation"
                                            title="Decrease Text Size"
                                        >
                                            A-
                                        </button>
                                        <span className="font-mono text-xs font-bold px-1 select-none min-w-[30px] text-center">{pulpitFontSize}px</span>
                                        <button
                                            onClick={() => setPulpitFontSize(Math.min(64, pulpitFontSize + 3))}
                                            className="px-2.5 py-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-black min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95 touch-manipulation"
                                            title="Increase Text Size"
                                        >
                                            A+
                                        </button>
                                    </div>

                                    <button
                                        onClick={cycleTheme}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border active:scale-95 min-h-[38px] touch-manipulation ${buttonBase}`}
                                        title="Switch Theme"
                                    >
                                        {isContrast ? <Contrast size={14} className="text-yellow-400" /> : isDark ? <Moon size={14} /> : <Sun size={14} />}
                                        <span className="font-bold">{isContrast ? 'Contrast' : isDark ? 'Dark' : 'Standard'}</span>
                                    </button>

                                    <button
                                        onClick={toggleFullscreen}
                                        className={`p-2 rounded-xl text-xs border active:scale-95 min-w-[38px] min-h-[38px] flex items-center justify-center touch-manipulation ${buttonBase}`}
                                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                    >
                                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                                    </button>

                                    <button
                                        onClick={() => setIsDistractionFree(true)}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border active:scale-95 min-h-[38px] touch-manipulation ${buttonBase}`}
                                        title="Distraction-Free Reading"
                                    >
                                        <EyeOff size={14} />
                                        <span>Focus</span>
                                    </button>

                                    <button
                                        onClick={handleExit}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black active:scale-95 shadow-sm min-h-[38px] touch-manipulation"
                                        title="Exit Pulpit Mode"
                                    >
                                        <LogOut size={14} />
                                        <span>Exit</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tablet Row 2: Mode Toggle & Scroll/Page Controls (Centered & Spacious) */}
                            <div className="flex items-center justify-center gap-3 pt-1 border-t border-current/10">
                                <div className={`flex p-1 rounded-xl border ${buttonBase}`}>
                                    <button
                                        onClick={() => { setPulpitModeType('scroll'); setIsAutoScrolling(false); }}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pulpitModeType === 'scroll' ? isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                                    >
                                        Auto-Scroll
                                    </button>
                                    <button
                                        onClick={() => { setPulpitModeType('paginate'); setIsAutoScrolling(false); }}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pulpitModeType === 'paginate' ? isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                                    >
                                        Paginate
                                    </button>
                                </div>

                                {pulpitModeType === 'scroll' ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsAutoScrolling(prev => !prev)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 ${isAutoScrolling
                                                ? 'bg-amber-600 text-white animate-pulse'
                                                : isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white'
                                                }`}
                                        >
                                            {isAutoScrolling ? <Pause size={13} /> : <Play size={13} />}
                                            <span>{isAutoScrolling ? 'Pause' : 'Scroll'}</span>
                                        </button>
                                        <div className={`flex items-center gap-1 px-1.5 py-1 rounded-xl text-xs border ${buttonBase}`}>
                                            <button onClick={() => setPulpitScrollSpeed(Math.max(20, pulpitScrollSpeed - 15))} className="px-2 py-0.5 font-black opacity-80 hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center">-</button>
                                            <span className="font-mono text-xs font-bold w-9 text-center select-none">{Math.round(pulpitScrollSpeed / 10)}x</span>
                                            <button onClick={() => setPulpitScrollSpeed(Math.min(250, pulpitScrollSpeed + 15))} className="px-2 py-0.5 font-black opacity-80 hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center">+</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handlePrevPage} className={`p-1.5 rounded-xl text-xs min-w-[34px] min-h-[34px] flex items-center justify-center border active:scale-95 ${buttonBase}`}>
                                            <ChevronUp size={15} />
                                        </button>
                                        <span className="font-mono text-xs font-bold px-1 select-none min-w-[50px] text-center">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button onClick={handleNextPage} className={`p-1.5 rounded-xl text-xs min-w-[34px] min-h-[34px] flex items-center justify-center shadow-sm active:scale-95 ${isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white'}`}>
                                            <ChevronDown size={15} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Header Layout (< 640px) — Dual Row, 100% Permanently Visible */}
                        <div className="flex sm:hidden flex-col px-3 py-2 gap-2">
                            {/* Mobile Row 1: Timer, Note Switcher, and Exit */}
                            <div className="flex items-center justify-between gap-1.5">
                                {/* Silent Preaching Timer */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border ${buttonBase}`}>
                                    <button
                                        onClick={() => setIsTimerSettingsOpen(true)}
                                        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                                        title="Set Target Preaching Duration"
                                    >
                                        <Clock size={14} className={isTimerRunning ? "text-emerald-500 animate-pulse" : "text-neutral-400"} />
                                        <span className={`font-mono text-xs font-black tracking-tight select-none px-1 py-0.5 rounded border ${timerColorClass}`}>
                                            {timerDisplay}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setIsTimerRunning(prev => !prev)}
                                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-xs min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95 touch-manipulation"
                                        title={isTimerRunning ? "Pause" : "Start"}
                                    >
                                        {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                                    </button>
                                    <button
                                        onClick={() => setElapsedSeconds(0)}
                                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-xs min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95 touch-manipulation"
                                        title="Reset"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                </div>

                                {/* Sermon Note Switcher Pill */}
                                <button
                                    onClick={() => setIsNoteSwitcherOpen(true)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-xl border font-bold text-[11px] max-w-[100px] xs:max-w-[130px] transition-all active:scale-95 touch-manipulation min-h-[34px] ${buttonBase}`}
                                    title="Switch Sermon Note"
                                >
                                    <FileText size={12} className="shrink-0 text-primary" />
                                    <span className="truncate">{displayTitle}</span>
                                    <ChevronDown size={11} className="shrink-0 opacity-60" />
                                </button>

                                {/* Mini Bible Quick-Launch Button */}
                                <button
                                    onClick={toggleBibleModal}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-xl border font-bold text-[11px] transition-all active:scale-95 touch-manipulation min-h-[34px] ${isBibleModalOpen ? (isContrast ? 'bg-amber-500 text-black font-black' : 'bg-primary text-white shadow-sm') : buttonBase}`}
                                    title="Mini Bible (Alt+B)"
                                >
                                    <BookOpen size={12} className={isBibleModalOpen ? "" : "text-primary"} />
                                    <span>Bible</span>
                                </button>

                                {/* Exit Button */}
                                <button
                                    onClick={handleExit}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm active:scale-95 touch-manipulation min-h-[34px]"
                                    title="Exit Pulpit Mode"
                                >
                                    <LogOut size={13} />
                                    <span>Exit</span>
                                </button>
                            </div>

                            {/* Mobile Row 2: Scroll/Pages actions, Font size, Theme */}
                            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-current/10">
                                {/* Mode Toggle: Scroll vs Pages */}
                                <div className={`flex p-0.5 rounded-lg border shrink-0 ${buttonBase}`}>
                                    <button
                                        onClick={() => { setPulpitModeType('scroll'); setIsAutoScrolling(false); }}
                                        className={`px-2 py-1 text-xs font-bold rounded ${pulpitModeType === 'scroll' ? isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white' : 'opacity-70'}`}
                                    >
                                        Scroll
                                    </button>
                                    <button
                                        onClick={() => { setPulpitModeType('paginate'); setIsAutoScrolling(false); }}
                                        className={`px-2 py-1 text-xs font-bold rounded ${pulpitModeType === 'paginate' ? isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white' : 'opacity-70'}`}
                                    >
                                        Pages
                                    </button>
                                </div>

                                {/* Scroll or Paginate controls */}
                                {pulpitModeType === 'scroll' ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setIsAutoScrolling(prev => !prev)}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black active:scale-95 touch-manipulation min-h-[32px] ${isAutoScrolling
                                                ? 'bg-amber-600 text-white animate-pulse'
                                                : isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white'
                                                }`}
                                        >
                                            {isAutoScrolling ? <Pause size={12} /> : <Play size={12} />}
                                            <span>{isAutoScrolling ? 'Pause' : 'Scroll'}</span>
                                        </button>
                                        <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded-lg text-xs border ${buttonBase}`}>
                                            <button onClick={() => setPulpitScrollSpeed(Math.max(20, pulpitScrollSpeed - 15))} className="px-1.5 py-0.5 font-black opacity-80 hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center touch-manipulation">-</button>
                                            <span className="font-mono text-[11px] font-bold w-6 text-center">{Math.round(pulpitScrollSpeed / 10)}x</span>
                                            <button onClick={() => setPulpitScrollSpeed(Math.min(250, pulpitScrollSpeed + 15))} className="px-1.5 py-0.5 font-black opacity-80 hover:opacity-100 min-w-[28px] min-h-[28px] flex items-center justify-center touch-manipulation">+</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <button onClick={handlePrevPage} className={`p-1.5 rounded-lg border active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation ${buttonBase}`}>
                                            <ChevronUp size={14} />
                                        </button>
                                        <span className="font-mono text-xs font-bold px-1 select-none min-w-[36px] text-center">
                                            {currentPage}/{totalPages}
                                        </span>
                                        <button onClick={handleNextPage} className={`p-1.5 rounded-lg active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation ${isContrast ? 'bg-emerald-500 text-black font-black' : 'bg-emerald-600 text-white'}`}>
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Font Size Adjuster A- / A+ */}
                                <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded-lg border ${buttonBase}`}>
                                    <button onClick={() => setPulpitFontSize(Math.max(18, pulpitFontSize - 3))} className="px-1.5 py-0.5 text-xs font-black min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95 touch-manipulation">A-</button>
                                    <span className="font-mono text-[11px] font-bold px-0.5">{pulpitFontSize}</span>
                                    <button onClick={() => setPulpitFontSize(Math.min(64, pulpitFontSize + 3))} className="px-1.5 py-0.5 text-xs font-black min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95 touch-manipulation">A+</button>
                                </div>

                                {/* Theme switcher */}
                                <button
                                    onClick={cycleTheme}
                                    className={`px-2 py-1 rounded-lg text-xs font-black border transition-all active:scale-95 touch-manipulation min-h-[32px] ${buttonBase}`}
                                >
                                    {isContrast ? 'Lectern' : isDark ? 'Dark' : 'Standard'}
                                </button>
                            </div>
                        </div>

                        {/* Sunday Pulpit Deck: Quick-switch pinned sermon note chips */}
                        {pulpitDeckNotes.length > 1 && (
                            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-black/10 dark:bg-white/5 border-t border-inherit overflow-x-auto no-scrollbar">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 shrink-0 mr-1 flex items-center gap-1">
                                    <FileText size={11} className="text-primary" /> Pulpit Deck:
                                </span>
                                {pulpitDeckNotes.map((dn, idx) => {
                                    const isActive = currentNote && String(dn.id) === String(currentNote.id);
                                    const noteTitle = dn.title || dn.name || 'Untitled Sermon';
                                    return (
                                        <button
                                            key={dn.id}
                                            onClick={() => handleSelectNoteFromSwitcher(dn)}
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95 touch-manipulation min-h-[28px] ${isActive
                                                ? isContrast ? 'bg-amber-400 text-black font-black' : 'bg-primary text-slate-900 font-extrabold shadow-sm'
                                                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
                                            }`}
                                            title={`Switch to ${noteTitle} (Alt+${idx + 1})`}
                                        >
                                            <span className="text-[10px] opacity-60 font-mono">#{idx + 1}</span>
                                            <span className="truncate max-w-[140px] sm:max-w-[200px]">{noteTitle}</span>
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setIsNoteSwitcherOpen(true)}
                                    className="px-2 py-1 rounded text-[10px] font-bold opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 transition-opacity"
                                    title="Browse all sermon notes"
                                >
                                    + All Notes
                                </button>
                            </div>
                        )}
                    </header>
                </>
            )}

            {/* Main Content Presentation Viewport — Sermon Body */}
            <main
                ref={scrollContainerRef}
                onScroll={updatePagination}
                onClick={(e) => {
                    if (isAutoScrolling && !(e.target as HTMLElement).closest('.scripture-ref, button, select, input')) {
                        setIsAutoScrolling(false);
                    }
                }}
                className="flex-1 overflow-y-auto px-6 sm:px-16 md:px-24 lg:px-36 py-12 custom-scrollbar"
                style={{
                    fontSize: `${pulpitFontSize}px`,
                    lineHeight: 1.85,
                }}
            >
                <div className="max-w-4xl mx-auto">
                    {/* Sermon Title */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-10 tracking-tight border-b pb-6 border-current/20">
                        {displayTitle}
                    </h1>

                    {/* Sermon Body (TipTap Editor Read-only Rendering with direct font size scaling) */}
                    <div
                        onClickCapture={handleContentClick}
                        className="pulpit-content font-serif tracking-normal leading-relaxed max-w-none transition-[font-size] duration-150"
                        style={{ fontSize: `${pulpitFontSize}px` }}
                    >
                        <ScriptureTooltipProvider>
                            <EditorContent editor={editor} />
                        </ScriptureTooltipProvider>
                    </div>

                    {/* Bottom Padding for lectern comfort */}
                    <div className="h-80 flex items-center justify-center opacity-40 text-sm font-sans uppercase tracking-widest pt-28">
                        — End of Sermon Notes —
                    </div>
                </div>
            </main>

            {/* Subtle Lectern Footer Indicator */}
            <footer className={`h-8 px-4 sm:px-6 border-t flex items-center justify-between text-xs shrink-0 select-none ${footerBgClass}`}>
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Pulpit Mode Active</span>
                    <span className="opacity-60 hidden sm:inline">· Spacebar / Clicker: Advance or Pause · ESC: Exit</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] opacity-75">Text: {pulpitFontSize}px</span>
                    <span className="font-mono text-[11px] opacity-75">
                        {pulpitModeType === 'scroll' ? `Speed: ${Math.round(pulpitScrollSpeed / 10)}x` : `Page: ${currentPage}/${totalPages}`}
                    </span>
                </div>
            </footer>

            {/* Stage-Ready Scripture Quick-Sheet Modal */}
            {scriptureTarget && (
                <PulpitScriptureModal
                    target={scriptureTarget}
                    onClose={() => setScriptureTarget(null)}
                    themeMode={isContrast ? 'contrast' : isDark ? 'dark' : 'light'}
                />
            )}

            {/* Lectern Sermon Note Switcher Modal */}
            <PulpitNoteSwitcher
                isOpen={isNoteSwitcherOpen}
                onClose={() => setIsNoteSwitcherOpen(false)}
                themeMode={isContrast ? 'contrast' : isDark ? 'dark' : 'light'}
                onSelectNote={handleSelectNoteFromSwitcher}
            />

            {/* Custom Preaching Target Countdown Modal */}
            {isTimerSettingsOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setIsTimerSettingsOpen(false)}
                >
                    <div 
                        className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
                            isContrast 
                                ? 'bg-black text-white border-neutral-700' 
                                : isDark 
                                    ? 'bg-[#1e1e1e] text-[#f4f4f0] border-[#333]' 
                                    : 'bg-white text-neutral-900 border-neutral-200'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-current/10">
                            <div className="flex items-center gap-2">
                                <Timer className="text-primary w-5 h-5" />
                                <h3 className="font-bold text-base tracking-tight">Preaching Timer Target</h3>
                            </div>
                            <button
                                onClick={() => setIsTimerSettingsOpen(false)}
                                className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs opacity-75 mb-4 leading-relaxed">
                            Set a target duration in minutes. The timer counts down to zero, turning amber in the last 5 minutes and pulsing red when overtime.
                        </p>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const parsed = parseInt(customMinutesInput, 10);
                                if (!isNaN(parsed) && parsed > 0) {
                                    setTargetMinutes(parsed);
                                    setElapsedSeconds(0);
                                    setIsTimerRunning(true);
                                    setIsTimerSettingsOpen(false);
                                }
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
                                    Target Minutes
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="300"
                                        autoFocus
                                        value={customMinutesInput}
                                        onChange={(e) => setCustomMinutesInput(e.target.value)}
                                        placeholder="e.g. 35"
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                            isContrast 
                                                ? 'bg-neutral-900 border-neutral-700 text-white' 
                                                : isDark 
                                                    ? 'bg-black/40 border-neutral-700 text-white' 
                                                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                                        }`}
                                    />
                                    <span className="font-medium text-sm opacity-70 shrink-0">min</span>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
                                >
                                    Start Countdown ({customMinutesInput || '0'}m)
                                </button>
                                {targetMinutes !== null && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetMinutes(null);
                                            setIsTimerSettingsOpen(false);
                                        }}
                                        className={`w-full py-2 px-3 rounded-xl font-semibold text-xs border opacity-80 hover:opacity-100 transition-all ${
                                            isContrast ? 'border-neutral-700 hover:bg-neutral-800' : isDark ? 'border-neutral-700 hover:bg-white/5' : 'border-neutral-300 hover:bg-neutral-100'
                                        }`}
                                    >
                                        Switch to Count-Up (No Limit)
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
