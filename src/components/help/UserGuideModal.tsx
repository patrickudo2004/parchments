import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    BookOpen,
    Zap,
    Mic,
    ShieldCheck,
    Share2,
    Calendar,
    ChevronRight,
    ExternalLink,
    HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Import raw markdown guides
// @ts-ignore
import gettingStartedMd from '@/docs/guides/getting-started.md?raw';
// @ts-ignore
import scriptureIntelligenceMd from '@/docs/guides/scripture-intelligence.md?raw';
// @ts-ignore
import pulpitModeMd from '@/docs/guides/pulpit-mode.md?raw';
// @ts-ignore
import lectioDivinaMd from '@/docs/guides/lectio-divina.md?raw';
// @ts-ignore
import syncPrivacyMd from '@/docs/guides/sync-privacy.md?raw';
// @ts-ignore
import exportCollaborationMd from '@/docs/guides/export-collaboration.md?raw';

interface GuideChapter {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    content: string;
}

const CHAPTERS: GuideChapter[] = [
    {
        id: 'getting-started',
        title: 'Getting Started & Workspace',
        description: 'Folders, Studyspace, outlines, voice dictation, and shortcuts.',
        icon: BookOpen,
        content: gettingStartedMd,
    },
    {
        id: 'scripture-intelligence',
        title: 'Scripture Intelligence & Exegesis',
        description: "Citation tags, Strong's Concordance, TSK cross-refs, and pins.",
        icon: Zap,
        content: scriptureIntelligenceMd,
    },
    {
        id: 'pulpit-mode',
        title: 'Pulpit Mode & Sermon Delivery',
        description: 'Stage teleprompter, in-pulpit scriptures, note switching, and themes.',
        icon: Mic,
        content: pulpitModeMd,
    },
    {
        id: 'lectio-divina',
        title: 'Lectio Divina & Study Plans',
        description: '5-stage spiritual workflow, 6 study paradigms, and .ics calendar export.',
        icon: Calendar,
        content: lectioDivinaMd,
    },
    {
        id: 'sync-privacy',
        title: 'Zero-Server Sync & Privacy',
        description: 'Local P2P mesh, AES-GCM encryption, QR pairing, and CRDTs.',
        icon: ShieldCheck,
        content: syncPrivacyMd,
    },
    {
        id: 'export-collaboration',
        title: 'Exporting & Collaboration',
        description: 'Word (.docx), PDF, Markdown, and real-time team Study Spaces.',
        icon: Share2,
        content: exportCollaborationMd,
    },
];

