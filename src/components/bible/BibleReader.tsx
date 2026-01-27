import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { ChevronRight, ChevronLeft, Plus, X as CloseIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BibleVerse, BibleVersion } from '@/types/database';
import { BookChapterPicker } from './BookChapterPicker';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { Languages } from 'lucide-react';
import { ParallelVerseRow } from './ParallelVerseRow';
import { Pin, X } from 'lucide-react';
import { useResearchStore } from '@/stores/researchStore';
import { motion, AnimatePresence } from 'framer-motion';

interface BibleReaderProps {
    isIndependent?: boolean;
}

export const BibleReader: React.FC<BibleReaderProps> = ({ isIndependent = false }) => {
    const {
        bibleFocus,
        mainVersion,
        parallelVersions,
        setMainVersion,
        addParallelVersion,
        removeParallelVersion,
        setBibleFocus,
        interlinearEnabled,
        toggleInterlinear,
        selectionRange,
        setSelectionRange
    } = useBibleStore();

    const { pinItem } = useResearchStore();

    const { showToast } = useUIStore();
    const contentRef = useRef<HTMLDivElement>(null);

    // Current Navigation State
    const [book, setBook] = useState(bibleFocus?.book || 'John');
    const [chapter, setChapter] = useState(bibleFocus?.chapter || 1);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isAddParallelOpen, setIsAddParallelOpen] = useState(false);

    const activeVersions = [mainVersion, ...parallelVersions];

    const installedVersions = useLiveQuery(async () => {
        const all = await db.bibleVersions.toArray();
        return all.filter(v => v.isDownloaded);
    }) || [];

    // Fetch all verses for all active versions in the current chapter
    const allVerses = useLiveQuery(async () => {
        if (!activeVersions.length) return [];

        // Use parallel queries with the compound index for maximum speed
        const results = await Promise.all(
            activeVersions.map(vid =>
                db.bibleVerses.where('[versionId+book+chapter]').equals([vid, book, chapter]).toArray()
            )
        );
        return results.flat();
    }, [activeVersions, book, chapter]) || [];

    // Group verses by verse number
    const groupedVerses = React.useMemo(() => {
        const groups: Record<number, Record<string, BibleVerse>> = {};
        allVerses.forEach(v => {
            if (!groups[v.verse]) groups[v.verse] = {};
            groups[v.verse][v.versionId] = v;
        });
        return groups;
    }, [allVerses]);

    const sortedVerseNums = Object.keys(groupedVerses).map(Number).sort((a, b) => a - b);

    // Sync with bibleFocus from global store (only if NOT independent)
    useEffect(() => {
        if (bibleFocus && !isIndependent) {
            setBook(bibleFocus.book);
            setChapter(bibleFocus.chapter);

            if (bibleFocus.verse !== null && bibleFocus.verse !== undefined) {
                setTimeout(() => {
                    const el = document.getElementById(`verse-${bibleFocus.verse}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [bibleFocus, isIndependent]);

    const handleNavigation = (direction: 'next' | 'prev') => {
        const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === book);
        const currentBookData = BIBLE_BOOKS[currentBookIndex];
        let newBook = book;
        let newChapter = chapter;

        if (direction === 'next') {
            if (chapter < currentBookData.chapters) {
                newChapter = chapter + 1;
            } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
                const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
                newBook = nextBook.name;
                newChapter = 1;
            }
        } else {
            if (chapter > 1) {
                newChapter = chapter - 1;
            } else if (currentBookIndex > 0) {
                const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
                newBook = prevBook.name;
                newChapter = prevBook.chapters;
            }
        }

        if (newBook !== book || newChapter !== chapter) {
            setBook(newBook);
            setChapter(newChapter);
            if (!isIndependent) {
                setBibleFocus({ book: newBook, chapter: newChapter, verse: null });
            }
        }
        contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    };

    const handlePickerSelect = (newBook: string, newChapter: number) => {
        setBook(newBook);
        setChapter(newChapter);
        if (!isIndependent) {
            setBibleFocus({ book: newBook, chapter: newChapter, verse: null });
        }
        setIsPickerOpen(false);
        contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    };

    const handlePinSelection = async () => {
        if (!selectionRange) return;
        const start = Math.min(selectionRange.start, selectionRange.end);
        const end = Math.max(selectionRange.start, selectionRange.end);

        // Fetch direct from DB to ensure we have all verses in the range
        // regardless of local state/loading
        const rangeVerses = await db.bibleVerses
            .where('[versionId+book+chapter]')
            .equals([mainVersion, book, chapter])
            .and(v => v.verse >= start && v.verse <= end)
            .sortBy('verse');

        if (rangeVerses.length === 0) {
            showToast('No verses found in selection', 'error');
            return;
        }

        const combinedText = rangeVerses.map(v => `<sup class="text-[10px] opacity-50 mr-1">${v.verse}</sup>${v.text}`).join(' ');
        const ref = `${book} ${chapter}:${start}${start !== end ? `-${end}` : ''} (${mainVersion.toUpperCase()})`;
        const id = `range-${book}-${chapter}-${start}-${end}-${mainVersion}`;

        pinItem({
            id,
            type: 'verse',
            title: ref,
            content: combinedText,
            reference: ref,
            metadata: {
                book,
                chapter: Number(chapter),
                verse: Number(start),
                verseEnd: end !== start ? Number(end) : undefined,
                versionId: mainVersion
            },
            sourceIds: rangeVerses.map(v => v.id)
        });

        showToast(`Pinned ${rangeVerses.length} verses!`, 'success');
        setSelectionRange(null);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface relative overflow-hidden">
            {/* Nav Header */}
            <div className={`h-14 border-b border-light-border dark:border-dark-border flex items-center justify-between pl-4 ${!isIndependent ? 'pr-14' : 'pr-4'} bg-light-background/30 dark:bg-dark-background/20 shrink-0`}>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[60%]">
                    <select
                        value={mainVersion}
                        onChange={(e) => setMainVersion(e.target.value)}
                        className="bg-transparent border-none text-xs font-black uppercase tracking-tight focus:ring-0 cursor-pointer hover:text-primary transition-colors shrink-0"
                    >
                        {installedVersions.map((v: BibleVersion) => (
                            <option key={v.id} value={v.id}>{v.abbreviation}</option>
                        ))}
                    </select>

                    {parallelVersions.map(vid => (
                        <div key={vid} className="flex items-center bg-primary/10 rounded-full pl-2 pr-1 py-0.5 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-primary mr-1">
                                {installedVersions.find(v => v.id === vid)?.abbreviation || vid.toUpperCase()}
                            </span>
                            <button onClick={() => removeParallelVersion(vid)} className="text-primary hover:text-primary/70">
                                <CloseIcon style={{ fontSize: '12px' }} />
                            </button>
                        </div>
                    ))}

                    {activeVersions.length < 4 && (
                        <button
                            onClick={() => setIsAddParallelOpen(!isAddParallelOpen)}
                            className={`p-1 rounded-full hover:bg-primary/10 text-primary transition-colors ${isAddParallelOpen ? 'bg-primary/20' : ''}`}
                        >
                            <Plus size={18} />
                        </button>
                    )}

                    <div className="w-[1px] h-3 bg-light-border dark:border-dark-border mx-1 shrink-0" />
                    <button
                        onClick={() => setIsPickerOpen(!isPickerOpen)}
                        className={`text-xs font-black uppercase tracking-tight hover:text-primary transition-colors shrink-0 ${isPickerOpen ? 'text-primary' : ''}`}
                    >
                        {book} {chapter} {isPickerOpen ? '▴' : '▾'}
                    </button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={toggleInterlinear}
                        className={`p-1.5 rounded-full transition-colors ${interlinearEnabled ? 'bg-primary/10 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-disabled'}`}
                        title="Toggle Interlinear"
                    >
                        <Languages size={18} />
                    </button>
                    <div className="w-[1px] h-3 bg-light-border dark:border-dark-border mx-1" />
                    <button onClick={() => handleNavigation('prev')} className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><ChevronLeft size={18} /></button>
                    <button onClick={() => handleNavigation('next')} className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><ChevronRight size={18} /></button>
                </div>
            </div>

            {/* Parallel Selector Popover */}
            {isAddParallelOpen && (
                <div className="absolute top-16 left-4 z-[100] bg-white dark:bg-dark-surface shadow-2xl rounded-xl border border-light-border dark:border-dark-border p-2 min-w-[200px]">
                    <div className="p-2 text-[10px] font-black uppercase text-light-text-disabled border-b border-light-border dark:border-dark-border mb-1">Add Parallel View</div>
                    {installedVersions.filter(v => !activeVersions.includes(v.id)).map(v => (
                        <button
                            key={v.id}
                            onClick={() => {
                                addParallelVersion(v.id);
                                setIsAddParallelOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-primary/10 hover:text-primary rounded-lg transition-colors flex justify-between items-center"
                        >
                            {v.name}
                            <span className="text-[10px] opacity-50 uppercase">{v.abbreviation}</span>
                        </button>
                    ))}
                    {installedVersions.length <= activeVersions.length && (
                        <div className="p-4 text-center">
                            <p className="text-xs text-light-text-disabled italic mb-2">No other bibles found.</p>
                            <button
                                onClick={() => showToast('Go to Settings to download more versions', 'info')}
                                className="text-[10px] font-black text-primary uppercase"
                            >
                                Download Bibles
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Picker Overlay */}
            {isPickerOpen && (
                <BookChapterPicker
                    currentBook={book}
                    currentChapter={chapter}
                    onSelect={handlePickerSelect}
                    onClose={() => setIsPickerOpen(false)}
                />
            )}

            {/* Reading Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1400px] mx-auto p-4 sm:p-12">
                    <h1 className="text-5xl font-black mb-12 text-light-text-primary dark:text-dark-text-primary tracking-tight">
                        {book} <span className="text-primary">{chapter}</span>
                    </h1>

                    {/* Scripture Text - Grid Version */}
                    <div className="flex flex-col">
                        {sortedVerseNums.length > 0 ? (
                            sortedVerseNums.map((vNum) => (
                                <ParallelVerseRow
                                    key={vNum}
                                    verseNum={vNum}
                                    versions={activeVersions}
                                    versesByVersion={groupedVerses[vNum]}
                                />
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <p className="text-light-text-disabled italic text-xl font-serif">Scripture text loading or not available.</p>
                            </div>
                        )}
                    </div>

                    {/* Chapter End Navigation */}
                    <div className="mt-20 py-10 border-t border-light-border dark:border-dark-border flex justify-between items-center">
                        <button
                            onClick={() => handleNavigation('prev')}
                            className="flex flex-col items-start gap-1 p-4 hover:bg-light-background dark:hover:bg-dark-background rounded-xl transition-all"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Previous</span>
                            <span className="font-bold flex items-center text-lg"><ChevronLeft /> Previous Chapter</span>
                        </button>
                        <button
                            onClick={() => handleNavigation('next')}
                            className="flex flex-col items-end gap-1 p-4 hover:bg-light-background dark:hover:bg-dark-background rounded-xl transition-all"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">Next</span>
                            <span className="font-bold flex items-center text-lg">Next Chapter <ChevronRight /></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="h-10 border-t border-light-border dark:border-dark-border bg-light-background/20 dark:bg-dark-background/10 flex items-center justify-between px-6 shrink-0 text-[9px] font-black uppercase tracking-widest text-light-text-disabled select-none">
                <button onClick={() => handleNavigation('prev')} className="flex items-center hover:text-primary transition-colors hover:scale-105 transform"><ChevronLeft size={16} className="mr-1" /> Previous</button>
                <div className="flex gap-4">
                    {activeVersions.map(vid => (
                        <span key={vid}>
                            {installedVersions.find(v => v.id === vid)?.abbreviation || vid.toUpperCase()}
                        </span>
                    ))}
                </div>
                <button onClick={() => handleNavigation('next')} className="flex items-center hover:text-primary transition-colors hover:scale-105 transform">Next <ChevronRight size={16} className="ml-1" /></button>
            </div>

            {/* Floating Selection Bar */}
            <AnimatePresence>
                {selectionRange && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[100] bg-dark-surface border border-white/10 shadow-2xl rounded-2xl p-2 px-4 flex items-center gap-4 text-white"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <Pin size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {book} {chapter}:{Math.min(selectionRange.start, selectionRange.end)}{selectionRange.start !== selectionRange.end ? `-${Math.max(selectionRange.start, selectionRange.end)}` : ''}
                                </span>
                                <span className="text-[8px] opacity-50 font-medium">
                                    {selectionRange.start === selectionRange.end ? '1 verse selected' : `${Math.abs(selectionRange.end - selectionRange.start) + 1} verses selected`}
                                </span>
                            </div>
                        </div>

                        <div className="w-[1px] h-6 bg-white/10" />

                        <button
                            onClick={handlePinSelection}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                        >
                            Pin Range
                        </button>

                        <button
                            onClick={() => setSelectionRange(null)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
