import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import type { ReadingPlan, ReadingPlanTrack, Note, PlanType, CuratedPlanDay } from '@/types/database';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { v4 as uuidv4 } from 'uuid';
import { fileSystem, type FileSystemDirectoryHandle } from '@/lib/filesystem/FileSystemService';

interface ReadingPlanState {
    activePlans: ReadingPlan[];
    activePlanId: string | null;
    activeNoteId: string | null;
    isLectioModeActive: boolean;
    importingState: { status: string; progress: number } | null;
    readerStyle: 'scroll' | 'page';

    // Actions
    loadPlans: () => Promise<void>;
    createPlan: (
        name: string,
        startDate: number,
        endDate: number,
        tracks: Omit<ReadingPlanTrack, 'currentBook' | 'currentChapter'>[],
        templateType?: 'freeform' | 'lectio_divina'
    ) => Promise<ReadingPlan>;
    createCuratedPlan: (
        name: string,
        startDate: number,
        endDate: number,
        type: PlanType,
        curatedSchedule: CuratedPlanDay[],
        templateType?: 'freeform' | 'lectio_divina',
        wordStudyMeta?: ReadingPlan['wordStudyMeta']
    ) => Promise<ReadingPlan>;
    startDailySession: (planId: string) => Promise<void>;
    pinVerseToActiveJournal: (verseText: string, reference: string) => Promise<void>;
    completeDailySession: () => Promise<void>;
    toggleChapterCompletion: (planId: string, itemRef: string) => Promise<void>;
    updateReadingDuration: (planId: string, durationSeconds: number) => Promise<void>;
    recalculatePlanGrace: (planId: string) => Promise<void>;
    deletePlan: (planId: string) => Promise<void>;
    exitLectioMode: () => void;
    setReaderStyle: (style: 'scroll' | 'page') => void;
}

// Helpers for advancing tracks inside their natural boundaries
const getTrackGroupEndBook = (startBook: string): string => {
    const startIndex = BIBLE_BOOKS.findIndex(b => b.name === startBook);
    if (startIndex >= 0 && startIndex <= 38) {
        return 'Malachi'; // Old Testament
    }
    if (startIndex >= 39 && startIndex <= 65) {
        return 'Revelation'; // New Testament
    }
    return startBook; // Isolated range (e.g. Psalms, Proverbs)
};

export const advanceChapters = (
    book: string,
    chapter: number,
    amount: number,
    startBookName: string,
    explicitEndBook?: string
): { book: string; chapter: number; isCompleted?: boolean } => {
    const endBookName = explicitEndBook || getTrackGroupEndBook(startBookName);
    const startIndex = BIBLE_BOOKS.findIndex(b => b.name === startBookName);
    const endIndex = BIBLE_BOOKS.findIndex(b => b.name === endBookName);
    let currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === book);

    if (currentBookIndex === -1) {
        currentBookIndex = startIndex !== -1 ? startIndex : 0;
    }

    let newChapter = chapter + amount;
    const limitIndex = endIndex !== -1 ? endIndex : BIBLE_BOOKS.length - 1;
    const firstIndex = startIndex !== -1 ? startIndex : 0;

    while (currentBookIndex <= limitIndex) {
        const bookData = BIBLE_BOOKS[currentBookIndex];
        if (newChapter <= bookData.chapters) {
            return { book: bookData.name, chapter: newChapter, isCompleted: false };
        }

        newChapter -= bookData.chapters;
        currentBookIndex++;
    }

    // If an explicit endBook was set and we advanced beyond it, mark completed and clamp
    if (explicitEndBook) {
        const finalBookData = BIBLE_BOOKS[limitIndex] || BIBLE_BOOKS[BIBLE_BOOKS.length - 1];
        return { book: finalBookData.name, chapter: finalBookData.chapters, isCompleted: true };
    }

    // Wrapped around to the start of the track
    return { book: BIBLE_BOOKS[firstIndex].name, chapter: 1, isCompleted: false };
};

