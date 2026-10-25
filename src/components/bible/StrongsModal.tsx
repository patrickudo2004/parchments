import React, { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Volume2, BookOpen, Link2, Hash, Pin, BookmarkIcon, Search } from 'lucide-react';
import { db } from '@/lib/db';
import type { StrongsEntry } from '@/types/database';
import { useResearchStore } from '@/stores/researchStore';
import { useUIStore } from '@/stores/uiStore';
import { searchStrongsLexicon } from '@/lib/search/bibleSearchEngine';

interface StrongsModalProps {
    strongsId: string | null;
    onClose: () => void;
}

export const StrongsModal: React.FC<StrongsModalProps> = ({ strongsId, onClose }) => {
    const [entry, setEntry] = useState<StrongsEntry | null>(null);
    const [matches, setMatches] = useState<StrongsEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const constraintsRef = React.useRef(null);
    const dragControls = useDragControls();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();
    const { isMobile } = useUIStore();

    useEffect(() => {
        if (strongsId) {
            setLoading(true);
            const normalizedId = strongsId.toUpperCase();
            db.strongsEntries.get(normalizedId).then((res) => {
                setEntry(res || null);
                setMatches([]);
                setLoading(false);
            });
        } else {
            setEntry(null);
        }
    }, [strongsId]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        setLoading(true);
        const results = await searchStrongsLexicon(trimmed, 20);
        setLoading(false);
        if (results.length === 1) {
            setEntry(results[0]);
            setMatches([]);
        } else if (results.length > 1) {
            setEntry(null);
            setMatches(results);
        } else {
            setEntry(null);
            setMatches([]);
        }
    };

    return (
        <div ref={constraintsRef} className={`fixed inset-0 z-[100] pointer-events-none flex justify-center ${isMobile ? 'items-end' : 'items-center'}`}>
            <motion.div
                drag={!isMobile}
                dragListener={false}
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={constraintsRef}
                initial={{ opacity: 0, scale: isMobile ? 1 : 0.9, y: isMobile ? 100 : 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: isMobile ? 1 : 0.9, y: isMobile ? 100 : 20 }}
                className={`pointer-events-auto relative bg-white dark:bg-dark-surface shadow-2xl flex flex-col border border-light-border dark:border-dark-border overflow-hidden ${isMobile ? 'w-full h-[85vh] max-h-[85vh] rounded-t-3xl border-b-0' : 'w-full max-w-lg rounded-2xl'}`}
                style={isMobile ? { width: '100vw', height: '85vh', maxWidth: '100vw' } : { width: '500px', height: '600px', resize: 'both', minWidth: '320px', maxWidth: '95vw', minHeight: '380px', maxHeight: '90vh' }}
            >
                {/* Header (Drag Handle) */}
                <div
                    className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border bg-light-background/80 dark:bg-dark-background/80 backdrop-blur-md cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Hash size={16} />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Lexicon Concordance</h2>
                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                {entry?.id || (strongsId ? strongsId.toUpperCase() : 'Entry Lookup')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-light-background dark:bg-dark-background rounded-full px-3 py-1 border border-light-border dark:border-dark-border focus-within:border-primary transition-colors">
                            <input
                                type="text"
                                placeholder="H3548 or priest..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-[11px] focus:ring-0 w-28 px-1"
                            />
                            <button type="submit" className="text-primary hover:text-primary-dark p-1">
                                <Search size={14} />
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
                    ) : matches.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-widest text-light-text-disabled">
                                Select Lexicon Entry ({matches.length})
                            </p>
                            {matches.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        setEntry(m);
                                        setMatches([]);
                                    }}
                                    className="w-full text-left p-3.5 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/40 hover:bg-primary/5 transition-all space-y-1"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">
                                            {m.id}
                                        </span>
                                        <span className="font-serif text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                            {m.lemma}
                                        </span>
                                        {m.xlit && <span className="text-xs italic text-light-text-secondary">({m.xlit})</span>}
                                    </div>
                                    <p className="text-xs text-light-text-secondary line-clamp-2">{m.kjv_def || m.strongs_def}</p>
                                </button>
                            ))}
                        </div>
                    ) : entry ? (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex items-start justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-5xl font-serif text-light-text-primary dark:text-dark-text-primary">{entry.lemma}</h3>
                                    <div className="flex items-center gap-3 text-primary font-bold">
                                        <Volume2 size={16} />
                                        <span className="text-sm tracking-wide italic">{entry.pron}</span>
                                        <span className="text-light-text-disabled font-normal">/ {entry.xlit} /</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (isItemPinned(entry.id)) {
                                            unpinItem(entry.id);
                                        } else {
                                            pinItem({
                                                id: entry.id,
                                                type: 'lexicon',
                                                title: `${entry.id}: ${entry.lemma}`,
                                                content: entry.strongs_def,
                                                reference: `${entry.id} (${entry.lemma})`,
                                                metadata: { strongsId: entry.id }
                                            });
                                        }
                                    }}
                                    className={`p-3 rounded-2xl transition-all shadow-lg ${isItemPinned(entry.id) ? 'bg-primary text-white shadow-primary/30' : 'bg-light-background dark:bg-dark-background text-light-text-disabled hover:text-primary hover:border-primary/50 border border-light-border dark:border-dark-border'}`}
                                    title="Pin to Research"
                                >
                                    <Pin size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-light-text-disabled">
                                    <Link2 size={14} />
                                    <span>Derivation & Etymology</span>
                                </div>
                                <p className="text-sm leading-relaxed text-light-text-main dark:text-dark-text-main italic bg-light-background/50 dark:bg-dark-background/50 p-4 rounded-xl border border-light-border/50 dark:border-dark-border/50">
                                    {entry.derivation}
                                </p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-light-text-disabled">
                                    <BookOpen size={14} />
                                    <span>Strong's Definition</span>
                                </div>
                                <p className="text-xl leading-relaxed text-light-text-primary dark:text-dark-text-primary font-serif">
                                    {entry.strongs_def}
                                </p>
                            </div>

                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-3">
                                    <BookmarkIcon size={12} />
                                    <span>KJV Translation Usage</span>
                                </div>
                                <p className="text-sm text-light-text-main dark:text-dark-text-main leading-relaxed">
                                    {entry.kjv_def}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-light-text-disabled italic">
                                    {strongsId ? 'Lexicon entry not found in database.' : "Enter a Strong's ID or English keyword to look up its details."}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-light-text-disabled tracking-widest">
                                    Example: H3548 (Priest), H430 (Elohim), or G2424 (Jesus)
                                </p>
                            </div>
                            <form onSubmit={handleSearch} className="max-w-xs mx-auto flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Strong's ID or keyword..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl text-sm focus:ring-primary focus:border-primary px-4 py-2"
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
