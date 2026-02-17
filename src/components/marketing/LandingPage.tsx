import React from 'react';
import { motion } from 'framer-motion';
import { MarketingLayout } from './MarketingLayout';
import {
    Download,
    ShieldCheck,
    Users,
    Mic,
    Layout,
    Cpu,
    ArrowRight
} from 'lucide-react';

export const LandingPage: React.FC = () => {
    return (
        <MarketingLayout>
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                            <span className="w-2 h-2 bg-primary animate-pulse rounded-full" />
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary">Beta v0.1.0-beta.7 Now Live</span>
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] max-w-4xl mx-auto italic">
                            FOCUS ON THE <span className="text-primary not-italic">WORD</span>.
                        </h1>

                        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                            Parchments is a premium, offline-first workspace for serious Bible study.
                            Built for theologians who value <span className="text-white hover:text-primary transition-colors cursor-default">privacy</span> and <span className="text-white hover:text-primary transition-colors cursor-default">focus</span>.
                        </p>

                        <div id="download" className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                            <div className="flex flex-col gap-3">
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_x64_en-US.msi"
                                    className="group px-8 py-5 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-primary hover:text-white transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5"
                                >
                                    <Download size={22} className="group-hover:animate-bounce" />
                                    <span>Download for Windows</span>
                                </a>
                                <div className="flex items-center justify-center gap-4 text-[10px] uppercase font-bold text-white/20 tracking-[0.2em]">
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_universal.dmg" className="hover:text-primary transition-colors flex items-center gap-1.5 underline-offset-4 underline decoration-white/10 hover:decoration-primary/50">macOS (Apple Silicon/Intel)</a>
                                    <span>•</span>
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/parchments_0.1.0_amd64.deb" className="hover:text-primary transition-colors flex items-center gap-1.5 underline-offset-4 underline decoration-white/10 hover:decoration-primary/50">Linux (.deb)</a>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* App Preview Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="mt-24 relative max-w-5xl mx-auto"
                    >
                        <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full scale-75 opacity-50" />
                        <div className="relative bg-[#0d0d0d] rounded-3xl border border-white/10 shadow-3xl overflow-hidden aspect-video group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                            {/* Browser Bars */}
                            <div className="h-10 bg-[#151515] border-b border-white/5 flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20" />
                                </div>
                                <div className="mx-auto w-1/3 h-5 bg-white/5 rounded-md" />
                            </div>

                            {/* Center Logo / CTA Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <a
                                    href="/app"
                                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl flex items-center gap-3 hover:scale-110 transition-all shadow-2xl"
                                >
                                    Try Web Preview <ArrowRight size={20} />
                                </a>
                            </div>

                            {/* Visual Placeholder Content */}
                            <div className="p-8 space-y-4">
                                <div className="flex gap-6 h-full">
                                    <div className="w-48 space-y-2 opacity-20">
                                        <div className="h-4 bg-white rounded w-3/4" />
                                        <div className="h-4 bg-white rounded w-1/2" />
                                        <div className="h-64 bg-white/5 rounded-xl mt-4" />
                                    </div>
                                    <div className="flex-1 space-y-4 pt-10">
                                        <div className="h-12 bg-white/10 rounded-2xl w-2/3" />
                                        <div className="h-4 bg-white/5 rounded w-full" />
                                        <div className="h-4 bg-white/5 rounded w-full" />
                                        <div className="h-4 bg-white/5 rounded w-3/4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24 space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary italic">Engineered for depth</h2>
                        <h3 className="text-3xl md:text-5xl font-black tracking-tight">Everything a researcher needs.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Privacy */}
                        <div className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-[32px] hover:border-primary/30 transition-all duration-500">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Radial Privacy</h4>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Your notes never leave your machine. No mandatory accounts, no cloud shadows, no data selling. Your study stays yours.
                            </p>
                        </div>

                        {/* Local AI */}
                        <div className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-[32px] hover:border-primary/30 transition-all duration-500">
                            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
                                <Cpu size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">On-Device Intelligence</h4>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Transcribe sermons and outline chapters using local AI models (Whisper/Transformers). 100% offline, 100% private.
                            </p>
                        </div>

                        {/* Sync */}
                        <div className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-[32px] hover:border-primary/30 transition-all duration-500">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                                <Users size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Collaborative Study</h4>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Sync folder-level metadata across your team without a central server. Peer-to-peer real-time collaboration.
                            </p>
                        </div>
                    </div>

                    {/* Secondary Features Bar */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl">
                            <div className="p-3 bg-white/5 rounded-xl"><Layout size={24} className="text-primary" /></div>
                            <div>
                                <p className="font-bold">Interlinear Bench</p>
                                <p className="text-xs text-white/40">Lemma-level Greek & Hebrew concordances.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl">
                            <div className="p-3 bg-white/5 rounded-xl"><Mic size={24} className="text-primary" /></div>
                            <div>
                                <p className="font-bold">Voice-to-Text</p>
                                <p className="text-xs text-white/40">Capture oral reflections instantly as rich text.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-40 relative overflow-hidden">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-7xl font-black leading-tight">THE WORD IS <br />DEEP. <span className="text-primary">DIVE IN.</span></h2>
                        <p className="text-white/40 max-w-xl mx-auto">Join the beta program today and help us build the future of scriptural research tools.</p>
                    </div>

                    <a
                        href="#download"
                        className="inline-flex items-center gap-3 px-10 py-6 bg-primary text-white font-black rounded-[24px] hover:scale-110 active:scale-95 transition-all shadow-3xl shadow-primary/20 text-lg"
                    >
                        Download the Beta <Download size={24} />
                    </a>
                </div>
            </section>
        </MarketingLayout>
    );
};