// Generates the daily reading plan track segments list
export const getDailySegments = (track: ReadingPlanTrack): { book: string; chapters: number[] }[] => {
    const segments: { book: string; chapters: number[] }[] = [];
    const endBook = track.endBook || getTrackGroupEndBook(track.startBook);
    const limitIndex = BIBLE_BOOKS.findIndex(b => b.name === endBook);
    
    let currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === track.currentBook);
    if (currentBookIndex === -1) currentBookIndex = 0;
    
    let chaptersToGather = track.chaptersPerDay;
    let currentChapter = track.currentChapter;

    while (chaptersToGather > 0 && currentBookIndex <= limitIndex) {
        const bookData = BIBLE_BOOKS[currentBookIndex];
        const chaptersInThisBook = bookData.chapters;
        
        const chaptersList: number[] = [];
        while (currentChapter <= chaptersInThisBook && chaptersToGather > 0) {
            chaptersList.push(currentChapter);
            currentChapter++;
            chaptersToGather--;
        }

        if (chaptersList.length > 0) {
            segments.push({
                book: bookData.name,
                chapters: chaptersList
            });
        }

        // Move to the next book
        if (chaptersToGather > 0) {
            currentBookIndex++;
            currentChapter = 1;
        }
    }

    // Only wrap around if NO explicit endBook was specified and track is cyclic
    if (chaptersToGather > 0 && !track.endBook) {
        const firstBookIndex = BIBLE_BOOKS.findIndex(b => b.name === track.startBook);
        currentBookIndex = firstBookIndex !== -1 ? firstBookIndex : 0;
        currentChapter = 1;

        while (chaptersToGather > 0 && currentBookIndex <= limitIndex) {
            const bookData = BIBLE_BOOKS[currentBookIndex];
            const chaptersInThisBook = bookData.chapters;
            
            const chaptersList: number[] = [];
            while (currentChapter <= chaptersInThisBook && chaptersToGather > 0) {
                chaptersList.push(currentChapter);
                currentChapter++;
                chaptersToGather--;
            }

            if (chaptersList.length > 0) {
                const existingSegment = segments.find(s => s.book === bookData.name);
                if (existingSegment) {
                    existingSegment.chapters = [...existingSegment.chapters, ...chaptersList];
                } else {
                    segments.push({
                        book: bookData.name,
                        chapters: chaptersList
                    });
                }
            }

            if (chaptersToGather > 0) {
                currentBookIndex++;
                currentChapter = 1;
            }
        }
    }

    return segments;
};

