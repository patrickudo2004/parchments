import { unzipSync, strFromU8 } from 'fflate';
import { db } from '../lib/db';
import type { BibleVerse } from '../types/database';
import { encryptVerseText } from '../lib/bible/bibleCryptoService';

const CANONICAL_BOOKS: string[] = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
    'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms',
    'Proverbs', 'Ecclesiastes', 'Song of Solomon',
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
    'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
    'Zechariah', 'Malachi',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
    'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
    '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
    'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

const CANONICAL_LOWER_MAP: Record<string, string> = {};
for (const b of CANONICAL_BOOKS) {
    CANONICAL_LOWER_MAP[b.toLowerCase()] = b;
}

const USFM_BOOK_MAPPING: Record<string, string> = {
    'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
    'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
    '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
    'EZR': 'Ezra', 'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms',
    'PRO': 'Proverbs', 'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'SOL': 'Song of Solomon', 'SON': 'Song of Solomon',
    'ISA': 'Isaiah', 'JER': 'Jeremiah', 'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'EZE': 'Ezekiel', 'DAN': 'Daniel',
    'HOS': 'Hosea', 'JOL': 'Joel', 'JOE': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
    'MIC': 'Micah', 'NAM': 'Nahum', 'NAH': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai',
    'ZEC': 'Zechariah', 'MAL': 'Malachi',
    'MAT': 'Matthew', 'MRK': 'Mark', 'MAR': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'JOH': 'John', 'ACT': 'Acts',
    'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians',
    'EPH': 'Ephesians', 'PHP': 'Philippians', 'PHI': 'Philippians', 'COL': 'Colossians',
    '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
    'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James', 'JAM': 'James',
    '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John',
    'JUD': 'Jude', 'JDE': 'Jude', 'REV': 'Revelation'
};

// thiagobodruk/bible GitHub repository uses distinct short abbrevs (notably 'jud' = Judges, 'jd' = Jude, 'jn' = Jonah, 'jo' = John)
const THIAGO_ABBREV_MAPPING: Record<string, string> = {
    'gn': 'Genesis', 'ex': 'Exodus', 'lv': 'Leviticus', 'nm': 'Numbers', 'dt': 'Deuteronomy',
    'js': 'Joshua', 'jud': 'Judges', 'rt': 'Ruth', '1sm': '1 Samuel', '2sm': '2 Samuel',
    '1kgs': '1 Kings', '2kgs': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
    'ezr': 'Ezra', 'ne': 'Nehemiah', 'et': 'Esther', 'job': 'Job', 'ps': 'Psalms',
    'prv': 'Proverbs', 'ec': 'Ecclesiastes', 'so': 'Song of Solomon',
    'is': 'Isaiah', 'jr': 'Jeremiah', 'lm': 'Lamentations', 'ez': 'Ezekiel', 'dn': 'Daniel',
    'ho': 'Hosea', 'jl': 'Joel', 'am': 'Amos', 'ob': 'Obadiah', 'jn': 'Jonah',
    'mi': 'Micah', 'na': 'Nahum', 'hk': 'Habakkuk', 'zp': 'Zephaniah', 'hg': 'Haggai',
    'zc': 'Zechariah', 'ml': 'Malachi',
    'mt': 'Matthew', 'mk': 'Mark', 'lk': 'Luke', 'jo': 'John', 'act': 'Acts',
    'rm': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians', 'gl': 'Galatians',
    'eph': 'Ephesians', 'ph': 'Philippians', 'cl': 'Colossians', '1ts': '1 Thessalonians',
    '2ts': '2 Thessalonians', '1tm': '1 Timothy', '2tm': '2 Timothy', 'tt': 'Titus',
    'phm': 'Philemon', 'hb': 'Hebrews', 'jm': 'James', '1pe': '1 Peter', '2pe': '2 Peter',
    '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', 'jd': 'Jude', 're': 'Revelation'
};

