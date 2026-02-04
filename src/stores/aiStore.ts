import { create } from 'zustand';
import { db } from '@/lib/db';
import { useNoteStore } from './noteStore';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface AIState {
    isInitializing: boolean;
    isModelLoaded: boolean;
    indexingProgress: number; // 0 to 1
    isIndexing: boolean;
    statusMessage: string;

    // Generative / Chat state
    isAIFeaturesEnabled: boolean;
    isGenerativeModelDownloaded: boolean;
    isGenerativeModelLoading: boolean;
    downloadProgress: number;
    chatHistory: Message[];
    isChatting: boolean;
    isBibleIndexing: boolean;
    bibleIndexingProgress: number;

    // Actions
    init: () => void;
    startIndexing: (localFiles?: any[]) => Promise<void>;
    search: (query: string) => Promise<any[]>;
    getRelatedNotes: (noteId: string) => Promise<any[]>;

    // New Actions
    toggleAIFeatures: (enabled: boolean) => void;
    downloadGenerativeModel: () => Promise<void>;
    clearModelCache: () => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    clearChat: () => void;
    indexBible: (versionId: string) => Promise<void>;
    searchBible: (query: string, versionId?: string) => Promise<any[]>;
}

let worker: Worker | null = null;
const pendingRequests = new Map<string, (result: any) => void>();

