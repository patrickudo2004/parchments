import { db, dbHelpers } from '@/lib/db';
import type { TSKEntry, TSKReferenceItem, CommentaryEntry, DictionaryEntry, TopicalEntry } from '@/types/database';

const BOOK_TO_CODE: Record<string, string> = {
    'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
    'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
    '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
    'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA',
    'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG',
    'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN',
    'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
    'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG',
    'Zechariah': 'ZEC', 'Malachi': 'MAL',
    'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
    'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL',
    'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH',
    '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT',
    'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
    '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
};

class ReferenceDataServiceClass {
    // Check installation states
    async isTSKInstalled(): Promise<boolean> {
        const count = await db.tskRefs.count();
        return count > 0;
    }

    async isDictionaryInstalled(): Promise<boolean> {
        const count = await db.dictionary.count();
        return count > 0;
    }

    async isTopicalInstalled(): Promise<boolean> {
        const count = await db.topicalIndex.count();
        return count > 0;
    }

    // Install TSK Cross-References
    async installTSK(onProgress?: (progress: number, message: string) => void): Promise<boolean> {
        try {
            onProgress?.(10, 'Loading TSK cross-reference data...');
            const res = await fetch('/data/references/tsk/tsk.json');
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching TSK`);

            const rawMap: Record<string, TSKReferenceItem[]> = await res.json();
            const entries: TSKEntry[] = Object.entries(rawMap).map(([verseId, refs]) => ({
                verseId,
                refs
            }));

            onProgress?.(50, `Indexing ${entries.length} verse reference sets...`);
            await db.tskRefs.bulkPut(entries);
            onProgress?.(100, 'TSK Cross-References installed successfully!');
            return true;
        } catch (err: any) {
            console.error('[ReferenceDataService] TSK install failed:', err);
            throw err;
        }
    }

    // Install Easton's Bible Dictionary
    async installDictionary(onProgress?: (progress: number, message: string) => void): Promise<boolean> {
        try {
            onProgress?.(10, 'Loading Easton\'s Bible Dictionary...');
            const res = await fetch('/data/references/dictionary/easton.json');
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching Dictionary`);

            const entries: DictionaryEntry[] = await res.json();
            onProgress?.(50, `Indexing ${entries.length} dictionary definitions...`);
            await db.dictionary.bulkPut(entries);
            onProgress?.(100, 'Easton\'s Bible Dictionary installed successfully!');
            return true;
        } catch (err: any) {
            console.error('[ReferenceDataService] Dictionary install failed:', err);
            throw err;
        }
    }

    // Install Nave's Topical Bible
    async installTopical(onProgress?: (progress: number, message: string) => void): Promise<boolean> {
        try {
            onProgress?.(10, 'Loading Nave\'s Topical Bible...');
            const res = await fetch('/data/references/topical/naves.json');
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching Topical Index`);

            const entries: TopicalEntry[] = await res.json();
            onProgress?.(50, `Indexing ${entries.length} biblical topics...`);
            await db.topicalIndex.bulkPut(entries);
            onProgress?.(100, 'Nave\'s Topical Bible installed successfully!');
            return true;
        } catch (err: any) {
            console.error('[ReferenceDataService] Topical install failed:', err);
            throw err;
        }
    }

    // Queries
    async getTSKRefs(verseId: string): Promise<TSKReferenceItem[]> {
        return await dbHelpers.getTSKRefs(verseId);
    }

    async getDictionaryEntry(term: string): Promise<DictionaryEntry | null> {
        const entry = await dbHelpers.getDictionaryEntry(term);
        return entry || null;
    }

    async searchDictionary(query: string, limit = 25): Promise<DictionaryEntry[]> {
        return await dbHelpers.searchDictionary(query, limit);
    }

    async searchTopical(query: string, limit = 30): Promise<TopicalEntry[]> {
        return await dbHelpers.searchTopicalIndex(query, limit);
    }

    // Commentary Fetcher (Offline-First Cache)
    async getCommentaryForChapter(source: 'mh' | 'jfb', book: string, chapter: number): Promise<CommentaryEntry[]> {
        // 1. Check local Dexie cache
        const local = await dbHelpers.getCommentaries(book, chapter, source);
        if (local && local.length > 0) {
            return local;
        }

        // 2. Fetch from HelloAO Commentary API & cache locally
        const bookCode = BOOK_TO_CODE[book] || book.toUpperCase().slice(0, 3);
        const providerWorkId = source === 'mh' ? 'matthew-henry' : 'jamieson-fausset-brown';
        const sourceName = source === 'mh' ? 'Matthew Henry' : 'Jamieson-Fausset-Brown';

        try {
            const url = `https://bible.helloao.org/api/c/${providerWorkId}/${bookCode}/${chapter}.json`;
            const res = await fetch(url);
            if (!res.ok) {
                return [];
            }

            const data = await res.json();
            const entriesToSave: CommentaryEntry[] = [];

            if (data.chapter && data.chapter.content) {
                const contentItems = data.chapter.content;

                for (let idx = 0; idx < contentItems.length; idx++) {
                    const item = contentItems[idx];
                    let text = '';
                    let title = '';
                    let verseNum: number | null = null;

                    if (typeof item === 'string') {
                        text = item;
                    } else if (item.text) {
                        text = item.text;
                        title = item.title || '';
                        verseNum = item.verse || item.number || null;
                    } else if (item.content) {
                        text = Array.isArray(item.content) ? item.content.join(' ') : String(item.content);
                        title = item.heading || item.title || '';
                        verseNum = item.verseNumber || item.verse || item.number || null;
                    }

                    if (text && text.trim()) {
                        entriesToSave.push({
                            id: `${source}-${book}-${chapter}-${idx}`.toLowerCase(),
                            source,
                            sourceName,
                            book,
                            chapter,
                            verse: verseNum,
                            title,
                            text: text.trim()
                        });
                    }
                }
            }

            if (entriesToSave.length > 0) {
                await db.commentaries.bulkPut(entriesToSave);
            }

            return entriesToSave;
        } catch (err) {
            console.warn(`[ReferenceDataService] Failed to fetch commentary for ${book} ${chapter}:`, err);
            return [];
        }
    }
}

export const referenceDataService = new ReferenceDataServiceClass();
