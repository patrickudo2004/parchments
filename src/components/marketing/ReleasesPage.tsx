import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bug, CheckCircle, ArrowLeft, GitCommit, ExternalLink } from 'lucide-react';
import { MarketingLayout } from './MarketingLayout';

interface ReleaseItem {
    version: string;
    date: string;
    isLatest: boolean;
    description: string;
    features: string[];
    improvements: string[];
    fixes: string[];
}

const RELEASES: ReleaseItem[] = [
    {
        version: "v0.1.8 (Beta)",
        date: "October 4, 2026",
        isLatest: true,
        description: "Mobile UX overhaul: Pulpit Mode is now fully accessible on touch devices, Lectio Mode is reachable from the mobile action sheet, and iOS home indicator clipping is fixed.",
        features: [
            "Pulpit Mode Touch Exit: Swipe down anywhere on the Pulpit Mode overlay to exit — no keyboard required on mobile.",
            "Lectio Mode in Mobile Action Sheet: Lectio Study Center is now accessible from the '+' action sheet on the mobile navigation bar.",
            "Dedicated Mobile Pulpit Controls: A full-width mobile control strip (Scroll/Paginate, Auto-Scroll toggle, Page nav, A-/A+ font) replaces the hidden desktop toolbar on small screens.",
        ],
        improvements: [
            "Pulpit Mode z-index raised to z-[90] so it correctly overlays the MobileNav bar (was z-50, below z-[70]).",
            "Removed root-level `select-none` from Pulpit Mode which was suppressing touch events on all control buttons.",
            "All Pulpit Mode timer and page navigation buttons now meet the 36–40px minimum touch target size.",
            "Exit button in Pulpit Mode is always visible and prominently labelled on mobile ('Exit Pulpit' instead of icon-only).",
            "MobileNav safe-area inset now uses `env(safe-area-inset-bottom)` instead of an undefined CSS variable — fixes home indicator overlap on iOS.",
            "Removed dead code `pulpitMode` banner branch in RichTextEditor that was never rendered (early return at PulpitMode component level).",
            "Swipe hint pill shown at the top of Pulpit Mode on mobile for discoverability.",
        ],
        fixes: [
            "Pulpit Mode Exit button was inaccessible on all mobile devices (no touch gesture, keyboard Escape only).",
            "Lectio Mode had no entry point on mobile — TopBar (where the button lived) is hidden on mobile.",
            "Safe area padding on MobileNav resolved to 0px on all devices due to undefined CSS variable.",
        ]
    },
    {
        version: "v0.1.7 (Beta)",
        date: "October 3, 2026",
        isLatest: false,
        description: "Zero-server local Wi-Fi & hotspot collaboration, embedded Rust WebSocket relay, host knock-to-join approval, Co-Editor vs. Presentation Follower modes, and Markdown frontmatter properties.",
        features: [
            "Zero-Server Local Wi-Fi Sync: Completely replaced external third-party signaling servers (Deno/Fly.dev) with an embedded Rust WebSocket server (tokio-tungstenite) running on port 48921.",
            "Cross-Platform Multi-Device Sync: Real-time note sharing between Windows, macOS, Linux, Android, and iOS across local Wi-Fi or mobile hotspots with zero internet connection required.",
            "Host Knock-to-Join Security: QR code contains a 32-character cryptographic session token. Connecting devices require explicit Host 'Allow / Deny' authorization before note data is exchanged.",
            "Co-Editor & Presentation Follower Modes: Joining devices choose between full bidirectional CRDT editing or a read-only presentation follower view (ideal for teleprompters and preaching).",
            "Document Frontmatter Properties: Interactive document properties card supporting Speaker, Series, Date, Scripture, and custom key-value metadata with bidirectional Markdown round-tripping.",
            "Offline Resilient Reconnection: 3-second heartbeat with exponential backoff auto-reconnect and automatic Yjs state vector synchronization."
        ],
        improvements: [
            "Retired all external signaling URLs (wss://parchments-signaling.patrickudo2004.deno.net, wss://signaling.yjs.dev, wss://y-webrtc.fly.dev).",
            "LAN IP discovery using zero-packet UDP socket allocation without leaking external network traffic.",
            "Persistent top-right toast overlay ensures hosts never miss a connection knock regardless of active panel."
        ],
        fixes: [
            "Eliminated dependency on third-party Deno signaling infrastructure for study and sermon collaboration.",
            "Preserved Markdown frontmatter and custom document properties during loose file import and export."
        ]
    },
    {
        version: "v0.1.6 (Beta)",
        date: "October 2, 2026",
        isLatest: false,
        description: "Advanced scripture reference parsing with discontinuous verse groups, semicolon chained chapter references, unified tooltip cards with omission dividers, and multi-verse reader highlighting.",
        features: [
            "Discontinuous Verse Groups: Type references like '1 Cor 14:4, 14-15' and Parchments will parse, display, and highlight each verse segment individually — with omission dividers between gaps.",
            "Chained Chapter References: Semicolon syntax (e.g. 'Gen 6:13; 7:4') creates independent, clickable anchors for each chapter segment, inheriting the book context automatically.",
            "Unified Tooltip Card with Omission Dividers: Hovering over a multi-segment reference shows a single card with passage groups separated by '••• vv. X–Y omitted •••' notices (Logos-style).",
            "Multi-Verse Reader Highlighting: Opening a multi-segment reference highlights all matching verses across the Bible reader simultaneously.",
            "Multi-Segment [[...]] Blockquote Quoting: Double-bracket quoting inserts all verse segments joined with '[...]' dividers for clean formatted excerpts."
        ],
        improvements: [
            "Compound input rule for chained references processes the entire 'Book Chapter:Verses; Chapter:Verses' pattern in a single pass.",
            "Block-level scanner (scanScriptureReferences) now traverses full paragraph content for reliable auto-marking of existing notes.",
            "Enhanced continuation rule with raw-text fallback to reliably inherit book context for semicolon-chained references."
        ],
        fixes: [
            "Chained references (Gen 6:13; 7:4) were silently dropped because the semicolon blocked the standard space-trigger rule. Fixed via compound input rule placed first in the rule array.",
            "Block scanner now correctly computes node offsets using pos+1 to avoid off-by-one mark placement errors."
        ]
    },
    {
        version: "v0.1.5 (Beta)",
        date: "October 2, 2026",
        isLatest: false,
        description: "Interactive Scripture Tooltips with multi-verse previewing, reliable compound index querying, hover debounce protection, and automated multi-platform release publishing.",
        features: [
            "Interactive Scripture Tooltip: Hover over any linked scriptural reference or inline tag to preview decrypted passage text instantly without losing your study position.",
            "Multi-Verse & Nested Markup Previews: Preview single verses and scripture spans (e.g., John 3:16-17) smoothly, even when references contain bold, italic, or custom formatting.",
            "Automated GitHub Releases: Multi-platform desktop builds (Windows MSI/EXE, macOS DMG, Linux AppImage/deb) and Android APKs now publish directly as public GitHub releases."
        ],
        improvements: [
            "Compound Index Querying: Robust Dexie compound index lookups for multi-word books (Song of Solomon, 1 John, 1 Samuel) resolving complex passage names accurately.",
            "Tooltip Hover Debounce: 200ms grace window allows moving the cursor into the tooltip popup to read, select, or copy passage text without premature closing.",
            "Active Fetch Race Guard: Prevents out-of-order text popups when quickly moving the cursor across multiple references."
        ],
        fixes: [
            "Scripture reference target selection inside nested rich text elements (closest .scripture-ref).",
            "Automated release workflow draft flag configuration for instant public availability."
        ]
    },
    {
        version: "v0.1.4 (Beta)",
        date: "September 11, 2026",
        isLatest: false,
        description: "Expanded biblical corpus with 7 new translations & original languages, comprehensive study commentaries, Treasury of Scripture Knowledge cross-references, Easton's Bible Dictionary, and Pulpit mode.",
        features: [
            "7 New Biblical Texts: Hebrew WLC (with full RTL support), Greek Textus Receptus, Greek Septuagint (LXX), ASV, Young's Literal Translation (YLT), Darby, and Douay-Rheims (DRC).",
            "TSK Cross-References: Over 31,000 cross-reference entries with chunked Dexie ingestion to explore scriptural connections.",
            "Matthew Henry & JFB Commentaries: Verse-by-verse commentary drawers integrated into the study sidebar.",
            "Easton's Bible Dictionary: Rich definitions and historical context for biblical terms, names, and places.",
            "Pulpit Teleprompter Mode: High-contrast, distraction-free sermon delivery view with adjustable pacing and font scaling.",
            "Double-Bracket Scripture Quoting: Type [[John 3:16]] in the editor to automatically insert decrypted scripture blocks."
        ],
        improvements: [
            "Chunked Background Ingestion: High-volume dataset imports run asynchronously with non-blocking progress indicators.",
            "RTL Typography: Specialized right-to-left layout and Hebrew font support for original text study."
        ],
        fixes: [
            "Contextual fallback for study sidebars to automatically display the active reading passage when no verse is explicitly focused."
        ]
    },
    {
        version: "v0.1.3 (Beta)",
        date: "September 8, 2026",
        isLatest: false,
        description: "Expository sermon outlining enhancements, workspace persistence & stability, and refined scripture navigation.",
        features: [
            "Expository Outliner: Structured tree navigation for sermon points and sub-points linked to biblical passages.",
            "Quick Reference Lookup: Direct verse jump input with suggestion pills in study sidebars."
        ],
        improvements: [
            "Workspace Persistence: Automatic local caching and state recovery across app restarts.",
            "Reader Caching: Improved IndexedDB reader query performance."
        ],
        fixes: [
            "Dexie database connection pooling and transaction lifecycle stability."
        ]
    },
    {
        version: "v0.1.2 (Beta)",
        date: "July 25, 2026",
        isLatest: false,
        description: "AES-GCM Scripture encryption, mobile UI action sheet, PWA manifest, and copyright cleanliness.",
        features: [
            "AES-GCM Scripture Encryption: Offline database verses encrypted at rest with authenticated encryption (ENC::v1::).",
            "Progressive Web App (PWA): Standalone mobile installation support with offline caching."
        ],
        improvements: [
            "Mobile UI Action Sheet: Bottom sheet navigation tailored for touch devices.",
            "Optimized font rendering across high-DPI displays."
        ],
        fixes: [
            "Cleaned legacy metadata and standardized licensing."
        ]
    },
    {
        version: "v0.1.1 (Beta)",
        date: "June 3, 2026",
        isLatest: false,
        description: "Mobile sandbox database isolation, recursive note synchronization, scroll state stabilization, and desktop update center.",
        features: [
            "Desktop Auto-Updater: Direct signature updates from GitHub Releases right in the settings panel.",
            "Releases Timeline: Premium releases and changelog view tracking project milestones.",
            "Android APK Package: Mobile client releases compiled automatically and attached to GitHub draft releases."
        ],
        improvements: [
            "Capacitor Mobile Filesystem: Native OS file permission prompts and local storage writing to Documents/Parchments on Android/iOS.",
            "Recursive Note Replication: Pre-warms closed study plan notes recursively over WebRTC rooms to load full historical note archives on linked phone clients.",
            "Sandbox Workspace Explorer: Automatically displays virtual folder trees inside mobile browsers without requiring native directory handles."
        ],
        fixes: [
            "Flickering Scripture Reader: Fixed unmounting of text readers and scrollbar resets during filesystem scans.",
            "P2P Path Binding: Synced files now cleanly resolve directory hierarchies and nest properly in mobile layouts."
        ]
    },
    {
        version: "v0.1.0 (Beta)",
        date: "June 1, 2026",
        isLatest: false,
        description: "Initial public beta release introducing multi-device P2P note sync, local workspaces, and the Lectio companion.",
        features: [
            "Lectio Mode: Structured layout combining daily scripture tracks with a focused Tiptap study journal.",
            "Local Directory Access: Access native files on your computer with offline-first indexing.",
            "WebRTC Sync Discovery: Fast, peer-to-peer room pairing utilizing decentralized signaling."
        ],
        improvements: [
            "Deep Dark Mode Styling: Curated dark palette using deep HSL gradients and rich typography.",
            "Portability: Notes are saved as simple, highly portable HTML files containing clean metadata."
        ],
        fixes: [
            "Initial workspace bootstrapping and Bible seeding logic."
        ]
    }
];

