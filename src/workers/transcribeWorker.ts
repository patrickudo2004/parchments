console.info('[Worker] Transcription worker script loaded.');
import { pipeline, env } from '@huggingface/transformers';

// Skip local checks for now to avoid FS errors in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class TranscribeWorker {
    static instance: any = null;
    static model: string | null = null;

    static async getInstance(model: string, progress_callback: (progress: any) => void) {
        // If instance exists but model changed, we need to create a new one
        if (this.instance && this.model !== model) {
            this.instance = null;
        }

        if (!this.instance) {
            this.model = model;
            this.instance = await pipeline('automatic-speech-recognition', model, {
                device: 'webgpu', // Use WebGPU for 10-20x speedup
                progress_callback,
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { audioBlob, highAccuracy } = event.data;
    const model = highAccuracy ? 'onnx-community/whisper-base.en' : 'onnx-community/whisper-tiny.en';

    try {
        self.postMessage({ status: 'loading', message: `Loading ${highAccuracy ? 'High Accuracy' : 'Standard'} model...` });

        const transcriber = await TranscribeWorker.getInstance(model, (data: any) => {
            self.postMessage({ status: 'downloading', ...data });
        });

        self.postMessage({ status: 'transcribing', message: 'Transcribing audio...' });

        // Note: For best results, audioBlob should be a Float32Array already.
        // If it's a blob, transformers v3 can handle it or we might need to decode 
        // on main thread for efficiency. For now, letting the worker handle the input.
        const output = await transcriber(audioBlob, {
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        const text = Array.isArray(output) ? output[0].text : (output as any).text;

        self.postMessage({
            status: 'complete',
            text: text,
        });

    } catch (error: any) {
        console.error('Transcription error:', error);

        // Fallback to WASM if WebGPU fails
        if (error.message?.includes('webgpu')) {
            self.postMessage({ status: 'loading', message: 'WebGPU failed, falling back to CPU...' });
            try {
                const transcriber = await pipeline('automatic-speech-recognition', model, {
                    device: 'wasm',
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
