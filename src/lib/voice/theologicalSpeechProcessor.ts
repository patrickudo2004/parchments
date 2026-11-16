/**
 * theologicalSpeechProcessor.ts
 * Real-time offline speech post-processor for Parchments.
 * Normalizes theological terminology, biblical proper nouns, and spoken Scripture citations
 * into clean, canonical Bible references and theological phrasing.
 */

import { BIBLE_BOOKS } from '../bible/BibleData';

const NUMBER_WORDS: Record<string, number> = {
    zero: 0,
    one: 1,
    first: 1,
    '1st': 1,
    two: 2,
    second: 2,
    '2nd': 2,
    three: 3,
    third: 3,
    '3rd': 3,
    four: 4,
    fourth: 4,
    five: 5,
    fifth: 5,
    six: 6,
    sixth: 6,
    seven: 7,
    seventh: 7,
    eight: 8,
    eighth: 8,
    nine: 9,
    ninth: 9,
    ten: 10,
    tenth: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
    hundred: 100,
};

function parseWordNumber(str: string): number | null {
    const s = str.trim().toLowerCase();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (NUMBER_WORDS[s] !== undefined) return NUMBER_WORDS[s];

    // Compound numbers e.g. "twenty-one" or "twenty one"
    const parts = s.split(/[\s-]+/);
    if (parts.length === 2 && NUMBER_WORDS[parts[0]] !== undefined && NUMBER_WORDS[parts[1]] !== undefined) {
        return NUMBER_WORDS[parts[0]] + NUMBER_WORDS[parts[1]];
    }
    return null;
}

// Canonical theological terms and phonetic mishearings
const THEOLOGICAL_DICTIONARY: [RegExp, string][] = [
    // Proper Biblical Names & Melchizedek
    [/\b(?:milk\s+is\s+a\s+deck|melchisedec|melchisedek|melchizedech)\b/gi, 'Melchizedek'],
    [/\b(?:have\s+a\s+cook|habba\s+cook|habbakuk)\b/gi, 'Habakkuk'],
    [/\b(?:pro\s*appreciation|propiation|propitiater)\b/gi, 'propitiation'],
    [/\b(?:the\s+saloonians|the\s+salonians|thessalonians)\b/gi, 'Thessalonians'],
    [/\b(?:colisions|colissions)\b/gi, 'Colossians'],
    [/\b(?:eclesiastes|eclesiates)\b/gi, 'Ecclesiastes'],
    [/\b(?:deuteronomy)\b/gi, 'Deuteronomy'],
    [/\b(?:philippians)\b/gi, 'Philippians'],
    [/\b(?:galatians)\b/gi, 'Galatians'],
    [/\b(?:ephesians)\b/gi, 'Ephesians'],
    [/\b(?:corinthians)\b/gi, 'Corinthians'],
    [/\b(?:nehemiah)\b/gi, 'Nehemiah'],
    [/\b(?:zephaniah)\b/gi, 'Zephaniah'],
    [/\b(?:zechariah|zachariah)\b/gi, 'Zechariah'],
    [/\b(?:malachi)\b/gi, 'Malachi'],

    // Hebrew & Greek Concepts
    [/\b(?:yah\s*way|yahweh)\b/gi, 'Yahweh'],
    [/\b(?:ye\s*shua|yeshua)\b/gi, 'Yeshua'],
    [/\b(?:shekinah|shechinah)\b/gi, 'Shekinah'],
    [/\b(?:ruach(?:\s+ha\s+kodesh)?)\b/gi, 'Ruach'],
    [/\b(?:koinonia)\b/gi, 'koinonia'],
    [/\b(?:ekklesia|ecclesia)\b/gi, 'ecclesia'],
    [/\b(?:agape)\b/gi, 'agape'],
    [/\b(?:septuagent|septuagint)\b/gi, 'Septuagint'],
    [/\b(?:pentateuch)\b/gi, 'Pentateuch'],

    // Theological Doctrines
    [/\b(?:escatology)\b/gi, 'eschatology'],
    [/\b(?:soteriology)\b/gi, 'soteriology'],
    [/\b(?:hermeneutic)\b/gi, 'hermeneutics'],
    [/\b(?:homiletic)\b/gi, 'homiletics'],
    [/\b(?:exegesis|exegete)\b/gi, 'exegesis'],
    [/\b(?:justification)\b/gi, 'justification'],
    [/\b(?:sanctification)\b/gi, 'sanctification'],
    [/\b(?:hypostatic\s+union)\b/gi, 'hypostatic union'],
];

