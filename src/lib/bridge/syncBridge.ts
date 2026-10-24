/**
 * syncBridge.ts
 * Real-time sync hub bridge. Connects to Rust native synchronization state in Tauri.
 */

import { safeInvoke } from './runtimeBridge';

export interface NativeSyncState {
    active: boolean;
    peer_count: number;
    pending_count: number;
    server_port: number;
}

/**
 * Queries the native sync hub state (peer counts, active server port)
 */
export async function getNativeSyncState(): Promise<NativeSyncState | null> {
    return await safeInvoke<NativeSyncState>('get_sync_document_state');
}
