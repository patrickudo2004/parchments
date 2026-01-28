import { pipeline, env } from '@xenova/transformers';

// Configuration for local-first use
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;
let generator: any = null;

const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
const GEN_MODEL = 'Xenova/SmolLM2-135M-Instruct';

// Initialize the embedding model
async function initEmbedder() {
    if (embedder) return;
    try {
        self.postMessage({ type: 'STATUS', message: 'Loading search engine...' });
        embedder = await pipeline('feature-extraction', EMBED_MODEL, {
            progress_callback: (p: any) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'PROGRESS', progress: p.progress / 100 });
                }
            }
        });
        self.postMessage({ type: 'STATUS', message: 'Model loaded successfully' });
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', message: `Failed to load search engine: ${error.message}` });
    }
}

// Initialize the generative model
async function initGenerator() {
    if (generator) return;
    try {
        self.postMessage({ type: 'STATUS', message: 'Loading assistant engine...' });
        generator = await pipeline('text-generation', GEN_MODEL, {
            progress_callback: (p: any) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'PROGRESS', progress: p.progress / 100 });
                }
            }
        });
        self.postMessage({ type: 'STATUS', message: 'Generative model loaded' });
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', message: `Failed to load assistant engine: ${error.message}` });
    }
}

self.onmessage = async (event) => {
    const { type, data, id } = event.data;

    if (type === 'INIT') {
        await initEmbedder();
        return;
    }

    if (type === 'LOAD_GENERATIVE') {
        await initGenerator();
        return;
    }

    if (type === 'GENERATE_EMBEDDING') {
        if (!embedder) await initEmbedder();
        try {
            const { text } = data;
            const output = await embedder(text, {
                pooling: 'mean',
                normalize: true,
            });

            const vector = Array.from(output.data);
            self.postMessage({ type: 'EMBEDDING_RESULT', id, vector });
        } catch (error: any) {
            self.postMessage({ type: 'ERROR', id, message: `Embedding failed: ${error.message}` });
        }
    }

    if (type === 'GENERATE_TEXT') {
        if (!generator) await initGenerator();
        try {
            const { prompt, history } = data;

            // Format prompt for SmolLM2 Instruct
            const chat = [...history, { role: 'user', content: prompt }];
            const formattedPrompt = chat.map((m: any) =>
                `<|im_start|>${m.role}\n${m.content}<|im_end|>`
            ).join('\n') + '\n<|im_start|>assistant\n';

            const output = await generator(formattedPrompt, {
                max_new_tokens: 512,
                temperature: 0.7,
                do_sample: true
            });

            const response = output[0].generated_text.split('<|im_start|>assistant\n').pop();
            self.postMessage({ type: 'CHAT_CHUNK', chunk: response });
            self.postMessage({ type: 'CHAT_COMPLETE' });
        } catch (error: any) {
            self.postMessage({ type: 'ERROR', id, message: `Generation failed: ${error.message}` });
        }
    }
};
