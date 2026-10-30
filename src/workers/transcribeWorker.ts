console.info('[Worker] Transcription worker script loaded.');

// Define global shims before any other imports
if (typeof self !== 'undefined') {
    (self as any).window = self;
    (self as any).global = self;
}

let pipeline: any = null;
let env: any = null;

async function initTransformers(_localRuntime = false, allowRemote = false) {
    if (pipeline) return;
    const transformers = await import('@huggingface/transformers');
    pipeline = transformers.pipeline;
    env = transformers.env;

    const origin = (typeof self !== 'undefined' && self.location?.origin && !self.location.origin.startsWith('blob:') && self.location.origin !== 'null')
        ? self.location.origin
        : '';

    // Enable local model loading from pre-bundled /models/ directory
    env.allowLocalModels = true;
    // Strictly disable remote fetches unless explicitly requested for optional non-bundled models
    env.allowRemoteModels = allowRemote;
    env.localModelPath = origin ? `${origin}/models/` : '/models/';
    env.useBrowserCache = true;

    // Load ONNX Runtime WASM from the local app bundle (/ort/) instead of cdn.jsdelivr.net.
    if (env.backends?.onnx?.wasm) {
        const wasmDir = origin ? `${origin}/ort/` : '/ort/';
        env.backends.onnx.wasm.wasmPaths = wasmDir;
        env.backends.onnx.wasm.proxy = false;
        // Run single-threaded inside dedicated worker to prevent nested worker thread pool deadlocks
        env.backends.onnx.wasm.numThreads = 1;
        console.info('[Worker] Using local bundled ONNX Runtime from', wasmDir, 'with numThreads = 1');
    }
    console.info('[Worker] AI Engine initialized. Pre-bundled offline models enabled.');
}

class TranscribeWorker {
    static instance: any = null;
    static model: string | null = null;

    static async getInstance(model: string, progress_callback?: (progress: any) => void, localRuntime = false, highAccuracy = false) {
        await initTransformers(localRuntime, highAccuracy);
        if (this.instance && this.model !== model) {
            this.instance = null;
        }

        if (!this.instance) {
            this.model = model;
            // The default pre-bundled engine is whisper-tiny.en (q8 quantized).
            // Directly initialize with device: 'wasm' and dtype: 'q8' to guarantee instant, 100% offline loading.
            if (model === 'onnx-community/whisper-tiny.en') {
                this.instance = await pipeline('automatic-speech-recognition', model, {
                    device: 'wasm',
                    dtype: 'q8',
                    progress_callback,
                });
            } else {
                // High accuracy (base) model if requested and online
                try {
                    this.instance = await pipeline('automatic-speech-recognition', model, {
                        device: 'webgpu',
                        progress_callback,
                    });
                } catch (gpuErr) {
                    console.warn('[Worker] WebGPU unavailable for base model, falling back to WASM q8:', gpuErr);
                    this.instance = await pipeline('automatic-speech-recognition', model, {
                        device: 'wasm',
                        dtype: 'q8',
                        progress_callback,
                    });
                }
            }
        }
        return this.instance;
    }
}

function getGenerationOptions(modelName: string): any {
    const isEnglishOnly = modelName.endsWith('.en');
    const options: any = {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
    };
    // English-only Whisper models throw if language or task is supplied
    if (!isEnglishOnly) {
        options.language = 'en';
        options.task = 'transcribe';
    }
    return options;
}

self.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data) return;

    const { type, id, audioBlob, audioData, highAccuracy, localRuntime } = data;
    const model = highAccuracy ? 'onnx-community/whisper-base' : 'onnx-community/whisper-tiny.en';

    // 1. Prewarm model in background
    if (type === 'prewarm') {
        try {
            await TranscribeWorker.getInstance(model, undefined, !!localRuntime, !!highAccuracy);
            self.postMessage({ type: 'ready', model });
        } catch (e: any) {
            console.warn('[Worker] Prewarm failed:', e);
            self.postMessage({ type: 'ready', model, warning: e?.message });
        }
        return;
    }

    // 2. Real-time Chunk Transcription (16kHz Float32Array from microphone stream)
    if (type === 'transcribe_chunk') {
        try {
            const transcriber = await TranscribeWorker.getInstance(model, undefined, !!localRuntime, !!highAccuracy);
            const output = await transcriber(audioData, getGenerationOptions(model));

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
        await initTransformers(!!localRuntime, !!highAccuracy);
        self.postMessage({ status: 'loading', message: `Initializing ${highAccuracy ? 'High Accuracy' : 'Turbo'} AI...` });

        const transcriber = await TranscribeWorker.getInstance(model, (progressData: any) => {
            self.postMessage({ status: 'downloading', ...progressData });
        }, !!localRuntime, !!highAccuracy);

        self.postMessage({ status: 'transcribing', message: 'Transcribing with AI acceleration...' });

        const input = audioBlob || audioData;
        const output = await transcriber(input, getGenerationOptions(model));

        const text = Array.isArray(output) ? output[0].text : (output as any).text;
        self.postMessage({
            status: 'complete',
            text: (text || '').trim(),
        });
    } catch (error: any) {
        console.warn('[Worker] Transcription attempt failed, retrying with bundled WASM q8 engine:', error);
        try {
            await initTransformers(!!localRuntime, false);
            const fallbackModel = 'onnx-community/whisper-tiny.en';
            const transcriber = await pipeline('automatic-speech-recognition', fallbackModel, {
                device: 'wasm',
                dtype: 'q8',
                progress_callback: (progressData: any) => self.postMessage({ status: 'downloading', ...progressData }),
            });
            const input = audioBlob || audioData;
            const result = await transcriber(input, getGenerationOptions(fallbackModel));
            const text = Array.isArray(result) ? result[0].text : (result as any).text;
            self.postMessage({ status: 'complete', text: (text || '').trim() });
            return;
        } catch (fallbackError: any) {
            self.postMessage({
                status: 'error',
                error: fallbackError?.message || error?.message || 'Transcription failed',
            });
        }
    }
});
