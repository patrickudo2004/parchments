import { db } from './index';
import { BibleIngestionService } from '../bible/BibleIngestionService';

/**
 * Seeds initial metadata if the database is empty.
 * Re-seeds automatically if unencrypted legacy data is detected.
 */
export const seedBibleData = async () => {
    if (localStorage.getItem('skip-bible-seeding') === 'true') {
        console.info('[BibleDB] Skipping Bible seeding due to test bypass flag.');
        return;
    }

    // Migration Check: Detect unencrypted legacy Bible data
    const sampleVerses = await db.bibleVerses.limit(1).toArray();
    const sampleVerse = sampleVerses[0];
    if (sampleVerse && !sampleVerse.text.startsWith('ENC::v1::')) {
        console.info('[BibleDB] Detected unencrypted legacy Bible data. Purging for encrypted re-seeding...');
        await db.bibleVerses.clear();
        await db.bibleVersions.clear();
        console.info('[BibleDB] Legacy unencrypted Bible data purged.');
    }

    // Check for legacy data with Title Case IDs
    const legacyVerse = await db.bibleVerses.get('kjv-Genesis-1-1');
    if (legacyVerse) {
        console.info('[BibleDB] Detected legacy KJV data (Title Case IDs). Purging...');
        await db.bibleVersions.delete('kjv');
        await db.bibleVerses.where('versionId').equals('kjv').delete();
        console.info('[BibleDB] Legacy KJV data purged.');
    }

    const existingVersions = await db.bibleVersions.count();
    const isKjvDownloaded = await BibleIngestionService.isKJVDownloaded();

    if (existingVersions === 0 || !isKjvDownloaded) {
        console.info('[BibleDB] Triggering encrypted initial KJV ingestion...');
        await BibleIngestionService.fetchAndIngestKJV();
    } else {
        console.info('[BibleDB] Encrypted KJV already exists. Skipping initial ingestion.');
    }

    // Check for Strongs
    const strongsCount = await db.strongsEntries.count();
    if (strongsCount === 0) {
        console.info('[BibleDB] Strongs lexicon missing. Triggering ingestion...');
        await BibleIngestionService.ingestStrongs();
    }

    // Check for Interlinear
    const john1_1 = await db.bibleVerses.get('kjv-john-1-1');
    if (john1_1 && !john1_1.interlinear) {
        console.info('[BibleDB] Interlinear data missing for KJV. Triggering ingestion...');
        await BibleIngestionService.ingestInterlinear();
    }
};
