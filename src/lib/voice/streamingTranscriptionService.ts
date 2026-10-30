/**
 * streamingTranscriptionService.ts
 * Manages a persistent singleton Web Worker running Hugging Face Whisper for live on-device speech transcription.
 */

import { isTauri } from '@/lib/bridge/runtimeBridge';

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
                if (this.jobTimeout) clearTimeout(this.jobTimeout);
                const reject = this.activeReject;
                this.activeResolve = null;
                this.activeReject = null;
                this.activeJobId = null;
                // Tear down the crashed worker so the next chunk spawns a fresh instance
                this.dispose();
                reject?.(err);
            };
        }
        return this.worker;
    }

    public prewarm(highAccuracy = false) {
        if (this.isPrewarmed) return;
        try {
            const worker = this.getWorker();
            worker.postMessage({ type: 'prewarm', highAccuracy, localRuntime: isTauri });
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
    public async transcribeChunk(audio16k: Float32Array, highAccuracy = false): Promise<string> {
        if (this.isBusy) {
            // Drop stale intermediate slice if still busy with previous chunk
            return Promise.resolve('');
        }

        // Desktop and web both run Whisper in the dedicated worker. On desktop the worker loads the
        // ONNX Runtime from the app bundle (localRuntime) so transcription works offline and under CSP.
        this.isBusy = true;
        const jobId = Date.now() + Math.floor(Math.random() * 1000);
        this.activeJobId = jobId;

        return new Promise<string>((resolve, reject) => {
            this.activeResolve = resolve;
            this.activeReject = reject;

            // Timeout after 45 seconds to prevent hung state on cold CPU WASM graph compilation
            this.jobTimeout = setTimeout(() => {
                if (this.activeJobId === jobId) {
                    console.warn('[StreamingTranscriber] Chunk transcription timed out');
                    this.isBusy = false;
                    this.activeResolve = null;
                    this.activeReject = null;
                    this.activeJobId = null;
                    resolve('');
                }
            }, 45000);

            try {
                const worker = this.getWorker();
                // Transfer the buffer for zero-copy high performance
                worker.postMessage(
                    {
                        type: 'transcribe_chunk',
                        id: jobId,
                        audioData: audio16k,
                        highAccuracy,
                        localRuntime: isTauri
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
 * Anti-aliased resampler from audioContext sampleRate (e.g. 44.1k/48k) to 16kHz.
 * Averages every source sample falling within each output window (box filter) so
 * high-frequency energy doesn't fold back into the speech band and confuse Whisper.
 */
export function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
    if (inputSampleRate === 16000) return new Float32Array(input);
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);

    if (ratio < 1) {
        // Upsampling (rare): linear interpolation
        for (let i = 0; i < newLength; i++) {
            const index = i * ratio;
            const low = Math.floor(index);
            const high = Math.min(low + 1, input.length - 1);
            const weight = index - low;
            result[i] = input[low] * (1 - weight) + input[high] * weight;
        }
        return result;
    }

    for (let i = 0; i < newLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(input.length, Math.floor((i + 1) * ratio));
        let sum = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
            sum += input[j];
            count++;
        }
        result[i] = count > 0 ? sum / count : input[Math.min(start, input.length - 1)];
    }
    return result;
}
