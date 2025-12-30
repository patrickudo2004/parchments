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
