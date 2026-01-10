import { db } from '../db';
import type { BibleVersion, BibleVerse } from '@/types/database';

const KJV_URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json';

export class BibleIngestionService {
    static async fetchAndIngestKJV() {
        console.info('[BibleIngestion] Starting KJV ingestion...');

        try {
            const response = await fetch(KJV_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch KJV: ${response.statusText}`);
            }

            const data = await response.json();
            const versesToIngest: BibleVerse[] = [];

            // The JSON structure is: { translation: string, books: [ { name: string, chapters: [ { chapter: number, verses: [ { verse: number, text: string } ] } ] } ] }
            for (const book of data.books) {
                const bookName = book.name;
                for (const chapter of book.chapters) {
                    const chapterNumber = chapter.chapter;
                    for (const verse of chapter.verses) {
                        const verseNumber = verse.verse;
                        const text = verse.text;

                        versesToIngest.push({
                            id: `kjv-${bookName}-${chapterNumber}-${verseNumber}`,
                            versionId: 'kjv',
                            book: bookName,
                            chapter: chapterNumber,
                            verse: verseNumber,
                            text: text
                        });
                    }
                }
            }

            console.info(`[BibleIngestion] Parsing complete. Ingesting ${versesToIngest.length} verses...`);

            // Bulk add to IndexedDB
            await db.bibleVerses.bulkPut(versesToIngest);

            // Update version metadata
            const kjvMetadata: BibleVersion = {
                id: 'kjv',
                name: 'King James Version (1769)',
                abbreviation: 'KJV',
                language: 'eng',
                copyright: 'Public Domain',
                isDownloaded: true
            };

            await db.bibleVersions.put(kjvMetadata);

            console.info('[BibleIngestion] KJV ingestion completed successfully.');
            return true;
        } catch (error) {
            console.error('[BibleIngestion] Ingestion failed:', error);
            return false;
        }
    }

    static async isKJVDownloaded() {
        const kjv = await db.bibleVersions.get('kjv');
        return !!kjv?.isDownloaded;
    }
}
