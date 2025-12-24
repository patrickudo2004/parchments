import { create } from 'zustand';
import type { Note, Folder } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';

interface NoteStore {
    currentNote: Note | null;
    notes: Note[];
    folders: Folder[];
    selectedFolderId: string | null;
    isLoading: boolean;
    saveStatus: 'saved' | 'typing' | 'saving';

    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    createNote: (folderId: string | null) => Promise<Note>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setSaveStatus: (status: 'saved' | 'typing' | 'saving') => void;

    createFolder: (name: string, parentId: string | null) => Promise<Folder>;
    updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    setSelectedFolder: (folderId: string | null) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    selectedFolderId: null,
    isLoading: false,
    saveStatus: 'saved',

    loadNotes: async () => {
        set({ isLoading: true });
        try {
            const notes = await db.notes.toArray();
            set({ notes, isLoading: false });
        } catch (error) {
            console.error('Failed to load notes:', error);
            set({ isLoading: false });
        }
    },

    loadFolders: async () => {
        try {
            const folders = await db.folders.toArray();
            set({ folders });
        } catch (error) {
            console.error('Failed to load folders:', error);
        }
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

    updateNote: async (id, updates) => {
        set({ saveStatus: 'saving' });
        try {
            await dbHelpers.updateNote(id, updates);

            const { notes, currentNote } = get();
            const updatedNotes = notes.map(n =>
                n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
            );

            set({
                notes: updatedNotes,
                currentNote: currentNote?.id === id
                    ? { ...currentNote, ...updates, updatedAt: Date.now() }
                    : currentNote,
                saveStatus: 'saved',
            });
        } catch (error) {
            console.error('Failed to update note:', error);
            set({ saveStatus: 'saved' });
        }
    },

    deleteNote: async (id) => {
        try {
            await dbHelpers.deleteNote(id);

            const { notes, currentNote } = get();
            set({
                notes: notes.filter(n => n.id !== id),
                currentNote: currentNote?.id === id ? null : currentNote,
            });
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    },

    setCurrentNote: (note) => set({ currentNote: note }),

    setSaveStatus: (status) => set({ saveStatus: status }),

    createFolder: async (name, parentId) => {
        const folder = await dbHelpers.createFolder({
            name,
            parentId,
            order: 0,
        });

        const { folders } = get();
        set({ folders: [...folders, folder] });
        return folder;
    },

    updateFolder: async (id, updates) => {
        try {
            await db.folders.update(id, updates);

            const { folders } = get();
            set({
                folders: folders.map(f => f.id === id ? { ...f, ...updates } : f),
            });
        } catch (error) {
            console.error('Failed to update folder:', error);
        }
    },

    deleteFolder: async (id) => {
        try {
            await dbHelpers.deleteFolder(id);

            const { folders, notes } = get();
            set({
                folders: folders.filter(f => f.id !== id),
                notes: notes.filter(n => n.folderId !== id),
            });
        } catch (error) {
            console.error('Failed to delete folder:', error);
        }
    },

    setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),
}));
