import { db } from '../db';

// Placeholder for the real CDN URL
const CATALOG_URL = 'https://raw.githubusercontent.com/patrickudo2004/bible-data/main/versions.json';

export interface CatalogBibleVersion {
    id: string;
    name: string;
    abbreviation: string;
    language: string;
    size: string;
    url: string;
    copyright: string;
}

export interface CatalogResponse {
    versions: CatalogBibleVersion[];
}

class BibleDownloadService {
    async fetchCatalog(): Promise<CatalogBibleVersion[]> {
        try {
            // First try to fetch the local catalog
            const localResponse = await fetch('/data/bibles/catalog.json');
            if (localResponse.ok) {
                const catalog: CatalogBibleVersion[] = await localResponse.json();
                // Using local catalog
                return catalog;
            }

            // Fallback to remote catalog if local fails
            console.warn('[BibleDownload] Local catalog not found, trying remote...');
            const response = await fetch(CATALOG_URL);
            if (!response.ok) throw new Error('Failed to fetch remote catalog');
            const data: CatalogResponse = await response.json();
            return data.versions;
        } catch (error) {
            console.error('[BibleDownload] Failed to fetch catalog:', error);
            // Return empty array instead of hardcoded mock
            // User should run `npm run catalog` to generate the catalog
            return [];
        }
    }

    async downloadVersion(version: CatalogBibleVersion, onProgress?: (status: string, progress: number) => void) {
        try {
            if (onProgress) onProgress('Downloading...', 10);

            const response = await fetch(version.url);
            if (!response.ok) throw new Error(`Failed to download ${version.name}`);

            const data = await response.json();
            if (onProgress) onProgress('Download Complete', 30);

            // 1. Ensure version record exists in local DB
            const existing = await db.bibleVersions.get(version.id);
            if (!existing) {
                await db.bibleVersions.put({
                    id: version.id,
                    name: version.name,
                    abbreviation: version.abbreviation,
                    language: version.language,
                    copyright: version.copyright,
                    isDownloaded: false,
                    downloadUrl: version.url
                });
            }

            // 2. Start Worker for Import
            return new Promise((resolve, reject) => {
                const worker = new Worker(new URL('../../workers/bibleImportWorker.ts', import.meta.url), { type: 'module' });

                worker.onmessage = (event) => {
                    const { status, progress, message, error } = event.data;

                    if (status === 'complete') {
                        worker.terminate();
                        resolve(true);
                    } else if (status === 'error') {
                        worker.terminate();
                        reject(new Error(error));
                    } else {
                        if (onProgress) onProgress(message || status, progress || 0);
                    }
                };

                worker.onerror = (err) => {
                    worker.terminate();
                    reject(err);
                };

                worker.postMessage({ type: 'IMPORT_JSON', data, versionId: version.id });
            });

        } catch (error) {
            console.error(`[BibleDownload] Failed:`, error);
            throw error;
        }
    }
}

export const bibleDownloadService = new BibleDownloadService();
