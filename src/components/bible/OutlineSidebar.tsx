import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import {
    LayoutList,
    ChevronRight,
    ChevronDown,
    Hash,
    Focus,
    GripVertical,
    BookOpen,
    Copy,
    Check
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { scanScriptureReferences, parseVerseSegments } from '@/lib/scriptureParser';

interface HeadingItem {
    id: string;
    text: string;
    level: number;
    originalPos: number;
}

interface ScriptureOutlineItem {
    key: string;
    displayRef: string;
    book: string;
    chapter: number;
    verse: number;
    verseEnd?: number | null;
    segments?: string | null;
    positions: number[];
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
                className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-grab active:cursor-grabbing text-light-text-disabled hover:text-primary transition-colors opacity-40 hover:opacity-100 group-hover:opacity-100 touch-none select-none"
                title="Drag to reorder section"
            >
                <GripVertical size={14} />
            </div>

            <button
                onClick={() => scrollToHeading(heading.originalPos)}
                className={`flex-1 text-left py-1.5 px-2 rounded-lg hover:bg-light-surface dark:hover:bg-dark-surface transition-all flex items-start gap-2 min-w-0 ${
                    heading.level === 1 ? 'pl-1' : heading.level === 2 ? 'pl-3.5' : 'pl-6'
                } ${focusedHeadingPos === heading.originalPos ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
            >
                <div
                    className={`mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                        heading.level === 1
                            ? 'text-primary'
                            : heading.level === 2
                                ? 'text-primary/70'
                                : 'text-light-text-disabled'
                    }`}
                >
                    {heading.level === 1 ? (
                        <Hash size={12} strokeWidth={3} />
                    ) : heading.level === 2 ? (
                        <ChevronRight size={11} strokeWidth={2.5} />
                    ) : (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-1" />
                    )}
                </div>
                <span
                    className={`text-[11px] leading-snug transition-colors break-words ${
                        heading.level === 1
                            ? 'font-black uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary'
                            : heading.level === 2
                                ? 'font-semibold text-light-text-primary/90 dark:text-dark-text-primary/90 group-hover:text-primary'
                                : 'font-normal text-light-text-secondary dark:text-dark-text-secondary group-hover:text-primary'
                    }`}
                >
                    {heading.text}
                </span>
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setFocusedHeadingPos(focusedHeadingPos === heading.originalPos ? null : heading.originalPos);
                }}
                className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-primary/10 shrink-0 ${
                    focusedHeadingPos === heading.originalPos ? 'text-primary opacity-100' : 'text-light-text-disabled'
                }`}
                title="Focus Section"
            >
                <Focus size={13} />
            </button>
        </Reorder.Item>
    );
};

