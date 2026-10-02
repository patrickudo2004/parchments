export interface VerseSegment {
    verse: number;
    verseEnd: number | null;
}

export interface BibleReference {
    book: string;
    chapter: number;
    verse: number | null;
    verseEnd: number | null;
    segments?: VerseSegment[];
}

export interface ExtractedReference {
    text: string;
    startIndex: number;
    endIndex: number;
    ref: BibleReference;
}

// Map of common abbreviations to full book names
const BOOK_ABBREVIATIONS: { [key: string]: string } = {
    'gn': 'Genesis', 'gen': 'Genesis', 'genesis': 'Genesis',
    'ex': 'Exodus', 'exo': 'Exodus', 'exodus': 'Exodus',
    'lv': 'Leviticus', 'lev': 'Leviticus', 'leviticus': 'Leviticus',
    'nm': 'Numbers', 'num': 'Numbers', 'numbers': 'Numbers',
    'dt': 'Deuteronomy', 'deut': 'Deuteronomy', 'deuteronomy': 'Deuteronomy',
    'js': 'Joshua', 'josh': 'Joshua', 'joshua': 'Joshua',
    'jg': 'Judges', 'judg': 'Judges', 'judges': 'Judges',
    'ru': 'Ruth', 'ruth': 'Ruth',
    '1sm': '1 Samuel', '1sam': '1 Samuel', '1 samuel': '1 Samuel',
    '2sm': '2 Samuel', '2sam': '2 Samuel', '2 samuel': '2 Samuel',
    '1kn': '1 Kings', '1kgs': '1 Kings', '1 kings': '1 Kings',
    '2kn': '2 Kings', '2kgs': '2 Kings', '2 kings': '2 Kings',
    '1ch': '1 Chronicles', '1chron': '1 Chronicles', '1 chronicles': '1 Chronicles',
    '2ch': '2 Chronicles', '2chron': '2 Chronicles', '2 chronicles': '2 Chronicles',
    'ez': 'Ezra', 'ezra': 'Ezra',
    'ne': 'Nehemiah', 'neh': 'Nehemiah', 'nehemiah': 'Nehemiah',
    'es': 'Esther', 'est': 'Esther', 'esther': 'Esther',
    'jb': 'Job', 'job': 'Job',
    'ps': 'Psalms', 'psm': 'Psalms', 'pss': 'Psalms', 'psalms': 'Psalms', 'psalm': 'Psalms',
    'pr': 'Proverbs', 'prov': 'Proverbs', 'proverbs': 'Proverbs',
    'ec': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'ecclesiastes': 'Ecclesiastes',
    'sn': 'Song of Solomon', 'song': 'Song of Solomon', 'cant': 'Song of Solomon', 'song of solomon': 'Song of Solomon',
    'is': 'Isaiah', 'isa': 'Isaiah', 'isaiah': 'Isaiah',
    'jr': 'Jeremiah', 'jer': 'Jeremiah', 'jeremiah': 'Jeremiah',
    'lm': 'Lamentations', 'lam': 'Lamentations', 'lamentations': 'Lamentations',
    'ezk': 'Ezekiel', 'ezek': 'Ezekiel', 'ezekiel': 'Ezekiel',
    'dn': 'Daniel', 'dan': 'Daniel', 'daniel': 'Daniel',
    'ho': 'Hosea', 'hos': 'Hosea', 'hosea': 'Hosea',
    'jl': 'Joel', 'joel': 'Joel',
    'am': 'Amos', 'amos': 'Amos',
    'ob': 'Obadiah', 'obad': 'Obadiah', 'obadiah': 'Obadiah',
    'jn': 'Jonah', 'jon': 'Jonah', 'jonah': 'Jonah',
    'mi': 'Micah', 'mic': 'Micah', 'micah': 'Micah',
    'na': 'Nahum', 'nah': 'Nahum', 'nahum': 'Nahum',
    'hk': 'Habakkuk', 'hab': 'Habakkuk', 'habakkuk': 'Habakkuk',
    'zp': 'Zephaniah', 'zeph': 'Zephaniah', 'zephaniah': 'Zephaniah',
    'hg': 'Haggai', 'hag': 'Haggai', 'haggai': 'Haggai',
    'zc': 'Zechariah', 'zech': 'Zechariah', 'zechariah': 'Zechariah',
    'ml': 'Malachi', 'mal': 'Malachi', 'malachi': 'Malachi',
    'mt': 'Matthew', 'matt': 'Matthew', 'matthew': 'Matthew',
    'mk': 'Mark', 'mrk': 'Mark', 'mark': 'Mark',
    'lk': 'Luke', 'luk': 'Luke', 'luke': 'Luke',
    'jo': 'John', 'jhn': 'John', 'john': 'John',
    'ac': 'Acts', 'act': 'Acts', 'acts': 'Acts',
    'rm': 'Romans', 'rom': 'Romans', 'romans': 'Romans',
    '1cr': '1 Corinthians', '1cor': '1 Corinthians', '1 corinthians': '1 Corinthians',
    '2cr': '2 Corinthians', '2cor': '2 Corinthians', '2 corinthians': '2 Corinthians',
    'gl': 'Galatians', 'gal': 'Galatians', 'galatians': 'Galatians',
    'ep': 'Ephesians', 'eph': 'Ephesians', 'ephesians': 'Ephesians',
    'ph': 'Philippians', 'phil': 'Philippians', 'philippians': 'Philippians',
    'cl': 'Colossians', 'col': 'Colossians', 'colossians': 'Colossians',
    '1th': '1 Thessalonians', '1thess': '1 Thessalonians', '1 thessalonians': '1 Thessalonians',
    '2th': '2 Thessalonians', '2thess': '2 Thessalonians', '2 thessalonians': '2 Thessalonians',
    '1tm': '1 Timothy', '1tim': '1 Timothy', '1 timothy': '1 Timothy',
    '2tm': '2 Timothy', '2tim': '2 Timothy', '2 timothy': '2 Timothy',
    'tt': 'Titus', 'tit': 'Titus', 'titus': 'Titus',
    'pl': 'Philemon', 'phlm': 'Philemon', 'philemon': 'Philemon',
    'hb': 'Hebrews', 'heb': 'Hebrews', 'hebrews': 'Hebrews',
    'jm': 'James', 'jas': 'James', 'james': 'James',
    '1pt': '1 Peter', '1pet': '1 Peter', '1 peter': '1 Peter',
    '2pt': '2 Peter', '2pet': '2 Peter', '2 peter': '2 Peter',
    '1jn': '1 John', '1jhn': '1 John', '1 john': '1 John',
    '2jn': '2 John', '2jhn': '2 John', '2 john': '2 John',
    '3jn': '3 John', '3jhn': '3 John', '3 john': '3 John',
    'jd': 'Jude', 'jude': 'Jude',
    'rv': 'Revelation', 'rev': 'Revelation', 'revelation': 'Revelation'
};

