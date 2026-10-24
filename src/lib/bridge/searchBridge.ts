/**
 * searchBridge.ts
 * High-performance search bridge. Offloads full-text and concordance filtering
 * to native Rust backend when running on desktop, with seamless fallback for web/mobile.
 */

import { safeInvoke, isTauri } from './runtimeBridge';

export interface NativeSystemEngineInfo {
    engine: string;
    os: string;
    arch: string;
    cpu_cores: number;
    edition: string;
    status: string;
}

/**
 * Retrieves the native hardware acceleration engine status
 */
export async function getSystemEngineInfo(): Promise<NativeSystemEngineInfo | null> {
    return await safeInvoke<NativeSystemEngineInfo>('get_system_engine_info');
}

/**
 * Performs fast parallel text search across a list of strings
 */
export async function fastTextSearch(
    corpus: string[],
    query: string,
    caseSensitive = false
): Promise<number[]> {
    if (isTauri && corpus.length > 500) {
        const nativeIndices = await safeInvoke<number[]>('fast_text_search_native', {
            corpus,
            query,
            caseSensitive
        });
        if (nativeIndices !== null) {
            return nativeIndices;
        }
    }

    // Standard fallback in JavaScript (web & mobile)
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    const results: number[] = [];
    for (let i = 0; i < corpus.length; i++) {
        const text = corpus[i];
        const matches = caseSensitive ? text.includes(searchTerm) : text.toLowerCase().includes(searchTerm);
        if (matches) {
            results.push(i);
        }
    }
    return results;
}

/**
 * Multi-term verse search offloading to Rust native backend when on desktop
 */
export async function searchVersesNative(
    corpus: string[],
    terms: string[],
    matchAll = true
): Promise<number[]> {
    if (isTauri && corpus.length > 200) {
        const nativeIndices = await safeInvoke<number[]>('native_search_verses', {
            query: {
                corpus,
                terms,
                match_all: matchAll
            }
        });
        if (nativeIndices !== null) {
            return nativeIndices;
        }
    }

    // Isomorphic JS fallback
    const lowerTerms = terms.map(t => t.toLowerCase());
    if (lowerTerms.length === 0) return [];

    const results: number[] = [];
    for (let i = 0; i < corpus.length; i++) {
        const lowerText = corpus[i].toLowerCase();
        const matches = matchAll
            ? lowerTerms.every(term => lowerText.includes(term))
            : lowerTerms.some(term => lowerText.includes(term));
        if (matches) {
            results.push(i);
        }
    }
    return results;
}

/**
 * Instant Strong's Concordance key lookup offloaded to Rust on desktop
 */
export async function concordanceLookupNative(
    keys: string[],
    target: string
): Promise<number[]> {
    if (isTauri && keys.length > 500) {
        const nativeIndices = await safeInvoke<number[]>('native_concordance_lookup', {
            keys,
            target
        });
        if (nativeIndices !== null) {
            return nativeIndices;
        }
    }

    // Isomorphic JS fallback
    const targetClean = target.trim().toUpperCase();
    const results: number[] = [];
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].trim().toUpperCase() === targetClean) {
            results.push(i);
        }
    }
    return results;
}
