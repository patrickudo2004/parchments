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
                            const segments = parsed.segments && parsed.segments.length > 0
                                ? parsed.segments
                                : [{ verse: verseNum, verseEnd: parsed.verseEnd }];

                            const segmentTexts: string[] = [];

                            for (const seg of segments) {
                                let text = await dbHelpers.getVerseText(
                                    version,
                                    parsed.book,
                                    parsed.chapter,
                                    seg.verse,
                                    seg.verseEnd
                                );

                                // Fallback to KJV if not found in current translation
                                if (!text && version !== 'kjv') {
                                    text = await dbHelpers.getVerseText(
                                        'kjv',
                                        parsed.book,
                                        parsed.chapter,
                                        seg.verse,
                                        seg.verseEnd
                                    );
                                }

                                if (text) {
                                    segmentTexts.push(text);
                                }
                            }

                            const formattedSegments = segments
                                .map(s => s.verseEnd ? `${s.verse}–${s.verseEnd}` : `${s.verse}`)
                                .join(', ');
                            const refLabel = `${parsed.book} ${parsed.chapter}:${formattedSegments}`;
                            const citation = `${refLabel} (${version.toUpperCase()})`;

                            if (segmentTexts.length > 0) {
                                const fullQuote = segmentTexts.join(' <em>[...]</em> ');
                                const quoteHtml = `<blockquote><p>${fullQuote}</p><p><em>— ${citation}</em></p></blockquote><p></p>`;
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
