import React, { useRef, useState, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

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

    const handleTranscribe = () => {
        if (!audioBlob) {
            alert("This note doesn't have local audio data securely stored for transcription.");
            return;
        }

        setTranscriptionStatus('loading');
        setProgressMessage('Initializing AI...');

        // Verify worker support
        if (!window.Worker) {
            setTranscriptionStatus('error');
            setTranscriptionText('Web Workers not supported in this browser.');
            return;
        }

        try {
            const worker = new Worker(new URL('../../workers/transcribeWorker.ts', import.meta.url), { type: 'module' });
            workerRef.current = worker;

            worker.onmessage = (event) => {
                const { status, message, text, file, progress } = event.data;

                if (status === 'downloading') {
                    setTranscriptionStatus('loading');
                    if (progress) {
                        setProgressMessage(`Downloading Model (${file}): ${Math.round(progress)}%`);
                    } else {
                        setProgressMessage(`Downloading Model...`);
                    }
                } else if (status === 'loading') {
                    setProgressMessage(message);
                } else if (status === 'transcribing') {
                    setTranscriptionStatus('transcribing');
                    setProgressMessage(message);
                } else if (status === 'complete') {
                    setTranscriptionStatus('complete');
                    setTranscriptionText(text);
                    worker.terminate();
                    workerRef.current = null;
                } else if (status === 'error') {
                    setTranscriptionStatus('error');
                    setTranscriptionText(`Error: ${event.data.error}`);
                    worker.terminate();
                }
            };

            worker.postMessage({ audioBlob });

        } catch (err: any) {
            console.error(err);
            setTranscriptionStatus('error');
            setTranscriptionText(`Failed to start worker: ${err.message}`);
        }
    };

    if (!src) return <div className="p-4 text-sm text-gray-500 italic">No audio source available.</div>;

    return (
        <div className="w-full flex flex-col bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border rounded-lg overflow-hidden">
            <div className="p-4 flex items-center gap-4 select-none border-b border-light-border dark:border-dark-border/10">
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
                    className="w-10 h-10 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors shadow-md shrink-0"
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </button>

                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                <div className="text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-4">
                    {transcriptionStatus === 'idle' && (
                        <button
                            type="button"
                            onClick={handleTranscribe}
                            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-3 py-1.5 rounded transition-colors"
                            title="Transcribe Audio (Offline)"
                        >
                            <AutoAwesomeIcon fontSize="small" />
                            Transcribe
                        </button>
                    )}
                    <VolumeUpIcon fontSize="small" />
                </div>
            </div>

            {/* Transcription Status / Result */}
            {(transcriptionStatus !== 'idle') && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 text-sm">
                    {transcriptionStatus === 'loading' || transcriptionStatus === 'transcribing' ? (
                        <div className="flex items-center gap-3 text-light-text-secondary dark:text-dark-text-secondary">
                            <CircularProgress size={16} />
                            <span>{progressMessage}</span>
                        </div>
                    ) : transcriptionStatus === 'error' ? (
                        <div className="text-red-500 font-medium">
                            {transcriptionText}
                        </div>
                    ) : (
                        <div className="prose dark:prose-invert max-w-none">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary mb-2">Transcript</h4>
                            <p className="whitespace-pre-wrap">{transcriptionText}</p>
                            <button
                                onClick={() => navigator.clipboard.writeText(transcriptionText || '')}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                Copy to Clipboard
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
