/**
 * Persistent storage for Web File System Access API `FileSystemDirectoryHandle`
 * objects inside IndexedDB.
 *
 * Browsers allow structured-cloning `FileSystemDirectoryHandle` into IndexedDB:
 * - On same-session tab reloads, `queryPermission({ mode: 'readwrite' })` returns
 *   `'granted'` immediately, enabling zero-click auto-reconnection on the Web App.
 * - After a full browser restart, `requestPermission({ mode: 'readwrite' })` re-enables
 *   access in a single button click without re-opening the OS directory picker.
 */

const DB_NAME = 'parchments-fs-handles';
const STORE_NAME = 'handles';
const ACTIVE_DIR_KEY = 'active-local-directory';
const DB_VERSION = 1;

function openHandleDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available in this environment'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open handle IndexedDB'));
    });
}

export async function savePersistedDirectoryHandle(rawHandle: any): Promise<void> {
    if (!rawHandle) return;
    try {
        const db = await openHandleDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(rawHandle, ACTIVE_DIR_KEY);
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error || new Error('Failed to store directory handle'));
            };
        });
    } catch (err) {
        console.warn('[fsHandleStore] Could not persist directory handle:', err);
    }
}

export async function loadPersistedDirectoryHandle(): Promise<any | null> {
    try {
        const db = await openHandleDb();
        return await new Promise<any | null>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(ACTIVE_DIR_KEY);
            req.onsuccess = () => {
                db.close();
                resolve(req.result || null);
            };
            req.onerror = () => {
                db.close();
                reject(req.error || new Error('Failed to read directory handle'));
            };
        });
    } catch (err) {
        console.warn('[fsHandleStore] Could not load persisted directory handle:', err);
        return null;
    }
}

export async function clearPersistedDirectoryHandle(): Promise<void> {
    try {
        const db = await openHandleDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete(ACTIVE_DIR_KEY);
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error || new Error('Failed to delete directory handle'));
            };
        });
    } catch (err) {
        console.warn('[fsHandleStore] Could not clear persisted directory handle:', err);
    }
}

export async function queryDirectoryPermission(
    rawHandle: any,
    mode: 'read' | 'readwrite' = 'readwrite'
): Promise<'granted' | 'prompt' | 'denied'> {
    if (!rawHandle) return 'denied';
    try {
        if (typeof rawHandle.queryPermission === 'function') {
            return await rawHandle.queryPermission({ mode });
        }
        // Custom/mocked handles without queryPermission are assumed accessible
        return 'granted';
    } catch (err) {
        console.warn('[fsHandleStore] queryPermission failed:', err);
        return 'prompt';
    }
}

export async function requestDirectoryPermission(
    rawHandle: any,
    mode: 'read' | 'readwrite' = 'readwrite'
): Promise<'granted' | 'prompt' | 'denied'> {
    if (!rawHandle) return 'denied';
    try {
        if (typeof rawHandle.requestPermission === 'function') {
            return await rawHandle.requestPermission({ mode });
        }
        return 'granted';
    } catch (err) {
        console.warn('[fsHandleStore] requestPermission failed:', err);
        return 'denied';
    }
}
