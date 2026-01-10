import { db } from './index';

/**
 * Seeds initial metadata if the database is empty.
 * In a production state, this will be empty, as users download versions 
 * via the BibleDownloadService or import them manually.
 */
export const seedBibleData = async () => {
    // We can keep the seed function but leave it empty of "sample" verses.
    // If we want to pre-populate the 'catalog' versions as metadata only (isDownloaded: false), 
    // that's done by the fetchCatalog in the UI.

    const existingVersions = await db.bibleVersions.count();
    if (existingVersions === 0) {
        console.info('[BibleDB] Database is empty. Ready for catalog discovery or manual import.');
    }

    const summaryCount = await db.chapterSummaries.count();
    if (summaryCount === 0) {
        // In the future, this is where we would trigger a bulk import of the global summaries.
        console.info('[BibleDB] No chapter summaries found.');
    }
};