export const ReleasesPage: React.FC = () => {
    return (
        <MarketingLayout>
            <div className="max-w-5xl mx-auto px-6 py-20">
                {/* Back button */}
                <div className="mb-12">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors group text-sm font-semibold"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </a>
                </div>

                {/* Header */}
                <div className="mb-20 text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-4 leading-none">
                        Releases & Updates
                    </h1>
                    <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
                        Track the evolution of Parchments. Explore new features, performance improvements, and bugs resolved by our team.
                    </p>
                </div>

                {/* Releases Timeline */}
                <div className="relative border-l border-white/10 pl-6 md:pl-10 space-y-16 ml-2 md:ml-4">
                    {RELEASES.map((release, index) => (
                        <motion.div
                            key={release.version}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="relative group"
                        >
                            {/* Bullet indicator */}
                            <div className={`absolute left-[-31px] md:left-[-47px] top-1.5 w-4 h-4 rounded-full border-4 border-[#050505] transition-all group-hover:scale-125 ${
                                release.isLatest 
                                    ? 'bg-primary ring-4 ring-primary/20' 
                                    : 'bg-white/20'
                            }`} />

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8 hover:border-primary/20 transition-all shadow-xl backdrop-blur-md">
                                {/* Release Meta */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">{release.version}</h3>
                                        {release.isLatest && (
                                            <span className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold rounded-full tracking-wider">
                                                Latest Release
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-white/40">{release.date}</span>
                                </div>

                                <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 border-b border-white/5 pb-6">
                                    {release.description}
                                </p>

                                {/* Release Details */}
                                <div className="grid grid-cols-1 gap-8">
                                    {release.features.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs uppercase font-black text-primary tracking-widest flex items-center gap-1.5">
                                                <Sparkles size={14} /> New Features
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/50 list-none pl-0">
                                                {release.features.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-2.5">
                                                        <GitCommit size={14} className="text-primary mt-1 shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {release.improvements.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs uppercase font-black text-blue-400 tracking-widest flex items-center gap-1.5">
                                                <CheckCircle size={14} /> Improvements
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/50 list-none pl-0">
                                                {release.improvements.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-2.5">
                                                        <GitCommit size={14} className="text-blue-400 mt-1 shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {release.fixes.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs uppercase font-black text-green-400 tracking-widest flex items-center gap-1.5">
                                                <Bug size={14} /> Bug Fixes
                                            </h4>
                                            <ul className="space-y-2 text-sm text-white/50 list-none pl-0">
                                                {release.fixes.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-2.5">
                                                        <GitCommit size={14} className="text-green-400 mt-1 shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer notes */}
                <div className="mt-16 text-center">
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
                        <span>Check out all code revisions on</span>
                        <a
                            href="https://github.com/patrickudo2004/parchments"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-primary transition-colors flex items-center gap-1"
                        >
                            GitHub <ExternalLink size={10} />
                        </a>
                    </p>
                </div>
            </div>
        </MarketingLayout>
    );
};
