import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Sparkles } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { AlertModal } from '@/components/ui/AlertModal';
import CircularProgress from '@mui/material/CircularProgress';
import { transcribeAudioWithWhisper } from '@/lib/voice/transcriptionService';

interface VoiceNotePlayerProps {
    audioBlob?: Blob;
    audioUrl?: string;
    noteId?: string;
    existingTranscript?: string;
    onTranscriptSaved?: (transcript: string) => void;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
    audioBlob,
    audioUrl,
    existingTranscript,
    onTranscriptSaved
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [src, setSrc] = useState<string>('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    // Transcription State
    const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'loading' | 'transcribing' | 'complete' | 'error'>('idle');
    const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');

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

    return (
        <div className="w-full flex flex-col bg-light-background/40 dark:bg-dark-background/20 backdrop-blur-sm border border-light-border dark:border-dark-border/20 rounded-2xl overflow-hidden shadow-sm">
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
                    className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shrink-0 hover:opacity-90 transition-opacity"
                    aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
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
                            <Sparkles size={14} className="group-hover:animate-pulse" />
                            {existingTranscript ? 'Re-transcribe' : 'Transcribe'}
                        </button>
                    )}
                    <Volume2 size={20} className="text-light-text-disabled" />
                </div>
            </div>

            {(transcriptionStatus !== 'idle') && (
                <div className="px-6 pb-6 pt-2 border-t border-light-border/30 dark:border-dark-border/10 bg-white/50 dark:bg-black/10">
                    {transcriptionStatus === 'loading' || transcriptionStatus === 'transcribing' ? (
                        <div className="flex items-center gap-3 text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary">
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
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary opacity-50">AI Transcript</h4>
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
