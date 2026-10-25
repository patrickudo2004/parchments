import { db } from '@/lib/db';
import type { BibleVerse, StrongsEntry } from '@/types/database';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { parseScriptureReference, type BibleReference } from '@/lib/scriptureParser';

/**
 * Canonical 66-book Protestant / KJV Biblical Order (1 = Genesis ... 66 = Revelation)
 */
export const CANONICAL_BOOK_ORDER: Record<string, number> = Object.fromEntries(
    BIBLE_BOOKS.map((b, idx) => [b.name, idx + 1])
);

const BOOK_LOWER_TO_CANONICAL: Record<string, string> = Object.fromEntries(
    BIBLE_BOOKS.map((b) => [b.name.toLowerCase(), b.name])
);

export function getBookOrder(bookName: string): number {
    if (CANONICAL_BOOK_ORDER[bookName] !== undefined) {
        return CANONICAL_BOOK_ORDER[bookName];
    }
    const canonical = BOOK_LOWER_TO_CANONICAL[bookName?.toLowerCase?.() || ''];
    return canonical ? CANONICAL_BOOK_ORDER[canonical] : 999;
}

export function isOldTestamentBook(bookName: string): boolean {
    const order = getBookOrder(bookName);
    return order >= 1 && order <= 39;
}

export function isNewTestamentBook(bookName: string): boolean {
    const order = getBookOrder(bookName);
    return order >= 40 && order <= 66;
}

export function sortVersesCanonically<T extends { book: string; chapter: number; verse: number }>(verses: T[]): T[] {
    return verses.sort((a, b) => {
        const orderA = getBookOrder(a.book);
        const orderB = getBookOrder(b.book);
        if (orderA !== orderB) return orderA - orderB;
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.verse - b.verse;
    });
}

// Shared decrypted + canonically sorted cache across BibleSearchOverlay, CommandPalette, etc.
const canonicalVersesCache = new Map<string, BibleVerse[]>();
const inflightVersionLoads = new Map<string, Promise<BibleVerse[]>>();

// Cached Strong's Concordance map: normalized Strong's ID (e.g. "H3548", "G26") -> array of "Book|chapter|verse"
let hebrewConcordanceMap: Map<string, string[]> | null = null;
let greekConcordanceMap: Map<string, string[]> | null = null;
let hebrewConcordancePromise: Promise<Map<string, string[]>> | null = null;
let greekConcordancePromise: Promise<Map<string, string[]>> | null = null;

/**
 * Clears cached verses for a specific version (or all versions) when newly imported/re-seeded.
 */
export function invalidateBibleSearchCache(versionId?: string) {
    if (versionId) {
        const vid = versionId.toLowerCase();
        canonicalVersesCache.delete(vid);
        inflightVersionLoads.delete(vid);
    } else {
        canonicalVersesCache.clear();
        inflightVersionLoads.clear();
    }
}

/**
 * Loads, decrypts, and canonically sorts (Genesis 1:1 -> Revelation 22:21) all verses
 * for a translation. Guards against caching partial/empty results during first-run seeding.
 */
export async function getCanonicalVersionVerses(versionId: string): Promise<BibleVerse[]> {
    const vid = (versionId || 'kjv').toLowerCase();
    const cached = canonicalVersesCache.get(vid);

    if (cached && cached.length > 0) {
        // Verify DB didn't grow since initial boot ingestion
        const dbCount = await db.bibleVerses.where('versionId').equals(vid).count();
        if (dbCount === cached.length) {
            return cached;
        }
    }

    const existingPromise = inflightVersionLoads.get(vid);
    if (existingPromise) {
        return existingPromise;
    }

    const loadPromise = (async () => {
        try {
            const rawVerses = await db.bibleVerses
                .where('versionId')
                .equals(vid)
                .toArray();

            if (rawVerses.length === 0) {
                return [];
            }

            const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');
            const decrypted = await decryptVerses(rawVerses);
            const sorted = sortVersesCanonically(decrypted);

            // Only memoize non-empty datasets; if a background seed is mid-flight, count check above refreshes automatically
            canonicalVersesCache.set(vid, sorted);
            return sorted;
        } finally {
            inflightVersionLoads.delete(vid);
        }
    })();

    inflightVersionLoads.set(vid, loadPromise);
    return loadPromise;
}

