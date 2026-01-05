import React, { useState, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

// Mock Data Function (Phase 1)
const getVerseText = (book: string, chapter: number, verse: number): string => {
    const key = `${book} ${chapter}:${verse}`;

    // Some popular verses for demo
    if (key === 'John 3:16') return "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.";
    if (key === 'Genesis 1:1') return "In the beginning, God created the heavens and the earth.";
    if (key === 'Philippians 4:13') return "I can do all things through him who strengthens me.";
    if (key === 'Romans 8:28') return "And we know that for those who love God all things work together for good, for those who are called according to his purpose.";

    // Generic placeholder
    return `[${book} ${chapter}:${verse}] Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
};

interface ScriptureTooltipProps {
    children: React.ReactNode;
}

export const ScriptureTooltipProvider: React.FC<ScriptureTooltipProps> = ({ children }) => {
    return (
        <Tooltip.Provider delayDuration={300}>
            {children}
            {/* The actual tooltip content is rendered via Portal by individual triggers, 
                 but since we are using Tiptap, we can't easily wrap each mark in a Trigger. 
                 
                 Instead, we will use a "Virtual Element" approach or a Global Listener approach. 
                 A simpler way for Phase 1 inside Tiptap is to let the Mark extension handle the styling,
                 and use a global event listener to show a tooltip when hovering `.scripture-ref`.
             */}
            <GlobalScriptureListener />
        </Tooltip.Provider>
    );
};

const GlobalScriptureListener: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [content, setContent] = useState<{ ref: string; text: string } | null>(null);

    useEffect(() => {
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('scripture-ref')) {
                const book = target.getAttribute('book');
                const chapter = parseInt(target.getAttribute('chapter') || '0');
                const verse = parseInt(target.getAttribute('verse') || '0');

                if (book && chapter && verse) {
                    const text = getVerseText(book, chapter, verse);
                    setContent({
                        ref: `${book} ${chapter}:${verse}`,
                        text
                    });

                    const rect = target.getBoundingClientRect();
                    setPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top
                    });
                    setOpen(true);
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
    }, []);

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
                    className="z-[200] max-w-sm rounded bg-gray-900 px-4 py-3 text-sm leading-relaxed text-white shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                    sideOffset={5}
                >
                    <div className="font-bold text-gray-300 mb-1 text-xs uppercase tracking-wide">{content.ref} • ESV</div>
                    <div className="font-serif">{content.text}</div>
                    <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
};
