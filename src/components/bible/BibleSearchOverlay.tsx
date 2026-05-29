import React, { useState, useEffect } from 'react';
import { useBibleStore } from '@/stores/bibleStore';
import { Search, X, Loader2, Book } from 'lucide-react';
import { motion } from 'framer-motion';

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


    // Local state for immediate input feedback
    const [localQuery, setLocalQuery] = useState(searchQuery);

    // Sync local state if store changes externally (e.g. from Interlinear search)
    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

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

                {isSearching ? (
                    <div className="flex items-center justify-center h-full">
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
