import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Editor, EditorContent } from '@tiptap/react';
import {
    Play,
    Pause,
    RotateCcw,
    ChevronUp,
    ChevronDown,
    X,
    Clock
} from 'lucide-react';

interface PulpitModeProps {
    editor: Editor;
    title: string;
    onExit: () => void;
}

export const PulpitMode: React.FC<PulpitModeProps> = ({ editor, title, onExit }) => {
    const {
        pulpitModeType,
        setPulpitModeType,
        pulpitScrollSpeed,
        setPulpitScrollSpeed,
        pulpitFontSize,
        setPulpitFontSize,
        pulpitHighContrast,
        setPulpitHighContrast
    } = useUIStore();

    // Timer State (Silent Timer)
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Auto-scroll State
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Real-time Wall Clock ticker
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Silent Preaching Timer ticker
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

    // Continuous Auto-Scroll Engine
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
                // pulpitScrollSpeed is pixels per second (default ~50-100)
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
            // Escape exits pulpit mode
            if (e.key === 'Escape') {
                e.preventDefault();
                onExit();
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
    }, [pulpitModeType, handleNextPage, handlePrevPage, onExit]);

    // High Contrast & Background Themes
    const bgClass = pulpitHighContrast
        ? 'bg-black text-white'
        : 'bg-stone-50 dark:bg-[#0c0d0e] text-stone-900 dark:text-stone-100';

    const headerBgClass = pulpitHighContrast
        ? 'bg-neutral-950 border-neutral-800 text-white'
        : 'bg-white/90 dark:bg-[#121316]/90 border-light-border dark:border-dark-border backdrop-blur-md';

    return (
        <div className={`fixed inset-0 z-50 flex flex-col ${bgClass} select-none overflow-hidden`}>
            {/* Top Control Bar */}
            <header className={`h-16 px-6 border-b flex items-center justify-between shrink-0 ${headerBgClass} transition-colors duration-300`}>
                {/* Left: Preaching Timer & Wall Clock */}
                <div className="flex items-center gap-6">
                    {/* Silent Preaching Timer */}
                    <div className="flex items-center gap-3 bg-neutral-900/10 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className={isTimerRunning ? "text-emerald-500 animate-pulse" : "text-neutral-400"} />
                            <span className="font-mono text-xl font-black tracking-tight">
                                {formatTimer(elapsedSeconds)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsTimerRunning(prev => !prev)}
                                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-xs transition-colors"
                                title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                            >
                                {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                            <button
                                onClick={() => setElapsedSeconds(0)}
                                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-xs transition-colors"
                                title="Reset Timer"
                            >
                                <RotateCcw size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Wall Clock */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold opacity-70">
                        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* Center: Mode Toggle & Speed/Page Controls */}
                <div className="flex items-center gap-3">
                    {/* Mode Toggle: Scroll vs Paginate */}
                    <div className="flex bg-black/10 dark:bg-white/10 p-1 rounded-xl border border-black/5 dark:border-white/10">
                        <button
                            onClick={() => {
                                setPulpitModeType('scroll');
                                setIsAutoScrolling(false);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${pulpitModeType === 'scroll'
                                ? 'bg-emerald-600 text-white shadow-sm'
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
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'opacity-70 hover:opacity-100'
                                }`}
                        >
                            Paginate
                        </button>
                    </div>

                    {/* Scroll Mode Controls */}
                    {pulpitModeType === 'scroll' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsAutoScrolling(prev => !prev)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all ${isAutoScrolling
                                    ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    }`}
                            >
                                {isAutoScrolling ? <Pause size={14} /> : <Play size={14} />}
                                <span>{isAutoScrolling ? 'Pause' : 'Scroll'}</span>
                            </button>

                            {/* Speed Adjuster */}
                            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-xl text-xs">
                                <button
                                    onClick={() => setPulpitScrollSpeed(Math.max(20, pulpitScrollSpeed - 15))}
                                    className="px-1 font-black opacity-70 hover:opacity-100"
                                    title="Slower scroll"
                                >
                                    -
                                </button>
                                <span className="font-mono text-[11px] font-bold w-12 text-center">
                                    {Math.round(pulpitScrollSpeed / 10)}x
                                </span>
                                <button
                                    onClick={() => setPulpitScrollSpeed(Math.min(250, pulpitScrollSpeed + 15))}
                                    className="px-1 font-black opacity-70 hover:opacity-100"
                                    title="Faster scroll"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Paginate Mode Controls */}
                    {pulpitModeType === 'paginate' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                className="p-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 rounded-lg text-xs"
                                title="Previous Page (PageUp)"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <span className="font-mono text-xs font-bold opacity-80 min-w-[60px] text-center">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs"
                                title="Next Page (PageDown / Space)"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Font Size, Contrast, Exit */}
                <div className="flex items-center gap-3">
                    {/* Font Size A- / A+ */}
                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setPulpitFontSize(Math.max(20, pulpitFontSize - 3))}
                            className="px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold"
                            title="Decrease Text Size"
                        >
                            A-
                        </button>
                        <span className="font-mono text-xs font-bold px-1">{pulpitFontSize}</span>
                        <button
                            onClick={() => setPulpitFontSize(Math.min(60, pulpitFontSize + 3))}
                            className="px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold"
                            title="Increase Text Size"
                        >
                            A+
                        </button>
                    </div>

                    {/* High Contrast Toggle */}
                    <button
                        onClick={() => setPulpitHighContrast(!pulpitHighContrast)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${pulpitHighContrast
                            ? 'bg-yellow-400 text-black border-yellow-400 font-black'
                            : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                            }`}
                        title="Toggle High-Contrast Lectern Mode"
                    >
                        High Contrast
                    </button>

                    {/* Exit Presentation */}
                    <button
                        onClick={onExit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-xs font-bold transition-all"
                        title="Exit Pulpit Mode (Esc)"
                    >
                        <X size={14} />
                        <span>Exit</span>
                    </button>
                </div>
            </header>

            {/* Main Content Presentation Viewport */}
            <main
                ref={scrollContainerRef}
                onScroll={updatePagination}
                className="flex-1 overflow-y-auto px-6 sm:px-16 md:px-28 lg:px-44 py-16 custom-scrollbar scroll-smooth"
                style={{
                    fontSize: `${pulpitFontSize}px`,
                    lineHeight: 1.85,
                }}
            >
                <div className="max-w-4xl mx-auto">
                    {/* Sermon Title */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-12 tracking-tight opacity-95 border-b pb-6 border-current/20">
                        {title || 'Untitled Sermon'}
                    </h1>

                    {/* Sermon Body (TipTap Editor Read-only Rendering) */}
                    <div className="pulpit-content font-serif tracking-normal leading-relaxed prose prose-2xl dark:prose-invert max-w-none">
                        <EditorContent editor={editor} />
                    </div>

                    {/* Bottom Padding for lectern comfort */}
                    <div className="h-96 flex items-center justify-center opacity-30 text-sm font-sans uppercase tracking-widest pt-32">
                        — End of Notes —
                    </div>
                </div>
            </main>

            {/* Subtle Lectern Footer Indicator */}
            <footer className="h-8 px-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] opacity-50 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Spacebar / Clicker: Advance or Pause</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>ESC: Return to Edit</span>
                </div>
            </footer>
        </div>
    );
};
