import React, { useState, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { db } from '@/lib/db';
import { useUIStore } from '@/stores/uiStore';
import type { BibleVerse } from '@/types/database';

interface ScriptureTooltipProps {
    children: React.ReactNode;
}

export const ScriptureTooltipProvider: React.FC<ScriptureTooltipProps> = ({ children }) => {
    const { verseHoverPreviews } = useUIStore();

    if (!verseHoverPreviews) return <>{children}</>;

    return (
        <Tooltip.Provider delayDuration={400}>
            {children}
            <GlobalScriptureListener />
        </Tooltip.Provider>
    );
};

const GlobalScriptureListener: React.FC = () => {
    const { preferredBibleVersion } = useUIStore();
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [content, setContent] = useState<{ ref: string; text: string; version: string } | null>(null);

    useEffect(() => {
        const handleMouseOver = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('scripture-ref')) {
                const book = target.getAttribute('book');
                const chapter = parseInt(target.getAttribute('chapter') || '0');
                const verse = parseInt(target.getAttribute('verse') || '0');
                const verseEnd = parseInt(target.getAttribute('verseend') || '0');

                if (book && chapter && verse) {
                    const versionId = preferredBibleVersion.toLowerCase();

                    // Fetch from DB
                    let verses: BibleVerse[] = [];
                    if (verseEnd && verseEnd > verse) {
                        verses = await db.bibleVerses
                            .where('[versionId+book+chapter+verse]')
                            .between([versionId, book, chapter, verse], [versionId, book, chapter, verseEnd], true, true)
                            .toArray();
                    } else {
                        const v = await db.bibleVerses.get(`${versionId}-${book}-${chapter}-${verse}`);
                        if (v) verses = [v];
                    }

                    if (verses.length > 0) {
                        const refString = verseEnd && verseEnd > verse
                            ? `${book} ${chapter}:${verse}-${verseEnd}`
                            : `${book} ${chapter}:${verse}`;

                        const combinedText = verses.map(v => v.text).join(' ');

                        setContent({
                            ref: refString,
                            text: combinedText,
                            version: preferredBibleVersion
                        });

                        const rect = target.getBoundingClientRect();
                        setPosition({
                            x: rect.left + rect.width / 2,
                            y: rect.top
                        });
                        setOpen(true);
                    }
                }
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('scripture-ref')) {
                setOpen(false);
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, [preferredBibleVersion]);

    // We use a custom anchor for Radix Tooltip
    // This is a "virtual element" implementation for React

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
                    className="z-[200] max-w-sm rounded-xl bg-gray-900/95 backdrop-blur-md px-4 py-4 text-sm leading-relaxed text-white shadow-2xl border border-white/10 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                    side="top"
                    sideOffset={12}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-primary text-[10px] uppercase tracking-[0.2em]">{content.ref}</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight">{content.version}</span>
                    </div>
                    <div className="font-serif italic text-gray-200 leading-snug">{content.text}</div>
                    <Tooltip.Arrow className="fill-gray-900/95" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
};