/**
 * Parses comma-separated verse specifications into structured segments.
 * e.g., "4, 14-15" -> [{ verse: 4, verseEnd: null }, { verse: 14, verseEnd: 15 }]
 */
export const parseVerseSegments = (rawVerses: string): VerseSegment[] => {
    const rawParts = rawVerses.split(',').map(s => s.trim()).filter(Boolean);
    const segments: VerseSegment[] = [];

    for (const part of rawParts) {
        const rangeMatch = part.match(/^(\d+)(?:[-–—](\d+))?$/);
        if (rangeMatch) {
            const verse = parseInt(rangeMatch[1], 10);
            const verseEnd = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : null;
            segments.push({ verse, verseEnd });
        }
    }

    return segments;
};

/**
 * Regex explanation:
 * \b: Word boundary start
 * ((?:1|2|3|I|II|III)\s*)? : Optional number prefix (e.g., "1 ", "2 ")
 * ([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\.? : Book name (e.g., "John", "Song of Solomon") with optional dot
 * \s+ : Space between book and chapter
 * (\d+) : Chapter number
 * : : Separator
 * (\d+(?:[-–—]\d+)?(?:\s*,\s*\d+(?:[-–—]\d+)?)*) : Full verse specification with optional commas/ranges
 * \b : Word boundary end
 */
export const SCRIPTURE_REGEX = /\b((?:(?:1|2|3)\s*)|(?:(?:I|II|III)\s+))?((?:Song\s+of\s+Solomon)|(?:[a-zA-Z]+))\.?\s+(\d+):(\d+(?:[-–—]\d+)?(?:\s*,\s*\d+(?:[-–—]\d+)?)*)\b/i;

