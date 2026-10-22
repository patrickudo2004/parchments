console.info('[Worker] Transcription worker script loaded.');

// Define global shims before any other imports
if (typeof self !== 'undefined') {
    (self as any).window = self;
    (self as any).global = self;
}

let pipeline: any = null;
let env: any = null;

async function initTransformers() {
    if (pipeline) return;
    const transformers = await import('@huggingface/transformers');
    pipeline = transformers.pipeline;
    env = transformers.env;

    // Skip local checks to avoid FS errors in browser/webview
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    console.info('[Worker] AI Engine initialized. Offline caching enabled.');
}

class TranscribeWorker {
    static instance: any = null;
    static model: string | null = null;

    static async getInstance(model: string, progress_callback?: (progress: any) => void) {
        await initTransformers();
        if (this.instance && this.model !== model) {
            this.instance = null;
        }

        if (!this.instance) {
            this.model = model;
            try {
                this.instance = await pipeline('automatic-speech-recognition', model, {
                    device: 'webgpu',
                    progress_callback,
                });
            } catch (gpuErr) {
                console.warn('[Worker] WebGPU unavailable, falling back to WASM q8:', gpuErr);
                this.instance = await pipeline('automatic-speech-recognition', model, {
                    device: 'wasm',
                    dtype: 'q8',
                    progress_callback,
                });
            }
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data) return;

    const { type, id, audioBlob, audioData, highAccuracy } = data;
    const model = highAccuracy ? 'onnx-community/whisper-base' : 'onnx-community/whisper-tiny.en';

    // 1. Prewarm model in background
    if (type === 'prewarm') {
        try {
            await TranscribeWorker.getInstance(model);
            self.postMessage({ type: 'ready', model });
        } catch (e: any) {
            console.warn('[Worker] Prewarm failed:', e);
        }
        return;
    }

    // 2. Real-time Chunk Transcription (16kHz Float32Array from microphone stream)
    if (type === 'transcribe_chunk') {
        try {
            const transcriber = await TranscribeWorker.getInstance(model);
            const output = await transcriber(audioData, {
                chunk_length_s: 30,
                stride_length_s: 5,
                language: 'en',
                task: 'transcribe',
                return_timestamps: false,
            });

            const text = Array.isArray(output) ? output[0].text : (output as any).text;
            self.postMessage({
                type: 'chunk_result',
                id,
                text: (text || '').trim(),
            });
        } catch (chunkErr: any) {
            self.postMessage({
                type: 'error',
                id,
                error: chunkErr?.message || String(chunkErr),
            });
        }
        return;
    }

    // 3. Batch transcription for post-recording (compatible with transcriptionService.ts)
    try {
        await initTransformers();
        self.postMessage({ status: 'loading', message: `Initializing ${highAccuracy ? 'High Accuracy' : 'Turbo'} AI...` });

        const transcriber = await TranscribeWorker.getInstance(model, (progressData: any) => {
            self.postMessage({ status: 'downloading', ...progressData });
        });

        self.postMessage({ status: 'transcribing', message: 'Transcribing with AI acceleration...' });

        const input = audioBlob || audioData;
        const output = await transcriber(input, {
            chunk_length_s: 30,
            stride_length_s: 5,
            dtype: 'fp16',
        });

        const text = Array.isArray(output) ? output[0].text : (output as any).text;
        self.postMessage({
            status: 'complete',
            text: (text || '').trim(),
        });
    } catch (error: any) {
        const isDeviceError = error.message?.includes('webgpu') || error.message?.includes('fp16') || error.message?.includes('dtype');

        if (isDeviceError) {
            console.warn('[Worker] WebGPU/fp16 not supported, falling back to CPU/WASM.');
            self.postMessage({ status: 'loading', message: 'Optimizing for your device (standard engine)...' });
            try {
                await initTransformers();
                const transcriber = await pipeline('automatic-speech-recognition', model, {
                    device: 'wasm',
                    dtype: 'q8',
                    progress_callback: (progressData: any) => self.postMessage({ status: 'downloading', ...progressData }),
                });
                const input = audioBlob || audioData;
                const result = await transcriber(input);
                const text = Array.isArray(result) ? result[0].text : (result as any).text;
                self.postMessage({ status: 'complete', text: (text || '').trim() });
                return;
            } catch (fallbackError: any) {
                error = fallbackError;
            }
        }

        self.postMessage({
            status: 'error',
            error: error.message,
        });
    }
});
