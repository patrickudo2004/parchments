import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBibleStore } from '@/stores/bibleStore';
import { Search } from 'lucide-react';

interface InterlinearWordProps {
    word: { text: string; number: string };
}

export const InterlinearWord: React.FC<InterlinearWordProps> = ({ word }) => {
    const entry = useLiveQuery(() => db.strongsEntries.get(word.number.toUpperCase()), [word.number]);
    const { openLexicon, toggleBibleModal } = useUIStore();
    const { setSearchOpen, setSearchQuery, executeSearch } = useBibleStore();

    const handleSearch = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSearchQuery(word.number.toUpperCase());
        setSearchOpen(true);
        toggleBibleModal(); // Ensure Bible Studyspace is open
        executeSearch();
    };

    return (
        <div className="flex flex-col items-start min-w-fit group/word relative">
            <span className="text-[10px] font-black uppercase tracking-tight text-light-text-disabled leading-none mb-1">
                {word.text}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => openLexicon(word.number.toUpperCase())}
                    className="group flex flex-col items-start"
                >
                    <span className="text-base font-serif text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors">
                        {entry?.lemma || '...'}
                    </span>
                    <span className="text-[9px] font-bold text-primary opacity-50 group-hover:opacity-100 transition-opacity">
                        {word.number.toUpperCase()}
                    </span>
                </button>
                <button
                    onClick={handleSearch}
                    className="p-1 hover:bg-primary/10 text-primary rounded-md opacity-0 group-hover/word:opacity-100 transition-all ml-1"
                    title={`Search all occurrences of ${word.number.toUpperCase()}`}
                >
                    <Search size={10} />
                </button>
            </div>
        </div>
    );
};
