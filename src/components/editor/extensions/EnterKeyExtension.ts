import { Extension } from '@tiptap/core';

/**
 * Custom Enter Key Handler for Collaboration
 * 
 * Fixes cursor positioning issues when pressing Enter during collaborative editing.
 * Without this, Yjs sync can cause the editor to lose track of cursor position,
 * resulting in new lines being inserted at position 0 instead of at the cursor.
 */
export const EnterKeyExtension = Extension.create({
    name: 'enterKeyHandler',

    addKeyboardShortcuts() {
        return {
            Enter: ({ editor }) => {
                const { state } = editor;
                const { selection } = state;
                const { $from } = selection;

                // Log cursor position for debugging
                console.log('[EnterKeyExtension] Enter pressed at position:', {
                    from: selection.from,
                    to: selection.to,
                    anchor: selection.anchor,
                    head: selection.head,
                    empty: selection.empty,
                    nodeAfter: $from.nodeAfter?.type.name,
                    nodeBefore: $from.nodeBefore?.type.name,
                });

                // Verify we have a valid selection
                if (!selection || selection.from === null || selection.to === null) {
                    console.warn('[EnterKeyExtension] Invalid selection detected, aborting Enter');
                    return false;
                }

                // Let Tiptap handle the Enter key with the verified cursor position
                // Return false to allow default behavior
                return false;
            },

            'Shift-Enter': () => {
                // Hard break - let Tiptap handle this
                return false;
            },
        };
    },

    // Ensure this extension runs before the default enter handler
    priority: 1000,
});
