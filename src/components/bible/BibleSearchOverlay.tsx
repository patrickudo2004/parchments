import React from 'react';
import { useBibleStore } from '@/stores/bibleStore';
import { Search, X, Loader2, Book } from 'lucide-react';
import type { BibleVerse } from '@/types/database';
import { motion } from 'framer-motion';

export const BibleSearchOverlay: React.FC = () => {
    const {
        isSearchOpen,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        executeSearch,
        setBibleFocus
    } = useBibleStore();

    const handleResultClick = (v: BibleVerse) => {
        setBibleFocus({
            book: v.book,
            chapter: v.chapter,
            verse: v.verse
        });
        setSearchOpen(false);
    };

    if (!isSearchOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 z-[110] bg-light-surface dark:bg-dark-surface flex flex-col"
        >
            {/* Search Header */}
            <div className="h-14 border-b border-light-border dark:border-dark-border flex items-center px-4 gap-3 shrink-0">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-disabled" />
                    <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                        placeholder="Search verses, words (e.g. seed), or Strong's (e.g. G26)..."
                        className="w-full bg-light-sidebar dark:bg-dark-sidebar border-none rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
                <button
                    onClick={() => setSearchOpen(false)}
                    className="p-2 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {isSearching ? (
                    <div className="h-full flex flex-col items-center justify-center text-light-text-disabled gap-3">
                        <Loader2 size={24} className="animate-spin text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Searching Scriptures...</span>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-light-text-disabled">
                                Found {searchResults.length} results for "{searchQuery}"
                            </span>
                        </div>
                        {searchResults.map((v: BibleVerse, idx) => (
                            <button
                                key={`${v.id}-${idx}`}
                                onClick={() => handleResultClick(v)}
                                className="w-full text-left p-4 rounded-xl hover:bg-light-sidebar dark:hover:bg-dark-sidebar border border-transparent hover:border-light-border dark:hover:border-dark-border transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-black uppercase text-primary tracking-tight">
                                        {v.book} {v.chapter}:{v.verse}
                                    </span>
                                    <Book size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                                </div>
                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                    {v.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                                        part.toLowerCase() === searchQuery.toLowerCase()
                                            ? <span key={i} className="bg-primary/20 text-primary font-bold rounded-sm px-0.5">{part}</span>
                                            : part
                                    )}
                                </p>
                            </button>
                        ))}
                    </div>
                ) : searchQuery ? (
                    <div className="h-full flex flex-col items-center justify-center text-light-text-disabled pt-20">
                        <Search size={48} className="opacity-10 mb-4" />
                        <span className="text-xs font-medium italic">No verses found for "{searchQuery}"</span>
                        <span className="text-[9px] font-black uppercase tracking-widest mt-2">Try a different word or Strong's ID</span>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-light-text-disabled pt-20">
                        <Book size={48} className="opacity-10 mb-4" />
                        <span className="text-xs font-medium italic">Type word, reference or Strong's ID above</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
