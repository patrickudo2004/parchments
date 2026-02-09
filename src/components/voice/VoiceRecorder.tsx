import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Trash2, Pause, Play, CheckCircle, X as CloseIcon } from 'lucide-react';
import { AlertModal } from '@/components/ui/AlertModal';

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

            // Initialize Speech Recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
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
                        transcriptRef.current += newFinal + ' ';
                        setTranscript(transcriptRef.current);
                    }
                    setInterimTranscript(interim);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                };

                recognition.start();
                recognitionRef.current = recognition;
            }

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
            setAlertMessage("Could not access microphone. Please allow permissions.");
            setIsAlertOpen(true);
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

            pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;

            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
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

            if (recognitionRef.current) {
                recognitionRef.current.start();
            }
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

            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }
    };

    const handleSave = () => {
        // Assume recording is stopped and we are in review, or we force stop
        if (status === 'recording' || status === 'paused') stopRecording();

        setTimeout(() => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            onSave(blob, duration, transcriptRef.current);

            // Full Reset
            setStatus('idle');
            setDuration(0);
            setTranscript('');
            setInterimTranscript('');
            transcriptRef.current = '';
            chunksRef.current = [];
        }, 100);
    };

    const handleCancel = () => {
        if (status === 'recording' || status === 'paused') stopRecording();

        // Full Reset
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
                            <CheckCircle size={48} />
                }
            </div>

            <div className="text-4xl font-mono font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {formatTime(duration)}
            </div>

            <div className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary mb-6 uppercase tracking-[0.2em] opacity-60">
                {status === 'idle' ? 'Ready' :
                    status === 'recording' ? 'Live' :
                        status === 'paused' ? 'Paused' : 'Complete'}
            </div>

            {(transcript || interimTranscript) && (
                <div className="w-full bg-light-background dark:bg-dark-background/50 rounded-xl p-4 mb-6 border border-light-border dark:border-dark-border max-h-40 overflow-y-auto custom-scrollbar shadow-inner relative group">
                    <div className="flex items-center gap-1.5 mb-2 opacity-50">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Live Transcription</span>
                    </div>
                    <p className="text-sm leading-relaxed text-light-text-primary dark:text-dark-text-primary font-medium">
                        {transcript}
                        <span className="text-primary opacity-60 italic">{interimTranscript}</span>
                    </p>
                </div>
            )}

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
                            Stop
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
