import React, { useRef, useState } from 'react';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const TOUR_CHAPTERS = [
    { label: '1. Scripture Scan & Hover', sec: 1 },
    { label: '2. Dark Mode & [[Auto-Quote]]', sec: 9.5 },
    { label: '3. Greek/Hebrew & 500k TSK', sec: 15.5 },
    { label: '4. Offline Theological Voice AI', sec: 21 },
    { label: '5. Sunday Pulpit Teleprompter', sec: 25 },
];

export const ShowcaseVideoCard: React.FC = () => {
    const [isTourMuted, setIsTourMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const toggleTourAudio = () => {
        if (!videoRef.current) return;
        const nextMuted = !isTourMuted;
        videoRef.current.muted = nextMuted;
        if (!nextMuted) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
        }
        setIsTourMuted(nextMuted);
    };

    const seekTourChapter = (sec: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = sec;
        videoRef.current.play().catch(() => {});
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="relative rounded-[28px] p-2 sm:p-3 bg-gradient-to-b from-white/15 to-white/[0.03] border border-primary/30 shadow-[0_30px_90px_-15px_rgba(212,175,55,0.22)] overflow-hidden">
                {/* Top Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-2 rounded-2xl bg-black/60 border border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 font-mono text-[11px] text-white/70 font-semibold">
                            🎬 30-Second Guided Product Tour (v{APP_VERSION})
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleTourAudio}
                            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer touch-manipulation ${
                                isTourMuted
                                    ? 'bg-primary text-black hover:scale-105 shadow-lg shadow-primary/25'
                                    : 'bg-white/15 text-white border border-white/20 hover:bg-white/25'
                            }`}
                            aria-label={isTourMuted ? 'Unmute guided voiceover tour' : 'Mute guided tour audio'}
                        >
                            {isTourMuted ? (
                                <>
                                    <VolumeX size={15} />
                                    <span>Unmute Voiceover Tour</span>
                                </>
                            ) : (
                                <>
                                    <Volume2 size={15} className="text-primary" />
                                    <span>Voiceover Active (Tap to Mute)</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => seekTourChapter(0)}
                            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Restart Guided Tour"
                            aria-label="Restart Guided Tour from beginning"
                        >
                            <RotateCcw size={13} />
                            <span className="hidden sm:inline">Restart</span>
                        </button>
                    </div>
                </div>

                {/* Widescreen 16:10 Video Element */}
                <div className="relative rounded-2xl overflow-hidden bg-[#0a0a0d] aspect-[16/10]">
                    <video
                        ref={videoRef}
                        src="/videos/parchments-website-showcase.mp4"
                        poster="/videos/parchments-website-poster.jpg"
                        autoPlay
                        loop
                        muted={isTourMuted}
                        playsInline
                        controls
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Interactive Chapter Jump Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-3 pb-1">
                    {TOUR_CHAPTERS.map((ch, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => seekTourChapter(ch.sec)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 text-white/75 hover:text-primary border border-white/10 hover:border-primary/40 text-[11px] font-bold transition-all cursor-pointer touch-manipulation"
                        >
                            {ch.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
