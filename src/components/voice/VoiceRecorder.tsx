import React, { useState, useRef, useEffect } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob, duration: number) => void;
    onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onCancel }) => {
    // 'idle', 'recording', 'paused' (unused for now), 'review'
    const [status, setStatus] = useState<'idle' | 'recording' | 'review'>('idle');
    const [duration, setDuration] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [stream]);

    const startRecording = async () => {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(audioStream);

            const mediaRecorder = new MediaRecorder(audioStream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setStatus('recording');

            // Start Timer
            const startTime = Date.now();
            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            setStatus('review');
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleSave = () => {
        // Assume recording is stopped and we are in review, or we force stop
        if (status === 'recording') stopRecording();

        setTimeout(() => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            onSave(blob, duration);
        }, 100);
    };

    const handleCancel = () => {
        if (status === 'recording') stopRecording();
        onCancel();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border shadow-lg max-w-sm mx-auto w-full">
            <div
                className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 
                ${status === 'recording' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                        status === 'idle' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' :
                            'bg-primary/10 text-primary'}`}
                onClick={status === 'idle' ? startRecording : undefined}
            >
                {status === 'recording' && (
                    <div className="absolute inset-0 rounded-full border-4 border-red-500 opacity-20 animate-ping"></div>
                )}
                {status === 'idle' ? <MicIcon style={{ fontSize: 48 }} /> :
                    status === 'recording' ? <MicIcon style={{ fontSize: 48 }} /> :
                        <CheckIcon style={{ fontSize: 48 }} />
                }
            </div>

            <div className="text-4xl font-mono font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {formatTime(duration)}
            </div>

            <div className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-8 uppercase tracking-wider">
                {status === 'idle' ? 'Ready to Record' :
                    status === 'recording' ? 'Recording...' : 'Recorded'}
            </div>

            <div className="flex items-center gap-4 w-full">
                <button
                    onClick={handleCancel}
                    className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                    <DeleteIcon fontSize="small" />
                    Discard
                </button>

                {status === 'idle' ? (
                    <button
                        onClick={startRecording}
                        className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-lg shadow-red-500/30"
                    >
                        <FiberManualRecordIcon fontSize="small" />
                        Start
                    </button>
                ) : status === 'recording' ? (
                    <button
                        onClick={stopRecording}
                        className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-lg shadow-red-500/30"
                    >
                        <StopIcon fontSize="small" />
                        Stop
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors shadow-lg shadow-primary/30"
                    >
                        <CheckIcon fontSize="small" />
                        Save Note
                    </button>
                )}
            </div>
        </div>
    );
};
