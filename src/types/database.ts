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
    isSharedPlaceholder?: boolean; // True for in-memory collaborative notes not yet saved to a folder
    type: 'text' | 'voice';
    audioUrl?: string; // For voice notes
    audioBlob?: Blob; // Offline storage
    duration?: number; // In seconds
    transcript?: string; // Voice note transcript from Web Speech API
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

export interface BibleCrossRef {
    id: string;
    sourceVerseId: string; // book-chapter-verse
    targetType: 'verse' | 'note' | 'external';
    targetId: string; // verseId or noteId or URL
    linkType: 'citation' | 'parallel' | 'user' | 'tsk';
    metadata?: any;
}

// LECTIO MODE & READING PLANS
export interface ReadingPlanTrack {
    name: string;
    startBook: string;
    chaptersPerDay: number;
    currentBook: string;
    currentChapter: number;
    lastCompletedVerse?: number | null;
}

export interface ReadingPlan {
    id: string;
    name: string;
    status: 'active' | 'completed' | 'paused';
    startDate: number;
    endDate: number;
    tracks: ReadingPlanTrack[];
    folderId: string | null;
}

export interface ReadingPlanHistory {
    id: string; // planId-dateKey (e.g. planId-2026-05-29)
    planId: string;
    completedAt: number;
    noteId?: string;
}

// STUDY RESOURCE TYPES
export interface TSKReferenceItem {
    targetVerseId: string; // e.g. "Prov.3.19" or "Proverbs-3-19"
    displayRef: string;     // e.g. "Proverbs 3:19"
    votes?: number;
}

export interface TSKEntry {
    verseId: string; // normalized key: e.g. "genesis-1-1"
    refs: TSKReferenceItem[];
}

export interface CommentaryEntry {
    id: string; // e.g. "mh-john-3-16" or "jfb-john-3-16"
    source: 'mh' | 'jfb';
    sourceName: string; // "Matthew Henry" | "Jamieson-Fausset-Brown"
    book: string;
    chapter: number;
    verse?: number | null; // null if chapter-wide or range
    title?: string;
    text: string; // formatted text/HTML
}

export interface DictionaryEntry {
    id: string; // normalized term, e.g. "aaron"
    term: string; // display term: "Aaron"
    source: string; // "EAS" (Easton's)
    definition: string;
    scriptureRefs?: { reference: string; original: string }[];
}

export interface TopicalEntry {
    id: string; // normalized topic slug e.g. "aaron", "faith"
    topic: string; // display topic "Aaron", "Faith"
    category?: string;
    subtopics: {
        title: string;
        refs: string[]; // array of verse references e.g. ["EXO 6:16-20", "PSA 77:20"]
    }[];
}
