import { saveAs } from 'file-saver';
import { db } from '@/lib/db';
import type { ReadingPlan, ReadingPlanHistory } from '@/types/database';
import { generatePlanCalendarEntries } from './icsExportService';
import { sanitizePathName } from '@/stores/readingPlanStore';

export interface PlanMetrics {
    totalDays: number;
    completedDays: number;
    percentage: number;
    streakDays: number;
    totalReadingMinutes: number;
    notesCount: number;
}

export interface EnrichedPlanDay {
    dayNumber: number;
    date: Date;
    dateKey: string;
    title: string;
    passagesSummary: string;
    isCompleted: boolean;
    completedAt?: number;
    noteId?: string;
    completedItems?: string[];
    durationSeconds?: number;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
}

/**
 * Calculates high-level progress, streak, and time metrics for any reading plan.
 */
export const calculatePlanMetrics = (
    plan: ReadingPlan,
    historyList: ReadingPlanHistory[]
): PlanMetrics => {
    const scheduledEntries = generatePlanCalendarEntries(plan);
    const totalDays = Math.max(1, scheduledEntries.length);

    const completedEntries = historyList.filter(h => h.completedAt && h.completedAt > 0);
    const completedDays = completedEntries.length;
    const percentage = Math.min(100, Math.round((completedDays / totalDays) * 100));

    // Calculate reading duration & notes count
    const totalSeconds = historyList.reduce((acc, h) => acc + (h.readingDurationSeconds || 0), 0);
    const totalReadingMinutes = Math.round(totalSeconds / 60);
    const notesCount = historyList.filter(h => !!h.noteId).length;

    // Calculate consecutive day streak
    // Build set of completed date strings (YYYY-MM-DD)
    const completedDateSet = new Set<string>();
    completedEntries.forEach(h => {
        const d = new Date(h.completedAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        completedDateSet.add(`${yyyy}-${mm}-${dd}`);
    });

    // Check backwards from today (or yesterday if today isn't done yet)
    let streakDays = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const todayKey = toDateKey(checkDate);
    const isTodayDone = completedDateSet.has(todayKey);

    if (!isTodayDone) {
        // Move back to yesterday to see if active streak extends from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const key = toDateKey(checkDate);
        if (completedDateSet.has(key)) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return {
        totalDays,
        completedDays,
        percentage,
        streakDays,
        totalReadingMinutes,
        notesCount,
    };
};

/**
 * Combines scheduled calendar entries with historical completion records to produce
 * a complete paper trail for every single day of the reading plan.
 */
export const getEnrichedPlanDays = (
    plan: ReadingPlan,
    historyList: ReadingPlanHistory[]
): EnrichedPlanDay[] => {
    const scheduledEntries = generatePlanCalendarEntries(plan);
    const todayKey = toDateKey(new Date());

    // Map history by date key or planId-dateKey
    const historyMap = new Map<string, ReadingPlanHistory>();
    historyList.forEach(h => {
        // h.id is usually `planId-YYYY-MM-DD`
        const parts = h.id.split('-');
        if (parts.length >= 4) {
            const dateKey = parts.slice(-3).join('-');
            historyMap.set(dateKey, h);
        }
        if (h.completedAt) {
            historyMap.set(toDateKey(new Date(h.completedAt)), h);
        }
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return scheduledEntries.map(entry => {
        const dateKey = toDateKey(entry.date);
        const historyRecord = historyMap.get(dateKey);

        const entryDateNormalized = new Date(entry.date);
        entryDateNormalized.setHours(0, 0, 0, 0);

        const isToday = dateKey === todayKey;
        const isPast = entryDateNormalized.getTime() < now.getTime();
        const isFuture = entryDateNormalized.getTime() > now.getTime();

        const isCompleted = !!(historyRecord && historyRecord.completedAt && historyRecord.completedAt > 0);

        return {
            dayNumber: entry.dayNumber,
            date: entry.date,
            dateKey,
            title: entry.title,
            passagesSummary: entry.passagesSummary,
            isCompleted,
            completedAt: historyRecord?.completedAt,
            noteId: historyRecord?.noteId,
            completedItems: historyRecord?.completedItems,
            durationSeconds: historyRecord?.readingDurationSeconds,
            isToday,
            isPast,
            isFuture,
        };
    });
};

/**
 * Exports a ReadingPlan to an offline, portable .plan.json file.
 */
export const exportPlanToJsonFile = (plan: ReadingPlan) => {
    const payload = {
        app: 'parchments',
        version: 1,
        exportedAt: Date.now(),
        plan: {
            name: plan.name,
            type: plan.type,
            startDate: plan.startDate,
            endDate: plan.endDate,
            templateType: plan.templateType,
            tracks: plan.tracks,
            curatedSchedule: plan.curatedSchedule,
            wordStudyMeta: plan.wordStudyMeta,
        }
    };

    const fileName = `${sanitizePathName(plan.name)}.plan.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, fileName);
};

/**
 * Imports a ReadingPlan from a raw .plan.json string into IndexedDB.
 */
export const importPlanFromJson = async (rawJson: string): Promise<ReadingPlan> => {
    const parsed = JSON.parse(rawJson);
    const planData = parsed.plan || parsed;

    if (!planData.name) {
        throw new Error('Invalid plan file: missing plan name.');
    }

    const { useNoteStore } = await import('@/stores/noteStore');
    const { useReadingPlanStore } = await import('@/stores/readingPlanStore');

    const noteStoreState = useNoteStore.getState();
    const isLocalMode = noteStoreState.isLocalMode;

    let targetFolderId: string | null = null;
    const sanitizedPlanName = sanitizePathName(planData.name);

    if (isLocalMode && noteStoreState.localDirectoryHandle) {
        let parentFolder = noteStoreState.localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
        if (!parentFolder) {
            await noteStoreState.createLocalFolder('Lectio Study Journals', null);
            parentFolder = useNoteStore.getState().localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
        }

        if (parentFolder) {
            let subFolder = useNoteStore.getState().localFiles.find(
                f => f.name === sanitizedPlanName && f.parentId === parentFolder!.id && f.kind === 'directory'
            );
            if (!subFolder) {
                await noteStoreState.createLocalFolder(sanitizedPlanName, parentFolder.id);
                subFolder = useNoteStore.getState().localFiles.find(
                    f => f.name === sanitizedPlanName && f.parentId === parentFolder!.id && f.kind === 'directory'
                );
            }
            targetFolderId = subFolder ? subFolder.id : parentFolder.id;
        }
    } else {
        let folder = await db.folders.where('name').equals('Lectio Study Journals').first();
        if (!folder) {
            folder = await useNoteStore.getState().createFolder('Lectio Study Journals', null);
        }
        if (folder) {
            let subFolder = useNoteStore.getState().folders.find(
                f => f.name === sanitizedPlanName && f.parentId === folder!.id
            );
            if (!subFolder) {
                subFolder = await useNoteStore.getState().createFolder(sanitizedPlanName, folder.id);
            }
            targetFolderId = subFolder ? subFolder.id : folder.id;
        }
    }

    const durationDays = planData.endDate && planData.startDate
        ? Math.max(1, Math.ceil((planData.endDate - planData.startDate) / (1000 * 60 * 60 * 24)))
        : (planData.curatedSchedule ? planData.curatedSchedule.length : 30);

    const now = Date.now();
    const newStartDate = now;
    const newEndDate = now + (durationDays * 24 * 60 * 60 * 1000);

    const newPlan: ReadingPlan = {
        id: `plan-${Date.now()}`,
        name: planData.name,
        type: planData.type || 'sequential',
        status: 'active',
        startDate: newStartDate,
        endDate: newEndDate,
        tracks: (planData.tracks || []).map((t: any) => ({
            ...t,
            currentBook: t.startBook || t.currentBook || 'Genesis',
            currentChapter: 1,
            lastCompletedVerse: null
        })),
        folderId: targetFolderId,
        templateType: planData.templateType || 'lectio_divina',
        curatedSchedule: planData.curatedSchedule,
        wordStudyMeta: planData.wordStudyMeta,
    };

    await db.readingPlans.add(newPlan);
    await useReadingPlanStore.getState().loadPlans();

    return newPlan;
};

// Helper date formatter: YYYY-MM-DD
const toDateKey = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
