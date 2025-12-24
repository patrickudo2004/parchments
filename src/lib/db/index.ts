import Dexie, { type Table } from 'dexie';
import type {
    Note,
    Folder,
    VoiceNote,
    BibleVerse,
    BibleVersion,
    StrongsEntry,
    Setting,
} from '@/types/database';

export class ParchmentsDB extends Dexie {
    notes!: Table<Note>;
    folders!: Table<Folder>;
    voiceNotes!: Table<VoiceNote>;
    bibleVerses!: Table<BibleVerse>;
    bibleVersions!: Table<BibleVersion>;
    strongsEntries!: Table<StrongsEntry>;
    settings!: Table<Setting>;

    constructor() {
        super('ParchmentsDB');

        this.version(1).stores({
            notes: 'id, title, folderId, *tags, createdAt, updatedAt, type',
            folders: 'id, name, parentId, createdAt, order',
            voiceNotes: 'id, noteId, createdAt, duration, transcriptionStatus',
            bibleVerses: 'id, [version+book+chapter+verse], version, book, chapter, verse, bookNumber',
            bibleVersions: 'id, abbreviation, name, isDefault',
            strongsEntries: 'id, number, language, lemma',
            settings: 'key',
        });
    }
}

// Create a singleton instance
export const db = new ParchmentsDB();

// Helper functions for common database operations
export const dbHelpers = {
    // Notes
    async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
        const newNote: Note = {
            ...note,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await db.notes.add(newNote);
        return newNote;
    },

    async updateNote(id: string, updates: Partial<Note>): Promise<void> {
        await db.notes.update(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },

    async deleteNote(id: string): Promise<void> {
        await db.notes.delete(id);
        // Also delete associated voice notes
        const voiceNotes = await db.voiceNotes.where('noteId').equals(id).toArray();
        await db.voiceNotes.bulkDelete(voiceNotes.map(vn => vn.id));
    },

    async getNotesByFolder(folderId: string | null): Promise<Note[]> {
        return await db.notes.where('folderId').equals(folderId).toArray();
    },

    // Folders
    async createFolder(folder: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
        const newFolder: Folder = {
            ...folder,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };
        await db.folders.add(newFolder);
        return newFolder;
    },

    async deleteFolder(id: string): Promise<void> {
        // Delete all notes in folder
        const notes = await db.notes.where('folderId').equals(id).toArray();
        await db.notes.bulkDelete(notes.map(n => n.id));

        // Delete all subfolders recursively
        const subfolders = await db.folders.where('parentId').equals(id).toArray();
        for (const subfolder of subfolders) {
            await this.deleteFolder(subfolder.id);
        }

        // Delete the folder itself
        await db.folders.delete(id);
    },

    async getFoldersByParent(parentId: string | null): Promise<Folder[]> {
        return await db.folders.where('parentId').equals(parentId).sortBy('order');
    },

    // Bible
    async getBibleVersions(): Promise<BibleVersion[]> {
        return await db.bibleVersions.toArray();
    },

    async getDefaultBibleVersion(): Promise<BibleVersion | undefined> {
        return await db.bibleVersions.where('isDefault').equals(true).first();
    },

    async setDefaultBibleVersion(abbreviation: string): Promise<void> {
        // Unset all defaults
        const versions = await db.bibleVersions.toArray();
        await db.bibleVersions.bulkPut(
            versions.map(v => ({ ...v, isDefault: v.abbreviation === abbreviation }))
        );
    },

    async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleVerse | undefined> {
        return await db.bibleVerses.get({ version, book, chapter, verse });
    },

    async getChapter(version: string, book: string, chapter: number): Promise<BibleVerse[]> {
        return await db.bibleVerses
            .where({ version, book, chapter })
            .sortBy('verse');
    },

    async searchBible(version: string, query: string, limit: number = 100): Promise<BibleVerse[]> {
        const normalizedQuery = query.toLowerCase();
        return await db.bibleVerses
            .where('version')
            .equals(version)
            .filter(verse => verse.text.toLowerCase().includes(normalizedQuery))
            .limit(limit)
            .toArray();
    },

    // Settings
    async getSetting<T = any>(key: string): Promise<T | undefined> {
        const setting = await db.settings.get(key);
        return setting?.value;
    },

    async setSetting<T = any>(key: string, value: T): Promise<void> {
        await db.settings.put({ key, value });
    },
};