export const parseScriptureReference = (text: string): BibleReference | null => {
    const match = text.match(SCRIPTURE_REGEX);

    if (!match) return null;

    const [_, prefix, bookName, chapter, verseSpec] = match;

    // Normalize book name
    let cleanBookName = bookName.trim().toLowerCase();

    // Combine prefix if exists
    if (prefix) {
        const cleanPrefix = prefix.trim().replace('I', '1').replace('II', '2').replace('III', '3');
        cleanBookName = `${cleanPrefix}${cleanBookName}`; // e.g., "1john"
    }

    // Lookup full name
    let fullBookName = BOOK_ABBREVIATIONS[cleanBookName];

    if (!fullBookName && prefix) {
        // Try checking "1 john" format if "1john" failed
        const cleanPrefix = prefix.trim().replace('I', '1').replace('II', '2').replace('III', '3');
        cleanBookName = `${cleanPrefix} ${bookName.trim().toLowerCase()}`;
        fullBookName = BOOK_ABBREVIATIONS[cleanBookName];
    }

    if (!fullBookName) return null;

    const segments = parseVerseSegments(verseSpec);
    if (segments.length === 0) return null;

    return {
        book: fullBookName,
        chapter: parseInt(chapter, 10),
        verse: segments[0].verse,
        verseEnd: segments.length === 1 ? segments[0].verseEnd : null,
        segments: segments,
    };
};

/**
 * Scans a full text block, detecting both standard references and chained
 * chapter continuations across semicolons (e.g. "Gen 6:13; 7:4").
 */
export const scanScriptureReferences = (text: string): ExtractedReference[] => {
    const results: ExtractedReference[] = [];

    // Pattern matches:
    // Case 1: Full reference: (Prefix)?(Book) Chapter:VerseSpec
    // Case 2: Continuation: ; followed by Chapter:VerseSpec
    const combinedPattern = /(?:((?:(?:1|2|3)\s*)|(?:(?:I|II|III)\s+))?((?:Song\s+of\s+Solomon)|(?:[a-zA-Z]+))\.?\s+(\d+):(\d+(?:[-–—]\d+)?(?:\s*,\s*\d+(?:[-–—]\d+)?)*))|(?:\s*;\s*(\d+):(\d+(?:[-–—]\d+)?(?:\s*,\s*\d+(?:[-–—]\d+)?)*))/gi;

    let match: RegExpExecArray | null;
    let currentBook: string | null = null;

    while ((match = combinedPattern.exec(text)) !== null) {
        const fullMatchText = match[0];
        const matchIndex = match.index;

        if (match[3] !== undefined && match[4] !== undefined) {
            // Full reference
            const prefix = match[1];
            const bookName = match[2];
            const chapter = match[3];
            const verseSpec = match[4];

            let cleanBookName = bookName.trim().toLowerCase();
            if (prefix) {
                const cleanPrefix = prefix.trim().replace('I', '1').replace('II', '2').replace('III', '3');
                cleanBookName = `${cleanPrefix}${cleanBookName}`;
            }

            let fullBookName = BOOK_ABBREVIATIONS[cleanBookName];
            if (!fullBookName && prefix) {
                const cleanPrefix = prefix.trim().replace('I', '1').replace('II', '2').replace('III', '3');
                cleanBookName = `${cleanPrefix} ${bookName.trim().toLowerCase()}`;
                fullBookName = BOOK_ABBREVIATIONS[cleanBookName];
            }

            if (fullBookName) {
                currentBook = fullBookName;
                const segments = parseVerseSegments(verseSpec);
                results.push({
                    text: fullMatchText.trim(),
                    startIndex: matchIndex,
                    endIndex: matchIndex + fullMatchText.length,
                    ref: {
                        book: fullBookName,
                        chapter: parseInt(chapter, 10),
                        verse: segments[0].verse,
                        verseEnd: segments.length === 1 ? segments[0].verseEnd : null,
                        segments: segments,
                    },
                });
            } else {
                currentBook = null;
            }
        } else if (match[5] !== undefined && match[6] !== undefined && currentBook) {
            // Chained chapter continuation: ; 7:4
            const chapter = match[5];
            const verseSpec = match[6];
            const segments = parseVerseSegments(verseSpec);

            // Find start of the continuation digits (skip leading ; and whitespace)
            const digitsMatch = fullMatchText.match(/(\d+:[\d\s,–—-]+)/);
            const digitsText = digitsMatch ? digitsMatch[1].trim() : fullMatchText.trim();
            const offset = fullMatchText.indexOf(digitsText);

            results.push({
                text: digitsText,
                startIndex: matchIndex + offset,
                endIndex: matchIndex + offset + digitsText.length,
                ref: {
                    book: currentBook,
                    chapter: parseInt(chapter, 10),
                    verse: segments[0].verse,
                    verseEnd: segments.length === 1 ? segments[0].verseEnd : null,
                    segments: segments,
                },
            });
        }
    }

    return results;
};
