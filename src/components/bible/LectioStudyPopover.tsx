import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Pin, Copy, Check, BookOpen, GitBranch, Loader2 } from 'lucide-react';
import { db, dbHelpers } from '@/lib/db';
import type { StrongsEntry, TSKReferenceItem } from '@/types/database';
import { useUIStore } from '@/stores/uiStore';

interface LectioStudyPopoverProps {
    verse: { book: string; chapter: number; verse: number; text: string };
    strongsId?: string | null;
    wordText?: string | null;
    versionId: string;
    onPinVerse: (text: string, ref: string) => void;
    onClose: () => void;
}

export const LectioStudyPopover: React.FC<LectioStudyPopoverProps> = ({
    verse,
    strongsId,
    wordText,
    versionId,
    onPinVerse,
    onClose
}) => {
    const { isMobile, showToast } = useUIStore();
    const [activeTab, setActiveTab] = useState<'strongs' | 'crossrefs'>(strongsId ? 'strongs' : 'crossrefs');
    const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
    const [loadingStrongs, setLoadingStrongs] = useState(false);
    const [tskRefs, setTskRefs] = useState<TSKReferenceItem[]>([]);
    const [loadingTsk, setLoadingTsk] = useState(false);
    const [copied, setCopied] = useState(false);

    const verseRef = `${verse.book} ${verse.chapter}:${verse.verse}`;
    const verseKey = `${verse.book.toLowerCase().replace(/\s+/g, '-')}-${verse.chapter}-${verse.verse}`;

    // 1. Fetch Strong's Entry if specified
    useEffect(() => {
        if (!strongsId) {
            setStrongsEntry(null);
            return;
        }
        setLoadingStrongs(true);
        const normId = strongsId.toUpperCase();
        db.strongsEntries.get(normId).then(res => {
            setStrongsEntry(res || null);
            setLoadingStrongs(false);
        }).catch(err => {
            console.error('Failed to load Strongs entry:', err);
            setLoadingStrongs(false);
        });
    }, [strongsId]);

    // 2. Fetch TSK Cross References
    useEffect(() => {
        setLoadingTsk(true);
        dbHelpers.getTSKRefs(verseKey).then(refs => {
            setTskRefs(refs.slice(0, 12)); // Top 12 refs
            setLoadingTsk(false);
        }).catch(err => {
            console.error('Failed to load TSK refs:', err);
            setLoadingTsk(false);
        });
    }, [verseKey]);

    const handleCopy = () => {
        navigator.clipboard.writeText(`"${verse.text}" — ${verseRef}`);
        setCopied(true);
        showToast('Verse copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePinToJournal = () => {
        let pinText = verse.text;
        if (strongsEntry && activeTab === 'strongs') {
            pinText += ` [${strongsEntry.id} ${strongsEntry.lemma} (${strongsEntry.xlit}): ${strongsEntry.strongs_def}]`;
        }
        onPinVerse(pinText, verseRef);
        showToast(`Pinned ${verseRef} to journal!`, 'success');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal Sheet / Popover Container */}
            <motion.div
                initial={{ opacity: 0, y: isMobile ? 100 : 20, scale: isMobile ? 1 : 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: isMobile ? 100 : 20, scale: isMobile ? 1 : 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full sm:max-w-md bg-light-surface dark:bg-dark-surface border-t sm:border border-light-border dark:border-dark-border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10"
            >
                {/* Header */}
                <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0 bg-light-background/50 dark:bg-dark-background/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-black text-xs">
                            {verse.verse}
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-sm text-light-text-primary dark:text-dark-text-primary">
                                {verseRef}
                            </h3>
                            <p className="text-[10px] text-light-text-disabled uppercase font-black tracking-wider flex items-center gap-1">
                                <span>Lectio Companion</span>
                                <span>•</span>
                                <span>{versionId.toUpperCase()}</span>
                                {wordText && <span>• "{wordText}"</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-full hover:bg-light-sidebar dark:hover:bg-dark-elevated text-light-text-secondary dark:text-dark-text-secondary transition-all"
                            title="Copy Verse Text"
                        >
                            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                        <button
                            onClick={handlePinToJournal}
                            className="p-2 rounded-full hover:bg-primary/10 text-primary transition-all"
                            title="Pin into Active Journal Note"
                        >
                            <Pin size={16} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-light-sidebar dark:hover:bg-dark-elevated text-light-text-secondary dark:text-dark-text-secondary transition-all"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Verse Text Card */}
                <div className="px-4 py-3 bg-light-background/60 dark:bg-dark-background/30 border-b border-light-border dark:border-dark-border text-xs font-serif italic text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                    "{verse.text}"
                </div>

                {/* Tabs */}
                <div className="flex border-b border-light-border dark:border-dark-border shrink-0 bg-light-surface dark:bg-dark-surface">
                    {strongsId && (
                        <button
                            onClick={() => setActiveTab('strongs')}
                            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                                activeTab === 'strongs'
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-light-text-disabled hover:text-light-text-secondary'
                            }`}
                        >
                            <BookOpen size={14} />
                            <span>Strong's ({strongsId})</span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('crossrefs')}
                        className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                            activeTab === 'crossrefs'
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-light-text-disabled hover:text-light-text-secondary'
                        }`}
                    >
                        <GitBranch size={14} />
                        <span>TSK Cross References ({tskRefs.length})</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    {activeTab === 'strongs' && strongsId && (
                        <div>
                            {loadingStrongs ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-light-text-disabled">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                    <p className="text-xs">Loading lexical entry...</p>
                                </div>
                            ) : strongsEntry ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xl font-bold font-serif text-primary">
                                                {strongsEntry.lemma}
                                            </span>
                                            <span className="text-xs text-light-text-disabled ml-2 italic">
                                                ({strongsEntry.xlit})
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                            {strongsEntry.id}
                                        </span>
                                    </div>

                                    {strongsEntry.pron && (
                                        <p className="text-xs text-light-text-disabled">
                                            Pronunciation: <strong className="text-light-text-secondary dark:text-dark-text-secondary font-mono">{strongsEntry.pron}</strong>
                                        </p>
                                    )}

                                    <div className="p-3 bg-light-background dark:bg-dark-background/60 rounded-xl border border-light-border dark:border-dark-border space-y-2">
                                        <p className="text-[10px] uppercase font-black tracking-wider text-light-text-disabled">
                                            Definition
                                        </p>
                                        <p className="text-xs text-light-text-primary dark:text-dark-text-primary font-serif leading-relaxed">
                                            {strongsEntry.strongs_def}
                                        </p>
                                    </div>

                                    {strongsEntry.kjv_def && (
                                        <div className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-normal">
                                            <strong className="text-light-text-disabled uppercase text-[9px] block mb-0.5">KJV Translation Usage:</strong>
                                            {strongsEntry.kjv_def}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-center py-6 text-light-text-disabled italic">
                                    No lexical definition found for {strongsId}.
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'crossrefs' && (
                        <div>
                            {loadingTsk ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-light-text-disabled">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                    <p className="text-xs">Finding cross-references...</p>
                                </div>
                            ) : tskRefs.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-black tracking-wider text-light-text-disabled mb-2">
                                        Treasury of Scripture Knowledge Connections
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {tskRefs.map((ref, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    onPinVerse(`(Cross-reference to ${ref.displayRef})`, verseRef);
                                                    showToast(`Pinned cross-reference ${ref.displayRef} to journal!`, 'success');
                                                }}
                                                className="p-2.5 rounded-xl bg-light-background hover:bg-light-sidebar dark:bg-dark-background/50 dark:hover:bg-dark-elevated border border-light-border dark:border-dark-border cursor-pointer transition-all flex items-center justify-between group"
                                            >
                                                <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors">
                                                    {ref.displayRef}
                                                </span>
                                                <Pin size={12} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-light-text-disabled text-xs space-y-1">
                                    <p className="font-bold">No TSK cross-references found for this verse.</p>
                                    <p className="text-[10px]">Use the main study sidebar for open topical lookups.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-3 border-t border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shrink-0 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-sidebar dark:hover:bg-dark-elevated transition-colors"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={handlePinToJournal}
                        className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-white hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <Pin size={14} />
                        <span>Quote in Note</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
