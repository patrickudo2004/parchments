import { db } from '../lib/db';
import type { BibleVerse } from '../types/database';

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
                // Determine if books is an array or an object
                const isArray = Array.isArray(data.books);
                const bookEntries = isArray ? data.books : Object.entries(data.books);

                let totalChapters = 0;
                if (isArray) {
                    data.books.forEach((b: any) => totalChapters += b.chapters.length);
                } else {
                    Object.values(data.books).forEach((b: any) => totalChapters += Object.keys(b.chapters).length);
                }

                let processedChapters = 0;

                for (const entry of bookEntries) {
                    let bookName = isArray ? (entry as any).name : (entry as any)[0];
                    const bookData = isArray ? (entry as any) : (entry as any)[1];

                    // Normalize book name (Roman numerals to Arabic)
                    if (bookName.startsWith('I ')) bookName = bookName.replace('I ', '1 ');
                    else if (bookName.startsWith('II ')) bookName = bookName.replace('II ', '2 ');
                    else if (bookName.startsWith('III ')) bookName = bookName.replace('III ', '3 ');

                    const chaptersArr = isArray ? bookData.chapters : Object.entries(bookData.chapters);

                    for (const chEntry of chaptersArr) {
                        const chapterNum = isArray ? (chaptersArr.indexOf(chEntry) + 1) : parseInt((chEntry as any)[0]);
                        const chapterData = isArray ? chEntry : (chEntry as any)[1];

                        // Hierarchical Object has a "verses" property inside chapter
                        const versesSource = isArray ? chapterData : (chapterData.verses ? Object.entries(chapterData.verses) : []);
                        
                        // If it's not a flat array of books/chapters, versesSource is an array of [verse, text] entries
                        const isEntryFormat = !isArray;

                        for (const vEntry of versesSource) {
                            const verseNum = isEntryFormat ? parseInt((vEntry as any)[0]) : (versesSource.indexOf(vEntry) + 1);
                            const text = isEntryFormat ? (vEntry as any)[1] : vEntry;

                            versesToInsert.push({
                                id: `${versionId}-${bookName}-${chapterNum}-${verseNum}`.toLowerCase(),
                                versionId,
                                book: bookName,
                                chapter: chapterNum,
                                verse: verseNum,
                                text,
                            });
                        }

                        processedChapters++;
                        if (processedChapters % 10 === 0) {
                            self.postMessage({
                                status: 'progress',
                                progress: (processedChapters / totalChapters) * 100,
                                message: `Processing ${bookName} ${chapterNum}...`
                            });
                        }
                    }
                }
            } else if (data.verses) {
                // Format 2: Flat { verses: [{ book_name, chapter, verse, text }] }
                const { verses } = data;
                const totalVerses = verses.length;
                let processedVerses = 0;

                for (const v of verses) {
                    // Normalize book name if needed (e.g. Roman numerals)
                    // For now assuming web.json has standard names like 'Genesis'
                    const bookName = v.book_name;

                    versesToInsert.push({
                        id: `${versionId}-${bookName}-${v.chapter}-${v.verse}`.toLowerCase(),
                        versionId,
                        book: bookName,
                        chapter: v.chapter,
                        verse: v.verse,
                        text: v.text,
                    });

                    processedVerses++;
                    if (processedVerses % 500 === 0) {
                        self.postMessage({
                            status: 'progress',
                            progress: (processedVerses / totalVerses) * 100,
                            message: `Processing ${bookName} ${v.chapter}:${v.verse}...`
                        });
                    }
                }
            } else {
                throw new Error('Unknown JSON format. Expected "books" or "verses" array.');
            }

            self.postMessage({ status: 'saving', message: 'Saving to database...' });

            // Bulk add to Dexie (Dexie works in Web Workers!)
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

            // Extract USFM 3-letter book ID from header (e.g. \id GEN World English Bible)
            const idMatch = content.match(/\\id\s+([A-Z0-9]{3})\b/i);
            const bookCode = idMatch ? idMatch[1].toUpperCase() : null;
            
            // Map to standard book name or fallback
            let bookName = versionId.toUpperCase();
            if (bookCode && USFM_BOOK_MAPPING[bookCode]) {
                bookName = USFM_BOOK_MAPPING[bookCode];
            } else if (bookCode) {
                // Capitalize code if mapping is missing
                bookName = bookCode.charAt(0) + bookCode.slice(1).toLowerCase();
            }

            // Basic USFM Regex for verses
            const verseRegex = /\\v\s+(\d+)\s+([^\\\n]+)/g;

            // Split into chapters
            const chapters = content.split(/\\c\s+/);

            for (let i = 1; i < chapters.length; i++) {
                const chapterContent = chapters[i];
                const chapterNum = parseInt(chapterContent.match(/^\d+/)?.[0] || '0');

                let verseMatch;
                while ((verseMatch = verseRegex.exec(chapterContent)) !== null) {
                    const verseNum = parseInt(verseMatch[1]);
                    let text = verseMatch[2].trim();

                    // Clean up common USFM formatting tags (e.g. paragraph \p, \wj ... \wj*, \add ... \add*, etc.)
                    // Strips tags like \add, \add*, \wj, \wj*, \p, \q, etc., leaving the text inside
                    text = text.replace(/\\[a-z]+(?:\*|\b)/gi, '').trim();

                    versesToInsert.push({
                        id: `${versionId}-${bookName}-${chapterNum}-${verseNum}`.toLowerCase(),
                        versionId,
                        book: bookName,
                        chapter: chapterNum,
                        verse: verseNum,
                        text,
                    });
                }
            }

            self.postMessage({ status: 'saving', message: `Saving ${versesToInsert.length} verses...` });
            await db.bibleVerses.bulkPut(versesToInsert);
            await db.bibleVersions.update(versionId, { isDownloaded: true });
            self.postMessage({ status: 'complete', message: 'USFM Import successful!' });

        } catch (error: any) {
            self.postMessage({ status: 'error', error: error.message });
        }
    }
});

export { };
