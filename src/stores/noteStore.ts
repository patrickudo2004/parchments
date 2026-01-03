import { create } from 'zustand';
import type { Note, Folder } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';

interface NoteStore {
    currentNote: Note | null;
    notes: Note[];
    folders: Folder[];
    isLoading: boolean;
    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    createNote: (folderId: string | null) => Promise<Note>;
    deleteNote: (id: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    isLoading: false,

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
}));
