import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textCase: {
            /**
             * Transform current selection to UPPERCASE
             */
            uppercase: () => ReturnType;
            /**
             * Transform current selection to lowercase
             */
            lowercase: () => ReturnType;
            /**
             * Transform current selection to Capitalize (Title Case)
             */
            capitalize: () => ReturnType;
        };
    }
}

export const TextCaseExtension = Extension.create({
    name: 'textCase',

    addCommands() {
        return {
            uppercase: () => ({ state, tr, dispatch }) => {
                const { selection } = state;
                const { empty, from, to } = selection;

                if (empty) return false;

                if (dispatch) {
                    const text = state.doc.textBetween(from, to, ' ');
                    tr.insertText(text.toUpperCase(), from, to);
                }

                return true;
            },
            lowercase: () => ({ state, tr, dispatch }) => {
                const { selection } = state;
                const { empty, from, to } = selection;

                if (empty) return false;

                if (dispatch) {
                    const text = state.doc.textBetween(from, to, ' ');
                    tr.insertText(text.toLowerCase(), from, to);
                }

                return true;
            },
            capitalize: () => ({ state, tr, dispatch }) => {
                const { selection } = state;
                const { empty, from, to } = selection;

                if (empty) return false;

                if (dispatch) {
                    const text = state.doc.textBetween(from, to, ' ');
                    const capitalized = text
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    tr.insertText(capitalized, from, to);
                }

                return true;
            },
        };
    },
});
