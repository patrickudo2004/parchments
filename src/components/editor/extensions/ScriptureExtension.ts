import { Mark, mergeAttributes, InputRule } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import { parseScriptureReference, SCRIPTURE_REGEX } from '@/lib/scriptureParser';
import { useUIStore } from '@/stores/uiStore';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        scripture: {
            setScripture: (attrs: { book: string; chapter: number; verse: number; verseEnd?: number }) => ReturnType;
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
            book: { default: null },
            chapter: { default: null },
            verse: { default: null },
            verseEnd: { default: null },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span.scripture-ref',
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
        };
    },

    addInputRules() {
        return [
            new InputRule({
                // Regex matches "John 3:16 ", captures the ref in group 1
                find: new RegExp(`(${SCRIPTURE_REGEX.source})\\s$`, 'i'),
                handler: ({ state, range, match }) => {
                    const refText = match[1];   // e.g., "John 3:16" (without trailing space)
                    const { tr } = state;

                    const parsed = parseScriptureReference(refText);
                    if (!parsed) return null;

                    // Remove the trigger text (fullMatch)
                    tr.delete(range.from, range.to);

                    // Insert text with mark
                    // We need to insert the text AND the space that triggered it, 
                    // but the mark should only apply to the reference.
                    const textNode = state.schema.text(refText, [
                        state.schema.marks.scripture.create({
                            book: parsed.book,
                            chapter: parsed.chapter,
                            verse: parsed.verse,
                            verseEnd: parsed.verseEnd,
                        }),
                    ]);

                    tr.insert(range.from, textNode);

                    // Insert the trailing space as plain text
                    tr.insert(range.from + textNode.nodeSize, state.schema.text(' '));
                },
            }),
        ];
    },

    // Handle Double Click to Open Sidebar
    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    handleDoubleClick: (view, pos, event) => {
                        const { doc } = view.state;
                        const range = doc.resolve(pos);

                        // Check if the clicked mark is 'scripture'
                        const marks = range.marks();
                        const scriptureMark = marks.find(m => m.type.name === 'scripture');

                        if (scriptureMark) {
                            const { book, chapter, verse, verseEnd } = scriptureMark.attrs;

                            // Prevent default text selection
                            event.preventDefault();

                            // Use UIStore (direct access via getState to avoid hook rules in vanilla JS/plugin)
                            const { openRightSidebar, setBibleFocus } = useUIStore.getState();

                            openRightSidebar('bible');
                            setBibleFocus({ book, chapter, verse, verseEnd });

                            return true;
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});
