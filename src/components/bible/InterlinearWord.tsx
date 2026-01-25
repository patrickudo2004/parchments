import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface InterlinearWordProps {
    word: { text: string; number: string };
    onClick: (id: string) => void;
}

export const InterlinearWord: React.FC<InterlinearWordProps> = ({ word, onClick }) => {
    const entry = useLiveQuery(() => db.strongsEntries.get(word.number.toUpperCase()), [word.number]);

    return (
        <div className="flex flex-col items-start min-w-fit">
            <span className="text-[10px] font-black uppercase tracking-tight text-light-text-disabled leading-none mb-1">
                {word.text}
            </span>
            <button
                onClick={() => onClick(word.number.toUpperCase())}
                className="group flex flex-col items-start"
            >
                <span className="text-base font-serif text-light-text-primary dark:text-dark-text-primary group-hover:text-primary transition-colors">
                    {entry?.lemma || '...'}
                </span>
                <span className="text-[9px] font-bold text-primary opacity-50 group-hover:opacity-100 transition-opacity">
                    {word.number.toUpperCase()}
                </span>
            </button>
        </div>
    );
};
