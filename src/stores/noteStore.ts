import { create } from 'zustand';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Note, Folder } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';
import { fileSystem, type FileSystemDirectoryHandle, type FileSystemHandle, type FileSystemFileHandle } from '@/lib/filesystem/FileSystemService';


export const UNTITLED_NOTE = 'Untitled Note';
export const UNTITLED_FOLDER = 'Untitled Folder';
export const UNTITLED_SPACE = 'Untitled Space';

export interface LocalItem {
    id: string;
    name: string;
    kind: 'file' | 'directory';
    handle: FileSystemHandle;
    parentId: string | null;
}

export const STUDY_TEMPLATES = {
    soap: {
        id: 'soap',
        name: 'SOAP Method',
        description: 'Scripture, Observation, Application, Prayer. A simple devotional structure.',
        content: `
            <h1>SOAP Devotional</h1>
            <h2>Scripture</h2>
            <p>Write the verse(s) that stood out to you today.</p>
            <p></p>
            <h2>Observation</h2>
            <p>What did you notice about this text? Who is talking? What is the context?</p>
            <p></p>
            <h2>Application</h2>
            <p>How does this scripture apply to your life right now? What is God saying to you?</p>
            <p></p>
            <h2>Prayer</h2>
            <p>Write a prayer in response to what you've studied.</p>
            <p></p>
        `
    },
    inductive: {
        id: 'inductive',
        name: 'Inductive Study',
        description: 'Observation, Interpretation, Application. A deep-dive research approach.',
        content: `
            <h1>Inductive Bible Study</h1>
            <h2>Observation</h2>
            <p>What does it say? Note words, transitions, and repeated terms.</p>
            <p></p>
            <h2>Interpretation</h2>
            <p>What does it mean? What was the author's original intent to the original audience?</p>
            <p></p>
            <h2>Application</h2>
            <p>How do I live this out? What change is required in my character or actions?</p>
            <p></p>
        `
    },
    expository: {
        id: 'expository',
        name: 'Expository Sermon',
        description: 'Title, Introduction, Points, Conclusion. For structured teaching.',
        content: `
            <h1>Sermon Outline</h1>
            <p><strong>Main Idea:</strong> </p>
            <h2>Introduction</h2>
            <p>Hook, background, and the primary tension of the text.</p>
            <p></p>
            <h2>Point 1: [Executive Title]</h2>
            <p>Exegesis and illustration.</p>
            <p></p>
            <h2>Point 2: [Executive Title]</h2>
            <p>Exegesis and illustration.</p>
            <p></p>
            <h2>Point 3: [Executive Title]</h2>
            <p>Exegesis and illustration.</p>
            <p></p>
            <h2>Conclusion</h2>
            <p>Summary and the "So What?" (Final Call to Action).</p>
            <p></p>
        `
    },
    journal: {
        id: 'journal',
        name: 'Daily Reflection',
        description: 'A free-form space for daily thoughts and scripture interactions.',
        content: `
            <h1>Daily Reflection</h1>
            <p><em>Date: ${new Date().toLocaleDateString()}</em></p>
            <p></p>
            <h2>Thoughts & Meditations</h2>
            <p>What is on your heart today?</p>
            <p></p>
            <h2>Scripture Integration</h2>
            <p></p>
        `
    }
};

