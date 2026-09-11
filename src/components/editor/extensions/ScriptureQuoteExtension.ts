import { Extension, InputRule } from '@tiptap/core';
import { parseScriptureReference } from '@/lib/scriptureParser';
import { dbHelpers } from '@/lib/db';
import { useBibleStore } from '@/stores/bibleStore';

/**
 * ScriptureQuoteExtension
 * 
 * Listens for double-bracket scripture references like [[John 3:16]] or [[Rom 8:28-30]]
 * and automatically converts them into a styled blockquote containing the full scripture
 * verse text along with proper translation attribution.
 */
export const ScriptureQuoteExtension = Extension.create({
    name: 'scriptureQuote',

    addInputRules() {
        return [
            new InputRule({
                // Matches [[Book Chapter:Verse]] or [[Book Chapter:Verse-VerseEnd]]
                find: /\[\[([^\]\n]+)\]\]$/,
                handler: ({ state, range, match }) => {
                    const rawRef = match[1]?.trim();
                    if (!rawRef) return null;

                    const parsed = parseScriptureReference(rawRef);
                    if (!parsed || parsed.verse === null) {
                        return null;
                    }
                    const verseNum = parsed.verse;

                    // Delete the [[...]] trigger text
                    const { tr } = state;
                    tr.delete(range.from, range.to);

                    const editor = this.editor;
                    const insertPos = range.from;

                    // Asynchronously fetch verse content and insert blockquote
                    setTimeout(async () => {
                        try {
                            const version = useBibleStore.getState().mainVersion || 'kjv';
                            let verseText = await dbHelpers.getVerseText(
                                version,
                                parsed.book,
                                parsed.chapter,
                                verseNum,
                                parsed.verseEnd
                            );

                            // Fallback to KJV if not found in current translation
                            if (!verseText && version !== 'kjv') {
                                verseText = await dbHelpers.getVerseText(
                                    'kjv',
                                    parsed.book,
                                    parsed.chapter,
                                    verseNum,
                                    parsed.verseEnd
                                );
                            }

                            const refLabel = `${parsed.book} ${parsed.chapter}:${parsed.verse}${parsed.verseEnd ? `-${parsed.verseEnd}` : ''}`;
                            const citation = `${refLabel} (${version.toUpperCase()})`;

                            if (verseText) {
                                const quoteHtml = `<blockquote><p>${verseText}</p><p><em>— ${citation}</em></p></blockquote><p></p>`;
                                editor.chain().focus().insertContentAt(insertPos, quoteHtml).run();
                            } else {
                                const fallbackHtml = `<blockquote><p><em>[Scripture: ${citation}]</em></p></blockquote><p></p>`;
                                editor.chain().focus().insertContentAt(insertPos, fallbackHtml).run();
                            }
                        } catch (err) {
                            console.error('[ScriptureQuoteExtension] Failed to fetch scripture:', err);
                        }
                    }, 10);

                    return;
                },
            }),
        ];
    },
});
