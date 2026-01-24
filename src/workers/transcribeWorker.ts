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
            this.instance = await pipeline('automatic-speech-recognition', model, {
                device: 'webgpu',
                dtype: 'fp16',
                progress_callback,
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { audioBlob, highAccuracy } = event.data;

    // Switch to Distil-Whisper for significantly faster processing + smaller download
    // Standard: distil-whisper-tiny (Ultra fast, ~20MB)
    // High Accuracy: distil-whisper-small or whisper-base
    const model = highAccuracy ? 'onnx-community/whisper-base.en' : 'onnx-community/distil-whisper-tiny.en';

    try {
        await initTransformers();
        self.postMessage({ status: 'loading', message: `Initializing ${highAccuracy ? 'High Accuracy' : 'Turbo'} AI...` });

        const transcriber = await TranscribeWorker.getInstance(model, (data: any) => {
            self.postMessage({ status: 'downloading', ...data });
        });

        self.postMessage({ status: 'transcribing', message: 'Transcribing with AI acceleration...' });

        // Use fp16 (16-bit) for 2x-3x speedup on WebGPU supporting devices
        const output = await transcriber(audioBlob, {
            chunk_length_s: 30,
            stride_length_s: 5,
            // Optimized inference settings
            language: 'english',
            task: 'transcribe',
            dtype: 'fp16',
        });

        const text = Array.isArray(output) ? output[0].text : (output as any).text;

        self.postMessage({
            status: 'complete',
            text: text,
        });

    } catch (error: any) {
        console.error('Transcription error:', error);

        // Fallback to WASM if WebGPU fails
        if (error.message?.includes('webgpu') || error.message?.includes('dtype')) {
            self.postMessage({ status: 'loading', message: 'Device optimization failed, falling back to standard engine...' });
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
