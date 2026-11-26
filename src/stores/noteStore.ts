import { create } from 'zustand';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Note, Folder, TrashItem } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';
import {
    fileSystem,
    checkIsCapacitor,
    checkIsTauri,
    isWebFileSystemSupported,
    type FileSystemDirectoryHandle,
    type FileSystemHandle,
    type FileSystemFileHandle
} from '@/lib/filesystem/FileSystemService';
import {
    savePersistedDirectoryHandle,
    loadPersistedDirectoryHandle,
    clearPersistedDirectoryHandle,
    queryDirectoryPermission,
    requestDirectoryPermission
} from '@/lib/filesystem/fsHandleStore';

const AUDIO_FILE_REGEX = /\.(webm|mp4|m4a|mp3|ogg|wav)$/i;

function isAudioFileName(name: string): boolean {
    return AUDIO_FILE_REGEX.test(name);
}

function isSupportedLocalNoteFile(name: string): boolean {
    const lower = name.toLowerCase();
    return (
        MarkdownService.isMarkdownFile(name) ||
        MarkdownService.isHtmlFile(name) ||
        lower.endsWith('.txt') ||
        isAudioFileName(name)
    );
}

export function normalizeFsPath(p: string | null | undefined): string | null {
    if (!p) return null;
    return p.replace(/\\/g, '/').replace(/\/+$/, '');
}
import { SemanticSearchService } from '@/lib/search/semanticSearchService';
import { MarkdownService } from '@/lib/markdown/MarkdownService';
import { useUIStore } from '@/stores/uiStore';
import DOMPurify from 'dompurify';


export const UNTITLED_NOTE = 'Untitled Note';
export const UNTITLED_FOLDER = 'Untitled Folder';
export const UNTITLED_SPACE = 'Untitled Space';

export interface LocalItem {
    id: string;
    name: string;
    kind: 'file' | 'directory';
    handle: FileSystemHandle;
    parentId: string | null;
}

export const STUDY_TEMPLATES = {
    soap: {
        id: 'soap',
        name: 'SOAP Method',
        description: 'Scripture, Observation, Application, Prayer. A simple devotional structure.',
        content: `
            <h1>SOAP Devotional</h1>
            <h2>Scripture</h2>
            <p>Write the verse(s) that stood out to you today.</p>
            <p></p>
            <h2>Observation</h2>
            <p>What did you notice about this text? Who is talking? What is the context?</p>
            <p></p>
            <h2>Application</h2>
            <p>How does this scripture apply to your life right now? What is God saying to you?</p>
            <p></p>
            <h2>Prayer</h2>
            <p>Write a prayer in response to what you've studied.</p>
            <p></p>
        `
    },
    inductive: {
        id: 'inductive',
        name: 'Inductive Study',
        description: 'Observation, Interpretation, Application. A deep-dive research approach.',
        content: `
            <h1>Inductive Bible Study</h1>
            <h2>Observation</h2>
            <p>What does it say? Note words, transitions, and repeated terms.</p>
            <p></p>
            <h2>Interpretation</h2>
            <p>What does it mean? What was the author's original intent to the original audience?</p>
            <p></p>
            <h2>Application</h2>
            <p>How do I live this out? What change is required in my character or actions?</p>
            <p></p>
        `
    },
    expository: {
        id: 'expository',
        name: 'Expository Sermon',
        description: 'Title, Introduction, Points, Conclusion. For structured teaching.',
        content: `
            <h1>Sermon Outline</h1>
            <p><strong>Main Idea:</strong> </p>
            <h2>Introduction</h2>
            <p>Hook, background, and the primary tension of the text.</p>
            <p></p>
            <h2>Point 1: [Executive Title]</h2>
            <p>Exegesis and illustration.</p>
            <p></p>
            <h2>Point 2: [Executive Title]</h2>
            <p>Exegesis and illustration.</p>
            <p></p>
            <h2>Point 3: [Executive Title]</h2>
            <p>Exegesis and illustration.</p>
            <p></p>
            <h2>Conclusion</h2>
            <p>Summary and the "So What?" (Final Call to Action).</p>
            <p></p>
        `
    },
    journal: {
        id: 'journal',
        name: 'Daily Reflection',
        description: 'A free-form space for daily thoughts and scripture interactions.',
        content: `
            <h1>Daily Reflection</h1>
            <p><em>Date: ${new Date().toLocaleDateString()}</em></p>
            <p></p>
            <h2>Thoughts & Meditations</h2>
            <p>What is on your heart today?</p>
            <p></p>
            <h2>Scripture Integration</h2>
            <p></p>
        `
    },
    topical: {
        id: 'topical',
        name: 'Topical Sermon',
        description: 'Theme, Key Verses, Practical Life Truths, Gospel Connection.',
        content: `
            <h1>Topical Sermon Outline</h1>
            <p><strong>Series / Topic:</strong> </p>
            <p><strong>Central Proposition:</strong> What single biblical truth must the hearers take away?</p>
            <p></p>
            <h2>1. The Felt Need & Cultural Tension</h2>
            <p>Where does modern life collide with this topic? What is the human struggle?</p>
            <p></p>
            <h2>2. Biblical Framework & Key Passages</h2>
            <p>What does the whole counsel of scripture say about this?</p>
            <p></p>
            <h2>3. Practical Principles & Life Applications</h2>
            <p>Actionable steps for Monday morning obedience.</p>
            <p></p>
            <h2>4. The Gospel Climax & Response</h2>
            <p>How does Christ resolve the tension? Altar call or prayer response.</p>
        `
    },
    counseling: {
        id: 'counseling',
        name: 'Pastoral Care & Counseling',
        description: 'Confidential care log, presenting issue, scripture comfort, action plan.',
        content: `
            <h1>Pastoral Care Session</h1>
            <p><em>Confidential Ministry Note · Date: ${new Date().toLocaleDateString()}</em></p>
            <p></p>
            <h2>Presenting Situation & Emotional State</h2>
            <p>What brought them in? Summary of heart condition and circumstances.</p>
            <p></p>
            <h2>Scripture Ministry & Gospel Comfort</h2>
            <p>Relevant passages spoken, prayed over, or assigned.</p>
            <p></p>
            <h2>Next Steps & Action Commitments</h2>
            <p>Practical homework, boundaries, or referrals for accountability.</p>
            <p></p>
            <h2>Pastoral Prayer Focus</h2>
            <p>Specific prayer petitions for ongoing intercession.</p>
        `
    },
    funeral: {
        id: 'funeral',
        name: 'Memorial & Funeral Service',
        description: 'Order of service, eulogy notes, resurrection scriptures, committal words.',
        content: `
            <h1>Memorial Service Liturgy & Message</h1>
            <p><em>In Loving Memory of: </em></p>
            <p><em>Date: ${new Date().toLocaleDateString()} · Officiant: </em></p>
            <p></p>
            <h2>1. Order of Service</h2>
            <p>Prelude · Opening Prayer · Scripture Reading · Family Tributes · Pastoral Homily · Benediction</p>
            <p></p>
            <h2>2. Comforting Scripture Passages</h2>
            <p>e.g. Psalm 23, John 11:25-26, 1 Thessalonians 4:13-18, Revelation 21:1-4</p>
            <p></p>
            <h2>3. Homily: The Hope of the Resurrection</h2>
            <p>Proclaiming Christian hope, honoring the departed's faith journey, and comforting the grieving.</p>
            <p></p>
            <h2>4. Committal & Final Blessing</h2>
            <p>"Earth to earth, ashes to ashes, dust to dust; in sure and certain hope of the Resurrection unto eternal life..."</p>
        `
    },
    communion: {
        id: 'communion',
        name: "Lord's Supper & Communion",
        description: 'Words of institution, Eucharistic liturgy, call to confession, distribution.',
        content: `
            <h1>The Lord's Supper & Holy Communion</h1>
            <p><em>Liturgical Order · Date: ${new Date().toLocaleDateString()}</em></p>
            <p></p>
            <h2>1. Call to the Table & Invitation</h2>
            <p>Welcoming all believers to partake of the body and blood of our Lord Jesus Christ.</p>
            <p></p>
            <h2>2. Examination & Prayer of Confession</h2>
            <p>1 Corinthians 11:28 · Silent reflection and corporate prayer for cleansing.</p>
            <p></p>
            <h2>3. Words of Institution</h2>
            <p><em>"For I received from the Lord what I also passed on to you: The Lord Jesus, on the night he was betrayed, took bread..." (1 Cor 11:23-26)</em></p>
            <p></p>
            <h2>4. Distribution & Thanksgiving</h2>
            <p>Bread: "The body of Christ, broken for you."</p>
            <p>Cup: "The blood of Christ, shed for the remission of sins."</p>
            <p></p>
            <h2>5. Closing Doxology & Benediction</h2>
            <p></p>
        `
    }
};

interface NoteStore {
    currentNote: Note | null;
    notes: Note[];
    folders: Folder[];
    trashItems: TrashItem[];
    isLoading: boolean;
    // Local File System State
    isLocalMode: boolean;
    localDirectoryHandle: FileSystemDirectoryHandle | null;
    localFiles: LocalItem[];
    currentFileHandle: FileSystemFileHandle | null;
    hasStudyspace: boolean;
    isWorkspaceLocked: boolean;
    lockedNotesBuffer: string[];
    flushWorkspaceLockBuffer: () => Promise<void>;
    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    loadTrash: () => Promise<void>;
    createNote: (folderId: string | null, title?: string, forceId?: string) => Promise<Note>;
    createNoteFromTemplate: (folderId: string | null, templateId: string) => Promise<Note>;
    createVoiceNote: (folderId: string | null, audioBlob: Blob, duration: number, transcript: string) => Promise<Note>;
    updateNoteTranscript: (noteId: string, transcript: string) => Promise<void>;
    autoTranscribeVoiceNote: (noteId: string, audioBlob: Blob) => Promise<void>;
    createFolder: (name: string, parentId?: string | null, forceId?: string) => Promise<Folder>;
    deleteNote: (id: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    moveNoteToTrash: (id: string) => Promise<void>;
    moveFolderToTrash: (id: string) => Promise<void>;
    restoreTrashItem: (trashId: string) => Promise<void>;
    permanentlyDeleteTrashItem: (trashId: string) => Promise<void>;
    emptyTrash: () => Promise<void>;
    getFolderBlastRadius: (folderId: string) => { noteCount: number; folderCount: number; sampleNames: string[] };
    renameNote: (id: string, newName: string) => Promise<void>;
    renameFolder: (id: string, newName: string) => Promise<void>;
    moveNote: (noteId: string, destinationFolderId: string | null) => Promise<void>;
    moveFolder: (folderId: string, destinationParentId: string | null) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    updateCurrentNoteMetadata: (metadata: Record<string, any>) => void;
    setNotes: (notes: Note[]) => void;

    // Global Selection State
    selectedFolderId: string | null;
    setSelectedFolderId: (id: string | null) => void;

    // Sync Actions
    broadcastFolderChange: (folderId: string | null) => Promise<void>;
    broadcastNoteDeletion: (folderId: string | null, noteId: string) => Promise<void>;

    // Local Actions
    pendingLocalRawHandle: any | null;
    needsLocalReconnect: boolean;
    refreshLocalFiles: (forceUpdate?: boolean) => Promise<void>;
    openLocalFolder: () => Promise<void>;
    openLocalFile: (item: LocalItem) => Promise<void>;
    openLooseFile: () => Promise<void>;
    // Local Creation Actions
    saveCurrentNote: (title: string, content: string, targetNoteId?: string) => Promise<void>;
    setLocalMode: (enabled: boolean) => void;
    createLocalNote: (fileName: string, targetFolderId: string | null, content?: string, forceId?: string) => Promise<void>;
    createLocalFolder: (folderName: string, targetFolderId: string | null) => Promise<void>;
    createLocalVoiceNote: (audioBlob: Blob, targetFolderId: string | null, duration: number, transcript: string) => Promise<void>;
    saveLocalAsset: (file: File) => Promise<{ url: any; fileName: string; } | null>;
    hydrateAssets: (content: string) => Promise<string>;
    dehydrateAssets: (content: string) => string;
    sortLocalItems: (items: LocalItem[]) => LocalItem[];
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string | null) => void;
    createWorkspace: (name: string) => Promise<void>;
    storageFoundation: 'local' | 'browser' | null;
    lastLocalFolderName: string | null;
    isMigrationModalOpen: boolean;
    pendingMigrationCount: number;
    setIsMigrationModalOpen: (open: boolean) => void;
    selectStorageFoundation: (type: 'local' | 'browser') => Promise<void>;
    reconnectLocalFolder: () => Promise<void>;
    migrateBrowserNotesToLocalFolder: () => Promise<{ migratedNotes: number; migratedFolders: number }>;
    initStorageFoundation: () => Promise<void>;
}

