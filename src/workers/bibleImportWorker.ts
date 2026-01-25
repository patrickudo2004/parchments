import { db } from '../lib/db';
import type { BibleVerse } from '../types/database';

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
                        const isVerseArray = Array.isArray(versesSource);

                        for (const vEntry of versesSource) {
                            const verseNum = isVerseArray ? (versesSource.indexOf(vEntry) + 1) : parseInt((vEntry as any)[0]);
                            const text = isVerseArray ? vEntry : (vEntry as any)[1];

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

            // Basic USFM Regex
            const verseRegex = /\\v\s+(\d+)\s+([^\\\n]+)/g;

            // Split into chapters
            const chapters = content.split(/\\c\s+/);
            const bookName = versionId.toUpperCase(); // Fallback if \id not parsed comfortably

            for (let i = 1; i < chapters.length; i++) {
                const chapterContent = chapters[i];
                const chapterNum = parseInt(chapterContent.match(/^\d+/)?.[0] || '0');

                let verseMatch;
                while ((verseMatch = verseRegex.exec(chapterContent)) !== null) {
                    const verseNum = parseInt(verseMatch[1]);
                    const text = verseMatch[2].trim();

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
