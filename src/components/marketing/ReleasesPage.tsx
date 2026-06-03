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
        version: "v0.1.1 (Beta)",
        date: "June 3, 2026",
        isLatest: true,
        description: "Mobile sandbox database isolation, recursive note synchronization, scroll state stabilization, and desktop update center.",
        features: [
            "Desktop Auto-Updater: Direct signature updates from GitHub Releases right in the settings panel.",
            "Releases Timeline: Premium releases and changelog view tracking project milestones."
        ],
        improvements: [
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
