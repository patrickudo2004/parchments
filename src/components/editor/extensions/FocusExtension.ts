import { Extension } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface FocusOptions {
    onFocusChange?: (focused: boolean) => void;
}

const focusPluginKey = new PluginKey('focusMode');

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        focusMode: {
            /**
             * Set the starting heading position for focus mode
             */
            setFocusHeading: (pos: number | null) => ReturnType;
        };
    }
}

export const FocusExtension = Extension.create<FocusOptions>({
    name: 'focusMode',

    addOptions() {
        return {
            onFocusChange: undefined,
        };
    },

    addCommands() {
        return {
            setFocusHeading: (pos) => ({ tr, dispatch }) => {
                if (dispatch) {
                    tr.setMeta(focusPluginKey, pos);
                    if (this.options.onFocusChange) {
                        this.options.onFocusChange(pos !== null);
                    }
                }
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: focusPluginKey,
                state: {
                    init(): number | null {
                        return null;
                    },
                    apply(tr, value: number | null): number | null {
                        const meta = tr.getMeta(focusPluginKey);
                        if (meta !== undefined) return meta;

                        if (tr.docChanged && value !== null) {
                            try {
                                // Map position to the new document state
                                return tr.mapping.map(value, 1);
                            } catch (e) {
                                return null;
                            }
                        }
                        return value;
                    },
                },
                props: {
                    decorations: (state) => {
                        const targetPos = focusPluginKey.getState(state) as number | null;
                        if (targetPos === null) return DecorationSet.empty;

                        const { doc } = state;
                        const decorations: Decoration[] = [];

                        let isInsideFocusedSection = false;
                        let sectionLevel: number | null = null;

                        // Single-pass iteration over top-level blocks for maximum reliability
                        doc.content.forEach((node, offset) => {
                            const pos = offset;
                            const endPos = pos + node.nodeSize;

                            // 1. Detect entry: If this block starts exactly at our focus coordinate
                            if (pos === targetPos) {
                                isInsideFocusedSection = true;
                                if (node.type.name === 'heading') {
                                    sectionLevel = Number(node.attrs.level) || null;
                                }
                            }
                            // 2. Detect exit: If we are already focused and hit a NEW heading
                            else if (isInsideFocusedSection && node.type.name === 'heading') {
                                const level = Number(node.attrs.level);
                                // A section ends when we hit a heading of same or HIGHER importance (lower level number)
                                if (sectionLevel !== null && level <= sectionLevel) {
                                    isInsideFocusedSection = false;
                                }
                            }

                            // 3. Apply decoration
                            if (isInsideFocusedSection && node.isBlock) {
                                decorations.push(
                                    Decoration.node(pos, endPos, {
                                        class: 'focus-visible',
                                    })
                                );
                            }
                        });

                        return DecorationSet.create(doc, decorations);
                    },
                },
            }),
        ];
    },
});
