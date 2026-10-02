import React, { useState, useEffect, useRef } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { db } from '@/lib/db';
import { useBibleStore } from '@/stores/bibleStore';
import type { BibleVerse } from '@/types/database';

interface ScriptureTooltipProps {
    children: React.ReactNode;
}

export const ScriptureTooltipProvider: React.FC<ScriptureTooltipProps> = ({ children }) => {
    const { verseHoverPreviews } = useBibleStore();

    if (!verseHoverPreviews) return <>{children}</>;

    return (
        <Tooltip.Provider delayDuration={400}>
            {children}
            <GlobalScriptureListener />
        </Tooltip.Provider>
    );
};

interface VerseSegmentGroup {
    verses: BibleVerse[];
    omittedBeforeNotice?: string | null;
}

const GlobalScriptureListener: React.FC = () => {
    const { mainVersion } = useBibleStore();
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [content, setContent] = useState<{ ref: string; segmentGroups: VerseSegmentGroup[]; version: string } | null>(null);

    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentTargetRef = useRef<HTMLElement | null>(null);
    const isHoveringTooltipRef = useRef(false);
    const activeFetchRef = useRef(0);

    useEffect(() => {
        const handleMouseOver = async (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('.scripture-ref') as HTMLElement | null;
            if (!target) return;

            // Clear any pending close timers when hovering over a reference
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }

            // If already displaying for this target, no need to re-query
            if (target === currentTargetRef.current && open) return;
            currentTargetRef.current = target;

            const book = target.getAttribute('data-book');
            const chapter = parseInt(target.getAttribute('data-chapter') || '0');
            const verse = parseInt(target.getAttribute('data-verse') || '0');
            const verseEnd = parseInt(target.getAttribute('data-verse-end') || '0');
            const rawSegments = target.getAttribute('data-segments');

            if (book && chapter && verse) {
                const fetchId = ++activeFetchRef.current;
                const versionId = mainVersion.toLowerCase();

                try {
                    const { parseVerseSegments } = await import('@/lib/scriptureParser');
                    const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');

                    const segments = rawSegments
                        ? parseVerseSegments(rawSegments)
                        : [{ verse, verseEnd: verseEnd && verseEnd > verse ? verseEnd : null }];

                    let activeVersionDisplay = mainVersion.toUpperCase();
                    const segmentGroups: Array<{ verses: BibleVerse[]; omittedBeforeNotice?: string | null }> = [];

                    for (let idx = 0; idx < segments.length; idx++) {
                        const seg = segments[idx];
                        let omittedBeforeNotice: string | null = null;

                        if (idx > 0) {
                            const prevEnd = segments[idx - 1].verseEnd || segments[idx - 1].verse;
                            const currentStart = seg.verse;
                            if (currentStart > prevEnd + 1) {
                                if (currentStart === prevEnd + 2) {
                                    omittedBeforeNotice = `v. ${prevEnd + 1} omitted`;
                                } else {
                                    omittedBeforeNotice = `vv. ${prevEnd + 1}–${currentStart - 1} omitted`;
                                }
                            }
                        }

                        let segVerses: BibleVerse[] = [];
                        if (seg.verseEnd && seg.verseEnd > seg.verse) {
                            segVerses = await db.bibleVerses
                                .where('[versionId+book+chapter]')
                                .equals([versionId, book, chapter])
                                .and(v => v.verse >= seg.verse && v.verse <= seg.verseEnd!)
                                .sortBy('verse');
                        } else {
                            const v = await db.bibleVerses
                                .where('[versionId+book+chapter+verse]')
                                .equals([versionId, book, chapter, seg.verse])
                                .first();
                            if (v) segVerses = [v];
                        }

                        // Fallback to KJV if not found in active translation
                        if (segVerses.length === 0 && versionId !== 'kjv') {
                            if (seg.verseEnd && seg.verseEnd > seg.verse) {
                                segVerses = await db.bibleVerses
                                    .where('[versionId+book+chapter]')
                                    .equals(['kjv', book, chapter])
                                    .and(v => v.verse >= seg.verse && v.verse <= seg.verseEnd!)
                                    .sortBy('verse');
                            } else {
                                const v = await db.bibleVerses
                                    .where('[versionId+book+chapter+verse]')
                                    .equals(['kjv', book, chapter, seg.verse])
                                    .first();
                                if (v) segVerses = [v];
                            }
                            if (segVerses.length > 0) {
                                activeVersionDisplay = 'KJV';
                            }
                        }

                        if (segVerses.length > 0) {
                            const decrypted = await decryptVerses(segVerses);
                            segmentGroups.push({
                                verses: decrypted,
                                omittedBeforeNotice,
                            });
                        }
                    }

                    // Guard against race conditions: abort if another hover started
                    if (fetchId !== activeFetchRef.current) return;

                    if (segmentGroups.length > 0) {
                        const formattedSegments = segments
                            .map(s => s.verseEnd && s.verseEnd > s.verse ? `${s.verse}–${s.verseEnd}` : `${s.verse}`)
                            .join(', ');
                        const refString = `${book} ${chapter}:${formattedSegments}`;

                        setContent({
                            ref: refString,
                            segmentGroups,
                            version: activeVersionDisplay,
                        });

                        const rect = target.getBoundingClientRect();
                        setPosition({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                        });
                        setOpen(true);
                    }
                } catch (err) {
                    console.error('[ScriptureTooltip] Failed to load verse tooltip:', err);
                }
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('.scripture-ref');
            if (target && target === currentTargetRef.current) {
                // Debounce close so user has time to move cursor directly into tooltip
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = setTimeout(() => {
                    if (!isHoveringTooltipRef.current) {
                        setOpen(false);
                        currentTargetRef.current = null;
                    }
                }, 200);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('.scripture-ref');
            if (!target && !isHoveringTooltipRef.current) {
                setOpen(false);
                currentTargetRef.current = null;
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('click', handleClickOutside);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, [mainVersion, open]);

    if (!open || !content) return null;

    return (
        <Tooltip.Root open={open}>
            <Tooltip.Trigger asChild>
                <div
                    style={{
                        position: 'fixed',
                        left: position.x,
                        top: position.y,
                        width: 1,
                        height: 1,
                        pointerEvents: 'none'
                    }}
                />
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className="z-[200] max-w-sm rounded-xl bg-gray-900/95 backdrop-blur-md px-4 py-4 text-sm leading-relaxed text-white shadow-2xl border border-white/10 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 select-text"
                    side="top"
                    sideOffset={12}
                    onMouseEnter={() => {
                        isHoveringTooltipRef.current = true;
                        if (closeTimeoutRef.current) {
                            clearTimeout(closeTimeoutRef.current);
                            closeTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={() => {
                        isHoveringTooltipRef.current = false;
                        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                        closeTimeoutRef.current = setTimeout(() => {
                            setOpen(false);
                            currentTargetRef.current = null;
                        }, 200);
                    }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-primary text-[10px] uppercase tracking-[0.2em]">{content.ref}</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight">{content.version}</span>
                    </div>
                    <div className="font-serif italic text-gray-200 leading-snug max-h-60 overflow-y-auto pr-1">
                        {content.segmentGroups.map((group, groupIdx) => (
                            <React.Fragment key={groupIdx}>
                                {group.omittedBeforeNotice && (
                                    <div className="flex items-center justify-center my-2.5 select-none not-italic font-sans">
                                        <div className="h-px bg-white/10 flex-1" />
                                        <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 px-2">
                                            ••• {group.omittedBeforeNotice} •••
                                        </span>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>
                                )}
                                <div>
                                    {group.verses.map((v, i) => (
                                        <span key={i}>
                                            <span className="text-[10px] align-top text-primary font-bold mr-1 select-none opacity-70 relative top-[2px] font-sans not-italic">{v.verse}</span>
                                            {v.text}{' '}
                                        </span>
                                    ))}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                    <Tooltip.Arrow className="fill-gray-900/95" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
};
