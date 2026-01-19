import { db } from './index';
import { BibleIngestionService } from '../bible/BibleIngestionService';

/**
 * Seeds initial metadata if the database is empty.
 * In a production state, this will be empty, as users download versions 
 * via the BibleDownloadService or import them manually.
 */
export const seedBibleData = async () => {
    // Check for legacy data (Uppercase book names in IDs, e.g., kjv-Genesis-1-1)
    // We strictly need lowercase IDs for tooltips to work consistently.
    const legacyVerse = await db.bibleVerses.get('kjv-Genesis-1-1');
    if (legacyVerse) {
        console.info('[BibleDB] Detected legacy KJV data (Title Case IDs). Purging for migration...');
        await db.bibleVersions.delete('kjv');
        await db.bibleVerses.where('versionId').equals('kjv').delete();
        console.info('[BibleDB] Legacy KJV data purged.');
    }

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
    const john1_1 = await db.bibleVerses.get('kjv-john-1-1');
    if (john1_1 && !john1_1.interlinear) {
        console.info('[BibleDB] Interlinear data missing for KJV. Triggering ingestion...');
        await BibleIngestionService.ingestInterlinear();
    }
};
