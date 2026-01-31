import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { useSyncStore } from '@/stores/syncStore';

/**
 * YjsService provides the engine for real-time collaboration and conflict-free
 * document merging (CRDTs).
 * 
 * Every note in Parchments can be backed by a Y.Doc, which handles character-level
 * sync and history.
 */
export class YjsService {
    private static docs: Map<string, Y.Doc> = new Map();
    public static providers: Map<string, any[]> = new Map();

    /**
     * Gets or creates a Y.Doc for a specific note.
     * Automatically sets up local persistence in IndexedDB.
     */
    static getDoc(noteId: string): Y.Doc {
        if (this.docs.has(noteId)) {
            return this.docs.get(noteId)!;
        }

        const doc = new Y.Doc();
        this.docs.set(noteId, doc);

        // 1. Enable local persistence
        // This ensures the CRDT state is saved even if the app closes
        const persistence = new IndexeddbPersistence(`note-${noteId}`, doc);

        persistence.on('synced', () => {
            // Local state for note ID loaded
        });

        // 2. Enable P2P Connectivity (WebRTC) for privacy-preserving discovery
        // Room name is: parchment-[vaultHash]-[noteId]
        // This ensures only devices with the same vault key can find each other.
        const { identity } = useSyncStore.getState();
        const roomName = identity
            ? `parchment-${identity.vaultHash.slice(0, 16)}-${noteId}`
            : `parchment-local-${noteId}`;

        const webrtcProvider = new WebrtcProvider(roomName, doc, {
            signaling: ['wss://signaling.yjs.dev']
        });

        this.providers.set(noteId, [persistence, webrtcProvider]);

        return doc;
    }

    /**
     * Returns the awareness instance for a specific note.
     */
    static getAwareness(noteId: string) {
        const providers = this.providers.get(noteId);
        const webrtc = providers?.find((p: any) => p.awareness);
        return webrtc?.awareness;
    }

    /**
     * Releases a doc and its providers from memory.
     */
    static destroyDoc(noteId: string) {
        const providers = this.providers.get(noteId);
        if (providers) {
            providers.forEach(p => p.destroy());
            this.providers.delete(noteId);
        }

        const doc = this.docs.get(noteId);
        if (doc) {
            doc.destroy();
            this.docs.delete(noteId);
        }
    }
}
