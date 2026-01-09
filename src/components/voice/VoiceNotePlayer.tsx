import React, { useRef, useState, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useUIStore } from '@/stores/uiStore';

interface VoiceNotePlayerProps {
    audioBlob?: Blob;
    audioUrl?: string;
}

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CircularProgress from '@mui/material/CircularProgress';

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ audioBlob, audioUrl }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [src, setSrc] = useState<string>('');

    // Transcription State
    const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'loading' | 'transcribing' | 'complete' | 'error'>('idle');
    const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        let url = '';
        if (audioBlob) {
            url = URL.createObjectURL(audioBlob);
            setSrc(url);
        } else if (audioUrl) {
            setSrc(audioUrl);
        }

        return () => {
            if (url) URL.revokeObjectURL(url);
            if (workerRef.current) workerRef.current.terminate();
        };
    }, [audioBlob, audioUrl]);

    // ... Playback handlers ...
    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const settings = useUIStore();

    const handleTranscribe = async () => {
        if (!audioBlob) {
            alert("This note doesn't have local audio data securely stored for transcription.");
            return;
        }

        setTranscriptionStatus('loading');
        setProgressMessage('Preparing audio...');

        // Verify worker support
        if (!window.Worker) {
            setTranscriptionStatus('error');
            setTranscriptionText('Web Workers not supported in this browser.');
            return;
        }

        try {
            // 1. Pre-decode audio to 16kHz Float32Array (Transformers.js requirement)
            console.info('[Transcription] Starting audio processing...');
            setProgressMessage('Accessing audio data...');
            const arrayBuffer = await audioBlob.arrayBuffer();
            console.info('[Transcription] ArrayBuffer loaded, size:', arrayBuffer.byteLength);

            setProgressMessage('Decoding audio...');
            console.info('[Transcription] Initializing AudioContext for decoding...');

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Note: decodeAudioData can hang if the context is suspended in some edge cases.
            // We'll use a promise with a timeout just in case.
            const decodePromise = audioCtx.decodeAudioData(arrayBuffer);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Audio decoding timed out. The audio format might be unsupported.')), 30000)
            );

            console.info('[Transcription] Decoding started...');
            const originalBuffer = await (Promise.race([decodePromise, timeoutPromise]) as Promise<AudioBuffer>);
            console.info('[Transcription] Decoding complete. Duration:', originalBuffer.duration, 'SampleRate:', originalBuffer.sampleRate);

            setProgressMessage('Resampling to 16kHz...');
            const offlineCtx = new OfflineAudioContext(
                1, // Mono is enough for transcription
                Math.ceil(originalBuffer.duration * 16000),
                16000
            );

            const source = offlineCtx.createBufferSource();
            source.buffer = originalBuffer;
            source.connect(offlineCtx.destination);
            source.start();

            console.info('[Transcription] Resampling started...');
            const renderedBuffer = await offlineCtx.startRendering();
            console.info('[Transcription] Resampling complete.');
            setProgressMessage('AI is starting up...');

            const audioData = renderedBuffer.getChannelData(0);
            audioCtx.close();

            // Check if audio is empty
            if (audioData.length === 0 || audioData.every(v => v === 0)) {
                console.warn('[Transcription] Audio data seems silent or empty.');
            }

            console.info('[Transcription] Creating worker...');
            const worker = new Worker(
                new URL('../../workers/transcribeWorker.ts', import.meta.url),
                { type: 'module' }
            );
            workerRef.current = worker;

            worker.onerror = (err) => {
                console.error('[Transcription] Worker error:', err);
                setTranscriptionStatus('error');
                setTranscriptionText(`Worker Error: ${err.message || 'Failed to load transcription engine'}`);
            };

            worker.onmessage = (event) => {
                const { status, message, text, file, progress } = event.data;
                console.info('[Transcription] Worker message:', status, message || '');

                if (status === 'downloading') {
                    setTranscriptionStatus('loading');
                    if (progress) {
                        setProgressMessage(`Downloading AI Model (${file}): ${Math.round(progress)}%`);
                    } else {
                        setProgressMessage(`Downloading AI Model...`);
                    }
                } else if (status === 'loading') {
                    setProgressMessage(message);
                } else if (status === 'transcribing') {
                    setTranscriptionStatus('transcribing');
                    setProgressMessage(message);
                } else if (status === 'complete') {
                    console.info('[Transcription] Complete!');
                    setTranscriptionStatus('complete');
                    setTranscriptionText(text);
                    worker.terminate();
                    workerRef.current = null;
                } else if (status === 'error') {
                    console.error('[Transcription] AI error:', event.data.error);
                    setTranscriptionStatus('error');
                    setTranscriptionText(`AI Error: ${event.data.error}`);
                    worker.terminate();
                }
            };

            console.info('[Transcription] Sending data to worker...');
            // Pass the decoded Float32Array and accuracy setting
            worker.postMessage({
                audioBlob: audioData,
                highAccuracy: settings.highAccuracyTranscription
            });

        } catch (err: any) {
            console.error(err);
            setTranscriptionStatus('error');
            setTranscriptionText(`Failed to process audio: ${err.message}`);
        }
    };

    if (!src) return <div className="p-4 text-sm text-gray-500 italic">No audio source available.</div>;

    return (
        <div className="w-full flex flex-col bg-light-background/40 dark:bg-dark-background/20 backdrop-blur-sm border border-light-border dark:border-dark-border/20 rounded-2xl overflow-hidden transition-all duration-300">
            <div className="p-6 flex items-center gap-6 select-none">
                <audio
                    ref={audioRef}
                    src={src}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    className="hidden"
                />

                <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-primary hover:scale-105 active:scale-95 text-white flex items-center justify-center transition-all shadow-lg shadow-primary/20 shrink-0"
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon className="ml-1" />}
                </button>

                <div className="flex-1 flex flex-col justify-center gap-2">
                    <div className="flex justify-between text-[10px] font-black text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-tighter opacity-50">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div className="relative group flex items-center h-4">
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary group-hover:h-1.5 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {transcriptionStatus === 'idle' && (
                        <button
                            type="button"
                            onClick={handleTranscribe}
                            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary hover:text-white px-4 py-2 rounded-full transition-all border border-primary/20"
                        >
                            <AutoAwesomeIcon fontSize="inherit" className="group-hover:animate-pulse" />
                            Transcribe
                        </button>
                    )}
                    <VolumeUpIcon fontSize="small" className="text-light-text-disabled" />
                </div>
            </div>

            {/* Transcription Status / Result */}
            {(transcriptionStatus !== 'idle') && (
                <div className="px-6 pb-6 pt-2 border-t border-light-border/30 dark:border-dark-border/10 bg-white/50 dark:bg-black/10">
                    {transcriptionStatus === 'loading' || transcriptionStatus === 'transcribing' ? (
                        <div className="flex items-center gap-3 text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <CircularProgress size={12} thickness={6} className="text-primary" />
                            </div>
                            <span className="uppercase tracking-widest opacity-70">{progressMessage}</span>
                        </div>
                    ) : transcriptionStatus === 'error' ? (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 text-xs font-bold rounded-xl border border-red-500/20">
                            {transcriptionText}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary opacity-50">Transcript</h4>
                                <button
                                    onClick={() => navigator.clipboard.writeText(transcriptionText || '')}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                                >
                                    Copy Text
                                </button>
                            </div>
                            <p className="text-sm leading-relaxed text-light-text-main dark:text-dark-text-main font-medium italic opacity-80 border-l-2 border-primary/30 pl-4 py-1">
                                "{transcriptionText}"
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
