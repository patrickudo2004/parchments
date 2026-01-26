import React from 'react';
import { useResearchStore } from '@/stores/researchStore';
import type { PinItem } from '@/stores/researchStore';
import { useUIStore } from '@/stores/uiStore';
import {
    Pin,
    Trash2,
    Copy,
    BookOpen,
    Hash,
    FileText,
    Clock,
    Sparkles,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

export const ResearchSidebar: React.FC = () => {
    const { pins, unpinItem, clearPins } = useResearchStore();
    const { activeEditor, showToast } = useUIStore();
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    const handleInsertToEditor = (pin: PinItem) => {
        const citation = `<blockquote>${pin.content}<cite>— ${pin.reference}</cite></blockquote><p></p>`;

        if (activeEditor) {
            activeEditor.chain().focus().insertContent(citation).run();
            setCopiedId(pin.id);
            showToast('Inserted research into note!', 'success');
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(citation).then(() => {
                setCopiedId(pin.id);
                showToast('No active note. Copied to clipboard!', 'info');
                setTimeout(() => setCopiedId(null), 2000);
            });
        }
    };

    const getTypeIcon = (type: PinItem['type']) => {
        switch (type) {
            case 'verse': return <BookOpen size={14} className="text-blue-500" />;
            case 'lexicon': return <Hash size={14} className="text-purple-500" />;
            case 'note': return <FileText size={14} className="text-green-500" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-background/30 dark:bg-dark-background/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Pin size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-light-text-primary dark:text-dark-text-primary">Research Pins</h3>
                        <p className="text-[10px] text-light-text-disabled">{pins.length} items collected</p>
                    </div>
                </div>
                {pins.length > 0 && (
                    <button
                        onClick={clearPins}
                        className="p-2 text-light-text-disabled hover:text-red-500 transition-colors"
                        title="Clear all pins"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                <AnimatePresence initial={false}>
                    {pins.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4"
                        >
                            <div className="w-16 h-16 rounded-3xl bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border">
                                <Sparkles size={24} className="text-light-text-disabled opacity-50" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-light-text-secondary mb-2 text-primary">Your Staging Area</h4>
                                <p className="text-[10px] text-light-text-disabled leading-relaxed max-w-[200px]">
                                    Pin verses, lexicon entries, or notes to keep them handy while you write.
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        pins.map((pin) => (
                            <motion.div
                                key={pin.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                className="group relative bg-light-background dark:bg-dark-background/50 rounded-2xl border border-light-border dark:border-dark-border overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
                            >
                                <div className="p-4 space-y-3">
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(pin.type)}
                                            <span className="text-[10px] font-black uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary">
                                                {pin.reference}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleInsertToEditor(pin)}
                                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                                title="Copy as Citation"
                                            >
                                                {copiedId === pin.id ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                            <button
                                                onClick={() => unpinItem(pin.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-light-text-disabled hover:text-red-500 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content Snippet */}
                                    <div
                                        className="text-xs text-light-text-secondary dark:text-dark-text-secondary line-clamp-3 font-serif italic border-l-2 border-primary/20 pl-3 py-1"
                                        dangerouslySetInnerHTML={{ __html: pin.content }}
                                    />

                                    {/* Footer */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Clock size={10} className="text-light-text-disabled" />
                                        <span className="text-[9px] text-light-text-disabled">
                                            pinned {formatTimeAgo(pin.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Hint */}
            {pins.length > 0 && (
                <div className="p-4 bg-primary/5 border-t border-primary/10">
                    <p className="text-[9px] text-primary/70 text-center font-medium leading-relaxed">
                        Copy items to your clipboard to paste them into your study with automatic citation formatting.
                    </p>
                </div>
            )}
        </div>
    );
};
