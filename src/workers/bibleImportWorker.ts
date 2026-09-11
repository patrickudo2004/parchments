import { db } from '../lib/db';
import type { BibleVerse } from '../types/database';
import { encryptVerseText } from '../lib/bible/bibleCryptoService';

const USFM_BOOK_MAPPING: Record<string, string> = {
    'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
    'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
    '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
    'EZR': 'Ezra', 'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms',
    'PRO': 'Proverbs', 'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'SOL': 'Song of Solomon',
    'ISA': 'Isaiah', 'JER': 'Jeremiah', 'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel',
    'HOS': 'Hosea', 'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
    'MIC': 'Micah', 'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai',
    'ZEC': 'Zechariah', 'MAL': 'Malachi',
    'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'ACT': 'Acts',
    'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians',
    'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians', '1TH': '1 Thessalonians',
    '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy', 'TIT': 'Titus',
    'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James', '1PE': '1 Peter', '2PE': '2 Peter',
    '1JN': '1 John', '2JN': '2 John', '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
};

console.info('[BibleWorker] Bible import worker script loaded.');

self.addEventListener('message', async (event) => {
    const { type, data, versionId } = event.data;

    if (type === 'IMPORT_JSON') {
        try {
            self.postMessage({ status: 'processing', message: 'Starting import...' });

            const versesToInsert: BibleVerse[] = [];

            if (data.books) {
                const isArray = Array.isArray(data.books);
                const bookEntries = isArray ? data.books : Object.entries(data.books);
                let totalChapters = 0;
                for (const entry of bookEntries) {
                    const bData = isArray ? entry : (entry as any)[1];
                    if (bData?.chapters) {
                        totalChapters += Array.isArray(bData.chapters) ? bData.chapters.length : Object.keys(bData.chapters).length;
                    }
                }
                if (totalChapters === 0) totalChapters = 100;

                let processedChapters = 0;

                for (const entry of bookEntries) {
                    const rawBookName = isArray ? (entry as any).name : (entry as any)[0];
                    const bookId = isArray ? ((entry as any).id || (entry as any).bookId) : null;
                    let bookName = rawBookName || '';

                    if (bookId && USFM_BOOK_MAPPING[String(bookId).toUpperCase()]) {
                        bookName = USFM_BOOK_MAPPING[String(bookId).toUpperCase()];
                    } else if (USFM_BOOK_MAPPING[bookName.toUpperCase()]) {
                        bookName = USFM_BOOK_MAPPING[bookName.toUpperCase()];
                    } else if (bookName.startsWith('I ')) {
                        bookName = bookName.replace('I ', '1 ');
                    } else if (bookName.startsWith('II ')) {
                        bookName = bookName.replace('II ', '2 ');
                    } else if (bookName.startsWith('III ')) {
                        bookName = bookName.replace('III ', '3 ');
                    }

                    const bookData = isArray ? entry : (entry as any)[1];
                    const chaptersObj = bookData?.chapters;
                    if (!chaptersObj) continue;

                    const isChArray = Array.isArray(chaptersObj);
                    const chaptersArr = isChArray ? chaptersObj : Object.entries(chaptersObj);

                    for (const chEntry of chaptersArr) {
                        let chapterNum = 0;
                        let versesObj: any = null;

                        if (isChArray) {
                            if (chEntry.chapter && typeof chEntry.chapter === 'object') {
                                // HelloAO format
                                chapterNum = chEntry.chapter.number || (chaptersArr.indexOf(chEntry) + 1);
                                versesObj = chEntry.chapter.content || [];
                            } else {
                                // Scrollmapper format
                                chapterNum = chEntry.chapter !== undefined ? chEntry.chapter : (chaptersArr.indexOf(chEntry) + 1);
                                versesObj = chEntry.verses || chEntry;
                            }
                        } else {
                            // Object format (KJV.json)
                            chapterNum = parseInt((chEntry as any)[0]);
                            const cVal = (chEntry as any)[1];
                            versesObj = cVal?.verses ? cVal.verses : cVal;
                        }

                        if (!versesObj) continue;

                        if (Array.isArray(versesObj)) {
                            for (const v of versesObj) {
                                if (v.type === 'verse') {
                                    const verseNum = v.number;
                                    const text = v.text || (Array.isArray(v.content) ? v.content.join(' ') : String(v.content || ''));
                                    if (text && text.trim()) {
                                        const encrypted = await encryptVerseText(text);
                                        versesToInsert.push({
                                            id: `${versionId}-${bookName}-${chapterNum}-${verseNum}`.toLowerCase(),
                                            versionId,
                                            book: bookName,
                                            chapter: chapterNum,
                                            verse: verseNum,
                                            text: encrypted,
                                        });
                                    }
                                } else if (v.verse !== undefined) {
                                    if (v.text && v.text.trim()) {
                                        const encrypted = await encryptVerseText(v.text);
                                        versesToInsert.push({
                                            id: `${versionId}-${bookName}-${chapterNum}-${v.verse}`.toLowerCase(),
                                            versionId,
                                            book: bookName,
                                            chapter: chapterNum,
                                            verse: v.verse,
                                            text: encrypted,
                                        });
                                    }
                                }
                            }
                        } else if (typeof versesObj === 'object') {
                            for (const [vNumStr, vText] of Object.entries(versesObj)) {
                                const verseNum = parseInt(vNumStr);
                                const text = typeof vText === 'string' ? vText : (vText as any)?.text || '';
                                if (text && text.trim()) {
                                    const encrypted = await encryptVerseText(text);
                                    versesToInsert.push({
                                        id: `${versionId}-${bookName}-${chapterNum}-${verseNum}`.toLowerCase(),
                                        versionId,
                                        book: bookName,
                                        chapter: chapterNum,
                                        verse: verseNum,
                                        text: encrypted,
                                    });
                                }
                            }
                        }

                        processedChapters++;
                        if (processedChapters % 15 === 0) {
                            self.postMessage({
                                status: 'progress',
                                progress: Math.min(95, Math.round((processedChapters / totalChapters) * 100)),
                                message: `Processing ${bookName} ${chapterNum}...`
                            });
                        }
                    }
                }
            } else if (data.verses) {
                const { verses } = data;
                const totalVerses = verses.length;
                let processedVerses = 0;

                for (const v of verses) {
                    const rawBook = v.book_name || v.book || '';
                    const bookName = USFM_BOOK_MAPPING[rawBook.toUpperCase()] || rawBook;
                    if (v.text && v.text.trim()) {
                        const encrypted = await encryptVerseText(v.text);
                        versesToInsert.push({
                            id: `${versionId}-${bookName}-${v.chapter}-${v.verse}`.toLowerCase(),
                            versionId,
                            book: bookName,
                            chapter: v.chapter,
                            verse: v.verse,
                            text: encrypted,
                        });
                    }

                    processedVerses++;
                    if (processedVerses % 500 === 0) {
                        self.postMessage({
                            status: 'progress',
                            progress: Math.min(95, Math.round((processedVerses / totalVerses) * 100)),
                            message: `Processing ${bookName} ${v.chapter}:${v.verse}...`
                        });
                    }
                }
            } else {
                throw new Error('Unknown JSON format. Expected "books" or "verses" array.');
            }

            self.postMessage({ status: 'saving', message: `Encrypting & saving ${versesToInsert.length} verses...` });

            // Bulk add to Dexie
            await db.bibleVerses.bulkPut(versesToInsert);

            // Mark version as downloaded
            await db.bibleVersions.update(versionId, { isDownloaded: true });

            self.postMessage({ status: 'complete', message: 'Import successful!' });
        } catch (error: any) {
            console.error('[BibleWorker] Import error:', error);
            self.postMessage({ status: 'error', error: error.message });
        }
    }

    if (type === 'IMPORT_USFM') {
        try {
            self.postMessage({ status: 'processing', message: 'Parsing USFM...' });
            const content = data as string;
            const versesToInsert: BibleVerse[] = [];

            const idMatch = content.match(/\\id\s+([A-Z0-9]{3})\b/i);
            const bookCode = idMatch ? idMatch[1].toUpperCase() : null;

            let bookName = versionId.toUpperCase();
            if (bookCode && USFM_BOOK_MAPPING[bookCode]) {
                bookName = USFM_BOOK_MAPPING[bookCode];
            } else if (bookCode) {
                bookName = bookCode.charAt(0) + bookCode.slice(1).toLowerCase();
            }

            const verseRegex = /\\v\s+(\d+)\s+([^\\\n]+)/g;
            const chapters = content.split(/\\c\s+/);

            for (let i = 1; i < chapters.length; i++) {
                const chapterContent = chapters[i];
                const chapterNum = parseInt(chapterContent.match(/^\d+/)?.[0] || '0');

                let verseMatch;
                while ((verseMatch = verseRegex.exec(chapterContent)) !== null) {
                    const verseNum = parseInt(verseMatch[1]);
                    let text = verseMatch[2].trim();
                    text = text.replace(/\\[a-z]+(?:\*|\b)/gi, '').trim();

                    const encrypted = await encryptVerseText(text);

                    versesToInsert.push({
                        id: `${versionId}-${bookName}-${chapterNum}-${verseNum}`.toLowerCase(),
                        versionId,
                        book: bookName,
                        chapter: chapterNum,
                        verse: verseNum,
                        text: encrypted,
                    });
                }
            }

            self.postMessage({ status: 'saving', message: `Encrypting & saving ${versesToInsert.length} verses...` });
            await db.bibleVerses.bulkPut(versesToInsert);
            await db.bibleVersions.update(versionId, { isDownloaded: true });
            self.postMessage({ status: 'complete', message: 'USFM Import successful!' });

        } catch (error: any) {
            self.postMessage({ status: 'error', error: error.message });
        }
    }
});

export { };
