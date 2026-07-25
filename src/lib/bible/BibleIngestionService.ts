import { db } from '../db';
import type { BibleVersion, BibleVerse, StrongsEntry, InterlinearWord } from '@/types/database';
import { encryptVerseText } from './bibleCryptoService';

const KJV_URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json';

export class BibleIngestionService {
    static async fetchAndIngestKJV() {
        console.info('[BibleIngestion] Starting encrypted KJV ingestion...');

        try {
            const response = await fetch(KJV_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch KJV: ${response.statusText}`);
            }

            const data = await response.json();
            const versesToIngest: BibleVerse[] = [];

            for (const book of data.books) {
                let bookName = book.name;

                if (bookName.startsWith('I ')) bookName = bookName.replace('I ', '1 ');
                else if (bookName.startsWith('II ')) bookName = bookName.replace('II ', '2 ');
                else if (bookName.startsWith('III ')) bookName = bookName.replace('III ', '3 ');

                for (const chapter of book.chapters) {
                    const chapterNumber = chapter.chapter;
                    for (const verse of chapter.verses) {
                        const verseNumber = verse.verse;
                        const text = verse.text;

                        const encryptedText = await encryptVerseText(text);

                        versesToIngest.push({
                            id: `kjv-${bookName}-${chapterNumber}-${verseNumber}`.toLowerCase(),
                            versionId: 'kjv',
                            book: bookName,
                            chapter: chapterNumber,
                            verse: verseNumber,
                            text: encryptedText
                        });
                    }
                }
            }

            console.info(`[BibleIngestion] Parsing complete. Encrypting & Ingesting ${versesToIngest.length} verses...`);

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

    static async ingestStrongs() {
        console.info('[BibleIngestion] Starting Strongs Lexicon ingestion...');
        try {
            // 1. Hebrew
            const hRes = await fetch('/data/strongs/hebrew.json');
            const hData = await hRes.json();
            const hEntries: StrongsEntry[] = Object.entries(hData).map(([id, data]: [string, any]) => ({
                id,
                lemma: data.lemma,
                xlit: data.xlit,
                pron: data.pron,
                derivation: data.derivation,
                strongs_def: data.strongs_def,
                kjv_def: data.kjv_def,
            }));
            await db.strongsEntries.bulkPut(hEntries);
            console.info(`[BibleIngestion] Ingested ${hEntries.length} Hebrew Strongs entries.`);

            // 2. Greek
            const gRes = await fetch('/data/strongs/greek.json');
            const gData = await gRes.json();
            const gEntries: StrongsEntry[] = Object.entries(gData).map(([id, data]: [string, any]) => ({
                id,
                lemma: data.lemma,
                xlit: data.xlit || data.translit,
                pron: data.pron,
                derivation: data.derivation,
                strongs_def: data.strongs_def,
                kjv_def: data.kjv_def,
            }));
            await db.strongsEntries.bulkPut(gEntries);
            console.info(`[BibleIngestion] Ingested ${gEntries.length} Greek Strongs entries.`);

            return true;
        } catch (error) {
            console.error('[BibleIngestion] Strongs ingestion failed:', error);
            return false;
        }
    }

    static async ingestInterlinear() {
        console.info('[BibleIngestion] Starting Interlinear data ingestion (KJV mapping)...');
        try {
            const { BIBLE_BOOKS } = await import('./BibleData');

            for (const book of BIBLE_BOOKS) {
                let bookSlug = book.name.toLowerCase().replace(/ /g, '_');
                if (bookSlug.startsWith('1_')) bookSlug = bookSlug.replace('1_', 'i_');
                else if (bookSlug.startsWith('2_')) bookSlug = bookSlug.replace('2_', 'ii_');
                else if (bookSlug.startsWith('3_')) bookSlug = bookSlug.replace('3_', 'iii_');

                const res = await fetch(`/data/interlinear/${bookSlug}.json`);
                if (!res.ok) {
                    console.warn(`[BibleIngestion] Skipping ${book.name}, no interlinear data found at /data/interlinear/${bookSlug}.json`);
                    continue;
                }

                const contentType = res.headers.get('content-type');
                if (contentType && !contentType.includes('application/json')) {
                    console.warn(`[BibleIngestion] Unexpected content type for ${book.name}: ${contentType}. Skipping.`);
                    continue;
                }

                const bookData: Record<string, InterlinearWord[]> = await res.json();

                for (const [chapterNum, chapterVerses] of Object.entries(bookData)) {
                    const chapterInt = parseInt(chapterNum);

                    const dbVerses = await db.bibleVerses
                        .where('[versionId+book+chapter]')
                        .equals(['kjv', book.name, chapterInt])
                        .toArray();

                    if (dbVerses.length === 0) continue;

                    const updates = dbVerses.map(v => {
                        const interlinear = (chapterVerses as any)[v.verse.toString()];
                        if (interlinear) {
                            return { ...v, interlinear };
                        }
                        return v;
                    });

                    await db.bibleVerses.bulkPut(updates);
                }
                console.info(`[BibleIngestion] Ingested interlinear data for ${book.name}`);
            }

            console.info('[BibleIngestion] Interlinear ingestion complete.');
            return true;
        } catch (error) {
            console.error('[BibleIngestion] Interlinear ingestion failed:', error);
            return false;
        }
    }
}
