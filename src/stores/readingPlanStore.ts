import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import type { ReadingPlan, ReadingPlanTrack, Note } from '@/types/database';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { v4 as uuidv4 } from 'uuid';

interface ReadingPlanState {
    activePlans: ReadingPlan[];
    activePlanId: string | null;
    activeNoteId: string | null;
    isLectioModeActive: boolean;
    importingState: { status: string; progress: number } | null;
    readerStyle: 'scroll' | 'page';

    // Actions
    loadPlans: () => Promise<void>;
    createPlan: (name: string, startDate: number, endDate: number, tracks: Omit<ReadingPlanTrack, 'currentBook' | 'currentChapter'>[]) => Promise<ReadingPlan>;
    startDailySession: (planId: string) => Promise<void>;
    pinVerseToActiveJournal: (verseText: string, reference: string) => Promise<void>;
    completeDailySession: () => Promise<void>;
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
    startBookName: string
): { book: string; chapter: number } => {
    const endBookName = getTrackGroupEndBook(startBookName);
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
            return { book: bookData.name, chapter: newChapter };
        }

        newChapter -= bookData.chapters;
        currentBookIndex++;
    }

    // Wrapped around to the start of the track
    return { book: BIBLE_BOOKS[firstIndex].name, chapter: 1 };
};

// Generates the daily reading plan track segments list
export const getDailySegments = (track: ReadingPlanTrack): { book: string; chapters: number[] }[] => {
    const segments: { book: string; chapters: number[] }[] = [];
    const endBook = getTrackGroupEndBook(track.startBook);
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

    // If we finished the Bible/track range and still have chapters remaining, wrap around
    if (chaptersToGather > 0) {
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
            },

            createPlan: async (name, startDate, endDate, tracks) => {
                // Dynamically import noteStore to avoid circular dependency
                const { useNoteStore } = await import('@/stores/noteStore');
                const noteStoreState = useNoteStore.getState();
                const isLocalMode = noteStoreState.isLocalMode;

                let targetFolderId: string | null = null;

                if (isLocalMode) {
                    // Check if local folder "Lectio Study Journals" exists on disk
                    const localFiles = noteStoreState.localFiles;
                    let localFolder = localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                    if (!localFolder) {
                        // Create the physical folder
                        await noteStoreState.createLocalFolder('Lectio Study Journals', null);
                        // Refresh/find it from updated localFiles
                        const refreshedFiles = useNoteStore.getState().localFiles;
                        localFolder = refreshedFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                    }
                    targetFolderId = localFolder ? localFolder.id : null;
                } else {
                    // Ensure a "Lectio Study Journals" DB folder exists
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
                    status: 'active',
                    startDate,
                    endDate,
                    tracks: fullTracks,
                    folderId: targetFolderId
                };

                await db.readingPlans.add(newPlan);
                await get().loadPlans();
                return newPlan;
            },

            startDailySession: async (planId) => {
                const plan = await db.readingPlans.get(planId);
                if (!plan) return;

                // 1. Check if the user has already read today
                const dateKey = new Date().toISOString().split('T')[0];
                const historyId = `${planId}-${dateKey}`;
                const existingHistory = await db.readingPlanHistory.get(historyId);

                let noteId = existingHistory?.noteId;

                // 2. If no session note exists for today, create one auto-populated with headings
                if (!noteId) {
                    noteId = `note-lectio-${Date.now()}`;
                    const dateString = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

                    // Generate a gorgeous pre-seeded template showing daily chapters to read
                    let initialContent = `<h1 class="text-3xl font-black mb-4">Lectio Study Journal: ${dateString}</h1>`;
                    initialContent += `<p class="text-xs text-light-text-secondary dark:text-dark-text-secondary italic mb-8">Daily reading companion for plan: <b>${plan.name}</b></p>`;

                    plan.tracks.forEach(track => {
                        const segments = getDailySegments(track);
                        const chaptersString = segments
                            .map(s => `${s.book} ${s.chapters[0]}${s.chapters.length > 1 ? `-${s.chapters[s.chapters.length - 1]}` : ''}`)
                            .join(', ');

                        initialContent += `<h2 class="text-xl font-bold mt-6 border-b border-light-border dark:border-dark-border pb-1">📖 ${track.name} (${chaptersString})</h2>`;
                        initialContent += `<p class="text-sm italic text-light-text-disabled mt-2">Write down your key takeaways and inspired summaries for this track here...</p><br/>`;
                    });

                    // Dynamically import noteStore to avoid circular dependency
                    const { useNoteStore } = await import('@/stores/noteStore');
                    const noteStoreState = useNoteStore.getState();
                    const isLocalMode = noteStoreState.isLocalMode;
                    const localDirectoryHandle = noteStoreState.localDirectoryHandle;

                    const title = `Lectio Journal - ${dateString}`;

                    if (isLocalMode && localDirectoryHandle) {
                        // Ensure the physical folder exists
                        let targetFolder = noteStoreState.localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                        if (!targetFolder) {
                            await noteStoreState.createLocalFolder('Lectio Study Journals', null);
                            const refreshedFiles = useNoteStore.getState().localFiles;
                            targetFolder = refreshedFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                        }
                        const finalFolderId = targetFolder ? targetFolder.id : null;

                        // Create in local folder physically
                        await noteStoreState.createLocalNote(title, finalFolderId, initialContent, noteId);
                    } else {
                        // Add note directly in IndexedDB inside the "Lectio Study Journals" folder
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
                        noteId
                    });
                }

                set({
                    activePlanId: planId,
                    activeNoteId: noteId,
                    isLectioModeActive: true
                });
            },

            pinVerseToActiveJournal: async (verseText, reference) => {
                const { activeNoteId } = get();
                if (!activeNoteId) return;

                // Format as a beautiful markdown/HTML blockquote in Tiptap format
                const pinBlock = `<blockquote><p><strong>${reference}</strong> - ${verseText}</p></blockquote><p></p>`;

                // Dynamically import noteStore to avoid circular dependency
                const { useNoteStore } = await import('@/stores/noteStore');
                const noteStoreState = useNoteStore.getState();
                const isLocalMode = noteStoreState.isLocalMode;

                let newContent = '';

                if (isLocalMode) {
                    const currentNote = noteStoreState.currentNote;
                    if (currentNote && currentNote.id === activeNoteId) {
                        newContent = currentNote.content + pinBlock;
                        // Save the note using noteStore's saveCurrentNote
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
                const editor = uiStore ? uiStore.getState?.().editor : null;
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

                // 1. Advance track cursors based on chaptersPerDay
                const updatedTracks = plan.tracks.map(track => {
                    const nextPosition = advanceChapters(
                        track.currentBook,
                        track.currentChapter,
                        track.chaptersPerDay,
                        track.startBook
                    );
                    return {
                        ...track,
                        currentBook: nextPosition.book,
                        currentChapter: nextPosition.chapter
                    };
                });

                await db.readingPlans.update(activePlanId, {
                    tracks: updatedTracks
                });

                // 2. Mark history record as completed today
                const dateKey = new Date().toISOString().split('T')[0];
                const historyId = `${activePlanId}-${dateKey}`;
                await db.readingPlanHistory.update(historyId, {
                    completedAt: Date.now()
                });

                // 3. Clean up active state
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