const BOOK_ALIASES: Record<string, string> = {
    'psalm': 'Psalms',
    'song of songs': 'Song of Solomon',
    'canticles': 'Song of Solomon',
    'canticle of canticles': 'Song of Solomon',
    'revelation of john': 'Revelation',
    'revelations': 'Revelation',
    'apocalypse': 'Revelation',
    'acts of the apostles': 'Acts',
    'i samuel': '1 Samuel', 'ii samuel': '2 Samuel',
    'i kings': '1 Kings', 'ii kings': '2 Kings',
    'i chronicles': '1 Chronicles', 'ii chronicles': '2 Chronicles',
    'i corinthians': '1 Corinthians', 'ii corinthians': '2 Corinthians',
    'i thessalonians': '1 Thessalonians', 'ii thessalonians': '2 Thessalonians',
    'i timothy': '1 Timothy', 'ii timothy': '2 Timothy',
    'i peter': '1 Peter', 'ii peter': '2 Peter',
    'i john': '1 John', 'ii john': '2 John', 'iii john': '3 John',
    '1st samuel': '1 Samuel', '2nd samuel': '2 Samuel',
    '1st kings': '1 Kings', '2nd kings': '2 Kings',
    '1st chronicles': '1 Chronicles', '2nd chronicles': '2 Chronicles',
    '1st corinthians': '1 Corinthians', '2nd corinthians': '2 Corinthians',
    '1st thessalonians': '1 Thessalonians', '2nd thessalonians': '2 Thessalonians',
    '1st timothy': '1 Timothy', '2nd timothy': '2 Timothy',
    '1st peter': '1 Peter', '2nd peter': '2 Peter',
    '1st john': '1 John', '2nd john': '2 John', '3rd john': '3 John',
};

const USFM_NON_BIBLICAL_CODES = new Set([
    'FRT', 'BAK', 'OTH', 'INT', 'CNC', 'GLO', 'TDX', 'NDX', 'XXA', 'XXB', 'XXC', 'XXD', 'XXE', 'XXF', 'XXG'
]);

function normalizeBookName(rawName?: string | number | null, bookId?: string | null, isThiagoFormat = false, fallbackIndex?: number): string {
    if (typeof rawName === 'number' && rawName >= 1 && rawName <= 66) {
        return CANONICAL_BOOKS[rawName - 1];
    }

    // 1. Check explicit USFM 3-letter ID first (crucial for HelloAO non-English Bibles whose .name is localized)
    if (bookId && !isThiagoFormat) {
        const upId = String(bookId).trim().toUpperCase();
        if (USFM_BOOK_MAPPING[upId]) return USFM_BOOK_MAPPING[upId];
    }

    const cleanedRaw = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
    const lowerRaw = cleanedRaw.toLowerCase();

    // 2. Direct canonical English match or alias
    if (CANONICAL_LOWER_MAP[lowerRaw]) return CANONICAL_LOWER_MAP[lowerRaw];
    if (BOOK_ALIASES[lowerRaw]) return BOOK_ALIASES[lowerRaw];

    // 3. Roman numeral prefixes (I / II / III)
    if (/^iii\s+/i.test(cleanedRaw)) {
        const mapped = cleanedRaw.replace(/^iii\s+/i, '3 ');
        if (CANONICAL_LOWER_MAP[mapped.toLowerCase()]) return CANONICAL_LOWER_MAP[mapped.toLowerCase()];
        return mapped;
    }
    if (/^ii\s+/i.test(cleanedRaw)) {
        const mapped = cleanedRaw.replace(/^ii\s+/i, '2 ');
        if (CANONICAL_LOWER_MAP[mapped.toLowerCase()]) return CANONICAL_LOWER_MAP[mapped.toLowerCase()];
        return mapped;
    }
    if (/^i\s+/i.test(cleanedRaw)) {
        const mapped = cleanedRaw.replace(/^i\s+/i, '1 ');
        if (CANONICAL_LOWER_MAP[mapped.toLowerCase()]) return CANONICAL_LOWER_MAP[mapped.toLowerCase()];
        return mapped;
    }

    // 4. thiagobodruk/bible abbreviation lookup
    if (isThiagoFormat) {
        const abbrevKey = String(bookId || cleanedRaw).trim().toLowerCase();
        if (THIAGO_ABBREV_MAPPING[abbrevKey]) return THIAGO_ABBREV_MAPPING[abbrevKey];
        if (typeof fallbackIndex === 'number' && fallbackIndex >= 0 && fallbackIndex < 66) {
            return CANONICAL_BOOKS[fallbackIndex];
        }
    }

    // 5. USFM code in rawName
    if (cleanedRaw && USFM_BOOK_MAPPING[cleanedRaw.toUpperCase()]) {
        return USFM_BOOK_MAPPING[cleanedRaw.toUpperCase()];
    }

    // 6. Numeric string 1..66
    const asNum = parseInt(cleanedRaw, 10);
    if (!Number.isNaN(asNum) && String(asNum) === cleanedRaw && asNum >= 1 && asNum <= 66) {
        return CANONICAL_BOOKS[asNum - 1];
    }

    // 7. Thiago abbrev fallback even if not explicitly flagged
    if (lowerRaw && THIAGO_ABBREV_MAPPING[lowerRaw]) {
        return THIAGO_ABBREV_MAPPING[lowerRaw];
    }

    return cleanedRaw || (typeof fallbackIndex === 'number' && fallbackIndex < 66 ? CANONICAL_BOOKS[fallbackIndex] : 'Unknown');
}