interface UserGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialChapterId?: string;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
    isOpen,
    onClose,
    initialChapterId = 'getting-started',
}) => {
    const [selectedChapterId, setSelectedChapterId] = useState<string>(initialChapterId);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

    const activeChapter = useMemo(() => {
        return CHAPTERS.find(c => c.id === selectedChapterId) || CHAPTERS[0];
    }, [selectedChapterId]);

    const filteredChapters = useMemo(() => {
        if (!searchQuery.trim()) return CHAPTERS;
        const q = searchQuery.toLowerCase();
        return CHAPTERS.filter(c =>
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.content.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    className="w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="h-16 px-4 sm:px-6 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0 bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <HelpCircle size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-black tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">
                                        Parchments User Guide
                                    </h2>
                                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                                        Docs & Reference
                                    </span>
                                </div>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate hidden sm:block">
                                    Everything you need to master scripture study and sermon preparation
                                </p>
                            </div>
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative hidden md:block w-56">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Search guide topics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl focus:outline-none focus:border-primary text-light-text-primary dark:text-dark-text-primary"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-light-text-secondary hover:text-light-text-primary"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
                                className="md:hidden px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-text-primary dark:text-dark-text-primary bg-light-background dark:bg-dark-background"
                            >
                                Chapters
                            </button>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-2xl hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary active:scale-95"
                                title="Close guide (Esc)"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex overflow-hidden relative">
                        {/* Chapters Sidebar */}
                        <aside
                            className={`w-full md:w-72 lg:w-80 border-r border-light-border dark:border-dark-border bg-light-sidebar dark:bg-dark-sidebar flex flex-col shrink-0 transition-transform md:translate-x-0 absolute md:static inset-y-0 left-0 z-20 ${
                                isSidebarOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                            }`}
                        >
                            {/* Mobile search bar */}
                            <div className="p-3 border-b border-light-border dark:border-dark-border md:hidden">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Search guide..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-xs bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl focus:outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="p-2 flex-1 overflow-y-auto space-y-1">
                                {filteredChapters.map((chapter) => {
                                    const IconComponent = chapter.icon;
                                    const isSelected = chapter.id === activeChapter.id;
                                    return (
                                        <button
                                            key={chapter.id}
                                            onClick={() => {
                                                setSelectedChapterId(chapter.id);
                                                setIsSidebarOpenMobile(false);
                                            }}
                                            className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 min-h-[48px] touch-manipulation ${
                                                isSelected
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                                    : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-primary dark:text-dark-text-primary'
                                            }`}
                                        >
                                            <div
                                                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-primary/10 text-primary dark:bg-primary/20'
                                                }`}
                                            >
                                                <IconComponent size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold leading-tight truncate">
                                                    {chapter.title}
                                                </div>
                                                <div
                                                    className={`text-[11px] leading-snug line-clamp-2 mt-0.5 ${
                                                        isSelected
                                                            ? 'text-white/80'
                                                            : 'text-light-text-secondary dark:text-dark-text-secondary'
                                                    }`}
                                                >
                                                    {chapter.description}
                                                </div>
                                            </div>
                                            <ChevronRight
                                                size={14}
                                                className={`shrink-0 mt-2 transition-transform ${
                                                    isSelected ? 'text-white translate-x-0.5' : 'text-light-text-secondary/50'
                                                }`}
                                            />
                                        </button>
                                    );
                                })}

                                {filteredChapters.length === 0 && (
                                    <div className="p-6 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                        No guides matching "{searchQuery}"
                                    </div>
                                )}
                            </div>

                            {/* Footer links */}
                            <div className="p-3 border-t border-light-border dark:border-dark-border bg-light-surface/50 dark:bg-dark-surface/50">
                                <a
                                    href="/guide"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                                >
                                    <span>Web Guide / Full Docs</span>
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                        </aside>

                        {/* Markdown Reader Pane */}
                        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 bg-light-background dark:bg-dark-background">
                            <div className="max-w-3xl mx-auto pb-16">
                                <article
                                    className="prose prose-neutral dark:prose-invert max-w-none
                                    prose-headings:font-black prose-headings:tracking-tight
                                    prose-h1:text-2xl sm:prose-h1:text-4xl prose-h1:border-b prose-h1:border-light-border dark:prose-h1:border-dark-border prose-h1:pb-4 prose-h1:mb-6
                                    prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                                    prose-h3:text-base sm:prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                                    prose-p:text-sm sm:prose-p:text-base prose-p:leading-relaxed prose-p:text-light-text-primary dark:prose-p:text-dark-text-primary
                                    prose-li:text-sm sm:prose-li:text-base
                                    prose-table:border prose-table:border-light-border dark:prose-table:border-dark-border prose-table:rounded-xl prose-table:overflow-hidden
                                    prose-th:bg-light-surface dark:prose-th:bg-dark-surface prose-th:px-3 prose-th:py-2.5 prose-th:text-xs prose-th:font-black
                                    prose-td:px-3 prose-td:py-2.5 prose-td:border-t prose-td:border-light-border dark:prose-td:border-dark-border prose-td:text-xs sm:prose-td:text-sm
                                    prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs
                                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-xl"
                                >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {activeChapter.content}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        </main>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
