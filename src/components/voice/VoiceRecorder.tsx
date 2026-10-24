import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Pause, Play, CheckCircle, X as CloseIcon, Sparkles } from 'lucide-react';
import { AlertModal } from '@/components/ui/AlertModal';
import { getSupportedAudioMimeType, type AudioMimeInfo } from '@/lib/voice/audioMime';
import { streamingTranscriber, downsampleTo16k } from '@/lib/voice/streamingTranscriptionService';

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob, duration: number, transcript: string) => void;
    onCancel: () => void;
    isModal?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onCancel, isModal = false }) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
    const [duration, setDuration] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const transcriptContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll live transcript container as text flows in
    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcript, interimTranscript]);
    const [engineType, setEngineTypeState] = useState<'cloud-web' | 'local-whisper'>('local-whisper');
    // Ref mirror so long-lived audio callbacks never read a stale engine value
    const engineTypeRef = useRef<'cloud-web' | 'local-whisper'>('local-whisper');
    const setEngineType = (value: 'cloud-web' | 'local-whisper') => {
        engineTypeRef.current = value;
        setEngineTypeState(value);
    };

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef<string>('');
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isRecordingRef = useRef<boolean>(false);
    const selectedMimeRef = useRef<AudioMimeInfo>({ mimeType: 'audio/webm', extension: 'webm' });
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Audio stream buffer for live Whisper slicing
    const pcmChunksRef = useRef<Float32Array[]>([]);
    const pcmSampleCountRef = useRef<number>(0);

    // Desktop detection (Tauri on Windows/Mac/Linux)
    const isDesktop = typeof window !== 'undefined' &&
        Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

    // Web Speech API check (universal browser / webview support)
    const hasBrowserSpeechApi = typeof window !== 'undefined' &&
        Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    // Pre-warm on-device Whisper model on mount
    useEffect(() => {
        streamingTranscriber.prewarm();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Resource cleanup on unmount
    useEffect(() => {
        return () => {
            isRecordingRef.current = false;
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (scriptProcessorRef.current) {
                scriptProcessorRef.current.disconnect();
                scriptProcessorRef.current = null;
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

    // Canvas audio visualizer rendering
    const renderVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const numBars = 24;
        const barSpacing = 3;
        const totalSpacing = barSpacing * (numBars - 1);
        const barWidth = Math.max(2, (width - totalSpacing) / numBars);

        for (let i = 0; i < numBars; i++) {
            const dataIndex = Math.floor((i / numBars) * (bufferLength / 2));
            const rawValue = dataArray[dataIndex] || 0;
            const normalized = rawValue / 255;
            const barHeight = Math.max(3, normalized * (height - 4));

            const x = i * (barWidth + barSpacing);
            const y = (height - barHeight) / 2;

            ctx.fillStyle = isRecordingRef.current ? '#C5A059' : '#A8A8A8';
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 2);
            ctx.fill();
        }

        if (isRecordingRef.current) {
            animationFrameRef.current = requestAnimationFrame(renderVisualizer);
        }
    };

    // Live on-device Whisper transcription loop for incoming PCM audio
    const processPcmSlice = async (inputRate: number) => {
        // Prevent concurrent dual-engine collision if browser cloud speech API is active
        if (engineTypeRef.current !== 'local-whisper') return;
        if (pcmChunksRef.current.length === 0 || streamingTranscriber.isTranscribing()) return;

        const chunks = pcmChunksRef.current;
        const totalSamples = pcmSampleCountRef.current;
        pcmChunksRef.current = [];
        pcmSampleCountRef.current = 0;

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
            return;
        }

        const pcm16k = downsampleTo16k(merged, inputRate);
        try {
            const partial = await streamingTranscriber.transcribeChunk(pcm16k);
            if (partial && partial.trim().length > 0) {
                const cleanPartial = partial.trim();
                transcriptRef.current = transcriptRef.current
                    ? `${transcriptRef.current} ${cleanPartial}`
                    : cleanPartial;
                setTranscript(transcriptRef.current);
                setInterimTranscript('');
            }
        } catch (e) {
            console.warn('[VoiceRecorder] Streaming Whisper chunk error:', e);
        }
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

            // Web Audio setup for audio visualizer & live PCM audio tap
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(audioStream);

            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.7;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Setup real-time PCM audio tap for Live On-Device Whisper Streaming
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            pcmChunksRef.current = [];
            pcmSampleCountRef.current = 0;

            const sliceSampleThreshold = Math.round(audioContext.sampleRate * 2.8); // 2.8s cadence for natural phrasing

            scriptProcessor.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;
                const channelData = e.inputBuffer.getChannelData(0);
                pcmChunksRef.current.push(new Float32Array(channelData));
                pcmSampleCountRef.current += channelData.length;

                if (pcmSampleCountRef.current >= sliceSampleThreshold) {
                    processPcmSlice(audioContext.sampleRate);
                }
            };

            source.connect(scriptProcessor);
            // Route through a muted gain node so audio processing events fire without echoing mic input through speakers
            const muteGain = audioContext.createGain();
            muteGain.gain.setValueAtTime(0, audioContext.currentTime);
            scriptProcessor.connect(muteGain);
            muteGain.connect(audioContext.destination);

            // Negotiate best supported container for recording the final audio file
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

            mediaRecorder.start(250);
            isRecordingRef.current = true;
            setStatus('recording');

            // Determine transcription mode.
            // Desktop webviews (WebView2 / WKWebView) expose SpeechRecognition but it either has no
            // cloud backend ('network' error) or competes with Whisper, so desktop always uses on-device Whisper.
            if (hasBrowserSpeechApi && !isDesktop) {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

                    recognition.onend = () => {
                        if (isRecordingRef.current && engineTypeRef.current === 'cloud-web') {
                            try {
                                recognition.start();
                            } catch {
                                setTimeout(() => {
                                    if (isRecordingRef.current && engineTypeRef.current === 'cloud-web') {
                                        try { recognition.start(); } catch {}
                                    }
                                }, 300);
                            }
                        }
                    };

                    recognition.onerror = (event: any) => {
                        // If browser recognition fails with network or not-allowed, fall back to local Whisper
                        if (event.error === 'network' || event.error === 'service-not-allowed') {
                            console.info('[VoiceRecorder] Web speech cloud unavailable. Switching to on-device Whisper engine.');
                            setEngineType('local-whisper');
                            try { recognition.stop(); } catch {}
                        }
                    };

                    recognition.start();
                    recognitionRef.current = recognition;
                    setEngineType('cloud-web');
                } catch {
                    setEngineType('local-whisper');
                }
            } else {
                setEngineType('local-whisper');
            }

            renderVisualizer();

            // Start timer
            startTimeRef.current = Date.now();
            pausedTimeRef.current = 0;
            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000));
            }, 1000);

        } catch (err) {
            console.error('[VoiceRecorder] Error accessing microphone:', err);
            setAlertMessage('Could not access microphone. Please allow microphone permissions in your system settings.');
            setIsAlertOpen(true);
            onCancel();
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            isRecordingRef.current = false;
            mediaRecorderRef.current.pause();
            setStatus('paused');

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            pausedTimeRef.current = Date.now() - startTimeRef.current;

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

            renderVisualizer();

            const pauseDuration = pausedTimeRef.current;
            startTimeRef.current = Date.now() - pauseDuration;
            pausedTimeRef.current = 0;

            timerRef.current = window.setInterval(() => {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

            if (recognitionRef.current && engineType === 'cloud-web') {
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

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            if (scriptProcessorRef.current) {
                scriptProcessorRef.current.disconnect();
                scriptProcessorRef.current = null;
            }

            // Flush trailing speech (< one slice) so the last sentence isn't lost
            if (audioContextRef.current && pcmSampleCountRef.current > 0) {
                processPcmSlice(audioContextRef.current.sampleRate);
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
        <div className="relative flex flex-col items-center justify-center p-3.5 sm:p-4 bg-light-surface dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border shadow-sm w-full mx-auto select-none overflow-hidden">
            {/* Modal Exit Button (Only when used inside a modal or during review) */}
            {(isModal || status === 'review') && (
                <button
                    onClick={handleCancel}
                    className="absolute top-3 right-3 p-1.5 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full transition-colors text-light-text-secondary hover:text-light-text-primary cursor-pointer"
                    title="Close"
                >
                    <CloseIcon size={16} />
                </button>
            )}

            {/* Status & Central Mic Display */}
            <div className="flex flex-col items-center justify-center mb-2.5">
                <div
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                        status === 'recording'
                            ? 'bg-red-500/10 text-red-500 ring-4 ring-red-500/20'
                            : status === 'paused'
                                ? 'bg-amber-500/10 text-amber-500 ring-4 ring-amber-500/20'
                                : status === 'idle'
                                    ? 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer active:scale-95'
                                    : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                    onClick={status === 'idle' ? startRecording : undefined}
                >
                    {status === 'recording' ? (
                        <div className="relative flex items-center justify-center">
                            <span className="absolute w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
                            <Mic size={24} className="relative z-10 shrink-0" />
                        </div>
                    ) : status === 'paused' ? (
                        <Pause size={24} className="shrink-0" />
                    ) : status === 'review' ? (
                        <CheckCircle size={24} className="shrink-0" />
                    ) : (
                        <Mic size={24} className="shrink-0" />
                    )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        status === 'recording' ? 'bg-red-500 animate-pulse' :
                        status === 'paused' ? 'bg-amber-500' :
                        status === 'review' ? 'bg-emerald-500' :
                        'bg-light-text-disabled'
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                        {status === 'idle' ? 'Ready to Record' :
                         status === 'recording' ? 'Recording...' :
                         status === 'paused' ? 'Paused' : 'Recording Complete'}
                    </span>
                </div>
            </div>

            {/* Timer Display */}
            <div className="text-2xl sm:text-3xl font-mono font-bold text-light-text-primary dark:text-dark-text-primary tracking-tight mb-2">
                {formatTime(duration)}
            </div>

            {/* Real-time Audio Visualizer Canvas */}
            {(status === 'recording' || status === 'paused') && (
                <div className="w-full h-7 mb-2.5 flex items-center justify-center px-1">
                    <canvas
                        ref={canvasRef}
                        width={220}
                        height={28}
                        className="w-full h-full max-w-[220px]"
                    />
                </div>
            )}

            {/* Live Streaming Transcript View */}
            {(transcript || interimTranscript) ? (
                <div
                    ref={transcriptContainerRef}
                    className="w-full bg-light-background dark:bg-dark-background/60 rounded-xl p-2.5 mb-3 border border-light-border dark:border-dark-border max-h-28 overflow-y-auto custom-scrollbar text-left"
                >
                    <div className="flex items-center justify-between gap-1 mb-1 opacity-80">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-primary">Live Transcription</span>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-light-text-disabled">
                            {engineType === 'local-whisper' || isDesktop ? 'On-Device AI' : 'Live Speech'}
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed text-light-text-primary dark:text-dark-text-primary font-medium">
                        {transcript}
                        <span className="text-primary opacity-70 italic ml-1">{interimTranscript}</span>
                    </p>
                </div>
            ) : status === 'recording' ? (
                <div className="w-full flex items-center gap-2 p-2 mb-3 bg-primary/5 rounded-xl border border-primary/20 text-light-text-secondary dark:text-dark-text-secondary text-left">
                    <Sparkles size={13} className="text-primary shrink-0 animate-pulse" />
                    <p className="text-[10px] leading-relaxed">
                        <strong className="text-primary font-semibold">On-Device AI Engine:</strong> Transcribing your voice in real-time as you speak.
                    </p>
                </div>
            ) : null}

            {/* Action Buttons Toolbar */}
            <div className="w-full flex flex-col gap-2">
                {status === 'idle' ? (
                    <button
                        onClick={startRecording}
                        className="w-full py-2.5 px-4 bg-primary text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Mic size={15} className="shrink-0" />
                        <span>Start Recording</span>
                    </button>
                ) : status === 'recording' ? (
                    <div className="flex items-center gap-2 w-full">
                        <button
                            onClick={pauseRecording}
                            className="flex-1 py-2 px-2 bg-light-background dark:bg-dark-background/60 hover:bg-light-sidebar dark:hover:bg-dark-sidebar border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 min-w-0 cursor-pointer"
                        >
                            <Pause size={14} className="shrink-0 text-amber-500" />
                            <span className="truncate">Pause</span>
                        </button>
                        <button
                            onClick={stopRecording}
                            className="flex-1 py-2 px-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 min-w-0 cursor-pointer"
                        >
                            <Square size={13} className="shrink-0 fill-current" />
                            <span className="truncate">Stop</span>
                        </button>
                    </div>
                ) : status === 'paused' ? (
                    <div className="flex items-center gap-2 w-full">
                        <button
                            onClick={resumeRecording}
                            className="flex-1 py-2 px-2 bg-primary hover:bg-primary-hover active:scale-95 text-[#121212] font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                        >
                            <Play size={14} className="shrink-0 fill-current" />
                            <span className="truncate">Resume</span>
                        </button>
                        <button
                            onClick={stopRecording}
                            className="flex-1 py-2 px-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 min-w-0 cursor-pointer"
                        >
                            <Square size={13} className="shrink-0 fill-current" />
                            <span className="truncate">Stop</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={handleSave}
                            className="w-full py-2.5 px-4 bg-primary text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <CheckCircle size={15} className="shrink-0" />
                            <span>Save Note</span>
                        </button>
                        <button
                            onClick={handleCancel}
                            className="w-full py-2 px-3 border border-light-border dark:border-dark-border text-light-text-secondary hover:text-red-500 hover:bg-red-500/10 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Trash2 size={14} className="shrink-0" />
                            <span>Discard</span>
                        </button>
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
