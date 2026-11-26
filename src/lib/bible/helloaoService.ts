import { db } from '../db';

export const HELLOAO_API_BASE = 'https://bible.helloao.org';
const AVAILABLE_TRANSLATIONS_URL = `${HELLOAO_API_BASE}/api/available_translations.json`;
const SESSION_CACHE_KEY = 'parchments-helloao-translations-v1';

export interface HelloAOTranslation {
    id: string;
    name: string;
    englishName?: string;
    shortName?: string;
    language: string;
    languageName?: string;
    languageEnglishName?: string;
    textDirection?: 'ltr' | 'rtl';
    website?: string;
    licenseUrl?: string;
    license?: {
        publicDomain?: boolean;
        attribution?: string;
        commercialUse?: string;
    };
    numberOfBooks?: number;
    totalNumberOfChapters?: number;
    totalNumberOfVerses?: number;
    listOfBooksApiLink?: string;
    completeTranslationApiLink?: string;
    simpleCompleteTranslationApiLink?: string;
}

export interface HelloAOCatalogResult {
    translations: HelloAOTranslation[];
    offline: boolean;
    error?: string;
}

let memoryCache: HelloAOTranslation[] | null = null;

/**
 * Fetches the 1,500+ free/open-license Bible translations from the HelloAO Free Use Bible API.
 * Caches results in memory and sessionStorage for instant browsing.
 */
