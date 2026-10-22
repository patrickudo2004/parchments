export interface TranscriptionProgress {
    status: 'loading' | 'downloading' | 'transcribing' | 'complete' | 'error';
    message?: string;
    progress?: number;
    file?: string;
}

export interface TranscribeOptions {
    highAccuracy?: boolean;
    onProgress?: (progress: TranscriptionProgress) => void;
}

/**
 * Converts any audio Blob into a 16kHz mono Float32Array expected by HuggingFace Whisper,
 * then dispatches it to the background Web Worker with WebGPU / WASM execution.
 */
export async function transcribeAudioWithWhisper(
    audioBlob: Blob,
    options: TranscribeOptions = {}
): Promise<string> {
    if (typeof window === 'undefined') {
        throw new Error('Transcription can only run in a browser or webview environment.');
    }

    if (!window.Worker) {
        throw new Error('Web Workers are not supported in this browser environment.');
    }

    const { highAccuracy = false, onProgress } = options;

    onProgress?.({ status: 'loading', message: 'Decoding audio stream...' });

    // 1. Decode raw audio bytes
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
        throw new Error('AudioContext is not available in this browser environment.');
    }

    const audioCtx = new AudioContextClass();
    let originalBuffer: AudioBuffer;
    try {
        const decodePromise = audioCtx.decodeAudioData(arrayBuffer);
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Audio decoding timed out after 30 seconds.')), 30000)
        );
        originalBuffer = await Promise.race([decodePromise, timeoutPromise]);
    } finally {
        await audioCtx.close().catch(() => {});
    }

    // 2. Resample to 16,000 Hz single-channel (Whisper standard)
    onProgress?.({ status: 'loading', message: 'Resampling audio to 16kHz...' });
    const offlineCtx = new OfflineAudioContext(
        1,
        Math.max(1, Math.ceil(originalBuffer.duration * 16000)),
        16000
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = originalBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();
    const audioData = renderedBuffer.getChannelData(0);

    // 3. Dispatch to transcribeWorker
    return new Promise<string>((resolve, reject) => {
        let worker: Worker | null = null;
        try {
            worker = new Worker(
                new URL('../../workers/transcribeWorker.ts', import.meta.url),
                { type: 'module' }
            );
        } catch (e) {
            reject(new Error(`Failed to instantiate transcription worker: ${(e as any)?.message || e}`));
            return;
        }

        const cleanup = () => {
            if (worker) {
                worker.terminate();
                worker = null;
            }
        };

        worker.onerror = (err) => {
            cleanup();
            reject(new Error(`Worker error: ${err.message || 'Unknown transcription error'}`));
        };

        worker.onmessage = (event: MessageEvent) => {
            const { status, message, text, file, progress, error } = event.data;

            if (status === 'downloading') {
                const formattedMsg = progress
                    ? `Downloading AI Model (${file || 'weights'}): ${Math.round(progress)}%`
                    : 'Downloading AI Model...';
                onProgress?.({ status: 'downloading', message: formattedMsg, progress, file });
            } else if (status === 'loading') {
                onProgress?.({ status: 'loading', message });
            } else if (status === 'transcribing') {
                onProgress?.({ status: 'transcribing', message });
            } else if (status === 'complete') {
                cleanup();
                onProgress?.({ status: 'complete', message: 'Transcription complete' });
                resolve(text || '');
            } else if (status === 'error') {
                cleanup();
                onProgress?.({ status: 'error', message: error });
                reject(new Error(error || 'Transcription failed'));
            }
        };

        worker.postMessage({
            audioBlob: audioData,
            highAccuracy
        });
    });
}