interface NoteStore {
    currentNote: Note | null;
    notes: Note[];
    folders: Folder[];
    isLoading: boolean;
    // Local File System State
    isLocalMode: boolean;
    localDirectoryHandle: FileSystemDirectoryHandle | null;
    localFiles: LocalItem[];
    currentFileHandle: FileSystemFileHandle | null;
    hasStudyspace: boolean;
    isWorkspaceLocked: boolean;
    lockedNotesBuffer: string[];
    flushWorkspaceLockBuffer: () => Promise<void>;
    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    createNote: (folderId: string | null, title?: string, forceId?: string) => Promise<Note>;
    createNoteFromTemplate: (folderId: string | null, templateId: string) => Promise<Note>;
    createVoiceNote: (folderId: string | null, audioBlob: Blob, duration: number, transcript: string) => Promise<Note>;
    createFolder: (name: string, parentId?: string | null, forceId?: string) => Promise<Folder>;
    deleteNote: (id: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    renameNote: (id: string, newName: string) => Promise<void>;
    renameFolder: (id: string, newName: string) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setNotes: (notes: Note[]) => void;

    // Global Selection State
    selectedFolderId: string | null;
    setSelectedFolderId: (id: string | null) => void;

    // Sync Actions
    broadcastFolderChange: (folderId: string | null) => Promise<void>;
    broadcastNoteDeletion: (folderId: string | null, noteId: string) => Promise<void>;

    // Local Actions

    refreshLocalFiles: (handle?: FileSystemDirectoryHandle) => Promise<void>;
    openLocalFolder: () => Promise<void>;
    openLocalFile: (item: LocalItem) => Promise<void>;
    // Local Creation Actions
    saveCurrentNote: (title: string, content: string) => Promise<void>;
    setLocalMode: (enabled: boolean) => void;
    createLocalNote: (fileName: string, targetFolderId: string | null, content?: string, forceId?: string) => Promise<void>;
    createLocalFolder: (folderName: string, targetFolderId: string | null) => Promise<void>;
    createLocalVoiceNote: (audioBlob: Blob, targetFolderId: string | null, transcript: string) => Promise<void>;
    saveLocalAsset: (file: File) => Promise<{ url: any; fileName: string; } | null>;
    hydrateAssets: (content: string) => Promise<string>;
    dehydrateAssets: (content: string) => string;
    sortLocalItems: (items: LocalItem[]) => LocalItem[];
}

const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
const isFileSystemSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
const autoSandbox = isMobileViewport || !isFileSystemSupported;

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    isLoading: false,
    selectedFolderId: null,
    setSelectedFolderId: (id) => set({ selectedFolderId: id }),
    isLocalMode: !autoSandbox,
    localDirectoryHandle: null,
    localFiles: [],
    currentFileHandle: null,
    hasStudyspace: autoSandbox,
    isWorkspaceLocked: false,
    lockedNotesBuffer: [],
    flushWorkspaceLockBuffer: async () => {
        const { isWorkspaceLocked, lockedNotesBuffer, localFiles, dehydrateAssets } = get();
        if (!isWorkspaceLocked || lockedNotesBuffer.length === 0) return;

        console.log(`[Workspace Lock Flusher] 🔄 Attempting to flush ${lockedNotesBuffer.length} buffered note writes...`);
        const remainingBuffer: string[] = [];

        for (const fileId of lockedNotesBuffer) {
            const dbNote = await db.notes.get(fileId);
            const localFile = localFiles.find(f => f.id === fileId && f.kind === 'file');

            if (dbNote && localFile) {
                try {
                    let fsContent = dehydrateAssets(dbNote.content);
                    await fileSystem.writeFile(localFile.handle as FileSystemFileHandle, fsContent);
                    console.log(`[Workspace Lock Flusher] 💾 Flushed buffered note: ${localFile.name}`);
                } catch (e) {
                    console.error(`[Workspace Lock Flusher] Failed to write ${localFile.name}, keeping in buffer:`, e);
                    remainingBuffer.push(fileId);
                }
            }
        }

        set({
            lockedNotesBuffer: remainingBuffer,
            isWorkspaceLocked: remainingBuffer.length > 0
        });
    },

