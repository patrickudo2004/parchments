import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import InfoIcon from '@mui/icons-material/Info';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { BibleVerse, BibleVersion } from '@/types/database';

export const BibleReader: React.FC = () => {
    const { bibleFocus, preferredBibleVersion } = useUIStore();
    const contentRef = useRef<HTMLDivElement>(null);

    // Current Navigation State
    const [versionId, setVersionId] = useState(preferredBibleVersion.toLowerCase());
    const [book, setBook] = useState(bibleFocus?.book || 'John');
    const [chapter, setChapter] = useState(bibleFocus?.chapter || 1);

    // Live Queries
    const installedVersions = useLiveQuery(() => db.bibleVersions.where('isDownloaded').equals(1).toArray()) || [];
    const verses = useLiveQuery(() =>
        db.bibleVerses.where('[versionId+book+chapter]').equals([versionId, book, chapter]).sortBy('verse')
    ) || [];
    const summary = useLiveQuery(() =>
        db.chapterSummaries.get(`${book}-${chapter}`)
    );

    // Sync with bibleFocus from global store
    useEffect(() => {
        if (bibleFocus) {
            setBook(bibleFocus.book);
            setChapter(bibleFocus.chapter);

            // Wait for render then scroll to focused verse
            if (bibleFocus.verse !== null && bibleFocus.verse !== undefined) {
                setTimeout(() => {
                    const start = bibleFocus.verse!;
                    const end = bibleFocus.verseEnd || start;

                    for (let i = start; i <= end; i++) {
                        const el = document.getElementById(`verse-${i}`);
                        if (el) {
                            if (i === start) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('bg-primary/10', 'border-l-4', 'border-primary', 'pl-2');
                            setTimeout(() => el.classList.remove('bg-primary/10', 'border-l-4', 'border-primary', 'pl-2'), 4000);
                        }
                    }
                }, 100);
            }
        }
    }, [bibleFocus]);

    const handleVersionChange = (newVersion: string) => {
        setVersionId(newVersion.toLowerCase());
    };

    const handleNavigation = (direction: 'next' | 'prev') => {
        // Simple navigation logic (could be improved with book/chapter boundaries)
        if (direction === 'next') setChapter(prev => prev + 1);
        else if (chapter > 1) setChapter(prev => prev - 1);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface">
            {/* Nav Header */}
            <div className="h-14 border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 bg-light-background/30 dark:bg-dark-background/20 shrink-0">
                <div className="flex items-center gap-2">
                    <select
                        value={versionId.toUpperCase()}
                        onChange={(e) => handleVersionChange(e.target.value)}
                        className="bg-transparent border-none text-xs font-black uppercase tracking-tight focus:ring-0 cursor-pointer hover:text-primary transition-colors"
                    >
                        {installedVersions.map((v: BibleVersion) => (
                            <option key={v.id} value={v.id.toUpperCase()}>{v.abbreviation}</option>
                        ))}
                        {installedVersions.length === 0 && <option disabled>No Bibles</option>}
                    </select>
                    <div className="w-[1px] h-3 bg-light-border dark:border-dark-border mx-1" />
                    <button className="text-xs font-black uppercase tracking-tight hover:text-primary transition-colors">
                        {book} {chapter}
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => handleNavigation('prev')} className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><NavigateBeforeIcon fontSize="small" /></button>
                    <button onClick={() => handleNavigation('next')} className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><NavigateNextIcon fontSize="small" /></button>
                </div>
            </div>

            {/* Reading Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="max-w-prose mx-auto">
                    <h1 className="text-4xl font-black mb-8 text-light-text-primary dark:text-dark-text-primary tracking-tight">
                        {book} <span className="text-primary">{chapter}</span>
                    </h1>

                    {/* Uniform Summary Box */}
                    {summary && (
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 mb-8 flex gap-4 text-sm text-light-text-main dark:text-dark-text-main border border-primary/10 animate-in fade-in duration-500">
                            <InfoIcon className="text-primary shrink-0" fontSize="small" />
                            <div className="leading-relaxed">
                                <span className="font-black uppercase tracking-widest text-[10px] text-primary block mb-1">Contextual Summary</span>
                                {summary.summary}
                            </div>
                        </div>
                    )}

                    {/* Scripture Text */}
                    <div className="space-y-6 text-xl leading-relaxed text-light-text-main dark:text-dark-text-main font-serif">
                        {verses.length > 0 ? (
                            verses.map((v: BibleVerse) => (
                                <div key={v.id} id={`verse-${v.verse}`} className="transition-all duration-500 rounded p-1 -mx-1">
                                    <sup className="text-primary font-black text-[10px] mr-2 select-none opacity-50">{v.verse}</sup>
                                    <span className="opacity-90">{v.text}</span>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <p className="text-light-text-disabled italic">Scripture text not available for this version offline.</p>
                                <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline">Download {versionId.toUpperCase()}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="h-12 border-t border-light-border dark:border-dark-border bg-light-background/20 dark:bg-dark-background/10 flex items-center justify-between px-6 shrink-0 text-[10px] font-black uppercase tracking-widest text-light-text-disabled select-none">
                <button onClick={() => handleNavigation('prev')} className="flex items-center hover:text-primary transition-colors"><NavigateBeforeIcon fontSize="inherit" className="mr-1" /> Previous</button>
                <span className="hidden sm:block">
                    {installedVersions.find((v: BibleVersion) => v.id === versionId)?.name || 'Translation'}
                </span>
                <button onClick={() => handleNavigation('next')} className="flex items-center hover:text-primary transition-colors">Next <NavigateNextIcon fontSize="inherit" className="ml-1" /></button>
            </div>
        </div>
    );
};
