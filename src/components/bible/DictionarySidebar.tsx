import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { useNoteStore } from '@/stores/noteStore';
import { referenceDataService } from '@/lib/bible/ReferenceDataService';
import type { DictionaryEntry } from '@/types/database';
import {
    Book,
    Search,
    Maximize2,
    Minimize2,
    Copy,
    Check,
    Loader2,
    ExternalLink,
    X
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

    const [searchQuery, setSearchQuery] = useState(selectedDictionaryTerm || '');
    const [searchResults, setSearchResults] = useState<DictionaryEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Initial setup / installation if needed
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            const installed = await referenceDataService.isDictionaryInstalled();
            if (!installed) {
                try {
                    await referenceDataService.installDictionary();
                } catch (e) {
                    console.error('[DictionarySidebar] Auto-install failed:', e);
                }
            }

            if (selectedDictionaryTerm) {
                setSearchQuery(selectedDictionaryTerm);
                const direct = await referenceDataService.getDictionaryEntry(selectedDictionaryTerm);
                if (isMounted && direct) {
                    setSelectedEntry(direct);
                }
            }
        };
        init();
        return () => { isMounted = false; };
    }, [selectedDictionaryTerm]);

    // Live search when typing
    useEffect(() => {
        let isMounted = true;
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const results = await referenceDataService.searchDictionary(searchQuery, 20);
                if (isMounted) {
                    setSearchResults(results);
                    // If exact match exists and no selected entry, select it
                    const exact = results.find(r => r.term.toLowerCase() === searchQuery.toLowerCase().trim());
                    if (exact && !selectedEntry) {
                        setSelectedEntry(exact);
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
    }, [searchQuery]);

    const handleSelectEntry = (entry: DictionaryEntry) => {
        setSelectedEntry(entry);
        setSelectedDictionaryTerm(entry.term);
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

    const handleCopyToNote = () => {
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

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Header Area */}
            <div className="p-4 border-b border-light-border dark:border-dark-border bg-light-background/30 dark:bg-dark-background/20 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Book size={16} />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">
                                Bible Dictionary
                            </h2>
                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                Easton's (1897)
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
                                {isRightSidebarFloating ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-disabled" size={13} />
                    <input
                        type="text"
                        placeholder="Search 5,900+ biblical terms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl pl-8 pr-8 py-2 text-xs text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedEntry(null);
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                {selectedEntry ? (
                    <div className="space-y-4">
                        {/* Entry Heading & Copy Action */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-light-border dark:border-dark-border">
                            <div>
                                <h3 className="text-lg font-black text-light-text-primary dark:text-dark-text-primary">
                                    {selectedEntry.term}
                                </h3>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Easton's Bible Dictionary
                                </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={handleCopyToNote}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
                                    title="Copy definition to note"
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

                        {/* Scripture References Chips */}
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
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-light-background dark:bg-dark-background hover:bg-primary/10 dark:hover:bg-primary/20 text-light-text-primary dark:text-dark-text-primary hover:text-primary rounded-md text-[11px] font-bold border border-light-border/60 dark:border-dark-border/60 transition-colors group"
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
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-disabled mb-2">
                            Matches ({searchResults.length})
                        </p>
                        {searchResults.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelectEntry(item)}
                                className="w-full p-3 bg-white dark:bg-dark-background/40 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl border border-light-border dark:border-dark-border hover:border-primary/40 transition-all text-left group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors">
                                        {item.term}
                                    </span>
                                </div>
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
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-14 h-14 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center mb-3 border border-light-border dark:border-dark-border">
                            <Book size={20} className="text-light-text-disabled" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-light-text-primary mb-1">
                            Search Bible Dictionary
                        </h3>
                        <p className="text-[11px] text-light-text-secondary max-w-[200px] leading-relaxed">
                            Type a term above or select a biblical word in the Bible reader to inspect its definition.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