function getInterlinearSlug(bookName: string): string {
    let slug = bookName.toLowerCase().replace(/ /g, '_');
    if (slug.startsWith('1_')) slug = slug.replace('1_', 'i_');
    else if (slug.startsWith('2_')) slug = slug.replace('2_', 'ii_');
    else if (slug.startsWith('3_')) slug = slug.replace('3_', 'iii_');
    return slug;
}

async function ensureTestamentConcordance(testament: 'ot' | 'nt'): Promise<Map<string, string[]>> {
    if (testament === 'ot' && hebrewConcordanceMap) return hebrewConcordanceMap;
    if (testament === 'nt' && greekConcordanceMap) return greekConcordanceMap;

    if (testament === 'ot' && hebrewConcordancePromise) return hebrewConcordancePromise;
    if (testament === 'nt' && greekConcordancePromise) return greekConcordancePromise;

    const buildPromise = (async () => {
        const map = new Map<string, string[]>();
        const targetBooks = BIBLE_BOOKS.filter((b) =>
            testament === 'ot' ? isOldTestamentBook(b.name) : isNewTestamentBook(b.name)
        );

        // Fast path 1: Check if KJV verses in DB already have interlinear populated for all books in this testament
        const kjvVerses = await getCanonicalVersionVerses('kjv');
        const testamentVerses = kjvVerses.filter((v) =>
            testament === 'ot' ? isOldTestamentBook(v.book) : isNewTestamentBook(v.book)
        );

        const booksWithInterlinear = new Set<string>();
        for (const v of testamentVerses) {
            if (v.interlinear && v.interlinear.length > 0) {
                booksWithInterlinear.add(v.book);
            }
        }

        if (booksWithInterlinear.size >= targetBooks.length && testamentVerses.length > 0) {
            for (const v of testamentVerses) {
                if (!v.interlinear) continue;
                const refKey = `${v.book}|${v.chapter}|${v.verse}`;
                const seenInVerse = new Set<string>();
                for (const word of v.interlinear) {
                    const num = word.number?.trim().toUpperCase();
                    if (!num || seenInVerse.has(num)) continue;
                    seenInVerse.add(num);
                    let list = map.get(num);
                    if (!list) {
                        list = [];
                        map.set(num, list);
                    }
                    list.push(refKey);
                }
            }
        } else {
            // Fast path 2: Load bundled /data/interlinear/<book>.json files directly in parallel batches
            // Guarantees Strong's Concordance works immediately on cold boot even before background DB interlinear ingestion finishes
            const BATCH_SIZE = 10;
            for (let i = 0; i < targetBooks.length; i += BATCH_SIZE) {
                const batch = targetBooks.slice(i, i + BATCH_SIZE);
                const batchData = await Promise.all(
                    batch.map(async (book) => {
                        try {
                            const slug = getInterlinearSlug(book.name);
                            const res = await fetch(`/data/interlinear/${slug}.json`);
                            if (!res.ok) return { book: book.name, data: null };
                            const json = await res.json();
                            return { book: book.name, data: json };
                        } catch {
                            return { book: book.name, data: null };
                        }
                    })
                );

                for (const { book, data } of batchData) {
                    if (!data || typeof data !== 'object') continue;
                    const chapterEntries = Object.entries(data).sort((a, b) => Number(a[0]) - Number(b[0]));
                    for (const [chapStr, chapObj] of chapterEntries) {
                        const chapNum = Number(chapStr);
                        if (!chapObj || typeof chapObj !== 'object') continue;
                        const verseEntries = Object.entries(chapObj as Record<string, any[]>).sort(
                            (a, b) => Number(a[0]) - Number(b[0])
                        );
                        for (const [verseStr, words] of verseEntries) {
                            const verseNum = Number(verseStr);
                            if (!Array.isArray(words)) continue;
                            const refKey = `${book}|${chapNum}|${verseNum}`;
                            const seenInVerse = new Set<string>();
                            for (const w of words) {
                                const num = w?.number?.trim?.().toUpperCase?.();
                                if (!num || seenInVerse.has(num)) continue;
                                seenInVerse.add(num);
                                let list = map.get(num);
                                if (!list) {
                                    list = [];
                                    map.set(num, list);
                                }
                                list.push(refKey);
                            }
                        }
                    }
                }
            }
        }

        if (testament === 'ot') {
            hebrewConcordanceMap = map;
            hebrewConcordancePromise = null;
        } else {
            greekConcordanceMap = map;
            greekConcordancePromise = null;
        }
        return map;
    })();

    if (testament === 'ot') hebrewConcordancePromise = buildPromise;
    else greekConcordancePromise = buildPromise;

    return buildPromise;
}

