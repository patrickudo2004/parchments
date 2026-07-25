import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketingLayout } from './MarketingLayout';
import {
    Download,
    ShieldCheck,
    Users,
    Mic,
    Layout,
    Cpu,
    ArrowRight,
    BookOpen,
    Eye
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const GALLERY_ITEMS = [
    {
        id: 'workspace',
        label: 'Zen Workspace',
        description: 'Expository outline editor',
        image: '/screenshots/note_editing.png',
        caption: 'Ephesians 6 expository outline drafting inside the native TipTap editor.'
    },
    {
        id: 'lectio',
        label: 'Lectio Plans',
        description: 'Seeded & custom tracks',
        image: '/screenshots/lectio_zen_session.png',
        caption: 'An active split-screen Lectio reading track: scriptures on the left, daily reflections on the right.'
    },
    {
        id: 'parallel',
        label: 'Parallel Translations',
        description: 'Synced scroll layout',
        image: '/screenshots/parallel_bible.png',
        caption: 'KJV and World English Bible translations aligned side-by-side with scroll-synced physics.'
    },
    {
        id: 'citations',
        label: 'Smart Citations',
        description: 'Glassmorphic context popups',
        image: '/screenshots/auto_referencing.png',
        caption: 'Tapping or hovering over scripture references displays a premium context preview instantly.'
    }
];

export const LandingPage: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState('workspace');
    const [showBanner, setShowBanner] = React.useState(false);

    React.useEffect(() => {
        const consent = localStorage.getItem('parchments-pecr-consent');
        if (consent !== 'true') {
            setShowBanner(true);
        }
    }, []);

    const acceptConsent = () => {
        localStorage.setItem('parchments-pecr-consent', 'true');
        setShowBanner(false);
    };

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
                            <span className="text-[10px] uppercase font-black tracking-widest text-primary">Beta v{APP_VERSION} Now Live</span>
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] max-w-4xl mx-auto italic">
                            FOCUS ON THE <span className="text-primary not-italic">WORD</span>.
                        </h1>

                        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                            The ultimate workspace for serious Bible study.
                            Built offline-first for theologians and pastors who value <span className="text-white hover:text-primary transition-colors cursor-default">privacy</span> and <span className="text-white hover:text-primary transition-colors cursor-default">focus</span>.
                        </p>

                        <div id="download" className="flex flex-col items-center justify-center gap-6 pt-4">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.1_x64_en-US.msi"
                                    className="group px-8 py-5 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-primary hover:text-white transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 cursor-pointer"
                                >
                                    <Download size={22} className="group-hover:animate-bounce" />
                                    <span>Download for Windows</span>
                                </a>
                                <a
                                    href="/guide"
                                    className="group px-8 py-5 bg-white/5 text-white font-black rounded-2xl border border-white/10 flex items-center gap-3 hover:bg-white hover:text-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 cursor-pointer"
                                >
                                    <Layout size={22} />
                                    <span>View User Guide</span>
                                </a>
                            </div>

                            {/* Secondary Platform Triggers */}
                            <div className="flex flex-wrap items-center justify-center gap-3 text-xs pt-2">
                                <span className="text-white/30 font-bold uppercase tracking-wider text-[10px] mr-1">Other Platforms:</span>
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.1_universal.dmg"
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <span> macOS</span>
                                </a>
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases/latest/download/parchments_0.1.1_amd64.deb"
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <span>🐧 Linux</span>
                                </a>
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases/latest/download/parchments-android.apk"
                                    className="px-4 py-2 bg-white/5 hover:bg-primary/20 text-white border border-primary/20 hover:border-primary/40 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Download Android Release APK"
                                >
                                    <span>🤖 Android (APK)</span>
                                </a>
                                <button
                                    onClick={() => alert("To install on iOS:\n1. Open Safari on your iPhone/iPad.\n2. Go to https://parchments.vercel.app (or your hosted PWA link).\n3. Tap the Share button in Safari.\n4. Select 'Add to Home Screen'.")}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <span>📱 iOS (PWA Setup)</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* App Preview Mock-Browser Gallery */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="mt-24 relative max-w-5xl mx-auto flex flex-col gap-8"
                    >
                        <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full scale-75 opacity-30 pointer-events-none" />
                        
                        {/* Mock Browser Frame */}
                        <div className="relative bg-[#0c0c0c]/90 rounded-3xl border border-white/10 shadow-2xl overflow-hidden aspect-video group">
                            {/* Browser Header Bar */}
                            <div className="h-12 bg-white/[0.02] border-b border-white/5 flex items-center justify-between px-6 select-none">
                                {/* Window dots */}
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                </div>
                                {/* Address Bar */}
                                <div className="w-[200px] md:w-[450px] h-7 bg-white/[0.04] rounded-lg border border-white/5 flex items-center justify-center text-[10px] text-white/40 font-mono tracking-tight">
                                    localhost:3000/app/{activeTab}
                                </div>
                                {/* Sync Status */}
                                <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-primary/80">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                    <span>👥 Shared Space</span>
                                </div>
                            </div>

                            {/* Screenshot Viewer */}
                            <div className="relative w-full h-[calc(100%-48px)] bg-[#050505]">
                                <AnimatePresence mode="wait">
                                    {GALLERY_ITEMS.map(item => item.id === activeTab && (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                                            className="absolute inset-0 w-full h-full"
                                        >
                                            <img
                                                src={item.image}
                                                alt={item.caption}
                                                className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-60 transition-opacity duration-500"
                                            />
                                            {/* Hover preview button */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                <a
                                                    href="/app"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl flex items-center gap-3 hover:scale-110 transition-all shadow-2xl cursor-pointer"
                                                >
                                                    Open Interactive Workspace <ArrowRight size={20} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Feature Navigation Tabs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                            {GALLERY_ITEMS.map((item) => {
                                const isActive = item.id === activeTab;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`p-5 rounded-2xl text-left border transition-all duration-300 flex flex-col gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                            isActive
                                                ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5'
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <span className={`text-xs font-black uppercase tracking-wider ${isActive ? 'text-primary' : 'text-white/40'}`}>
                                            {item.label}
                                        </span>
                                        <span className="text-[10px] text-white/50 font-medium leading-tight">
                                            {item.description}
                                        </span>
                                    </button>
                                );
                            })}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Scripture Intelligence */}
                        <div className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-[32px] hover:border-primary/30 transition-all duration-500">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                                <Layout size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Scripture Intelligence</h4>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Type a verse reference (John 3:16) and watch it turn into a smart link instantly. Instant hover previews for deep flow.
                            </p>
                        </div>
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

                        {/* Lectio Plans */}
                        <div className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-[32px] hover:border-primary/30 transition-all duration-500">
                            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-6 group-hover:scale-110 transition-transform">
                                <BookOpen size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Lectio Zen Plans</h4>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Track customizable scripture reading schedules (e.g., 1-year canonicals) inside physical workspaces on your local hard drive.
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

                        {/* PiP References */}
                        <div className="group p-8 bg-[#0a0a0a] border border-white/5 rounded-[32px] hover:border-primary/30 transition-all duration-500">
                            <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-500 mb-6 group-hover:scale-110 transition-transform">
                                <Eye size={28} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Reference Drawer</h4>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Tap scriptures in study notes to pull up Picture-in-Picture context previews instantly without losing focus.
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
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-3 px-10 py-6 bg-primary text-white font-black rounded-[24px] hover:scale-110 active:scale-95 transition-all shadow-3xl shadow-primary/20 text-lg"
                    >
                        Download the Beta <Download size={24} />
                    </a>
                </div>
            </section>

            {/* Local-First Storage Consent Banner */}
            {showBanner && (
                <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[420px] z-[100] bg-[#0c0c0c]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[28px] shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary mt-0.5 animate-pulse">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="space-y-1">
                            <h5 className="font-bold text-sm text-white">Local-First Storage Notice</h5>
                            <p className="text-xs text-white/50 leading-relaxed">
                                Parchments is completely offline-first. We use IndexedDB and localStorage securely on your device to persist Bibles and study notes. No data ever leaves your machine.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <a
                            href="/privacy"
                            className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <button
                            onClick={acceptConsent}
                            className="px-5 py-2 bg-primary hover:scale-105 active:scale-95 text-white text-xs font-bold rounded-full transition-all shadow-md shadow-primary/10 cursor-pointer"
                        >
                            Accept & Continue
                        </button>
                    </div>
                </div>
            )}
        </MarketingLayout>
    );
};
