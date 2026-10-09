import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketingLayout } from './MarketingLayout';
import {
    Download,
    ShieldCheck,
    Mic,
    Layout,
    Cpu,
    ArrowRight,
    BookOpen,
    Eye,
    Sparkles,
    Smartphone,
    Tablet,
    Check,
    Layers,
    ChevronRight,
    Play,
    Globe,
    ExternalLink
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

const GALLERY_ITEMS = [
    {
        id: 'pulpit',
        label: 'Pulpit Deck',
        description: 'Stage prompter & timer',
        image: '/screenshots/pulpit_mode_desktop.png',
        caption: 'Live stage prompter with countdown timer, amber warning, and Sunday Deck note switching.',
        category: 'Preaching',
        device: 'Desktop & Tablet'
    },
    {
        id: 'storage',
        label: 'Storage Choice',
        description: 'Local folder or browser DB',
        image: '/screenshots/storage_foundation_desktop.png',
        caption: 'Choose between a real local markdown folder on your drive or a private browser database with one-click migration.',
        category: 'Privacy',
        device: 'Universal'
    },
    {
        id: 'workspace',
        label: 'Zen Editor',
        description: 'Expository outline studio',
        image: '/screenshots/workspace_editor_desktop.png',
        caption: 'Ephesians 6 expository sermon drafting with smart scripture auto-referencing and TipTap rich formatting.',
        category: 'Study',
        device: 'Desktop'
    },
    {
        id: 'parallel',
        label: 'Parallel Bibles',
        description: 'Continuous paragraph flow',
        image: '/screenshots/parallel_bible_desktop.png',
        caption: 'Side-by-side translation comparison with scroll synchronization and Strong concordance.',
        category: 'Exegesis',
        device: 'Desktop & Tablet'
    },
    {
        id: 'tablet',
        label: 'Tablet Touch',
        description: 'Multi-pane touch studio',
        image: '/screenshots/tablet_touch_workspace.png',
        caption: 'Touch-optimized workspace for iPad and Android tablets with responsive drawer navigation.',
        category: 'Touch',
        device: 'Tablet (1024px)'
    },
    {
        id: 'mobile',
        label: 'Mobile Study',
        description: 'Pocket exegesis & sheets',
        image: '/screenshots/mobile_touch_study.png',
        caption: 'On-the-go scripture reading and note capture with bottom sheets and gesture navigation.',
        category: 'Mobile',
        device: 'Mobile (412px)'
    },
    {
        id: 'lectio',
        label: 'Lectio Zen',
        description: '5-stage contemplation',
        image: '/screenshots/lectio_zen_desktop.png',
        caption: 'Split-screen contemplative reading track: scripture on the left, guided meditation on the right.',
        category: 'Devotion',
        device: 'Universal'
    }
];

const PERSONAS = [
    {
        id: 'pastors',
        title: 'Pastors & Preachers',
        badge: 'Sunday Morning Ready',
        tagline: 'Deliver sermons with authority, pacing, and zero stage anxiety.',
        summary: 'Designed specifically for weekly sermon preparation and live delivery on lecterns, iPads, and pulpit stands.',
        benefits: [
            {
                title: 'Sunday Pulpit Deck & Stage Prompter',
                desc: 'Auto-scrolling stage teleprompter with target countdown timer, 5-minute amber warning, and pulsing red overtime alerts.'
            },
            {
                title: 'Instant Multi-Part Sermon Switching',
                desc: 'Jump smoothly between Sermon Part 1, Part 2, Announcements, and Pastoral Prayer using Alt+1..Alt+4 quick chips.'
            },
            {
                title: 'Stage Mini-Bible Drawer',
                desc: 'Look up unscripted Bible verses during live preaching without ever breaking your stride or leaving your outline.'
            },
            {
                title: 'Clicker & Bluetooth Pedal Support',
                desc: 'Turn pages hands-free with standard USB presentation clickers, Bluetooth remotes, or volume keys.'
            }
        ]
    },
    {
        id: 'scholars',
        title: 'Scholars & Seminarians',
        badge: 'Academic Rigor',
        tagline: 'Deep original-language exegesis without thousand-dollar paywalls.',
        summary: 'Built for rigorous exegetical work, dissertation research, and seminary lecture preparation.',
        benefits: [
            {
                title: 'Parallel Translation Bench',
                desc: 'Compare Greek Textus Receptus, Hebrew, KJV, and modern translations side-by-side with synchronized scroll physics.'
            },
            {
                title: '31,102 TSK Cross-References',
                desc: 'The entire Treasury of Scripture Knowledge indexed locally with instant decrypted hover previews.'
            },
            {
                title: 'Continuous Paragraph Flow & Masoretic Markers',
                desc: 'Read poetic stanzas and biblical prose naturally, complete with [MT v.2] versification variance indicators.'
            },
            {
                title: 'Automated Academic Citations',
                desc: 'One-click copy citations properly formatted in SBL, Chicago, or Turabian for student papers and publications.'
            }
        ]
    },
    {
        id: 'devotion',
        title: 'Devotional Readers & Journalers',
        badge: 'Contemplative Soul Care',
        tagline: 'Quiet your heart, meditate on the Word, and form lifelong scripture habits.',
        summary: 'A peaceful, sanctuary-like environment free of algorithmic feeds, notifications, and telemetry tracking.',
        benefits: [
            {
                title: '5-Stage Lectio Divina Tracks',
                desc: 'Guided contemplative steps: Silencio (Quiet), Lectio (Read), Meditatio (Ponder), Oratio (Pray), and Contemplatio (Rest).'
            },
            {
                title: 'Illuminated Streak Calendar',
                desc: 'Track daily reading consistency on a monthly calendar with illuminated parchment badges.'
            },
            {
                title: '100% Private Offline Sanctuary',
                desc: 'Your deepest spiritual reflections are AES-GCM encrypted on your device and never uploaded to any remote server.'
            },
            {
                title: 'Voice Memos to Text',
                desc: 'Capture prayer walk thoughts or oral reflections and convert them immediately into rich-text journal entries.'
            }
        ]
    }
];

const COMPARISON_DATA = [
    {
        feature: 'Local-First & 100% Offline Architecture',
        parchments: 'Native (No internet needed)',
        logos: 'Heavy cloud dependencies',
        obsidian: 'Offline markdown',
        notion: 'Requires internet / cloud'
    },
    {
        feature: 'Zero Forced Cloud / Zero Telemetry Privacy',
        parchments: 'AES-GCM Encrypted (ENC::v1::)',
        logos: 'Forced account & telemetry',
        obsidian: 'Local vault',
        notion: 'Server-side stored'
    },
    {
        feature: 'Live Sunday Pulpit Deck & Stage Prompter',
        parchments: 'Built-in (Timer, clicker, Alt+1..4)',
        logos: 'Basic presentation mode',
        obsidian: 'Third-party plugins needed',
        notion: 'Not supported'
    },
    {
        feature: 'Scripture Intelligence & 31k TSK Cross-Refs',
        parchments: 'Native (31,102 TSK + Greek/Hebrew)',
        logos: 'Paid add-on library packs ($$$)',
        obsidian: 'Manual community plugins',
        notion: 'Manual copy-paste'
    },
    {
        feature: 'Touch Ergonomics (Tablets & Phones >= 48px)',
        parchments: 'Strict >= 48px touch targets & drawers',
        logos: 'Cluttered tablet interface',
        obsidian: 'Desktop UI scaled down',
        notion: 'Mobile app'
    },
    {
        feature: 'Zero-Install Web App (Browser DB)',
        parchments: 'Instant access (/app) with migration',
        logos: 'Web app requires paid license',
        obsidian: 'Desktop/Mobile install only',
        notion: 'Web app requires login'
    },
    {
        feature: 'Pricing & Licensing Model',
        parchments: 'Free & Open Source (GPL/MIT)',
        logos: '$500 – $2,500+ packages',
        obsidian: 'Free / $8-$10/mo sync',
        notion: '$10-$20/user/mo'
    }
];

export const LandingPage: React.FC = () => {
    const [activeGalleryTab, setActiveGalleryTab] = useState('pulpit');
    const [activePersona, setActivePersona] = useState('pastors');
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('parchments-pecr-consent');
        if (consent !== 'true') {
            setShowBanner(true);
        }
    }, []);

    const acceptConsent = () => {
        localStorage.setItem('parchments-pecr-consent', 'true');
        setShowBanner(false);
    };

    const currentPersonaData = PERSONAS.find(p => p.id === activePersona) || PERSONAS[0];

    return (
        <MarketingLayout>
            {/* Hero Section */}
            <section className="relative pt-20 pb-28 md:pb-36 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-8"
                    >
                        {/* Live Version Pill */}
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                            <span className="w-2 h-2 bg-primary animate-pulse rounded-full" />
                            <span className="text-[11px] uppercase font-black tracking-widest text-primary">
                                v{APP_VERSION} Live • Desktop, Tablet, Mobile & Zero-Install Web
                            </span>
                        </div>

                        {/* Hero Title */}
                        <h1 className="text-5xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.9] max-w-5xl mx-auto italic">
                            FOCUS ON THE <span className="text-primary not-italic">WORD</span>.
                        </h1>

                        {/* Hero Subtitle */}
                        <p className="text-lg md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed font-normal">
                            The local-first Bible study, sermon composition, and exegesis studio. Built for pastors, biblical scholars, and serious students who demand <span className="text-white font-semibold">absolute privacy</span>, <span className="text-white font-semibold">zero cloud lock-in</span>, and <span className="text-white font-semibold">stage-ready delivery</span>.
                        </p>

                        {/* Hero Primary Actions (>= 48px touch targets) */}
                        <div id="download" className="flex flex-col items-center justify-center gap-6 pt-4">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_x64_en-US.msi`}
                                    className="group min-h-[56px] px-8 py-4 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-primary hover:text-[#121212] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 cursor-pointer"
                                >
                                    <Download size={22} className="group-hover:animate-bounce" />
                                    <span>Download for Windows</span>
                                </a>

                                <a
                                    href="/app"
                                    className="group min-h-[56px] px-8 py-4 bg-primary text-[#121212] font-black rounded-2xl flex items-center gap-3 hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 cursor-pointer"
                                    title="Try live in browser without installing"
                                >
                                    <Sparkles size={22} />
                                    <span>Try Live in Browser (Zero Install)</span>
                                </a>

                                <a
                                    href="/guide"
                                    className="group min-h-[56px] px-7 py-4 bg-white/5 text-white font-black rounded-2xl border border-white/10 flex items-center gap-3 hover:bg-white hover:text-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 cursor-pointer"
                                >
                                    <Layout size={22} />
                                    <span>User Guide</span>
                                </a>
                            </div>

                            {/* Multi-Platform Badges */}
                            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs pt-3">
                                <span className="text-white/40 font-bold uppercase tracking-wider text-[10px] mr-1">All Platforms:</span>
                                
                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_universal.dmg`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Download macOS Universal DMG"
                                >
                                    <span> macOS (.dmg)</span>
                                </a>

                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_amd64.AppImage`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Download Linux AppImage"
                                >
                                    <span>🐧 Linux (.AppImage)</span>
                                </a>

                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_amd64.deb`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Download Linux Debian package"
                                >
                                    <span>🐧 Linux (.deb)</span>
                                </a>

                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/parchments-android.apk`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-primary/20 text-white border border-primary/20 hover:border-primary/40 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Download Android APK"
                                >
                                    <span>🤖 Android (APK)</span>
                                </a>

                                <button
                                    onClick={() => alert("To install on iOS / iPadOS:\n1. Open Safari.\n2. Navigate to https://parchments.vercel.app (or your hosted domain).\n3. Tap the Share button in Safari.\n4. Tap 'Add to Home Screen'.")}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Instructions for iPad and iPhone PWA installation"
                                >
                                    <span>📱 iOS (PWA Setup)</span>
                                </button>

                                <a
                                    href="/app"
                                    className="min-h-[44px] px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Launch Parchments instantly in any modern web browser"
                                >
                                    <Globe size={14} />
                                    <span>🌐 Web App (Zero Install)</span>
                                </a>
                            </div>

                            <div className="pt-2">
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-white/40 hover:text-primary transition-colors underline flex items-center gap-1.5"
                                >
                                    <span>View all releases, SHA-256 checksums & source code on GitHub</span>
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Interactive App Showcase & Multi-Device Gallery */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.8 }}
                        className="mt-20 md:mt-24 relative max-w-6xl mx-auto flex flex-col gap-8"
                    >
                        <div className="absolute inset-0 bg-primary/20 blur-[140px] rounded-full scale-75 opacity-25 pointer-events-none" />

                        {/* Interactive Showcase Mock Frame */}
                        <div className="relative bg-[#0c0c0c]/95 rounded-3xl border border-white/10 shadow-2xl overflow-hidden aspect-[16/10] md:aspect-video group">
                            {/* Frame Header Bar */}
                            <div className="h-12 bg-white/[0.03] border-b border-white/5 flex items-center justify-between px-6 select-none">
                                {/* Window dots */}
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                </div>

                                {/* Address & Viewport Indicator */}
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/[0.04] rounded-lg border border-white/5 text-[11px] text-white/50 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span>parchments.app/{activeGalleryTab}</span>
                                    </div>
                                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] uppercase font-bold tracking-wider">
                                        {GALLERY_ITEMS.find(i => i.id === activeGalleryTab)?.device}
                                    </span>
                                </div>

                                {/* Privacy Badge */}
                                <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-emerald-400">
                                    <ShieldCheck size={14} />
                                    <span className="hidden sm:inline">100% Offline Vault</span>
                                </div>
                            </div>

                            {/* Screenshot Viewer Area */}
                            <div className="relative w-full h-[calc(100%-48px)] bg-[#050505]">
                                <AnimatePresence mode="wait">
                                    {GALLERY_ITEMS.map(item => item.id === activeGalleryTab && (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, scale: 0.99 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.99 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="absolute inset-0 w-full h-full"
                                        >
                                            <img
                                                src={item.image}
                                                alt={item.caption}
                                                className="w-full h-full object-cover object-top opacity-95 group-hover:opacity-75 transition-opacity duration-300"
                                            />

                                            {/* Hover / Tap CTA Overlay */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 text-center">
                                                <p className="text-white text-base md:text-lg font-bold max-w-xl mb-4 drop-shadow-md">
                                                    {item.caption}
                                                </p>
                                                <a
                                                    href="/app"
                                                    className="min-h-[48px] px-8 py-3.5 bg-primary text-[#121212] font-black rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl cursor-pointer"
                                                >
                                                    <span>Launch Live Web Workspace</span>
                                                    <ArrowRight size={18} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Interactive Gallery Navigation Tabs (Touch-friendly >= 48px) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 px-2">
                            {GALLERY_ITEMS.map((item) => {
                                const isActive = item.id === activeGalleryTab;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveGalleryTab(item.id)}
                                        className={`min-h-[58px] p-3.5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-center gap-0.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                            isActive
                                                ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-black uppercase tracking-wider truncate ${isActive ? 'text-primary' : 'text-white/50'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-white/40 font-medium leading-tight truncate">
                                            {item.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Modern 2026 Bento Grid Feature Section */}
            <section id="features" className="py-24 md:py-32 relative border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 md:mb-20 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <Sparkles size={14} className="text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Engineered for Depth & Polish</span>
                        </div>
                        <h2 className="text-3xl md:text-6xl font-black tracking-tight">
                            Everything serious ministry demands.
                        </h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-base md:text-lg">
                            From sermon delivery on Sunday mornings to scholarly exegesis in the study, every detail is crafted for clarity and longevity.
                        </p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        
                        {/* Bento Card 1: Sunday Pulpit Deck & Stage Prompter (Large, spans 2 cols on lg) */}
                        <div className="lg:col-span-2 group relative overflow-hidden bg-[#0c0c0c] border border-white/5 hover:border-primary/40 rounded-[32px] p-8 md:p-10 transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[11px] font-black uppercase tracking-wider">
                                        <Mic size={14} />
                                        <span>Preacher's Pulpit Deck</span>
                                    </div>
                                    <span className="text-xs text-white/40 font-mono font-medium">Stage Delivery & Teleprompter</span>
                                </div>

                                <h3 className="text-2xl md:text-4xl font-extrabold text-white">
                                    Live Stage Prompter with Smart Countdown Timer
                                </h3>
                                <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-2xl">
                                    Preach with complete freedom. The Sunday Pulpit Deck provides hands-free auto-scrolling, a target preaching countdown timer that turns amber at 5 minutes and pulses red during overtime, plus Alt+1..Alt+4 quick-switch pills for multi-part sermons and stage announcements.
                                </p>
                            </div>

                            {/* Cropped UI Detail Showcase */}
                            <div className="mt-8 rounded-2xl overflow-hidden border border-white/10 bg-[#050505] shadow-2xl">
                                <img
                                    src="/screenshots/features/pulpit_timer_deck.png"
                                    alt="Pulpit Mode timer controls and Sunday Deck note switching pills"
                                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>

                            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-white/50">
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Target Countdown Timer</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> 5-Min Amber Warning</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Alt+1..4 Sermon Pills</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Stage Scripture Drawer</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Clicker & Pedal Support</span>
                            </div>
                        </div>

                        {/* Bento Card 2: Transparent Storage Foundation */}
                        <div className="group relative overflow-hidden bg-[#0c0c0c] border border-white/5 hover:border-primary/40 rounded-[32px] p-8 transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                                        <ShieldCheck size={14} />
                                        <span>Local-First Invariant</span>
                                    </div>
                                </div>

                                <h3 className="text-xl md:text-2xl font-bold text-white">
                                    Transparent Storage Foundation
                                </h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Choose between an open local folder on your drive (direct standard <code className="text-white/80">.md</code> files) or a private browser database with AES-GCM encryption. Built-in migration copy ensures you never lose notes when switching.
                                </p>
                            </div>

                            {/* Cropped UI Showcase */}
                            <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-[#050505]">
                                <img
                                    src="/screenshots/features/storage_foundation_cards.png"
                                    alt="Storage foundation choice cards: Open Local Folder vs Browser Database"
                                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>

                            <div className="mt-6 space-y-2 text-xs font-semibold text-white/50">
                                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 100% Offline & Private</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Zero forced cloud accounts</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> One-click folder export & migration</div>
                            </div>
                        </div>

                        {/* Bento Card 3: Parallel Exegesis Bench */}
                        <div className="group relative overflow-hidden bg-[#0c0c0c] border border-white/5 hover:border-primary/40 rounded-[32px] p-8 transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[11px] font-black uppercase tracking-wider">
                                        <Cpu size={14} />
                                        <span>Academic Exegesis</span>
                                    </div>
                                </div>

                                <h3 className="text-xl md:text-2xl font-bold text-white">
                                    Parallel Translation Bench
                                </h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Align Greek Textus Receptus, Hebrew, King James, and modern translations side-by-side with synchronized scrolling physics, continuous paragraph prose flow, and 31,102 cross-references.
                                </p>
                            </div>

                            {/* Cropped UI Showcase */}
                            <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-[#050505]">
                                <img
                                    src="/screenshots/features/parallel_bible_comparison.png"
                                    alt="Side by side parallel Bible columns with synchronized scroll"
                                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>

                            <div className="mt-6 space-y-2 text-xs font-semibold text-white/50">
                                <div className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Strong's Greek & Hebrew Lexicons</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> Continuous paragraph flow mode</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-indigo-400" /> 31,102 TSK references locally indexed</div>
                            </div>
                        </div>

                        {/* Bento Card 4: Touch Screen & Multi-Device Ergonomics (Spans 2 cols on lg) */}
                        <div className="lg:col-span-2 group relative overflow-hidden bg-[#0c0c0c] border border-white/5 hover:border-primary/40 rounded-[32px] p-8 md:p-10 transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-[11px] font-black uppercase tracking-wider">
                                        <Smartphone size={14} />
                                        <Tablet size={14} />
                                        <span>Touch Ergonomics</span>
                                    </div>
                                    <span className="text-xs text-white/40 font-mono">Desktop • Tablet • Mobile</span>
                                </div>

                                <h3 className="text-2xl md:text-4xl font-extrabold text-white">
                                    Engineered for Touch: Tablets, iPads & Mobile
                                </h3>
                                <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-2xl">
                                    Whether researching on an iPad Pro, preaching with a Samsung Galaxy Tab, or reviewing notes on your phone, every button and hit area adheres strictly to &ge; 48px touch targets. Includes floating panels with touch drag handles, gesture-friendly bottom sheets, and notch-aware safe-area insets.
                                </p>
                            </div>

                            {/* Cropped Mobile / Tablet UI Showcase */}
                            <div className="mt-8 rounded-2xl overflow-hidden border border-white/10 bg-[#050505] shadow-2xl">
                                <img
                                    src="/screenshots/features/mobile_touch_cards.png"
                                    alt="Touch-optimized mobile and tablet interface with generous hit targets and bottom navigation"
                                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>

                            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-white/50">
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-400" /> &ge; 48px Ergonomic Hit Targets</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-400" /> Floating Touch Drag Handles</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-400" /> Swipeable Bottom Drawers</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-400" /> Safe-Area Notch Insets</span>
                                <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-400" /> High-Contrast Dark & Light Themes</span>
                            </div>
                        </div>

                        {/* Bento Card 5: Lectio Zen & Habit Streak Calendar */}
                        <div className="group relative overflow-hidden bg-[#0c0c0c] border border-white/5 hover:border-primary/40 rounded-[32px] p-8 transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-[11px] font-black uppercase tracking-wider">
                                        <BookOpen size={14} />
                                        <span>Contemplative Devotion</span>
                                    </div>
                                </div>

                                <h3 className="text-xl md:text-2xl font-bold text-white">
                                    Lectio Zen & Streak Calendar
                                </h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    5-stage contemplative reading tracks (Silencio, Lectio, Meditatio, Oratio, Contemplatio). Track consistency on a monthly calendar with illuminated parchment badges and export to Apple/Google Calendar via RFC 5545 .ics.
                                </p>
                            </div>

                            <div className="mt-6 space-y-2 text-xs font-semibold text-white/50">
                                <div className="flex items-center gap-2"><Check size={14} className="text-rose-400" /> 5-Movement Guided Meditation</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-rose-400" /> Illuminated parchment streak badges</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-rose-400" /> RFC 5545 ICS calendar sync</div>
                            </div>
                        </div>

                        {/* Bento Card 6: Scripture Intelligence & Citations */}
                        <div className="group relative overflow-hidden bg-[#0c0c0c] border border-white/5 hover:border-primary/40 rounded-[32px] p-8 transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[11px] font-black uppercase tracking-wider">
                                        <Eye size={14} />
                                        <span>Smart Parsing</span>
                                    </div>
                                </div>

                                <h3 className="text-xl md:text-2xl font-bold text-white">
                                    Scripture Intelligence & Citations
                                </h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Type any verse reference (including complex spans like 1 Sam 17:1-11, 16 or Jude 4-8) for instant smart links, critical apparatus omission notices, and automatic SBL / Chicago academic citations.
                                </p>
                            </div>

                            <div className="mt-6 space-y-2 text-xs font-semibold text-white/50">
                                <div className="flex items-center gap-2"><Check size={14} className="text-cyan-400" /> Complex multi-chapter verse parsing</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-cyan-400" /> SBL, Chicago, Turabian citations</div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-cyan-400" /> Offline voice recording & dictation</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Persona / Audience Workflow Switcher */}
            <section id="workflows" className="py-24 md:py-32 relative bg-[#070707] border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <Layers size={14} className="text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Tailored Workflows</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight">
                            Built for how you study and speak.
                        </h2>
                        <p className="text-white/60 max-w-xl mx-auto text-base">
                            Explore how Parchments adapts specifically to your role in ministry and study.
                        </p>
                    </div>

                    {/* Persona Tabs (>= 48px touch targets) */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
                        {PERSONAS.map(p => {
                            const isActive = p.id === activePersona;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePersona(p.id)}
                                    className={`min-h-[48px] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2.5 active:scale-95 ${
                                        isActive
                                            ? 'bg-primary text-[#121212] shadow-lg shadow-primary/20 scale-105'
                                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                                    }`}
                                >
                                    <span>{p.title}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/40'}`}>
                                        {p.badge}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Persona Details */}
                    <motion.div
                        key={currentPersonaData.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-[#0c0c0c] border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
                    >
                        <div className="max-w-3xl mb-10 space-y-3">
                            <span className="text-xs font-black uppercase tracking-widest text-primary">
                                {currentPersonaData.badge}
                            </span>
                            <h3 className="text-2xl md:text-4xl font-extrabold text-white">
                                {currentPersonaData.tagline}
                            </h3>
                            <p className="text-white/60 text-base leading-relaxed">
                                {currentPersonaData.summary}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {currentPersonaData.benefits.map((b, idx) => (
                                <div key={idx} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-4">
                                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 mt-0.5">
                                        <Check size={18} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="text-base font-bold text-white">{b.title}</h4>
                                        <p className="text-xs md:text-sm text-white/50 leading-relaxed">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                            <span className="text-xs text-white/40 font-medium">Ready to experience this workflow firsthand?</span>
                            <a
                                href="/app"
                                className="min-h-[48px] px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95"
                            >
                                <span>Try this workflow in your browser</span>
                                <ArrowRight size={16} />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* "Why Parchments?" Deep Comparison Table */}
            <section id="comparison" className="py-24 md:py-32 relative border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 md:mb-20 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <Cpu size={14} className="text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Uncompromising Independence</span>
                        </div>
                        <h2 className="text-3xl md:text-6xl font-black tracking-tight">
                            Why Choose Parchments?
                        </h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-base">
                            See how Parchments compares to traditional Bible software, general note-taking apps, and cloud tools.
                        </p>
                    </div>

                    {/* Responsive Comparison Table Container */}
                    <div className="overflow-x-auto rounded-[32px] border border-white/10 bg-[#0c0c0c] shadow-2xl">
                        <table className="w-full text-left border-collapse min-w-[720px]">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/3">
                                        Capability / Invariant
                                    </th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-primary w-1/4 bg-primary/5">
                                        Parchments
                                    </th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/6">
                                        Logos
                                    </th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/6">
                                        Obsidian
                                    </th>
                                    <th className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/6">
                                        Notion / YouVersion
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {COMPARISON_DATA.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="p-6 font-semibold text-white/90">
                                            {row.feature}
                                        </td>
                                        <td className="p-6 font-bold text-primary bg-primary/5">
                                            <div className="flex items-center gap-2">
                                                <Check size={16} className="text-primary shrink-0" />
                                                <span>{row.parchments}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-white/50 text-xs">
                                            {row.logos}
                                        </td>
                                        <td className="p-6 text-white/50 text-xs">
                                            {row.obsidian}
                                        </td>
                                        <td className="p-6 text-white/50 text-xs">
                                            {row.notion}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Touch Screen & Cross-Device Ergonomics Callout Banner */}
            <section className="py-16 relative bg-[#070707] border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="p-8 md:p-12 rounded-[32px] bg-gradient-to-br from-primary/10 via-[#0d0d0d] to-black border border-primary/20 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-wider">
                                <Tablet size={14} />
                                <span>Touch Screen & Tablet Certified</span>
                            </div>
                            <h3 className="text-2xl md:text-4xl font-black text-white">
                                Built for your fingers as much as your keyboard.
                            </h3>
                            <p className="text-white/60 text-sm md:text-base leading-relaxed">
                                Every button in Parchments satisfies the strict 48x48px touch ergonomic standard. Move smoothly between typing on a laptop, tapping on an iPad, and reading on a smartphone with zero cramped menus or tiny links.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 shrink-0">
                            <a
                                href="/app"
                                className="min-h-[52px] px-8 py-3.5 bg-primary text-[#121212] font-black rounded-2xl flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 cursor-pointer"
                            >
                                <Play size={16} fill="currentColor" />
                                <span>Test Touch App Now</span>
                            </a>
                            <a
                                href="/guide"
                                className="min-h-[52px] px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <span>Read Touch Shortcuts</span>
                                <ChevronRight size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 md:py-44 relative overflow-hidden">
                <div className="max-w-5xl mx-auto px-6 text-center space-y-10">
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight">
                            THE WORD IS <br />DEEP. <span className="text-primary">DIVE IN.</span>
                        </h2>
                        <p className="text-white/50 max-w-xl mx-auto text-base md:text-lg">
                            Download the native app for your computer, or open the interactive web workspace instantly with zero installation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        <a
                            href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_x64_en-US.msi`}
                            className="min-h-[56px] inline-flex items-center gap-3 px-10 py-5 bg-white text-[#121212] font-black rounded-[24px] hover:bg-primary hover:text-black hover:scale-105 active:scale-95 transition-all shadow-2xl text-base"
                        >
                            <Download size={22} />
                            <span>Download Windows .msi</span>
                        </a>

                        <a
                            href="/app"
                            className="min-h-[56px] inline-flex items-center gap-3 px-10 py-5 bg-primary text-[#121212] font-black rounded-[24px] hover:scale-105 active:scale-95 transition-all shadow-3xl shadow-primary/20 text-base"
                        >
                            <Sparkles size={22} />
                            <span>Launch Web App (Zero Install)</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Local-First Storage Consent Banner */}
            {showBanner && (
                <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[440px] z-[100] bg-[#0c0c0c]/95 backdrop-blur-2xl border border-white/10 p-6 rounded-[28px] shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary mt-0.5 animate-pulse shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="space-y-1">
                            <h5 className="font-bold text-sm text-white">Local-First Storage Notice</h5>
                            <p className="text-xs text-white/50 leading-relaxed">
                                Parchments is completely offline-first. We use IndexedDB and localStorage securely on your device to persist Bibles and study notes. No data ever leaves your machine without your explicit command.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <a
                            href="/privacy"
                            className="min-h-[44px] px-4 py-2 flex items-center text-xs font-semibold text-white/60 hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <button
                            onClick={acceptConsent}
                            className="min-h-[44px] px-5 py-2 bg-primary hover:scale-105 active:scale-95 text-[#121212] text-xs font-bold rounded-full transition-all shadow-md shadow-primary/10 cursor-pointer"
                        >
                            Accept & Continue
                        </button>
                    </div>
                </div>
            )}
        </MarketingLayout>
    );
};