    // Internal Helper: Enforce stable sorting (Folders > Files, then alphabetical)
    sortLocalItems: (items: LocalItem[]) => {
        return [...items].sort((a, b) => {
            if (a.kind !== b.kind) {
                return a.kind === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    },

    broadcastFolderChange: async (_folderId: string | null) => {
        // Folder-level sharing has been removed. This is now a no-op.
        // Single-note sharing via JoinHandler replaces this functionality.
        return;
    },

    broadcastNoteDeletion: async (_folderId: string | null, _noteId: string) => {
        // Folder-level sharing has been removed. This is now a no-op.
        return;
    },

    loadNotes: async () => {
        set({ isLoading: true });
        const notes = await db.notes.toArray();
        set({ notes, isLoading: false });
    },

    loadFolders: async () => {
        const folders = await db.folders.toArray();
        set({
            folders,
            hasStudyspace: autoSandbox ? folders.length > 0 : get().hasStudyspace
        });
    },

    createNote: async (folderId, title, forceId) => {
        const { isLocalMode, localDirectoryHandle, createLocalNote } = get();

        // Fallback to DB if localized but no folder is open (Incognito/PWA fallback)
        if (isLocalMode && localDirectoryHandle) {
            const name = title || UNTITLED_NOTE;
            await createLocalNote(name, folderId, '', forceId);
            // Re-fetch from currentNote because createLocalNote sets it
            const currentNote = get().currentNote;
            // BROADCAST: Notify collaborators of the new note
            console.log(`[CREATE NOTE LOCAL] Broadcasting folder change for: ${folderId}`);
            get().broadcastFolderChange(folderId);
            return currentNote as Note;
        }

        const note = await dbHelpers.createNote({
            title: title || UNTITLED_NOTE,
            content: '',
            folderId,
            tags: [],
            type: 'text',
        }, forceId);
        const { notes, broadcastFolderChange } = get();
        set({ notes: [...notes, note], currentNote: note });
        broadcastFolderChange(folderId);
        return note;
    },

    createNoteFromTemplate: async (folderId, templateId) => {
        const { isLocalMode, createLocalNote } = get();
        const template = STUDY_TEMPLATES[templateId as keyof typeof STUDY_TEMPLATES];
        if (!template) throw new Error('Template not found');

        const dateStr = new Date().toLocaleDateString().replace(/[/:]/g, '-');
        const title = `${template.name} - ${dateStr}`;

        if (isLocalMode) {
            await createLocalNote(title, folderId, template.content);
            return {} as Note; // In local mode, refreshing file list handles selection
        }

        const note = await dbHelpers.createNote({
            title,
            content: template.content,
            folderId,
            tags: [],
            type: 'text',
        });
        const { notes, broadcastFolderChange } = get();
        set({ notes: [...notes, note], currentNote: note });
        broadcastFolderChange(folderId);
        return note;
    },

    createVoiceNote: async (folderId, audioBlob, duration, transcript) => {
        const { isLocalMode, createLocalVoiceNote } = get();
        if (isLocalMode) {
            await createLocalVoiceNote(audioBlob, folderId, transcript);
            return {} as Note;
        }

        const note = await dbHelpers.createNote({
            title: 'Voice Note',
            content: '', // Empty - transcript is stored in transcript field
            folderId,
            tags: [],
            type: 'voice',
            audioBlob,
            duration,
            transcript, // Store transcript as separate field for sync
        });
        const { notes, broadcastFolderChange } = get();
        set({ notes: [...notes, note], currentNote: note });
        broadcastFolderChange(folderId);
        return note;
    },

    createFolder: async (name, parentId = null, forceId) => {
        const folder = await dbHelpers.createFolder({
            name,
            parentId,
            order: 0,
        }, forceId);
        const { folders } = get();
        set({ folders: [...folders, folder] });
        return folder;
    },

    deleteNote: async (id) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (item) {
                try {
                    // Find parent
                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.deleteEntry(parentHandle, item.name);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));

                    set({
                        localFiles: files,
                        currentNote: currentNote?.id === id ? null : currentNote
                    });

                    // SYNC: Broadcast the change to collaborators if this folder is shared
                    get().broadcastFolderChange(item.parentId);
                } catch (error) {
                    console.error('Failed to delete local file:', error);
                }
            }
        } else {
            const noteToDelete = notes.find(n => n.id === id);
            const folderId = noteToDelete?.folderId || null;
            await db.notes.delete(id);
            set({
                notes: notes.filter((n) => n.id !== id),
                currentNote: currentNote?.id === id ? null : currentNote,
            });
            get().broadcastNoteDeletion(folderId, id);
        }
    },

    deleteFolder: async (id) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (item) {
                try {
                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.deleteEntry(parentHandle, item.name);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));
                    set({ localFiles: files });

                    // SYNC: Broadcast deletion
                    if (item.parentId) {
                        get().broadcastNoteDeletion(item.parentId, item.id);
                    }
                } catch (error) {
                    console.error('Failed to delete local folder:', error);
                }
            }
        } else {
            await db.folders.delete(id);
            set({
                folders: folders.filter((f) => f.id !== id),
            });
        }
    },

    renameNote: async (id, newName) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (item) {
                try {
                    // Local rename
                    const ext = item.name.split('.').pop();
                    const cleanNewName = newName.replace(/[:/\\*?"<>|]/g, '-');
                    const finalName = (cleanNewName.endsWith('.html') || cleanNewName.endsWith('.md') || cleanNewName.endsWith('.txt'))
                        ? cleanNewName
                        : `${cleanNewName}.${ext}`;

                    await fileSystem.renameEntry(item.handle, finalName);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const mappedFiles: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));

                    set({
                        localFiles: get().sortLocalItems(mappedFiles),
                        currentNote: currentNote?.id === id
                            ? { ...currentNote, title: newName.replace(/\.html$|\.md$|\.txt$/, '') }
                            : currentNote
                    });
                } catch (error) {
                    console.error('Failed to rename local file:', error);
                    throw error;
                }
            }
        } else {
            await db.notes.update(id, { title: newName, updatedAt: Date.now() });
            set({
                notes: notes.map(n => n.id === id ? { ...n, title: newName, updatedAt: Date.now() } : n),
                currentNote: currentNote?.id === id ? { ...currentNote, title: newName } : currentNote
            });
            const folderId = notes.find(n => n.id === id)?.folderId || null;
            get().broadcastFolderChange(folderId);
        }
    },

    renameFolder: async (id, newName) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (item) {
                try {
                    await fileSystem.renameEntry(item.handle, newName);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));
                    set({ localFiles: files });
                } catch (error) {
                    console.error('Failed to rename local folder:', error);
                    throw error;
                }
            }
        } else {
            await db.folders.update(id, { name: newName, updatedAt: Date.now() });
            set({
                folders: folders.map(f => f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f)
            });
        }
    },

    setCurrentNote: (note) => {
        set({ currentNote: note });
        if (note && note.content) {
            // Check for plan progress in metadata
            const metaMatch = note.content.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
            if (metaMatch && metaMatch[1]) {
                try {
                    const meta = JSON.parse(metaMatch[1]);
                    if (meta.lectioProgress) {
                        // Dynamically import useReadingPlanStore to parse and ingest progress
                        import('@/stores/readingPlanStore').then(async ({ useReadingPlanStore }) => {
                            const planStore = useReadingPlanStore.getState();
                            const progress = meta.lectioProgress;
                            
                            // 1. Ingest/Update plan in DB
                            const existingPlan = await db.readingPlans.get(progress.planId);
                            if (!existingPlan) {
                                console.log('[Sync] Creating synced reading plan:', progress.planName);
                                await db.readingPlans.put({
                                    id: progress.planId,
                                    name: progress.planName,
                                    status: 'active',
                                    startDate: progress.startDate,
                                    endDate: progress.endDate,
                                    tracks: progress.tracks,
                                    folderId: note.folderId
                                });
                            } else {
                                console.log('[Sync] Updating track cursors for plan:', progress.planName);
                                await db.readingPlans.update(progress.planId, {
                                    tracks: progress.tracks
                                });
                            }
                            await planStore.loadPlans();
                        });
                    }
                } catch (e) {
                    console.warn('[Sync] Failed to parse/ingest synced plan progress:', e);
                }
            }
        }
    },
    setNotes: (notes) => set({ notes }),

    openLocalFolder: async () => {
        try {
            const handle = await fileSystem.openDirectory();
            const rawFiles = await fileSystem.readDirectoryRecursive(handle);

            // Map and sort
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));

            set({
                isLocalMode: true,
                localDirectoryHandle: handle,
                localFiles: get().sortLocalItems(files),
                hasStudyspace: true,
            });
        } catch (error) {
            console.error('Failed to open directory:', error);
            // User likely cancelled, do nothing
        }
    },

    refreshLocalFiles: async () => {
        const { localDirectoryHandle } = get();
        if (!localDirectoryHandle) return;

        try {
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);

            // 1. Map to LocalItem structure while parsing/injecting canonical UUIDs
            const mappedFiles: LocalItem[] = [];
            for (const f of rawFiles) {
                if (f.kind === 'file' && f.name.endsWith('.html')) {
                    try {
                        const fileHandle = f.handle as FileSystemFileHandle;
                        const rawContent = await fileSystem.readFile(fileHandle) as string;
                        
                        // Parse id from parchments-meta
                        const metaMatch = rawContent.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
                        let fileId = f.id;
                        let hasMetaId = false;
                        let meta: any = {};
                        
                        if (metaMatch && metaMatch[1]) {
                            try {
                                meta = JSON.parse(metaMatch[1]);
                                if (meta.id) {
                                    fileId = meta.id;
                                    hasMetaId = true;
                                }
                            } catch (e) {
                                console.warn('[refreshLocalFiles] Failed to parse metadata:', e);
                            }
                        }
                        
                        // If no canonical UUID, generate one and write back
                        if (!hasMetaId) {
                            fileId = crypto.randomUUID();
                            meta.id = fileId;
                            if (!meta.createdAt) {
                                meta.createdAt = Date.now();
                            }
                            
                            const metaTag = `\n<!-- parchments-meta: ${JSON.stringify(meta)} -->`;
                            let newContent = rawContent;
                            if (metaMatch) {
                                newContent = rawContent.replace(/<!--\s*parchments-meta:.*?\s*-->/, `<!-- parchments-meta: ${JSON.stringify(meta)} -->`);
                            } else {
                                newContent = rawContent + metaTag;
                            }
                            
                            console.log(`[refreshLocalFiles] 🆕 Generated and injected canonical UUID for ${f.name}: ${fileId}`);
                            await fileSystem.writeFile(fileHandle, newContent);
                        }
                        
                        mappedFiles.push({
                            id: fileId,
                            name: f.name,
                            kind: f.kind,
                            handle: f.handle,
                            parentId: f.parentId
                        });
                    } catch (e) {
                        console.error('[refreshLocalFiles] Failed to read/write metadata for:', f.name, e);
                        mappedFiles.push({
                            id: f.id,
                            name: f.name,
                            kind: f.kind,
                            handle: f.handle,
                            parentId: f.parentId
                        });
                    }
                } else if (f.kind === 'file' && f.name === 'plan.json') {
                    try {
                        const fileHandle = f.handle as FileSystemFileHandle;
                        const planContentText = await fileSystem.readFile(fileHandle) as string;
                        const planData = JSON.parse(planContentText);

                        if (planData && planData.id && planData.name && planData.tracks) {
                            const { BIBLE_BOOKS } = await import('@/lib/bible/BibleData');
                            const existingPlan = await db.readingPlans.get(planData.id);

                            if (!existingPlan) {
                                console.log('[File System] Ingesting discovered plan:', planData.name);
                                await db.readingPlans.put({
                                    id: planData.id,
                                    name: planData.name,
                                    startDate: planData.startDate,
                                    endDate: planData.endDate,
                                    status: planData.status,
                                    tracks: planData.tracks,
                                    folderId: f.parentId
                                });
                            } else {
                                // Maximum progress merges
                                const mergedTracks = planData.tracks.map((remoteTrack: any) => {
                                    const localTrack = existingPlan.tracks.find(t => t.name === remoteTrack.name);
                                    if (!localTrack) return remoteTrack;

                                    const remoteBookIndex = BIBLE_BOOKS.findIndex(b => b.name === remoteTrack.currentBook);
                                    const localBookIndex = BIBLE_BOOKS.findIndex(b => b.name === localTrack.currentBook);

                                    let remoteWins = false;
                                    if (remoteBookIndex > localBookIndex) {
                                        remoteWins = true;
                                    } else if (remoteBookIndex === localBookIndex) {
                                        if (remoteTrack.currentChapter > localTrack.currentChapter) {
                                            remoteWins = true;
                                        }
                                    }

                                    return remoteWins ? remoteTrack : localTrack;
                                });

                                await db.readingPlans.update(planData.id, {
                                    name: planData.name,
                                    startDate: planData.startDate,
                                    endDate: planData.endDate,
                                    status: planData.status,
                                    tracks: mergedTracks,
                                    folderId: f.parentId
                                });
                            }

                            // Ingest history logs
                            if (Array.isArray(planData.history)) {
                                for (const record of planData.history) {
                                    const existingRec = await db.readingPlanHistory.get(record.id);
                                    if (!existingRec || record.completedAt > existingRec.completedAt) {
                                        await db.readingPlanHistory.put(record);
                                    }
                                }
                            }

                            // Reload reading plans
                            import('@/stores/readingPlanStore').then(({ useReadingPlanStore }) => {
                                useReadingPlanStore.getState().loadPlans();
                            });
                        }
                    } catch (e) {
                        console.error('[refreshLocalFiles] Failed to ingest discovered plan:', f.name, e);
                    }

                    mappedFiles.push({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    });
                } else {
                    mappedFiles.push({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    });
                }
            }

            // 2. STABLE SORTING using helper
            const newFiles = get().sortLocalItems(mappedFiles);

            // 3. CHANGE DETECTION (Diffing)
            // Only update state if the list actually changed to prevent jumping/flickering
            const currentFiles = get().localFiles;
            const hasChanged = currentFiles.length !== newFiles.length ||
                newFiles.some((f, i) =>
                    f.id !== currentFiles[i]?.id ||
                    f.name !== currentFiles[i]?.name ||
                    f.kind !== currentFiles[i]?.kind ||
                    f.parentId !== currentFiles[i]?.parentId
                );

            if (!hasChanged) {
                // console.log('[File System] No changes detected, skipping refresh');
                return;
            }

            // 4. APPLY UPDATE
            set({ localFiles: newFiles });
            console.log('[File System] Refreshed file list:', newFiles.length, 'items (Changes detected)');

            // SYNC STEP: Clean up IndexedDB orphans
            // Find all notes in DB that belong to this local folder but no longer exist on disk
            try {
                // Get all valid file IDs from the file system
                const validFileIds = new Set(newFiles.map(f => f.id));

                // Get all notes from DB that are in this local structure
                // We identify them by checking if they are NOT in the validFileIds set
                // but ARE currently loaded in the 'localFiles' state (before update) or just scan DB

                // Better approach: Scan DB notes that have a folderId matching one of our local folders
                // or just iterate all notes and check if they are "local-like" (id contains path separators usually)
                // For now, let's just use the fact that we know the valid IDs.

                // Actually, since we don't store "isLocal" flag in DB strictly, 
                // we should rely on the fact that local mode uses file paths as IDs.

                // Let's iterate the PREVIOUS localFiles to find what was removed
                const prevLocalFiles = get().localFiles;
                const activeNoteId = get().currentNote?.id;

                for (const prevFile of prevLocalFiles) {
                    if (!validFileIds.has(prevFile.id)) {
                        console.log(`[File System] Detected deleted file: ${prevFile.id}`);

                        // 1. Remove from DB
                        await db.notes.delete(prevFile.id);

                        // 2. If it was the active note, close it
                        if (activeNoteId === prevFile.id) {
                            set({ currentNote: null, currentFileHandle: null });
                        }

                        // 3. SYNC: Broadcast if parent folder is shared
                        if (prevFile.parentId) {
                            get().broadcastFolderChange(prevFile.parentId);
                        }
                    }
                }
            } catch (dbError) {
                console.error('[File System] Failed to clean up DB orphans:', dbError);
            }

        } catch (error) {
            console.error('[File System] Failed to refresh:', error);
        }
    },

    openLocalFile: async (item: LocalItem) => {
        if (item.kind !== 'file') return;

        try {
            const fileHandle = item.handle as FileSystemFileHandle;
            const isAudio = item.name.toLowerCase().endsWith('.webm');

            let content = '';
            let audioBlob: Blob | undefined;
            let noteType: 'text' | 'voice' = 'text';
            let targetHandle = fileHandle;

            if (isAudio) {
                // Read as Blob directly
                audioBlob = await fileSystem.readFile(fileHandle, true) as Blob;
                noteType = 'voice';

                // Try to find matching transcript (Recording X.webm -> Transcript X.html)
                const timestampMatch = item.name.match(/Recording (.*?)\.webm/);
                if (timestampMatch) {
                    const timestamp = timestampMatch[1];
                    const transcriptName = `Transcript ${timestamp}.html`;
                    const { localFiles } = get();
                    const transcriptFile = localFiles.find(f =>
                        f.parentId === item.parentId &&
                        f.name === transcriptName &&
                        f.kind === 'file'
                    );
                    if (transcriptFile) {
                        const rawContent = await fileSystem.readFile(transcriptFile.handle as FileSystemFileHandle) as string;
                        content = await get().hydrateAssets(rawContent);
                        // For recordings, if we find a transcript, we treat the transcript as the primary handle for saves
                        targetHandle = transcriptFile.handle as FileSystemFileHandle;
                    } else {
                        // Prevent saving to the audio file handle
                        targetHandle = null as any;
                    }
                }
            } else {
                const rawContent = await fileSystem.readFile(fileHandle) as string;
                content = await get().hydrateAssets(rawContent);

                // Check for linked audio metadata: <!-- audio-link: filename.webm -->
                const audioLinkMatch = content.match(/<!--\s*audio-link:\s*(.*?)\s*-->/);
                if (audioLinkMatch && audioLinkMatch[1]) {
                    const audioFileName = audioLinkMatch[1];
                    // Look for this file in the same directory (siblings)
                    const { localFiles } = get();
                    const siblingAudio = localFiles.find(f =>
                        f.parentId === item.parentId &&
                        f.name === audioFileName &&
                        f.kind === 'file'
                    );

                    if (siblingAudio) {
                        try {
                            audioBlob = await fileSystem.readFile(siblingAudio.handle as FileSystemFileHandle, true) as Blob;
                            noteType = 'voice';
                        } catch (e) {
                            console.error('Failed to read linked audio file:', e);
                        }
                    }
                }
            }

            // Look for metadata in content: <!-- parchments-meta: json -->
            const metaMatch = content.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
            let createdAt = Date.now();
            let transcript: string | undefined;

            if (metaMatch && metaMatch[1]) {
                try {
                    const meta = JSON.parse(metaMatch[1]);
                    if (meta.createdAt) createdAt = meta.createdAt;
                    if (meta.transcript) transcript = meta.transcript;
                } catch (e) {
                    console.warn('[NoteStore] Failed to parse metadata:', e);
                }
            } else {
                // Fallback to file system lastModified
                try {
                    const metadata = await fileSystem.getMetadata(fileHandle as FileSystemFileHandle);
                    createdAt = metadata.lastModified;
                } catch (e) {
                    console.warn('[NoteStore] Failed to get file lastModified:', e);
                }
            }

            // Construct a temporary Note object for the editor
            const tempNote: Note = {
                id: item.id,
                title: item.name.replace(/\.html$|\.txt$|\.md$|\.webm$/, ''), // Remove extension for display
                content: content,
                folderId: null,
                tags: [],
                type: noteType,
                audioBlob: audioBlob,
                transcript: transcript, // Add parsed transcript
                createdAt: createdAt,
                updatedAt: Date.now(),
            };
            set({ currentNote: tempNote, currentFileHandle: targetHandle });
        } catch (error) {
            console.error('Failed to read file:', error);
        }
    },

    createLocalNote: async (fileName, targetFolderId, content = '', forceId?: string) => {
        const { localDirectoryHandle, localFiles, openLocalFile } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const folderItem = localFiles.find(f => f.id === targetFolderId && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            const fileId = forceId || crypto.randomUUID();
            const meta = {
                id: fileId,
                createdAt: Date.now()
            };
            const metaTag = `\n<!-- parchments-meta: ${JSON.stringify(meta)} -->`;
            const finalContent = content + metaTag;

            // Sanitize filename to ensure Windows and other OS compatibility (remove : / \ * ? " < > |)
            const sanitizedFileName = fileName.replace(/[:/\\*?"<>|]/g, '-');
            const name = sanitizedFileName.endsWith('.html') ? sanitizedFileName : `${sanitizedFileName}.html`;
            const handle = await fileSystem.createFile(parentHandle, name, finalContent);

            // Open the new file (construct a LocalItem)
            await openLocalFile({
                id: fileId,
                name: name,
                kind: 'file',
                handle: handle,
                parentId: targetFolderId
            });

            // Refresh file list asynchronously so it gets mapped correctly in localFiles
            await get().refreshLocalFiles();
        } catch (error) {
            console.error('Failed to create local note:', error);
            throw error;
        }
    },

    createLocalFolder: async (folderName: string, targetFolderId: string | null) => {
        const { localDirectoryHandle, localFiles } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const folderItem = localFiles.find(f => f.id === targetFolderId && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            await fileSystem.createDirectory(parentHandle, folderName);

            // Refresh file list
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
            const files = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));
            set({ localFiles: get().sortLocalItems(files) });
        } catch (error) {
            console.error('Failed to create local folder:', error);
            throw error;
        }
    },

    createLocalVoiceNote: async (audioBlob: Blob, targetFolderId: string | null, transcript: string) => {
        const { localDirectoryHandle, localFiles } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const folderItem = localFiles.find(f => f.id === targetFolderId && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            // Generate a name with timestamp
            const timestamp = new Date().toLocaleString().replace(/[/:]/g, '-');
            const audioName = `Recording ${timestamp}.webm`;
            const noteName = `Transcript ${timestamp}.html`;

            // Save the audio file
            await fileSystem.createFile(parentHandle, audioName, audioBlob);

            // Save the transcript as an HTML note with hidden audio link metadata and creation date
            const fileId = crypto.randomUUID();
            const createdAt = Date.now();
            // Store transcript in BOTH metadata (for clean parsing) AND content (for fallback display)
            const content = `<!-- audio-link: ${audioName} -->\n<!-- parchments-meta: {"id": "${fileId}", "createdAt": ${createdAt}, "transcript": ${JSON.stringify(transcript || '')}} -->\n<h1>Voice Transcript</h1><p>${transcript || 'No transcript available.'}</p>`;
            const noteHandle = await fileSystem.createFile(parentHandle, noteName, content);

            // Automatically open the new transcript note
            const { openLocalFile } = get();
            await openLocalFile({
                id: fileId,
                name: noteName,
                kind: 'file',
                handle: noteHandle,
                parentId: targetFolderId
            });

            // Refresh file list asynchronously so it gets mapped correctly in localFiles
            await get().refreshLocalFiles();

            // BROADCAST: Notify collaborators of the new voice note
            if (targetFolderId) {
                console.log(`[CREATE VOICE NOTE LOCAL] Broadcasting folder change for: ${targetFolderId}`);
                get().broadcastFolderChange(targetFolderId);
            }
        } catch (error) {
            console.error('Failed to create local voice note:', error);
            throw error;
        }
    },

    saveCurrentNote: async (title, content) => {
        const { currentNote, isLocalMode, currentFileHandle, notes, renameNote } = get();
        if (!currentNote) return;

        // SMART AUTO-NAMING: If title is "Untitled Note", try to extract from content
        let finalTitle = title;
        if (title === UNTITLED_NOTE || title.trim() === '') {
            const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            const extracted = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : (textContent.slice(0, 30));

            if (extracted && extracted.length > 2 && extracted !== UNTITLED_NOTE) {
                finalTitle = extracted;
                console.log(`[Auto-Naming] Detected title from content: "${finalTitle}"`);
                // Trigger an async rename so we don't block the save
                setTimeout(() => renameNote(currentNote.id, finalTitle), 100);
            }
        }

        // 1. DYNAMICALLY DETECT & EMBED ACTIVE STUDY PLAN PROGRESS IN METADATA
        const readingPlanStoreState = (window as any).useReadingPlanStore?.getState() || null;
        let lectioProgress: any = undefined;
        if (readingPlanStoreState && readingPlanStoreState.isLectioModeActive && readingPlanStoreState.activeNoteId === currentNote.id) {
            const activePlan = readingPlanStoreState.activePlans.find((p: any) => p.id === readingPlanStoreState.activePlanId);
            if (activePlan) {
                lectioProgress = {
                    planId: activePlan.id,
                    planName: activePlan.name,
                    startDate: activePlan.startDate,
                    endDate: activePlan.endDate,
                    tracks: activePlan.tracks
                };
            }
        }

        const meta = {
            id: currentNote.id,
            createdAt: currentNote.createdAt,
            ...(currentNote.type === 'voice' ? { transcript: currentNote.transcript } : {}),
            ...(lectioProgress ? { lectioProgress } : {})
        };
        const metaTag = `<!-- parchments-meta: ${JSON.stringify(meta)} -->`;

        // We prepare portableContent which always has the embedded meta tag inside it
        let portableContent = content;
        if (!portableContent.includes('parchments-meta:')) {
            portableContent += `\n${metaTag}`;
        } else {
            portableContent = portableContent.replace(/<!--\s*parchments-meta:.*?\s*-->/, metaTag);
        }

        if (isLocalMode && currentFileHandle) {
            // File System Mode
            try {
                let fsContent = get().dehydrateAssets(portableContent);
                await fileSystem.writeFile(currentFileHandle, fsContent);
                // Update store state to reflect changes
                set({
                    currentNote: { ...currentNote, title: finalTitle, content: portableContent, updatedAt: Date.now() }
                });
            } catch (error) {
                console.warn('[NoteStore] File system write blocked or handle locked. Caching in IndexedDB Safe-Buffer...', error);
                
                // Fallback: Write safely to IndexedDB
                try {
                    await db.notes.put({
                        id: currentNote.id,
                        title: finalTitle,
                        content: portableContent,
                        updatedAt: Date.now(),
                        createdAt: currentNote.createdAt,
                        folderId: null,
                        tags: [],
                        type: currentNote.type
                    });
                    
                    const existingBuffer = get().lockedNotesBuffer;
                    if (!existingBuffer.includes(currentNote.id)) {
                        set({
                            lockedNotesBuffer: [...existingBuffer, currentNote.id],
                            isWorkspaceLocked: true
                        });
                    }

                    // Update UI state so it looks saved in-memory
                    set({
                        currentNote: { ...currentNote, title: finalTitle, content: portableContent, updatedAt: Date.now() }
                    });
                } catch (dbError) {
                    console.error('[NoteStore] Failed to write fallback save to IndexedDB:', dbError);
                }
            }
        } else if (!isLocalMode && currentNote.id) {
            // DB Mode
            try {
                await db.notes.update(currentNote.id, {
                    title: finalTitle,
                    content: portableContent,
                    updatedAt: Date.now(),
                });

                const updatedNotes = notes.map(n =>
                    n.id === currentNote.id
                        ? { ...n, title: finalTitle, content: portableContent, updatedAt: Date.now() }
                        : n
                );
                set({ notes: updatedNotes, currentNote: { ...currentNote, title: finalTitle, content: portableContent, updatedAt: Date.now() } });
            } catch (error) {
                console.error('Failed to save to DB:', error);
            }
        }
    },
    saveLocalAsset: async (file: File) => {
        const { localDirectoryHandle, isLocalMode } = get();
        if (!isLocalMode || !localDirectoryHandle) return null;

        const _isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
        console.log('[NoteStore] saveLocalAsset, isTauri:', _isTauri);

        try {
            // Ensure .assets/images directory exists
            const assetsHandle = await fileSystem.createDirectory(localDirectoryHandle, '.assets');
            const imagesHandle = await fileSystem.createDirectory(assetsHandle, 'images');

            // Generate unique filename
            const extension = file.name.split('.').pop() || 'png';
            const fileName = `${crypto.randomUUID()}.${extension}`;

            // Create the file
            const fileHandle = await fileSystem.createFile(imagesHandle, fileName, file);

            // Return both the URL for the editor and the filename for persistent reference
            const url = _isTauri && (fileHandle as any).path
                ? convertFileSrc((fileHandle as any).path)
                : URL.createObjectURL(file);

            return { url, fileName };
        } catch (error) {
            console.error('Failed to save asset:', error);
            return null;
        }
    },

    hydrateAssets: async (content: string) => {
        const { localDirectoryHandle, isLocalMode } = get();
        if (!isLocalMode || !localDirectoryHandle) return content;

        const doc = new DOMParser().parseFromString(content, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));

        for (const img of images) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('asset:')) {
                try {
                    // Try to find the file in .assets/images/
                    const assetsHandle = await fileSystem.createDirectory(localDirectoryHandle, '.assets');
                    const imagesHandle = await fileSystem.createDirectory(assetsHandle, 'images');

                    // The src might be "filename.png" or ".assets/images/filename.png"
                    const fileName = src.split('/').pop()!;
                    const fileHandle = await fileSystem.getFileHandle(imagesHandle, fileName);
                    const blob = await fileSystem.readFile(fileHandle as FileSystemFileHandle, true);
                    const blobUrl = URL.createObjectURL(blob as Blob);
                    img.setAttribute('src', blobUrl);
                    // Store the mapping so we can dehydrate later if needed, 
                    // or just rely on the fact that blobs are recognizable.
                } catch (e) {
                    console.warn('[NoteStore] Failed to hydrate image:', src, e);
                }
            }
        }
        return doc.body.innerHTML;
    },

    dehydrateAssets: (content: string) => {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));

        for (const img of images) {
            const assetName = img.getAttribute('data-asset-name');
            if (assetName) {
                // Replace the blob URL with the relative path for portability
                img.setAttribute('src', `.assets/images/${assetName}`);
            }
        }
        return doc.body.innerHTML;
    },

    setLocalMode: (enabled) => set({ isLocalMode: enabled }),
}));
