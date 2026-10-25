import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Sparkles, Copy, Check } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { AlertModal } from '@/components/ui/AlertModal';
import CircularProgress from '@mui/material/CircularProgress';
import { transcribeAudioWithWhisper } from '@/lib/voice/transcriptionService';

interface VoiceNotePlayerProps {
    audioBlob?: Blob;
    audioUrl?: string;
    noteId?: string;
    initialDuration?: number;
    existingTranscript?: string;
    onTranscriptSaved?: (transcript: string) => void;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
    audioBlob,
    audioUrl,
    initialDuration,
    existingTranscript,
    onTranscriptSaved
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [src, setSrc] = useState<string>('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Transcription State
    const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'loading' | 'transcribing' | 'complete' | 'error'>('idle');
    const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');

    useEffect(() => {
        if (initialDuration && initialDuration > 0 && (!duration || !Number.isFinite(duration))) {
            setDuration(initialDuration);
        }
    }, [initialDuration]);

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
        };
    }, [audioBlob, audioUrl]);

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
        if (audioRef.current && Number.isFinite(audioRef.current.currentTime)) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current && Number.isFinite(time)) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        if (!Number.isFinite(time) || time < 0) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const settings = useUIStore();

    const handleCopyTranscript = () => {
        const textToCopy = transcriptionText || existingTranscript || '';
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const handleTranscribe = async () => {
        if (!audioBlob) {
            setIsAlertOpen(true);
            return;
        }

        setTranscriptionStatus('loading');
        setProgressMessage('Preparing on-device AI engine...');

        try {
            const text = await transcribeAudioWithWhisper(audioBlob, {
                highAccuracy: settings.highAccuracyTranscription,
                onProgress: (p) => {
                    if (p.status === 'downloading') {
                        setTranscriptionStatus('loading');
                        setProgressMessage(p.message || 'Downloading model weights...');
                    } else if (p.status === 'loading') {
                        setTranscriptionStatus('loading');
                        setProgressMessage(p.message || 'Initializing model...');
                    } else if (p.status === 'transcribing') {
                        setTranscriptionStatus('transcribing');
                        setProgressMessage(p.message || 'Transcribing with AI acceleration...');
                    }
                }
            });

            setTranscriptionStatus('complete');
            setTranscriptionText(text);

            if (onTranscriptSaved && text) {
                onTranscriptSaved(text);
            }
        } catch (err: any) {
            console.error('[VoiceNotePlayer] Transcription error:', err);
            setTranscriptionStatus('error');
            setTranscriptionText(`Transcription failed: ${err.message || 'Unknown error'}`);
        }
    };

    if (!src) return <div className="p-4 text-sm text-gray-500 italic">No audio source available.</div>;

    const effectiveDuration = Number.isFinite(duration) && duration > 0 ? duration : (initialDuration || 0);

    return (
        <div className="w-full flex flex-col bg-light-background/40 dark:bg-dark-background/20 backdrop-blur-sm border border-light-border dark:border-dark-border/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-5 select-none">
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
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shrink-0 hover:opacity-90 transition-opacity"
                    aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>

                <div className="flex-1 min-w-[140px] flex flex-col justify-center gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-black text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider opacity-60">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(effectiveDuration)}</span>
                    </div>
                    <div className="relative group flex items-center h-4">
                        <input
                            type="range"
                            min="0"
                            max={effectiveDuration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary group-hover:h-1.5 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0 shrink-0">
                    {existingTranscript && (
                        <button
                            type="button"
                            onClick={handleCopyTranscript}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary hover:text-primary px-2.5 py-1.5 rounded-full transition-all border border-light-border dark:border-dark-border"
                            title="Copy raw transcript"
                        >
                            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    )}
                    {transcriptionStatus === 'idle' && (
                        <button
                            type="button"
                            onClick={handleTranscribe}
                            className="group flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary hover:text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all border border-primary/20 whitespace-nowrap"
                        >
                            <Sparkles size={13} className="group-hover:animate-pulse shrink-0" />
                            <span>{existingTranscript ? 'Re-transcribe' : 'Transcribe'}</span>
                        </button>
                    )}
                    <Volume2 size={18} className="text-light-text-disabled hidden sm:block shrink-0" />
                </div>
            </div>

            {(transcriptionStatus === 'loading' || transcriptionStatus === 'transcribing' || transcriptionStatus === 'error') && (
                <div className="px-5 pb-4 pt-2 border-t border-light-border/30 dark:border-dark-border/10 bg-white/50 dark:bg-black/10">
                    {transcriptionStatus === 'loading' || transcriptionStatus === 'transcribing' ? (
                        <div className="flex items-center gap-3 text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <CircularProgress size={12} thickness={6} className="text-primary" />
                            </div>
                            <span className="uppercase tracking-widest opacity-70">{progressMessage}</span>
                        </div>
                    ) : (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 text-xs font-bold rounded-xl border border-red-500/20">
                            {transcriptionText}
                        </div>
                    )}
                </div>
            )}

            <AlertModal
                isOpen={isAlertOpen}
                title="Transcription Error"
                message="This note doesn't have local audio data securely stored for transcription."
                type="error"
                onClose={() => setIsAlertOpen(false)}
            />
        </div>
    );
};
