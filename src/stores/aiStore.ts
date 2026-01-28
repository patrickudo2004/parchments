import { create } from 'zustand';
import { db } from '@/lib/db';

interface AIState {
    isInitializing: boolean;
    isModelLoaded: boolean;
    indexingProgress: number; // 0 to 1
    isIndexing: boolean;
    statusMessage: string;

    // Actions
    init: () => void;
    startIndexing: (localFiles?: any[]) => Promise<void>;
    search: (query: string) => Promise<any[]>;
    getRelatedNotes: (noteId: string) => Promise<any[]>;
}

let worker: Worker | null = null;
const pendingRequests = new Map<string, (result: any) => void>();

export const useAIStore = create<AIState>((set, get) => ({
    isInitializing: false,
    isModelLoaded: false,
    indexingProgress: 0,
    isIndexing: false,
    statusMessage: 'Ready',

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
                    break;
                case 'ERROR':
                    console.error('AI Worker Error:', message || error);
                    set({ statusMessage: `Error: ${message || error}`, isInitializing: false });
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
                            getContent: async () => await fileSystem.readFile(file.handle)
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
    }
}));
