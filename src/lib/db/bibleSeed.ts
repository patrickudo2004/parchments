import { db } from './index';

export const seedBibleData = async () => {
    // 1. Initial Bible Versions Metadata
    const existingVersions = await db.bibleVersions.count();
    if (existingVersions === 0) {
        await db.bibleVersions.bulkAdd([
            {
                id: 'kjv',
                name: 'King James Version',
                abbreviation: 'KJV',
                language: 'eng',
                copyright: 'Public Domain',
                isDownloaded: false, // Will require download or be bundled
            },
            {
                id: 'web',
                name: 'World English Bible',
                abbreviation: 'WEB',
                language: 'eng',
                copyright: 'Public Domain',
                isDownloaded: false,
            }
        ]);
        console.info('[BibleDB] Seeded initial version metadata.');
    }

    // 2. Chapter Summaries (Global)
    const summaryCount = await db.chapterSummaries.count();
    if (summaryCount === 0) {
        // This is a partial list as a placeholder. In a full implementation, 
        // we would import a complete JSON of all 1,189 summaries.
        await db.chapterSummaries.bulkAdd([
            { id: 'John-1', book: 'John', chapter: 1, summary: 'The Word became flesh, and John the Baptist testifies about Jesus.' },
            { id: 'John-2', book: 'John', chapter: 2, summary: 'Jesus turns water into wine at the wedding in Cana and clears the temple.' },
            { id: 'John-3', book: 'John', chapter: 3, summary: 'Jesus teaches Nicodemus about being born again; John the Baptist’s testimony.' },
            { id: 'Genesis-1', book: 'Genesis', chapter: 1, summary: 'The creation of the world in six days.' },
            // ... more will be added via external assets/JSON
        ]);
        console.info('[BibleDB] Seeded initial chapter summaries.');
    }
};
