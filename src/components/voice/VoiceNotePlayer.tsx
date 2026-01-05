import React, { useRef, useState, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

interface VoiceNotePlayerProps {
    audioBlob?: Blob;
    audioUrl?: string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ audioBlob, audioUrl }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [src, setSrc] = useState<string>('');

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
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
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

    if (!src) return <div className="p-4 text-sm text-gray-500 italic">No audio source available.</div>;

    return (
        <div className="w-full bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border p-4 flex items-center gap-4 select-none">
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
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors shadow-md"
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

            <div className="text-light-text-secondary dark:text-dark-text-secondary">
                <VolumeUpIcon fontSize="small" />
            </div>
        </div>
    );
};
