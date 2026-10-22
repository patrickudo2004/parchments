import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Trash2, Pause, Play, CheckCircle, X as CloseIcon, Sparkles } from 'lucide-react';
import { AlertModal } from '@/components/ui/AlertModal';
import { getSupportedAudioMimeType, type AudioMimeInfo } from '@/lib/voice/audioMime';

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob, duration: number, transcript: string) => void;
    onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onCancel }) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [volumeScale, setVolumeScale] = useState(1.0);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef<string>('');
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isRecordingRef = useRef<boolean>(false);
    const selectedMimeRef = useRef<AudioMimeInfo>({ mimeType: 'audio/webm', extension: 'webm' });

    // Check if browser has native Web Speech API
    const hasLiveSpeechApi = typeof window !== 'undefined' &&
        Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    // cleanup stream on unmount or change
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // cleanup timer and resources on unmount
    useEffect(() => {
        return () => {
            isRecordingRef.current = false;
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {}
            }
        };
    }, []);

    const analyzeVolume = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {});
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let max = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = Math.abs(dataArray[i] - 128);
            if (val > max) max = val;
        }

        const sensitivity = 4.0;
        const normalized = Math.min((max * sensitivity) / 128, 1);
        const scale = 1.0 + normalized * 0.4;

        setVolumeScale(scale);
        animationFrameRef.current = requestAnimationFrame(analyzeVolume);
    };

    const startRecording = async () => {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            setStream(audioStream);

            // Web Audio setup for volume reactivity
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(audioStream);

            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.3;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Negotiate best supported container
            const mimeInfo = getSupportedAudioMimeType();
            selectedMimeRef.current = mimeInfo;

            let mediaRecorder: MediaRecorder;
            if (mimeInfo.mimeType) {
                try {
                    mediaRecorder = new MediaRecorder(audioStream, { mimeType: mimeInfo.mimeType });
                } catch {
                    mediaRecorder = new MediaRecorder(audioStream);
                }
            } else {
                mediaRecorder = new MediaRecorder(audioStream);
            }

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(250); // 250ms chunks for responsive streaming
            isRecordingRef.current = true;
            setStatus('recording');

            // Initialize Speech Recognition with Auto-Restart Supervisor
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'en-US';

                    recognition.onresult = (event: any) => {
                        let interim = '';
                        let newFinal = '';

                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                newFinal += event.results[i][0].transcript;
                            } else {
                                interim += event.results[i][0].transcript;
                            }
                        }

                        if (newFinal) {
                            const trimmed = newFinal.trim();
                            transcriptRef.current = transcriptRef.current
                                ? `${transcriptRef.current.trim()} ${trimmed}`
                                : trimmed;
                            setTranscript(transcriptRef.current);
                        }
                        setInterimTranscript(interim);
                    };

                    // Auto-restart loop to conquer the browser VAD silence timeout death-spiral
                    recognition.onend = () => {
                        if (isRecordingRef.current) {
                            try {
                                recognition.start();
                            } catch {
                                setTimeout(() => {
                                    if (isRecordingRef.current) {
                                        try {
                                            recognition.start();
                                        } catch {}
                                    }
                                }, 300);
                            }
                        }
                    };

                    recognition.onerror = (event: any) => {
                        // Suppress expected pause errors, let onend handle reconnection
                        if (event.error !== 'no-speech' && event.error !== 'network') {
                            console.warn('[VoiceRecorder] Speech recognition notice:', event.error);
                        }
                    };

                    recognition.start();
                    recognitionRef.current = recognition;
                } catch (recErr) {
                    console.warn('[VoiceRecorder] Could not start live speech recognition:', recErr);
                }
            }

            analyzeVolume();

            // Start timer
            startTimeRef.current = Date.now();
            pausedTimeRef.current = 0;
            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
            }, 1000);

        } catch (err) {
            console.error('[VoiceRecorder] Error accessing microphone:', err);
            setAlertMessage('Could not access microphone. Please allow microphone permissions in your browser or system settings.');
            setIsAlertOpen(true);
            onCancel();
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            isRecordingRef.current = false;
            mediaRecorderRef.current.pause();
            setStatus('paused');
            setVolumeScale(1.0);

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {}
            }
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && status === 'paused') {
            isRecordingRef.current = true;
            mediaRecorderRef.current.resume();
            setStatus('recording');

            analyzeVolume();

            const pauseDuration = pausedTimeRef.current;
            startTimeRef.current = Date.now() - pauseDuration;
            pausedTimeRef.current = 0;

            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch {}
            }
        }
    };

    const stopRecording = () => {
        isRecordingRef.current = false;
        if (mediaRecorderRef.current && (status === 'recording' || status === 'paused')) {
            try {
                mediaRecorderRef.current.stop();
            } catch {}
            setStatus('review');
            setVolumeScale(1.0);

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
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

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {}
            }
        }
    };

    const handleSave = () => {
        if (status === 'recording' || status === 'paused') {
            stopRecording();
        }

        setTimeout(() => {
            const mimeType = selectedMimeRef.current?.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: mimeType });
            onSave(blob, duration, transcriptRef.current);

            // Full reset
            setStatus('idle');
            setDuration(0);
            setTranscript('');
            setInterimTranscript('');
            transcriptRef.current = '';
            chunksRef.current = [];
        }, 150);
    };

    const handleCancel = () => {
        isRecordingRef.current = false;
        if (status === 'recording' || status === 'paused') {
            stopRecording();
        }

        setStatus('idle');
        setDuration(0);
        setTranscript('');
        setInterimTranscript('');
        transcriptRef.current = '';
        chunksRef.current = [];

        onCancel();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex flex-col items-center justify-center p-8 bg-light-surface dark:bg-dark-surface rounded-3xl border border-light-border dark:border-dark-border shadow-2xl w-full max-w-md mx-auto animate-in zoom-in duration-300">
            {/* Global Exit Button */}
            <button
                onClick={handleCancel}
                className="absolute top-4 right-4 p-2 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full transition-colors opacity-40 hover:opacity-100"
                title="Exit Recorder"
            >
                <CloseIcon size={20} />
            </button>

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
                    <div className="absolute inset-0 rounded-full border-4 border-primary opacity-20 animate-ping"></div>
                )}
                {status === 'idle' ? <Mic size={48} /> :
                    status === 'recording' ? <Mic size={48} /> :
                        status === 'paused' ? <Pause size={48} /> :
                            <CheckCircle size={48} />}
            </div>

            <div className="text-4xl font-mono font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {formatTime(duration)}
            </div>

            <div className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary mb-4 uppercase tracking-[0.2em] opacity-60">
                {status === 'idle' ? 'Ready' :
                    status === 'recording' ? 'Recording' :
                        status === 'paused' ? 'Paused' : 'Recording Complete'}
            </div>

            {/* Live Transcript View (When SpeechRecognition works) */}
            {(transcript || interimTranscript) ? (
                <div className="w-full bg-light-background dark:bg-dark-background/50 rounded-xl p-4 mb-6 border border-light-border dark:border-dark-border max-h-40 overflow-y-auto custom-scrollbar shadow-inner relative group">
                    <div className="flex items-center gap-1.5 mb-2 opacity-60">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Live Transcription</span>
                    </div>
                    <p className="text-sm leading-relaxed text-light-text-primary dark:text-dark-text-primary font-medium">
                        {transcript}
                        <span className="text-primary opacity-70 italic ml-1">{interimTranscript}</span>
                    </p>
                </div>
            ) : status === 'recording' && !hasLiveSpeechApi ? (
                <div className="w-full flex items-center gap-2.5 p-3 mb-6 bg-primary/5 rounded-xl border border-primary/20 text-light-text-secondary dark:text-dark-text-secondary">
                    <Sparkles size={16} className="text-primary shrink-0 animate-pulse" />
                    <p className="text-[11px] leading-relaxed">
                        <strong className="text-primary font-semibold">On-Device AI Engine:</strong> Your speech will be automatically transcribed by local Whisper when you click Save.
                    </p>
                </div>
            ) : null}

            <div className="flex flex-col gap-2 w-full">
                {status === 'idle' ? (
                    <Button
                        onClick={startRecording}
                        variant="primary"
                        className="w-full justify-center !py-3"
                        icon={<Mic size={16} className="mr-2" />}
                    >
                        Start Recording
                    </Button>
                ) : status === 'recording' ? (
                    <div className="flex gap-2 w-full">
                        <Button
                            onClick={pauseRecording}
                            variant="secondary"
                            className="flex-1 justify-center"
                            icon={<Pause size={16} className="mr-2" />}
                        >
                            Pause
                        </Button>
                        <Button
                            onClick={stopRecording}
                            variant="primary"
                            className="flex-1 justify-center !bg-red-500 hover:!bg-red-600 border-none"
                            icon={<Square size={16} className="mr-2" />}
                        >
                            Finish
                        </Button>
                    </div>
                ) : status === 'paused' ? (
                    <div className="flex gap-2 w-full">
                        <Button
                            onClick={resumeRecording}
                            variant="primary"
                            className="flex-1 justify-center"
                            icon={<Play size={16} className="mr-2" />}
                        >
                            Resume
                        </Button>
                        <Button
                            onClick={stopRecording}
                            variant="secondary"
                            className="flex-1 justify-center"
                            icon={<Square size={16} className="mr-2" />}
                        >
                            Finish
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <Button
                            onClick={handleSave}
                            variant="primary"
                            className="w-full justify-center !py-3"
                            icon={<CheckCircle size={16} className="mr-2" />}
                        >
                            Save Note
                        </Button>
                        <Button
                            onClick={handleCancel}
                            variant="ghost"
                            className="w-full justify-center"
                            icon={<Trash2 size={16} className="mr-2" />}
                        >
                            Discard
                        </Button>
                    </div>
                )}
            </div>

            <AlertModal
                isOpen={isAlertOpen}
                title="Microphone Error"
                message={alertMessage}
                type="error"
                onClose={() => setIsAlertOpen(false)}
            />
        </div>
    );
};
