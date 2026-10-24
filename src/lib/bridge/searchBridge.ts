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
