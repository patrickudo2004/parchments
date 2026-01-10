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

    const summaryCount = await db.chapterSummaries.count();
    if (summaryCount === 0) {
        // In the future, this is where we would trigger a bulk import of the global summaries.
        console.info('[BibleDB] No chapter summaries found.');
    }
};
