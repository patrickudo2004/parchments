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
                // Format 1: Nested { books: [{ name, chapters: [...] }] }
                const { books } = data;
                let totalChapters = 0;
                books.forEach((b: any) => totalChapters += b.chapters.length);
                let processedChapters = 0;

                for (const bookData of books) {
                    const bookName = bookData.name;
                    for (let cIdx = 0; cIdx < bookData.chapters.length; cIdx++) {
                        const chapterNum = cIdx + 1;
                        const verses = bookData.chapters[cIdx];
                        for (let vIdx = 0; vIdx < verses.length; vIdx++) {
                            const verseNum = vIdx + 1;
                            const text = verses[vIdx];
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