export interface BookMatchCount {
    book: string;
    count: number;
    testament: 'ot' | 'nt';
}

export interface BibleSearchOptions {
    query: string;
    versionId: string;
    wholeWord?: boolean;
    testament?: 'all' | 'ot' | 'nt';
    bookFilter?: string | null;
}

export interface BibleSearchResponse {
    mode: 'keyword' | 'phrase' | 'strongs' | 'reference' | 'empty';
    cleanQuery: string;
    results: BibleVerse[];
    totalCount: number;
    otCount: number;
    ntCount: number;
    bookCounts: BookMatchCount[];
    parsedReference: BibleReference | null;
    strongsEntry: StrongsEntry | null;
    highlightTerms: string[];
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips optional search scope prefixes (e.g. "bible:priest" -> "priest")
 */
export function normalizeBibleQueryInput(rawQuery: string): { cleanQuery: string; forcedBibleScope: boolean } {
    const trimmed = rawQuery.trim();
    if (/^bible:/i.test(trimmed)) {
        return {
            cleanQuery: trimmed.replace(/^bible:\s*/i, '').trim(),
            forcedBibleScope: true
        };
    }
    return { cleanQuery: trimmed, forcedBibleScope: false };
}

function computeStatsAndFilter(
    allMatches: BibleVerse[],
    testament: 'all' | 'ot' | 'nt' = 'all',
    bookFilter?: string | null
): {
    results: BibleVerse[];
    totalCount: number;
    otCount: number;
    ntCount: number;
    bookCounts: BookMatchCount[];
} {
    let otCount = 0;
    let ntCount = 0;
    const bookMap = new Map<string, number>();

    for (const v of allMatches) {
        if (isOldTestamentBook(v.book)) otCount++;
        else if (isNewTestamentBook(v.book)) ntCount++;
        bookMap.set(v.book, (bookMap.get(v.book) || 0) + 1);
    }

    const bookCounts: BookMatchCount[] = Array.from(bookMap.entries())
        .sort((a, b) => getBookOrder(a[0]) - getBookOrder(b[0]))
        .map(([book, count]) => ({
            book,
            count,
            testament: isOldTestamentBook(book) ? 'ot' : 'nt'
        }));

    let filtered = allMatches;
    if (testament === 'ot') {
        filtered = filtered.filter((v) => isOldTestamentBook(v.book));
    } else if (testament === 'nt') {
        filtered = filtered.filter((v) => isNewTestamentBook(v.book));
    }

    if (bookFilter) {
        filtered = filtered.filter((v) => v.book === bookFilter);
    }

    return {
        results: filtered,
        totalCount: allMatches.length,
        otCount,
        ntCount,
        bookCounts
    };
}

/**
 * Executes canonical Genesis -> Revelation Scripture search across:
 * 1. Strong's Concordance IDs (e.g. H3548, #G26)
 * 2. Scripture References (e.g. Genesis 14:18, Gen 14:18-20, Heb 7)
 * 3. Quoted Exact Phrases (e.g. "high priest")
 * 4. Single & Multi-Word Lexical Queries (e.g. priest, melchizedek priest) with optional Whole-Word boundary matching
 */
export async function searchBibleVerses(options: BibleSearchOptions): Promise<BibleSearchResponse> {
    const { cleanQuery } = normalizeBibleQueryInput(options.query);
    const versionId = (options.versionId || 'kjv').toLowerCase();
    const wholeWord = Boolean(options.wholeWord);
    const testament = options.testament || 'all';
    const bookFilter = options.bookFilter || null;

    if (!cleanQuery) {
        return {
            mode: 'empty',
            cleanQuery: '',
            results: [],
            totalCount: 0,
            otCount: 0,
            ntCount: 0,
            bookCounts: [],
            parsedReference: null,
            strongsEntry: null,
            highlightTerms: []
        };
    }

    // ── 1. Strong's Concordance ID Search (e.g. H3548, G26, #H3548) ──────────
    const cleanStrongsCandidate = cleanQuery.startsWith('#') ? cleanQuery.slice(1).trim() : cleanQuery;
    if (/^[HG]\d+$/i.test(cleanStrongsCandidate)) {
        const sId = cleanStrongsCandidate.toUpperCase();
        const isHebrew = sId.startsWith('H');
        const [strongsEntry, concordanceMap, targetVerses] = await Promise.all([
            db.strongsEntries.get(sId).then((r) => r || null).catch(() => null),
            ensureTestamentConcordance(isHebrew ? 'ot' : 'nt'),
            getCanonicalVersionVerses(versionId)
        ]);

        let activeLookupVerses = targetVerses;
        const hasTargetTestament = activeLookupVerses.some((v) =>
            isHebrew ? isOldTestamentBook(v.book) : isNewTestamentBook(v.book)
        );
        // Rule 1 Fallback: if active version lacks requested testament (e.g. Greek TR for H3548), fall back to KJV
        if (!hasTargetTestament && versionId !== 'kjv') {
            activeLookupVerses = await getCanonicalVersionVerses('kjv');
        }

        const verseByCoord = new Map<string, BibleVerse>();
        for (const v of activeLookupVerses) {
            verseByCoord.set(`${v.book}|${v.chapter}|${v.verse}`, v);
        }

        const refKeys = concordanceMap.get(sId) || [];
        const matchedVerses: BibleVerse[] = [];
        for (const key of refKeys) {
            const found = verseByCoord.get(key);
            if (found) matchedVerses.push(found);
        }

        sortVersesCanonically(matchedVerses);
        const stats = computeStatsAndFilter(matchedVerses, testament, bookFilter);

        return {
            mode: 'strongs',
            cleanQuery: sId,
            ...stats,
            parsedReference: null,
            strongsEntry,
            highlightTerms: []
        };
    }

    // ── 2. Direct Scripture Reference Lookup (e.g. "Genesis 14:18", "Gen 14:18-20", "Hebrews 7") ──
    const parsedRef = parseScriptureReference(cleanQuery);
    if (parsedRef) {
        let targetVerses = await getCanonicalVersionVerses(versionId);
        let bookChapVerses = targetVerses.filter(
            (v) => v.book === parsedRef.book && v.chapter === parsedRef.chapter
        );

        // Rule 1 Fallback to KJV if active translation lacks this book/testament
        if (bookChapVerses.length === 0 && versionId !== 'kjv') {
            targetVerses = await getCanonicalVersionVerses('kjv');
            bookChapVerses = targetVerses.filter(
                (v) => v.book === parsedRef.book && v.chapter === parsedRef.chapter
            );
        }

        let refMatches: BibleVerse[] = [];
        const isChapterOnly =
            !cleanQuery.includes(':') &&
            parsedRef.verse === 1 &&
            !parsedRef.verseEnd &&
            (!parsedRef.segments || parsedRef.segments.length <= 1);

        if (isChapterOnly) {
            refMatches = bookChapVerses;
        } else if (parsedRef.segments && parsedRef.segments.length > 0) {
            refMatches = bookChapVerses.filter((v) =>
                parsedRef.segments!.some((seg) =>
                    seg.verseEnd ? v.verse >= seg.verse && v.verse <= seg.verseEnd : v.verse === seg.verse
                )
            );
        } else if (parsedRef.verse !== null) {
            const endV = parsedRef.verseEnd || parsedRef.verse;
            refMatches = bookChapVerses.filter((v) => v.verse >= parsedRef.verse! && v.verse <= endV);
        }

        const stats = computeStatsAndFilter(refMatches, testament, bookFilter);
        return {
            mode: 'reference',
            cleanQuery,
            ...stats,
            parsedReference: parsedRef,
            strongsEntry: null,
            highlightTerms: []
        };
    }

    // ── 3. Quoted Exact Phrase or Single/Multi-Word Lexical Search ───────────
    let verses = await getCanonicalVersionVerses(versionId);
    if (verses.length === 0 && versionId !== 'kjv') {
        verses = await getCanonicalVersionVerses('kjv');
    }

    const isQuotedPhrase =
        (cleanQuery.startsWith('"') && cleanQuery.endsWith('"') && cleanQuery.length > 2) ||
        (cleanQuery.startsWith('\u201c') && cleanQuery.endsWith('\u201d') && cleanQuery.length > 2);

    const unquoted = isQuotedPhrase ? cleanQuery.slice(1, -1).trim() : cleanQuery;
    const lowerUnquoted = unquoted.toLowerCase();

    const terms = isQuotedPhrase
        ? [lowerUnquoted]
        : lowerUnquoted.split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
        return {
            mode: 'empty',
            cleanQuery,
            results: [],
            totalCount: 0,
            otCount: 0,
            ntCount: 0,
            bookCounts: [],
            parsedReference: null,
            strongsEntry: null,
            highlightTerms: []
        };
    }

