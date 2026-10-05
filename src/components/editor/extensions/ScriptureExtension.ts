import { Mark, mergeAttributes, InputRule } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import { parseScriptureReference, parseVerseSegments, scanScriptureReferences, SCRIPTURE_REGEX } from '@/lib/scriptureParser';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        scripture: {
            setScripture: (attrs: { book: string; chapter: number; verse: number; verseEnd?: number | null; segments?: string | null }) => ReturnType;
            scanScriptures: () => ReturnType;
        };
    }
}

export const ScriptureExtension = Mark.create({
    name: 'scripture',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'scripture-ref text-primary font-medium cursor-pointer decoration-dotted underline underline-offset-2',
            },
        };
    },

    addAttributes() {
        return {
            book: {
                default: null,
                parseHTML: element => element.getAttribute('data-book'),
                renderHTML: attributes => {
                    if (!attributes.book) return {};
                    return { 'data-book': attributes.book };
                },
            },
            chapter: {
                default: null,
                parseHTML: element => Number(element.getAttribute('data-chapter')) || null,
                renderHTML: attributes => {
                    if (!attributes.chapter) return {};
                    return { 'data-chapter': attributes.chapter };
                },
            },
            verse: {
                default: null,
                parseHTML: element => Number(element.getAttribute('data-verse')) || null,
                renderHTML: attributes => {
                    if (!attributes.verse) return {};
                    return { 'data-verse': attributes.verse };
                },
            },
            verseEnd: {
                default: null,
                parseHTML: element => Number(element.getAttribute('data-verse-end')) || null,
                renderHTML: attributes => {
                    if (!attributes.verseEnd) return {};
                    return { 'data-verse-end': attributes.verseEnd };
                },
            },
            segments: {
                default: null,
                parseHTML: element => element.getAttribute('data-segments'),
                renderHTML: attributes => {
                    if (!attributes.segments) return {};
                    return { 'data-segments': attributes.segments };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-book]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setScripture:
                (attributes) =>
                    ({ commands }) => {
                        return commands.setMark(this.name, attributes);
                    },
            scanScriptures:
                () =>
                    ({ state, dispatch }) => {
                        const { tr, schema } = state;
                        let modified = false;

                        // Iterate through textblocks to scan full content across inline nodes
                        state.doc.descendants((node, pos) => {
                            if (!node.isTextblock) return;
                            const text = node.textContent;
                            if (!text) return;

                            const matches = scanScriptureReferences(text);
                            if (matches.length === 0) return;

                            matches.forEach((match) => {
                                const from = pos + 1 + match.startIndex;
                                const to = pos + 1 + match.endIndex;

                                // Remove any partial/outdated marks on this range
                                tr.removeMark(from, to, schema.marks.scripture);

                                const segmentsStr = match.ref.segments && match.ref.segments.length > 1
                                    ? match.ref.segments.map(s => s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`).join(',')
                                    : null;

                                tr.addMark(
                                    from,
                                    to,
                                    schema.marks.scripture.create({
                                        book: match.ref.book,
                                        chapter: match.ref.chapter,
                                        verse: match.ref.verse,
                                        verseEnd: match.ref.verseEnd,
                                        segments: segmentsStr,
                                    })
                                );
                                modified = true;
                            });
                        });

                        if (modified && dispatch) {
                            dispatch(tr);
                            return true;
                        }
                        return false;
                    },
        };
    },

    addInputRules() {
        return [
            // Compound chained references typed in one go: "Gen 6:13; 7:4 " or "Gen 6:13;7:4 "
            new InputRule({
                find: new RegExp(`(${SCRIPTURE_REGEX.source})\\s*;\\s*(\\d+:[\\d\\s,–—-]+)\\s$`, 'i'),
                handler: ({ state, range, match }) => {
                    const fullMatch = match[0];
                    const ref1Text = match[1];
                    const continuationText = match[match.length - 1]?.trim();
                    if (!ref1Text || !continuationText) return null;

                    const parsed1 = parseScriptureReference(ref1Text);
                    if (!parsed1 || parsed1.verse === null) return null;

                    const parsed2 = parseScriptureReference(`${parsed1.book} ${continuationText}`);
                    if (!parsed2 || parsed2.verse === null) return null;

                    const ref1Index = fullMatch.indexOf(ref1Text);
                    const contIndex = fullMatch.lastIndexOf(continuationText);
                    const delimiter = fullMatch.substring(ref1Index + ref1Text.length, contIndex);

                    const { tr } = state;
                    tr.delete(range.from, range.to);

                    const seg1Str = parsed1.segments && parsed1.segments.length > 1
                        ? parsed1.segments.map(s => s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`).join(',')
                        : null;
                    const mark1 = state.schema.marks.scripture.create({
                        book: parsed1.book,
                        chapter: parsed1.chapter,
                        verse: parsed1.verse,
                        verseEnd: parsed1.verseEnd,
                        segments: seg1Str,
                    });

                    const seg2Str = parsed2.segments && parsed2.segments.length > 1
                        ? parsed2.segments.map(s => s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`).join(',')
                        : null;
                    const mark2 = state.schema.marks.scripture.create({
                        book: parsed2.book,
                        chapter: parsed2.chapter,
                        verse: parsed2.verse,
                        verseEnd: parsed2.verseEnd,
                        segments: seg2Str,
                    });

                    let insertPos = range.from;
                    tr.insert(insertPos, state.schema.text(ref1Text, [mark1]));
                    insertPos += ref1Text.length;

                    tr.insert(insertPos, state.schema.text(delimiter));
                    insertPos += delimiter.length;

                    tr.insert(insertPos, state.schema.text(continuationText, [mark2]));
                    insertPos += continuationText.length;

                    tr.insert(insertPos, state.schema.text(' '));
                },
            }),
            // Standard and discontinuous references: "John 3:16 ", "1 Cor 14:4, 14-15 "
            new InputRule({
                find: new RegExp(`(${SCRIPTURE_REGEX.source})\\s$`, 'i'),
                handler: ({ state, range, match }) => {
                    const refText = match[1];   // e.g., "John 3:16" or "1 Cor 14:4, 14-15"
                    const { tr } = state;

                    const parsed = parseScriptureReference(refText);
                    if (!parsed || parsed.verse === null) return null;

                    // Remove the trigger text (fullMatch)
                    tr.delete(range.from, range.to);

                    const segmentsStr = parsed.segments && parsed.segments.length > 1
                        ? parsed.segments.map(s => s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`).join(',')
                        : null;

                    // Insert text with mark
                    const textNode = state.schema.text(refText, [
                        state.schema.marks.scripture.create({
                            book: parsed.book,
                            chapter: parsed.chapter,
                            verse: parsed.verse,
                            verseEnd: parsed.verseEnd,
                            segments: segmentsStr,
                        }),
                    ]);

                    tr.insert(range.from, textNode);

                    // Insert the trailing space as plain text
                    tr.insert(range.from + textNode.nodeSize, state.schema.text(' '));
                },
            }),
            // Chained chapter continuations after semicolon: "; 7:4 " or ";7:4 "
            new InputRule({
                find: /;\s*(\d+:[\d\s,–—-]+)\s$/,
                handler: ({ state, range, match }) => {
                    const continuationText = match[1]?.trim();
                    if (!continuationText) return null;

                    // Scan backward before range.from for the nearest scripture mark to inherit its book
                    let precedingBook: string | null = null;
                    const searchStart = Math.max(0, range.from - 200);
                    state.doc.nodesBetween(searchStart, range.from, (node) => {
                        const scriptureMark = node.marks?.find(m => m.type.name === 'scripture');
                        if (scriptureMark?.attrs?.book) {
                            precedingBook = scriptureMark.attrs.book;
                        }
                    });

                    // If not found in a mark, inspect the raw text before the semicolon
                    if (!precedingBook) {
                        const textBefore = state.doc.textBetween(searchStart, range.from);
                        const matches = scanScriptureReferences(textBefore);
                        if (matches.length > 0) {
                            precedingBook = matches[matches.length - 1].ref.book;
                        }
                    }

                    if (!precedingBook) return null;

                    const syntheticRef = `${precedingBook} ${continuationText}`;
                    const parsed = parseScriptureReference(syntheticRef);
                    if (!parsed || parsed.verse === null) return null;

                    const fullMatch = match[0];
                    const digitsOffset = fullMatch.indexOf(continuationText);
                    const markFrom = range.from + digitsOffset;

                    const { tr } = state;
                    tr.delete(markFrom, range.to);

                    const segmentsStr = parsed.segments && parsed.segments.length > 1
                        ? parsed.segments.map(s => s.verseEnd ? `${s.verse}-${s.verseEnd}` : `${s.verse}`).join(',')
                        : null;

                    const textNode = state.schema.text(continuationText, [
                        state.schema.marks.scripture.create({
                            book: parsed.book,
                            chapter: parsed.chapter,
                            verse: parsed.verse,
                            verseEnd: parsed.verseEnd,
                            segments: segmentsStr,
                        }),
                    ]);

                    tr.insert(markFrom, textNode);
                    tr.insert(markFrom + textNode.nodeSize, state.schema.text(' '));
                },
            }),
        ];
    },

    // Handle Click and Double Click to Open Sidebar
    addProseMirrorPlugins() {
        const openScripture = (attrs: any, event: MouseEvent) => {
            const { book, chapter, verse, verseEnd, segments } = attrs;
            event.preventDefault();
            const { openRightSidebar } = useUIStore.getState();
            const { setBibleFocus } = useBibleStore.getState();

            openRightSidebar('bible');
            setBibleFocus({
                book,
                chapter,
                verse,
                verseEnd,
                segments: segments ? parseVerseSegments(segments) : undefined,
            });
        };

        return [
            new Plugin({
                props: {
                    handleClick: (view, pos, event) => {
                        const isTouch = (typeof window !== 'undefined' && (
                            window.matchMedia('(hover: none), (pointer: coarse)').matches ||
                            'ontouchstart' in window
                        )) || useUIStore.getState().isMobile;

                        if (!isTouch && !event.ctrlKey && !event.metaKey) {
                            return false;
                        }

                        const { doc } = view.state;
                        const range = doc.resolve(pos);
                        const marks = range.marks();
                        const scriptureMark = marks.find(m => m.type.name === 'scripture');

                        if (scriptureMark) {
                            openScripture(scriptureMark.attrs, event);
                            return true;
                        }
                        return false;
                    },
                    handleDoubleClick: (view, pos, event) => {
                        const { doc } = view.state;
                        const range = doc.resolve(pos);

                        // Check if the clicked mark is 'scripture'
                        const marks = range.marks();
                        const scriptureMark = marks.find(m => m.type.name === 'scripture');

                        if (scriptureMark) {
                            openScripture(scriptureMark.attrs, event);
                            return true;
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});
