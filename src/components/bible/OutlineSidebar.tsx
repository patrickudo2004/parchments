import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { LayoutList, ChevronRight, Hash, Focus, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

interface HeadingItem {
    id: string;
    text: string;
    level: number;
    originalPos: number;
}

interface OutlineItemProps {
    heading: HeadingItem;
    focusedHeadingPos: number | null;
    setFocusedHeadingPos: (pos: number | null) => void;
    scrollToHeading: (pos: number) => void;
    onDragStart: () => void;
}

const OutlineItem: React.FC<OutlineItemProps> = ({
    heading,
    focusedHeadingPos,
    setFocusedHeadingPos,
    scrollToHeading,
    onDragStart
}) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={heading}
            dragListener={false}
            dragControls={controls}
            onDragStart={onDragStart}
            className="w-full group flex items-center gap-1"
        >
            <div
                onPointerDown={(e) => controls.start(e)}
                className="p-1 cursor-grab active:cursor-grabbing text-light-text-disabled hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            >
                <GripVertical size={12} />
            </div>

            <button
                onClick={() => scrollToHeading(heading.originalPos)}
                className={`flex-1 text-left p-2 rounded-lg hover:bg-light-surface dark:hover:bg-dark-surface transition-all flex items-start gap-2 ${heading.level === 1 ? 'pl-0' : heading.level === 2 ? 'pl-3' : 'pl-6'
                    } ${focusedHeadingPos === heading.originalPos ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
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

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setFocusedHeadingPos(focusedHeadingPos === heading.originalPos ? null : heading.originalPos);
                }}
                className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-primary/10 ${focusedHeadingPos === heading.originalPos ? 'text-primary opacity-100' : 'text-light-text-disabled'}`}
                title="Focus Mode"
            >
                <Focus size={14} />
            </button>
        </Reorder.Item>
    );
};

export const OutlineSidebar: React.FC = () => {
    const { activeEditor, focusedHeadingPos, setFocusedHeadingPos } = useUIStore();
    const [headings, setHeadings] = React.useState<HeadingItem[]>([]);
    const [isDragging, setIsDragging] = React.useState(false);

    React.useEffect(() => {
        if (!activeEditor || isDragging) return;

        const updateOutline = () => {
            const items: HeadingItem[] = [];
            activeEditor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    items.push({
                        id: `heading-${pos}`,
                        text: node.textContent || 'Untitled Section',
                        level: node.attrs.level,
                        originalPos: pos
                    });
                }
            });
            setHeadings(items);
        };

        activeEditor.on('update', updateOutline);
        updateOutline();

        return () => {
            activeEditor.off('update', updateOutline);
        };
    }, [activeEditor, isDragging]);

    const scrollToHeading = (pos: number) => {
        if (!activeEditor) return;
        activeEditor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    };

    const handleReorder = (newHeadings: HeadingItem[]) => {
        setHeadings(newHeadings);
    };

    const handleDragEnd = () => {
        if (!activeEditor) {
            setIsDragging(false);
            return;
        }

        const { doc } = activeEditor.state;
        const sections: { headingId: string | null; nodes: any[] }[] = [];
        let currentSection: { headingId: string | null; nodes: any[] } = { headingId: null, nodes: [] };

        doc.content.forEach((node, offset) => {
            if (node.type.name === 'heading') {
                if (currentSection.nodes.length > 0 || currentSection.headingId !== null) {
                    sections.push(currentSection);
                }
                currentSection = { headingId: `heading-${offset}`, nodes: [node.toJSON()] };
            } else {
                currentSection.nodes.push(node.toJSON());
            }
        });
        if (currentSection.nodes.length > 0 || currentSection.headingId !== null) {
            sections.push(currentSection);
        }

        const introSection = sections.find(s => s.headingId === null);
        const headingSections = headings.map(h => sections.find(s => s.headingId === h.id)).filter(Boolean);

        const newDocContent = [
            ...(introSection ? introSection.nodes : []),
            ...headingSections.flatMap(s => s!.nodes)
        ];

        // Perform the update
        activeEditor.commands.setContent({ type: 'doc', content: newDocContent }, false);

        // Brief delay before re-enabling updates to allow editor to sync
        setTimeout(() => {
            setIsDragging(false);
        }, 50);
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
                    <Reorder.Group
                        axis="y"
                        values={headings}
                        onReorder={handleReorder}
                        className="space-y-1"
                    >
                        {headings.map((heading) => (
                            <OutlineItem
                                key={heading.id}
                                heading={heading}
                                focusedHeadingPos={focusedHeadingPos}
                                setFocusedHeadingPos={setFocusedHeadingPos}
                                scrollToHeading={scrollToHeading}
                                onDragStart={() => {
                                    setIsDragging(true);
                                    setFocusedHeadingPos(null);
                                }}
                            />
                        ))}
                    </Reorder.Group>
                )}
            </div>

            <div
                className={`p-4 bg-primary/5 border-t border-primary/10 transition-colors ${isDragging ? 'bg-primary/10' : ''}`}
                onPointerUpCapture={handleDragEnd}
            >
                <p className="text-[9px] text-primary/70 text-center font-medium leading-relaxed uppercase tracking-widest">
                    {isDragging ? "Drop anywhere to rearrange" : "Drag handles to reorder sections"}
                </p>
            </div>

            {isDragging && (
                <div
                    className="fixed inset-0 z-[100] cursor-grabbing"
                    onPointerUpCapture={handleDragEnd}
                />
            )}
        </div>
    );
};