export const useAIStore = create<AIState>((set, get) => ({
    isInitializing: false,
    isModelLoaded: false,
    indexingProgress: 0,
    isIndexing: false,
    statusMessage: 'Ready',
    isAIFeaturesEnabled: false,
    isGenerativeModelDownloaded: false,
    isGenerativeModelLoading: false,
    downloadProgress: 0,
    chatHistory: [],
    isChatting: false,
    isBibleIndexing: false,
    bibleIndexingProgress: 0,

    init: () => {
        if (worker || typeof window === 'undefined') return;

        set({ isInitializing: true, statusMessage: 'Starting AI Worker...' });

        // Vite-specific worker initialization
        worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
            type: 'module'
        });

        worker.onmessage = (event) => {
            const { type, message, id, vector, error } = event.data;

            switch (type) {
                case 'STATUS':
                    set({ statusMessage: message });
                    if (message === 'Model loaded successfully') {
                        set({ isModelLoaded: true, isInitializing: false });
                    }
                    if (message === 'Generative model loaded') {
                        set({ isGenerativeModelDownloaded: true, isGenerativeModelLoading: false });
                    }
                    break;
                case 'PROGRESS':
                    set({ downloadProgress: event.data.progress });
                    break;
                case 'CHAT_CHUNK':
                    set(state => {
                        const history = [...state.chatHistory];
                        const lastMsg = history[history.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content += event.data.chunk;
                            return { chatHistory: history };
                        }
                        return state;
                    });
                    break;
                case 'CHAT_COMPLETE':
                    set({ isChatting: false });
                    break;
                case 'ERROR':
                    console.error('AI Worker Error:', message || error);
                    set({
                        statusMessage: `Error: ${message || error}`,
                        isInitializing: false,
                        isGenerativeModelLoading: false,
                        isChatting: false
                    });
                    break;
                case 'EMBEDDING_RESULT':
                    const resolver = pendingRequests.get(id);
                    if (resolver) {
                        resolver(vector);
                        pendingRequests.delete(id);
                    }
                    break;
            }
        };

        worker.postMessage({ type: 'INIT' });
    },

    startIndexing: async (localFiles?: any[]) => {
        const { isIndexing, isModelLoaded, init } = get();
        if (isIndexing) return;
        if (!isModelLoaded) {
            init();
            return;
        }

        set({ isIndexing: true, indexingProgress: 0, statusMessage: 'Scanning items for indexing...' });

        try {
            const dbNotes = await db.notes.toArray();
            const vectors = await db.vectors.toArray();
            const indexedNoteIds = new Set(vectors.map(v => v.noteId));

            // Combine DB notes and Local files for indexing
            const itemsToIndex: { id: string, title: string, getContent: () => Promise<string> }[] = [
                ...dbNotes.map(n => ({
                    id: n.id,
                    title: n.title,
                    getContent: async () => n.content
                }))
            ];

            if (localFiles) {
                const { fileSystem } = await import('@/lib/filesystem/FileSystemService');
                for (const file of localFiles) {
                    if (file.kind === 'file' && !indexedNoteIds.has(file.id)) {
                        itemsToIndex.push({
                            id: file.id,
                            title: file.name,
                            getContent: async () => await fileSystem.readFile(file.handle) as string
                        });
                    }
                }
            }

            const pendingItems = itemsToIndex.filter(item => !indexedNoteIds.has(item.id));

            if (pendingItems.length === 0) {
                set({ isIndexing: false, statusMessage: 'All items are up to date' });
                return;
            }

            for (let i = 0; i < pendingItems.length; i++) {
                const item = pendingItems[i];
                set({
                    indexingProgress: i / pendingItems.length,
                    statusMessage: `Indexing: ${item.title}...`
                });

                const content = await item.getContent();
                const cleanContent = content.replace(/<[^>]*>/g, '');

                const requestId = `idx-${item.id}-${Date.now()}`;
                const vector = await new Promise<number[]>((resolve) => {
                    pendingRequests.set(requestId, resolve);
                    worker?.postMessage({
                        type: 'GENERATE_EMBEDDING',
                        id: requestId,
                        data: { text: `${item.title}\n${cleanContent}` }
                    });
                });

                await db.vectors.put({
                    id: item.id,
                    noteId: item.id,
                    vector: new Float32Array(vector),
                    lastIndexed: Date.now()
                });
            }

            set({ isIndexing: false, indexingProgress: 1, statusMessage: 'Indexing complete' });
        } catch (error) {
            console.error('Indexing failed:', error);
            set({ isIndexing: false, statusMessage: 'Indexing failed' });
        }
    },

    search: async (query: string) => {
        const { isModelLoaded, init } = get();
        if (!isModelLoaded) {
            init();
            return [];
        }

        // 1. Generate embedding for the query
        const requestId = `search-${Date.now()}`;
        const queryVector = await new Promise<number[]>((resolve) => {
            pendingRequests.set(requestId, resolve);
            worker?.postMessage({
                type: 'GENERATE_EMBEDDING',
                id: requestId,
                data: { text: query }
            });
        });

        const qv = new Float32Array(queryVector);

        // 2. Fetch all stored vectors
        const allVectors = await db.vectors.toArray();
        if (allVectors.length === 0) return [];

        // 3. Simple Cosine Similarity (Dot product since normalize:true was used in worker)
        const results = allVectors.map(v => {
            let score = 0;
            for (let i = 0; i < qv.length; i++) {
                score += qv[i] * v.vector[i];
            }
            return { noteId: v.noteId, score };
        });

        // 4. Sort and return top results
        return results
            .filter(r => r.score > 0.4) // Lowered threshold for better recall
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    },

    getRelatedNotes: async (noteId: string) => {
        const { isModelLoaded, init } = get();
        if (!isModelLoaded) {
            init();
            return [];
        }

        const allVectors = await db.vectors.toArray();
        const targetVector = allVectors.find(v => v.noteId === noteId);
        if (!targetVector || allVectors.length <= 1) return [];

        const tv = targetVector.vector;
        const results = allVectors
            .filter(v => v.noteId !== noteId)
            .map(v => {
                let score = 0;
                for (let i = 0; i < tv.length; i++) {
                    score += tv[i] * v.vector[i];
                }
                return { noteId: v.noteId, score };
            });

        return results
            .filter(r => r.score > 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    },

    indexBible: async (versionId: string) => {
        const { isBibleIndexing, isModelLoaded, init } = get();
        if (isBibleIndexing) return;
        if (!isModelLoaded) {
            init();
            return;
        }

        set({ isBibleIndexing: true, bibleIndexingProgress: 0, statusMessage: 'Preparing Bible for semantic search...' });

        try {
            // Check if already indexed
            const count = await db.bibleVectors.where('versionId').equals(versionId).count();
            if (count > 0) {
                set({ isBibleIndexing: false, statusMessage: 'Bible already indexed' });
                return;
            }

            // We index CHAPTERS instead of Verses to maintain performance (31k verses is too slow for browser)
            // A semantic search for "Comfort" will find the chapter, then we show the verses.
            const verses = await db.bibleVerses.where('versionId').equals(versionId).toArray();

            // Group by book and chapter
            const chapters: Record<string, string[]> = {};
            verses.forEach(v => {
                const key = `${v.book}|${v.chapter}`;
                if (!chapters[key]) chapters[key] = [];
                chapters[key].push(v.text);
            });

            const chapterKeys = Object.keys(chapters);
            for (let i = 0; i < chapterKeys.length; i++) {
                const key = chapterKeys[i];
                const [book, chapter] = key.split('|');
                const content = chapters[key].join(' ');

                set({
                    bibleIndexingProgress: i / chapterKeys.length,
                    statusMessage: `Indexing Bible: ${book} ${chapter}...`
                });

                const requestId = `bbl-${versionId}-${key}-${Date.now()}`;
                const vector = await new Promise<number[]>((resolve) => {
                    pendingRequests.set(requestId, resolve);
                    worker?.postMessage({
                        type: 'GENERATE_EMBEDDING',
                        id: requestId,
                        data: { text: content.slice(0, 1000) } // Truncate to avoid model context limits
                    });
                });

                await db.bibleVectors.add({
                    id: `${versionId}-${key}`,
                    versionId,
                    book,
                    chapter: parseInt(chapter),
                    verse: 1, // Store as first verse of chapter
                    vector: new Float32Array(vector)
                });
            }

            set({ isBibleIndexing: false, bibleIndexingProgress: 1, statusMessage: 'Bible indexing complete' });
        } catch (error) {
            console.error('Bible indexing failed:', error);
            set({ isBibleIndexing: false, statusMessage: 'Bible indexing failed' });
        }
    },

    searchBible: async (query: string, versionId?: string) => {
        const { isModelLoaded, init } = get();
        if (!isModelLoaded) {
            init();
            return [];
        }

        const requestId = `bblsearch-${Date.now()}`;
        const queryVector = await new Promise<number[]>((resolve) => {
            pendingRequests.set(requestId, resolve);
            worker?.postMessage({
                type: 'GENERATE_EMBEDDING',
                id: requestId,
                data: { text: query }
            });
        });

        const qv = new Float32Array(queryVector);

        // Fetch Bible vectors
        let query_base = db.bibleVectors.toCollection();
        if (versionId) {
            query_base = db.bibleVectors.where('versionId').equals(versionId);
        }

        const allVectors = await query_base.toArray();
        if (allVectors.length === 0) return [];

        const results = allVectors.map(v => {
            let score = 0;
            for (let i = 0; i < qv.length; i++) {
                score += qv[i] * v.vector[i];
            }
            return { book: v.book, chapter: v.chapter, score };
        });

        return results
            .filter(r => r.score > 0.45)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    },

    toggleAIFeatures: (enabled: boolean) => {
        set({ isAIFeaturesEnabled: enabled });
    },

    downloadGenerativeModel: async () => {
        const { isGenerativeModelLoading, init } = get();
        if (isGenerativeModelLoading) return;

        if (!worker) init();

        set({ isGenerativeModelLoading: true, downloadProgress: 0, statusMessage: 'Downloading AI model...' });
        worker?.postMessage({ type: 'LOAD_GENERATIVE' });
    },

    clearModelCache: async () => {
        try {
            set({ statusMessage: 'Purging local AI assets...' });

            // Clear multiple possible cache names used by transformers.js and ONNX
            const cacheNames = ['transformers-cache', 'onnx-runtime-web-cache', 'hf-transformers-cache'];
            for (const name of cacheNames) {
                await caches.delete(name);
            }

            set({
                isGenerativeModelDownloaded: false,
                isModelLoaded: false,
                statusMessage: 'AI assets purged'
            });
        } catch (error) {
            console.error('Failed to purge AI cache:', error);
            set({ statusMessage: 'Purge failed' });
        }
    },

    sendMessage: async (content: string) => {
        const { isChatting, chatHistory } = get();
        const noteStore = useNoteStore.getState();
        const currentNote = noteStore.currentNote;

        if (isChatting || !content.trim()) return;

        const newMsg: Message = { role: 'user', content, timestamp: Date.now() };
        const assistantMsg: Message = { role: 'assistant', content: '', timestamp: Date.now() };

        set({
            chatHistory: [...chatHistory, newMsg, assistantMsg],
            isChatting: true
        });

        // Fetch context for RAG
        let context = "";
        if (currentNote) {
            const cleanContent = currentNote.content.replace(/<[^>]*>/g, '');
            context = `CURRENT NOTE CONTEXT:\nTitle: ${currentNote.title}\nContent: ${cleanContent}\n\n`;
        }

        const systemPrompt = `You are a specialized Theological Exegesis Assistant. 
Your goal is to provide deep, scholarly, yet accessible analysis of biblical texts and theological notes.

GUIDELINES:
1. Prioritize the provided CONTEXT (user notes).
2. If the user asks for an outline, use a clear hierarchical structure.
3. If analyzing Greek/Hebrew, be precise but explain terms simply.
4. If the answer isn't in the context, use your general knowledge but clearly state when you are moving beyond the user's specific notes.
5. Be concise. Avoid repetitive fluff.

${context}`;

        worker?.postMessage({
            type: 'GENERATE_TEXT',
            data: {
                prompt: content,
                history: [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory.map(m => ({ role: m.role, content: m.content }))
                ]
            }
        });
    },

    clearChat: () => {
        set({ chatHistory: [] });
    }
}));
