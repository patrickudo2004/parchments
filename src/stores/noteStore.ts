import { create } from 'zustand';
import type { Note, Folder } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';
import { fileSystem, type FileSystemDirectoryHandle, type FileSystemHandle, type FileSystemFileHandle } from '@/lib/filesystem/FileSystemService';

interface NoteStore {
    currentNote: Note | null;
    notes: Note[];
    folders: Folder[];
    isLoading: boolean;
    // Local File System State
    isLocalMode: boolean;
    localDirectoryHandle: FileSystemDirectoryHandle | null;
    localFiles: FileSystemHandle[];
    currentFileHandle: FileSystemFileHandle | null;
    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    createNote: (folderId: string | null) => Promise<Note>;
    createVoiceNote: (folderId: string | null, audioBlob: Blob, duration: number) => Promise<Note>;
    createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
    deleteNote: (id: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setNotes: (notes: Note[]) => void;
    // Local Actions
    openLocalFolder: () => Promise<void>;
    openLocalFile: (handle: FileSystemHandle) => Promise<void>;
    saveCurrentNote: (title: string, content: string) => Promise<void>;
    setLocalMode: (enabled: boolean) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    isLoading: false,
    isLocalMode: false,
    localDirectoryHandle: null,
    localFiles: [],
    currentFileHandle: null,

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

    createVoiceNote: async (folderId, audioBlob, duration) => {
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
        await db.notes.delete(id);
        const { notes, currentNote } = get();
        set({
            notes: notes.filter((n) => n.id !== id),
            currentNote: currentNote?.id === id ? null : currentNote,
        });
    },

    deleteFolder: async (id) => {
        // Warning: This doesn't recursively delete notes in the implementation here, 
        // but the DB should handle it or we should orphaned notes if cascade isn't set.
        // For now, just delete the folder record.
        await db.folders.delete(id);
        const { folders } = get();
        set({
            folders: folders.filter((f) => f.id !== id),
        });
    },

    setCurrentNote: (note) => set({ currentNote: note }),
    setNotes: (notes) => set({ notes }),

    openLocalFolder: async () => {
        try {
            const handle = await fileSystem.openDirectory();
            const files = await fileSystem.readDirectory(handle);
            set({
                isLocalMode: true,
                localDirectoryHandle: handle,
                localFiles: files
            });
        } catch (error) {
            console.error('Failed to open directory:', error);
            // User likely cancelled, do nothing
        }
    },

    openLocalFile: async (handle: FileSystemHandle) => {
        if (handle.kind !== 'file') return;

        try {
            const fileHandle = handle as FileSystemFileHandle;
            const content = await fileSystem.readFile(fileHandle);
            // Construct a temporary Note object for the editor
            const tempNote: Note = {
                id: handle.name,
                title: handle.name,
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
