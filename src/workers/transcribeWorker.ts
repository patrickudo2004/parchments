console.info('[Worker] Transcription worker script loaded.');

// Define global shims before any other imports
if (typeof self !== 'undefined') {
    (self as any).window = self;
    (self as any).global = self;
}

let pipeline: any = null;
let env: any = null;

async function initTransformers(_localRuntime = false) {
    if (pipeline) return;
    const transformers = await import('@huggingface/transformers');
    pipeline = transformers.pipeline;
    env = transformers.env;

    const origin = (typeof self !== 'undefined' && self.location?.origin && !self.location.origin.startsWith('blob:') && self.location.origin !== 'null')
        ? self.location.origin
        : '';

    // Enable local model loading from pre-bundled /models/ directory
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    env.localModelPath = origin ? `${origin}/models/` : '/models/';
    env.useBrowserCache = true;

    // Load ONNX Runtime WASM from the local app bundle (/ort/) instead of cdn.jsdelivr.net.
    // The CDN script import is blocked by desktop CSP and unavailable offline.
    if (env.backends?.onnx?.wasm) {
        const wasmDir = origin ? `${origin}/ort/` : '/ort/';
        env.backends.onnx.wasm.wasmPaths = wasmDir;
        env.backends.onnx.wasm.proxy = false;
        console.info('[Worker] Using local bundled ONNX Runtime from', wasmDir);
    }
    console.info('[Worker] AI Engine initialized. Pre-bundled offline models enabled.');
}

class TranscribeWorker {
    static instance: any = null;
    static model: string | null = null;

    static async getInstance(model: string, progress_callback?: (progress: any) => void, localRuntime = false) {
        await initTransformers(localRuntime);
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
                try {
                    this.instance = await pipeline('automatic-speech-recognition', model, {
                        device: 'wasm',
                        dtype: 'q8',
                        progress_callback,
                    });
                } catch (wasmErr) {
                    if (model !== 'onnx-community/whisper-tiny.en') {
                        console.warn('[Worker] High-accuracy model unavailable offline, falling back to bundled whisper-tiny.en:', wasmErr);
                        this.model = 'onnx-community/whisper-tiny.en';
                        this.instance = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
                            device: 'wasm',
                            dtype: 'q8',
                            progress_callback,
                        });
                    } else {
                        throw wasmErr;
                    }
                }
            }
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data) return;

    const { type, id, audioBlob, audioData, highAccuracy, localRuntime } = data;
    const model = highAccuracy ? 'onnx-community/whisper-base' : 'onnx-community/whisper-tiny.en';

    // 1. Prewarm model in background
    if (type === 'prewarm') {
        try {
            await TranscribeWorker.getInstance(model, undefined, !!localRuntime);
            self.postMessage({ type: 'ready', model });
        } catch (e: any) {
            console.warn('[Worker] Prewarm failed:', e);
        }
        return;
    }

    // 2. Real-time Chunk Transcription (16kHz Float32Array from microphone stream)
    if (type === 'transcribe_chunk') {
        try {
            const transcriber = await TranscribeWorker.getInstance(model, undefined, !!localRuntime);
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
        await initTransformers(!!localRuntime);
        self.postMessage({ status: 'loading', message: `Initializing ${highAccuracy ? 'High Accuracy' : 'Turbo'} AI...` });

        const transcriber = await TranscribeWorker.getInstance(model, (progressData: any) => {
            self.postMessage({ status: 'downloading', ...progressData });
        }, !!localRuntime);

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
                await initTransformers(!!localRuntime);
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
