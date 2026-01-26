import { create } from 'zustand';
import type { Note, Folder } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';
import { fileSystem, type FileSystemDirectoryHandle, type FileSystemHandle, type FileSystemFileHandle } from '@/lib/filesystem/FileSystemService';

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
    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    createNote: (folderId: string | null) => Promise<Note>;
    createNoteFromTemplate: (folderId: string | null, templateId: string) => Promise<Note>;
    createVoiceNote: (folderId: string | null, audioBlob: Blob, duration: number) => Promise<Note>;
    createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
    deleteNote: (id: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setNotes: (notes: Note[]) => void;
    // Local Actions
    openLocalFolder: () => Promise<void>;
    openLocalFile: (item: LocalItem) => Promise<void>;
    // Local Creation Actions
    saveCurrentNote: (title: string, content: string) => Promise<void>;
    setLocalMode: (enabled: boolean) => void;
    createLocalNote: (fileName: string, targetFolderId: string | null, content?: string) => Promise<void>;
    createLocalFolder: (folderName: string, targetFolderId: string | null) => Promise<void>;
    createLocalVoiceNote: (audioBlob: Blob, targetFolderId: string | null) => Promise<void>;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    isLoading: false,
    isLocalMode: true, // Default to local mode for Studyspace-First
    localDirectoryHandle: null,
    localFiles: [],
    currentFileHandle: null,
    hasStudyspace: false,

    loadNotes: async () => {
        set({ isLoading: true });
        const notes = await db.notes.toArray();
        set({ notes, isLoading: false });
    },

    loadFolders: async () => {
        const folders = await db.folders.toArray();
        set({ folders });
    },

    createNote: async (folderId) => {
        const { isLocalMode, createLocalNote } = get();
        if (isLocalMode) {
            const name = prompt('Name your new note:', 'Untitled Note');
            if (!name) return {} as Note;
            await createLocalNote(name, folderId);
            return {} as Note;
        }

        const note = await dbHelpers.createNote({
            title: 'Untitled Note',
            content: '',
            folderId,
            tags: [],
            type: 'text',
        });
        const { notes } = get();
        set({ notes: [...notes, note], currentNote: note });
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
        const { notes } = get();
        set({ notes: [...notes, note], currentNote: note });
        return note;
    },

    createVoiceNote: async (folderId, audioBlob, duration) => {
        const { isLocalMode, createLocalVoiceNote } = get();
        if (isLocalMode) {
            await createLocalVoiceNote(audioBlob, folderId);
            return {} as Note;
        }

        const note = await dbHelpers.createNote({
            title: 'Voice Note',
            content: '', // Can be transcript later
            folderId,
            tags: [],
            type: 'voice',
            audioBlob,
            duration,
        });
        const { notes } = get();
        set({ notes: [...notes, note], currentNote: note });
        return note;
    },

    createFolder: async (name, parentId = null) => {
        const folder = await dbHelpers.createFolder({
            name,
            parentId,
            order: 0,
        });
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
                } catch (error) {
                    console.error('Failed to delete local file:', error);
                }
            }
        } else {
            await db.notes.delete(id);
            set({
                notes: notes.filter((n) => n.id !== id),
                currentNote: currentNote?.id === id ? null : currentNote,
            });
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

    setCurrentNote: (note) => set({ currentNote: note }),
    setNotes: (notes) => set({ notes }),

    openLocalFolder: async () => {
        try {
            const handle = await fileSystem.openDirectory();
            const rawFiles = await fileSystem.readDirectoryRecursive(handle);

            // Map the recursive result to LocalItems
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
                localFiles: files,
                hasStudyspace: true,
            });
        } catch (error) {
            console.error('Failed to open directory:', error);
            // User likely cancelled, do nothing
        }
    },

    openLocalFile: async (item: LocalItem) => {
        if (item.kind !== 'file') return;

        try {
            const fileHandle = item.handle as FileSystemFileHandle;
            const content = await fileSystem.readFile(fileHandle);
            // Construct a temporary Note object for the editor
            const tempNote: Note = {
                id: item.id,
                title: item.name.replace(/\.html$|\.txt$|\.md$/, ''), // Remove extension for display
                content: content,
                folderId: null,
                tags: [],
                type: 'text',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            set({ currentNote: tempNote, currentFileHandle: fileHandle });
        } catch (error) {
            console.error('Failed to read file:', error);
        }
    },

    createLocalNote: async (fileName, targetFolderId, content = '') => {
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

            const name = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
            const handle = await fileSystem.createFile(parentHandle, name, content);

            // Refresh file list recursively
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));

            set({ localFiles: files });

            // Open the new file (construct a LocalItem)
            // We need to reconstruct the ID for the new file
            // If we have a targetFolderId, the new ID is targetFolderId/name
            const newId = targetFolderId ? `${targetFolderId}/${name}` : name;

            await openLocalFile({
                id: newId,
                name: name,
                kind: 'file',
                handle: handle,
                parentId: targetFolderId
            });
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
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));
            set({ localFiles: files });
        } catch (error) {
            console.error('Failed to create local folder:', error);
            throw error;
        }
    },

    createLocalVoiceNote: async (audioBlob: Blob, targetFolderId: string | null) => {
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
            const name = `Recording ${new Date().toLocaleString().replace(/[/:]/g, '-')}.webm`;
            await fileSystem.createFile(parentHandle, name, audioBlob);

            // Refresh file list
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
            console.error('Failed to create local voice note:', error);
            throw error;
        }
    },

    saveCurrentNote: async (title, content) => {
        const { currentNote, isLocalMode, currentFileHandle, notes } = get();
        if (!currentNote) return;

        if (isLocalMode && currentFileHandle) {
            // File System Mode
            try {
                await fileSystem.writeFile(currentFileHandle, content);
                // Update store state to reflect changes (though title change for files involves renaming which is harder)
                set({
                    currentNote: { ...currentNote, title, content, updatedAt: Date.now() }
                });
            } catch (error) {
                console.error('Failed to save to file:', error);
            }
        } else if (!isLocalMode && currentNote.id) {
            // DB Mode
            try {
                await db.notes.update(currentNote.id, {
                    title,
                    content,
                    updatedAt: Date.now(),
                });

                const updatedNotes = notes.map(n =>
                    n.id === currentNote.id
                        ? { ...n, title, content, updatedAt: Date.now() }
                        : n
                );
                set({ notes: updatedNotes, currentNote: { ...currentNote, title, content, updatedAt: Date.now() } });
            } catch (error) {
                console.error('Failed to save to DB:', error);
            }
        }
    },

    setLocalMode: (enabled) => set({ isLocalMode: enabled }),
}));
