import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { useNoteStore } from '@/stores/noteStore';
import { referenceDataService } from '@/lib/bible/ReferenceDataService';
import type { DictionaryEntry, TopicalEntry } from '@/types/database';
import {
    Book,
    Search,
    Maximize2,
    Minimize2,
    Copy,
    Check,
    Loader2,
    ExternalLink,
    X,
    Bookmark,
    Layers
} from 'lucide-react';
import { parseScriptureReference } from '@/lib/scriptureParser';

export const DictionarySidebar: React.FC<{ isIndependent?: boolean }> = ({ isIndependent = false }) => {
    const {
        isRightSidebarFloating,
        toggleRightSidebarFloating,
        selectedDictionaryTerm,
        setSelectedDictionaryTerm,
        showToast,
        activeEditor
    } = useUIStore();
    const { setBibleFocus } = useBibleStore();
    const { currentNote, saveCurrentNote } = useNoteStore();

    const [activeTab, setActiveTab] = useState<'dictionary' | 'topical'>('dictionary');
    const [searchQuery, setSearchQuery] = useState(selectedDictionaryTerm || '');
    
    // Dictionary State
    const [searchResults, setSearchResults] = useState<DictionaryEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);

    // Topical State
    const [topicalResults, setTopicalResults] = useState<TopicalEntry[]>([]);
    const [selectedTopicalEntry, setSelectedTopicalEntry] = useState<TopicalEntry | null>(null);
    const [isTopicalInstalling, setIsTopicalInstalling] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Initial setup / installation if needed
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            if (activeTab === 'dictionary') {
                const installed = await referenceDataService.isDictionaryInstalled();
                if (!installed) {
                    try {
                        await referenceDataService.installDictionary();
                    } catch (e) {
                        console.error('[DictionarySidebar] Dictionary auto-install failed:', e);
                    }
                }

                if (selectedDictionaryTerm) {
                    setSearchQuery(selectedDictionaryTerm);
                    const direct = await referenceDataService.getDictionaryEntry(selectedDictionaryTerm);
                    if (isMounted && direct) {
                        setSelectedEntry(direct);
                    }
                }
            } else {
                const installed = await referenceDataService.isTopicalInstalled();
                if (!installed) {
                    setIsTopicalInstalling(true);
                    try {
                        await referenceDataService.installTopical();
                    } catch (e) {
                        console.error('[DictionarySidebar] Topical auto-install failed:', e);
                    } finally {
                        if (isMounted) setIsTopicalInstalling(false);
                    }
                }
            }
        };
        init();
        return () => { isMounted = false; };
    }, [activeTab, selectedDictionaryTerm]);

    // Live search when typing
    useEffect(() => {
        let isMounted = true;
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setTopicalResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                if (activeTab === 'dictionary') {
                    const results = await referenceDataService.searchDictionary(searchQuery, 25);
                    if (isMounted) {
                        setSearchResults(results);
                        const exact = results.find(r => r.term.toLowerCase() === searchQuery.toLowerCase().trim());
                        if (exact && !selectedEntry) {
                            setSelectedEntry(exact);
                        }
                    }
                } else {
                    const results = await referenceDataService.searchTopical(searchQuery, 25);
                    if (isMounted) {
                        setTopicalResults(results);
                        const exact = results.find(r => r.topic.toLowerCase() === searchQuery.toLowerCase().trim());
                        if (exact && !selectedTopicalEntry) {
                            setSelectedTopicalEntry(exact);
                        }
                    }
                }
            } catch (err) {
                console.error('[DictionarySidebar] Search error:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            isMounted = false;
        };
    }, [searchQuery, activeTab]);

    const handleSelectDictionaryEntry = (entry: DictionaryEntry) => {
        setSelectedEntry(entry);
        setSelectedDictionaryTerm(entry.term);
    };

    const handleSelectTopicalEntry = (entry: TopicalEntry) => {
        setSelectedTopicalEntry(entry);
    };

    const handleNavigateScripture = (refStr: string) => {
        const parsed = parseScriptureReference(refStr);
        if (parsed) {
            setBibleFocus({
                book: parsed.book,
                chapter: parsed.chapter,
                verse: parsed.verse
            });
        }
    };

    const handleCopyDictionaryToNote = () => {
        if (!selectedEntry) return;

        const citation = `Easton's Bible Dictionary — "${selectedEntry.term}"`;
        const quoteHtml = `<blockquote><p><strong>${selectedEntry.term}:</strong> ${selectedEntry.definition}</p><p><em>— ${citation}</em></p></blockquote>`;

        if (activeEditor) {
            activeEditor.commands.insertContent(quoteHtml);
            showToast('Definition inserted into note!', 'success');
        } else if (currentNote) {
            saveCurrentNote(currentNote.title, (currentNote.content || '') + `<br/>` + quoteHtml);
            showToast('Definition appended to note!', 'success');
        } else {
            navigator.clipboard.writeText(`"${selectedEntry.term}": ${selectedEntry.definition} — ${citation}`);
            showToast('Definition copied to clipboard', 'info');
        }

        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCopyTopicalToNote = () => {
        if (!selectedTopicalEntry) return;

        const subtopicsHtml = selectedTopicalEntry.subtopics
            .map(s => `<li><strong>${s.title}:</strong> ${s.refs.join(', ')}</li>`)
            .join('');
        const citation = `Nave's Topical Bible — "${selectedTopicalEntry.topic}"`;
        const quoteHtml = `<blockquote><p><strong>Topic: ${selectedTopicalEntry.topic}</strong></p><ul>${subtopicsHtml}</ul><p><em>— ${citation}</em></p></blockquote>`;

        if (activeEditor) {
            activeEditor.commands.insertContent(quoteHtml);
            showToast('Topical index inserted into note!', 'success');
        } else if (currentNote) {
            saveCurrentNote(currentNote.title, (currentNote.content || '') + `<br/>` + quoteHtml);
            showToast('Topical index appended to note!', 'success');
        } else {
            navigator.clipboard.writeText(`Topic: ${selectedTopicalEntry.topic} — ${citation}`);
            showToast('Topical study copied to clipboard', 'info');
        }

        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Header Area */}
            <div className="p-3 border-b border-light-border dark:border-dark-border bg-light-background/30 dark:bg-dark-background/20 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {activeTab === 'dictionary' ? <Book size={15} /> : <Layers size={15} />}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-0.5">
                                Reference Library
                            </h2>
                            <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                                {activeTab === 'dictionary' ? "Easton's Bible Dictionary (1897)" : "Nave's Topical Bible (5,300+ Topics)"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isIndependent && (
                            <button
                                onClick={toggleRightSidebarFloating}
                                className={`p-1 rounded-md transition-colors ${isRightSidebarFloating ? 'bg-primary/10 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-disabled'}`}
                                title={isRightSidebarFloating ? "Dock" : "Undock"}
                            >
                                {isRightSidebarFloating ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Segmented Tab Switcher */}
                <div className="flex rounded-lg bg-light-background dark:bg-dark-background p-0.5 border border-light-border dark:border-dark-border mb-2.5">
                    <button
                        onClick={() => {
                            setActiveTab('dictionary');
                            setSearchQuery('');
                            setSelectedEntry(null);
                        }}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                            activeTab === 'dictionary'
                                ? 'bg-primary text-[#121212] shadow-sm'
                                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-white'
                        }`}
                    >
                        Easton's Dictionary
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('topical');
                            setSearchQuery('');
                            setSelectedTopicalEntry(null);
                        }}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                            activeTab === 'topical'
                                ? 'bg-primary text-[#121212] shadow-sm'
                                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-white'
                        }`}
                    >
                        Nave's Topical Index
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-disabled" size={13} />
                    <input
                        type="text"
                        placeholder={activeTab === 'dictionary' ? "Search 3,900+ biblical terms..." : "Search 5,300+ topics (e.g. Grace, Faith, Prayer)..."}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedEntry(null);
                            setSelectedTopicalEntry(null);
                        }}
                        className="w-full bg-white dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl pl-8 pr-8 py-1.5 text-xs text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedEntry(null);
                                setSelectedTopicalEntry(null);
                                setSelectedDictionaryTerm(null);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-light-text-disabled hover:text-light-text-primary"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {isTopicalInstalling ? (
                    <div className="py-20 text-center">
                        <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">
                            Preparing Nave's Topical Bible...
                        </p>
                        <p className="text-[11px] text-light-text-disabled mt-1">
                            Indexing 5,300+ biblical topics for instant offline study.
                        </p>
                    </div>
                ) : activeTab === 'dictionary' ? (
                    /* DICTIONARY TAB */
                    selectedEntry ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Entry Heading & Copy Action */}
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-light-border dark:border-dark-border">
                                <div>
                                    <h3 className="text-base font-black text-light-text-primary dark:text-dark-text-primary">
                                        {selectedEntry.term}
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        Easton's Bible Dictionary
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={handleCopyDictionaryToNote}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
                                        title="Insert definition into note"
                                    >
                                        {isCopied ? (
                                            <>
                                                <Check size={12} className="text-green-500" />
                                                <span className="text-green-500">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={12} />
                                                <span>Insert Quote</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Definition Text */}
                            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-serif prose dark:prose-invert max-w-none">
                                {selectedEntry.definition}
                            </div>

                            {/* Scripture References */}
                            {selectedEntry.scriptureRefs && selectedEntry.scriptureRefs.length > 0 && (
                                <div className="pt-3 border-t border-light-border/40 dark:border-dark-border/40">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled mb-2">
                                        Related Passages
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedEntry.scriptureRefs.map((ref, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigateScripture(ref.reference || ref.original)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-light-background dark:bg-dark-background hover:bg-primary/10 dark:hover:bg-primary/20 text-light-text-primary dark:text-dark-text-primary hover:text-primary rounded-md text-[11px] font-bold border border-light-border/60 dark:border-dark-border/60 transition-colors group cursor-pointer"
                                            >
                                                <span>{ref.original || ref.reference}</span>
                                                <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-disabled mb-1 px-1">
                                Matches ({searchResults.length})
                            </p>
                            {searchResults.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectDictionaryEntry(item)}
                                    className="w-full p-2.5 bg-white dark:bg-dark-background/40 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/40 transition-all text-left group cursor-pointer"
                                >
                                    <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors block mb-0.5">
                                        {item.term}
                                    </span>
                                    <p className="text-[11px] text-light-text-disabled line-clamp-2 leading-relaxed">
                                        {item.definition}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : isLoading ? (
                        <div className="py-20 text-center">
                            <Loader2 size={20} className="animate-spin text-primary mx-auto mb-2" />
                            <p className="text-[11px] text-light-text-disabled">Searching dictionary...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                            <div className="w-12 h-12 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center mb-2.5 border border-light-border dark:border-dark-border">
                                <Book size={18} className="text-light-text-disabled" />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary mb-1">
                                Search Bible Dictionary
                            </h3>
                            <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary max-w-[200px] leading-relaxed">
                                Type a term above or click any word in the Bible reader to inspect its definition.
                            </p>
                        </div>
                    )
                ) : (
                    /* NAVE'S TOPICAL INDEX TAB */
                    selectedTopicalEntry ? (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Topic Heading & Insert Action */}
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-light-border dark:border-dark-border">
                                <div>
                                    <h3 className="text-base font-black text-light-text-primary dark:text-dark-text-primary">
                                        {selectedTopicalEntry.topic}
                                    </h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        Nave's Topical Bible
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={handleCopyTopicalToNote}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
                                        title="Insert topical references into note"
                                    >
                                        {isCopied ? (
                                            <>
                                                <Check size={12} className="text-green-500" />
                                                <span className="text-green-500">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={12} />
                                                <span>Insert Study</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Subtopics and Scripture References */}
                            <div className="space-y-3">
                                {selectedTopicalEntry.subtopics.map((sub, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-light-background/60 dark:bg-dark-background/60 rounded-xl border border-light-border/60 dark:border-dark-border/60 space-y-2"
                                    >
                                        <h4 className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">
                                            {sub.title}
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {sub.refs.map((ref, rIdx) => (
                                                <button
                                                    key={rIdx}
                                                    onClick={() => handleNavigateScripture(ref)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-dark-surface hover:bg-primary/10 dark:hover:bg-primary/20 text-light-text-primary dark:text-dark-text-primary hover:text-primary rounded-md text-[10px] font-bold border border-light-border/60 dark:border-dark-border/60 transition-colors group cursor-pointer"
                                                >
                                                    <span>{ref}</span>
                                                    <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : topicalResults.length > 0 ? (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-disabled mb-1 px-1">
                                Topics ({topicalResults.length})
                            </p>
                            {topicalResults.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectTopicalEntry(item)}
                                    className="w-full p-2.5 bg-white dark:bg-dark-background/40 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/40 transition-all text-left group cursor-pointer"
                                >
                                    <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors block mb-0.5">
                                        {item.topic}
                                    </span>
                                    <p className="text-[10px] text-light-text-disabled truncate">
                                        {item.subtopics.length} subtopics • {item.subtopics.reduce((acc, s) => acc + s.refs.length, 0)} scripture references
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : isLoading ? (
                        <div className="py-20 text-center">
                            <Loader2 size={20} className="animate-spin text-primary mx-auto mb-2" />
                            <p className="text-[11px] text-light-text-disabled">Searching topics...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                            <div className="w-12 h-12 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center mb-2.5 border border-light-border dark:border-dark-border">
                                <Bookmark size={18} className="text-light-text-disabled" />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary mb-1">
                                Search Topical Bible
                            </h3>
                            <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary max-w-[200px] leading-relaxed">
                                Search over 5,300 biblical topics and doctrines with exhaustive scripture cross-references.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