// Build regex pattern of Bible books for reference parsing
const BOOK_NAMES = BIBLE_BOOKS.map(b => b.name);
const BOOK_PATTERN = BOOK_NAMES.map(name => {
    // Escape dots and handle numbered books like "1 John" or "First John"
    if (/^[123]\s+/.test(name)) {
        const num = name[0];
        const rest = name.slice(2);
        const ordinal = num === '1' ? '(?:1|1st|First)' : num === '2' ? '(?:2|2nd|Second)' : '(?:3|3rd|Third)';
        return `${ordinal}\\s+${rest}`;
    }
    return name;
}).join('|');

const SCRIPTURE_SPEECH_REGEX = new RegExp(
    `\\b(${BOOK_PATTERN})\\s+(?:chapter\\s+)?([a-z0-9-]+)(?:\\s*(?:verses?|v\\.?|:)\\s*([a-z0-9-]+)(?:\\s*(?:to|through|-)\\s*([a-z0-9-]+))?)?`,
    'gi'
);

export class TheologicalSpeechProcessor {
    /**
     * Canonical book name resolver (e.g. "First John" -> "1 John", "2nd Cor" -> "2 Corinthians")
     */
    static canonicalizeBook(spokenBook: string): string {
        const trimmed = spokenBook.trim();
        const replaced = trimmed
            .replace(/^(?:1st|first)\s+/i, '1 ')
            .replace(/^(?:2nd|second)\s+/i, '2 ')
            .replace(/^(?:3rd|third)\s+/i, '3 ');

        const match = BIBLE_BOOKS.find(b => b.name.toLowerCase() === replaced.toLowerCase());
        return match ? match.name : replaced;
    }

    /**
     * Normalizes spoken Scripture citations e.g.:
     * - "John chapter 3 verse 16" -> "John 3:16"
     * - "1st Corinthians chapter 13 verse 4 to 8" -> "1 Corinthians 13:4-8"
     * - "Romans 8 28" -> "Romans 8:28"
     * - "Genesis chapter 1" -> "Genesis 1"
     */
    static normalizeScriptureReferences(text: string): string {
        return text.replace(SCRIPTURE_SPEECH_REGEX, (match, book, chRaw, vStartRaw, vEndRaw) => {
            const canonicalBook = this.canonicalizeBook(book);
            const chapter = parseWordNumber(chRaw);

            // If chapter failed to parse, leave original text
            if (chapter === null || chapter <= 0) return match;

            if (!vStartRaw) {
                // If it was just "Genesis chapter 1" or "Genesis 1"
                if (/chapter/i.test(match)) {
                    return `${canonicalBook} ${chapter}`;
                }
                return match;
            }

            const verseStart = parseWordNumber(vStartRaw);
            if (verseStart === null || verseStart <= 0) return match;

            if (vEndRaw) {
                const verseEnd = parseWordNumber(vEndRaw);
                if (verseEnd !== null && verseEnd >= verseStart) {
                    return `${canonicalBook} ${chapter}:${verseStart}-${verseEnd}`;
                }
            }

            return `${canonicalBook} ${chapter}:${verseStart}`;
        });
    }

    /**
     * Corrects common theological terms, biblical names, and proper nouns.
     */
    static normalizeTheologicalTerms(text: string): string {
        let result = text;
        for (const [pattern, replacement] of THEOLOGICAL_DICTIONARY) {
            result = result.replace(pattern, replacement);
        }
        return result;
    }

    /**
     * Deduplicates overlapping words between streaming audio chunks.
     * Prevents stuttering when Whisper window boundaries overlap.
     */
    static deduplicateOverlap(previousText: string, newChunk: string): string {
        if (!previousText || !newChunk) return newChunk.trim();

        const prevWords = previousText.trim().split(/\s+/);
        const newWords = newChunk.trim().split(/\s+/);

        if (prevWords.length === 0 || newWords.length === 0) return newChunk.trim();

        // Check overlaps from 5 words down to 1
        const maxCheck = Math.min(5, prevWords.length, newWords.length);
        for (let len = maxCheck; len >= 1; len--) {
            const prevSlice = prevWords.slice(-len).join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
            const newSlice = newWords.slice(0, len).join(' ').toLowerCase().replace(/[.,!?;:]/g, '');

            if (prevSlice === newSlice) {
                return newWords.slice(len).join(' ').trim();
            }
        }

        return newChunk.trim();
    }

    /**
     * Master pipeline: deduplicates overlap, normalizes theology and Scripture citations.
     */
    static processTranscript(newChunk: string, previousText: string = ''): string {
        if (!newChunk || !newChunk.trim()) return '';

        // 1. Deduplicate overlap with prior stream text
        let processed = this.deduplicateOverlap(previousText, newChunk);
        if (!processed) return '';

        // 2. Normalize theological terms and names
        processed = this.normalizeTheologicalTerms(processed);

        // 3. Normalize Scripture citations
        processed = this.normalizeScriptureReferences(processed);

        return processed;
    }
}
