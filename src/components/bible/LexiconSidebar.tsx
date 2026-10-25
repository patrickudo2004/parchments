import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { db } from '@/lib/db';
import type { StrongsEntry } from '@/types/database';
import { Search, Hash, Volume2, BookOpen, Link2, Clock, Trash2, Pin, ExternalLink, Maximize2, Minimize2, X } from 'lucide-react';
import { popoutService } from '@/lib/utils/popoutService';
import { useResearchStore } from '@/stores/researchStore';
import { searchStrongsLexicon } from '@/lib/search/bibleSearchEngine';

export const LexiconSidebar: React.FC<{ isIndependent?: boolean }> = ({ isIndependent = false }) => {
    const { selectedStrongsId, isRightSidebarFloating, toggleRightSidebarFloating, closeRightSidebar } = useUIStore();
    const [entry, setEntry] = useState<StrongsEntry | null>(null);
    const [keywordMatches, setKeywordMatches] = useState<StrongsEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();

    // Load entry when selectedStrongsId changes
    useEffect(() => {
        if (selectedStrongsId) {
            loadEntry(selectedStrongsId);
        }
    }, [selectedStrongsId]);

    // Load history from localStorage on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('parchments-lexicon-history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch {
                // ignore malformed storage
            }
        }
    }, []);

    // Live keyword / ID search when typing
    useEffect(() => {
        let active = true;
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setKeywordMatches([]);
            return;
        }

        const timer = setTimeout(async () => {
            const cleanId = trimmed.startsWith('#') ? trimmed.slice(1).toUpperCase() : trimmed.toUpperCase();
            if (/^[HG]\d+$/i.test(cleanId)) {
                const res = await db.strongsEntries.get(cleanId);
                if (active) {
                    setKeywordMatches(res ? [res] : []);
                }
                return;
            }
            if (trimmed.length >= 2) {
                const matches = await searchStrongsLexicon(trimmed, 20);
                if (active) {
                    setKeywordMatches(matches);
                }
            }
        }, 180);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchQuery]);

    const loadEntry = async (id: string) => {
        setLoading(true);
        const normalizedId = id.replace(/^#/, '').trim().toUpperCase();
        const res = await db.strongsEntries.get(normalizedId);
        setEntry(res || null);
        setKeywordMatches([]);
        setSearchQuery('');
        setLoading(false);

        if (res) {
            updateHistory(normalizedId);
        }
    };

    const updateHistory = (id: string) => {
        setHistory((prev) => {
            const newHistory = [id, ...prev.filter((h) => h !== id)].slice(0, 10);
            localStorage.setItem('parchments-lexicon-history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        const cleanId = trimmed.replace(/^#/, '').toUpperCase();
        if (/^[HG]\d+$/i.test(cleanId)) {
            await loadEntry(cleanId);
            return;
        }
        setLoading(true);
        const matches = await searchStrongsLexicon(trimmed, 20);
        setLoading(false);
        if (matches.length === 1) {
            setEntry(matches[0]);
            setKeywordMatches([]);
            setSearchQuery('');
            updateHistory(matches[0].id);
        } else {
            setEntry(null);
            setKeywordMatches(matches);
        }
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('parchments-lexicon-history');
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border bg-light-background/30 dark:bg-dark-background/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <Hash size={16} />
                        <h2 className="text-[10px] font-black uppercase tracking-widest leading-none">Strong's Lexicon</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isIndependent && (
                            <button
                                onClick={toggleRightSidebarFloating}
                                className={`p-1 rounded-md transition-colors ${isRightSidebarFloating ? 'bg-primary/10 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-disabled'}`}
                                title={isRightSidebarFloating ? 'Dock' : 'Undock'}
                            >
                                {isRightSidebarFloating ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                popoutService.open('lexicon');
                                if (!isIndependent) closeRightSidebar();
                            }}
                            className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-md transition-colors text-light-text-disabled hover:text-primary"
                            title="Pop out"
                        >
                            <ExternalLink size={14} />
                        </button>
                    </div>
                </div>
                <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-disabled group-focus-within:text-primary transition-colors" size={14} />
                    <input
                        type="text"
                        data-testid="lexicon-search-input"
                        placeholder="Search Strong's ID (H3548) or word (priest)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setKeywordMatches([]);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-light-text-disabled hover:text-light-text-primary"
                        >
                            <X size={12} />
                        </button>
                    )}
                </form>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Lexicon Lookup...</p>
                    </div>
                ) : searchQuery.trim() && keywordMatches.length > 0 ? (
                    <div className="space-y-2.5" data-testid="lexicon-keyword-results">
                        <p className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                            Lexicon Matches ({keywordMatches.length})
                        </p>
                        {keywordMatches.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => loadEntry(m.id)}
                                className="w-full text-left p-3 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/40 hover:bg-primary/5 transition-all space-y-1"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">
                                            {m.id}
                                        </span>
                                        <span className="font-serif text-base font-bold text-light-text-primary dark:text-dark-text-primary">
                                            {m.lemma}
                                        </span>
                                        {m.xlit && (
                                            <span className="text-xs italic text-light-text-secondary">
                                                ({m.xlit})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary line-clamp-2">
                                    {m.kjv_def || m.strongs_def}
                                </p>
                            </button>
                        ))}
                    </div>
                ) : entry ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Word Heading */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded uppercase tracking-tighter">
                                    {entry.id}
                                </span>
                                <button
                                    onClick={() => {
                                        const { setSearchOpen, setSearchQuery: setBibleSearchQuery, executeSearch } = useBibleStore.getState();
                                        const { openRightSidebar, isBibleModalOpen } = useUIStore.getState();
                                        setBibleSearchQuery(entry.id);
                                        setSearchOpen(true);
                                        if (!isIndependent && !isBibleModalOpen) {
                                            openRightSidebar('bible');
                                        }
                                        executeSearch(entry.id);
                                    }}
                                    data-testid="lexicon-search-occurrences"
                                    className="p-1.5 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg transition-all flex items-center gap-1.5"
                                    title={`Search all canonical Scripture occurrences of ${entry.id}`}
                                >
                                    <Search size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none pr-1">
                                        Search Occurrences
                                    </span>
                                </button>
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
                                    className={`ml-auto p-1.5 rounded-lg transition-all ${
                                        isItemPinned(entry.id)
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-light-background dark:bg-dark-background text-light-text-disabled hover:text-primary hover:border-primary/50'
                                    }`}
                                    title="Pin to Research"
                                >
                                    <Pin size={14} />
                                </button>
                            </div>
                            <h2 className="text-4xl font-serif text-light-text-primary dark:text-dark-text-primary">
                                {entry.lemma}
                            </h2>
                            <div className="flex items-center gap-3 text-primary font-bold">
                                <div className="flex items-center gap-1.5 hover:text-primary/80 cursor-default transition-colors">
                                    <Volume2 size={16} />
                                    <span className="text-sm tracking-wide italic leading-none">{entry.pron}</span>
                                </div>
                                <span className="text-light-text-disabled font-normal text-sm">/ {entry.xlit} /</span>
                            </div>
                        </div>

                        {/* Definition Card */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                <BookOpen size={14} />
                                <span>Strong's Definition</span>
                            </div>
                            <p className="text-lg leading-relaxed text-light-text-primary dark:text-dark-text-primary font-serif">
                                {entry.strongs_def}
                            </p>
                        </div>

                        {/* Derivation */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                <Link2 size={14} />
                                <span>Derivation</span>
                            </div>
                            <p className="text-sm leading-relaxed text-light-text-main dark:text-dark-text-main italic bg-light-background/50 dark:bg-dark-background/50 p-4 rounded-xl border border-light-border/50 dark:border-dark-border/50">
                                {entry.derivation}
                            </p>
                        </div>

                        {/* KJV Usage */}
                        <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 group">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-3">
                                <span>KJV Translation Usage</span>
                            </div>
                            <p className="text-sm text-light-text-main dark:text-dark-text-main leading-relaxed">
                                {entry.kjv_def}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-light-background dark:bg-dark-background flex items-center justify-center mb-4 border border-light-border dark:border-dark-border">
                            <Hash size={20} className="text-light-text-disabled" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-light-text-secondary mb-2">Lexicon Ready</h3>
                        <p className="text-[10px] text-light-text-disabled leading-relaxed max-w-[190px]">
                            Search any English keyword (e.g. "priest"), Strong's ID (H3548), or click an interlinear word.
                        </p>
                        <div className="mt-4 flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-light-text-disabled mb-2">Explore Keywords</span>
                            <div className="flex flex-wrap justify-center gap-1.5 max-w-[230px]">
                                {[
                                    { id: 'H3548', label: 'Priest (H3548)' },
                                    { id: 'G2424', label: 'Jesus (G2424)' },
                                    { id: 'G26', label: 'Love (G26)' },
                                    { id: 'G3056', label: 'Word (G3056)' },
                                    { id: 'H7965', label: 'Peace (H7965)' }
                                ].map((pill) => (
                                    <button
                                        key={pill.id}
                                        onClick={() => loadEntry(pill.id)}
                                        className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-[#121212] transition-all cursor-pointer"
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* History Section */}
                {history.length > 0 && (
                    <div className="pt-8 border-t border-light-border dark:border-dark-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                <Clock size={12} />
                                <span>Recent Lookups</span>
                            </div>
                            <button
                                onClick={clearHistory}
                                className="p-1 text-light-text-disabled hover:text-red-500 transition-colors"
                                title="Clear History"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {history.map((h) => (
                                <button
                                    key={h}
                                    onClick={() => loadEntry(h)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                        selectedStrongsId === h
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text-secondary hover:border-primary/50'
                                    }`}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
