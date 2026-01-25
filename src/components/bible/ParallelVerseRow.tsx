import React from 'react';
import type { BibleVerse } from '@/types/database';
import { useBibleStore } from '@/stores/bibleStore';
import { useUIStore } from '@/stores/uiStore';
import { InterlinearWord } from './InterlinearWord';

interface ParallelVerseRowProps {
    verseNum: number;
    versions: string[];
    versesByVersion: Record<string, BibleVerse>;
}

export const ParallelVerseRow: React.FC<ParallelVerseRowProps> = ({
    verseNum,
    versions,
    versesByVersion
}) => {
    const { interlinearEnabled } = useBibleStore();
    const { toggleStrongsModal } = useUIStore();

    return (
        <div
            id={`verse-${verseNum}`}
            className="grid gap-8 py-4 border-b border-light-border/30 dark:border-dark-border/30 last:border-0 hover:bg-light-background/20 dark:hover:bg-dark-background/10 transition-colors"
            style={{ gridTemplateColumns: `repeat(${versions.length}, minmax(0, 1fr))` }}
        >
            {versions.map((vid) => {
                const v = versesByVersion[vid];
                return (
                    <div key={vid} className="relative group">
                        {/* Only show verse number on the first column or if explicitly needed */}
                        <sup className="text-primary font-black mr-2 select-none opacity-50 text-xs">
                            {verseNum}
                        </sup>

                        <div className="inline-block text-lg leading-relaxed font-serif text-light-text-main dark:text-dark-text-main">
                            {!v ? (
                                <span className="text-light-text-disabled italic text-sm">Text not available</span>
                            ) : (
                                interlinearEnabled && v.interlinear ? (
                                    <div className="flex flex-wrap gap-x-4 gap-y-6 mt-2">
                                        {v.interlinear.map((word, idx) => (
                                            <InterlinearWord key={idx} word={word} onClick={toggleStrongsModal} />
                                        ))}
                                    </div>
                                ) : (
                                    v.text
                                )
                            )}
                        </div>

                        {/* Version Sub-tag for clarity in parallel view */}
                        {versions.length > 1 && (
                            <div className="absolute -top-1 -right-1 text-[8px] font-black uppercase tracking-tighter text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {vid}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
