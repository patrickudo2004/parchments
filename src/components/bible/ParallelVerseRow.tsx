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
    const { interlinearEnabled, selectionRange, setSelectionRange, bibleFocus } = useBibleStore();
    const { openCrossRefs, selectedVerseId } = useUIStore();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();

    // Base verse ID (book-chapter-verse) from any available verse
    const firstVerse = Object.values(versesByVersion)[0];
    const verseId = firstVerse ? `${firstVerse.book.toLowerCase()}-${firstVerse.chapter}-${firstVerse.verse}` : null;

    // Check for references (both user linked notes and Treasury of Scripture Knowledge)
    const hasRefs = useLiveQuery(
        async () => {
            if (!verseId) return false;
            const userCount = await db.crossReferences.where('sourceVerseId').equals(verseId).count();
            if (userCount > 0) return true;
            const tskEntry = await db.tskRefs.get(verseId);
            return !!(tskEntry && tskEntry.refs && tskEntry.refs.length > 0);
        },
        [verseId]
    ) || false;

    const isFocused = Boolean(
        bibleFocus &&
        firstVerse &&
        bibleFocus.book.toLowerCase() === firstVerse.book.toLowerCase() &&
        bibleFocus.chapter === firstVerse.chapter &&
        (
            bibleFocus.segments && bibleFocus.segments.length > 0
                ? bibleFocus.segments.some(seg => verseNum >= seg.verse && verseNum <= (seg.verseEnd || seg.verse))
                : bibleFocus.verse !== null
                    ? verseNum >= bibleFocus.verse && verseNum <= (bibleFocus.verseEnd || bibleFocus.verse)
                    : false
        )
    );

    const isSelected = isFocused || (selectionRange && verseNum >= Math.min(selectionRange.start, selectionRange.end) && verseNum <= Math.max(selectionRange.start, selectionRange.end));

    const { isMobile } = useUIStore();

    return (
        <div
            id={`verse-${verseNum}`}
            onClick={(e) => {
                if (e.shiftKey && selectionRange) {
                    setSelectionRange({ ...selectionRange, end: verseNum });
                } else if (selectionRange) {
                    if (selectionRange.start === verseNum && selectionRange.end === verseNum) {
                        setSelectionRange(null);
                    } else if (selectionRange.start === selectionRange.end) {
                        setSelectionRange({ start: selectionRange.start, end: verseNum });
                    } else if (selectionRange.end === verseNum) {
                        setSelectionRange({ start: selectionRange.start, end: selectionRange.start });
                    } else {
                        setSelectionRange({ ...selectionRange, end: verseNum });
                    }
                } else {
                    setSelectionRange({ start: verseNum, end: verseNum });
                }
            }}
            className={`${isMobile ? 'flex flex-col gap-6' : 'grid gap-8'} py-4 border-b border-light-border/30 dark:border-dark-border/30 last:border-0 hover:bg-light-background/40 dark:hover:bg-dark-background/20 transition-all cursor-pointer select-none group/row ${selectedVerseId === verseId ? 'bg-primary/5' : ''} ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary -ml-4 pl-4' : ''}`}
            style={{ gridTemplateColumns: !isMobile ? `repeat(${versions.length}, minmax(0, 1fr))` : undefined }}
        >
            {versions.map((vid) => {
                const v = versesByVersion[vid];
                return (
                    <div key={vid} className="relative group/verse">
                        {/* Verse Number & Ref Indicator */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent row click from firing
                                if (e.shiftKey && selectionRange) {
                                    setSelectionRange({ ...selectionRange, end: verseNum });
                                } else {
                                    setSelectionRange({ start: verseNum, end: verseNum });
                                    if (verseId) openCrossRefs(verseId);
                                }
                            }}
                            className="inline-flex items-center gap-1 mr-2 select-none group/num"
                        >
                            <sup className={`font-black text-xs transition-colors ${selectedVerseId === verseId || isSelected ? 'text-primary scale-110' : 'text-light-text-secondary dark:text-dark-text-secondary group-hover/num:text-primary'}`}>
                                {verseNum}
                            </sup>
                            {vid === 'wlc' && firstVerse?.book?.toLowerCase() === 'psalms' && (
                                <span
                                    className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary/10 text-primary font-bold ml-0.5 cursor-help"
                                    title="Masoretic Text (WLC) verse offset: Psalms superscription traditional counting"
                                >
                                    MT v.{verseNum + 1}
                                </span>
                            )}
                            {vid === 'wlc' && firstVerse?.book?.toLowerCase() === 'malachi' && firstVerse?.chapter === 4 && (
                                <span
                                    className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary/10 text-primary font-bold ml-0.5 cursor-help"
                                    title="Masoretic Text (WLC) chapter offset: Malachi 4:1-6 corresponds to MT 3:19-24"
                                >
                                    MT 3:{verseNum + 18}
                                </span>
                            )}
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
                            className={`inline-flex items-center justify-center p-1.5 min-w-[26px] min-h-[26px] rounded transition-all mr-2 ${isItemPinned(`${vid}-${verseId}`) || isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-100 group-hover/verse:opacity-100'} ${isItemPinned(`${vid}-${verseId}`) ? 'text-primary bg-primary/10' : 'text-light-text-disabled hover:text-primary hover:bg-primary/5'}`}
                            title="Pin to Research"
                        >
                            <Pin size={12} />
                        </button>

                        {(() => {
                            const isHebrew = vid === 'wlc';
                            const isGreek = vid === 'tr' || vid === 'lxx';

                            return (
                                <div
                                    dir={isHebrew ? 'rtl' : 'ltr'}
                                    className={`inline-block text-lg leading-relaxed font-serif ${isHebrew ? 'text-right text-xl leading-loose font-serif' : isGreek ? 'font-serif' : ''} text-light-text-main dark:text-dark-text-main`}
                                >
                                    {!v ? (
                                        <span className="text-light-text-disabled italic text-xs">
                                            {isHebrew ? 'Text not in Old Testament' : vid === 'tr' ? 'Text not in New Testament' : vid === 'lxx' ? 'Text not in Septuagint' : 'Text not available'}
                                        </span>
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
                            );
                        })()}

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
