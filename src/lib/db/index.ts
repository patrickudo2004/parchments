import Dexie, { type Table } from 'dexie';
import type { Note, Folder, User, BibleVersion, BibleVerse, ChapterSummary } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export class ParchmentsDatabase extends Dexie {
    notes!: Table<Note>;
    folders!: Table<Folder>;
    users!: Table<User>;
    bibleVersions!: Table<BibleVersion>;
    bibleVerses!: Table<BibleVerse>;
    chapterSummaries!: Table<ChapterSummary>;

    constructor() {
        super('ParchmentsDB');

        // Version 1: Original schema
        this.version(1).stores({
            notes: 'id, title, folderId, type, createdAt, updatedAt, [folderId+createdAt]',
            folders: 'id, name, parentId, order, [parentId+order]',
            users: 'id, email, fullName'
        });

        // Version 2: Bible support
        this.version(2).stores({
            bibleVersions: 'id, abbreviation',
            bibleVerses: 'id, versionId, [versionId+book+chapter], [versionId+book+chapter+verse]',
            chapterSummaries: 'id, [book+chapter]'
        });
    }
}

export const db = new ParchmentsDatabase();

// Helper functions
export const dbHelpers = {
    // Notes
    createNote: async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
        const timestamp = Date.now();
        const newNote: Note = {
            ...note,
            id: uuidv4(),
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        await db.notes.add(newNote);
        return newNote;
    },

    updateNote: async (id: string, updates: Partial<Note>) => {
        await db.notes.update(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },

    deleteNote: async (id: string) => {
        await db.notes.delete(id);
    },

    // Folders
    createFolder: async (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => {
        const timestamp = Date.now();
        const newFolder: Folder = {
            ...folder,
            id: uuidv4(),
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        await db.folders.add(newFolder);
        return newFolder;
    },

    deleteFolder: async (id: string) => {
        // Simple/Naive: Delete folder and move children to root? Or delete children?
        // Let's delete children notes for now.
        const notes = await db.notes.where('folderId').equals(id).toArray();
        await db.notes.bulkDelete(notes.map(n => n.id));
        await db.folders.delete(id);
    },

    // Users (Mock/Local simplistic)
    createUser: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'preferences'>) => {
        const timestamp = Date.now();
        const newUser: User = {
            ...user,
            id: uuidv4(),
            createdAt: timestamp,
            updatedAt: timestamp,
            preferences: { theme: 'light', sidebarOpen: true }
        };
        await db.users.add(newUser);
        return newUser;
    },

    getUserByEmail: async (email: string) => {
        return await db.users.where('email').equals(email).first();
    }
};
