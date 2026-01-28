import { pipeline, env } from '@xenova/transformers';

// Configuration for local-first use
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Initialize the model
async function init() {
    if (embedder) return;
    try {
        self.postMessage({ type: 'STATUS', message: 'Loading embedding model...' });
        embedder = await pipeline('feature-extraction', MODEL_NAME);
        self.postMessage({ type: 'STATUS', message: 'Model loaded successfully' });
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', message: `Failed to load model: ${error.message}` });
    }
}

self.onmessage = async (event) => {
    const { type, data, id } = event.data;

    if (type === 'INIT') {
        await init();
        return;
    }

    if (!embedder) {
        await init();
    }

    if (type === 'GENERATE_EMBEDDING') {
        try {
            const { text } = data;
            const output = await embedder(text, {
                pooling: 'mean',
                normalize: true,
            });

            // Extract the Float32Array from the tensor
            const vector = Array.from(output.data);

            self.postMessage({
                type: 'EMBEDDING_RESULT',
                id,
                vector
            });
        } catch (error: any) {
            self.postMessage({
                type: 'ERROR',
                id,
                message: `Embedding generation failed: ${error.message}`
            });
        }
    }
};
