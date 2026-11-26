import { Extension } from '@tiptap/core';

/**
 * Custom Enter & Tab/Outlining Keyboard Handler
 *
 * - Ensures Tab / Shift-Tab indent and outdent bullet lists, ordered lists, and task lists smoothly
 *   instead of jumping browser focus out of the editor.
 * - Outside lists, Tab inserts clean indentation spaces without escaping the document.
 * - Preserves safe cursor positioning on Enter during both local and collaborative editing.
 */
export const EnterKeyExtension = Extension.create({
    name: 'enterKeyHandler',

    addKeyboardShortcuts() {
        return {
            Tab: ({ editor }) => {
                // 1. Inside task list item -> sink nested task item
                if (editor.isActive('taskItem')) {
                    if (editor.can().sinkListItem('taskItem')) {
                        return editor.chain().focus().sinkListItem('taskItem').run();
                    }
                    return true; // Prevent focus escape even at max depth
                }

                // 2. Inside bullet/ordered list item -> sink nested list item
                if (editor.isActive('listItem')) {
                    if (editor.can().sinkListItem('listItem')) {
                        return editor.chain().focus().sinkListItem('listItem').run();
                    }
                    return true; // Prevent browser focus escape on first item in list
                }

                // 3. Regular paragraph / heading / blockquote -> insert 4-space tab indent
                return editor.chain().focus().insertContent('\u00A0\u00A0\u00A0\u00A0').run();
            },

            'Shift-Tab': ({ editor }) => {
                // 1. Inside task list item -> lift task item
                if (editor.isActive('taskItem')) {
                    if (editor.can().liftListItem('taskItem')) {
                        return editor.chain().focus().liftListItem('taskItem').run();
                    }
                    return true;
                }

                // 2. Inside bullet/ordered list item -> lift list item
                if (editor.isActive('listItem')) {
                    if (editor.can().liftListItem('listItem')) {
                        return editor.chain().focus().liftListItem('listItem').run();
                    }
                    return true;
                }

                // 3. Regular paragraph -> remove up to 4 leading spaces/non-breaking spaces before cursor
                const { state } = editor;
                const { $from, empty } = state.selection;
                if (empty && $from.parentOffset > 0) {
                    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
                    const match = textBefore.match(/([\u00A0 ]{1,4})$/);
                    if (match) {
                        const removeLen = match[1].length;
                        return editor
                            .chain()
                            .focus()
                            .deleteRange({ from: $from.pos - removeLen, to: $from.pos })
                            .run();
                    }
                }
                return true;
            },

            Enter: ({ editor }) => {
                const { selection } = editor.state;
                if (!selection || selection.from === null || selection.to === null) {
                    return false;
                }
                return false;
            },

            'Shift-Enter': () => {
                return false;
            },
        };
    },

    priority: 1000,
});
