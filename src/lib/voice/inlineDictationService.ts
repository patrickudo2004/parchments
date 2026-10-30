import { Editor } from '@tiptap/react';
import { streamingTranscriber, downsampleTo16k } from '@/lib/voice/streamingTranscriptionService';

type DictationStatusListener = (isDictating: boolean, error?: string) => void;

class InlineDictationService {
    private isDictating: boolean = false;
    private listeners: Set<DictationStatusListener> = new Set();
    private activeEditor: Editor | null = null;
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private pcmChunks: Float32Array[] = [];
    private pcmSampleCount: number = 0;
    private isProcessingChunk: boolean = false;

    public isSupported(): boolean {
        return typeof window !== 'undefined' &&
            Boolean(navigator?.mediaDevices?.getUserMedia) &&
            Boolean(window.AudioContext || (window as any).webkitAudioContext);
    }

    public subscribe(listener: DictationStatusListener): () => void {
        this.listeners.add(listener);
        listener(this.isDictating);
        return () => this.listeners.delete(listener);
    }

    private notify(isDictating: boolean, error?: string): void {
        this.isDictating = isDictating;
        this.listeners.forEach(cb => cb(isDictating, error));
    }

    public async start(editor: Editor): Promise<boolean> {
        if (!this.isSupported()) {
            this.notify(false, 'Microphone capture is not supported in this environment.');
            return false;
        }

        if (this.isDictating) {
            this.stop();
            return false;
        }

        // Optimistically activate listening state for instant UI responsiveness
        this.notify(true);

        try {
            // 1. Prewarm on-device Whisper model
            streamingTranscriber.prewarm();

            // 2. Request microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            // 3. Setup Web Audio pipeline
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const source = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

            this.mediaStream = stream;
            this.audioContext = audioContext;
            this.scriptProcessor = scriptProcessor;
            this.activeEditor = editor;
            this.pcmChunks = [];
            this.pcmSampleCount = 0;
            this.isProcessingChunk = false;

            // 2.5 second audio slice cadence for natural phrasing
            const sliceSampleThreshold = Math.round(audioContext.sampleRate * 2.5);

            scriptProcessor.onaudioprocess = (e) => {
                if (!this.isDictating) return;
                const channelData = e.inputBuffer.getChannelData(0);
                this.pcmChunks.push(new Float32Array(channelData));
                this.pcmSampleCount += channelData.length;

                if (this.pcmSampleCount >= sliceSampleThreshold && !this.isProcessingChunk) {
                    this.processCurrentPcmSlice(audioContext.sampleRate);
                }
            };

            source.connect(scriptProcessor);

            // Muted gain node to keep audio processing alive without microphone loopback
            const muteGain = audioContext.createGain();
            muteGain.gain.setValueAtTime(0, audioContext.currentTime);
            scriptProcessor.connect(muteGain);
            muteGain.connect(audioContext.destination);

            this.notify(true);
            return true;
        } catch (err: any) {
            console.error('[InlineDictation] Failed to access microphone:', err);
            const message = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
                ? 'Microphone permission denied.'
                : err?.message || 'Could not access microphone.';
            this.notify(false, message);
            this.cleanup();
            return false;
        }
    }

    private async processCurrentPcmSlice(inputRate: number): Promise<void> {
        if (this.pcmChunks.length === 0 || this.isProcessingChunk) return;
        if (streamingTranscriber.isTranscribing()) return;

        this.isProcessingChunk = true;
        const chunks = this.pcmChunks;
        const totalSamples = this.pcmSampleCount;
        this.pcmChunks = [];
        this.pcmSampleCount = 0;

        const merged = new Float32Array(totalSamples);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }

        // Voice Activity Detection (VAD) energy check to eliminate silence hallucinations
        let sumSquares = 0;
        for (let i = 0; i < merged.length; i++) {
            sumSquares += merged[i] * merged[i];
        }
        const rms = Math.sqrt(sumSquares / merged.length);

        if (rms < 0.008) {
            this.isProcessingChunk = false;
            return;
        }

        try {
            const pcm16k = downsampleTo16k(merged, inputRate);
            const text = await streamingTranscriber.transcribeChunk(pcm16k);
            if (text && text.trim().length > 0 && this.activeEditor && !this.activeEditor.isDestroyed) {
                const cleaned = text.trim();
                this.activeEditor.commands.insertContent(`${cleaned} `);
            }
        } catch (e) {
            console.warn('[InlineDictation] On-device transcription slice error:', e);
        } finally {
            this.isProcessingChunk = false;
        }
    }

    private cleanup(): void {
        this.isDictating = false;
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        this.pcmChunks = [];
        this.pcmSampleCount = 0;
        this.isProcessingChunk = false;
        this.activeEditor = null;
    }

    public async stop(): Promise<void> {
        if (!this.isDictating) return;

        // Flush trailing speech slice if active
        if (this.audioContext && this.pcmSampleCount > 0 && !this.isProcessingChunk) {
            await this.processCurrentPcmSlice(this.audioContext.sampleRate);
        }

        this.cleanup();
        this.notify(false);
    }

    public toggle(editor: Editor): boolean {
        if (this.isDictating) {
            this.stop();
            return false;
        } else {
            this.start(editor);
            return true;
        }
    }

    public getIsDictating(): boolean {
        return this.isDictating;
    }
}

export const inlineDictation = new InlineDictationService();
