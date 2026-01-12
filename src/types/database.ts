export interface Note {
    id: string;
    title: string;
    content: string; // HTML content from TipTap
    createdAt: number;
    updatedAt: number;
    folderId: string | null;
    tags: string[];
    isArchived?: boolean;
    isPinned?: boolean;
    type: 'text' | 'voice';
    audioUrl?: string; // For voice notes
    audioBlob?: Blob; // Offline storage
    duration?: number; // In seconds
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: number;
    updatedAt: number;
    order: number;
}

export interface User {
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
    createdAt: number;
    updatedAt: number;
    preferences: {
        theme: 'light' | 'dark';
        sidebarOpen: boolean;
    };
}

// BIBLE TYPES
export interface BibleVersion {
    id: string;          // e.g., 'kjv', 'esv'
    name: string;        // e.g., 'King James Version'
    abbreviation: string; // e.g., 'KJV'
    language: string;    // e.g., 'eng'
    copyright: string;
    isDownloaded: boolean;
    downloadUrl?: string; // For cloud versions
}

export interface BibleVerse {
    id: string; // book-chapter-verse
    versionId: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
    interlinear?: InterlinearWord[];
}

export interface InterlinearWord {
    text: string;
    number: string; // Strong's number, e.g., "h120"
}

export interface StrongsEntry {
    id: string; // e.g., "H430"
    lemma: string;
    xlit: string;
    pron: string;
    derivation: string;
    strongs_def: string;
    kjv_def: string;
    usage?: string;
}

export interface ChapterSummary {
    id: string; // book-chapter
    book: string;
    chapter: number;
    summary: string;
}
