import { db } from '@/lib/db';

let extractorPromise: Promise<any> | null = null;
let extractorInstance: any = null;

/**
 * Initializes the Transformers.js feature-extraction pipeline on-demand.
 * Downloads the all-MiniLM-L6-v2 model (~23MB) on first run and caches it in the browser.
 */
export async function getExtractor(progressCallback?: (data: any) => void): Promise<any> {
    if (extractorInstance) return extractorInstance;

    if (!extractorPromise) {
        extractorPromise = (async () => {
            console.info('[SemanticSearch] Initializing AI Embedding engine...');
            const transformers = await import('@huggingface/transformers');
            
            const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';

            // Enable local model loading from pre-bundled /models/ directory
            transformers.env.allowLocalModels = true;
            transformers.env.allowRemoteModels = true;
            transformers.env.localModelPath = origin ? `${origin}/models/` : '/models/';
            transformers.env.useBrowserCache = true;

            // Configure local ONNX WASM runtime path
            if (transformers.env.backends?.onnx?.wasm) {
                const wasmDir = origin ? `${origin}/ort/` : '/ort/';
                transformers.env.backends.onnx.wasm.wasmPaths = wasmDir;
                transformers.env.backends.onnx.wasm.proxy = false;
            }

            extractorInstance = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                device: 'wasm',
                dtype: 'q8',
                progress_callback: (data: any) => {
                    if (progressCallback && data.status === 'progress') {
                        progressCallback(data);
                    }
                }
            });
            console.info('[SemanticSearch] AI Embedding engine loaded and ready.');
            return extractorInstance;
        })();
    }

    return extractorPromise;
}

/**
 * Calculates cosine similarity between two numerical vectors.
 */
export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Strips HTML tags and extracts a clean plain text representation.
 */
function cleanHtml(html: string): string {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
}

let scheduleTimer: any = null;
let pendingNoteToIndex: { noteId: string; title: string; content: string } | null = null;

export const SemanticSearchService = {
    /**
     * Non-blocking, deferred background indexing for notes.
     * Only schedules indexing when the app is idle, debounced by 10s,
     * and only if the AI model is already loaded. This prevents UI freezes
     * during active typing.
     */
    scheduleIndexNote: (noteId: string, title: string, content: string): void => {
        // Skip if model has not been initialized yet — do not force a 23MB download or WASM boot on basic typing
        if (!extractorInstance && !extractorPromise) {
            return;
        }

        pendingNoteToIndex = { noteId, title, content };

        if (scheduleTimer) {
            clearTimeout(scheduleTimer);
        }

        scheduleTimer = setTimeout(() => {
            scheduleTimer = null;
            if (!pendingNoteToIndex) return;
            const toIndex = pendingNoteToIndex;
            pendingNoteToIndex = null;

            const run = () => {
                SemanticSearchService.indexNote(toIndex.noteId, toIndex.title, toIndex.content).catch(err => {
                    console.warn('[SemanticSearch] Deferred indexing failed:', err);
                });
            };

            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                (window as any).requestIdleCallback(run, { timeout: 5000 });
            } else {
                setTimeout(run, 0);
            }
        }, 10000); // 10 seconds of complete idle time after user finishes typing
    },
    /**
     * Generates a vector embedding for note text and updates the vectors index table.
     */
    indexNote: async (noteId: string, title: string, content: string): Promise<void> => {
        try {
            const plainText = `${title}\n${cleanHtml(content)}`.trim();
            if (!plainText || plainText.length < 5) return;

            console.log(`[SemanticSearch] Indexing note: "${title}" (${noteId})...`);
            
            // Get extractor (silent initialization if not loaded)
            const extractor = await getExtractor();
            
            // Extract features
            const output = await extractor(plainText, { pooling: 'mean', normalize: true });
            
            // Convert to flat array
            const embedding = Array.from(output.data) as number[];
            
            // Store embedding
            await db.vectors.put({
                id: noteId,
                noteId: noteId,
                vector: new Float32Array(embedding) as any, // Dexie stores Float32Array as binary/object
                lastIndexed: Date.now()
            });
            
            console.log(`[SemanticSearch] Note "${title}" successfully indexed (Dimensions: ${embedding.length}).`);
        } catch (err) {
            console.error('[SemanticSearch] Failed to index note:', err);
        }
    },

    /**
     * Performs a vector similarity query against indexed notes.
     */
    searchNotes: async (queryText: string, progressCallback?: (data: any) => void): Promise<{ noteId: string; similarity: number }[]> => {
        if (!queryText.trim()) return [];

        try {
            console.log(`[SemanticSearch] Querying similarity for: "${queryText}"...`);
            const extractor = await getExtractor(progressCallback);
            
            // Embed the query
            const output = await extractor(queryText, { pooling: 'mean', normalize: true });
            const queryVector = Array.from(output.data) as number[];

            // Get all note vectors
            const allNoteVectors = await db.vectors.toArray();
            if (allNoteVectors.length === 0) {
                console.log('[SemanticSearch] No indexed note vectors found in database.');
                return [];
            }

            // Compute similarity
            const matches = allNoteVectors.map(item => {
                const vectorArray = item.vector instanceof Float32Array 
                    ? item.vector 
                    : new Float32Array(Object.values(item.vector)); // Safe parse for structured clones

                const similarity = cosineSimilarity(queryVector, vectorArray);
                return {
                    noteId: item.noteId,
                    similarity
                };
            });

            // Sort and filter hits
            const hits = matches
                .filter(h => h.similarity >= 0.35) // Practical threshold for MiniLM-L6-v2 cosine match
                .sort((a, b) => b.similarity - a.similarity);

            console.log(`[SemanticSearch] Matches found: ${hits.length}`);
            return hits;
        } catch (err) {
            console.error('[SemanticSearch] Similarity search failed:', err);
            return [];
        }
    }
};
