// Type definitions for database models
export interface Note {
    id: string; // UUID
    title: string;
    content: string; // TipTap JSON or HTML
    folderId: string | null; // null = root level
    tags: string[];
    createdAt: number; // Unix timestamp
    updatedAt: number;
    type: 'text' | 'voice' | 'transcribed';
    wordCount?: number;
    pageCount?: number;
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null; // null = root level
    createdAt: number;
    order: number; // for manual sorting
}

export interface VoiceNote {
    id: string;
    noteId: string; // links to Note.id
    audioBlob: Blob; // actual audio data
    duration: number; // seconds
    transcription: string | null;
    transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: number;
}

export interface BibleVerse {
    id: string; // composite: version-book-chapter-verse
    version: string; // 'KJV', 'NKJV', etc.
    book: string; // 'Genesis', 'John', etc.
    bookNumber: number; // 1-66 for sorting
    chapter: number;
    verse: number;
    text: string;
}

export interface BibleVersion {
    id: string;
    abbreviation: string; // 'KJV', 'NKJV'
    name: string; // 'King James Version'
    language: string; // 'en'
    copyright: string;
    isDefault: boolean;
    installedAt: number;
    verseCount: number;
}

export interface StrongsEntry {
    id: string;
    number: string; // 'H1234' or 'G5678'
    language: 'hebrew' | 'greek';
    lemma: string; // original word
    transliteration: string;
    pronunciation: string;
    definition: string;
    kjvUsage: string;
}

export interface Setting {
    key: string;
    value: any; // JSON-serializable
}

export interface User {
    id: string;
    email: string;
    fullName?: string;
    passwordHash: string;
    createdAt: number;
}
