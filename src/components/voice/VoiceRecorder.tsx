import React, { useState, useRef, useEffect } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob, duration: number) => void;
    onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onCancel }) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
    const [duration, setDuration] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [volumeScale, setVolumeScale] = useState(1.0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // cleanup stream on unmount or change
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const analyzeVolume = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        // Ensure context is running (browsers often suspend until user interaction)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Find the peak amplitude (loudest point in the buffer)
        let max = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = Math.abs(dataArray[i] - 128); // Center is 128 for 8-bit PCM
            if (val > max) max = val;
        }

        // Map peak (0-128) to scale (1.0-1.3)
        // 128 is full volume in 8-bit time domain data.
        // We use a lower ceiling (e.g. 64) for sensitivity so mild speaking causes a visible pulse.
        const sensitivity = 4.0;
        const normalized = Math.min(max * sensitivity / 128, 1);
        const scale = 1.0 + (normalized * 0.4);

        setVolumeScale(scale);

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(analyzeVolume);
    };

    const startRecording = async () => {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(audioStream);

            // Set up Web Audio API for volume analysis
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(audioStream);

            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.3;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

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

            // Start volume analysis
            analyzeVolume();

            // Start Timer
            startTimeRef.current = Date.now();
            pausedTimeRef.current = 0;
            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
            onCancel();
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.pause();
            setStatus('paused');
            setVolumeScale(1.0); // Reset scale when paused

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && status === 'paused') {
            mediaRecorderRef.current.resume();
            setStatus('recording');

            // Resume volume analysis
            analyzeVolume();

            // Resume timer
            const pauseDuration = pausedTimeRef.current;
            startTimeRef.current = Date.now() - pauseDuration;
            pausedTimeRef.current = 0;

            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && (status === 'recording' || status === 'paused')) {
            mediaRecorderRef.current.stop();
            setStatus('review');
            setVolumeScale(1.0); // Reset scale

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

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
        if (status === 'recording' || status === 'paused') stopRecording();

        setTimeout(() => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            onSave(blob, duration);
        }, 100);
    };

    const handleCancel = () => {
        if (status === 'recording' || status === 'paused') stopRecording();
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
                        status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                            status === 'idle' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' :
                                'bg-primary/10 text-primary'}`}
                style={{
                    transform: status === 'recording' ? `scale(${volumeScale})` : 'scale(1)',
                    transition: status === 'recording' ? 'transform 0.05s linear' : 'transform 0.3s ease-out'
                }}
                onClick={status === 'idle' ? startRecording : undefined}
            >
                {status === 'recording' && (
                    <div className="absolute inset-0 rounded-full border-4 border-red-500 opacity-20 animate-ping"></div>
                )}
                {status === 'idle' ? <MicIcon style={{ fontSize: 48 }} /> :
                    status === 'recording' ? <MicIcon style={{ fontSize: 48 }} /> :
                        status === 'paused' ? <PauseIcon style={{ fontSize: 48 }} /> :
                            <CheckIcon style={{ fontSize: 48 }} />
                }
            </div>

            <div className="text-4xl font-mono font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {formatTime(duration)}
            </div>

            <div className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-8 uppercase tracking-wider">
                {status === 'idle' ? 'Ready to Record' :
                    status === 'recording' ? 'Recording...' :
                        status === 'paused' ? 'Paused' : 'Recorded'}
            </div>

            <div className="flex items-center gap-3 w-full">
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
                    <>
                        <button
                            onClick={pauseRecording}
                            className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium transition-colors shadow-lg shadow-yellow-500/30"
                        >
                            <PauseIcon fontSize="small" />
                            Pause
                        </button>
                        <button
                            onClick={stopRecording}
                            className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-lg shadow-red-500/30"
                        >
                            <StopIcon fontSize="small" />
                            Stop
                        </button>
                    </>
                ) : status === 'paused' ? (
                    <>
                        <button
                            onClick={resumeRecording}
                            className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors shadow-lg shadow-green-500/30"
                        >
                            <PlayArrowIcon fontSize="small" />
                            Resume
                        </button>
                        <button
                            onClick={stopRecording}
                            className="flex-1 p-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-lg shadow-red-500/30"
                        >
                            <StopIcon fontSize="small" />
                            Stop
                        </button>
                    </>
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
