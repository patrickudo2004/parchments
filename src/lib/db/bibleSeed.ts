import { db } from './index';
import { BibleIngestionService } from '../bible/BibleIngestionService';

/**
 * Seeds initial metadata if the database is empty.
 * In a production state, this will be empty, as users download versions 
 * via the BibleDownloadService or import them manually.
 */
export const seedBibleData = async () => {
    const existingVersions = await db.bibleVersions.count();

    // Check if KJV is already downloaded
    const isKjvDownloaded = await BibleIngestionService.isKJVDownloaded();

    if (existingVersions === 0 || !isKjvDownloaded) {
        console.info('[BibleDB] Triggering initial KJV ingestion...');
        await BibleIngestionService.fetchAndIngestKJV();
    } else {
        console.info('[BibleDB] KJV already exists. Skipping initial ingestion.');
    }

    // Check for Strongs
    const strongsCount = await db.strongsEntries.count();
    if (strongsCount === 0) {
        console.info('[BibleDB] Strongs lexicon missing. Triggering ingestion...');
        await BibleIngestionService.ingestStrongs();
    }

    // Check for Interlinear (check if some verses have it)
    // We'll check the first verse of John 1
    const john1_1 = await db.bibleVerses.get('kjv-John-1-1');
    if (john1_1 && !john1_1.interlinear) {
        console.info('[BibleDB] Interlinear data missing for KJV. Triggering ingestion...');
        await BibleIngestionService.ingestInterlinear();
    }
};
