/**
 * streamingTranscriptionService.ts
 * Manages a persistent singleton Web Worker running Hugging Face Whisper for live on-device speech transcription.
 */

class StreamingTranscriptionManager {
    private worker: Worker | null = null;
    private isBusy = false;
    private isPrewarmed = false;
    private activeResolve: ((text: string) => void) | null = null;
    private activeReject: ((err: any) => void) | null = null;
    private activeJobId: number | null = null;
    private jobTimeout: ReturnType<typeof setTimeout> | null = null;

    private getWorker(): Worker {
        if (!this.worker) {
            this.worker = new Worker(
                new URL('../../workers/transcribeWorker.ts', import.meta.url),
                { type: 'module' }
            );

            this.worker.onmessage = (event: MessageEvent) => {
                const data = event.data;
                if (!data) return;

                if (data.type === 'ready') {
                    this.isPrewarmed = true;
                    return;
                }

                if (data.type === 'chunk_result' && data.id === this.activeJobId) {
                    if (this.jobTimeout) clearTimeout(this.jobTimeout);
                    const resolve = this.activeResolve;
                    this.isBusy = false;
                    this.activeResolve = null;
                    this.activeReject = null;
                    this.activeJobId = null;
                    resolve?.(data.text || '');
                    return;
                }

                if (data.type === 'error' && data.id === this.activeJobId) {
                    if (this.jobTimeout) clearTimeout(this.jobTimeout);
                    const reject = this.activeReject;
                    this.isBusy = false;
                    this.activeResolve = null;
                    this.activeReject = null;
                    this.activeJobId = null;
                    reject?.(new Error(data.error || 'Transcription failed'));
                    return;
                }
            };

            this.worker.onerror = (err) => {
                console.warn('[StreamingTranscriber] Worker error:', err);
                if (this.activeReject) {
                    this.activeReject(err);
                }
                this.isBusy = false;
                this.activeResolve = null;
                this.activeReject = null;
                this.activeJobId = null;
            };
        }
        return this.worker;
    }

    public prewarm(highAccuracy = false) {
        if (this.isPrewarmed) return;
        try {
            const worker = this.getWorker();
            worker.postMessage({ type: 'prewarm', highAccuracy });
        } catch (e) {
            console.warn('[StreamingTranscriber] Prewarm error:', e);
        }
    }

    public isTranscribing(): boolean {
        return this.isBusy;
    }

    /**
     * Transcribes a 16kHz mono Float32Array slice.
     */
    public transcribeChunk(audio16k: Float32Array, highAccuracy = false): Promise<string> {
        if (this.isBusy) {
            // Drop stale intermediate slice if still busy with previous chunk
            return Promise.resolve('');
        }

        this.isBusy = true;
        const jobId = Date.now() + Math.floor(Math.random() * 1000);
        this.activeJobId = jobId;

        return new Promise<string>((resolve, reject) => {
            this.activeResolve = resolve;
            this.activeReject = reject;

            // Timeout after 15 seconds to prevent hung state
            this.jobTimeout = setTimeout(() => {
                if (this.activeJobId === jobId) {
                    console.warn('[StreamingTranscriber] Chunk transcription timed out');
                    this.isBusy = false;
                    this.activeResolve = null;
                    this.activeReject = null;
                    this.activeJobId = null;
                    resolve('');
                }
            }, 15000);

            try {
                const worker = this.getWorker();
                // Transfer the buffer for zero-copy high performance
                worker.postMessage(
                    {
                        type: 'transcribe_chunk',
                        id: jobId,
                        audioData: audio16k,
                        highAccuracy
                    },
                    [audio16k.buffer]
                );
            } catch {
                this.isBusy = false;
                if (this.jobTimeout) clearTimeout(this.jobTimeout);
                this.activeResolve = null;
                this.activeReject = null;
                this.activeJobId = null;
                resolve('');
            }
        });
    }

    public dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isBusy = false;
            this.isPrewarmed = false;
        }
    }
}

export const streamingTranscriber = new StreamingTranscriptionManager();

/**
 * High-performance linear resampler from audioContext sampleRate (e.g. 44.1k/48k) to 16kHz
 */
export function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
    if (inputSampleRate === 16000) return new Float32Array(input);
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const index = i * ratio;
        const low = Math.floor(index);
        const high = Math.min(low + 1, input.length - 1);
        const weight = index - low;
        result[i] = input[low] * (1 - weight) + input[high] * weight;
    }
    return result;
}
