import React, { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Volume2, BookOpen, Link2, Hash } from 'lucide-react';
import { db } from '@/lib/db';
import type { StrongsEntry } from '@/types/database';

interface StrongsModalProps {
    strongsId: string | null;
    onClose: () => void;
}

export const StrongsModal: React.FC<StrongsModalProps> = ({ strongsId, onClose }) => {
    const [entry, setEntry] = useState<StrongsEntry | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const constraintsRef = React.useRef(null);
    const dragControls = useDragControls();

    useEffect(() => {
        if (strongsId) {
            setLoading(true);
            const normalizedId = strongsId.toUpperCase();
            db.strongsEntries.get(normalizedId).then((res) => {
                setEntry(res || null);
                setLoading(false);
            });
        } else {
            setEntry(null);
        }
    }, [strongsId]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            const id = searchQuery.trim().toUpperCase();
            if (/^[HG]\d+$/i.test(id)) {
                setLoading(true);
                db.strongsEntries.get(id).then((res) => {
                    setEntry(res || null);
                    setLoading(false);
                });
            }
        }
    };

    return (
        <div ref={constraintsRef} className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <motion.div
                drag
                dragListener={false}
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={constraintsRef}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="pointer-events-auto relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-2xl shadow-2xl flex flex-col border border-light-border dark:border-dark-border overflow-hidden"
                style={{ width: '500px', height: '600px', resize: 'both', minWidth: '350px', minHeight: '400px' }}
            >
                {/* Header (Drag Handle) */}
                <div
                    className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-md cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Hash size={16} className="font-bold" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Lexicon</h2>
                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                {strongsId ? strongsId.toUpperCase() : 'Entry Lookup'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-light-background dark:bg-dark-background rounded-full px-3 py-1 border border-light-border dark:border-dark-border focus-within:border-primary transition-colors">
                            <input
                                type="text"
                                placeholder="ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-[10px] focus:ring-0 w-16"
                            />
                            <button type="submit" className="text-primary hover:text-primary-dark">
                                <Hash size={12} />
                            </button>
                        </form>
                        <div className="w-[1px] h-4 bg-light-border dark:bg-dark-border mx-1" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest text-light-text-disabled">Fetching Lexicon Data...</p>
                        </div>
                    ) : entry ? (
                        <>
                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-4xl font-serif text-light-text-primary dark:text-dark-text-primary">{entry.lemma}</h3>
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Volume2 size={16} />
                                        <span className="text-sm tracking-wide italic">{entry.pron}</span>
                                        <span className="text-light-text-disabled font-normal">/ {entry.xlit} /</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-light-text-disabled">
                                    <Link2 size={14} />
                                    <span>Derivation & Etymology</span>
                                </div>
                                <p className="text-sm leading-relaxed text-light-text-main dark:text-dark-text-main italic">
                                    {entry.derivation}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-light-text-disabled">
                                    <BookOpen size={14} />
                                    <span>Strongs Definition</span>
                                </div>
                                <p className="text-lg leading-relaxed text-light-text-primary dark:text-dark-text-primary font-serif">
                                    {entry.strongs_def}
                                </p>
                            </div>

                            <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                                    <span>KJV Usage</span>
                                </div>
                                <p className="text-sm text-light-text-main dark:text-dark-text-main">
                                    {entry.kjv_def}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-light-text-disabled italic">
                                    {strongsId ? 'Lexicon entry not found in database.' : 'Enter a Strong\'s number to lookup its details.'}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-light-text-disabled tracking-widest">Example: H430 (Elohim) or G2424 (Jesus)</p>
                            </div>
                            <form onSubmit={handleSearch} className="max-w-xs mx-auto flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Strong's ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border rounded-xl text-sm focus:ring-primary focus:border-primary"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg transition-all"
                                >
                                    Lookup
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Resize Handle */}
                <div className="absolute bottom-1 right-1 cursor-se-resize p-1 z-50 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2L2 10H10V2Z" className="fill-light-border dark:fill-dark-border" />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
};