export const sanitizePathName = (name: string): string => {
    return name.replace(/[:/\\*?"<>|]/g, '-');
};

export const getPlanMetadataAndHistory = async (planId: string) => {
    const history = await db.readingPlanHistory.where('planId').equals(planId).toArray();
    const notes: Record<string, any> = {};
    
    for (const record of history) {
        if (record.noteId) {
            const note = await db.notes.get(record.noteId);
            if (note) {
                notes[record.noteId] = {
                    title: note.title,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt
                };
            }
        }
    }
    return { history, notes };
};

export const updateLocalPlanJson = async (plan: ReadingPlan) => {
    const { useNoteStore } = await import('@/stores/noteStore');
    const noteStoreState = useNoteStore.getState();
    if (!noteStoreState.isLocalMode || !noteStoreState.localDirectoryHandle) return;

    try {
        const localFiles = noteStoreState.localFiles;
        const parentFolder = localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
        if (!parentFolder) return;

        const sanitizedName = sanitizePathName(plan.name);
        const subFolder = localFiles.find(f => f.name === sanitizedName && f.parentId === parentFolder.id && f.kind === 'directory');
        if (!subFolder) return;

        const subFolderHandle = subFolder.handle as FileSystemDirectoryHandle;
        const { history, notes } = await getPlanMetadataAndHistory(plan.id);
        const manifest = {
            id: plan.id,
            name: plan.name,
            startDate: plan.startDate,
            endDate: plan.endDate,
            status: plan.status,
            tracks: plan.tracks,
            history,
            notes
        };

        // Write plan.json physically
        await fileSystem.createFile(subFolderHandle, 'plan.json', JSON.stringify(manifest, null, 2));
        console.log(`[Local Plan JSON] Updated plan.json physically for: ${plan.name}`);
    } catch (err) {
        console.error('[readingPlanStore] Failed to update local plan.json:', err);
    }
};

export const useReadingPlanStore = create<ReadingPlanState>()(
    persist(
        (set, get) => ({
            activePlans: [],
            activePlanId: null,
            activeNoteId: null,
            isLectioModeActive: false,
            importingState: null,
            readerStyle: 'scroll',

            setReaderStyle: (readerStyle) => set({ readerStyle }),

            loadPlans: async () => {
                const plans = await db.readingPlans.toArray();
                set({ activePlans: plans });

                // Automatically re-join sync rooms for active shared plans in background
                plans.forEach(plan => {
                    if (plan.syncRoomHash && plan.status === 'active') {
                        import('@/lib/sync/PlanSyncManager').then(({ PlanSyncManager }) => {
                            PlanSyncManager.joinPlanRoom(plan.syncRoomHash!);
                        }).catch(err => {
                            console.warn('[readingPlanStore] Failed to auto-reconnect plan sync room:', err);
                        });
                    }
                });
            },

            createPlan: async (name, startDate, endDate, tracks, templateType = 'freeform') => {
                // Dynamically import noteStore to avoid circular dependency
                const { useNoteStore } = await import('@/stores/noteStore');
                const noteStoreState = useNoteStore.getState();
                const isLocalMode = noteStoreState.isLocalMode;

                let targetFolderId: string | null = null;

                if (isLocalMode) {
                    const localFiles = noteStoreState.localFiles;
                    let localFolder = localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                    if (!localFolder) {
                        await noteStoreState.createLocalFolder('Lectio Study Journals', null);
                        const refreshedFiles = useNoteStore.getState().localFiles;
                        localFolder = refreshedFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                    }
                    
                    if (localFolder) {
                        const sanitizedPlanName = sanitizePathName(name);
                        let subFolder = useNoteStore.getState().localFiles.find(
                            f => f.name === sanitizedPlanName && f.parentId === localFolder!.id && f.kind === 'directory'
                        );
                        if (!subFolder) {
                            await noteStoreState.createLocalFolder(sanitizedPlanName, localFolder.id);
                            const refreshedFiles = useNoteStore.getState().localFiles;
                            subFolder = refreshedFiles.find(
                                f => f.name === sanitizedPlanName && f.parentId === localFolder!.id && f.kind === 'directory'
                            );
                        }
                        targetFolderId = subFolder ? subFolder.id : localFolder.id;
                    }
                } else {
                    let folder = await db.folders.where('name').equals('Lectio Study Journals').first();
                    if (!folder) {
                        const timestamp = Date.now();
                        folder = {
                            id: uuidv4(),
                            name: 'Lectio Study Journals',
                            parentId: null,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            order: 0
                        };
                        await db.folders.add(folder);
                    }
                    targetFolderId = folder.id;
                }

                const fullTracks: ReadingPlanTrack[] = tracks.map(t => ({
                    ...t,
                    currentBook: t.startBook,
                    currentChapter: 1,
                    lastCompletedVerse: null
                }));

                const newPlan: ReadingPlan = {
                    id: `plan-${Date.now()}`,
                    name,
                    type: 'sequential',
                    status: 'active',
                    startDate,
                    endDate,
                    tracks: fullTracks,
                    folderId: targetFolderId,
                    templateType
                };

                await db.readingPlans.add(newPlan);
                if (isLocalMode) {
                    await updateLocalPlanJson(newPlan);
                }
                await get().loadPlans();
                return newPlan;
            },

            createCuratedPlan: async (name, startDate, endDate, type, curatedSchedule, templateType = 'lectio_divina', wordStudyMeta) => {
                const { useNoteStore } = await import('@/stores/noteStore');
                const noteStoreState = useNoteStore.getState();
                const isLocalMode = noteStoreState.isLocalMode;

                let targetFolderId: string | null = null;

                if (isLocalMode) {
                    const localFiles = noteStoreState.localFiles;
                    let localFolder = localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                    if (!localFolder) {
                        await noteStoreState.createLocalFolder('Lectio Study Journals', null);
                        const refreshedFiles = useNoteStore.getState().localFiles;
                        localFolder = refreshedFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                    }
                    
                    if (localFolder) {
                        const sanitizedPlanName = sanitizePathName(name);
                        let subFolder = useNoteStore.getState().localFiles.find(
                            f => f.name === sanitizedPlanName && f.parentId === localFolder!.id && f.kind === 'directory'
                        );
                        if (!subFolder) {
                            await noteStoreState.createLocalFolder(sanitizedPlanName, localFolder.id);
                            const refreshedFiles = useNoteStore.getState().localFiles;
                            subFolder = refreshedFiles.find(
                                f => f.name === sanitizedPlanName && f.parentId === localFolder!.id && f.kind === 'directory'
                            );
                        }
                        targetFolderId = subFolder ? subFolder.id : localFolder.id;
                    }
                } else {
                    let folder = await db.folders.where('name').equals('Lectio Study Journals').first();
                    if (!folder) {
                        const timestamp = Date.now();
                        folder = {
                            id: uuidv4(),
                            name: 'Lectio Study Journals',
                            parentId: null,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            order: 0
                        };
                        await db.folders.add(folder);
                    }
                    targetFolderId = folder.id;
                }

                const newPlan: ReadingPlan = {
                    id: `plan-${Date.now()}`,
                    name,
                    type,
                    status: 'active',
                    startDate,
                    endDate,
                    tracks: [],
                    folderId: targetFolderId,
                    templateType,
                    curatedSchedule,
                    wordStudyMeta
                };

                await db.readingPlans.add(newPlan);
                if (isLocalMode) {
                    await updateLocalPlanJson(newPlan);
                }
                await get().loadPlans();
                return newPlan;
            },

            startDailySession: async (planId) => {
                const plan = await db.readingPlans.get(planId);
                if (!plan) return;

                // 1. Check if the user has already read today
                const dateKey = new Date().toISOString().split('T')[0];
                const historyId = `${planId}-${dateKey}`;
                let existingHistory = await db.readingPlanHistory.get(historyId);

                // Use deterministic ID
                let noteId = existingHistory?.noteId || `note-lectio-${planId}-${dateKey}`;

                // Read ahead logic: If today is already complete, open tomorrow's pre-seeded note early if it exists
                if (existingHistory && existingHistory.completedAt > 0) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowDateKey = tomorrow.toISOString().split('T')[0];
                    const tomorrowHistoryId = `${planId}-${tomorrowDateKey}`;
                    const tomorrowHistory = await db.readingPlanHistory.get(tomorrowHistoryId);
                    if (tomorrowHistory) {
                        existingHistory = tomorrowHistory;
                        noteId = tomorrowHistory.noteId || '';
                        console.log(`[readingPlanStore] Today is complete. Opening tomorrow's pre-seeded note early: ${noteId}`);
                    }
                }

                // 2. If no session note exists for today, create one auto-populated with headings
                if (!existingHistory) {
                    const dateString = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

                    // Determine passages summary for template
                    let initialContent = '';
                    const isCurated = plan.curatedSchedule && plan.curatedSchedule.length > 0;

                    if (isCurated) {
                        // Find current day in curated schedule based on completed history count
                        const completedCount = await db.readingPlanHistory
                            .where('planId')
                            .equals(planId)
                            .filter(h => h.completedAt > 0)
                            .count();
                        const activeCuratedDay = plan.curatedSchedule![completedCount] || plan.curatedSchedule![0];
                        const passagesSummary = activeCuratedDay.passages.map(p => {
                            const range = p.verseStart ? `:${p.verseStart}${p.verseEnd ? `-${p.verseEnd}` : ''}` : '';
                            return `${p.book} ${p.chapter}${range}`;
                        }).join(', ');

                        if (plan.templateType === 'lectio_divina') {
                            initialContent = `<h1 class="text-3xl font-black mb-2">Lectio Study Journal: ${dateString}</h1>`;
                            initialContent += `<p class="text-xs text-light-text-secondary dark:text-dark-text-secondary italic mb-6">Plan: <b>${plan.name}</b> • Today: <b>${activeCuratedDay.title || passagesSummary}</b></p>`;
                            if (plan.wordStudyMeta) {
                                initialContent += `<div class="p-3 mb-6 rounded-xl bg-primary/10 border border-primary/20 text-xs font-serif leading-relaxed"><strong>Word Study:</strong> ${plan.wordStudyMeta.query} ${plan.wordStudyMeta.strongNumber ? `(${plan.wordStudyMeta.strongNumber})` : ''} - <em>${plan.wordStudyMeta.definition || ''}</em></div>`;
                            }
                            initialContent += `<section class="lectio-stage-1 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">📖 1. Lectio (Reading)</h2><p class="text-xs italic text-light-text-secondary mb-2">Read slowly and attentively. What word, phrase, or verse catches your attention?</p><blockquote><p><em>(Tap the Pin button next to any verse on the left to pin it here)</em></p></blockquote></section>`;
                            initialContent += `<section class="lectio-stage-2 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">💡 2. Meditatio (Meditation)</h2><p class="text-xs italic text-light-text-secondary mb-2">Ruminate on the text. Why is God speaking this word to your heart today? What thoughts or convictions are stirred?</p><p></p></section>`;
                            initialContent += `<section class="lectio-stage-3 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">🙏 3. Oratio (Prayer)</h2><p class="text-xs italic text-light-text-secondary mb-2">Speak openly to God in prayer. Confess, praise, question, or petition Him in response to His word.</p><p></p></section>`;
                            initialContent += `<section class="lectio-stage-4 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">🕊️ 4. Contemplatio (Contemplation)</h2><p class="text-xs italic text-light-text-secondary mb-2">Rest in quiet stillness in God's presence beyond words. Allow the Truth to transform your inner soul.</p><p></p></section>`;
                            initialContent += `<section class="lectio-stage-5 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">⚡ 5. Actio (Action & Life Application)</h2><p class="text-xs italic text-light-text-secondary mb-2">How will you embody this revelation today? Name one concrete, tangible step of love or obedience.</p><p></p></section>`;
                        } else {
                            initialContent = `<h1 class="text-3xl font-black mb-4">Lectio Study Journal: ${dateString}</h1>`;
                            initialContent += `<p class="text-xs text-light-text-secondary dark:text-dark-text-secondary italic mb-8">Daily companion for plan: <b>${plan.name}</b> (${passagesSummary})</p>`;
                            initialContent += `<h2 class="text-xl font-bold mt-6 border-b border-light-border dark:border-dark-border pb-1">📖 Assigned Passages: ${passagesSummary}</h2>`;
                            initialContent += `<p class="text-sm italic text-light-text-disabled mt-2">Write down your key reflections and notes for today's reading here...</p><br/>`;
                        }
                    } else {
                        // Sequential track template
                        const trackSummaries = plan.tracks.map(track => {
                            const segments = getDailySegments(track);
                            const chaptersString = segments
                                .map(s => `${s.book} ${s.chapters[0]}${s.chapters.length > 1 ? `-${s.chapters[s.chapters.length - 1]}` : ''}`)
                                .join(', ');
                            return { title: track.name, chaptersSummary: chaptersString };
                        });
                        const passagesSummary = trackSummaries.map(t => `${t.title}: ${t.chaptersSummary}`).join(' • ');

                        if (plan.templateType === 'lectio_divina') {
                            initialContent = `<h1 class="text-3xl font-black mb-2">Lectio Study Journal: ${dateString}</h1>`;
                            initialContent += `<p class="text-xs text-light-text-secondary dark:text-dark-text-secondary italic mb-6">Plan: <b>${plan.name}</b> • Readings: <b>${passagesSummary}</b></p>`;
                            initialContent += `<section class="lectio-stage-1 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">📖 1. Lectio (Reading)</h2><p class="text-xs italic text-light-text-secondary mb-2">Read slowly and attentively. What word, phrase, or verse catches your attention?</p><blockquote><p><em>(Tap the Pin button next to any verse on the left to pin it here)</em></p></blockquote></section>`;
                            initialContent += `<section class="lectio-stage-2 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">💡 2. Meditatio (Meditation)</h2><p class="text-xs italic text-light-text-secondary mb-2">Ruminate on the text. Why is God speaking this word to your heart today? What thoughts or convictions are stirred?</p><p></p></section>`;
                            initialContent += `<section class="lectio-stage-3 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">🙏 3. Oratio (Prayer)</h2><p class="text-xs italic text-light-text-secondary mb-2">Speak openly to God in prayer. Confess, praise, question, or petition Him in response to His word.</p><p></p></section>`;
                            initialContent += `<section class="lectio-stage-4 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">🕊️ 4. Contemplatio (Contemplation)</h2><p class="text-xs italic text-light-text-secondary mb-2">Rest in quiet stillness in God's presence beyond words. Allow the Truth to transform your inner soul.</p><p></p></section>`;
                            initialContent += `<section class="lectio-stage-5 mb-6"><h2 class="text-lg font-bold text-primary flex items-center gap-2">⚡ 5. Actio (Action & Life Application)</h2><p class="text-xs italic text-light-text-secondary mb-2">How will you embody this revelation today? Name one concrete, tangible step of love or obedience.</p><p></p></section>`;
                        } else {
                            initialContent = `<h1 class="text-3xl font-black mb-4">Lectio Study Journal: ${dateString}</h1>`;
                            initialContent += `<p class="text-xs text-light-text-secondary dark:text-dark-text-secondary italic mb-8">Daily reading companion for plan: <b>${plan.name}</b></p>`;
                            trackSummaries.forEach(t => {
                                initialContent += `<h2 class="text-xl font-bold mt-6 border-b border-light-border dark:border-dark-border pb-1">📖 ${t.title} (${t.chaptersSummary})</h2>`;
                                initialContent += `<p class="text-sm italic text-light-text-disabled mt-2">Write down your key takeaways and inspired summaries for this track here...</p><br/>`;
                            });
                        }
                    }

                    // Dynamically import noteStore to avoid circular dependency
                    const { useNoteStore } = await import('@/stores/noteStore');
                    const noteStoreState = useNoteStore.getState();
                    const isLocalMode = noteStoreState.isLocalMode;
                    const localDirectoryHandle = noteStoreState.localDirectoryHandle;

                    const title = `Lectio Journal - ${dateString}`;

                    if (isLocalMode && localDirectoryHandle) {
                        let parentFolder = noteStoreState.localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                        if (!parentFolder) {
                            await noteStoreState.createLocalFolder('Lectio Study Journals', null);
                            parentFolder = useNoteStore.getState().localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                        }

                        let targetFolderId = null;
                        if (parentFolder) {
                            const sanitizedPlanName = sanitizePathName(plan.name);
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

                        // Create in local folder physically inside plan subfolder
                        await noteStoreState.createLocalNote(title, targetFolderId, initialContent, noteId);
                    } else {
                        // Add note directly in IndexedDB inside the plan's folder
                        const timestamp = Date.now();
                        const newNote: Note = {
                            id: noteId,
                            title,
                            content: initialContent,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            folderId: plan.folderId,
                            tags: ['lectio', plan.name.toLowerCase().replace(/[^a-z0-9]/g, '-')],
                            type: 'text'
                        };
                        await db.notes.add(newNote);
                    }

                    // Add history record
                    await db.readingPlanHistory.put({
                        id: historyId,
                        planId,
                        completedAt: 0, // 0 signifies in progress
                        noteId,
                        completedItems: []
                    });

                    // Flush updated plan.json physically
                    if (isLocalMode) {
                        await updateLocalPlanJson(plan);
                    }

                    // Broadcast P2P plan sync
                    import('@/lib/sync/PlanSyncManager').then(({ PlanSyncManager }) => {
                        PlanSyncManager.broadcastPlanUpdate(planId);
                    });
                }

                set({
                    activePlanId: planId,
                    activeNoteId: noteId,
                    isLectioModeActive: true
                });
            },

            toggleChapterCompletion: async (planId, itemRef) => {
                const dateKey = new Date().toISOString().split('T')[0];
                const historyId = `${planId}-${dateKey}`;
                let history = await db.readingPlanHistory.get(historyId);
                if (!history) {
                    history = {
                        id: historyId,
                        planId,
                        completedAt: 0,
                        completedItems: []
                    };
                }
                const completedItems = history.completedItems || [];
                const updatedItems = completedItems.includes(itemRef)
                    ? completedItems.filter(i => i !== itemRef)
                    : [...completedItems, itemRef];
                
                await db.readingPlanHistory.put({
                    ...history,
                    completedItems: updatedItems
                });
            },

            updateReadingDuration: async (planId, durationSeconds) => {
                const dateKey = new Date().toISOString().split('T')[0];
                const historyId = `${planId}-${dateKey}`;
                const history = await db.readingPlanHistory.get(historyId);
                if (history) {
                    await db.readingPlanHistory.update(historyId, {
                        readingDurationSeconds: (history.readingDurationSeconds || 0) + durationSeconds
                    });
                }
            },

            pinVerseToActiveJournal: async (verseText, reference) => {
                const { activeNoteId } = get();
                if (!activeNoteId) return;

                // Format as a beautiful markdown/HTML blockquote in Tiptap format
                const pinBlock = `<blockquote><p><strong>${reference}</strong> - ${verseText}</p></blockquote><p></p>`;

                const { useNoteStore } = await import('@/stores/noteStore');
                const noteStoreState = useNoteStore.getState();
                const isLocalMode = noteStoreState.isLocalMode;

                let newContent = '';

                if (isLocalMode) {
                    const currentNote = noteStoreState.currentNote;
                    if (currentNote && currentNote.id === activeNoteId) {
                        newContent = currentNote.content + pinBlock;
                        await noteStoreState.saveCurrentNote(currentNote.title, newContent);
                    }
                } else {
                    const note = await db.notes.get(activeNoteId);
                    if (!note) return;

                    newContent = note.content + pinBlock;

                    await db.notes.update(activeNoteId, {
                        content: newContent,
                        updatedAt: Date.now()
                    });
                }

                // Trigger update in UI if active in editor
                const uiStore = (window as any).useUIStore || null;
                const editor = uiStore ? (uiStore.getState?.().activeEditor || uiStore.getState?.().editor) : null;
                if (editor && editor.getHTML) {
                    const latestNote = useNoteStore.getState().currentNote;
                    if (latestNote && latestNote.id === activeNoteId) {
                        editor.commands.setContent(latestNote.content);
                    } else if (newContent) {
                        editor.commands.setContent(newContent);
                    }
                }
            },

            completeDailySession: async () => {
                const { activePlanId, activeNoteId } = get();
                if (!activePlanId || !activeNoteId) return;

                const plan = await db.readingPlans.get(activePlanId);
                if (!plan) return;

                const isCurated = plan.curatedSchedule && plan.curatedSchedule.length > 0;

                if (!isCurated) {
                    // 1. Advance track cursors based on chaptersPerDay and endBook
                    let allTracksFinished = true;
                    const updatedTracks = plan.tracks.map(track => {
                        const nextPosition = advanceChapters(
                            track.currentBook,
                            track.currentChapter,
                            track.chaptersPerDay,
                            track.startBook,
                            track.endBook
                        );
                        if (!nextPosition.isCompleted) {
                            allTracksFinished = false;
                        }
                        return {
                            ...track,
                            currentBook: nextPosition.book,
                            currentChapter: nextPosition.chapter
                        };
                    });

                    const planStatus = (allTracksFinished && plan.tracks.some(t => !!t.endBook)) ? 'completed' : plan.status;

                    await db.readingPlans.update(activePlanId, {
                        tracks: updatedTracks,
                        status: planStatus
                    });
                }

                // 2. Mark history record as completed today
                const dateKey = new Date().toISOString().split('T')[0];
                const historyId = `${activePlanId}-${dateKey}`;
                await db.readingPlanHistory.update(historyId, {
                    completedAt: Date.now()
                });

                // 3. Update local plan.json with new advanced state and notes manifest
                const { useNoteStore } = await import('@/stores/noteStore');
                const noteStoreState = useNoteStore.getState();
                if (noteStoreState.isLocalMode) {
                    const latestPlan = await db.readingPlans.get(activePlanId);
                    if (latestPlan) {
                        await updateLocalPlanJson(latestPlan);
                    }
                }

                // Broadcast P2P sync
                import('@/lib/sync/PlanSyncManager').then(({ PlanSyncManager }) => {
                    PlanSyncManager.broadcastPlanUpdate(activePlanId);
                });

                // 4. Clean up active state
                set({
                    activePlanId: null,
                    activeNoteId: null,
                    isLectioModeActive: false
                });

                await get().loadPlans();
            },

            recalculatePlanGrace: async (planId) => {
                const plan = await db.readingPlans.get(planId);
                if (!plan) return;

                const today = Date.now();
                const daysRemaining = Math.max(1, Math.ceil((plan.endDate - today) / (1000 * 60 * 60 * 24)));

                // Redistribute remaining chapters evenly
                const updatedTracks = plan.tracks.map(track => {
                    // Find book indices
                    const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === track.currentBook);
                    const endBook = getTrackGroupEndBook(track.startBook);
                    const limitIndex = BIBLE_BOOKS.findIndex(b => b.name === endBook);

                    let chaptersRemaining = 0;

                    // 1. Count remaining chapters in current book
                    const currentBookChapters = BIBLE_BOOKS[currentBookIndex]?.chapters || 0;
                    chaptersRemaining += Math.max(0, currentBookChapters - track.currentChapter + 1);

                    // 2. Add total chapters of intermediate books
                    for (let i = currentBookIndex + 1; i <= limitIndex; i++) {
                        chaptersRemaining += BIBLE_BOOKS[i].chapters;
                    }

                    // 3. Dynamic division
                    const newChaptersPerDay = Math.max(1, Math.ceil(chaptersRemaining / daysRemaining));

                    return {
                        ...track,
                        chaptersPerDay: newChaptersPerDay
                    };
                });

                await db.readingPlans.update(planId, {
                    tracks: updatedTracks
                });

                await get().loadPlans();
            },

            deletePlan: async (planId) => {
                const plan = await db.readingPlans.get(planId);
                if (plan) {
                    const { useNoteStore } = await import('@/stores/noteStore');
                    const noteStoreState = useNoteStore.getState();
                    if (noteStoreState.isLocalMode) {
                        try {
                            const localFiles = noteStoreState.localFiles;
                            const parentFolder = localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                            if (parentFolder) {
                                const sanitizedPlanName = sanitizePathName(plan.name);
                                const subFolder = localFiles.find(f => f.name === sanitizedPlanName && f.parentId === parentFolder.id && f.kind === 'directory');
                                if (subFolder) {
                                    await noteStoreState.deleteFolder(subFolder.id);
                                    console.log(`[Delete Plan] Deleted physical plan subfolder: ${sanitizedPlanName}`);
                                }
                            }
                        } catch (err) {
                            console.error('[readingPlanStore] Failed to delete local physical folder:', err);
                        }
                    }
                }

                await db.readingPlans.delete(planId);
                // Also clean up plan history
                const historyKeys = await db.readingPlanHistory.where('planId').equals(planId).primaryKeys();
                await db.readingPlanHistory.bulkDelete(historyKeys);
                await get().loadPlans();
            },

            exitLectioMode: () => {
                set({
                    activePlanId: null,
                    activeNoteId: null,
                    isLectioModeActive: false
                });
            }
        }),
        {
            name: 'parchments-reading-plans',
            partialize: (state) => ({
                activePlans: state.activePlans,
                readerStyle: state.readerStyle
            })
        }
    )
);
