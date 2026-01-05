import { pipeline, env } from '@xenova/transformers';

// Skip local checks for now to avoid FS errors in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class TranscribeWorker {
    static instance: any = null;

    static async getInstance(progress_callback: Function) {
        if (!this.instance) {
            this.instance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                progress_callback,
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { audioBlob } = event.data;

    try {
        // Convert Blob to AudioBuffers is tricky in Worker directly without helpers
        // But transformers.js pipeline mostly accepts URLs or float arrays.
        // Let's assume we receive a BlobUrl or we convert Blob to Float32Array on main thread?
        // Actually transformers.js `pipeline` can handle blob URLs if we are lucky, or we need to decode.

        // Simpler approach: Send the blob, convert to URL here?
        // Worker can't handle URL.createObjectURL reliably if it wasn't created here.
        // Let's try passing the Float32Array audio data from main thread to be safe,
        // OR let the pipeline handle the URL.

        // Let's report status
        self.postMessage({ status: 'loading', message: 'Loading model...' });

        const transcriber = await TranscribeWorker.getInstance((data: any) => {
            self.postMessage({ status: 'downloading', ...data });
        });

        self.postMessage({ status: 'transcribing', message: 'Transcribing audio...' });

        // Transformers.js expects float32 array or url.
        // Reading blob as array buffer -> decodeAudioData (only available in main thread or AudioContext in worker?)
        // Web Audio API is available in some workers but let's see.

        // Ideally the main thread decodes the audio and sends the channel data.
        // But for "Xenova/whisper-tiny", it can take a url.

        const output = await transcriber(audioBlob, {
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        self.postMessage({
            status: 'complete',
            text: output.text,
        });

    } catch (error: any) {
        self.postMessage({
            status: 'error',
            error: error.message,
        });
    }
});
