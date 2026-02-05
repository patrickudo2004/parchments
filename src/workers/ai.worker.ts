import { pipeline, env } from '@huggingface/transformers';

// Configuration for local-first use
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;
let generator: any = null;
let stopRequested = false;

const EMBED_MODEL = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const GEN_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct-ONNX';

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
        self.postMessage({ type: 'STATUS', message: 'Loading assistant engine (WebGPU)...' });

        // Add a 5-second timeout for WebGPU initialization
        const gpuPromise = pipeline('text-generation', GEN_MODEL, {
            device: 'webgpu', // Use Graphics Card for speed
            dtype: 'q8',      // Quantized for efficiency
            progress_callback: (p: any) => {
                if (p.status === 'progress') {
                    self.postMessage({ type: 'PROGRESS', progress: p.progress / 100 });
                }
            }
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('WebGPU initialization timed out')), 5000)
        );

        generator = await Promise.race([gpuPromise, timeoutPromise]);
        self.postMessage({ type: 'STATUS', message: 'Generative model loaded' });
    } catch (error: any) {
        console.warn('WebGPU failed or timed out, falling back to CPU:', error.message);
        self.postMessage({ type: 'STATUS', message: 'WebGPU unavailable, using CPU...' });
        try {
            generator = await pipeline('text-generation', GEN_MODEL, {
                device: 'wasm',
                dtype: 'q8',
                progress_callback: (p: any) => {
                    if (p.status === 'progress') {
                        self.postMessage({ type: 'PROGRESS', progress: p.progress / 100 });
                    }
                }
            });
            self.postMessage({ type: 'STATUS', message: 'Generative model loaded (CPU)' });
        } catch (cpuError: any) {
            self.postMessage({ type: 'ERROR', message: `Failed to load assistant engine: ${cpuError.message}` });
        }
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

    if (type === 'STOP_GENERATION') {
        stopRequested = true;
        return;
    }

    if (type === 'GENERATE_TEXT') {
        if (!generator) await initGenerator();
        stopRequested = false; // Reset for new request
        try {
            const { prompt, history } = data;

            // Format prompt for SmolLM2 Instruct
            const chat = [...history, { role: 'user', content: prompt }];
            const assistantHeader = '\n<|im_start|>assistant\n';
            const formattedPrompt = chat.map((m: any) =>
                `<|im_start|>${m.role}\n${m.content}<|im_end|>`
            ).join('\n') + assistantHeader;

            let lastLength = 0;
            const output = await generator(formattedPrompt, {
                max_new_tokens: 1024,
                temperature: 0.3,
                repetition_penalty: 1.1,
                do_sample: true,
                callback_function: (beams: any) => {
                    if (stopRequested) return true; // Return true to stop generation in transformers.js

                    const fullText = beams[0].output_text;
                    const contentOnly = fullText.includes(assistantHeader)
                        ? fullText.split(assistantHeader).pop()
                        : fullText.replace(formattedPrompt, '');

                    if (contentOnly && contentOnly.length > lastLength) {
                        const chunk = contentOnly.slice(lastLength);
                        self.postMessage({ type: 'CHAT_CHUNK', chunk });
                        lastLength = contentOnly.length;
                    }
                }
            });

            // If stopped, we still need to signal complete
            if (stopRequested) {
                self.postMessage({ type: 'CHAT_COMPLETE', stopped: true });
                return;
            }

            // Final safety check to ensure full content is sent (though callback should cover it)
            const response = output[0].generated_text.split(assistantHeader).pop();
            if (response.length > lastLength) {
                const chunk = response.slice(lastLength);
                self.postMessage({ type: 'CHAT_CHUNK', chunk });
            }
            self.postMessage({ type: 'CHAT_COMPLETE' });
        } catch (error: any) {
            self.postMessage({ type: 'ERROR', id, message: `Generation failed: ${error.message}` });
        }
    }
};