export const OutlineSidebar: React.FC = () => {
    const { activeEditor, focusedHeadingPos, setFocusedHeadingPos, openRightSidebar, showToast, isMobile, closeLeftSidebar } = useUIStore();
    const { setBibleFocus } = useBibleStore();

    const [headings, setHeadings] = useState<HeadingItem[]>([]);
    const [scriptures, setScriptures] = useState<ScriptureOutlineItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Two stacked collapsible sections (persisted collapse states)
    const [headingsOpen, setHeadingsOpen] = useState<boolean>(() => {
        try {
            return localStorage.getItem('parchments-outline-headings-open') !== 'false';
        } catch {
            return true;
        }
    });
    const [scripturesOpen, setScripturesOpen] = useState<boolean>(() => {
        try {
            return localStorage.getItem('parchments-outline-scriptures-open') !== 'false';
        } catch {
            return true;
        }
    });
    const [copiedScriptures, setCopiedScriptures] = useState(false);
    const scriptureCycleRef = useRef<Record<string, number>>({});

    const toggleHeadingsSection = () => {
        setHeadingsOpen(prev => {
            const next = !prev;
            try { localStorage.setItem('parchments-outline-headings-open', String(next)); } catch {}
            return next;
        });
    };

    const toggleScripturesSection = () => {
        setScripturesOpen(prev => {
            const next = !prev;
            try { localStorage.setItem('parchments-outline-scriptures-open', String(next)); } catch {}
            return next;
        });
    };

    useEffect(() => {
        if (!activeEditor || isDragging) return;

        const updateOutline = () => {
            const headingItems: HeadingItem[] = [];
            const scriptureMap = new Map<string, ScriptureOutlineItem>();
            const seenPositions = new Set<number>();

            const addScriptureEntry = (
                book: string,
                chapter: number,
                verse: number,
                verseEnd: number | null | undefined,
                segments: string | null | undefined,
                pos: number
            ) => {
                if (!book || !chapter) return;
                const cleanVerse = verse || 1;
                const refSuffix = segments
                    ? segments.replace(/,/g, ', ').replace(/-/g, '–')
                    : verseEnd && verseEnd > cleanVerse
                        ? `${cleanVerse}–${verseEnd}`
                        : `${cleanVerse}`;
                const displayRef = `${book} ${chapter}:${refSuffix}`;
                const key = `${book.toLowerCase()}|${chapter}|${segments || `${cleanVerse}-${verseEnd || cleanVerse}`}`;

                if (seenPositions.has(pos)) return;
                seenPositions.add(pos);

                const existing = scriptureMap.get(key);
                if (existing) {
                    existing.positions.push(pos);
                } else {
                    scriptureMap.set(key, {
                        key,
                        displayRef,
                        book,
                        chapter,
                        verse: cleanVerse,
                        verseEnd: verseEnd || null,
                        segments: segments || null,
                        positions: [pos]
                    });
                }
            };

            activeEditor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    headingItems.push({
                        id: `heading-${pos}`,
                        text: node.textContent || 'Untitled Section',
                        level: node.attrs.level,
                        originalPos: pos
                    });
                }

                // 1. Collect linked scripture marks directly
                if (node.isText && node.marks && node.marks.length > 0) {
                    const mark = node.marks.find(m => m.type.name === 'scripture');
                    if (mark?.attrs?.book && mark?.attrs?.chapter) {
                        addScriptureEntry(
                            mark.attrs.book,
                            Number(mark.attrs.chapter),
                            Number(mark.attrs.verse || 1),
                            mark.attrs.verseEnd ? Number(mark.attrs.verseEnd) : null,
                            mark.attrs.segments || null,
                            pos
                        );
                    }
                }

                // 2. Also detect plain-text Scripture citations inside paragraphs/headings/quotes before manual Scan
                if (node.isTextblock && node.textContent) {
                    const matches = scanScriptureReferences(node.textContent);
                    for (const match of matches) {
                        const matchPos = pos + 1 + match.startIndex;
                        // Avoid duplicating an already-marked range overlapping matchPos
                        let alreadyMarked = false;
                        for (const p of seenPositions) {
                            if (Math.abs(p - matchPos) <= 2) {
                                alreadyMarked = true;
                                break;
                            }
                        }
                        if (alreadyMarked) continue;
                        const segStr = match.ref.segments && match.ref.segments.length > 1
                            ? match.ref.segments.map(s => (s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`)).join(',')
                            : null;
                        addScriptureEntry(
                            match.ref.book,
                            match.ref.chapter,
                            match.ref.verse || 1,
                            match.ref.verseEnd,
                            segStr,
                            matchPos
                        );
                    }
                }
            });

            setHeadings(headingItems);
            setScriptures(Array.from(scriptureMap.values()));
        };

        activeEditor.on('update', updateOutline);
        updateOutline();

        return () => {
            activeEditor.off('update', updateOutline);
        };
    }, [activeEditor, isDragging]);

    const scrollToPosition = (pos: number) => {
        if (!activeEditor) return;
        const maxPos = activeEditor.state.doc.content.size;
        const safePos = Math.max(1, Math.min(pos, maxPos));
        activeEditor.chain().focus().setTextSelection(safePos).scrollIntoView().run();
        if (isMobile) closeLeftSidebar();
    };

    const handleScriptureJump = (item: ScriptureOutlineItem) => {
        const currentIdx = scriptureCycleRef.current[item.key] ?? 0;
        const targetPos = item.positions[currentIdx % item.positions.length];
        scriptureCycleRef.current[item.key] = (currentIdx + 1) % item.positions.length;
        scrollToPosition(targetPos);
    };

    const handleOpenInBible = (e: React.MouseEvent, item: ScriptureOutlineItem) => {
        e.stopPropagation();
        openRightSidebar('bible');
        setBibleFocus({
            book: item.book,
            chapter: item.chapter,
            verse: item.verse,
            verseEnd: item.verseEnd || null,
            segments: item.segments ? parseVerseSegments(item.segments) : undefined
        });
        if (isMobile) closeLeftSidebar();
    };

    const handleCopyScriptureList = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (scriptures.length === 0) return;
        const listText = scriptures.map(s => `• ${s.displayRef}`).join('\n');
        try {
            await navigator.clipboard.writeText(listText);
            setCopiedScriptures(true);
            showToast(`Copied ${scriptures.length} Scripture reference${scriptures.length === 1 ? '' : 's'}`, 'success');
            setTimeout(() => setCopiedScriptures(false), 2000);
        } catch {
            showToast('Could not copy Scripture list', 'error');
        }
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

        activeEditor.commands.setContent({ type: 'doc', content: newDocContent }, { emitUpdate: false });

        setTimeout(() => {
            setIsDragging(false);
        }, 50);
    };

    return (
        <div className="flex flex-col h-full bg-light-background dark:bg-dark-background">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center gap-2 shrink-0">
                <LayoutList size={14} className="text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text-primary dark:text-dark-text-primary">
                    Document Outline
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-light-border/70 dark:divide-dark-border/70">
                {/* Stacked Collapsible Section 1: Headings (Drag-to-Reorder) */}
                <section className="flex flex-col" data-testid="outline-headings-section">
                    <button
                        type="button"
                        onClick={toggleHeadingsSection}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-light-surface/70 dark:hover:bg-dark-surface/60 transition-colors select-none"
                    >
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
                            {headingsOpen ? <ChevronDown size={13} className="text-primary" /> : <ChevronRight size={13} />}
                            <span>Headings</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black">
                                {headings.length}
                            </span>
                        </span>
                    </button>

                    {headingsOpen && (
                        <div className="px-2.5 pb-3">
                            {headings.length === 0 ? (
                                <div className="py-5 px-3 text-center space-y-1.5 opacity-60">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                                        No headings yet
                                    </p>
                                    <p className="text-[10px] text-light-text-disabled leading-relaxed">
                                        Add H1, H2, or H3 headings to outline &amp; drag-reorder sections.
                                    </p>
                                </div>
                            ) : (
                                <Reorder.Group
                                    axis="y"
                                    values={headings}
                                    onReorder={handleReorder}
                                    className="space-y-0.5"
                                >
                                    {headings.map((heading) => (
                                        <OutlineItem
                                            key={heading.id}
                                            heading={heading}
                                            focusedHeadingPos={focusedHeadingPos}
                                            setFocusedHeadingPos={setFocusedHeadingPos}
                                            scrollToHeading={scrollToPosition}
                                            onDragStart={() => {
                                                setIsDragging(true);
                                                setFocusedHeadingPos(null);
                                            }}
                                        />
                                    ))}
                                </Reorder.Group>
                            )}
                        </div>
                    )}
                </section>

                {/* Stacked Collapsible Section 2: Scriptures Cited */}
                <section className="flex flex-col" data-testid="outline-scriptures-section">
                    <div className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-light-surface/70 dark:hover:bg-dark-surface/60 transition-colors select-none">
                        <button
                            type="button"
                            onClick={toggleScripturesSection}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary flex-1 text-left"
                        >
                            {scripturesOpen ? <ChevronDown size={13} className="text-primary" /> : <ChevronRight size={13} />}
                            <span>Scriptures Cited</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black">
                                {scriptures.length}
                            </span>
                        </button>
                        {scriptures.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopyScriptureList}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                                title="Copy all cited Scriptures for slides or handouts"
                                data-testid="outline-copy-scriptures-btn"
                            >
                                {copiedScriptures ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                <span>{copiedScriptures ? 'Copied' : 'Copy'}</span>
                            </button>
                        )}
                    </div>

                    {scripturesOpen && (
                        <div className="px-2.5 pb-3">
                            {scriptures.length === 0 ? (
                                <div className="py-5 px-3 text-center space-y-1.5 opacity-60">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                                        No Scriptures cited yet
                                    </p>
                                    <p className="text-[10px] text-light-text-disabled leading-relaxed">
                                        Type references like John 3:16 or [[Psalm 23:1-3]] to build an instant passage index.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {scriptures.map((item) => (
                                        <div
                                            key={item.key}
                                            className="group flex items-center gap-1 rounded-lg hover:bg-light-surface dark:hover:bg-dark-surface transition-colors"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleScriptureJump(item)}
                                                className="flex-1 min-w-0 text-left py-1.5 pl-2.5 pr-1 flex items-center gap-2"
                                                title={
                                                    item.positions.length > 1
                                                        ? `Jump to ${item.displayRef} in note (${item.positions.length} mentions — click again to cycle)`
                                                        : `Jump to ${item.displayRef} in note`
                                                }
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                                <span className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary truncate transition-colors">
                                                    {item.displayRef}
                                                </span>
                                                {item.positions.length > 1 && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                                                        ×{item.positions.length}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenInBible(e, item)}
                                                className="p-1.5 mr-1 rounded-lg text-light-text-disabled hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                                title={`Open ${item.displayRef} in Bible Reader`}
                                            >
                                                <BookOpen size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            <div
                className={`p-3 bg-primary/5 border-t border-primary/10 transition-colors shrink-0 ${isDragging ? 'bg-primary/10' : ''}`}
                onPointerUpCapture={handleDragEnd}
            >
                <p className="text-[9px] text-primary/70 text-center font-medium leading-relaxed uppercase tracking-widest">
                    {isDragging ? 'Drop anywhere to rearrange' : 'Drag heading handles to reorder • Click Scriptures to jump'}
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
