import { create } from 'zustand';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Note, Folder } from '@/types/database';
import { db, dbHelpers } from '@/lib/db';
import { fileSystem, type FileSystemDirectoryHandle, type FileSystemHandle, type FileSystemFileHandle } from '@/lib/filesystem/FileSystemService';

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
    }
};

interface NoteStore {
    currentNote: Note | null;
    notes: Note[];
    folders: Folder[];
    isLoading: boolean;
    // Local File System State
    isLocalMode: boolean;
    localDirectoryHandle: FileSystemDirectoryHandle | null;
    localFiles: LocalItem[];
    currentFileHandle: FileSystemFileHandle | null;
    hasStudyspace: boolean;
    // Actions
    loadNotes: () => Promise<void>;
    loadFolders: () => Promise<void>;
    createNote: (folderId: string | null, title?: string) => Promise<Note>;
    createNoteFromTemplate: (folderId: string | null, templateId: string) => Promise<Note>;
    createVoiceNote: (folderId: string | null, audioBlob: Blob, duration: number, transcript: string) => Promise<Note>;
    createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
    deleteNote: (id: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    renameNote: (id: string, newName: string) => Promise<void>;
    renameFolder: (id: string, newName: string) => Promise<void>;
    setCurrentNote: (note: Note | null) => void;
    setNotes: (notes: Note[]) => void;
    // Local Actions
    openLocalFolder: () => Promise<void>;
    openLocalFile: (item: LocalItem) => Promise<void>;
    // Local Creation Actions
    saveCurrentNote: (title: string, content: string) => Promise<void>;
    setLocalMode: (enabled: boolean) => void;
    createLocalNote: (fileName: string, targetFolderId: string | null, content?: string) => Promise<void>;
    createLocalFolder: (folderName: string, targetFolderId: string | null) => Promise<void>;
    createLocalVoiceNote: (audioBlob: Blob, targetFolderId: string | null, transcript: string) => Promise<void>;
    saveLocalAsset: (file: File) => Promise<{ url: any; fileName: string; } | null>;
    hydrateAssets: (content: string) => Promise<string>;
    dehydrateAssets: (content: string) => string;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
    currentNote: null,
    notes: [],
    folders: [],
    isLoading: false,
    isLocalMode: true, // Default to local mode for Studyspace-First
    localDirectoryHandle: null,
    localFiles: [],
    currentFileHandle: null,
    hasStudyspace: false,

    loadNotes: async () => {
        set({ isLoading: true });
        const notes = await db.notes.toArray();
        set({ notes, isLoading: false });
    },

    loadFolders: async () => {
        const folders = await db.folders.toArray();
        set({ folders });
    },

    createNote: async (folderId, title) => {
        const { isLocalMode, createLocalNote } = get();
        if (isLocalMode) {
            const name = title || 'Untitled Note';
            await createLocalNote(name, folderId);
            return {} as Note;
        }

        const note = await dbHelpers.createNote({
            title: title || 'Untitled Note',
            content: '',
            folderId,
            tags: [],
            type: 'text',
        });
        const { notes } = get();
        set({ notes: [...notes, note], currentNote: note });
        return note;
    },

    createNoteFromTemplate: async (folderId, templateId) => {
        const { isLocalMode, createLocalNote } = get();
        const template = STUDY_TEMPLATES[templateId as keyof typeof STUDY_TEMPLATES];
        if (!template) throw new Error('Template not found');

        const dateStr = new Date().toLocaleDateString().replace(/[/:]/g, '-');
        const title = `${template.name} - ${dateStr}`;

        if (isLocalMode) {
            await createLocalNote(title, folderId, template.content);
            return {} as Note; // In local mode, refreshing file list handles selection
        }

        const note = await dbHelpers.createNote({
            title,
            content: template.content,
            folderId,
            tags: [],
            type: 'text',
        });
        const { notes } = get();
        set({ notes: [...notes, note], currentNote: note });
        return note;
    },

    createVoiceNote: async (folderId, audioBlob, duration, transcript) => {
        const { isLocalMode, createLocalVoiceNote } = get();
        if (isLocalMode) {
            await createLocalVoiceNote(audioBlob, folderId, transcript);
            return {} as Note;
        }

        const note = await dbHelpers.createNote({
            title: 'Voice Note',
            content: `<p>${transcript}</p>`,
            folderId,
            tags: [],
            type: 'voice',
            audioBlob,
            duration,
        });
        const { notes } = get();
        set({ notes: [...notes, note], currentNote: note });
        return note;
    },

    createFolder: async (name, parentId = null) => {
        const folder = await dbHelpers.createFolder({
            name,
            parentId,
            order: 0,
        });
        const { folders } = get();
        set({ folders: [...folders, folder] });
        return folder;
    },

    deleteNote: async (id) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (item) {
                try {
                    // Find parent
                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.deleteEntry(parentHandle, item.name);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));

                    set({
                        localFiles: files,
                        currentNote: currentNote?.id === id ? null : currentNote
                    });
                } catch (error) {
                    console.error('Failed to delete local file:', error);
                }
            }
        } else {
            await db.notes.delete(id);
            set({
                notes: notes.filter((n) => n.id !== id),
                currentNote: currentNote?.id === id ? null : currentNote,
            });
        }
    },

    deleteFolder: async (id) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (item) {
                try {
                    let parentHandle = localDirectoryHandle;
                    if (item.parentId) {
                        const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                        if (parent) parentHandle = parent.handle as FileSystemDirectoryHandle;
                    }

                    await fileSystem.deleteEntry(parentHandle, item.name);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));
                    set({ localFiles: files });
                } catch (error) {
                    console.error('Failed to delete local folder:', error);
                }
            }
        } else {
            await db.folders.delete(id);
            set({
                folders: folders.filter((f) => f.id !== id),
            });
        }
    },

    renameNote: async (id, newName) => {
        const { isLocalMode, localDirectoryHandle, localFiles, notes, currentNote } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'file');
            if (item) {
                try {
                    // Local rename
                    const ext = item.name.split('.').pop();
                    const finalName = (newName.endsWith('.html') || newName.endsWith('.md') || newName.endsWith('.txt'))
                        ? newName
                        : `${newName}.${ext}`;

                    await fileSystem.renameEntry(item.handle, finalName);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));

                    set({
                        localFiles: files,
                        currentNote: currentNote?.id === id
                            ? { ...currentNote, title: newName.replace(/\.html$|\.md$|\.txt$/, '') }
                            : currentNote
                    });
                } catch (error) {
                    console.error('Failed to rename local file:', error);
                    throw error;
                }
            }
        } else {
            await db.notes.update(id, { title: newName, updatedAt: Date.now() });
            set({
                notes: notes.map(n => n.id === id ? { ...n, title: newName, updatedAt: Date.now() } : n),
                currentNote: currentNote?.id === id ? { ...currentNote, title: newName } : currentNote
            });
        }
    },

    renameFolder: async (id, newName) => {
        const { isLocalMode, localDirectoryHandle, localFiles, folders } = get();

        if (isLocalMode && localDirectoryHandle) {
            const item = localFiles.find(f => f.id === id && f.kind === 'directory');
            if (item) {
                try {
                    await fileSystem.renameEntry(item.handle, newName);

                    // Refresh
                    const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
                    const files: LocalItem[] = rawFiles.map(f => ({
                        id: f.id,
                        name: f.name,
                        kind: f.kind,
                        handle: f.handle,
                        parentId: f.parentId
                    }));
                    set({ localFiles: files });
                } catch (error) {
                    console.error('Failed to rename local folder:', error);
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

    setCurrentNote: (note) => set({ currentNote: note }),
    setNotes: (notes) => set({ notes }),

    openLocalFolder: async () => {
        try {
            const handle = await fileSystem.openDirectory();
            const rawFiles = await fileSystem.readDirectoryRecursive(handle);

            // Map the recursive result to LocalItems
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));

            set({
                isLocalMode: true,
                localDirectoryHandle: handle,
                localFiles: files,
                hasStudyspace: true,
            });
        } catch (error) {
            console.error('Failed to open directory:', error);
            // User likely cancelled, do nothing
        }
    },

    openLocalFile: async (item: LocalItem) => {
        if (item.kind !== 'file') return;

        try {
            const fileHandle = item.handle as FileSystemFileHandle;
            const isAudio = item.name.toLowerCase().endsWith('.webm');

            let content = '';
            let audioBlob: Blob | undefined;
            let noteType: 'text' | 'voice' = 'text';
            let targetHandle = fileHandle;

            if (isAudio) {
                // Read as Blob directly
                audioBlob = await fileSystem.readFile(fileHandle, true) as Blob;
                noteType = 'voice';

                // Try to find matching transcript (Recording X.webm -> Transcript X.html)
                const timestampMatch = item.name.match(/Recording (.*?)\.webm/);
                if (timestampMatch) {
                    const timestamp = timestampMatch[1];
                    const transcriptName = `Transcript ${timestamp}.html`;
                    const { localFiles } = get();
                    const transcriptFile = localFiles.find(f =>
                        f.parentId === item.parentId &&
                        f.name === transcriptName &&
                        f.kind === 'file'
                    );
                    if (transcriptFile) {
                        const rawContent = await fileSystem.readFile(transcriptFile.handle as FileSystemFileHandle) as string;
                        content = await get().hydrateAssets(rawContent);
                        // For recordings, if we find a transcript, we treat the transcript as the primary handle for saves
                        targetHandle = transcriptFile.handle as FileSystemFileHandle;
                    } else {
                        // Prevent saving to the audio file handle
                        targetHandle = null as any;
                    }
                }
            } else {
                const rawContent = await fileSystem.readFile(fileHandle) as string;
                content = await get().hydrateAssets(rawContent);

                // Check for linked audio metadata: <!-- audio-link: filename.webm -->
                const audioLinkMatch = content.match(/<!--\s*audio-link:\s*(.*?)\s*-->/);
                if (audioLinkMatch && audioLinkMatch[1]) {
                    const audioFileName = audioLinkMatch[1];
                    // Look for this file in the same directory (siblings)
                    const { localFiles } = get();
                    const siblingAudio = localFiles.find(f =>
                        f.parentId === item.parentId &&
                        f.name === audioFileName &&
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
            }

            // Look for metadata in content: <!-- parchments-meta: json -->
            const metaMatch = content.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
            let createdAt = Date.now();
            if (metaMatch && metaMatch[1]) {
                try {
                    const meta = JSON.parse(metaMatch[1]);
                    if (meta.createdAt) createdAt = meta.createdAt;
                } catch (e) {
                    console.warn('[NoteStore] Failed to parse metadata:', e);
                }
            } else {
                // Fallback to file system lastModified
                try {
                    const file = await (fileHandle as any).getFile();
                    createdAt = file.lastModified;
                } catch (e) {
                    console.warn('[NoteStore] Failed to get file lastModified:', e);
                }
            }

            // Construct a temporary Note object for the editor
            const tempNote: Note = {
                id: item.id,
                title: item.name.replace(/\.html$|\.txt$|\.md$|\.webm$/, ''), // Remove extension for display
                content: content,
                folderId: null,
                tags: [],
                type: noteType,
                audioBlob: audioBlob,
                createdAt: createdAt,
                updatedAt: Date.now(),
            };
            set({ currentNote: tempNote, currentFileHandle: targetHandle });
        } catch (error) {
            console.error('Failed to read file:', error);
        }
    },

    createLocalNote: async (fileName, targetFolderId, content = '') => {
        const { localDirectoryHandle, localFiles, openLocalFile } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const folderItem = localFiles.find(f => f.id === targetFolderId && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            const name = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
            const handle = await fileSystem.createFile(parentHandle, name, content);

            // Refresh file list recursively
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));

            set({ localFiles: files });

            // Open the new file (construct a LocalItem)
            // We need to reconstruct the ID for the new file
            // If we have a targetFolderId, the new ID is targetFolderId/name
            const newId = targetFolderId ? `${targetFolderId}/${name}` : name;

            await openLocalFile({
                id: newId,
                name: name,
                kind: 'file',
                handle: handle,
                parentId: targetFolderId
            });
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
                const folderItem = localFiles.find(f => f.id === targetFolderId && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            await fileSystem.createDirectory(parentHandle, folderName);

            // Refresh file list
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));
            set({ localFiles: files });
        } catch (error) {
            console.error('Failed to create local folder:', error);
            throw error;
        }
    },

    createLocalVoiceNote: async (audioBlob: Blob, targetFolderId: string | null, transcript: string) => {
        const { localDirectoryHandle, localFiles } = get();
        if (!localDirectoryHandle) return;

        try {
            // Determine parent directory
            let parentHandle = localDirectoryHandle;
            if (targetFolderId) {
                const folderItem = localFiles.find(f => f.id === targetFolderId && f.kind === 'directory');
                if (folderItem && folderItem.handle.kind === 'directory') {
                    parentHandle = folderItem.handle as FileSystemDirectoryHandle;
                }
            }

            // Generate a name with timestamp
            const timestamp = new Date().toLocaleString().replace(/[/:]/g, '-');
            const audioName = `Recording ${timestamp}.webm`;
            const noteName = `Transcript ${timestamp}.html`;

            // Save the audio file
            await fileSystem.createFile(parentHandle, audioName, audioBlob);

            // Save the transcript as an HTML note with hidden audio link metadata and creation date
            const createdAt = Date.now();
            const content = `<!-- audio-link: ${audioName} -->\n<!-- parchments-meta: {"createdAt": ${createdAt}} -->\n<h1>Voice Transcript</h1><p>${transcript || 'No transcript available.'}</p>`;
            const noteHandle = await fileSystem.createFile(parentHandle, noteName, content);

            // Refresh file list
            const rawFiles = await fileSystem.readDirectoryRecursive(localDirectoryHandle);
            const files: LocalItem[] = rawFiles.map(f => ({
                id: f.id,
                name: f.name,
                kind: f.kind,
                handle: f.handle,
                parentId: f.parentId
            }));

            set({ localFiles: files });

            // Automatically open the new transcript note
            const newId = targetFolderId ? `${targetFolderId}/${noteName}` : noteName;
            const { openLocalFile } = get();
            await openLocalFile({
                id: newId,
                name: noteName,
                kind: 'file',
                handle: noteHandle,
                parentId: targetFolderId
            });
        } catch (error) {
            console.error('Failed to create local voice note:', error);
            throw error;
        }
    },

    saveCurrentNote: async (title, content) => {
        const { currentNote, isLocalMode, currentFileHandle, notes } = get();
        if (!currentNote) return;

        // File System Mode
        try {
            let portableContent = get().dehydrateAssets(content);

            // Ensure metadata is preserved or injected
            const metaTag = `<!-- parchments-meta: {"createdAt": ${currentNote.createdAt}} -->`;
            if (!portableContent.includes('parchments-meta:')) {
                portableContent += `\n${metaTag}`;
            } else {
                // Update existing
                portableContent = portableContent.replace(/<!--\s*parchments-meta:.*?\s*-->/, metaTag);
            }

            await fileSystem.writeFile(currentFileHandle, portableContent);
            // Update store state to reflect changes
            set({
                currentNote: { ...currentNote, title, content, updatedAt: Date.now() }
            });
        } catch (error) {
            console.error('Failed to save to file:', error);
        }
    } else if(!isLocalMode && currentNote.id) {
    // DB Mode
    try {
        await db.notes.update(currentNote.id, {
            title,
            content,
            updatedAt: Date.now(),
        });

        const updatedNotes = notes.map(n =>
            n.id === currentNote.id
                ? { ...n, title, content, updatedAt: Date.now() }
                : n
        );
        set({ notes: updatedNotes, currentNote: { ...currentNote, title, content, updatedAt: Date.now()
    }
});
            } catch (error) {
    console.error('Failed to save to DB:', error);
}
        }
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
            if (src && !src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('asset:')) {
                try {
                    // Try to find the file in .assets/images/
                    const assetsHandle = await fileSystem.createDirectory(localDirectoryHandle, '.assets');
                    const imagesHandle = await fileSystem.createDirectory(assetsHandle, 'images');

                    // The src might be "filename.png" or ".assets/images/filename.png"
                    const fileName = src.split('/').pop()!;
                    const fileHandle = await imagesHandle.getFileHandle(fileName);
                    const file = await (fileHandle as any).getFile();
                    const blobUrl = URL.createObjectURL(file);
                    img.setAttribute('src', blobUrl);
                    // Store the mapping so we can dehydrate later if needed, 
                    // or just rely on the fact that blobs are recognizable.
                } catch (e) {
                    console.warn('[NoteStore] Failed to hydrate image:', src, e);
                }
            }
        }
        return doc.body.innerHTML;
    },

        dehydrateAssets: (content: string) => {
            const doc = new DOMParser().parseFromString(content, 'text/html');
            const images = Array.from(doc.querySelectorAll('img'));

            for (const img of images) {
                const assetName = img.getAttribute('data-asset-name');
                if (assetName) {
                    // Replace the blob URL with the relative path for portability
                    img.setAttribute('src', `.assets/images/${assetName}`);
                }
            }
            return doc.body.innerHTML;
        },

            setLocalMode: (enabled) => set({ isLocalMode: enabled }),
}));