function checkIsAutoSandbox(): boolean {
    if (typeof window === 'undefined') return false;
    const hasNativeFs = checkIsTauri() || checkIsCapacitor();
    return !hasNativeFs && !isWebFileSystemSupported();
}

const autoSandboxInit = checkIsAutoSandbox();

const savedStorageFoundation = typeof window !== 'undefined' ? (localStorage.getItem('parchments-storage-foundation') as 'local' | 'browser' | null) : null;
const savedLastFolderName = typeof window !== 'undefined' ? localStorage.getItem('parchments-last-folder-name') : null;

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    trashItems: [],
    isLoading: false,
    selectedFolderId: null,
    setSelectedFolderId: (id) => set({ selectedFolderId: id }),
    storageFoundation: savedStorageFoundation,
    lastLocalFolderName: savedLastFolderName,
    pendingLocalRawHandle: null,
    needsLocalReconnect: savedStorageFoundation === 'local' && !autoSandboxInit,
    isMigrationModalOpen: false,
    pendingMigrationCount: 0,
    setIsMigrationModalOpen: (open) => set({ isMigrationModalOpen: open }),
    isLocalMode: savedStorageFoundation === 'local' ? !autoSandboxInit : false,
    localDirectoryHandle: null,
    localFiles: [],
    currentFileHandle: null,
    hasStudyspace: savedStorageFoundation === 'browser' || (savedStorageFoundation === 'local' && autoSandboxInit),
    isWorkspaceLocked: false,
    lockedNotesBuffer: [],
    activeWorkspaceId: null,
    setActiveWorkspaceId: (id) => {
        if (id) {
            localStorage.setItem('parchments-active-workspace', id);
        } else {
            localStorage.removeItem('parchments-active-workspace');
        }
        set({ activeWorkspaceId: id, selectedFolderId: null, currentNote: null });
    },
    createWorkspace: async (name) => {
        const folder = await get().createFolder(name, null);
        set({ activeWorkspaceId: folder.id, selectedFolderId: null, currentNote: null });
        localStorage.setItem('parchments-active-workspace', folder.id);
    },
    flushWorkspaceLockBuffer: async () => {
        const { isWorkspaceLocked, lockedNotesBuffer, localFiles, dehydrateAssets } = get();
        if (!isWorkspaceLocked || lockedNotesBuffer.length === 0) return;

        console.log(`[Workspace Lock Flusher] 🔄 Attempting to flush ${lockedNotesBuffer.length} buffered note writes...`);
        const remainingBuffer: string[] = [];

        for (const fileId of lockedNotesBuffer) {
            const dbNote = await db.notes.get(fileId);
            const localFile = localFiles.find(f => f.id === fileId && f.kind === 'file');

            if (dbNote && localFile) {
                try {
                    const dehydratedHtml = dehydrateAssets(dbNote.content);
                    let fsContent = dehydratedHtml;
                    if (MarkdownService.isMarkdownFile(localFile.name)) {
                        fsContent = MarkdownService.htmlToMarkdown(dehydratedHtml, dbNote.metadata);
                    }
                    await fileSystem.writeFile(localFile.handle as FileSystemFileHandle, fsContent);
                    console.log(`[Workspace Lock Flusher] 💾 Flushed buffered note: ${localFile.name}`);
                } catch (e) {
                    console.error(`[Workspace Lock Flusher] Failed to write ${localFile.name}, keeping in buffer:`, e);
                    remainingBuffer.push(fileId);
                }
            }
        }

        set({
            lockedNotesBuffer: remainingBuffer,
            isWorkspaceLocked: remainingBuffer.length > 0
        });
    },

    // Internal Helper: Enforce stable sorting (Folders > Files, then alphabetical)
    sortLocalItems: (items: LocalItem[]) => {
        return [...items].sort((a, b) => {
            if (a.kind !== b.kind) {
                return a.kind === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    },

    broadcastFolderChange: async (_folderId: string | null) => {
        // Folder-level sharing has been removed. This is now a no-op.
        // Single-note sharing via JoinHandler replaces this functionality.
        return;
    },

    broadcastNoteDeletion: async (_folderId: string | null, _noteId: string) => {
        // Folder-level sharing has been removed. This is now a no-op.
        return;
    },

    loadNotes: async () => {
        set({ isLoading: true });
        const notes = await db.notes.toArray();
        set({ notes, isLoading: false });
    },

    loadFolders: async () => {
        let folders = await db.folders.toArray();
        const { isLocalMode, storageFoundation } = get();
        
        if (!isLocalMode) {
            // Find folders with parentId === null
            let workspaces = folders.filter(f => f.parentId === null);
            if (workspaces.length === 0) {
                const defaultWorkspace = await dbHelpers.createFolder({
                    name: 'Study Journal',
                    parentId: null,
                    order: 0
                });
                folders = await db.folders.toArray();
                workspaces = [defaultWorkspace];
            }
            
            let activeId = get().activeWorkspaceId;
            if (!activeId || !workspaces.some(w => w.id === activeId)) {
                const savedId = localStorage.getItem('parchments-active-workspace');
                if (savedId && workspaces.some(w => w.id === savedId)) {
                    activeId = savedId;
                } else {
                    activeId = workspaces[0].id;
                    localStorage.setItem('parchments-active-workspace', activeId);
                }
            }
            
            // Migration: Move legacy root folders/notes to activeId
            let migratedAny = false;
            for (const f of folders) {
                if (f.parentId === null && f.id !== activeId && !workspaces.some(w => w.id === f.id)) {
                    await db.folders.update(f.id, { parentId: activeId });
                    migratedAny = true;
                }
            }
            
            const notes = await db.notes.toArray();
            for (const n of notes) {
                if (n.folderId === null) {
                    await db.notes.update(n.id, { folderId: activeId });
                    migratedAny = true;
                }
            }
            
            if (migratedAny) {
                folders = await db.folders.toArray();
                const updatedNotes = await db.notes.toArray();
                set({ notes: updatedNotes });
            }
            
            set({ activeWorkspaceId: activeId });
        }
        
        const hasChosenFoundation = storageFoundation !== null;
        const latestState = get();
        set({
            folders,
            hasStudyspace: !hasChosenFoundation
                ? false
                : (!latestState.isLocalMode ? true : Boolean(latestState.localDirectoryHandle))
        });
    },

    createNote: async (folderId, title, forceId) => {
        const { isLocalMode, createLocalNote, activeWorkspaceId, selectedFolderId, currentNote } = get();
        const effectiveFolderId = folderId !== undefined && folderId !== null 
            ? folderId 
            : (selectedFolderId || currentNote?.folderId || null);

        if (isLocalMode) {
            if (!get().localDirectoryHandle) {
                await get().reconnectLocalFolder();
            }
            if (!get().localDirectoryHandle) {
                useUIStore.getState().showToast('Reconnect your local folder first, or switch to Browser Database.', 'info');
                throw new Error('Local folder is not connected');
            }
            const name = title || UNTITLED_NOTE;
            await createLocalNote(name, effectiveFolderId, '', forceId);
            const activeNote = get().currentNote;
            console.log(`[CREATE NOTE LOCAL] Broadcasting folder change for: ${effectiveFolderId}`);
            get().broadcastFolderChange(effectiveFolderId);
            return activeNote as Note;
        }

        const targetFolderId = effectiveFolderId || activeWorkspaceId;

        const note = await dbHelpers.createNote({
            title: title || UNTITLED_NOTE,
            content: '',
            folderId: targetFolderId,
            tags: [],
            type: 'text',
        }, forceId);
        const { notes, broadcastFolderChange } = get();
        set({ notes: [...notes, note], currentNote: note });
        broadcastFolderChange(targetFolderId);
        return note;
    },

    createNoteFromTemplate: async (folderId, templateId) => {
        const { isLocalMode, createLocalNote, activeWorkspaceId, selectedFolderId, currentNote } = get();
        const effectiveFolderId = folderId !== undefined && folderId !== null 
            ? folderId 
            : (selectedFolderId || currentNote?.folderId || null);
        const template = STUDY_TEMPLATES[templateId as keyof typeof STUDY_TEMPLATES];
        if (!template) throw new Error('Template not found');

        const dateStr = new Date().toLocaleDateString().replace(/[/:]/g, '-');
        const title = `${template.name} - ${dateStr}`;

        if (isLocalMode) {
            if (!get().localDirectoryHandle) {
                await get().reconnectLocalFolder();
            }
            if (!get().localDirectoryHandle) {
                useUIStore.getState().showToast('Reconnect your local folder first, or switch to Browser Database.', 'info');
                throw new Error('Local folder is not connected');
            }
            await createLocalNote(title, effectiveFolderId, template.content);
            return (get().currentNote || {}) as Note;
        }

        const targetFolderId = effectiveFolderId || activeWorkspaceId;

        const note = await dbHelpers.createNote({
            title,
            content: template.content,
            folderId: targetFolderId,
            tags: [],
            type: 'text',
        });
        const { notes, broadcastFolderChange } = get();
        set({ notes: [...notes, note], currentNote: note });
        broadcastFolderChange(targetFolderId);
        return note;
    },

    createVoiceNote: async (folderId, audioBlob, duration, transcript) => {
        const { isLocalMode, createLocalVoiceNote, activeWorkspaceId, selectedFolderId, currentNote } = get();
        const effectiveFolderId = folderId !== undefined && folderId !== null 
            ? folderId 
            : (selectedFolderId || currentNote?.folderId || null);

        if (isLocalMode) {
            if (!get().localDirectoryHandle) {
                await get().reconnectLocalFolder();
            }
            if (!get().localDirectoryHandle) {
                useUIStore.getState().showToast('Reconnect your local folder first, or switch to Browser Database.', 'info');
                throw new Error('Local folder is not connected');
            }
            await createLocalVoiceNote(audioBlob, effectiveFolderId, duration, transcript);
            return (get().currentNote || {}) as Note;
        }

        const targetFolderId = effectiveFolderId || activeWorkspaceId;

        const initialHtml = transcript
            ? `<p>${transcript}</p>`
            : '<p><em>Transcribing audio...</em></p>';

        const note = await dbHelpers.createNote({
            title: `Voice Note ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            content: initialHtml,
            folderId: targetFolderId,
            tags: ['voice'],
            type: 'voice',
            audioBlob,
            duration,
            transcript: transcript || '',
        });
        const { notes, broadcastFolderChange } = get();
        set({ notes: [...notes, note], currentNote: note });
        useUIStore.getState().activeEditor?.commands.setContent(initialHtml);
        broadcastFolderChange(targetFolderId);

        if (!transcript && audioBlob) {
            get().autoTranscribeVoiceNote(note.id, audioBlob);
        }

        return note;
    },

    updateNoteTranscript: async (noteId: string, transcript: string) => {
        const { isLocalMode, localFiles, notes, currentNote } = get();
        if (isLocalMode) {
            const item = localFiles.find(f => f.id === noteId && f.kind === 'file');
            if (item && item.handle) {
                try {
                    const existing = await fileSystem.readFile(item.handle as FileSystemFileHandle) as string;
                    let updated = existing;
                    const metaMatch = existing.match(/<!--\s*parchments-meta:\s*(\{.*?\})\s*-->/);
                    if (metaMatch) {
                        try {
                            const meta = JSON.parse(metaMatch[1]);
                            meta.transcript = transcript;
                            updated = existing.replace(metaMatch[0], `<!-- parchments-meta: ${JSON.stringify(meta)} -->`);
                        } catch {}
                    }
                    if (updated.includes('Transcribing audio...')) {
                        updated = updated.replace('Transcribing audio...', transcript);
                    } else if (updated.includes('<p>No transcript available.</p>')) {
                        updated = updated.replace('<p>No transcript available.</p>', `<p>${transcript}</p>`);
                    } else if (updated.includes('<h1>Voice Transcript</h1>')) {
                        updated = updated.replace(/<h1>Voice Transcript<\/h1><p>.*?<\/p>/, `<h1>Voice Transcript</h1><p>${transcript}</p>`);
                    }
                    await fileSystem.writeFile(item.handle as FileSystemFileHandle, updated);
                } catch (err) {
                    console.error('[NoteStore] Failed to update local note transcript:', err);
                }
            }
        } else {
            const formattedHtml = `<p>${transcript}</p>`;
            await db.notes.update(noteId, { transcript, content: formattedHtml, updatedAt: Date.now() });
            const updatedNotes = notes.map(n => n.id === noteId ? { ...n, transcript, content: formattedHtml, updatedAt: Date.now() } : n);
            set({ notes: updatedNotes });
        }

        if (currentNote && currentNote.id === noteId) {
            const formattedHtml = `<p>${transcript}</p>`;
            set({ currentNote: { ...currentNote, transcript, content: formattedHtml, updatedAt: Date.now() } });
            const activeEd = useUIStore.getState().activeEditor;
            if (activeEd) {
                activeEd.commands.setContent(formattedHtml);
            }
        }
    },

    autoTranscribeVoiceNote: async (noteId: string, audioBlob: Blob) => {
        try {
            const { transcribeAudioWithWhisper } = await import('@/lib/voice/transcriptionService');
            const { TheologicalSpeechProcessor } = await import('@/lib/voice/theologicalSpeechProcessor');
            useUIStore.getState().showToast('Transcribing audio in background...', 'info');
            const rawTranscript = await transcribeAudioWithWhisper(audioBlob, { highAccuracy: false });
            if (rawTranscript) {
                const transcript = TheologicalSpeechProcessor.processTranscript(rawTranscript);
                await get().updateNoteTranscript(noteId, transcript);
                useUIStore.getState().showToast('Voice note transcribed!', 'success');
            }
        } catch (err) {
            console.warn('[NoteStore] Auto-transcription skipped or failed:', err);
        }
    },

    createFolder: async (name, parentId = null, forceId) => {
        const { isLocalMode, activeWorkspaceId } = get();
        if (isLocalMode) {
            if (!get().localDirectoryHandle) {
                await get().reconnectLocalFolder();
            }
            if (!get().localDirectoryHandle) {
                useUIStore.getState().showToast('Reconnect your local folder first, or switch to Browser Database.', 'info');
                throw new Error('Local folder is not connected');
            }
            const safeFolderName = (name || UNTITLED_FOLDER).replace(/[:/\\*?"<>|]/g, '-').trim() || UNTITLED_FOLDER;
            await get().createLocalFolder(safeFolderName, parentId || null);
            const folderId = parentId ? `${parentId}/${safeFolderName}` : safeFolderName;
            return {
                id: folderId,
                name: safeFolderName,
                parentId: parentId || null,
                order: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }

        const targetParentId = parentId || activeWorkspaceId;

        const folder = await dbHelpers.createFolder({
            name,
            parentId: targetParentId,
            order: 0,
        }, forceId);
        const { folders } = get();
        set({ folders: [...folders, folder] });
        return folder;
    },

    deleteNote: async (id) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (item) {
                try {
                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.deleteEntry(parentHandle, item.name);

                    // If note has companion audio (voice note), delete it as well
                    try {
                        const content = await fileSystem.readFile(item.handle as FileSystemFileHandle) as string;
                        const audioLinkMatch = typeof content === 'string' ? content.match(/<!--\s*audio-link:\s*(.*?)\s*-->/) : null;
                        if (audioLinkMatch && audioLinkMatch[1]) {
                            await fileSystem.deleteEntry(parentHandle, audioLinkMatch[1]);
                        }
                    } catch (audioErr) {
                        console.warn('[deleteNote] Note audio cleanup notice:', audioErr);
                    }

                    if (currentNote?.id === id) {
                        set({ currentNote: null, currentFileHandle: null });
                    }
                    await get().refreshLocalFiles(true);

                    get().broadcastFolderChange(item.parentId);
                } catch (error) {
                    console.error('Failed to delete local file:', error);
                    useUIStore.getState().showToast('Failed to delete local file.', 'error');
                }
            }
        } else {
            const noteToDelete = notes.find(n => n.id === id);
            const folderId = noteToDelete?.folderId || null;
            await db.notes.delete(id);
            set({
                notes: notes.filter((n) => n.id !== id),
                currentNote: currentNote?.id === id ? null : currentNote,
            });
            get().broadcastNoteDeletion(folderId, id);
        }
    },

    deleteFolder: async (id) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders, notes, currentNote } = get();

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (item) {
                try {
                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.deleteEntry(parentHandle, item.name);
                    const normId = normalizeFsPath(id);
                    if (get().selectedFolderId === id || (normId && normalizeFsPath(get().selectedFolderId)?.startsWith(normId))) {
                        set({ selectedFolderId: null });
                    }
                    if (currentNote?.folderId === id || (normId && normalizeFsPath(currentNote?.folderId)?.startsWith(normId))) {
                        set({ currentNote: null, currentFileHandle: null });
                    }
                    await get().refreshLocalFiles(true);

                    if (item.parentId) {
                        get().broadcastNoteDeletion(item.parentId, item.id);
                    }
                    useUIStore.getState().showToast(`Permanently deleted "${item.name}"`, 'info');
                } catch (error) {
                    console.error('Failed to delete local folder:', error);
                    useUIStore.getState().showToast('Failed to delete local folder.', 'error');
                }
            }
        } else {
            // Collect folder + all descendant folders & notes cleanly so nothing is orphaned
            const descendantFolderIds = new Set<string>([id]);
            let added = true;
            while (added) {
                added = false;
                for (const f of folders) {
                    if (f.parentId && descendantFolderIds.has(f.parentId) && !descendantFolderIds.has(f.id)) {
                        descendantFolderIds.add(f.id);
                        added = true;
                    }
                }
            }
            const deletedNoteIds = new Set(notes.filter(n => n.folderId && descendantFolderIds.has(n.folderId)).map(n => n.id));
            const targetFolder = folders.find(f => f.id === id);

            await db.transaction('rw', [db.folders, db.notes], async () => {
                await db.folders.bulkDelete(Array.from(descendantFolderIds));
                if (deletedNoteIds.size > 0) {
                    await db.notes.bulkDelete(Array.from(deletedNoteIds));
                }
            });

            set({
                folders: folders.filter(f => !descendantFolderIds.has(f.id)),
                notes: notes.filter(n => !deletedNoteIds.has(n.id)),
                selectedFolderId: get().selectedFolderId && descendantFolderIds.has(get().selectedFolderId!) ? null : get().selectedFolderId,
                currentNote: currentNote && deletedNoteIds.has(currentNote.id) ? null : currentNote,
            });
            useUIStore.getState().showToast(`Permanently deleted "${targetFolder?.name || 'Folder'}"`, 'info');
        }
    },

    getFolderBlastRadius: (folderId: string) => {
        const { isLocalMode, localFiles, folders, notes } = get();
        if (isLocalMode) {
            const normTarget = normalizeFsPath(folderId);
            const childDirs = new Set<string>([folderId]);
            let changed = true;
            while (changed) {
                changed = false;
                for (const item of localFiles) {
                    if (item.kind === 'directory' && item.parentId) {
                        const parentMatch = childDirs.has(item.parentId) || (normTarget && normalizeFsPath(item.parentId)?.startsWith(normTarget));
                        if (parentMatch && !childDirs.has(item.id)) {
                            childDirs.add(item.id);
                            changed = true;
                        }
                    }
                }
            }
            const descFolders = localFiles.filter(f => f.kind === 'directory' && f.id !== folderId && childDirs.has(f.id));
            const descNotes = localFiles.filter(f => f.kind === 'file' && f.parentId && childDirs.has(f.parentId));
            return {
                noteCount: descNotes.length,
                folderCount: descFolders.length,
                sampleNames: [...descNotes.map(n => n.name), ...descFolders.map(d => `${d.name}/`)].slice(0, 6)
            };
        }

        const descFolderIds = new Set<string>([folderId]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const f of folders) {
                if (f.parentId && descFolderIds.has(f.parentId) && !descFolderIds.has(f.id)) {
                    descFolderIds.add(f.id);
                    changed = true;
                }
            }
        }
        const childFolders = folders.filter(f => f.id !== folderId && descFolderIds.has(f.id));
        const childNotes = notes.filter(n => n.folderId && descFolderIds.has(n.folderId));
        return {
            noteCount: childNotes.length,
            folderCount: childFolders.length,
            sampleNames: [...childNotes.map(n => n.title), ...childFolders.map(f => `${f.name}/`)].slice(0, 6)
        };
    },

    loadTrash: async () => {
        try {
            const now = Date.now();
            const all = await db.trash.toArray();
            const expired = all.filter(item => item.expiresAt <= now);
            if (expired.length > 0) {
                const { localDirectoryHandle } = get();
                for (const exp of expired) {
                    if (exp.storageMode === 'local' && exp.localTrashName && localDirectoryHandle) {
                        try {
                            const trashDir = await fileSystem.getDirectoryHandle(localDirectoryHandle, '.parchments-trash');
                            await fileSystem.deleteEntry(trashDir, exp.localTrashName);
                        } catch {
                            // Already removed on disk
                        }
                    }
                }
                await db.trash.bulkDelete(expired.map(e => e.id));
            }
            const active = all
                .filter(item => item.expiresAt > now)
                .sort((a, b) => b.deletedAt - a.deletedAt);
            set({ trashItems: active });
        } catch (err) {
            console.warn('[NoteStore] Failed to load trash:', err);
        }
    },

    moveNoteToTrash: async (id: string) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const trashId = `trash-${now}-${Math.random().toString(36).slice(2, 7)}`;

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (!item) return;

            try {
                let srcParent = localDirectoryHandle;
                if (item.parentId) {
                    const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                    if (parent) srcParent = parent.handle as FileSystemDirectoryHandle;
                }
                const trashDir = await fileSystem.createDirectory(localDirectoryHandle, '.parchments-trash');
                const storedName = `${trashId}__${item.name}`;
                const movedHandle = await fileSystem.moveEntry(item.handle, srcParent, trashDir, storedName);

                const record: TrashItem = {
                    id: trashId,
                    storageMode: 'local',
                    kind: 'file',
                    name: item.name,
                    originalParentId: item.parentId,
                    deletedAt: now,
                    expiresAt: now + thirtyDays,
                    localTrashName: movedHandle.name,
                    localOriginalRelPath: item.id,
                    localParentRelPath: item.parentId,
                };
                await db.trash.put(record);

                if (currentNote?.id === id) {
                    set({ currentNote: null, currentFileHandle: null });
                }
                await get().refreshLocalFiles(true);
                await get().loadTrash();
                useUIStore.getState().showToast(`Moved "${item.name}" to Trash`, 'info');
            } catch (err) {
                console.error('[NoteStore] Failed to move local note to trash:', err);
                useUIStore.getState().showToast('Could not move file to Trash.', 'error');
            }
            return;
        }

        const targetNote = notes.find(n => n.id === id);
        if (!targetNote) return;

        const record: TrashItem = {
            id: trashId,
            storageMode: 'browser',
            kind: 'file',
            name: targetNote.title || 'Untitled Note',
            originalParentId: targetNote.folderId,
            deletedAt: now,
            expiresAt: now + thirtyDays,
            noteSnapshot: targetNote,
        };
        await db.transaction('rw', [db.notes, db.trash], async () => {
            await db.trash.put(record);
            await db.notes.delete(id);
        });
        set({
            notes: notes.filter(n => n.id !== id),
            currentNote: currentNote?.id === id ? null : currentNote,
        });
        await get().loadTrash();
        useUIStore.getState().showToast(`Moved "${record.name}" to Trash`, 'info');
    },

    moveFolderToTrash: async (id: string) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders, notes, currentNote } = get();
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const trashId = `trash-${now}-${Math.random().toString(36).slice(2, 7)}`;

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (!item) return;

            try {
                const blast = get().getFolderBlastRadius(id);
                let srcParent = localDirectoryHandle;
                if (item.parentId) {
                    const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                    if (parent) srcParent = parent.handle as FileSystemDirectoryHandle;
                }
                const trashDir = await fileSystem.createDirectory(localDirectoryHandle, '.parchments-trash');
                const storedName = `${trashId}__${item.name}`;
                const movedHandle = await fileSystem.moveEntry(item.handle, srcParent, trashDir, storedName);

                const record: TrashItem = {
                    id: trashId,
                    storageMode: 'local',
                    kind: 'folder',
                    name: item.name,
                    originalParentId: item.parentId,
                    deletedAt: now,
                    expiresAt: now + thirtyDays,
                    localTrashName: movedHandle.name,
                    localOriginalRelPath: item.id,
                    localParentRelPath: item.parentId,
                    itemCount: blast.noteCount + blast.folderCount,
                };
                await db.trash.put(record);

                const normId = normalizeFsPath(id);
                if (get().selectedFolderId === id || (normId && normalizeFsPath(get().selectedFolderId)?.startsWith(normId))) {
                    set({ selectedFolderId: null });
                }
                if (currentNote?.folderId === id || (normId && normalizeFsPath(currentNote?.folderId)?.startsWith(normId))) {
                    set({ currentNote: null, currentFileHandle: null });
                }
                await get().refreshLocalFiles(true);
                await get().loadTrash();
                useUIStore.getState().showToast(`Moved folder "${item.name}" to Trash`, 'info');
            } catch (err) {
                console.error('[NoteStore] Failed to move local folder to trash:', err);
                useUIStore.getState().showToast('Could not move folder to Trash.', 'error');
            }
            return;
        }

        const targetFolder = folders.find(f => f.id === id);
        if (!targetFolder) return;

        const descFolderIds = new Set<string>([id]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const f of folders) {
                if (f.parentId && descFolderIds.has(f.parentId) && !descFolderIds.has(f.id)) {
                    descFolderIds.add(f.id);
                    changed = true;
                }
            }
        }
        const childFolders = folders.filter(f => f.id !== id && descFolderIds.has(f.id));
        const childNotes = notes.filter(n => n.folderId && descFolderIds.has(n.folderId));
        const deletedNoteIds = new Set(childNotes.map(n => n.id));

        const record: TrashItem = {
            id: trashId,
            storageMode: 'browser',
            kind: 'folder',
            name: targetFolder.name,
            originalParentId: targetFolder.parentId,
            deletedAt: now,
            expiresAt: now + thirtyDays,
            folderSnapshot: targetFolder,
            childFolders,
            childNotes,
            itemCount: childNotes.length + childFolders.length,
        };

        await db.transaction('rw', [db.folders, db.notes, db.trash], async () => {
            await db.trash.put(record);
            await db.folders.bulkDelete(Array.from(descFolderIds));
            if (deletedNoteIds.size > 0) {
                await db.notes.bulkDelete(Array.from(deletedNoteIds));
            }
        });

        set({
            folders: folders.filter(f => !descFolderIds.has(f.id)),
            notes: notes.filter(n => !deletedNoteIds.has(n.id)),
            selectedFolderId: get().selectedFolderId && descFolderIds.has(get().selectedFolderId!) ? null : get().selectedFolderId,
            currentNote: currentNote && deletedNoteIds.has(currentNote.id) ? null : currentNote,
        });
        await get().loadTrash();
        useUIStore.getState().showToast(`Moved folder "${targetFolder.name}" to Trash`, 'info');
    },

    restoreTrashItem: async (trashId: string) => {
        const record = await db.trash.get(trashId);
        if (!record) return;

        const { localDirectoryHandle, localFiles, activeWorkspaceId, folders, notes } = get();

        if (record.storageMode === 'local') {
            if (!localDirectoryHandle || !record.localTrashName) {
                useUIStore.getState().showToast('Reconnect your local folder first to restore this item.', 'info');
                return;
            }
            try {
                const trashDir = await fileSystem.getDirectoryHandle(localDirectoryHandle, '.parchments-trash');
                const entryHandle = record.kind === 'folder'
                    ? await fileSystem.getDirectoryHandle(trashDir, record.localTrashName)
                    : await fileSystem.getFileHandle(trashDir, record.localTrashName);

                let destDir = localDirectoryHandle;
                if (record.localParentRelPath) {
                    const normParent = normalizeFsPath(record.localParentRelPath);
                    const parentItem = localFiles.find(f => f.kind === 'directory' && (f.id === record.localParentRelPath || normalizeFsPath(f.id) === normParent));
                    if (parentItem) {
                        destDir = parentItem.handle as FileSystemDirectoryHandle;
                    }
                }

                await fileSystem.moveEntry(entryHandle, trashDir, destDir, record.name);
                await db.trash.delete(trashId);
                await get().refreshLocalFiles(true);
                await get().loadTrash();
                useUIStore.getState().showToast(`Restored "${record.name}"`, 'success');
            } catch (err) {
                console.error('[NoteStore] Failed to restore local trash item:', err);
                useUIStore.getState().showToast('Could not restore file from .parchments-trash.', 'error');
            }
            return;
        }

        // Browser DB Restore
        if (record.kind === 'file' && record.noteSnapshot) {
            const parentStillExists = record.originalParentId && folders.some(f => f.id === record.originalParentId);
            const restoredNote: Note = {
                ...record.noteSnapshot,
                folderId: parentStillExists ? record.originalParentId : activeWorkspaceId,
                updatedAt: Date.now(),
            };
            await db.transaction('rw', [db.notes, db.trash], async () => {
                await db.notes.put(restoredNote);
                await db.trash.delete(trashId);
            });
            set({ notes: [...notes.filter(n => n.id !== restoredNote.id), restoredNote] });
            await get().loadTrash();
            useUIStore.getState().showToast(`Restored "${restoredNote.title}"`, 'success');
        } else if (record.kind === 'folder' && record.folderSnapshot) {
            const parentStillExists = record.originalParentId && folders.some(f => f.id === record.originalParentId);
            const restoredRoot: Folder = {
                ...record.folderSnapshot,
                parentId: parentStillExists ? record.originalParentId : activeWorkspaceId,
                updatedAt: Date.now(),
            };
            const allRestoredFolders = [restoredRoot, ...(record.childFolders || [])];
            const allRestoredNotes = record.childNotes || [];
            await db.transaction('rw', [db.folders, db.notes, db.trash], async () => {
                await db.folders.bulkPut(allRestoredFolders);
                if (allRestoredNotes.length > 0) {
                    await db.notes.bulkPut(allRestoredNotes);
                }
                await db.trash.delete(trashId);
            });
            await get().loadFolders();
            await get().loadNotes();
            await get().loadTrash();
            useUIStore.getState().showToast(`Restored folder "${restoredRoot.name}"`, 'success');
        }
    },

    permanentlyDeleteTrashItem: async (trashId: string) => {
        const record = await db.trash.get(trashId);
        if (!record) return;
        const { localDirectoryHandle } = get();
        if (record.storageMode === 'local' && record.localTrashName && localDirectoryHandle) {
            try {
                const trashDir = await fileSystem.getDirectoryHandle(localDirectoryHandle, '.parchments-trash');
                await fileSystem.deleteEntry(trashDir, record.localTrashName);
            } catch {
                // Already deleted on disk
            }
        }
        await db.trash.delete(trashId);
        await get().loadTrash();
        useUIStore.getState().showToast(`Permanently removed "${record.name}"`, 'info');
    },

    emptyTrash: async () => {
        const { isLocalMode, localDirectoryHandle, trashItems } = get();
        const mode = isLocalMode ? 'local' : 'browser';
        const matching = trashItems.filter(item => item.storageMode === mode);
        if (matching.length === 0) return;

        if (isLocalMode && localDirectoryHandle) {
            try {
                const trashDir = await fileSystem.getDirectoryHandle(localDirectoryHandle, '.parchments-trash');
                for (const item of matching) {
                    if (item.localTrashName) {
                        try {
                            await fileSystem.deleteEntry(trashDir, item.localTrashName);
                        } catch {
                            // Ignore missing file
                        }
                    }
                }
            } catch {
                // Trash folder missing
            }
        }
        await db.trash.bulkDelete(matching.map(m => m.id));
        await get().loadTrash();
        useUIStore.getState().showToast('Trash emptied permanently', 'info');
    },

    renameNote: async (id, newName) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (item) {
                try {
                    const ext = item.name.includes('.') ? item.name.split('.').pop() : 'md';
                    const cleanNewName = newName.replace(/[:/\\*?"<>|]/g, '-').trim();
                    if (!cleanNewName) return;
                    const finalName = (MarkdownService.isMarkdownFile(cleanNewName) || MarkdownService.isHtmlFile(cleanNewName) || cleanNewName.endsWith('.txt'))
                        ? cleanNewName
                        : `${cleanNewName}.${ext}`;

                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    const updatedHandle = await fileSystem.renameEntry(item.handle, finalName, parentHandle) as FileSystemFileHandle;

                    if (currentNote?.id === id) {
                        set({
                            currentFileHandle: updatedHandle,
                            currentNote: {
                                ...currentNote,
                                title: finalName.replace(/\.(html|htm|md|markdown|mdown|mkdn|txt)$/i, '')
                            }
                        });
                    }
                    await get().refreshLocalFiles(true);
                } catch (error) {
                    console.error('Failed to rename local file:', error);
                    useUIStore.getState().showToast('Could not rename file on disk.', 'error');
                    throw error;
                }
            }
        } else {
            await db.notes.update(id, { title: newName, updatedAt: Date.now() });
            set({
                notes: notes.map(n => n.id === id ? { ...n, title: newName, updatedAt: Date.now() } : n),
                currentNote: currentNote?.id === id ? { ...currentNote, title: newName } : currentNote
            });
            const folderId = notes.find(n => n.id === id)?.folderId || null;
            get().broadcastFolderChange(folderId);
        }
    },

    renameFolder: async (id, newName) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders } = get();

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (item) {
                try {
                    const cleanNewName = newName.replace(/[:/\\*?"<>|]/g, '-').trim();
                    if (!cleanNewName) return;

                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.renameEntry(item.handle, cleanNewName, parentHandle);
                    await get().refreshLocalFiles(true);
                } catch (error) {
                    console.error('Failed to rename local folder:', error);
                    useUIStore.getState().showToast('Could not rename folder on disk.', 'error');
                    throw error;
                }
            }
        } else {
            await db.folders.update(id, { name: newName, updatedAt: Date.now() });
            set({
                folders: folders.map(f => f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f)
            });
        }
    },

    moveNote: async (noteId: string, destinationFolderId: string | null) => {
        const { isLocalMode, notes, currentNote, localFiles, localDirectoryHandle, refreshLocalFiles, openLocalFile } = get();

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const fileItem = localFiles.find(f => f.id === noteId && f.kind === 'file');
            if (!fileItem) return;

            // Determine source parent handle
            let srcParentHandle = localDirectoryHandle;
            if (fileItem.parentId) {
                const normParent = normalizeFsPath(fileItem.parentId);
                const parentItem = localFiles.find(f => (f.id === fileItem.parentId || normalizeFsPath(f.id) === normParent) && f.kind === 'directory');
                if (parentItem && parentItem.handle.kind === 'directory') {
                    srcParentHandle = parentItem.handle as FileSystemDirectoryHandle;
                }
            }

            // Determine destination parent handle
            let destParentHandle = localDirectoryHandle;
            if (destinationFolderId) {
                const normDest = normalizeFsPath(destinationFolderId);
                const destItem = localFiles.find(f => (f.id === destinationFolderId || normalizeFsPath(f.id) === normDest) && f.kind === 'directory');
                if (destItem && destItem.handle.kind === 'directory') {
                    destParentHandle = destItem.handle as FileSystemDirectoryHandle;
                }
            }

            // Read source file content
            const content = await fileSystem.readFile(fileItem.handle as FileSystemFileHandle) as string;

            // Check if there's a companion audio file (for voice notes)
            const audioLinkMatch = typeof content === 'string' ? content.match(/<!--\s*audio-link:\s*(.*?)\s*-->/) : null;
            let audioBlob: Blob | null = null;
            let audioFileName: string | null = null;
            if (audioLinkMatch && audioLinkMatch[1]) {
                audioFileName = audioLinkMatch[1];
                const siblingAudio = localFiles.find(f =>
                    f.parentId === fileItem.parentId &&
                    f.name === audioFileName &&
                    f.kind === 'file'
                );
                if (siblingAudio) {
                    try {
                        audioBlob = await fileSystem.readFile(siblingAudio.handle as FileSystemFileHandle, true) as Blob;
                    } catch (e) {
                        console.warn('[moveNote] Failed to read companion audio:', e);
                    }
                }
            }

            // Create in destination
            const newName = await fileSystem.getUniqueFileName(destParentHandle, fileItem.name);
            const newFileHandle = await fileSystem.createFile(destParentHandle, newName, content);

            // Copy audio companion if present
            if (audioBlob && audioFileName) {
                const uniqueAudioName = await fileSystem.getUniqueFileName(destParentHandle, audioFileName);
                await fileSystem.createFile(destParentHandle, uniqueAudioName, audioBlob);
                try {
                    await fileSystem.deleteEntry(srcParentHandle, audioFileName);
                } catch (e) {
                    console.warn('[moveNote] Failed to remove source audio companion:', e);
                }
            }

            // Delete from source
            await fileSystem.deleteEntry(srcParentHandle, fileItem.name);

            // Refresh file tree
            await refreshLocalFiles(true);

            // Re-open if active note was moved
            if (currentNote?.id === noteId) {
                await openLocalFile({
                    id: fileItem.id,
                    name: newName,
                    kind: 'file',
                    handle: newFileHandle,
                    parentId: destinationFolderId
                });
            }
            useUIStore.getState().showToast('Note moved successfully', 'success');
            return;
        }

        // Browser IndexedDB mode
        const destId = destinationFolderId ?? get().activeWorkspaceId;
        await db.notes.update(noteId, { folderId: destId, updatedAt: Date.now() });
        const updatedNotes = notes.map(n => n.id === noteId ? { ...n, folderId: destId, updatedAt: Date.now() } : n);
        set({
            notes: updatedNotes,
            currentNote: currentNote?.id === noteId ? { ...currentNote, folderId: destId } : currentNote
        });
        useUIStore.getState().showToast('Note moved successfully', 'success');
    },

    moveFolder: async (folderId: string, destinationParentId: string | null) => {
        const { isLocalMode, folders, localFiles, localDirectoryHandle, refreshLocalFiles, activeWorkspaceId } = get();

        if (folderId === destinationParentId) return;

        if (isLocalMode) {
            if (!localDirectoryHandle) return;
            const folderItem = localFiles.find(f => f.id === folderId && f.kind === 'directory');
            if (!folderItem) return;

            const normFolder = normalizeFsPath(folderId);
            const normDest = normalizeFsPath(destinationParentId);
            // Cycle guard: cannot move a folder into itself or any of its descendants
            if (normFolder && normDest && (normDest === normFolder || normDest.startsWith(`${normFolder}/`))) {
                useUIStore.getState().showToast('Cannot move a folder inside itself.', 'error');
                return;
            }
            if (normalizeFsPath(folderItem.parentId) === normDest) return;

            let srcParentHandle = localDirectoryHandle;
            if (folderItem.parentId) {
                const srcParent = localFiles.find(f => f.id === folderItem.parentId && f.kind === 'directory');
                if (srcParent) srcParentHandle = srcParent.handle as FileSystemDirectoryHandle;
            }

            let destParentHandle = localDirectoryHandle;
            if (destinationParentId) {
                const destParent = localFiles.find(f => (f.id === destinationParentId || normalizeFsPath(f.id) === normDest) && f.kind === 'directory');
                if (destParent) destParentHandle = destParent.handle as FileSystemDirectoryHandle;
            }

            try {
                await fileSystem.moveEntry(folderItem.handle, srcParentHandle, destParentHandle, folderItem.name);
                await refreshLocalFiles(true);
                useUIStore.getState().showToast(`Moved folder "${folderItem.name}"`, 'success');
            } catch (err) {
                console.error('[moveFolder] Failed to move local folder:', err);
                useUIStore.getState().showToast('Could not move folder on disk.', 'error');
            }
            return;
        }

        // Browser DB mode with cycle guard
        const targetParentId = destinationParentId ?? activeWorkspaceId;
        if (targetParentId === folderId) return;

        // Walk up ancestors of targetParentId to ensure folderId is not an ancestor
        let cursor = targetParentId;
        const seen = new Set<string>();
        while (cursor && !seen.has(cursor)) {
            if (cursor === folderId) {
                useUIStore.getState().showToast('Cannot move a folder inside itself.', 'error');
                return;
            }
            seen.add(cursor);
            const parentFolder = folders.find(f => f.id === cursor);
            cursor = parentFolder?.parentId ?? null;
        }

        const currentFolder = folders.find(f => f.id === folderId);
        if (!currentFolder || currentFolder.parentId === targetParentId) return;

        await db.folders.update(folderId, { parentId: targetParentId, updatedAt: Date.now() });
        set({
            folders: folders.map(f => f.id === folderId ? { ...f, parentId: targetParentId, updatedAt: Date.now() } : f),
        });
        useUIStore.getState().showToast(`Moved folder "${currentFolder.name}"`, 'success');
    },

    setCurrentNote: (note) => {
        set({ currentNote: note });
        if (note && note.content) {
            // Check for plan progress in metadata
            const metaMatch = note.content.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
            if (metaMatch && metaMatch[1]) {
                try {
                    const meta = JSON.parse(metaMatch[1]);
                    if (meta.lectioProgress) {
                        // Dynamically import useReadingPlanStore to parse and ingest progress
                        import('@/stores/readingPlanStore').then(async ({ useReadingPlanStore }) => {
                            const planStore = useReadingPlanStore.getState();
                            const progress = meta.lectioProgress;
                            
                            // 1. Ingest/Update plan in DB
                            const existingPlan = await db.readingPlans.get(progress.planId);
                            if (!existingPlan) {
                                console.log('[Sync] Creating synced reading plan:', progress.planName);
                                await db.readingPlans.put({
                                    id: progress.planId,
                                    name: progress.planName,
                                    status: 'active',
                                    startDate: progress.startDate,
                                    endDate: progress.endDate,
                                    tracks: progress.tracks,
                                    folderId: note.folderId
                                });
                            } else {
                                console.log('[Sync] Updating track cursors for plan:', progress.planName);
                                await db.readingPlans.update(progress.planId, {
                                    tracks: progress.tracks
                                });
                            }
                            await planStore.loadPlans();
                        });
                    }
                } catch (e) {
                    console.warn('[Sync] Failed to parse/ingest synced plan progress:', e);
                }
            }
        }
    },
    setNotes: (notes) => set({ notes }),
    updateCurrentNoteMetadata: (metadata: Record<string, any>) => {
        const { currentNote } = get();
        if (!currentNote) return;
        set({
            currentNote: {
                ...currentNote,
                metadata: {
                    ...(currentNote.metadata || {}),
                    ...metadata
                },
                updatedAt: Date.now()
            }
        });
    },

    openLocalFolder: async () => {
        try {
            const handle = await fileSystem.openDirectory();

            localStorage.setItem('parchments-storage-foundation', 'local');
            localStorage.setItem('parchments-last-folder-name', handle.name);
            if (handle.path) {
                localStorage.setItem('parchments-last-folder-path', handle.path);
            }
            if (handle.rawHandle) {
                await savePersistedDirectoryHandle(handle.rawHandle);
            }

            // Check if there are existing notes in db.notes that can be migrated
            const dbNotesCount = await db.notes.count();
            const shouldPromptMigration = dbNotesCount > 0;

            set({
                isLocalMode: true,
                storageFoundation: 'local',
                lastLocalFolderName: handle.name,
                localDirectoryHandle: handle,
                pendingLocalRawHandle: handle.rawHandle || null,
                needsLocalReconnect: false,
                hasStudyspace: true,
                currentNote: null,
                currentFileHandle: null,
                selectedFolderId: null,
                pendingMigrationCount: dbNotesCount,
                isMigrationModalOpen: shouldPromptMigration
            });

            // Canonical scan (populates localFiles with stable UUIDs and ingests plan.json)
            await get().refreshLocalFiles(true);

            // Auto-reveal left sidebar on folder connection
            useUIStore.getState().openLeftSidebar('files');
            useUIStore.getState().showToast(`Connected local folder '${handle.name}'`, 'success');
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.message?.includes('No directory selected')) {
                return;
            }
            console.error('Failed to open directory:', error);
            if (error?.code === 'UNSUPPORTED_BROWSER') {
                useUIStore.getState().showToast(
                    'Direct local folder access requires Chrome, Edge, or Opera (or the Parchments Desktop App).',
                    'error'
                );
            } else if (error?.name === 'SecurityError' || error?.name === 'NotAllowedError') {
                useUIStore.getState().showToast(
                    'Browser blocked that system folder (root Desktop/Documents/Downloads are restricted). Please select or create a subfolder like Documents/Parchments.',
                    'error'
                );
            } else {
                useUIStore.getState().showToast(
                    `Could not open local folder: ${error?.message || 'Permission denied'}`,
                    'error'
                );
            }
        }
    },

    selectStorageFoundation: async (type: 'local' | 'browser') => {
        if (type === 'browser') {
            localStorage.setItem('parchments-storage-foundation', 'browser');
            set({
                storageFoundation: 'browser',
                isLocalMode: false,
                needsLocalReconnect: false,
                hasStudyspace: true,
                currentNote: null,
                currentFileHandle: null,
                selectedFolderId: null
            });
            await get().loadFolders();
            await get().loadNotes();

            useUIStore.getState().openLeftSidebar('files');
        } else {
            await get().openLocalFolder();
        }
    },

    reconnectLocalFolder: async () => {
        const isDesktopTauri = checkIsTauri();
        const savedPath = typeof window !== 'undefined' ? localStorage.getItem('parchments-last-folder-path') : null;
        const savedName = typeof window !== 'undefined' ? localStorage.getItem('parchments-last-folder-name') : null;

        // 1. Desktop Tauri reconnect via path
        if (isDesktopTauri && savedPath) {
            try {
                const handle: FileSystemDirectoryHandle = {
                    kind: 'directory',
                    name: savedName || 'Studyspace',
                    path: savedPath
                };
                localStorage.setItem('parchments-storage-foundation', 'local');
                set({
                    isLocalMode: true,
                    storageFoundation: 'local',
                    lastLocalFolderName: handle.name,
                    localDirectoryHandle: handle,
                    needsLocalReconnect: false,
                    hasStudyspace: true,
                    currentNote: null,
                    currentFileHandle: null,
                    selectedFolderId: null
                });
                await get().refreshLocalFiles(true);
                await get().flushWorkspaceLockBuffer();
                useUIStore.getState().openLeftSidebar('files');
                useUIStore.getState().showToast(`Reconnected '${handle.name}'`, 'success');
                return;
            } catch (err) {
                console.warn('[NoteStore] Tauri path reconnect failed, falling back to picker:', err);
            }
        }

        // 2. Capacitor Android/iOS reconnect using native Documents/External Parchments folder
        if (checkIsCapacitor()) {
            try {
                const handle = await fileSystem.openDirectory();
                localStorage.setItem('parchments-storage-foundation', 'local');
                localStorage.setItem('parchments-last-folder-name', handle.name);
                if (handle.path) {
                    localStorage.setItem('parchments-last-folder-path', handle.path);
                }
                set({
                    isLocalMode: true,
                    storageFoundation: 'local',
                    lastLocalFolderName: handle.name,
                    localDirectoryHandle: handle,
                    needsLocalReconnect: false,
                    hasStudyspace: true,
                    currentNote: null,
                    currentFileHandle: null,
                    selectedFolderId: null
                });
                await get().refreshLocalFiles(true);
                await get().flushWorkspaceLockBuffer();
                useUIStore.getState().openLeftSidebar('files');
                useUIStore.getState().showToast(`Reconnected phone folder '${handle.name}'`, 'success');
                return;
            } catch (err: any) {
                console.warn('[NoteStore] Capacitor local folder reconnect failed:', err);
                useUIStore.getState().showToast(
                    `Could not access phone folder: ${err?.message || 'Storage permission denied'}`,
                    'error'
                );
                return;
            }
        }

        // 3. Web App 1-click reconnect using persisted FileSystemDirectoryHandle in IndexedDB
        if (!isDesktopTauri) {
            const rawHandle = get().pendingLocalRawHandle || (await loadPersistedDirectoryHandle());
            if (rawHandle) {
                try {
                    const perm = await requestDirectoryPermission(rawHandle, 'readwrite');
                    if (perm === 'granted') {
                        const handle: FileSystemDirectoryHandle = {
                            kind: 'directory',
                            name: rawHandle.name || savedName || 'Local Folder',
                            rawHandle
                        };
                        localStorage.setItem('parchments-storage-foundation', 'local');
                        localStorage.setItem('parchments-last-folder-name', handle.name);
                        set({
                            isLocalMode: true,
                            storageFoundation: 'local',
                            lastLocalFolderName: handle.name,
                            localDirectoryHandle: handle,
                            pendingLocalRawHandle: rawHandle,
                            needsLocalReconnect: false,
                            hasStudyspace: true,
                            currentNote: null,
                            currentFileHandle: null,
                            selectedFolderId: null
                        });
                        await get().refreshLocalFiles(true);
                        await get().flushWorkspaceLockBuffer();
                        useUIStore.getState().openLeftSidebar('files');
                        useUIStore.getState().showToast(`Reconnected '${handle.name}'`, 'success');
                        return;
                    } else {
                        useUIStore.getState().showToast('Folder permission was not granted.', 'info');
                        return;
                    }
                } catch (err) {
                    console.warn('[NoteStore] Cached handle reconnect failed (folder may have moved), opening picker:', err);
                    await clearPersistedDirectoryHandle();
                    set({ pendingLocalRawHandle: null });
                }
            }
        }

        // 3. Fallback: open directory picker dialog
        await get().openLocalFolder();
    },

    initStorageFoundation: async () => {
        const savedFoundation = typeof window !== 'undefined'
            ? (localStorage.getItem('parchments-storage-foundation') as 'local' | 'browser' | null)
            : null;
        const savedPath = typeof window !== 'undefined' ? localStorage.getItem('parchments-last-folder-path') : null;
        const savedName = typeof window !== 'undefined' ? localStorage.getItem('parchments-last-folder-name') : null;
        const isDesktopTauri = checkIsTauri();

        if (isDesktopTauri && savedFoundation === 'local' && savedPath) {
            try {
                const handle: FileSystemDirectoryHandle = {
                    kind: 'directory',
                    name: savedName || 'Studyspace',
                    path: savedPath
                };
                set({
                    isLocalMode: true,
                    storageFoundation: 'local',
                    lastLocalFolderName: handle.name,
                    localDirectoryHandle: handle,
                    needsLocalReconnect: false,
                    hasStudyspace: true
                });
                await get().refreshLocalFiles(true);
                console.log(`[NoteStore] Auto-reconnected Tauri local folder: ${handle.name} (${savedPath})`);
                return;
            } catch (err) {
                console.warn('[NoteStore] Failed to auto-reconnect Tauri local folder:', err);
                set({ needsLocalReconnect: true, hasStudyspace: false });
                return;
            }
        }

        // 2. Capacitor Mobile App: auto-reconnect saved phone folder (Documents/Parchments or External fallback)
        if (checkIsCapacitor() && savedFoundation === 'local') {
            try {
                const handle = await fileSystem.openDirectory();
                if (handle.path) {
                    localStorage.setItem('parchments-last-folder-path', handle.path);
                }
                set({
                    isLocalMode: true,
                    storageFoundation: 'local',
                    lastLocalFolderName: handle.name || savedName || 'Parchments',
                    localDirectoryHandle: handle,
                    needsLocalReconnect: false,
                    hasStudyspace: true
                });
                await get().refreshLocalFiles(true);
                console.log(`[NoteStore] Auto-reconnected Capacitor phone folder: ${handle.name}`);
                return;
            } catch (err) {
                console.warn('[NoteStore] Failed to auto-reconnect Capacitor phone folder:', err);
                set({
                    isLocalMode: true,
                    storageFoundation: 'local',
                    localDirectoryHandle: null,
                    needsLocalReconnect: true,
                    hasStudyspace: false
                });
                return;
            }
        }

        const autoSandbox = checkIsAutoSandbox();

        // 3. Web App: load persisted FileSystemDirectoryHandle from IndexedDB
        if (!isDesktopTauri && !checkIsCapacitor()) {
            const savedRawHandle = await loadPersistedDirectoryHandle();
            if (savedRawHandle) {
                const folderName = savedRawHandle.name || savedName || 'Local Folder';
                if (savedFoundation === 'local' && !autoSandbox) {
                    const perm = await queryDirectoryPermission(savedRawHandle, 'readwrite');
                    if (perm === 'granted') {
                        try {
                            const handle: FileSystemDirectoryHandle = {
                                kind: 'directory',
                                name: folderName,
                                rawHandle: savedRawHandle
                            };
                            set({
                                isLocalMode: true,
                                storageFoundation: 'local',
                                lastLocalFolderName: folderName,
                                localDirectoryHandle: handle,
                                pendingLocalRawHandle: savedRawHandle,
                                needsLocalReconnect: false,
                                hasStudyspace: true
                            });
                            await get().refreshLocalFiles(true);
                            console.log(`[NoteStore] Auto-restored Web local folder '${folderName}' with ${get().localFiles.length} items`);
                            return;
                        } catch (err) {
                            console.warn('[NoteStore] Cached web handle became invalid:', err);
                            await clearPersistedDirectoryHandle();
                        }
                    } else {
                        // Browser requires 1 user-gesture click to re-grant permission after full browser restart
                        set({
                            isLocalMode: true,
                            storageFoundation: 'local',
                            lastLocalFolderName: folderName,
                            pendingLocalRawHandle: savedRawHandle,
                            localDirectoryHandle: null,
                            needsLocalReconnect: true,
                            hasStudyspace: false
                        });
                        return;
                    }
                } else {
                    // Even if currently in Browser DB mode, cache the handle for 1-click switching back
                    set({
                        pendingLocalRawHandle: savedRawHandle,
                        lastLocalFolderName: folderName
                    });
                }
            } else if (savedFoundation === 'local' && !autoSandbox) {
                set({
                    isLocalMode: true,
                    storageFoundation: 'local',
                    localDirectoryHandle: null,
                    needsLocalReconnect: true,
                    hasStudyspace: false
                });
            }
        }
    },

    migrateBrowserNotesToLocalFolder: async () => {
        const { localDirectoryHandle, refreshLocalFiles } = get();
        if (!localDirectoryHandle) {
            throw new Error('No local directory handle is available');
        }

        const allFolders = await db.folders.toArray();
        const allNotes = await db.notes.toArray();
        const folderHandleMap = new Map<string, FileSystemDirectoryHandle>();

        // Sort folders so parents are created before children
        const sortedFolders = [...allFolders].sort((a, b) => {
            if (a.parentId === null && b.parentId !== null) return -1;
            if (a.parentId !== null && b.parentId === null) return 1;
            return 0;
        });

        for (const f of sortedFolders) {
            try {
                const parentHandle = f.parentId ? (folderHandleMap.get(f.parentId) || localDirectoryHandle) : localDirectoryHandle;
                const safeName = (f.name || 'Folder').replace(/[\\/:*?"<>|]/g, '-').trim() || 'Folder';
                const createdDir = await fileSystem.createDirectory(parentHandle, safeName);
                folderHandleMap.set(f.id, createdDir);
            } catch (err) {
                console.warn(`Failed to create directory for folder ${f.name}:`, err);
            }
        }

        let migratedCount = 0;
        for (const note of allNotes) {
            try {
                const destDir = note.folderId ? (folderHandleMap.get(note.folderId) || localDirectoryHandle) : localDirectoryHandle;
                const safeTitle = (note.title || 'Untitled Note').replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled Note';
                const fileName = `${safeTitle}.md`;
                const markdown = MarkdownService.htmlToMarkdown(note.content || '', {
                    title: note.title,
                    tags: note.tags,
                    ...(note.metadata || {})
                });
                await fileSystem.createFile(destDir, fileName, markdown);
                migratedCount++;
            } catch (err) {
                console.warn(`Failed to export note ${note.title}:`, err);
            }
        }

        await refreshLocalFiles();
        return { migratedNotes: migratedCount, migratedFolders: folderHandleMap.size };
    },

    openLooseFile: async () => {
        try {
            const fileHandle = await fileSystem.openFile();
            if (!fileHandle) return;

            const fileId = fileHandle.path || `loose-${Date.now()}-${fileHandle.name}`;
            const item: LocalItem = {
                id: fileId,
                name: fileHandle.name,
                kind: 'file',
                handle: fileHandle,
                parentId: null
            };

            let parentDirHandle: FileSystemDirectoryHandle | null = get().localDirectoryHandle;
            if (fileHandle.path) {
                const lastSlash = Math.max(fileHandle.path.lastIndexOf('/'), fileHandle.path.lastIndexOf('\\'));
                if (lastSlash > 0) {
                    const parentPath = fileHandle.path.substring(0, lastSlash);
                    parentDirHandle = {
                        kind: 'directory',
                        name: parentPath.split(/[/\\]/).pop() || 'Folder',
                        path: parentPath
                    };
                }
            }

            // Switch to local mode so the editor can save directly to this file
            set({
                isLocalMode: true,
                hasStudyspace: true,
                ...(parentDirHandle ? { localDirectoryHandle: parentDirHandle } : {})
            });

            // If the loose file isn't in localFiles, add it so the explorer can show it
            const currentFiles = get().localFiles;
            if (!currentFiles.some(f => f.id === fileId)) {
                set({ localFiles: [item, ...currentFiles] });
            }

            await get().openLocalFile(item);
        } catch (error) {
            if ((error as any)?.message?.includes('No file selected')) return;
            console.error('Failed to open loose file:', error);
        }
    },

    refreshLocalFiles: async (forceUpdate = false) => {
        const { localDirectoryHandle } = get();
        if (!localDirectoryHandle) return;

        try {
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
            const prevLocalFiles = get().localFiles;
            const prevFileMap = new Map<string, string>(); // key: parentId::name -> id
            if (!forceUpdate && prevLocalFiles.length > 0) {
                for (const p of prevLocalFiles) {
                    prevFileMap.set(`${p.parentId || ''}::${p.name}`, p.id);
                }
            }

            // 1. Map to LocalItem structure while parsing canonical UUIDs
            const mappedFiles: LocalItem[] = [];
            for (const f of rawFiles) {
                if (f.kind === 'directory') {
                    mappedFiles.push({
                        id: f.id,
                        name: f.name,
                        kind: 'directory',
                        handle: f.handle,
                        parentId: f.parentId
                    });
                } else if (f.kind === 'file' && (MarkdownService.isHtmlFile(f.name) || MarkdownService.isMarkdownFile(f.name) || f.name.toLowerCase().endsWith('.txt'))) {
                    // Check if already known from prior scan (avoids reading entire file from disk on 10s background poll)
                    const fileKey = `${f.parentId || ''}::${f.name}`;
                    const knownId = prevFileMap.get(fileKey);
                    if (knownId && !forceUpdate) {
                        mappedFiles.push({
                            id: knownId,
                            name: f.name,
                            kind: f.kind,
                            handle: f.handle,
                            parentId: f.parentId
                        });
                        continue;
                    }

                    try {
                        const fileHandle = f.handle as FileSystemFileHandle;
                        const rawContent = await fileSystem.readFile(fileHandle) as string;
                        
                        // Parse id from parchments-meta
                        const metaMatch = rawContent.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
                        let fileId = f.id;
                        let hasMetaId = false;
                        let meta: any = {};
                        
                        if (metaMatch && metaMatch[1]) {
                            try {
                                meta = JSON.parse(metaMatch[1]);
                                if (meta.id) {
                                    fileId = meta.id;
                                    hasMetaId = true;
                                }
                            } catch (e) {
                                console.warn('[refreshLocalFiles] Failed to parse metadata:', e);
                            }
                        }
                        
                        // If no canonical UUID in metadata, keep the deterministic file ID in memory without mutating user's disk file
                        if (!hasMetaId) {
                            fileId = f.id;
                        }
                        
                        mappedFiles.push({
                            id: fileId,
                            name: f.name,
                            kind: f.kind,
                            handle: f.handle,
                            parentId: f.parentId
                        });
                    } catch (e) {
                        console.error('[refreshLocalFiles] Failed to read/write metadata for:', f.name, e);
                        mappedFiles.push({
                            id: f.id,
                            name: f.name,
                            kind: f.kind,
                            handle: f.handle,
                            parentId: f.parentId
                        });
                    }
                } else if (f.kind === 'file' && f.name === 'plan.json') {
                    try {
                        const fileHandle = f.handle as FileSystemFileHandle;
                        const planContentText = await fileSystem.readFile(fileHandle) as string;
                        const planData = JSON.parse(planContentText);

                        if (planData && planData.id && planData.name && planData.tracks) {
                            const { BIBLE_BOOKS } = await import('@/lib/bible/BibleData');
                            const existingPlan = await db.readingPlans.get(planData.id);

                            if (!existingPlan) {
                                console.log('[File System] Ingesting discovered plan:', planData.name);
                                await db.readingPlans.put({
                                    id: planData.id,
                                    name: planData.name,
                                    startDate: planData.startDate,
                                    endDate: planData.endDate,
                                    status: planData.status,
                                    tracks: planData.tracks,
                                    folderId: f.parentId
                                });
                            } else {
                                // Maximum progress merges
                                const mergedTracks = planData.tracks.map((remoteTrack: any) => {
                                    const localTrack = existingPlan.tracks.find(t => t.name === remoteTrack.name);
                                    if (!localTrack) return remoteTrack;

                                    const remoteBookIndex = BIBLE_BOOKS.findIndex(b => b.name === remoteTrack.currentBook);
                                    const localBookIndex = BIBLE_BOOKS.findIndex(b => b.name === localTrack.currentBook);

                                    let remoteWins = false;
                                    if (remoteBookIndex > localBookIndex) {
                                        remoteWins = true;
                                    } else if (remoteBookIndex === localBookIndex) {
                                        if (remoteTrack.currentChapter > localTrack.currentChapter) {
                                            remoteWins = true;
                                        }
                                    }

                                    return remoteWins ? remoteTrack : localTrack;
                                });

                                await db.readingPlans.update(planData.id, {
                                    name: planData.name,
                                    startDate: planData.startDate,
                                    endDate: planData.endDate,
                                    status: planData.status,
                                    tracks: mergedTracks,
                                    folderId: f.parentId
                                });
                            }

                            // Ingest history logs
                            if (Array.isArray(planData.history)) {
                                for (const record of planData.history) {
                                    const existingRec = await db.readingPlanHistory.get(record.id);
                                    if (!existingRec || record.completedAt > existingRec.completedAt) {
                                        await db.readingPlanHistory.put(record);
                                    }
                                }
                            }

                            // Reload reading plans
                            import('@/stores/readingPlanStore').then(({ useReadingPlanStore }) => {
                                useReadingPlanStore.getState().loadPlans();
                            });
                        }
                    } catch (e) {
                        console.error('[refreshLocalFiles] Failed to ingest discovered plan:', f.name, e);
                    }

                    // plan.json is ingested into readingPlans DB; do not clutter note tree with raw JSON
                } else if (f.kind === 'file' && isSupportedLocalNoteFile(f.name)) {
                    mappedFiles.push({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    });
                }
            }

            // 2. STABLE SORTING using helper
            const newFiles = get().sortLocalItems(mappedFiles);

            // 3. CHANGE DETECTION (Diffing) — compare with prevLocalFiles captured at start
            const hasChanged = forceUpdate || prevLocalFiles.length !== newFiles.length ||
                newFiles.some((f, i) =>
                    f.id !== prevLocalFiles[i]?.id ||
                    f.name !== prevLocalFiles[i]?.name ||
                    f.kind !== prevLocalFiles[i]?.kind ||
                    f.parentId !== prevLocalFiles[i]?.parentId
                );

            if (!hasChanged) {
                return;
            }

            // 4. APPLY UPDATE
            set({ localFiles: newFiles });
            console.log('[File System] Refreshed file list:', newFiles.length, 'items');

            // 5. Clean up externally deleted files (only on background polls, never on initial mount)
            if (!forceUpdate && prevLocalFiles.length > 0) {
                try {
                    const validFileIds = new Set(newFiles.map(f => f.id));
                    const validNames = new Set(newFiles.map(f => `${f.parentId || ''}::${f.name}`));
                    const activeNoteId = get().currentNote?.id;

                    for (const prevFile of prevLocalFiles) {
                        const stillExistsByName = validNames.has(`${prevFile.parentId || ''}::${prevFile.name}`);
                        if (!validFileIds.has(prevFile.id) && !stillExistsByName) {
                            console.log(`[File System] Detected externally removed file: ${prevFile.name}`);
                            if (activeNoteId === prevFile.id) {
                                set({ currentNote: null, currentFileHandle: null });
                            }
                            if (prevFile.parentId) {
                                get().broadcastFolderChange(prevFile.parentId);
                            }
                        }
                    }
                } catch (dbError) {
                    console.error('[File System] Failed to clean up removed local files:', dbError);
                }
            }
        } catch (error: any) {
            console.error('[File System] Failed to refresh:', error);
            if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
                set({
                    localDirectoryHandle: null,
                    needsLocalReconnect: true,
                    hasStudyspace: false
                });
            }
        }
    },

    openLocalFile: async (item: LocalItem) => {
        if (item.kind !== 'file') return;

        try {
            const fileHandle = item.handle as FileSystemFileHandle;
            const isAudio = isAudioFileName(item.name);

            let content = '';
            let audioBlob: Blob | undefined;
            let noteType: 'text' | 'voice' = 'text';
            let targetHandle = fileHandle;
            let parsedFrontmatter: Record<string, any> = {};

            let rawFileContent = '';

            if (isAudio) {
                audioBlob = await fileSystem.readFile(fileHandle, true) as Blob;
                noteType = 'voice';

                // Match sibling transcript (.md or .html)
                const timestampMatch = item.name.match(/Recording (.*?)\.(webm|mp4|m4a|mp3|ogg|wav)$/i);
                if (timestampMatch) {
                    const timestamp = timestampMatch[1];
                    const { localFiles } = get();
                    const transcriptFile = localFiles.find(f =>
                        f.parentId === item.parentId &&
                        (f.name === `Transcript ${timestamp}.md` || f.name === `Transcript ${timestamp}.html`) &&
                        f.kind === 'file'
                    );
                    if (transcriptFile) {
                        const rawContent = await fileSystem.readFile(transcriptFile.handle as FileSystemFileHandle) as string;
                        rawFileContent = rawContent;
                        const htmlContent = MarkdownService.isMarkdownFile(transcriptFile.name)
                            ? MarkdownService.markdownToHtml(rawContent).html
                            : rawContent;
                        content = await get().hydrateAssets(htmlContent);
                        targetHandle = transcriptFile.handle as FileSystemFileHandle;
                    } else {
                        targetHandle = null as any;
                    }
                } else {
                    targetHandle = null as any;
                }
            } else {
                const rawContent = await fileSystem.readFile(fileHandle) as string;
                rawFileContent = rawContent;
                let editorContent = rawContent;
                if (MarkdownService.isMarkdownFile(item.name)) {
                    const parsed = MarkdownService.markdownToHtml(rawContent);
                    editorContent = parsed.html;
                    parsedFrontmatter = parsed.frontmatter;
                } else if (MarkdownService.isHtmlFile(item.name)) {
                    editorContent = DOMPurify.sanitize(rawContent, {
                        ADD_TAGS: ['mark', 'u', 's', 'sup', 'sub'],
                        ADD_ATTR: [
                            'data-book', 'data-chapter', 'data-verse', 'data-verse-end',
                            'data-segments', 'data-scripture', 'data-asset-name',
                            'target', 'rel', 'class', 'style'
                        ]
                    });
                }
                content = await get().hydrateAssets(editorContent);
            }

            // Check for linked audio metadata in BOTH raw file content and hydrated HTML: <!-- audio-link: filename.webm -->
            const searchSource = `${rawFileContent}\n${content}`;
            const audioLinkMatch = searchSource.match(/<!--\s*audio-link:\s*(.*?)\s*-->/);
            const frontmatterAudio = parsedFrontmatter?.audio || parsedFrontmatter?.audioFile;
            const targetAudioName = (audioLinkMatch && audioLinkMatch[1]) ? audioLinkMatch[1].trim() : (frontmatterAudio ? String(frontmatterAudio).trim() : null);

            if (targetAudioName) {
                // Look for this file in the same directory (siblings)
                const { localFiles } = get();
                const siblingAudio = localFiles.find(f =>
                    f.parentId === item.parentId &&
                    f.name.toLowerCase() === targetAudioName.toLowerCase() &&
                    f.kind === 'file'
                );

                if (siblingAudio) {
                    try {
                        audioBlob = await fileSystem.readFile(siblingAudio.handle as FileSystemFileHandle, true) as Blob;
                        noteType = 'voice';
                    } catch (e) {
                        console.error('Failed to read linked audio file:', e);
                    }
                }
            }

            // Look for metadata in raw file content and content: <!-- parchments-meta: json -->
            const metaMatch = searchSource.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
            let createdAt = Date.now();
            let transcript: string | undefined;
            let duration: number | undefined;

            if (parsedFrontmatter?.duration && typeof parsedFrontmatter.duration === 'number') {
                duration = parsedFrontmatter.duration;
            }
            if (parsedFrontmatter?.transcript) {
                transcript = String(parsedFrontmatter.transcript);
            }
            if (parsedFrontmatter?.type === 'voice') {
                noteType = 'voice';
            }

            if (metaMatch && metaMatch[1]) {
                try {
                    const meta = JSON.parse(metaMatch[1]);
                    if (meta.createdAt) createdAt = meta.createdAt;
                    if (meta.transcript && !transcript) transcript = meta.transcript;
                    if (meta.duration && typeof meta.duration === 'number' && (!duration || duration <= 0)) duration = meta.duration;
                    if (meta.type === 'voice') noteType = 'voice';
                } catch (e) {
                    console.warn('[NoteStore] Failed to parse metadata:', e);
                }
            } else {
                // Fallback to file system lastModified
                try {
                    const metadata = await fileSystem.getMetadata(fileHandle as FileSystemFileHandle);
                    createdAt = metadata.lastModified;
                } catch (e) {
                    console.warn('[NoteStore] Failed to get file lastModified:', e);
                }
            }

            // Construct a temporary Note object for the editor
            const tempNote: Note = {
                id: item.id,
                title: item.name.replace(/\.(html|htm|txt|md|markdown|mdown|mkdn|webm|mp4|m4a|mp3|ogg|wav)$/i, ''),
                content: content,
                folderId: item.parentId ?? null,
                tags: [],
                type: noteType,
                audioBlob: audioBlob,
                duration: duration,
                transcript: transcript, // Add parsed transcript
                createdAt: createdAt,
                updatedAt: Date.now(),
                ...(Object.keys(parsedFrontmatter).length > 0 ? { metadata: parsedFrontmatter } : {}),
            };
            set({ 
                currentNote: tempNote, 
                currentFileHandle: targetHandle,
                selectedFolderId: item.parentId ?? null 
            });
        } catch (error) {
            console.error('Failed to read file:', error);
        }
    },

    createLocalNote: async (fileName, targetFolderId, content = '', forceId?: string) => {
        const { localDirectoryHandle, localFiles, openLocalFile } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const normTarget = normalizeFsPath(targetFolderId);
                const folderItem = localFiles.find(f => (f.id === targetFolderId || normalizeFsPath(f.id) === normTarget) && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            // Sanitize filename and ensure we never overwrite an existing file on disk
            const sanitizedFileName = (fileName || UNTITLED_NOTE).replace(/[:/\\*?"<>|]/g, '-').trim() || UNTITLED_NOTE;
            let desiredName = sanitizedFileName;
            if (!MarkdownService.isMarkdownFile(desiredName) && !MarkdownService.isHtmlFile(desiredName) && !desiredName.toLowerCase().endsWith('.txt')) {
                desiredName = `${desiredName}.md`;
            }
            const name = await fileSystem.getUniqueFileName(parentHandle, desiredName);

            let initialContent = content;
            if (MarkdownService.isMarkdownFile(name)) {
                if (content && content.includes('<')) {
                    const dehydratedHtml = get().dehydrateAssets(content);
                    initialContent = MarkdownService.htmlToMarkdown(dehydratedHtml);
                }
                if (!initialContent.trimStart().startsWith('---')) {
                    const cleanTitle = name.replace(/\.(md|markdown|mdown|mkdn)$/i, '');
                    const defaultFm: Record<string, any> = {
                        title: cleanTitle,
                        date: new Date().toISOString().split('T')[0]
                    };
                    initialContent = MarkdownService.serializeFrontmatter(defaultFm) + initialContent;
                }
            } else if (MarkdownService.isHtmlFile(name)) {
                if (content && content.includes('<')) {
                    initialContent = get().dehydrateAssets(content);
                }
            }

            const fileId = forceId || crypto.randomUUID();
            const meta = {
                id: fileId,
                createdAt: Date.now()
            };
            const metaTag = `\n<!-- parchments-meta: ${JSON.stringify(meta)} -->`;
            const finalContent = initialContent + metaTag;
            const handle = await fileSystem.createFile(parentHandle, name, finalContent);

            // Open the new file (construct a LocalItem)
            await openLocalFile({
                id: fileId,
                name: name,
                kind: 'file',
                handle: handle,
                parentId: targetFolderId
            });

            await get().refreshLocalFiles(true);
        } catch (error) {
            console.error('Failed to create local note:', error);
            throw error;
        }
    },

    createLocalFolder: async (folderName: string, targetFolderId: string | null) => {
        const { localDirectoryHandle, localFiles } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const normTarget = normalizeFsPath(targetFolderId);
                const folderItem = localFiles.find(f => (f.id === targetFolderId || normalizeFsPath(f.id) === normTarget) && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            await fileSystem.createDirectory(parentHandle, folderName);
            await get().refreshLocalFiles(true);
        } catch (error) {
            console.error('Failed to create local folder:', error);
            throw error;
        }
    },

    createLocalVoiceNote: async (audioBlob: Blob, targetFolderId: string | null, duration: number, transcript: string) => {
        const { localDirectoryHandle, localFiles } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const normTarget = normalizeFsPath(targetFolderId);
                const folderItem = localFiles.find(f => (f.id === targetFolderId || normalizeFsPath(f.id) === normTarget) && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            // Generate a clean ISO-like timestamp safe across all filesystems (Windows, macOS, Linux)
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
            const audioExt = (audioBlob.type && (audioBlob.type.includes('mp4') || audioBlob.type.includes('aac')))
                ? 'mp4'
                : (audioBlob.type && audioBlob.type.includes('ogg'))
                ? 'ogg'
                : (audioBlob.type && audioBlob.type.includes('wav'))
                ? 'wav'
                : 'webm';
            const audioName = `Recording ${timestamp}.${audioExt}`;
            const noteName = `Transcript ${timestamp}.md`;

            // Save the audio file
            await fileSystem.createFile(parentHandle, audioName, audioBlob);

            // Save the transcript as an HTML note with hidden audio link metadata and creation date
            const fileId = crypto.randomUUID();
            const createdAt = Date.now();
            // Store transcript and audio metadata in BOTH frontmatter and comments for universal compatibility
            const content = `---\ntype: voice\nduration: ${duration || 0}\naudio: ${audioName}\n---\n<!-- audio-link: ${audioName} -->\n<!-- parchments-meta: {"id": "${fileId}", "createdAt": ${createdAt}, "duration": ${duration || 0}, "transcript": ${JSON.stringify(transcript || '')}} -->\n\n# Voice Transcript\n\n${transcript || 'Transcribing audio...'}`;
            const noteHandle = await fileSystem.createFile(parentHandle, noteName, content);

            // Refresh local files BEFORE opening note so siblingAudio is in localFiles
            await get().refreshLocalFiles(true);

            // Automatically open the new transcript note
            const { openLocalFile } = get();
            await openLocalFile({
                id: fileId,
                name: noteName,
                kind: 'file',
                handle: noteHandle,
                parentId: targetFolderId
            });

            const activeEd = useUIStore.getState().activeEditor;
            if (activeEd) {
                activeEd.commands.setContent(`<h1>Voice Transcript</h1><p>${transcript || 'Transcribing audio...'}</p>`);
            }

            // BROADCAST: Notify collaborators of the new voice note
            if (targetFolderId) {
                console.log(`[CREATE VOICE NOTE LOCAL] Broadcasting folder change for: ${targetFolderId}`);
                get().broadcastFolderChange(targetFolderId);
            }

            if (!transcript && audioBlob) {
                get().autoTranscribeVoiceNote(fileId, audioBlob);
            }
        } catch (error) {
            console.error('Failed to create local voice note:', error);
            throw error;
        }
    },

    saveCurrentNote: async (title, content, targetNoteId?: string) => {
        const { currentNote, isLocalMode, currentFileHandle, notes, localFiles, dehydrateAssets } = get();

        // If targetNoteId is specified and differs from current active note (e.g. background flush on note switch or close)
        if (targetNoteId && (!currentNote || currentNote.id !== targetNoteId)) {
            try {
                const localTarget = localFiles.find(f => f.id === targetNoteId && f.kind === 'file');
                if (isLocalMode && localTarget?.handle) {
                    const dehydratedHtml = dehydrateAssets(content);
                    let diskContent = dehydratedHtml;
                    if (MarkdownService.isMarkdownFile(localTarget.name)) {
                        let existingFrontmatter: Record<string, any> | undefined;
                        try {
                            const existingRaw = await fileSystem.readFile(localTarget.handle as FileSystemFileHandle) as string;
                            const parsed = MarkdownService.parseFrontmatter(existingRaw);
                            if (Object.keys(parsed.frontmatter).length > 0) {
                                existingFrontmatter = parsed.frontmatter;
                            }
                        } catch {
                            // Ignore if file read fails
                        }
                        diskContent = MarkdownService.htmlToMarkdown(dehydratedHtml, existingFrontmatter);
                    }
                    await fileSystem.writeFile(localTarget.handle as FileSystemFileHandle, diskContent);
                }

                const targetDbNote = await db.notes.get(targetNoteId);
                if (targetDbNote) {
                    await db.notes.update(targetNoteId, {
                        title,
                        content,
                        updatedAt: Date.now()
                    });
                }
                const updatedNotes = notes.map(n =>
                    n.id === targetNoteId ? { ...n, title, content, updatedAt: Date.now() } : n
                );
                set({ notes: updatedNotes });
            } catch (err) {
                console.error('[NoteStore] Failed targeted note save:', err);
            }
            return;
        }

        if (!currentNote) return;

        // SMART AUTO-NAMING: If title is "Untitled Note", try to extract from content
        let finalTitle = title;
        if (title === UNTITLED_NOTE || title.trim() === '') {
            const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            const extracted = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : (textContent.slice(0, 30));

            if (extracted && extracted.length > 2 && extracted !== UNTITLED_NOTE) {
                finalTitle = extracted;
                console.log(`[Auto-Naming] Detected title from content: "${finalTitle}"`);
            }
        }

        // 1. DYNAMICALLY DETECT & EMBED ACTIVE STUDY PLAN PROGRESS IN METADATA
        const readingPlanStoreState = (window as any).useReadingPlanStore?.getState() || null;
        let lectioProgress: any = undefined;
        if (readingPlanStoreState && readingPlanStoreState.isLectioModeActive && readingPlanStoreState.activeNoteId === currentNote.id) {
            const activePlan = readingPlanStoreState.activePlans.find((p: any) => p.id === readingPlanStoreState.activePlanId);
            if (activePlan) {
                lectioProgress = {
                    planId: activePlan.id,
                    planName: activePlan.name,
                    startDate: activePlan.startDate,
                    endDate: activePlan.endDate,
                    tracks: activePlan.tracks
                };
            }
        }

        const meta = {
            id: currentNote.id,
            createdAt: currentNote.createdAt,
            ...(currentNote.type === 'voice' ? { transcript: currentNote.transcript } : {}),
            ...(lectioProgress ? { lectioProgress } : {})
        };
        const metaTag = `<!-- parchments-meta: ${JSON.stringify(meta)} -->`;

        // We prepare portableContent which always has the embedded meta tag inside it
        let portableContent = content;
        if (!portableContent.includes('parchments-meta:')) {
            portableContent += `\n${metaTag}`;
        } else {
            portableContent = portableContent.replace(/<!--\s*parchments-meta:.*?\s*-->/, metaTag);
        }

        if (isLocalMode && currentFileHandle) {
            // File System Mode
            try {
                let activeHandle = currentFileHandle;
                const dehydratedHtml = get().dehydrateAssets(portableContent);

                let diskContent = dehydratedHtml;
                if (MarkdownService.isMarkdownFile(activeHandle.name)) {
                    diskContent = MarkdownService.htmlToMarkdown(dehydratedHtml, currentNote.metadata);
                }

                await fileSystem.writeFile(activeHandle, diskContent);

                // If the note title changed from the physical filename, rename the file on disk too
                const currentBaseName = activeHandle.name.replace(/\.(md|markdown|mdown|mkdn|html|htm|txt)$/i, '');
                const sanitizedTitle = finalTitle.replace(/[:/\\*?"<>|]/g, '-').trim();
                let resolvedTitle = finalTitle;

                if (sanitizedTitle && sanitizedTitle !== currentBaseName && get().localDirectoryHandle) {
                    const extMatch = activeHandle.name.match(/\.(md|markdown|mdown|mkdn|html|htm|txt)$/i);
                    const ext = extMatch ? extMatch[0] : '.md';
                    const localItem = get().localFiles.find(f => f.id === currentNote.id && f.kind === 'file');
                    let parentDir = get().localDirectoryHandle!;
                    if (localItem?.parentId) {
                        const parentFolder = get().localFiles.find(f => f.id === localItem.parentId && f.kind === 'directory');
                        if (parentFolder) parentDir = parentFolder.handle as FileSystemDirectoryHandle;
                    }
                    const desiredFileName = await fileSystem.getUniqueFileName(parentDir, `${sanitizedTitle}${ext}`);
                    try {
                        activeHandle = await fileSystem.renameEntry(activeHandle, desiredFileName, parentDir) as FileSystemFileHandle;
                        resolvedTitle = desiredFileName.replace(/\.(md|markdown|mdown|mkdn|html|htm|txt)$/i, '');
                        await get().refreshLocalFiles(true);
                    } catch (renameErr) {
                        console.warn('[NoteStore] Title file rename skipped:', renameErr);
                    }
                }

                set({
                    currentFileHandle: activeHandle,
                    currentNote: { ...currentNote, title: resolvedTitle, content: portableContent, updatedAt: Date.now() }
                });
            } catch (error) {
                console.warn('[NoteStore] File system write blocked or handle locked. Caching in IndexedDB Safe-Buffer...', error);
                
                // Fallback: Write safely to IndexedDB
                try {
                    await db.notes.put({
                        id: currentNote.id,
                        title: finalTitle,
                        content: portableContent,
                        updatedAt: Date.now(),
                        createdAt: currentNote.createdAt,
                        folderId: null,
                        tags: [],
                        type: currentNote.type,
                        metadata: currentNote.metadata
                    });
                    
                    const existingBuffer = get().lockedNotesBuffer;
                    if (!existingBuffer.includes(currentNote.id)) {
                        set({
                            lockedNotesBuffer: [...existingBuffer, currentNote.id],
                            isWorkspaceLocked: true
                        });
                    }

                    // Update UI state so it looks saved in-memory
                    set({
                        currentNote: { ...currentNote, title: finalTitle, content: portableContent, updatedAt: Date.now() }
                    });
                } catch (dbError) {
                    console.error('[NoteStore] Failed to write fallback save to IndexedDB:', dbError);
                }
            }
        } else if (!isLocalMode && currentNote.id) {
            // DB Mode
            try {
                await db.notes.update(currentNote.id, {
                    title: finalTitle,
                    content: portableContent,
                    updatedAt: Date.now(),
                    metadata: currentNote.metadata
                });

                const updatedNotes = notes.map(n =>
                    n.id === currentNote.id
                        ? { ...n, title: finalTitle, content: portableContent, updatedAt: Date.now(), metadata: currentNote.metadata }
                        : n
                );
                set({ notes: updatedNotes, currentNote: { ...currentNote, title: finalTitle, content: portableContent, updatedAt: Date.now() } });
            } catch (error) {
                console.error('Failed to save to DB:', error);
            }
        }

        // Trigger background semantic search vector indexing
        SemanticSearchService.scheduleIndexNote(currentNote.id, finalTitle, portableContent);
    },
    saveLocalAsset: async (file: File) => {
        const { localDirectoryHandle, isLocalMode } = get();
        if (!isLocalMode || !localDirectoryHandle) return null;

        const _isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
        console.log('[NoteStore] saveLocalAsset, isTauri:', _isTauri);

        try {
            // Ensure .assets/images directory exists
            const assetsHandle = await fileSystem.createDirectory(localDirectoryHandle, '.assets');
            const imagesHandle = await fileSystem.createDirectory(assetsHandle, 'images');

            // Generate unique filename
            const extension = file.name.split('.').pop() || 'png';
            const fileName = `${crypto.randomUUID()}.${extension}`;

            // Create the file
            const fileHandle = await fileSystem.createFile(imagesHandle, fileName, file);

            // Return both the URL for the editor and the filename for persistent reference
            const url = _isTauri && (fileHandle as any).path
                ? convertFileSrc((fileHandle as any).path)
                : URL.createObjectURL(file);

            return { url, fileName };
        } catch (error) {
            console.error('Failed to save asset:', error);
            return null;
        }
    },

    hydrateAssets: async (content: string) => {
        const { localDirectoryHandle, isLocalMode } = get();
        if (!isLocalMode || !localDirectoryHandle) return content;

        const doc = new DOMParser().parseFromString(content, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));

        for (const img of images) {
            const src = img.getAttribute('src');
            let assetName = img.getAttribute('data-asset-name');

            // If data-asset-name is not set, extract from relative path or filename
            if (!assetName && src) {
                if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && !src.startsWith('blob:')) {
                    assetName = src.split('/').pop()?.split(/[?#]/)[0] || null;
                }
            }

            if (assetName) {
                try {
                    // Try to find the file in .assets/images/
                    const assetsHandle = await fileSystem.createDirectory(localDirectoryHandle, '.assets');
                    const imagesHandle = await fileSystem.createDirectory(assetsHandle, 'images');

                    const fileHandle = await fileSystem.getFileHandle(imagesHandle, assetName);
                    const blob = await fileSystem.readFile(fileHandle as FileSystemFileHandle, true);
                    const blobUrl = URL.createObjectURL(blob as Blob);
                    img.setAttribute('src', blobUrl);
                    img.setAttribute('data-asset-name', assetName);
                } catch (e) {
                    console.warn('[NoteStore] Failed to hydrate image:', src, assetName, e);
                }
            }
        }
        return doc.body.innerHTML;
    },

    dehydrateAssets: (content: string) => {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));

        for (const img of images) {
            let assetName = img.getAttribute('data-asset-name');
            const src = img.getAttribute('src') || '';

            if (!assetName && src.includes('.assets/images/')) {
                assetName = src.split('.assets/images/').pop()?.split(/[?#]/)[0] || null;
            }

            if (assetName) {
                // Replace the blob URL with the relative path for portability
                img.setAttribute('src', `.assets/images/${assetName}`);
                img.setAttribute('data-asset-name', assetName);
            }
        }
        return doc.body.innerHTML;
    },

    setLocalMode: (enabled) => {
        if (!enabled) {
            localStorage.setItem('parchments-storage-foundation', 'browser');
        } else {
            localStorage.setItem('parchments-storage-foundation', 'local');
        }
        const hasHandle = Boolean(get().localDirectoryHandle);
        set({
            isLocalMode: enabled,
            storageFoundation: enabled ? 'local' : 'browser',
            hasStudyspace: !enabled ? true : hasHandle,
            needsLocalReconnect: enabled && !hasHandle,
            currentNote: null,
            currentFileHandle: null,
            selectedFolderId: null
        });
        if (!enabled) {
            get().loadFolders();
            get().loadNotes();
        }
    },
}));
