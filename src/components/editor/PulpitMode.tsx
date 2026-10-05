import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    SlidersHorizontal
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
        setPulpitHighContrast,
        isMobile
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

    // Mobile: collapsible control strip state — hidden by default for distraction-free reading
    const [showMobileControls, setShowMobileControls] = useState(false);

    // Swipe gesture tracking
    const touchStartY = useRef<number>(0);
    const touchStartX = useRef<number>(0);

    // Top control bar / drawer swipe handler
    const handleTopTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const handleTopTouchEnd = useCallback((e: React.TouchEvent) => {
        const diffY = e.changedTouches[0].clientY - touchStartY.current;
        const diffX = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
        // Vertical swipe on top bar or drawer
        if (Math.abs(diffY) > 30 && diffX < 80) {
            if (diffY > 0) {
                // Swipe down → reveal controls and STAY down!
                setShowMobileControls(true);
            } else {
                // Swipe up → conceal controls
                setShowMobileControls(false);
            }
        }
    }, []);

    // Main sermon text view gesture: ONLY allow pulling down at the very top to reveal controls
    const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const handleMainTouchEnd = useCallback((e: React.TouchEvent) => {
        const diffY = e.changedTouches[0].clientY - touchStartY.current;
        const diffX = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
        const container = scrollContainerRef.current;
        const isAtTop = !container || container.scrollTop <= 15;

        // If at top of sermon and pulling down: reveal tools and KEEP them down!
        if (diffY > 40 && diffX < 60 && isAtTop) {
            setShowMobileControls(true);
        }
        // Note: We deliberately do NOT conceal on diffY < 0 while scrolling main,
        // because dragging up is the natural motion for reading notes!
    }, []);

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
        <div
            className={`fixed inset-0 z-[90] flex flex-col ${bgClass} overflow-hidden`}
        >
            {/* Top Control Bar */}
            <header
                onTouchStart={handleTopTouchStart}
                onTouchEnd={handleTopTouchEnd}
                className={`h-16 px-3 sm:px-6 border-b flex items-center justify-between shrink-0 ${headerBgClass} transition-colors duration-300 relative select-none`}
            >
                {/* Left: Preaching Timer & Wall Clock */}
                <div className="flex items-center gap-2 sm:gap-6">
                    {/* Silent Preaching Timer */}
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-neutral-900/10 dark:bg-white/5 px-2 py-1.5 rounded-xl border border-black/5 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className={isTimerRunning ? "text-emerald-500 animate-pulse" : "text-neutral-400"} />
                            <span className="font-mono text-base sm:text-xl font-black tracking-tight select-none">
                                {formatTimer(elapsedSeconds)}
                            </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setIsTimerRunning(prev => !prev)}
                                className="p-1.5 sm:p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-xs transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95"
                                title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                            >
                                {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                            <button
                                onClick={() => setElapsedSeconds(0)}
                                className="p-1.5 sm:p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-xs transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95"
                                title="Reset Timer"
                            >
                                <RotateCcw size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Wall Clock (desktop only) */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold opacity-70">
                        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* Mobile Center: Tools Reveal/Conceal Button */}
                {isMobile && (
                    <button
                        onClick={() => setShowMobileControls(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-h-[38px] active:scale-95 ${showMobileControls ? 'bg-primary text-white shadow-sm' : 'bg-black/5 dark:bg-white/5 text-current border border-current/10'}`}
                        title={showMobileControls ? "Conceal Tools" : "Reveal Tools"}
                    >
                        <SlidersHorizontal size={13} />
                        <span>{showMobileControls ? 'Hide Tools' : 'Tools'}</span>
                    </button>
                )}

                {/* Center: Mode Toggle & Speed/Page Controls — hidden on mobile */}
                <div className="hidden sm:flex items-center gap-3">
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
                                    className="px-2 py-1.5 font-black opacity-70 hover:opacity-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
                                    title="Slower scroll"
                                >
                                    -
                                </button>
                                <span className="font-mono text-[11px] font-bold w-12 text-center select-none">
                                    {Math.round(pulpitScrollSpeed / 10)}x
                                </span>
                                <button
                                    onClick={() => setPulpitScrollSpeed(Math.min(250, pulpitScrollSpeed + 15))}
                                    className="px-2 py-1.5 font-black opacity-70 hover:opacity-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
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
                                className="p-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 rounded-lg text-xs min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Previous Page (PageUp)"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <span className="font-mono text-xs font-bold opacity-80 min-w-[60px] text-center select-none">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Next Page (PageDown / Space)"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Font Size (hidden on mobile), Contrast (hidden on mobile), Exit */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Font Size A- / A+ — hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setPulpitFontSize(Math.max(20, pulpitFontSize - 3))}
                            className="px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold"
                            title="Decrease Text Size"
                        >
                            A-
                        </button>
                        <span className="font-mono text-xs font-bold px-1 select-none">{pulpitFontSize}</span>
                        <button
                            onClick={() => setPulpitFontSize(Math.min(60, pulpitFontSize + 3))}
                            className="px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold"
                            title="Increase Text Size"
                        >
                            A+
                        </button>
                    </div>

                    {/* High Contrast Toggle — hidden on mobile */}
                    <button
                        onClick={() => setPulpitHighContrast(!pulpitHighContrast)}
                        className={`hidden sm:block px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${pulpitHighContrast
                            ? 'bg-yellow-400 text-black border-yellow-400 font-black'
                            : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                            }`}
                        title="Toggle High-Contrast Lectern Mode"
                    >
                        High Contrast
                    </button>

                    {/* Exit Presentation — always visible, larger on mobile */}
                    <button
                        onClick={onExit}
                        className="flex items-center gap-1.5 px-3 py-2 sm:px-3 sm:py-1.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-xs font-bold transition-all min-h-[40px] active:scale-95"
                        title="Exit Pulpit Mode (Esc)"
                    >
                        <LogOut size={15} />
                        <span className="hidden sm:inline">Exit</span>
                        <span className="sm:hidden font-black">Exit Pulpit</span>
                    </button>
                </div>
            </header>

            {/* Mobile scroll/paginate controls — collapsible, shown when showMobileControls=true */}
            {isMobile && (
                <div
                    onTouchStart={handleTopTouchStart}
                    onTouchEnd={handleTopTouchEnd}
                    className={`overflow-hidden transition-all duration-300 ease-in-out shrink-0 bg-light-surface dark:bg-[#121316] border-b border-light-border dark:border-dark-border shadow-lg ${showMobileControls ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                >
                    <div className="flex flex-col gap-2 p-3">
                        {/* Row 1: Mode toggle + Scroll/Paginate controls */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex bg-black/10 dark:bg-white/10 p-0.5 rounded-xl border border-black/5 dark:border-white/10 shrink-0">
                                <button
                                    onClick={() => { setPulpitModeType('scroll'); setIsAutoScrolling(false); }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] ${pulpitModeType === 'scroll' ? 'bg-emerald-600 text-white shadow-sm' : 'opacity-70'}`}
                                >
                                    Scroll
                                </button>
                                <button
                                    onClick={() => { setPulpitModeType('paginate'); setIsAutoScrolling(false); }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] ${pulpitModeType === 'paginate' ? 'bg-emerald-600 text-white shadow-sm' : 'opacity-70'}`}
                                >
                                    Pages
                                </button>
                            </div>

                            {pulpitModeType === 'scroll' ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsAutoScrolling(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all min-h-[36px] active:scale-95 ${isAutoScrolling ? 'bg-amber-600 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}
                                    >
                                        {isAutoScrolling ? <Pause size={14} /> : <Play size={14} />}
                                        <span>{isAutoScrolling ? 'Pause' : 'Auto-Scroll'}</span>
                                    </button>

                                    {/* Speed controls */}
                                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-xl text-xs">
                                        <button
                                            onClick={() => setPulpitScrollSpeed(Math.max(20, pulpitScrollSpeed - 15))}
                                            className="px-2 py-1 font-black opacity-70 hover:opacity-100 min-w-[30px] min-h-[30px] flex items-center justify-center active:scale-95"
                                            title="Slower"
                                        >
                                            -
                                        </button>
                                        <span className="font-mono text-xs font-bold w-8 text-center select-none">
                                            {Math.round(pulpitScrollSpeed / 10)}x
                                        </span>
                                        <button
                                            onClick={() => setPulpitScrollSpeed(Math.min(250, pulpitScrollSpeed + 15))}
                                            className="px-2 py-1 font-black opacity-70 hover:opacity-100 min-w-[30px] min-h-[30px] flex items-center justify-center active:scale-95"
                                            title="Faster"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrevPage} className="p-2 bg-black/10 dark:bg-white/10 rounded-xl min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95">
                                        <ChevronUp size={18} />
                                    </button>
                                    <span className="font-mono text-xs font-bold opacity-80 select-none min-w-[50px] text-center">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button onClick={handleNextPage} className="p-2 bg-emerald-600 text-white rounded-xl min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95">
                                        <ChevronDown size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Row 2: Font size, High contrast, and Conceal button */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-current/10">
                            {/* Font size */}
                            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                                <button
                                    onClick={() => setPulpitFontSize(Math.max(20, pulpitFontSize - 3))}
                                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-black min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
                                    title="Decrease font size"
                                >
                                    A-
                                </button>
                                <span className="font-mono text-xs font-bold px-2 select-none">{pulpitFontSize}px</span>
                                <button
                                    onClick={() => setPulpitFontSize(Math.min(60, pulpitFontSize + 3))}
                                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-black min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
                                    title="Increase font size"
                                >
                                    A+
                                </button>
                            </div>

                            {/* High Contrast Toggle */}
                            <button
                                onClick={() => setPulpitHighContrast(!pulpitHighContrast)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[32px] ${pulpitHighContrast
                                    ? 'bg-yellow-400 text-black border-yellow-400 font-black'
                                    : 'border-black/10 dark:border-white/10 opacity-70'
                                    }`}
                            >
                                Contrast
                            </button>

                            {/* Conceal Tools button */}
                            <button
                                onClick={() => setShowMobileControls(false)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 text-current rounded-xl text-xs font-black uppercase tracking-wider transition-all min-h-[34px] active:scale-95"
                                title="Conceal tools (distraction-free)"
                            >
                                <ChevronUp size={14} />
                                <span>Conceal</span>
                            </button>
                        </div>

                        {/* Swipe-up indicator drag handle */}
                        <div
                            onClick={() => setShowMobileControls(false)}
                            className="flex items-center justify-center gap-2 pt-1 opacity-40 cursor-pointer active:opacity-80"
                        >
                            <div className="w-8 h-1 rounded-full bg-current" />
                            <span className="text-[9px] font-black uppercase tracking-widest select-none">Swipe up or tap to conceal</span>
                            <div className="w-8 h-1 rounded-full bg-current" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Presentation Viewport */}
            <main
                ref={scrollContainerRef}
                onScroll={updatePagination}
                onTouchStart={handleMainTouchStart}
                onTouchEnd={handleMainTouchEnd}
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
            <footer className="h-8 px-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] opacity-50 shrink-0 select-none">
                <div className="flex items-center gap-2">
                    {isMobile
                        ? <span className="font-medium">Swipe ▼ for tools · Swipe ▲ to hide</span>
                        : <span className="font-medium">Spacebar / Clicker: Advance or Pause</span>
                    }
                </div>
                <div className="flex items-center gap-4">
                    {!isMobile && <span>ESC: Return to Edit</span>}
                </div>
            </footer>
        </div>
    );
};
