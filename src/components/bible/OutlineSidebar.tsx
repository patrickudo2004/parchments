import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { LayoutList, ChevronRight, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeadingItem {
    id: string;
    text: string;
    level: number;
    pos: number;
}

export const OutlineSidebar: React.FC = () => {
    const { activeEditor } = useUIStore();
    const [headings, setHeadings] = React.useState<HeadingItem[]>([]);

    React.useEffect(() => {
        if (!activeEditor) return;

        const updateOutline = () => {
            const items: HeadingItem[] = [];
            activeEditor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    items.push({
                        id: `heading-${pos}`,
                        text: node.textContent || 'Untitled Section',
                        level: node.attrs.level,
                        pos: pos
                    });
                }
            });
            setHeadings(items);
        };

        // Update on transaction
        activeEditor.on('update', updateOutline);
        updateOutline(); // Initial run

        return () => {
            activeEditor.off('update', updateOutline);
        };
    }, [activeEditor]);

    const scrollToHeading = (pos: number) => {
        if (!activeEditor) return;
        activeEditor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    };

    return (
        <div className="flex flex-col h-full bg-light-background dark:bg-dark-background">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center gap-2">
                <LayoutList size={14} className="text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text-primary dark:text-dark-text-primary">
                    Document Outline
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {headings.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-50">
                        <LayoutList size={32} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            No headings found. Add H1, H2, or H3 to see your outline.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {headings.map((heading) => (
                            <button
                                key={heading.id}
                                onClick={() => scrollToHeading(heading.pos)}
                                className={`w-full text-left p-2 rounded-lg hover:bg-light-surface dark:hover:bg-dark-surface transition-all group flex items-start gap-2 ${heading.level === 1 ? 'pl-2' : heading.level === 2 ? 'pl-5' : 'pl-8'
                                    }`}
                            >
                                <div className={`mt-1 transition-transform group-hover:translate-x-0.5 ${heading.level === 1 ? 'text-primary' : 'text-light-text-disabled'
                                    }`}>
                                    {heading.level === 1 ? <Hash size={12} strokeWidth={3} /> : <ChevronRight size={10} />}
                                </div>
                                <span className={`text-[11px] leading-tight transition-colors ${heading.level === 1
                                    ? 'font-black uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary'
                                    : 'font-medium text-light-text-secondary dark:text-dark-text-secondary group-hover:text-primary'
                                    }`}>
                                    {heading.text}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Hint */}
            <div className="p-4 bg-primary/5 border-t border-primary/10">
                <p className="text-[9px] text-primary/70 text-center font-medium leading-relaxed uppercase tracking-widest">
                    Build your structure to navigate quickly.
                </p>
            </div>
        </div>
    );
};