    let allMatches: BibleVerse[];

    if (wholeWord) {
        const regexes = terms.map((t) => new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i'));
        allMatches = verses.filter((v) => regexes.every((rx) => rx.test(v.text)));
    } else if (terms.length === 1) {
        const needle = terms[0];
        allMatches = verses.filter((v) => v.text.toLowerCase().includes(needle));
    } else {
        allMatches = verses.filter((v) => {
            const lower = v.text.toLowerCase();
            return terms.every((t) => lower.includes(t));
        });
    }

    // Note: `verses` is already sorted canonically (Genesis 1:1 -> Revelation 22:21),
    // so `allMatches` is guaranteed to start at the earliest canonical Scripture!
    const stats = computeStatsAndFilter(allMatches, testament, bookFilter);

    return {
        mode: isQuotedPhrase ? 'phrase' : 'keyword',
        cleanQuery: unquoted,
        ...stats,
        parsedReference: null,
        strongsEntry: null,
        highlightTerms: terms
    };
}

/**
 * Splits verse text into highlighted vs plain segments for multi-token or whole-word queries.
 */
export function buildHighlightSegments(
    text: string,
    highlightTerms: string[],
    wholeWord = false
): { text: string; highlight: boolean }[] {
    if (!text) return [];
    const validTerms = highlightTerms.map((t) => t.trim()).filter(Boolean);
    if (validTerms.length === 0) {
        return [{ text, highlight: false }];
    }

    // Sort longest terms first so phrase/longer tokens win over sub-tokens
    const sortedTerms = [...validTerms].sort((a, b) => b.length - a.length);
    const patternBody = sortedTerms.map((t) => escapeRegExp(t)).join('|');
    const regex = wholeWord
        ? new RegExp(`(\\b(?:${patternBody})\\b)`, 'gi')
        : new RegExp(`(${patternBody})`, 'gi');

    const parts = text.split(regex);
    if (parts.length <= 1) {
        return [{ text, highlight: false }];
    }

    const lowerSet = new Set(sortedTerms.map((t) => t.toLowerCase()));
    return parts
        .filter((p) => p.length > 0)
        .map((part) => ({
            text: part,
            highlight: wholeWord
                ? lowerSet.has(part.toLowerCase())
                : sortedTerms.some((t) => part.toLowerCase() === t.toLowerCase())
        }));
}

let cachedAllStrongs: StrongsEntry[] | null = null;

/**
 * Searches Strong's Lexicon by Strong's ID (H3548, G26) OR English/transliterated/lemma keyword ("priest", "kohen", "agape").
 */
export async function searchStrongsLexicon(query: string, limit = 25): Promise<StrongsEntry[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cleanId = trimmed.startsWith('#') ? trimmed.slice(1).trim().toUpperCase() : trimmed.toUpperCase();
    if (/^[HG]\d+$/i.test(cleanId)) {
        const direct = await db.strongsEntries.get(cleanId);
        return direct ? [direct] : [];
    }

    if (!cachedAllStrongs || cachedAllStrongs.length === 0) {
        const all = await db.strongsEntries.toArray();
        if (all.length > 0) {
            cachedAllStrongs = all;
        } else {
            return [];
        }
    }

    const lower = trimmed.toLowerCase();
    const wordRx = new RegExp(`\\b${escapeRegExp(lower)}\\b`, 'i');
    const scored: { entry: StrongsEntry; score: number }[] = [];

    for (const entry of cachedAllStrongs) {
        const xlit = (entry.xlit || '').toLowerCase();
        const lemma = (entry.lemma || '').toLowerCase();
        const kjvDef = (entry.kjv_def || '').toLowerCase();
        const strongsDef = (entry.strongs_def || '').toLowerCase();

        let score = 0;
        if (lemma === lower || xlit === lower) score += 120;
        else if (xlit.startsWith(lower)) score += 80;

        if (wordRx.test(kjvDef)) score += 100;
        else if (kjvDef.includes(lower)) score += 50;

        if (wordRx.test(strongsDef)) score += 40;
        else if (strongsDef.includes(lower)) score += 15;

        if (score > 0) {
            // Slight boost for primary root entries (shorter kjv_def where the keyword is a primary gloss)
            if (wordRx.test(kjvDef) && kjvDef.length < 120) score += 15;
            scored.push({ entry, score });
        }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.entry);
}
