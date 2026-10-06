import React, { useState, useEffect } from 'react';
import { useBibleStore } from '@/stores/bibleStore';
import { Search, X, Loader2, Book, Hash, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import type { StrongsEntry } from '@/types/database';
import { useUIStore } from '@/stores/uiStore';

export const BibleSearchOverlay: React.FC = () => {
    const {
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        executeSearch,
        setBibleFocus
    } = useBibleStore();
    const { showToast } = useUIStore();

    // Local state for immediate input feedback
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
    const [copiedStrongs, setCopiedStrongs] = useState(false);

    // Sync local state if store changes externally (e.g. from Interlinear search)
    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    // Check for Strong's code in search query (e.g. G26, H7225)
    useEffect(() => {
        const trimmed = localQuery.trim();
        if (/^[GH]\d+$/i.test(trimmed)) {
            const normId = trimmed.toUpperCase();
            db.strongsEntries.get(normId).then(res => {
                setStrongsEntry(res || null);
            }).catch(err => {
                console.error('[BibleSearchOverlay] Failed to fetch Strongs:', err);
                setStrongsEntry(null);
            });
        } else {
            setStrongsEntry(null);
        }
    }, [localQuery]);

    // Debounce effect: Update the store and execute search after 400ms of inactivity
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localQuery.trim() && localQuery !== searchQuery) {
                setSearchQuery(localQuery);
                executeSearch();
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [localQuery, setSearchQuery, executeSearch, searchQuery]);

    const handleResultClick = (v: any) => {
        setBibleFocus({ book: v.book, chapter: v.chapter, verse: v.verse });
        setSearchOpen(false);
    };

    const handleCopyStrongs = () => {
        if (!strongsEntry) return;
        const text = `[Strong's ${strongsEntry.id}] ${strongsEntry.lemma} (${strongsEntry.xlit})\nPronunciation: ${strongsEntry.pron || 'N/A'}\nDefinition: ${strongsEntry.strongs_def}\nKJV Usage: ${strongsEntry.kjv_def || 'N/A'}`;
        navigator.clipboard.writeText(text);
        setCopiedStrongs(true);
        showToast(`Copied Strong's ${strongsEntry.id} to clipboard`, 'success');
        setTimeout(() => setCopiedStrongs(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 bg-light-surface dark:bg-dark-surface flex flex-col overflow-hidden"
        >
            {/* Header / Search Bar */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center gap-3">
                <Search className="text-light-text-secondary" size={18} />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search keywords or Strong's (G26)..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-light-text-disabled"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setSearchQuery(localQuery);
                            executeSearch();
                        }
                    }}
                />
                <button
                    onClick={() => {
                        setSearchOpen(false);
                    }}
                    className="p-1 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full text-light-text-secondary"
                    title="Cancel Search"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Strong's Concordance Card */}
                {strongsEntry && (
                    <div className="m-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Hash size={11} />
                                    <span>{strongsEntry.id}</span>
                                </span>
                                <span className="font-serif text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {strongsEntry.lemma}
                                </span>
                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary italic">
                                    ({strongsEntry.xlit})
                                </span>
                            </div>
                            <button
                                onClick={handleCopyStrongs}
                                className="p-1.5 rounded-lg border border-primary/20 hover:bg-primary/10 text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                title="Copy Strong's Definition"
                            >
                                {copiedStrongs ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                <span>{copiedStrongs ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>

                        {strongsEntry.pron && (
                            <p className="text-[11px] font-mono text-light-text-disabled">
                                Pronunciation: <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary">{strongsEntry.pron}</span>
                            </p>
                        )}

                        <div className="text-xs text-light-text-primary dark:text-dark-text-primary leading-relaxed space-y-1 font-serif">
                            <p className="font-sans font-bold text-[10px] uppercase tracking-wider text-primary opacity-80">
                                Strong's Definition:
                            </p>
                            <p className="opacity-95">{strongsEntry.strongs_def}</p>
                        </div>

                        {strongsEntry.kjv_def && (
                            <div className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed pt-2 border-t border-light-border/40 dark:border-dark-border/40 font-sans">
                                <span className="font-bold text-light-text-primary dark:text-dark-text-primary">KJV Translation Usage: </span>
                                <span className="italic">{strongsEntry.kjv_def}</span>
                            </div>
                        )}
                    </div>
                )}

                {isSearching ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="py-2">
                        {searchResults.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => handleResultClick(v)}
                                className="w-full text-left p-4 hover:bg-primary/5 transition-colors border-b border-light-border/50 dark:border-dark-border/50 last:border-none group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Book size={12} className="text-primary opacity-50" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        {v.book} {v.chapter}:{v.verse}
                                    </span>
                                </div>
                                <p className="text-sm text-light-text-primary dark:text-dark-text-primary leading-relaxed line-clamp-2 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                    {v.text.split(new RegExp(`(${localQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part: string, i: number) =>
                                        part.toLowerCase() === localQuery.toLowerCase()
                                            ? <span key={i} className="bg-primary/20 text-primary font-bold rounded-sm px-0.5">{part}</span>
                                            : part
                                    )}
                                </p>
                            </button>
                        ))}
                        {searchResults.length >= 100 && (
                            <div className="p-4 text-center">
                                <p className="text-[10px] font-bold text-light-text-secondary uppercase tracking-tighter">
                                    Showing first 100 results. Be more specific to narrow down your study.
                                </p>
                            </div>
                        )}
                    </div>
                ) : localQuery.trim() ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
                        <Search size={32} className="mb-4 text-light-text-disabled" />
                        <p className="text-sm font-bold uppercase tracking-widest">No results found</p>
                        <p className="text-xs text-light-text-secondary mt-1">Try a different keyword or Strong's ID.</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
                        <div className="space-y-6 max-w-[250px]">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Pro Tip</p>
                                <p className="text-xs text-light-text-secondary leading-relaxed">
                                    Search for <span className="text-primary font-bold">"seed"</span> to find every lexical match,
                                    or <span className="text-primary font-bold">"G26"</span> for original word studies.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