function cleanWhitespaceAndPunctuation(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:?!\u201D\u2019)\]»])/g, '$1')
        .replace(/([\u201C\u2018(\[«])\s+/g, '$1')
        .trim();
}

/**
 * Extracts plain readable text from HelloAO verse content arrays
 * (supports both complete.simple.json `.text` and rich complete.json `.content` arrays).
 */
function extractVerseContentText(v: any): string {
    if (typeof v === 'string') return cleanWhitespaceAndPunctuation(v);
    if (!v || typeof v !== 'object') return '';
    if (typeof v.text === 'string' && v.text.trim()) {
        return cleanWhitespaceAndPunctuation(v.text);
    }
    if (typeof v.content === 'string') {
        return cleanWhitespaceAndPunctuation(v.content);
    }
    if (Array.isArray(v.content)) {
        const parts: string[] = [];
        for (const item of v.content) {
            if (typeof item === 'string') {
                parts.push(item);
            } else if (item && typeof item === 'object') {
                // Skip footnote references like { noteId: 13 }
                if (typeof item.text === 'string') {
                    parts.push(item.text);
                } else if (item.lineBreak) {
                    parts.push(' ');
                }
            }
        }
        return cleanWhitespaceAndPunctuation(parts.join(' '));
    }
    return '';
}

/**
 * Parses one or more USFM books from raw USFM text with full handling of:
 * - Multi-book files split on `\id`
 * - Inline tags (`\wj`, `\nd`, `\add`, `\it`, `\bd`, `\sc`, `\qt`, `\w word|strong="..."\w*`)
 * - Footnotes (`\f...\f*`), endnotes (`\fe...\fe*`), cross-refs (`\x...\x*`), figures (`\fig...\fig*`)
 * - Multi-line poetry/paragraph continuations (`\q1`, `\q2`, `\p`, `\m`, `\nb`)
 * - Section headings (`\s1`, `\r`, `\mt`, etc.) stripped so they never bleed into verses
 */
function parseUsfmRawVerses(rawContent: string, fallbackBook?: string): Array<{ book: string; chapter: number; verse: number; text: string }> {
    const normalized = rawContent.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const results: Array<{ book: string; chapter: number; verse: number; text: string }> = [];

    // Split multi-book USFM text cleanly if multiple `\id ` headers appear
    const bookBlocks = normalized.split(/(?=(?:^|\n)\\id\s+)/).filter((b) => b.trim().length > 0);

    for (const block of bookBlocks) {
        const idMatch = block.match(/(?:^|\n)\\id\s+([A-Z0-9]{2,4})\b/i);
        const bookCode = idMatch ? idMatch[1].toUpperCase() : null;

        if (bookCode && USFM_NON_BIBLICAL_CODES.has(bookCode)) {
            continue;
        }

        const hMatch = block.match(/(?:^|\n)\\(?:h|toc2|toc3)\s+([^\n]+)/i);
        const rawHeaderName = hMatch ? hMatch[1].trim() : undefined;

        let bookName = '';
        if (bookCode && USFM_BOOK_MAPPING[bookCode]) {
            bookName = USFM_BOOK_MAPPING[bookCode];
        } else if (rawHeaderName) {
            bookName = normalizeBookName(rawHeaderName, bookCode);
        } else if (bookCode) {
            bookName = normalizeBookName(bookCode);
        } else if (fallbackBook) {
            bookName = normalizeBookName(fallbackBook);
        } else {
            bookName = 'Unknown';
        }

        // Remove footnotes, endnotes, cross-references, and figure blocks across newlines FIRST
        let cleaned = block
            .replace(/\\f\b[\s\S]*?\\f\*/g, ' ')
            .replace(/\\fe\b[\s\S]*?\\fe\*/g, ' ')
            .replace(/\\x\b[\s\S]*?\\x\*/g, ' ')
            .replace(/\\fig\b[\s\S]*?\\fig\*/g, ' ')
            .replace(/\\rq\b[\s\S]*?\\rq\*/g, ' ');

        // Split into chapter chunks using `\c <num>`
        const chapterRegex = /(?:^|\n)\\c\s+(\d+)\b[^\n]*/g;
        const chapterMatches: Array<{ num: number; start: number; bodyStart: number }> = [];
        let cm: RegExpExecArray | null;
        while ((cm = chapterRegex.exec(cleaned)) !== null) {
            chapterMatches.push({
                num: parseInt(cm[1], 10),
                start: cm.index,
                bodyStart: cm.index + cm[0].length
            });
        }

        for (let ci = 0; ci < chapterMatches.length; ci++) {
            const chapterNum = chapterMatches[ci].num;
            if (!chapterNum || Number.isNaN(chapterNum)) continue;

            const bodyStart = chapterMatches[ci].bodyStart;
            const bodyEnd = ci + 1 < chapterMatches.length ? chapterMatches[ci + 1].start : cleaned.length;
            let chapterBody = cleaned.slice(bodyStart, bodyEnd);

            // Strip non-verse structural lines (section headers, references, titles, Psalm superscriptions, remarks)
            chapterBody = chapterBody
                .split('\n')
                .filter((line) => {
                    const trimmed = line.trim();
                    if (!trimmed) return false;
                    // Drop headings/metadata lines that do NOT contain a `\v ` verse marker
                    if (!/\\v\s+\d+/.test(trimmed) && /^\\(?:s\d*|r|mr|ms\d*|mt\d*|mte\d*|h|toc\d*|ide|rem|cl|cp|ca|is\d*|ip|ipi|im|imi|ipq|imq|ipr|iq\d*|iot|io\d*|ili\d*|d|sp|qa|sr|sd\d*|pb|periph)\b/i.test(trimmed)) {
                        return false;
                    }
                    return true;
                })
                .join('\n');

            // Extract every verse via `\v <num>` (supports verse bridges like `\v 1-2` by using leading verse num)
            const verseRegex = /\\v\s+(\d+)(?:[-–]\d+)?[a-z]?\s+/g;
            const verseMatches: Array<{ num: number; start: number; textStart: number }> = [];
            let vm: RegExpExecArray | null;
            while ((vm = verseRegex.exec(chapterBody)) !== null) {
                verseMatches.push({
                    num: parseInt(vm[1], 10),
                    start: vm.index,
                    textStart: vm.index + vm[0].length
                });
            }

            for (let vi = 0; vi < verseMatches.length; vi++) {
                const verseNum = verseMatches[vi].num;
                if (!verseNum || Number.isNaN(verseNum)) continue;

                const tStart = verseMatches[vi].textStart;
                const tEnd = vi + 1 < verseMatches.length ? verseMatches[vi + 1].start : chapterBody.length;
                let verseRaw = chapterBody.slice(tStart, tEnd);

                // Unwrap word-level Strong's / lemma attributes: `\w word|strong="H1234"\w*` -> `word`
                verseRaw = verseRaw.replace(/\\\+?w\s+([^\\|]+?)(?:\|[^\\*]*)?\\\+?w\*/g, '$1');
                // Remove milestone self-closing markers like `\zaln-s ...\*` and `\zaln-e\*`
                verseRaw = verseRaw.replace(/\\z[a-z0-9-]+\b[^\\]*?\\\*/gi, ' ');
                // Remove remaining attribute tails `|strong="..."` inside other inline spans before stripping tags
                verseRaw = verseRaw.replace(/\|[^\\\s*]+(?:="[^"]*")*/g, '');
                // Strip paired opening/closing markers while preserving all inner text (e.g. `\wj`, `\nd`, `\add`, `\q1`, `\p`, `\m`)
                verseRaw = verseRaw.replace(/\\\+?[a-z]+[0-9]*\*?/gi, ' ');
                // Clean any stray pipe characters or newlines
                verseRaw = verseRaw.replace(/\s*\n\s*/g, ' ');

                const cleanText = cleanWhitespaceAndPunctuation(verseRaw);
                if (cleanText) {
                    results.push({ book: bookName, chapter: chapterNum, verse: verseNum, text: cleanText });
                }
            }
        }
    }

    return results;
}

function parseJsonRawVerses(data: any): Array<{ book: string; chapter: number; verse: number; text: string }> {
    const rawVerses: Array<{ book: string; chapter: number; verse: number; text: string }> = [];

    // CASE 1: Top-level array (thiagobodruk/bible OR flat verse array OR book array)
    if (Array.isArray(data)) {
        if (data.length === 0) return rawVerses;
        const first = data[0];

        // 1a. Flat array of verses: [{ book/book_name, chapter, verse, text }]
        if (first && typeof first === 'object' && ('verse' in first) && ('text' in first)) {
            for (const v of data) {
                const bookName = normalizeBookName(v.book_name || v.book || v.book_id, v.book_id);
                const chapterNum = parseInt(String(v.chapter), 10);
                const verseNum = parseInt(String(v.verse), 10);
                const text = extractVerseContentText(v);
                if (bookName && chapterNum > 0 && verseNum > 0 && text) {
                    rawVerses.push({ book: bookName, chapter: chapterNum, verse: verseNum, text });
                }
            }
            return rawVerses;
        }

        // 1b. thiagobodruk/bible or array of books: [{ abbrev, name, chapters: [[...], ...] }]
        const isThiago = Boolean(first && typeof first === 'object' && Array.isArray(first.chapters) && Array.isArray(first.chapters[0]) && typeof first.chapters[0][0] === 'string');

        for (let bIdx = 0; bIdx < data.length; bIdx++) {
            const bookEntry = data[bIdx];
            if (!bookEntry || typeof bookEntry !== 'object' || !bookEntry.chapters) continue;

            const bookName = normalizeBookName(
                bookEntry.name || bookEntry.commonName || bookEntry.book,
                bookEntry.abbrev || bookEntry.id || bookEntry.bookId,
                isThiago,
                bIdx
            );

            if (Array.isArray(bookEntry.chapters)) {
                for (let cIdx = 0; cIdx < bookEntry.chapters.length; cIdx++) {
                    const ch = bookEntry.chapters[cIdx];
                    if (Array.isArray(ch)) {
                        // thiagobodruk: chapters[cIdx] is string[] of verses (1-indexed)
                        const chapterNum = cIdx + 1;
                        for (let vIdx = 0; vIdx < ch.length; vIdx++) {
                            const text = extractVerseContentText(ch[vIdx]);
                            if (text) {
                                rawVerses.push({ book: bookName, chapter: chapterNum, verse: vIdx + 1, text });
                            }
                        }
                    } else if (ch && typeof ch === 'object') {
                        const chapterNum = ch.chapter?.number ?? ch.chapter ?? (cIdx + 1);
                        const versesObj = ch.chapter?.content ?? ch.verses ?? ch;
                        collectChapterVerses(rawVerses, bookName, parseInt(String(chapterNum), 10), versesObj);
                    }
                }
            }
        }
        return rawVerses;
    }

    // CASE 2: Object with `books` property (HelloAO complete.simple.json / complete.json / Scrollmapper / KJV object)
    if (data && typeof data === 'object' && data.books) {
        const isArray = Array.isArray(data.books);
        const bookEntries = isArray ? data.books : Object.entries(data.books);

        for (let bIdx = 0; bIdx < bookEntries.length; bIdx++) {
            const entry = bookEntries[bIdx];
            const rawBookName = isArray ? (entry.commonName || entry.name || entry.book) : entry[0];
            const bookId = isArray ? (entry.id || entry.bookId || entry.abbrev) : null;
            const bookData = isArray ? entry : entry[1];
            const bookName = normalizeBookName(rawBookName, bookId, false, bIdx);

            const chaptersObj = bookData?.chapters ?? (!isArray ? bookData : null);
            if (!chaptersObj) continue;

            const isChArray = Array.isArray(chaptersObj);
            const chaptersArr = isChArray ? chaptersObj : Object.entries(chaptersObj);

            for (let cIdx = 0; cIdx < chaptersArr.length; cIdx++) {
                const chEntry = chaptersArr[cIdx];
                let chapterNum = 0;
                let versesObj: any = null;

                if (isChArray) {
                    if (Array.isArray(chEntry)) {
                        chapterNum = cIdx + 1;
                        versesObj = chEntry;
                    } else if (chEntry?.chapter && typeof chEntry.chapter === 'object') {
                        // HelloAO format (complete.simple.json & complete.json)
                        chapterNum = chEntry.chapter.number || (cIdx + 1);
                        versesObj = chEntry.chapter.content || [];
                    } else if (chEntry && typeof chEntry === 'object') {
                        // Scrollmapper format
                        chapterNum = chEntry.chapter !== undefined ? parseInt(String(chEntry.chapter), 10) : (cIdx + 1);
                        versesObj = chEntry.verses || chEntry;
                    }
                } else {
                    chapterNum = parseInt(String(chEntry[0]), 10);
                    const cVal = chEntry[1];
                    versesObj = cVal?.verses ? cVal.verses : cVal;
                }

                if (!chapterNum || Number.isNaN(chapterNum) || !versesObj) continue;
                collectChapterVerses(rawVerses, bookName, chapterNum, versesObj);
            }
        }
        return rawVerses;
    }

    // CASE 3: Object with `verses` flat array
    if (data && typeof data === 'object' && Array.isArray(data.verses)) {
        for (const v of data.verses) {
            const bookName = normalizeBookName(v.book_name || v.book || v.book_id, v.book_id);
            const chapterNum = parseInt(String(v.chapter), 10);
            const verseNum = parseInt(String(v.verse), 10);
            const text = extractVerseContentText(v);
            if (bookName && chapterNum > 0 && verseNum > 0 && text) {
                rawVerses.push({ book: bookName, chapter: chapterNum, verse: verseNum, text });
            }
        }
        return rawVerses;
    }

    // CASE 4: Top-level object keyed directly by book names: { "Genesis": { "1": { "1": "In the beginning..." } } }
    if (data && typeof data === 'object') {
        const entries = Object.entries(data);
        for (const [key, val] of entries) {
            if (!val || typeof val !== 'object') continue;
            const resolved = normalizeBookName(key);
            if (!CANONICAL_LOWER_MAP[resolved.toLowerCase()]) continue;

            const chaptersObj = (val as any).chapters ?? val;
            if (Array.isArray(chaptersObj)) {
                chaptersObj.forEach((ch, idx) => collectChapterVerses(rawVerses, resolved, idx + 1, ch));
            } else if (typeof chaptersObj === 'object') {
                for (const [chKey, chVal] of Object.entries(chaptersObj)) {
                    const chNum = parseInt(chKey, 10);
                    if (chNum > 0) {
                        collectChapterVerses(rawVerses, resolved, chNum, (chVal as any)?.verses ?? chVal);
                    }
                }
            }
        }
        if (rawVerses.length > 0) return rawVerses;
    }

    throw new Error('Unrecognized JSON Bible structure. Expected HelloAO JSON, Scrollmapper JSON, thiagobodruk/bible JSON array, or a "books"/"verses" structure.');
}

function collectChapterVerses(
    out: Array<{ book: string; chapter: number; verse: number; text: string }>,
    bookName: string,
    chapterNum: number,
    versesObj: any
) {
    if (Array.isArray(versesObj)) {
        for (let idx = 0; idx < versesObj.length; idx++) {
            const v = versesObj[idx];
            if (typeof v === 'string') {
                const text = cleanWhitespaceAndPunctuation(v);
                if (text) out.push({ book: bookName, chapter: chapterNum, verse: idx + 1, text });
            } else if (v && typeof v === 'object') {
                if (v.type === 'verse') {
                    const verseNum = parseInt(String(v.number), 10);
                    const text = extractVerseContentText(v);
                    if (verseNum > 0 && text) {
                        out.push({ book: bookName, chapter: chapterNum, verse: verseNum, text });
                    }
                } else if (v.verse !== undefined) {
                    const verseNum = parseInt(String(v.verse), 10);
                    const text = extractVerseContentText(v);
                    if (verseNum > 0 && text) {
                        out.push({ book: bookName, chapter: chapterNum, verse: verseNum, text });
                    }
                }
            }
        }
    } else if (versesObj && typeof versesObj === 'object') {
        for (const [vNumStr, vVal] of Object.entries(versesObj)) {
            const verseNum = parseInt(vNumStr, 10);
            if (Number.isNaN(verseNum) || verseNum <= 0) continue;
            const text = extractVerseContentText(vVal);
            if (text) {
                out.push({ book: bookName, chapter: chapterNum, verse: verseNum, text });
            }
        }
    }
}

async function encryptAndStoreVerses(
    rawVerses: Array<{ book: string; chapter: number; verse: number; text: string }>,
    versionId: string,
    baseProgress = 25
): Promise<{ verseCount: number; bookCount: number }> {
    if (rawVerses.length === 0) {
        throw new Error('No valid Bible verses were found in this file. Supported formats: USFM (.usfm/.sfm), USFM/JSON .zip archive (e.g. from ebible.org), or Bible JSON (HelloAO, Scrollmapper, thiagobodruk/bible).');
    }

    // Deduplicate by canonical id (keeping last non-empty in case of repeated verse bridges)
    const dedupMap = new Map<string, { book: string; chapter: number; verse: number; text: string }>();
    const booksSet = new Set<string>();
    for (const rv of rawVerses) {
        const id = `${versionId}-${rv.book}-${rv.chapter}-${rv.verse}`.toLowerCase();
        dedupMap.set(id, rv);
        booksSet.add(rv.book);
    }

    const entries = Array.from(dedupMap.entries());
    const total = entries.length;
    const encryptedVerses: BibleVerse[] = new Array(total);

    // Encrypt in parallel batches so 31,000-verse Bibles import in seconds while keeping smooth progress
    const BATCH_SIZE = 250;
    for (let i = 0; i < total; i += BATCH_SIZE) {
        const end = Math.min(i + BATCH_SIZE, total);
        const batchPromises: Promise<BibleVerse>[] = new Array(end - i);
        for (let j = i; j < end; j++) {
            const [id, rv] = entries[j];
            batchPromises[j - i] = encryptVerseText(rv.text).then((encrypted) => ({
                id,
                versionId,
                book: rv.book,
                chapter: rv.chapter,
                verse: rv.verse,
                text: encrypted,
            }));
        }
        const batchResults = await Promise.all(batchPromises);
        for (let k = 0; k < batchResults.length; k++) {
            encryptedVerses[i + k] = batchResults[k];
        }

        if (end % 750 === 0 || end === total) {
            const lastRv = entries[end - 1][1];
            const pct = baseProgress + Math.round((end / total) * (82 - baseProgress));
            self.postMessage({
                status: 'progress',
                progress: Math.min(82, pct),
                message: `Encrypting ${lastRv.book} ${lastRv.chapter} (${end.toLocaleString()} / ${total.toLocaleString()} verses)...`
            });
        }
    }

    // Chunked bulkPut adhering to GEMINI.md Rule 2 (CHUNK_SIZE = 2500 with event loop yield)
    const CHUNK_SIZE = 2500;
    for (let i = 0; i < encryptedVerses.length; i += CHUNK_SIZE) {
        const chunk = encryptedVerses.slice(i, i + CHUNK_SIZE);
        await db.bibleVerses.bulkPut(chunk);
        const savePct = 82 + Math.round((Math.min(i + CHUNK_SIZE, total) / total) * 16);
        self.postMessage({
            status: 'saving',
            progress: Math.min(98, savePct),
            message: `Saving ${Math.min(i + CHUNK_SIZE, total).toLocaleString()} / ${total.toLocaleString()} verses to offline vault...`
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await db.bibleVersions.update(versionId, { isDownloaded: true });

    return { verseCount: total, bookCount: booksSet.size };
}

console.info('[BibleWorker] Bible import worker script loaded.');

self.addEventListener('message', async (event) => {
    const { type, data, versionId: rawVersionId, files } = event.data;
    const versionId = String(rawVersionId || '').trim().toLowerCase();

    try {
        if (!versionId) {
            throw new Error('Missing Bible version identifier.');
        }

        if (type === 'IMPORT_JSON') {
            self.postMessage({ status: 'processing', progress: 10, message: 'Parsing Bible JSON...' });
            const parsedData = typeof data === 'string'
                ? JSON.parse(data.replace(/^\uFEFF/, ''))
                : data;

            const rawVerses = parseJsonRawVerses(parsedData);
            self.postMessage({ status: 'processing', progress: 25, message: `Parsed ${rawVerses.length.toLocaleString()} verses. Encrypting...` });

            const stats = await encryptAndStoreVerses(rawVerses, versionId, 25);
            self.postMessage({
                status: 'complete',
                progress: 100,
                message: `Imported ${stats.verseCount.toLocaleString()} verses across ${stats.bookCount} books!`,
                verseCount: stats.verseCount,
                bookCount: stats.bookCount
            });
            return;
        }

        if (type === 'IMPORT_USFM') {
            self.postMessage({ status: 'processing', progress: 10, message: 'Parsing USFM scripture file...' });
            const rawVerses = parseUsfmRawVerses(String(data || ''));
            self.postMessage({ status: 'processing', progress: 25, message: `Parsed ${rawVerses.length.toLocaleString()} verses. Encrypting...` });

            const stats = await encryptAndStoreVerses(rawVerses, versionId, 25);
            self.postMessage({
                status: 'complete',
                progress: 100,
                message: `Imported ${stats.verseCount.toLocaleString()} verses across ${stats.bookCount} books!`,
                verseCount: stats.verseCount,
                bookCount: stats.bookCount
            });
            return;
        }

        if (type === 'IMPORT_USFM_BATCH') {
            const batch: Array<{ name: string; content: string }> = Array.isArray(files) ? files : [];
            self.postMessage({ status: 'processing', progress: 8, message: `Parsing ${batch.length} USFM files...` });

            const allVerses: Array<{ book: string; chapter: number; verse: number; text: string }> = [];
            for (let i = 0; i < batch.length; i++) {
                const item = batch[i];
                const parsed = parseUsfmRawVerses(item.content, item.name.replace(/\.[^.]+$/, ''));
                for (const v of parsed) allVerses.push(v);

                if ((i + 1) % 5 === 0 || i === batch.length - 1) {
                    const pct = 8 + Math.round(((i + 1) / Math.max(1, batch.length)) * 18);
                    self.postMessage({
                        status: 'processing',
                        progress: pct,
                        message: `Parsed ${i + 1}/${batch.length} USFM files (${allVerses.length.toLocaleString()} verses)...`
                    });
                }
            }

            const stats = await encryptAndStoreVerses(allVerses, versionId, 26);
            self.postMessage({
                status: 'complete',
                progress: 100,
                message: `Imported ${stats.verseCount.toLocaleString()} verses across ${stats.bookCount} books!`,
                verseCount: stats.verseCount,
                bookCount: stats.bookCount
            });
            return;
        }

        if (type === 'IMPORT_ZIP') {
            self.postMessage({ status: 'processing', progress: 8, message: 'Unzipping Bible archive...' });
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
            const unzipped = unzipSync(bytes);

            const entryNames = Object.keys(unzipped).filter((name) => {
                if (name.endsWith('/')) return false;
                if (name.startsWith('__MACOSX/') || name.includes('/__MACOSX/')) return false;
                const base = name.split('/').pop() || '';
                if (base.startsWith('.')) return false;
                return true;
            });

            const usfmEntries = entryNames.filter((n) => /\.(usfm|sfm)$/i.test(n));
            const jsonEntries = entryNames.filter((n) => /\.json$/i.test(n));
            const allVerses: Array<{ book: string; chapter: number; verse: number; text: string }> = [];

            if (usfmEntries.length > 0) {
                self.postMessage({ status: 'processing', progress: 14, message: `Found ${usfmEntries.length} USFM files in archive...` });
                for (let i = 0; i < usfmEntries.length; i++) {
                    const entryName = usfmEntries[i];
                    const text = strFromU8(unzipped[entryName]);
                    const base = (entryName.split('/').pop() || '').replace(/\.[^.]+$/, '');
                    const parsed = parseUsfmRawVerses(text, base);
                    for (const v of parsed) allVerses.push(v);

                    if ((i + 1) % 6 === 0 || i === usfmEntries.length - 1) {
                        const pct = 14 + Math.round(((i + 1) / usfmEntries.length) * 14);
                        self.postMessage({
                            status: 'processing',
                            progress: pct,
                            message: `Parsed ${i + 1}/${usfmEntries.length} USFM books (${allVerses.length.toLocaleString()} verses)...`
                        });
                    }
                }
            } else if (jsonEntries.length > 0) {
                self.postMessage({ status: 'processing', progress: 14, message: `Found ${jsonEntries.length} JSON file(s) in archive...` });
                for (const entryName of jsonEntries) {
                    try {
                        const raw = strFromU8(unzipped[entryName]).replace(/^\uFEFF/, '');
                        const parsedJson = JSON.parse(raw);
                        const parsed = parseJsonRawVerses(parsedJson);
                        for (const v of parsed) allVerses.push(v);
                    } catch {
                        // Skip metadata/manifest JSON files inside archive
                    }
                }
            } else {
                // Fallback: inspect .txt files that actually contain USFM markers (`\c` and `\v`)
                const txtEntries = entryNames.filter((n) => /\.txt$/i.test(n));
                for (const entryName of txtEntries) {
                    const text = strFromU8(unzipped[entryName]);
                    if (/\\c\s+\d+/.test(text) && /\\v\s+\d+/.test(text)) {
                        const base = (entryName.split('/').pop() || '').replace(/\.[^.]+$/, '');
                        const parsed = parseUsfmRawVerses(text, base);
                        for (const v of parsed) allVerses.push(v);
                    }
                }
            }

            if (allVerses.length === 0) {
                throw new Error('No .usfm, .sfm, or supported Bible .json files were found inside this .zip archive. Tip: on ebible.org, download the "USFM" zip package.');
            }

            const stats = await encryptAndStoreVerses(allVerses, versionId, 28);
            self.postMessage({
                status: 'complete',
                progress: 100,
                message: `Imported ${stats.verseCount.toLocaleString()} verses across ${stats.bookCount} books from archive!`,
                verseCount: stats.verseCount,
                bookCount: stats.bookCount
            });
            return;
        }
    } catch (error: any) {
        console.error('[BibleWorker] Import error:', error);
        self.postMessage({ status: 'error', error: error?.message || String(error) });
    }
});

export { };
