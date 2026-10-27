import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketingLayout } from './MarketingLayout';
import {
    Download,
    ShieldCheck,
    Layout,
    Cpu,
    ArrowRight,
    Sparkles,
    Check,
    ChevronRight,
    Globe,
    ExternalLink,
    CheckCircle2,
    BookOpen,
    Copy,
    MousePointerClick
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

interface ScenarioItem {
    id: string;
    label: string;
    badge: string;
    scenarioTitle: string;
    device: string;
    image: string;
    headline: string;
    caption: string;
    altText: string;
    story: string;
    highlights: string[];
}

const SCENARIO_ITEMS: ScenarioItem[] = [
    {
        id: 'pulpit',
        label: 'Pulpit Delivery',
        badge: 'Sunday Morning Ready',
        scenarioTitle: 'Scenario 1: Sunday Morning at the Pulpit',
        device: 'iPad & Tablet (768px – 1024px)',
        image: '/screenshots/scenarios/scenario5_pulpit_mode.png',
        headline: 'Live Stage Prompter with Target Countdown & Amber Warning',
        caption: 'Preaching with an iPad on the pulpit stand: high-contrast text, 35-minute pacing timer with 5-minute amber alert, and Alt+1..4 sermon part switcher.',
        altText: 'Parchments Pulpit Presentation Mode on an iPad showing the sermon Unshakable Faith in high-contrast typography with a 35-minute countdown clock and stage pacing cues.',
        story: 'When stepping up to preach, the last thing you need is a distracting interface, an unexpected operating system alert, or a frozen cloud connection. Pulpit Mode transforms your iPad or tablet into a distraction-free stage prompter with hands-free pacing timers, amber overtime warnings, and instant access to unscripted scriptures.',
        highlights: [
            'Target preaching countdown timer with 5-min amber warning',
            'Pulsing red overtime alert to respect service pacing',
            'Alt+1..4 quick chips for multi-part sermons & announcements',
            'Stage scripture drawer for unscripted verses during preaching',
            'Compatible with Bluetooth foot pedals and USB presentation clickers'
        ]
    },
    {
        id: 'search',
        label: 'Canonical Word Study',
        badge: 'Deep Concordance',
        scenarioTitle: 'Scenario 2: Tracing Biblical Theology Across the Canon',
        device: 'Desktop Workstation (1440px)',
        image: '/screenshots/scenarios/scenario11_desktop_group_by_book.png',
        headline: 'Group by Book: Canonical Concordance & Density at a Glance',
        caption: 'Explore any theological theme across the whole Bible. The canonical view groups matches into 36 books with Old and New Testament visual density maps (shown here surveying 846 occurrences of "priest").',
        altText: 'Parchments Bible Search modal demonstrating canonical grouping for the word "priest" across 36 Old and New Testament books with chapter spans and expansion bars.',
        story: 'Trace theological themes from Genesis through Revelation without key truncation or missing books. The pre-sorted canonical search engine calculates Old Testament and New Testament density ratios in milliseconds, allowing you to expand individual books or click Expand All to survey evidence across the entire canon.',
        highlights: [
            'Zero truncation: instant full-canon retrieval whether a term appears 5 times or 5,000 times',
            'Segmented List vs By Book view switcher with solid opaque headers',
            'Visual density bars illustrating scriptural concentration per book',
            'Whole-word precision filter (e.g. 478 strict matches for priest)',
            'Multi-book simultaneous expansion with 1-click Expand/Collapse All'
        ]
    },
    {
        id: 'mobile',
        label: 'Mobile Pocket Exegesis',
        badge: 'Mobile Companion',
        scenarioTitle: 'Scenario 3: Pastoral Care & Study on the Move',
        device: 'Mobile Phone (375px – 430px)',
        image: '/screenshots/scenarios/scenario11_mobile_375_group_by_book.png',
        headline: 'Full-Height Touch Drawers & Anti-Zoom Mobile Inputs',
        caption: 'Adaptive 602px search overlay positioned above the bottom navigation bar, with 16px anti-zoom inputs and generous touch targets meeting the strict 48px standard.',
        altText: 'Parchments mobile phone interface at 375px width showing full-height Scripture search drawer, ergonomic tap targets, and bottom navigation bar without browser auto-zoom.',
        story: 'Whether visiting church members in hospital rooms or reviewing sermon points while traveling, Parchments on mobile feels like a native app. Inputs are calibrated at 16px to prevent iOS Safari auto-zoom, while tap targets exceed 48px to eliminate frustrating mis-taps.',
        highlights: [
            'Full viewport height search drawer anchored above the bottom navigation bar',
            '16px font sizing prevents frustrating mobile browser auto-zoom',
            'Strict >= 48px touch targets for effortless thumb navigation',
            'Slide-over touch sheets with safe-area notch awareness',
            '100% offline capability—works completely in Airplane Mode'
        ]
    },
    {
        id: 'vault',
        label: 'Local Markdown Vault',
        badge: 'Zero Lock-In',
        scenarioTitle: 'Scenario 4: 100% Data Sovereignty on Your Drive',
        device: 'Universal Desktop & Web',
        image: '/screenshots/scenarios/scenario9_local_folder_connected.png',
        headline: 'Physical .md Files with Standard YAML Frontmatter',
        caption: 'Connect any folder on your computer. Your sermons and notes stay on your local disk as readable Markdown files—fully compatible with Obsidian, VS Code, and Git backup tools.',
        altText: 'Parchments Storage Foundation settings showing active connection to a local computer folder with direct Markdown file access and zero cloud dependency.',
        story: 'Never worry about subscription price hikes, proprietary file formats, or cloud shutdowns. Your life’s theological work belongs to you in open, portable, standard Markdown on your own hardware. Switch between browser IndexedDB and local physical folders with one-click migration.',
        highlights: [
            'Direct access to physical .md files on your local hard drive',
            'Standard YAML frontmatter metadata (title, tags, created, updated)',
            'Interoperable with Obsidian, VS Code, Zotero, and Git version control',
            'Browser IndexedDB mode includes AES-GCM cryptographic encryption',
            'One-click library export and seamless folder-to-database migration'
        ]
    },
    {
        id: 'voice',
        label: 'Voice-to-Text Studio',
        badge: 'On-Device AI',
        scenarioTitle: 'Scenario 5: Hands-Free Sermon Dictation & Drafting',
        device: 'Desktop & Tablet Studio',
        image: '/screenshots/scenarios/scenario6_voice_note_editor.png',
        headline: '100% On-Device Whisper Voice Transcription',
        caption: 'Dictate sermon outlines and prayer walks with Whisper WebAssembly. Transcribes spoken words directly at the cursor in real time with zero audio sent to any external server.',
        altText: 'Parchments rich text sermon editor with active voice recording waveform and real-time speech transcription inserted at the cursor.',
        story: 'Capture fleeting sermon insights while pacing your office or praying in study. Local AI transcribes your spoken reflections directly into your TipTap rich-text manuscript without risking privacy, transmitting audio files, or leaking sermon drafts to commercial cloud providers.',
        highlights: [
            'Real-time speech-to-text dictation directly at active editor cursor',
            'Whisper WebAssembly models run 100% in local browser Web Workers',
            'Zero audio streamed or uploaded to OpenAI, Google, or Microsoft',
            'Floating audio recording pill with live audio waveform feedback',
            'TipTap rich-text formatting with automatic scripture verse linking'
        ]
    },
    {
        id: 'parallel',
        label: 'Parallel Exegesis Bench',
        badge: 'Academic Rigor',
        scenarioTitle: 'Scenario 6: Academic Original-Language Exegesis',
        device: 'Dual-Column Workstation',
        image: '/screenshots/parallel_bible_desktop.png',
        headline: 'Synchronized Greek TR, Hebrew, and KJV Bench',
        caption: 'Compare original languages side-by-side with synchronized scrolling physics, Strong’s concordance lexicon definitions, and 31,102 Treasury of Scripture Knowledge cross-references.',
        altText: 'Parallel Bible reader displaying Greek Textus Receptus alongside King James Version with Strong Greek lexicon definitions and cross references.',
        story: 'Perform serious exegesis with scholarly precision. Align original Greek and Hebrew texts with the King James Version, hover over any word to inspect grammatical morphology and Strong’s definitions, and cite verses formatted to SBL, Chicago, or Turabian guidelines with a single click.',
        highlights: [
            'Side-by-side translation alignment with synchronized scroll physics',
            'Strong’s Greek and Hebrew Lexicon with morphological insights',
            '31,102 Treasury of Scripture Knowledge (TSK) cross-references',
            'Continuous paragraph flow mode with Masoretic poetry markers',
            'Automated academic citations formatted in SBL, Chicago, and Turabian'
        ]
    },
    {
        id: 'popover',
        label: 'Scripture Popovers',
        badge: 'Zero Context-Switching',
        scenarioTitle: 'Scenario 7: Instant In-Line Scripture Previews & Stage Modals',
        device: 'Desktop Workstation & iPad Prompter',
        image: '/screenshots/scenarios/scenario13_scripture_popover.png',
        headline: 'Hover to Inspect, Tap to Contextualize: Zero Interruptions',
        caption: 'Hover over any scripture reference in your study notes or sermon manuscript to view the full decrypted verse text in a frosted glass popover. Tap on an iPad at the pulpit to open a distraction-free stage reader without losing your place.',
        altText: 'Parchments editor displaying rich sermon notes with a floating frosted glass scripture tooltip displaying Hebrews 11:1 in King James Version alongside the Pulpit Mode stage scripture modal.',
        story: 'Never lose your train of thought looking up a reference in another app or tab. As you write, Parchments automatically recognizes scripture references (like Hebrews 11:1 or Matthew 14:28–31). Simply hover your mouse to read the passage instantly in a frosted popover, click to open it in context in the docked Bible reader, or tap at the pulpit to launch a high-contrast stage modal.',
        highlights: [
            'Real-time auto-recognition as you type with intelligent chapter/verse range parsing',
            'Instant frosted glass hover preview with decrypted scripture text and active version badge',
            'Multi-segment verse support with clear omitted verse dividers (e.g., vv. 2–13 omitted)',
            '1-Click passage jump opening the docked Bible Reader directly to full chapter context',
            'High-contrast Pulpit Scripture Modal for stage reading without losing prompter scroll position',
            '100% offline local decryption—zero external server latency or tracking'
        ]
    }
];

interface InteractiveRefData {
    id: string;
    ref: string;
    version: string;
    headline: string;
    verses: { num: number; text: string }[];
    omittedNotice?: string;
    versesAfter?: { num: number; text: string }[];
    contextDescription: string;
}

const SAMPLE_SCRIPTURES: Record<string, InteractiveRefData> = {
    'heb-11-1': {
        id: 'heb-11-1',
        ref: 'Hebrews 11:1',
        version: 'KJV',
        headline: 'Bedrock Definition of Faith',
        verses: [
            { num: 1, text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' }
        ],
        contextDescription: 'The apostolic definition of confident trust in God\'s promises despite unseen circumstances.'
    },
    'matt-14': {
        id: 'matt-14',
        ref: 'Matthew 14:28–31',
        version: 'KJV',
        headline: 'Stepping Beyond the Boat',
        verses: [
            { num: 28, text: 'And Peter answered him and said, Lord, if it be thou, bid me come unto thee on the water.' },
            { num: 29, text: 'And he said, Come. And when Peter was come down out of the ship, he walked on the water, to go to Jesus.' },
            { num: 30, text: 'But when he saw the wind boisterous, he was afraid; and beginning to sink, he cried, saying, Lord, save me.' },
            { num: 31, text: 'And immediately Jesus stretched forth his hand, and caught him, and said unto him, O thou of little faith, wherefore didst thou doubt?' }
        ],
        contextDescription: 'Peter stepping into the storm: faith empowers action, while distracted gaze prompts immediate divine rescue.'
    },
    'john-1': {
        id: 'john-1',
        ref: 'John 1:1, 14',
        version: 'KJV',
        headline: 'The Incarnation of the Word',
        verses: [
            { num: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' }
        ],
        omittedNotice: 'vv. 2–13 omitted',
        versesAfter: [
            { num: 14, text: 'And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.' }
        ],
        contextDescription: 'Multi-segment parsing demonstrating automatic skipping and visual omitted verse dividers in a single anchor.'
    }
};

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
        feature: 'Smart Scripture Auto-Detection & Hover Popups',
        parchments: 'Built-in (Decrypted hover tooltips + stage modals)',
        logos: 'Cloud lookups / separate panels',
        obsidian: 'Requires third-party community regex plugins',
        notion: 'Not supported (manual copy-paste only)'
    },
    {
        feature: 'Live Sunday Pulpit Deck & Stage Prompter',
        parchments: 'Built-in (Timer, clicker, Alt+1..4)',
        logos: 'Basic presentation mode',
        obsidian: 'Third-party plugins needed',
        notion: 'Not supported'
    },
    {
        feature: 'Canonical Search & 31k TSK Cross-Refs',
        parchments: 'Native (Group by Book + 31k TSK)',
        logos: 'Paid add-on library packs ($$$)',
        obsidian: 'Manual community plugins',
        notion: 'Manual copy-paste'
    },
    {
        feature: 'Universal Form Factors (Desktop, Tablet & Phone)',
        parchments: 'Fluid responsive layout & drawers',
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
        parchments: 'Free & Open Source (GPL v3)',
        logos: '$500 – $2,500+ packages',
        obsidian: 'Free / $8-$10/mo sync',
        notion: '$10-$20/user/mo'
    }
];

export const LandingPage: React.FC = () => {
    const [activeScenarioId, setActiveScenarioId] = useState('pulpit');
    const [activePopoverRef, setActivePopoverRef] = useState('heb-11-1');
    const [copiedRef, setCopiedRef] = useState<string | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('parchments-local-storage-notice');
        if (consent !== 'true') {
            setShowBanner(true);
        }
    }, []);

    const acceptConsent = () => {
        localStorage.setItem('parchments-local-storage-notice', 'true');
        setShowBanner(false);
    };

    const currentScenario = SCENARIO_ITEMS.find(s => s.id === activeScenarioId) || SCENARIO_ITEMS[0];
    const activeSample = SAMPLE_SCRIPTURES[activePopoverRef] || SAMPLE_SCRIPTURES['heb-11-1'];

    return (
        <MarketingLayout>
            {/* Hero Section */}
            <section className="relative pt-20 pb-24 md:pb-32 overflow-hidden" aria-labelledby="hero-heading">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-8"
                    >
                        {/* Live Version Pill */}
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                            <span className="w-2 h-2 bg-primary animate-pulse rounded-full" aria-hidden="true" />
                            <span className="text-[11px] uppercase font-black tracking-widest text-primary">
                                v{APP_VERSION} Live • Desktop, Tablet, Mobile & Zero-Install Web
                            </span>
                        </div>

                        {/* Hero Title */}
                        <h1 id="hero-heading" className="text-5xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.9] max-w-5xl mx-auto italic">
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
                                    className="group min-h-[56px] px-8 py-4 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-primary hover:text-[#121212] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 cursor-pointer touch-manipulation"
                                    aria-label="Download Parchments for Windows 64-bit MSI installer"
                                >
                                    <Download size={22} className="group-hover:animate-bounce" aria-hidden="true" />
                                    <span>Download for Windows</span>
                                </a>

                                <a
                                    href="/app"
                                    className="group min-h-[56px] px-8 py-4 bg-primary text-[#121212] font-black rounded-2xl flex items-center gap-3 hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 cursor-pointer touch-manipulation"
                                    title="Try live in browser without installing"
                                    aria-label="Try Parchments live in your web browser with zero installation"
                                >
                                    <Sparkles size={22} aria-hidden="true" />
                                    <span>Try Live in Browser (Zero Install)</span>
                                </a>

                                <a
                                    href="/guide"
                                    className="group min-h-[56px] px-7 py-4 bg-white/5 text-white font-black rounded-2xl border border-white/10 flex items-center gap-3 hover:bg-white hover:text-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 cursor-pointer touch-manipulation"
                                    aria-label="Read the Parchments User Guide and feature documentation"
                                >
                                    <Layout size={22} aria-hidden="true" />
                                    <span>User Guide</span>
                                </a>
                            </div>

                            {/* Multi-Platform Badges */}
                            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs pt-3" role="list" aria-label="Available operating system platforms">
                                <span className="text-white/40 font-bold uppercase tracking-wider text-[10px] mr-1">All Platforms:</span>
                                
                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_universal.dmg`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                                    title="Download macOS Universal DMG"
                                    aria-label="Download Parchments for macOS Universal DMG"
                                >
                                    <span> macOS (.dmg)</span>
                                </a>

                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_amd64.AppImage`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                                    title="Download Linux AppImage"
                                    aria-label="Download Parchments for Linux AppImage"
                                >
                                    <span>🐧 Linux (.AppImage)</span>
                                </a>

                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_amd64.deb`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                                    title="Download Linux Debian package"
                                    aria-label="Download Parchments for Linux Debian package"
                                >
                                    <span>🐧 Linux (.deb)</span>
                                </a>

                                <a
                                    href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/parchments-android.apk`}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-primary/20 text-white border border-primary/20 hover:border-primary/40 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                                    title="Download Android APK"
                                    aria-label="Download Parchments for Android APK"
                                >
                                    <span>🤖 Android (APK)</span>
                                </a>

                                <button
                                    onClick={() => alert("To install on iOS / iPadOS:\n1. Open Safari.\n2. Navigate to https://parchments.vercel.app\n3. Tap the Share button in Safari.\n4. Tap 'Add to Home Screen'.")}
                                    className="min-h-[44px] px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/10 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                                    title="Instructions for iPad and iPhone PWA installation"
                                    aria-label="Instructions for installing Parchments as an iOS progressive web application"
                                >
                                    <span>📱 iOS (PWA Setup)</span>
                                </button>

                                <a
                                    href="/app"
                                    className="min-h-[44px] px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
                                    title="Launch Parchments instantly in any modern web browser"
                                    aria-label="Launch Parchments web application"
                                >
                                    <Globe size={14} aria-hidden="true" />
                                    <span>🌐 Web App (Zero Install)</span>
                                </a>
                            </div>

                            <div className="pt-2">
                                <a
                                    href="https://github.com/patrickudo2004/parchments/releases"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-white/40 hover:text-primary transition-colors underline flex items-center gap-1.5"
                                    aria-label="View all releases and SHA-256 checksums on GitHub"
                                >
                                    <span>View all releases, SHA-256 checksums & source code on GitHub</span>
                                    <ExternalLink size={12} aria-hidden="true" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Interactive Live Scripture Popover Playground */}
            <section
                id="interactive-scripture-playground"
                className="py-16 md:py-24 relative border-t border-white/5 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent overflow-hidden"
                aria-labelledby="interactive-preview-heading"
            >
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-10 space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <MousePointerClick size={14} className="text-primary" aria-hidden="true" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Interactive Preview • Zero Context-Switching</span>
                        </div>
                        <h2 id="interactive-preview-heading" className="text-3xl md:text-5xl font-black tracking-tight">
                            Hover to inspect. Tap to read. Zero interruptions.
                        </h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base">
                            Type any scripture reference in your study manuscript and Parchments automatically links it. Hover your mouse or tap with your finger below to experience instant in-line scripture decryption.
                        </p>
                    </div>

                    {/* Interactive Editor Simulator Card */}
                    <div className="rounded-3xl border border-white/10 bg-[#16161a] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                        {/* Fake Window Chrome */}
                        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10 text-xs text-white/40">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                                <span className="ml-3 font-mono text-[11px] text-white/60">Study Journal • Unshakable Faith.md</span>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 text-[10px] uppercase tracking-wider font-bold text-primary">
                                <Sparkles size={11} /> Auto-Linked References
                            </span>
                        </div>

                        {/* Interactive Manuscript Text */}
                        <div className="space-y-4 font-serif text-base sm:text-lg text-white/90 leading-relaxed">
                            <p>
                                Biblical faith is not passive resignation; it is stepping boldly upon the Word when physical circumstances seem impossible. As the author of Hebrews reminds every believer:
                            </p>
                            <blockquote className="border-l-2 border-primary pl-4 italic my-3 text-white/80">
                                "Now faith is the substance of things hoped for, the evidence of things not seen."
                            </blockquote>
                            <p className="font-sans text-xs sm:text-sm font-bold uppercase tracking-wider text-white/40 pt-2">
                                Select or hover over an anchor reference to inspect:
                            </p>
                        </div>

                        {/* Interactive Scripture Reference Pills */}
                        <div className="flex flex-wrap items-center gap-3 pt-3 pb-8" role="tablist" aria-label="Sample Scripture References">
                            {Object.values(SAMPLE_SCRIPTURES).map((item) => {
                                const isSelected = activePopoverRef === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        id={`sample-pill-${item.id}`}
                                        role="tab"
                                        aria-selected={isSelected}
                                        onClick={() => setActivePopoverRef(item.id)}
                                        onMouseEnter={() => setActivePopoverRef(item.id)}
                                        onFocus={() => setActivePopoverRef(item.id)}
                                        className={`min-h-[46px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border cursor-pointer active:scale-95 touch-manipulation ${
                                            isSelected
                                                ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20 scale-105'
                                                : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10'
                                        }`}
                                    >
                                        <BookOpen size={14} className={isSelected ? 'text-black' : 'text-primary'} aria-hidden="true" />
                                        <span>{item.ref}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-black ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'}`}>
                                            {item.version}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Live Floating Frosted Popover Card (Simulating Exact In-App Tooltip) */}
                        <AnimatePresence mode="wait">
                            {activeSample && (
                                <motion.div
                                    key={activeSample.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-2xl border border-primary/30 bg-[#121214]/95 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl relative"
                                    role="region"
                                    aria-label={`Scripture preview for ${activeSample.ref}`}
                                >
                                    {/* Popover Header */}
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                                <BookOpen size={16} aria-hidden="true" />
                                            </div>
                                            <div>
                                                <span className="font-mono text-xs font-black uppercase tracking-widest text-primary">
                                                    {activeSample.ref}
                                                </span>
                                                <span className="ml-2 bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white/70">
                                                    {activeSample.version}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const fullText = activeSample.verses.map(v => `${v.num}. ${v.text}`).join(' ');
                                                navigator.clipboard?.writeText(`${activeSample.ref} (${activeSample.version}) - ${fullText}`);
                                                setCopiedRef(activeSample.id);
                                                setTimeout(() => setCopiedRef(null), 2000);
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation min-h-[36px]"
                                            title="Copy scripture to clipboard"
                                            aria-label={`Copy ${activeSample.ref} text`}
                                        >
                                            {copiedRef === activeSample.id ? (
                                                <>
                                                    <Check size={13} className="text-emerald-400" />
                                                    <span className="text-emerald-400">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={13} />
                                                    <span>Copy Verse</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Scripture Text Body */}
                                    <div className="font-serif italic text-white/95 text-base sm:text-lg leading-relaxed space-y-2">
                                        <p>
                                            {activeSample.verses.map((v) => (
                                                <span key={v.num} className="mr-1.5">
                                                    <sup className="text-xs font-bold font-sans text-primary mr-1 not-italic">
                                                        {v.num}
                                                    </sup>
                                                    {v.text}
                                                </span>
                                            ))}
                                        </p>

                                        {activeSample.omittedNotice && (
                                            <div className="flex items-center justify-center my-3 select-none not-italic font-sans">
                                                <div className="h-px bg-white/10 flex-1" />
                                                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 px-3">
                                                    ••• {activeSample.omittedNotice} •••
                                                </span>
                                                <div className="h-px bg-white/10 flex-1" />
                                            </div>
                                        )}

                                        {activeSample.versesAfter && (
                                            <p>
                                                {activeSample.versesAfter.map((v) => (
                                                    <span key={v.num} className="mr-1.5">
                                                        <sup className="text-xs font-bold font-sans text-primary mr-1 not-italic">
                                                            {v.num}
                                                        </sup>
                                                        {v.text}
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                    </div>

                                    {/* Context Caption & Direct Navigation Action */}
                                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/50">
                                        <span>{activeSample.contextDescription}</span>
                                        <a
                                            href="/app"
                                            className="text-primary hover:underline font-bold inline-flex items-center gap-1 shrink-0"
                                        >
                                            <span>Open in full Bible Reader</span>
                                            <ChevronRight size={14} />
                                        </a>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* Scenario-Driven Interactive Showcase */}
            <section id="scenarios" className="py-20 md:py-28 relative border-t border-white/5" aria-labelledby="scenarios-heading">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <Sparkles size={14} className="text-primary" aria-hidden="true" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Scenario-Driven Walkthrough</span>
                        </div>
                        <h2 id="scenarios-heading" className="text-3xl md:text-6xl font-black tracking-tight">
                            Real ministry workflows. Proven on stage and screen.
                        </h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-base md:text-lg">
                            Explore how Parchments handles authentic study and preaching scenarios across desktop workstations, tablet touchscreens, and mobile devices.
                        </p>
                    </div>

                    {/* Scenario Navigation Tabs (WAI-ARIA Tablist) */}
                    <div
                        role="tablist"
                        aria-label="Parchments Feature Scenarios"
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-10"
                    >
                        {SCENARIO_ITEMS.map((item) => {
                            const isActive = item.id === activeScenarioId;
                            return (
                                <button
                                    key={item.id}
                                    role="tab"
                                    id={`tab-${item.id}`}
                                    aria-selected={isActive}
                                    aria-controls={`panel-${item.id}`}
                                    onClick={() => setActiveScenarioId(item.id)}
                                    className={`min-h-[58px] p-3.5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98] touch-manipulation ${
                                        isActive
                                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-black uppercase tracking-wider truncate ${isActive ? 'text-primary' : 'text-white/60'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-white/40 font-medium leading-tight truncate">
                                        {item.badge}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Scenario Showcase Panel */}
                    <div
                        role="tabpanel"
                        id={`panel-${currentScenario.id}`}
                        aria-labelledby={`tab-${currentScenario.id}`}
                        className="relative bg-[#0c0c0c] border border-white/10 rounded-[32px] p-6 md:p-10 shadow-2xl overflow-hidden"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                            {/* Left Column: Visual Capture Frame */}
                            <div className="lg:col-span-7 flex flex-col gap-4">
                                <div className="relative bg-[#050505] rounded-2xl border border-white/10 overflow-hidden shadow-2xl aspect-[16/10] group">
                                    {/* Mock Browser/Window Header */}
                                    <div className="h-10 bg-white/[0.03] border-b border-white/5 flex items-center justify-between px-4 select-none">
                                        <div className="flex items-center gap-2" aria-hidden="true">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                        </div>
                                        <div className="text-[11px] text-white/40 font-mono flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                                            <span>parchments.app • {currentScenario.device}</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
                                            Live Capture
                                        </span>
                                    </div>

                                    {/* Real Chrome Visual Capture */}
                                    <div className="relative w-full h-[calc(100%-40px)] bg-[#050505] flex items-center justify-center p-2">
                                        <img
                                            src={currentScenario.image}
                                            alt={currentScenario.altText}
                                            className="w-full h-full object-contain object-top rounded-lg shadow-md"
                                        />
                                    </div>
                                </div>

                                {/* Scenario Device & Caption */}
                                <div className="px-2 flex items-center justify-between text-xs text-white/50">
                                    <span className="font-mono">{currentScenario.device}</span>
                                    <span className="text-white/40 text-[11px]">Real Chrome E2E Scenario Verification Capture</span>
                                </div>
                            </div>

                            {/* Right Column: Scenario Narrative & Highlights */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[11px] font-black uppercase tracking-wider">
                                        <span>{currentScenario.scenarioTitle}</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                                        {currentScenario.headline}
                                    </h3>
                                    <p className="text-white/60 text-sm md:text-base leading-relaxed pt-2">
                                        {currentScenario.story}
                                    </p>
                                </div>

                                {/* Key Scenario Highlights */}
                                <div className="space-y-2.5 pt-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Verified Invariants</h4>
                                    <ul className="space-y-2" aria-label={`Key features of ${currentScenario.headline}`}>
                                        {currentScenario.highlights.map((h, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-white/70">
                                                <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{h}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Interactive Call to Action */}
                                <div className="pt-4 flex flex-wrap items-center gap-4">
                                    <a
                                        href="/app"
                                        className="min-h-[48px] px-6 py-3 bg-primary text-[#121212] font-black rounded-xl flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 cursor-pointer touch-manipulation text-xs"
                                        aria-label={`Test ${currentScenario.label} directly in the live web app`}
                                    >
                                        <span>Launch Live Workspace</span>
                                        <ArrowRight size={16} aria-hidden="true" />
                                    </a>
                                    <a
                                        href="/guide"
                                        className="min-h-[48px] px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 text-xs touch-manipulation"
                                    >
                                        <span>Read Scenario Guide</span>
                                        <ChevronRight size={16} aria-hidden="true" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* "Why Parchments?" Deep Comparison Table */}
            <section id="comparison" className="py-24 md:py-32 relative border-t border-white/5" aria-labelledby="comparison-heading">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 md:mb-20 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                            <Cpu size={14} className="text-primary" aria-hidden="true" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Uncompromising Independence</span>
                        </div>
                        <h2 id="comparison-heading" className="text-3xl md:text-6xl font-black tracking-tight">
                            Why Choose Parchments?
                        </h2>
                        <p className="text-white/60 max-w-2xl mx-auto text-base md:text-lg">
                            See how Parchments compares to traditional Bible software, general note-taking apps, and cloud tools.
                        </p>
                    </div>

                    {/* Responsive Comparison Table Container */}
                    <div className="overflow-x-auto rounded-[32px] border border-white/10 bg-[#0c0c0c] shadow-2xl">
                        <table className="w-full text-left border-collapse min-w-[720px]">
                            <caption className="sr-only">Feature comparison between Parchments, Logos, Obsidian, and Notion</caption>
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.02]">
                                    <th scope="col" className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/3">
                                        Capability / Invariant
                                    </th>
                                    <th scope="col" className="p-6 text-xs font-black uppercase tracking-widest text-primary w-1/4 bg-primary/5">
                                        Parchments
                                    </th>
                                    <th scope="col" className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/6">
                                        Logos
                                    </th>
                                    <th scope="col" className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/6">
                                        Obsidian
                                    </th>
                                    <th scope="col" className="p-6 text-xs font-black uppercase tracking-widest text-white/50 w-1/6">
                                        Notion / YouVersion
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {COMPARISON_DATA.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                        <th scope="row" className="p-6 font-semibold text-white/90 text-left">
                                            {row.feature}
                                        </th>
                                        <td className="p-6 font-bold text-primary bg-primary/5">
                                            <div className="flex items-center gap-2">
                                                <Check size={16} className="text-primary shrink-0" aria-hidden="true" />
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

            {/* Final CTA */}
            <section className="py-32 md:py-44 relative overflow-hidden" aria-labelledby="cta-heading">
                <div className="max-w-5xl mx-auto px-6 text-center space-y-10">
                    <div className="space-y-4">
                        <h2 id="cta-heading" className="text-4xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight">
                            THE WORD IS <br />DEEP. <span className="text-primary">DIVE IN.</span>
                        </h2>
                        <p className="text-white/50 max-w-xl mx-auto text-base md:text-lg">
                            Download the native app for your computer, or open the interactive web workspace instantly with zero installation.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        <a
                            href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_x64_en-US.msi`}
                            className="min-h-[56px] inline-flex items-center gap-3 px-10 py-5 bg-white text-[#121212] font-black rounded-[24px] hover:bg-primary hover:text-black hover:scale-105 active:scale-95 transition-all shadow-2xl text-base touch-manipulation cursor-pointer"
                            aria-label="Download Parchments for Windows installer"
                        >
                            <Download size={22} aria-hidden="true" />
                            <span>Download Windows .msi</span>
                        </a>

                        <a
                            href="/app"
                            className="min-h-[56px] inline-flex items-center gap-3 px-10 py-5 bg-primary text-[#121212] font-black rounded-[24px] hover:scale-105 active:scale-95 transition-all shadow-3xl shadow-primary/20 text-base touch-manipulation cursor-pointer"
                            aria-label="Launch interactive web app without installation"
                        >
                            <Sparkles size={22} aria-hidden="true" />
                            <span>Launch Web App (Zero Install)</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Local-First Storage & Cookieless Analytics Notice (UK/EU GDPR & PECR Compliant) */}
            {showBanner && (
                <div
                    role="region"
                    aria-label="Local storage and privacy notice"
                    className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[460px] z-[100] bg-[#0c0c0c]/95 backdrop-blur-2xl border border-white/10 p-6 rounded-[28px] shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary mt-0.5 animate-pulse shrink-0" aria-hidden="true">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="space-y-1">
                            <h5 className="font-bold text-sm text-white">Local-First Storage & Privacy Notice</h5>
                            <p className="text-xs text-white/60 leading-relaxed">
                                Parchments operates 100% offline-first. We use browser IndexedDB and localStorage strictly on your device to persist Bibles and study notes with AES-GCM encryption. We do not use tracking cookies. Aggregate, cookieless metrics are processed via Vercel Analytics.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <a
                            href="/privacy"
                            className="min-h-[44px] px-3 py-2 flex items-center text-xs font-semibold text-white/60 hover:text-white transition-colors"
                            aria-label="Read our full Privacy Policy"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="/accessibility"
                            className="min-h-[44px] px-3 py-2 flex items-center text-xs font-semibold text-white/60 hover:text-white transition-colors"
                            aria-label="Read our Accessibility Statement"
                        >
                            Accessibility
                        </a>
                        <button
                            onClick={acceptConsent}
                            className="min-h-[44px] px-5 py-2 bg-primary hover:scale-105 active:scale-95 text-[#121212] text-xs font-bold rounded-full transition-all shadow-md shadow-primary/10 cursor-pointer touch-manipulation"
                            aria-label="Acknowledge local storage notice and continue"
                        >
                            Accept & Continue
                        </button>
                    </div>
                </div>
            )}
        </MarketingLayout>
    );
};
