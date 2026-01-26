import type { BibleVerse } from '@/types/database';
import { useBibleStore } from '@/stores/bibleStore';
import { useUIStore } from '@/stores/uiStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { InterlinearWord } from './InterlinearWord';
import { Pin } from 'lucide-react';
import { useResearchStore } from '@/stores/researchStore';

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
    const { openCrossRefs, selectedVerseId } = useUIStore();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();

    // Base verse ID (book-chapter-verse) from any available verse
    const firstVerse = Object.values(versesByVersion)[0];
    const verseId = firstVerse ? `${firstVerse.book.toLowerCase()}-${firstVerse.chapter}-${firstVerse.verse}` : null;

    // Check for references
    const hasRefsCount = useLiveQuery(
        () => verseId ? db.crossReferences.where('sourceVerseId').equals(verseId).count() : 0,
        [verseId]
    ) || 0;
    const hasRefs = hasRefsCount > 0;

    return (
        <div
            id={`verse-${verseNum}`}
            className={`grid gap-8 py-4 border-b border-light-border/30 dark:border-dark-border/30 last:border-0 hover:bg-light-background/20 dark:hover:bg-dark-background/10 transition-colors ${selectedVerseId === verseId ? 'bg-primary/5' : ''}`}
            style={{ gridTemplateColumns: `repeat(${versions.length}, minmax(0, 1fr))` }}
        >
            {versions.map((vid) => {
                const v = versesByVersion[vid];
                return (
                    <div key={vid} className="relative group">
                        {/* Verse Number & Ref Indicator */}
                        <button
                            onClick={() => verseId && openCrossRefs(verseId)}
                            className="inline-flex items-center gap-1 mr-2 select-none group/num"
                        >
                            <sup className={`font-black text-xs transition-colors ${selectedVerseId === verseId ? 'text-primary' : 'text-primary/50 group-hover/num:text-primary'}`}>
                                {verseNum}
                            </sup>
                            {hasRefs && (
                                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            )}
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const id = `${vid}-${verseId}`;
                                if (isItemPinned(id)) {
                                    unpinItem(id);
                                } else if (v) {
                                    pinItem({
                                        id,
                                        type: 'verse',
                                        title: `${vid.toUpperCase()} - ${v.book} ${v.chapter}:${v.verse}`,
                                        content: v.text,
                                        reference: `${v.book} ${v.chapter}:${v.verse} (${vid.toUpperCase()})`,
                                        metadata: { versionId: vid, verseId }
                                    });
                                }
                            }}
                            className={`inline-flex p-1 rounded transition-all opacity-0 group-hover:opacity-100 mr-2 ${isItemPinned(`${vid}-${verseId}`) ? 'text-primary bg-primary/10' : 'text-light-text-disabled hover:text-primary hover:bg-primary/5'}`}
                            title="Pin to Research"
                        >
                            <Pin size={12} />
                        </button>

                        <div className="inline-block text-lg leading-relaxed font-serif text-light-text-main dark:text-dark-text-main">
                            {!v ? (
                                <span className="text-light-text-disabled italic text-sm">Text not available</span>
                            ) : (
                                interlinearEnabled && v.interlinear ? (
                                    <div className="flex flex-wrap gap-x-4 gap-y-6 mt-2">
                                        {v.interlinear.map((word, idx) => (
                                            <InterlinearWord key={idx} word={word} />
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