export async function fetchHelloAOTranslations(forceRefresh = false): Promise<HelloAOCatalogResult> {
    if (!forceRefresh && memoryCache && memoryCache.length > 0) {
        return { translations: memoryCache, offline: false };
    }

    if (!forceRefresh && typeof sessionStorage !== 'undefined') {
        try {
            const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached) as HelloAOTranslation[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    memoryCache = parsed;
                    return { translations: parsed, offline: false };
                }
            }
        } catch {
            // ignore corrupted session cache
        }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return {
            translations: memoryCache || [],
            offline: true,
            error: 'You appear to be offline. Connect to the internet to browse 1,500+ free online translations.'
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(AVAILABLE_TRANSLATIONS_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HelloAO catalog returned HTTP ${res.status}`);
        }

        const data = await res.json();
        const list: HelloAOTranslation[] = Array.isArray(data?.translations)
            ? data.translations.filter((t: HelloAOTranslation) => Boolean(t?.id && (t.simpleCompleteTranslationApiLink || t.completeTranslationApiLink)))
            : [];

        // Sort: English full Bibles first, then by language name and English name
        list.sort((a, b) => {
            const aEng = a.language === 'eng' ? 0 : 1;
            const bEng = b.language === 'eng' ? 0 : 1;
            if (aEng !== bEng) return aEng - bEng;
            const aFull = (a.numberOfBooks || 0) >= 66 ? 0 : 1;
            const bFull = (b.numberOfBooks || 0) >= 66 ? 0 : 1;
            if (aFull !== bFull) return aFull - bFull;
            const aName = a.englishName || a.name || a.id;
            const bName = b.englishName || b.name || b.id;
            return aName.localeCompare(bName);
        });

        memoryCache = list;

        if (typeof sessionStorage !== 'undefined') {
            try {
                // Store trimmed fields to fit comfortably inside sessionStorage quota
                const slim = list.map((t) => ({
                    id: t.id,
                    name: t.name,
                    englishName: t.englishName,
                    shortName: t.shortName,
                    language: t.language,
                    languageName: t.languageName,
                    languageEnglishName: t.languageEnglishName,
                    textDirection: t.textDirection,
                    website: t.website,
                    license: t.license ? { publicDomain: t.license.publicDomain } : undefined,
                    numberOfBooks: t.numberOfBooks,
                    totalNumberOfChapters: t.totalNumberOfChapters,
                    totalNumberOfVerses: t.totalNumberOfVerses,
                    simpleCompleteTranslationApiLink: t.simpleCompleteTranslationApiLink,
                    completeTranslationApiLink: t.completeTranslationApiLink,
                }));
                sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(slim));
            } catch {
                // sessionStorage quota exceeded — memory cache still works
            }
        }

        return { translations: list, offline: false };
    } catch (err: any) {
        console.warn('[HelloAO] Failed to fetch online translations:', err);
        return {
            translations: memoryCache || [],
            offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
            error: err?.name === 'AbortError'
                ? 'Connection timed out while contacting bible.helloao.org.'
                : (err?.message || 'Unable to reach HelloAO online Bible library.')
        };
    }
}

/**
 * Downloads a complete HelloAO Bible translation in a single request, encrypts all verses
 * with AES-GCM via the import worker, stores them in chunked IndexedDB batches, and
 * invalidates the Bible search index cache.
 */
export async function downloadHelloAOTranslation(
    translation: HelloAOTranslation,
    onProgress?: (status: string, progress: number) => void
): Promise<{ versionId: string; verseCount: number; bookCount: number }> {
    const versionId = translation.id.trim().toLowerCase();
    const apiPath = translation.simpleCompleteTranslationApiLink || translation.completeTranslationApiLink;
    if (!apiPath) {
        throw new Error(`No downloadable bundle URL available for ${translation.name}`);
    }

    const downloadUrl = apiPath.startsWith('http') ? apiPath : `${HELLOAO_API_BASE}${apiPath}`;
    const displayName = translation.englishName || translation.name || translation.id;
    const abbrev = (translation.shortName || translation.id).toUpperCase().slice(0, 8);

    const existingBefore = await db.bibleVersions.get(versionId);
    const wasAlreadyDownloaded = Boolean(existingBefore?.isDownloaded);

    try {
        onProgress?.(`Downloading ${displayName}...`, 4);

        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Download failed with HTTP ${response.status}`);
        }

        // Stream download with real progress when Content-Length is provided
        let jsonText = '';
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (response.body && typeof response.body.getReader === 'function') {
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let received = 0;
            const chunks: string[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    received += value.byteLength;
                    chunks.push(decoder.decode(value, { stream: true }));
                    if (contentLength > 0) {
                        const dlPct = 4 + Math.round((received / contentLength) * 26);
                        onProgress?.(
                            `Downloading ${abbrev} (${(received / (1024 * 1024)).toFixed(1)} MB)...`,
                            Math.min(30, dlPct)
                        );
                    } else {
                        onProgress?.(
                            `Downloading ${abbrev} (${(received / (1024 * 1024)).toFixed(1)} MB)...`,
                            18
                        );
                    }
                }
            }
            chunks.push(decoder.decode());
            jsonText = chunks.join('');
        } else {
            jsonText = await response.text();
        }

        onProgress?.(`Parsing ${displayName}...`, 32);
        const parsedJson = JSON.parse(jsonText);

        await db.bibleVersions.put({
            id: versionId,
            name: displayName,
            abbreviation: abbrev,
            language: translation.language || 'und',
            copyright: translation.license?.publicDomain
                ? 'Public Domain (via HelloAO Free Bible API)'
                : `Free Use License (${translation.website || 'bible.helloao.org'})`,
            isDownloaded: wasAlreadyDownloaded,
            downloadUrl,
        });

        const stats = await new Promise<{ verseCount: number; bookCount: number }>((resolve, reject) => {
            const worker = new Worker(new URL('../../workers/bibleImportWorker.ts', import.meta.url), { type: 'module' });

            worker.onmessage = (event) => {
                const { status, progress, message, error, verseCount, bookCount } = event.data;
                if (status === 'complete') {
                    worker.terminate();
                    resolve({ verseCount: verseCount || 0, bookCount: bookCount || 0 });
                } else if (status === 'error') {
                    worker.terminate();
                    reject(new Error(error || 'Failed to import translation'));
                } else {
                    const mappedProgress = typeof progress === 'number'
                        ? Math.min(99, 32 + Math.round(progress * 0.67))
                        : 40;
                    onProgress?.(message || status, mappedProgress);
                }
            };

            worker.onerror = (err) => {
                worker.terminate();
                reject(new Error(err.message || 'Bible import worker encountered an error'));
            };

            worker.postMessage({ type: 'IMPORT_JSON', data: parsedJson, versionId });
        });

        const { invalidateBibleSearchCache } = await import('../search/bibleSearchEngine');
        invalidateBibleSearchCache(versionId);

        onProgress?.('Complete!', 100);
        return { versionId, verseCount: stats.verseCount, bookCount: stats.bookCount };
    } catch (err) {
        if (!wasAlreadyDownloaded) {
            try {
                await db.bibleVerses.where('versionId').equals(versionId).delete();
                await db.bibleVersions.delete(versionId);
            } catch {
                // ignore cleanup failure
            }
        }
        throw err;
    }
}
