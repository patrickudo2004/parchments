import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import InfoIcon from '@mui/icons-material/Info';

export const BibleReader: React.FC = () => {
    const { bibleFocus } = useUIStore();
    const contentRef = useRef<HTMLDivElement>(null);

    // Mock state for content
    const [version, setVersion] = useState('ESV');
    const [book, setBook] = useState('John');
    const [chapter, setChapter] = useState('3');

    // Sync with bibleFocus
    useEffect(() => {
        if (bibleFocus) {
            setBook(bibleFocus.book);
            setChapter(bibleFocus.chapter.toString());

            // Wait for render then scroll
            setTimeout(() => {
                if (bibleFocus.verse) {
                    const verseId = `verse-${bibleFocus.verse}`;
                    const el = document.getElementById(verseId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Add highlight class temporarily
                        el.classList.add('bg-yellow-200', 'dark:bg-yellow-900');
                        setTimeout(() => el.classList.remove('bg-yellow-200', 'dark:bg-yellow-900'), 2000);
                    }
                }
            }, 100);
        }
    }, [bibleFocus]);

    return (
        <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface">
            {/* Header */}
            <div className="h-14 border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 bg-light-background dark:bg-dark-background shrink-0">
                {/* Selectors */}
                <div className="flex items-center gap-2">
                    <select
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option>ESV</option>
                        <option>NIV</option>
                        <option>KJV</option>
                    </select>
                    <span className="text-light-text-disabled">|</span>
                    <select
                        value={book}
                        onChange={(e) => setBook(e.target.value)}
                        className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option>John</option>
                        <option>Matthew</option>
                        <option>Mark</option>
                        <option>Luke</option>
                    </select>
                    <select
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option>3</option>
                        <option>1</option>
                        <option>2</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="flex-1 overflow-y-auto p-8 bg-white dark:bg-dark-surface">
                <h1 className="text-3xl font-bold mb-6 text-light-text-primary dark:text-dark-text-primary">{book} {chapter}</h1>

                {/* Summary Box */}
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 mb-6 flex gap-3 text-sm text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800">
                    <InfoIcon className="text-primary shrink-0" fontSize="small" />
                    <div>
                        <span className="font-bold">Summary:</span> Jesus teaches Nicodemus about the necessity of being born again.
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-4 text-lg leading-relaxed text-light-text-primary dark:text-dark-text-primary font-serif">
                    <p>
                        <sup id="verse-1" className="text-secondary font-bold text-xs mr-1 align-top select-none">1</sup>
                        Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews.
                    </p>
                    <p>
                        <sup id="verse-2" className="text-secondary font-bold text-xs mr-1 align-top select-none">2</sup>
                        This man came to Jesus by night and said to him, “Rabbi, we know that you are a teacher come from God...”
                    </p>
                    <p>
                        <sup id="verse-3" className="text-secondary font-bold text-xs mr-1 align-top select-none">3</sup>
                        Jesus answered him, “Truly, truly, I say to you, unless one is born again he cannot see the kingdom of God.”
                    </p>
                    <p>
                        <sup id="verse-16" className="text-secondary font-bold text-xs mr-1 align-top select-none">16</sup>
                        <span className="transition-colors duration-1000">For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.</span>
                    </p>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="h-12 border-t border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background flex items-center justify-between px-4 shrink-0 text-sm font-medium text-primary select-none">
                <button className="flex items-center hover:underline"><NavigateBeforeIcon fontSize="small" /> Prev</button>
                <span className="text-light-text-disabled text-xs hidden sm:block">ESV Text Edition: 2016</span>
                <button className="flex items-center hover:underline">Next <NavigateNextIcon fontSize="small" /></button>
            </div>
        </div>
    );
};
