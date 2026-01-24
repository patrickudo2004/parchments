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

    // Skip local checks for now to avoid FS errors in browser
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    console.info('[Worker] AI Engine initialized. Offline caching enabled.');
}

class TranscribeWorker {
    static instance: any = null;
    static model: string | null = null;

    static async getInstance(model: string, progress_callback: (progress: any) => void) {
        await initTransformers();
        // If instance exists but model changed, we need to create a new one
        if (this.instance && this.model !== model) {
            this.instance = null;
        }

        if (!this.instance) {
            this.model = model;

            // Check for WebGPU and fp16 support if possible
            // Note: In v3, passing device: 'webgpu' without dtype might still work and auto-detect.
            // We'll try to be safe but performant.
            this.instance = await pipeline('automatic-speech-recognition', model, {
                device: 'webgpu',
                // Don't force fp16 here, let the transcriber call handle it or fallback
                progress_callback,
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { audioBlob, highAccuracy } = event.data;

    // Switch to verified onnx-community models for max stability with transformers.js v3
    // Standard: whisper-tiny (Small, fast, reliable)
    // High Accuracy: whisper-base
    const model = highAccuracy ? 'onnx-community/whisper-base' : 'onnx-community/whisper-tiny.en';

    try {
        await initTransformers();
        self.postMessage({ status: 'loading', message: `Initializing ${highAccuracy ? 'High Accuracy' : 'Turbo'} AI...` });

        const transcriber = await TranscribeWorker.getInstance(model, (data: any) => {
            self.postMessage({ status: 'downloading', ...data });
        });

        self.postMessage({ status: 'transcribing', message: 'Transcribing with AI acceleration...' });

        // Try fp16 first, if it fails it will throw and we fallback to WASM/float32
        const output = await transcriber(audioBlob, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'english',
            task: 'transcribe',
            // In v3, we can use 'auto' or a specific type. 
            // If the user's hardware failed last time, we could remember, 
            // but for now we'll just try and catch.
            dtype: 'fp16',
        });

        const text = Array.isArray(output) ? output[0].text : (output as any).text;

        self.postMessage({
            status: 'complete',
            text: text,
        });

    } catch (error: any) {
        const isDeviceError = error.message?.includes('webgpu') || error.message?.includes('fp16') || error.message?.includes('dtype');

        if (isDeviceError) {
            console.warn('[Worker] WebGPU/fp16 not supported, falling back to CPU/WASM.');
            self.postMessage({ status: 'loading', message: 'Optimizing for your device (standard engine)...' });
            try {
                await initTransformers();
                // For WASM fallback, use quantized: true for speed
                const transcriber = await pipeline('automatic-speech-recognition', model, {
                    device: 'wasm',
                    dtype: 'q8', // Use 8-bit quantization for CPU/WASM speed
                    progress_callback: (data: any) => self.postMessage({ status: 'downloading', ...data }),
                });
                const result = await transcriber(audioBlob);
                const text = Array.isArray(result) ? result[0].text : (result as any).text;
                self.postMessage({ status: 'complete', text });
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
