import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { useNoteStore } from '@/stores/noteStore';
import { referenceDataService } from '@/lib/bible/ReferenceDataService';
import type { CommentaryEntry } from '@/types/database';
import {
    BookOpen,
    Maximize2,
    Minimize2,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Quote
} from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';

export const CommentarySidebar: React.FC<{ isIndependent?: boolean }> = ({ isIndependent = false }) => {
    const { isRightSidebarFloating, toggleRightSidebarFloating, showToast, activeEditor } = useUIStore();
    const { bibleFocus, setBibleFocus } = useBibleStore();
    const { currentNote, saveCurrentNote } = useNoteStore();

    const [source, setSource] = useState<'mh' | 'jfb'>('mh');
    const [entries, setEntries] = useState<CommentaryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const book = bibleFocus?.book || 'John';
    const chapter = bibleFocus?.chapter || 1;

    useEffect(() => {
        let isMounted = true;
        const loadCommentary = async () => {
            setIsLoading(true);
            try {
                const results = await referenceDataService.getCommentaryForChapter(source, book, chapter);
                if (isMounted) {
                    setEntries(results);
                }
            } catch (err) {
                console.error('[CommentarySidebar] Failed to load commentary:', err);
                if (isMounted) setEntries([]);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadCommentary();
        return () => { isMounted = false; };
    }, [source, book, chapter]);

    const handlePrevChapter = () => {
        if (chapter > 1) {
            setBibleFocus({ book, chapter: chapter - 1, verse: null });
        }
    };

    const handleNextChapter = () => {
        const bookMeta = BIBLE_BOOKS.find(b => b.name === book);
        if (bookMeta && chapter < bookMeta.chapters) {
            setBibleFocus({ book, chapter: chapter + 1, verse: null });
        }
    };

    const handleCopyToNote = (entry: CommentaryEntry, index: number) => {
        const citation = `${entry.sourceName} on ${book} ${chapter}${entry.verse ? `:${entry.verse}` : ''}`;
        const quoteHtml = `<blockquote><p>${entry.text}</p><p><em>— ${citation}</em></p></blockquote>`;

        if (activeEditor) {
            activeEditor.commands.insertContent(quoteHtml);
            showToast('Commentary copied to note!', 'success');
        } else if (currentNote) {
            saveCurrentNote(currentNote.title, (currentNote.content || '') + `<br/>` + quoteHtml);
            showToast('Commentary appended to note!', 'success');
        } else {
            // Copy to clipboard fallback
            navigator.clipboard.writeText(`"${entry.text}" — ${citation}`);
            showToast('Commentary copied to clipboard', 'info');
        }

        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Header Area */}
            <div className="p-4 border-b border-light-border dark:border-dark-border bg-light-background/30 dark:bg-dark-background/20 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <BookOpen size={16} />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">
                                Bible Commentary
                            </h2>
                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                {book} {chapter}
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

                {/* Source Selection & Chapter Stepper */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex bg-light-background dark:bg-dark-background p-0.5 rounded-lg border border-light-border/40 dark:border-dark-border/40">
                        <button
                            onClick={() => setSource('mh')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${source === 'mh' ? 'bg-primary text-white shadow-sm' : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'}`}
                        >
                            Matthew Henry
                        </button>
                        <button
                            onClick={() => setSource('jfb')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${source === 'jfb' ? 'bg-primary text-white shadow-sm' : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'}`}
                        >
                            JFB
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevChapter}
                            disabled={chapter <= 1}
                            className="p-1 rounded-md hover:bg-light-background dark:hover:bg-dark-background disabled:opacity-30 text-light-text-secondary transition-colors"
                            title="Previous Chapter"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-mono font-bold text-light-text-primary dark:text-dark-text-primary px-1">
                            {chapter}
                        </span>
                        <button
                            onClick={handleNextChapter}
                            className="p-1 rounded-md hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary transition-colors"
                            title="Next Chapter"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Commentary Body Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Loader2 size={24} className="animate-spin text-primary mb-3" />
                        <p className="text-xs font-medium text-light-text-disabled">
                            Loading {source === 'mh' ? 'Matthew Henry' : 'JFB'} exposition for {book} {chapter}...
                        </p>
                    </div>
                ) : entries.length > 0 ? (
                    <div className="space-y-6">
                        {entries.map((entry, idx) => (
                            <div
                                key={entry.id || idx}
                                className="p-4 bg-white dark:bg-dark-background/50 rounded-2xl border border-light-border/60 dark:border-dark-border/60 shadow-sm hover:border-primary/40 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-black text-primary uppercase tracking-wide">
                                        {entry.title || (entry.verse ? `Verse ${entry.verse}` : `${book} ${chapter}`)}
                                    </span>
                                    <button
                                        onClick={() => handleCopyToNote(entry, idx)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-light-text-disabled hover:text-primary transition-colors opacity-80 group-hover:opacity-100"
                                        title="Copy to current note"
                                    >
                                        {copiedIndex === idx ? (
                                            <>
                                                <Check size={11} className="text-green-500" />
                                                <span className="text-green-500">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={11} />
                                                <span>Insert Quote</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div
                                    className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-serif prose dark:prose-invert max-w-none"
                                >
                                    {entry.text}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-14 h-14 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center mb-3 border border-light-border dark:border-dark-border">
                            <Quote size={20} className="text-light-text-disabled" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-light-text-primary mb-1">
                            No Commentary Found
                        </h3>
                        <p className="text-[11px] text-light-text-secondary max-w-[220px]">
                            No exposition available for {book} {chapter} in {source === 'mh' ? 'Matthew Henry' : 'JFB'}.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
