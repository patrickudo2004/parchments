import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar as CalendarIcon,
    ListFilter,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    FileText,
    Flame,
    Play,
    Check,
    AlertCircle,
    BookOpen
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { ReadingPlan } from '@/types/database';
import {
    calculatePlanMetrics,
    getEnrichedPlanDays,
    type EnrichedPlanDay
} from '@/lib/bible/planHistoryService';
import { useNoteStore } from '@/stores/noteStore';
import { useReadingPlanStore } from '@/stores/readingPlanStore';
import { useUIStore } from '@/stores/uiStore';

interface PlanHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: ReadingPlan | null;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PlanHistoryModal: React.FC<PlanHistoryModalProps> = ({
    isOpen,
    onClose,
    plan,
}) => {
    const { setCurrentNote, isLocalMode, localFiles, openLocalFile } = useNoteStore();
    const { startDailySession } = useReadingPlanStore();
    const { showToast } = useUIStore();

    const [activeTab, setActiveTab] = useState<'calendar' | 'timeline'>('calendar');
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'pending'>('all');

    // Calendar month navigation state (defaults to current date)
    const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

    // Live query for all history records of this plan
    const historyList = useLiveQuery(async () => {
        if (!plan) return [];
        return await db.readingPlanHistory.where('planId').equals(plan.id).toArray();
    }, [plan?.id]) || [];

    // Calculated metrics & daily itinerary
    const metrics = useMemo(() => {
        if (!plan) return null;
        return calculatePlanMetrics(plan, historyList);
    }, [plan, historyList]);

    const enrichedDays = useMemo(() => {
        if (!plan) return [];
        return getEnrichedPlanDays(plan, historyList);
    }, [plan, historyList]);

    // Map of dateKey -> EnrichedPlanDay
    const daysMap = useMemo(() => {
        const map = new Map<string, EnrichedPlanDay>();
        enrichedDays.forEach(d => map.set(d.dateKey, d));
        return map;
    }, [enrichedDays]);

    // Selected day detail
    const selectedDay = useMemo(() => {
        if (selectedDateKey && daysMap.has(selectedDateKey)) {
            return daysMap.get(selectedDateKey)!;
        }
        // Default to today or first day
        const todayKey = new Date().toISOString().split('T')[0];
        if (daysMap.has(todayKey)) {
            return daysMap.get(todayKey)!;
        }
        return enrichedDays[0] || null;
    }, [selectedDateKey, daysMap, enrichedDays]);

    // Calendar grid calculations
    const calendarGrid = useMemo(() => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days: ({ dayOfMonth: number; dateKey: string; date: Date } | null)[] = [];

        // Fill blanks for days before month start
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        // Fill month days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;
            days.push({ dayOfMonth: d, dateKey, date });
        }

        return days;
    }, [currentMonthDate]);

    // Filtered timeline days
    const filteredTimelineDays = useMemo(() => {
        if (filterMode === 'completed') return enrichedDays.filter(d => d.isCompleted);
        if (filterMode === 'pending') return enrichedDays.filter(d => !d.isCompleted);
        return enrichedDays;
    }, [enrichedDays, filterMode]);

    if (!isOpen || !plan || !metrics) return null;

    const handlePrevMonth = () => {
        setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleOpenJournalNote = async (noteId?: string) => {
        if (!noteId) {
            showToast('No journal note associated with this day.', 'info');
            return;
        }

        try {
            if (isLocalMode) {
                const localFile = localFiles.find(f => f.id === noteId);
                if (localFile) {
                    await openLocalFile(localFile);
                    onClose();
                    showToast('Loaded study journal note!', 'success');
                    return;
                }
            }

            const dbNote = await db.notes.get(noteId);
            if (dbNote) {
                setCurrentNote(dbNote);
                onClose();
                showToast('Loaded study journal note!', 'success');
            } else {
                showToast('Journal note not found in storage.', 'error');
            }
        } catch (err) {
            console.error('Failed to open journal note:', err);
            showToast('Error opening journal note.', 'error');
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    className="w-full max-w-4xl h-[92vh] sm:h-[86vh] bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-light-border dark:border-dark-border flex flex-col gap-4 shrink-0 bg-light-surface/90 dark:bg-dark-surface/90 backdrop-blur-md">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <BookOpen size={22} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">
                                            {plan.name}
                                        </h2>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                                            Paper Trail
                                        </span>
                                    </div>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                                        Passage History, Study Journals & Progress Calendar
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-2xl hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary active:scale-95 shrink-0"
                                title="Close (Esc)"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Metrics Bar & View Switcher */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                            {/* Stats Pills */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="px-3 py-1.5 rounded-xl bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-xs font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 size={13} className="text-emerald-500" />
                                    <span>{metrics.completedDays} / {metrics.totalDays} Days ({metrics.percentage}%)</span>
                                </div>

                                {metrics.streakDays > 0 && (
                                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 shadow-sm">
                                        <Flame size={13} className="text-amber-500 fill-amber-500" />
                                        <span>{metrics.streakDays}-Day Streak</span>
                                    </div>
                                )}

                                {metrics.totalReadingMinutes > 0 && (
                                    <div className="px-3 py-1.5 rounded-xl bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5 shadow-sm">
                                        <Clock size={13} />
                                        <span>{metrics.totalReadingMinutes}m Read Time</span>
                                    </div>
                                )}

                                <div className="px-3 py-1.5 rounded-xl bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5 shadow-sm">
                                    <FileText size={13} />
                                    <span>{metrics.notesCount} Notes</span>
                                </div>
                            </div>

                            {/* View Switcher Tabs */}
                            <div className="flex items-center gap-1 p-1 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-2xl shrink-0 self-start sm:self-auto">
                                <button
                                    onClick={() => setActiveTab('calendar')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        activeTab === 'calendar'
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary'
                                    }`}
                                >
                                    <CalendarIcon size={13} />
                                    <span>Calendar</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('timeline')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        activeTab === 'timeline'
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary'
                                    }`}
                                >
                                    <ListFilter size={13} />
                                    <span>Timeline</span>
                                </button>
                            </div>
                        </div>

                        {/* Overall Progress Line */}
                        <div className="w-full bg-light-background dark:bg-dark-background h-2 rounded-full overflow-hidden border border-light-border/40 dark:border-dark-border/40">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${metrics.percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Content Pane */}
                    <div className="flex-1 flex overflow-hidden">
                        {activeTab === 'calendar' ? (
                            /* CALENDAR VIEW */
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                {/* Calendar Grid Column */}
                                <div className="flex-1 p-4 sm:p-6 overflow-y-auto border-r border-light-border dark:border-dark-border space-y-4">
                                    {/* Month Header & Controls */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-serif font-black text-lg text-light-text-primary dark:text-dark-text-primary">
                                            {MONTH_NAMES[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={handlePrevMonth}
                                                className="p-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary"
                                                title="Previous month"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={handleNextMonth}
                                                className="p-2 rounded-xl border border-light-border dark:border-dark-border hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary"
                                                title="Next month"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Weekday Labels */}
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {WEEK_DAYS.map(day => (
                                            <div key={day} className="text-[11px] font-black uppercase text-light-text-secondary dark:text-dark-text-secondary py-1">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Month Day Cells */}
                                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                                        {calendarGrid.map((cell, index) => {
                                            if (!cell) {
                                                return <div key={`empty-${index}`} className="h-14 sm:h-16 rounded-xl opacity-0" />;
                                            }

                                            const dayData = daysMap.get(cell.dateKey);
                                            const isSelected = selectedDay?.dateKey === cell.dateKey;
                                            const isToday = cell.dateKey === new Date().toISOString().split('T')[0];

                                            return (
                                                <button
                                                    key={cell.dateKey}
                                                    onClick={() => setSelectedDateKey(cell.dateKey)}
                                                    className={`h-14 sm:h-16 p-1.5 rounded-xl border text-left transition-all relative flex flex-col justify-between touch-manipulation cursor-pointer ${
                                                        isSelected
                                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                                            : isToday
                                                            ? 'border-primary/60 bg-light-background dark:bg-dark-background'
                                                            : dayData?.isCompleted
                                                            ? 'border-emerald-500/30 bg-emerald-500/5'
                                                            : 'border-light-border/70 dark:border-dark-border/70 hover:bg-light-background dark:hover:bg-dark-background'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-xs font-black ${
                                                            isSelected ? 'text-primary' : isToday ? 'text-primary font-black' : 'text-light-text-primary dark:text-dark-text-primary'
                                                        }`}>
                                                            {cell.dayOfMonth}
                                                        </span>
                                                        {dayData?.isCompleted && (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                                <Check size={10} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {dayData && (
                                                        <div className="min-w-0">
                                                            <div className={`text-[9px] font-black uppercase tracking-tight truncate ${
                                                                dayData.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-light-text-secondary dark:text-dark-text-secondary'
                                                            }`}>
                                                                Day {dayData.dayNumber}
                                                            </div>
                                                            <div className="text-[9px] text-light-text-secondary/80 truncate hidden sm:block">
                                                                {dayData.passagesSummary}
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Day Inspection Detail Column / Drawer */}
                                <div className="w-full md:w-80 lg:w-96 p-4 sm:p-6 bg-light-sidebar dark:bg-dark-sidebar flex flex-col shrink-0 overflow-y-auto space-y-5">
                                    {selectedDay ? (
                                        <>
                                            <div className="space-y-1 pb-3 border-b border-light-border dark:border-dark-border">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-widest text-primary">
                                                        Day {selectedDay.dayNumber}
                                                    </span>
                                                    {selectedDay.isCompleted ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                                                            <Check size={10} /> Completed
                                                        </span>
                                                    ) : selectedDay.isToday ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/15 text-primary border border-primary/30">
                                                            Today's Reading
                                                        </span>
                                                    ) : selectedDay.isPast ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                                                            <AlertCircle size={10} /> Missed Session
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-light-background dark:bg-dark-background text-light-text-secondary border border-light-border dark:border-dark-border">
                                                            Scheduled
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-serif font-black text-lg text-light-text-primary dark:text-dark-text-primary">
                                                    {selectedDay.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                                </h4>
                                            </div>

                                            {/* Passages List */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-light-text-secondary">
                                                    Assigned Scripture Passages
                                                </label>
                                                <div className="p-3.5 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl space-y-1 shadow-sm">
                                                    <div className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                                        {selectedDay.passagesSummary}
                                                    </div>
                                                    {selectedDay.completedItems && selectedDay.completedItems.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {selectedDay.completedItems.map(item => (
                                                                <span key={item} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[10px] font-bold">
                                                                    ✓ {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Completion Metadata */}
                                            {selectedDay.isCompleted && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-light-text-secondary">
                                                        Session Record
                                                    </label>
                                                    <div className="p-3 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl text-xs space-y-1.5">
                                                        {selectedDay.completedAt && (
                                                            <div className="flex items-center justify-between text-light-text-secondary">
                                                                <span>Completed on:</span>
                                                                <span className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                                                    {new Date(selectedDay.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {selectedDay.durationSeconds && (
                                                            <div className="flex items-center justify-between text-light-text-secondary">
                                                                <span>Time Spent:</span>
                                                                <span className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                                                    {Math.round(selectedDay.durationSeconds / 60)} minutes
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="space-y-2 pt-2 mt-auto">
                                                {selectedDay.noteId ? (
                                                    <button
                                                        onClick={() => handleOpenJournalNote(selectedDay.noteId)}
                                                        className="w-full py-3 px-4 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                                                    >
                                                        <FileText size={15} />
                                                        <span>Open Study Journal</span>
                                                    </button>
                                                ) : selectedDay.isCompleted ? (
                                                    <div className="text-center text-xs text-light-text-secondary p-2">
                                                        Reading completed without journal note.
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            startDailySession(plan.id);
                                                        }}
                                                        className="w-full py-3 px-4 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                                                    >
                                                        <Play size={14} fill="white" />
                                                        <span>Read this Session</span>
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-xs text-light-text-secondary">
                                            Select a date to inspect passage record
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* TIMELINE / ITINERARY LIST VIEW */
                            <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
                                {/* Filter Bar */}
                                <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                                    <span className="text-xs font-bold text-light-text-secondary">
                                        Showing {filteredTimelineDays.length} Days
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {(['all', 'completed', 'pending'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setFilterMode(mode)}
                                                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                                                    filterMode === mode
                                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                                        : 'text-light-text-secondary hover:text-light-text-primary'
                                                }`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scrollable List */}
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {filteredTimelineDays.map(day => (
                                        <div
                                            key={day.dateKey}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left ${
                                                day.isCompleted
                                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                                    : day.isToday
                                                    ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                                                    : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                                                        day.isCompleted
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-text-secondary'
                                                    }`}
                                                >
                                                    {day.isCompleted ? <Check size={16} strokeWidth={3} /> : day.dayNumber}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black uppercase tracking-wider text-light-text-secondary">
                                                            {day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <span className="text-xs font-serif font-bold text-light-text-primary dark:text-dark-text-primary">
                                                            {day.passagesSummary}
                                                        </span>
                                                    </div>

                                                    <div className="text-[11px] text-light-text-secondary flex items-center gap-2 mt-0.5">
                                                        <span>{day.title}</span>
                                                        {day.durationSeconds && (
                                                            <span>• {Math.round(day.durationSeconds / 60)} mins</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action on row */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                {day.noteId ? (
                                                    <button
                                                        onClick={() => handleOpenJournalNote(day.noteId)}
                                                        className="px-3.5 py-1.5 rounded-xl border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <FileText size={13} />
                                                        <span>View Journal</span>
                                                    </button>
                                                ) : !day.isCompleted ? (
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            startDailySession(plan.id);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors flex items-center gap-1.5"
                                                    >
                                                        <Play size={11} fill="white" />
                                                        <span>Read</span>
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}

                                    {filteredTimelineDays.length === 0 && (
                                        <div className="p-8 text-center text-xs text-light-text-secondary">
                                            No days matching filter.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
