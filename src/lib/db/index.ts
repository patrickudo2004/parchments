import Dexie, { type Table } from 'dexie';
import type { Note, Folder, User, BibleVersion, BibleVerse, ChapterSummary, StrongsEntry, BibleCrossRef } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export class ParchmentsDatabase extends Dexie {
    notes!: Table<Note>;
    folders!: Table<Folder>;
    users!: Table<User>;
    bibleVersions!: Table<BibleVersion>;
    bibleVerses!: Table<BibleVerse>;
    chapterSummaries!: Table<ChapterSummary>;
    strongsEntries!: Table<StrongsEntry>;
    strongsConcordance!: Table<{ verseId: string; strongsNumbers: string[] }>;
    crossReferences!: Table<BibleCrossRef>;
    vectors!: Table<{ id: string; noteId: string; vector: Float32Array; lastIndexed: number }>;
    bibleVectors!: Table<{ id: string; versionId: string; book: string; chapter: number; verse: number; vector: Float32Array }>;

    constructor() {
        super('ParchmentsDB');

        // ... previous versions 1-7 ...

        // Version 8: Add Vectors table for Semantic Search & Bible Vectors
        this.version(8).stores({
            notes: 'id, title, folderId, type, createdAt, updatedAt, [folderId+createdAt]',
            folders: 'id, name, parentId, order, [parentId+order]',
            users: 'id, email, fullName',
            bibleVersions: 'id, abbreviation, isDownloaded',
            bibleVerses: 'id, versionId, book, [versionId+book+chapter], [versionId+book+chapter+verse], [book+chapter]',
            chapterSummaries: 'id, book, [book+chapter]',
            strongsEntries: 'id',
            strongsConcordance: 'verseId',
            crossReferences: 'id, sourceVerseId, targetType, [sourceVerseId+targetType]',
            vectors: 'id, noteId, lastIndexed',
            bibleVectors: 'id, versionId, [versionId+book+chapter]'
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

    searchNotes: async (query: string) => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();

        // Search in title and content
        // Note: For large datasets, this might need optimization
        return await db.notes
            .filter(note =>
                note.title.toLowerCase().includes(lowerQuery) ||
                note.content.toLowerCase().includes(lowerQuery)
            )
            .toArray();
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
    },

    // Bible Verses
    getVerseText: async (versionId: string, book: string, chapter: number, verse: number, verseEnd?: number | null) => {
        try {
            if (verseEnd && verseEnd > verse) {
                // Fetch verse range
                const verses = await db.bibleVerses
                    .where('[versionId+book+chapter]')
                    .equals([versionId, book, chapter])
                    .and(v => v.verse >= verse && v.verse <= verseEnd)
                    .sortBy('verse');

                return verses.map(v => `<sup>${v.verse}</sup> ${v.text}`).join(' ');
            } else {
                // Fetch single verse
                const verseData = await db.bibleVerses
                    .where('[versionId+book+chapter+verse]')
                    .equals([versionId, book, chapter, verse])
                    .first();

                return verseData ? `<sup>${verseData.verse}</sup> ${verseData.text}` : null;
            }
        } catch (error) {
            console.error('Error fetching verse:', error);
            return null;
        }
    },
    // Backup & Restore
    exportDatabase: async () => {
        const notes = await db.notes.toArray();
        const folders = await db.folders.toArray();
        const bibleVersions = await db.bibleVersions.toArray();
        const settings = localStorage.getItem('parchments-ui');

        return {
            version: '1.0',
            timestamp: Date.now(),
            data: {
                notes,
                folders,
                bibleVersions,
                uiSettings: settings ? JSON.parse(settings) : null
            }
        };
    },

    importDatabase: async (json: any) => {
        if (!json.data) throw new Error('Invalid backup file');

        const { notes, folders, bibleVersions, uiSettings } = json.data;

        await db.transaction('rw', [db.notes, db.folders, db.bibleVersions], async () => {
            if (notes) await db.notes.bulkPut(notes);
            if (folders) await db.folders.bulkPut(folders);
            if (bibleVersions) await db.bibleVersions.bulkPut(bibleVersions);
        });

        if (uiSettings) {
            localStorage.setItem('parchments-ui', JSON.stringify(uiSettings));
        }
    }
};
