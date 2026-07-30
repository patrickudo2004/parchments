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
export const roomHashToId = (hash: string) => {
    if (hash.startsWith('p-')) {
        const parts = hash.split('-');
        return decodeURIComponent(parts.slice(2).join('-'));
    }
    if (hash.startsWith('local-')) {
        return decodeURIComponent(hash.replace('local-', ''));
    }
    return hash;
};

export class YjsService {
    private static docs: Map<string, Y.Doc> = new Map();
    public static providers: Map<string, any[]> = new Map();

    static getDoc(id: string): Y.Doc {
        const { identity, activeRoom, joinedRooms } = useSyncStore.getState();

        let expectedRoomName = '';

        // Determine room name for single note collaboration
        const joinedNoteRoom = joinedRooms.find(r => r.type === 'note' && roomHashToId(r.hash) === id);

        if (joinedNoteRoom) {
            // It is an explicitly joined note room
            expectedRoomName = joinedNoteRoom.hash;
        } else if (activeRoom && roomHashToId(activeRoom) === id) {
            // The currently active manually joined room matches this note
            expectedRoomName = activeRoom;
        } else if (identity) {
            // Owner's secure room hash
            expectedRoomName = `p-${identity.vaultHash.slice(0, 8)}-${encodeURIComponent(id)}`;
        } else {
            // Fallback local room hash
            expectedRoomName = `local-${encodeURIComponent(id)}`;
        }

        expectedRoomName = `parchment-v1-${expectedRoomName}`;

        // Recreate if room changed (detecting activeRoom / join flow)
        const existingProviders = this.providers.get(id);
        const webrtc = existingProviders?.find((p: any) => (p as any).roomName);

        if (webrtc && (webrtc as any).roomName !== expectedRoomName) {
            console.log(`[YjsService] Switching room for id ${id}: ${(webrtc as any).roomName} -> ${expectedRoomName}`);
            this.destroyDoc(id);
        }

        if (this.docs.has(id)) {
            return this.docs.get(id)!;
        }

        const doc = new Y.Doc();
        this.docs.set(id, doc);

        // 1. Enable local persistence
        const persistence = new IndexeddbPersistence(`note-${id}`, doc);

        // 2. Enable P2P Connectivity (WebRTC)
        const signalingServers = [
            'wss://parchments-signaling.patrickudo2004.deno.net',
            'wss://signaling.yjs.dev',
            'wss://y-webrtc.fly.dev',
        ];

        const webrtcProvider = new WebrtcProvider(expectedRoomName, doc, {
            signaling: signalingServers
        });

        this.providers.set(id, [persistence, webrtcProvider]);

        // 3. Link connectivity to store
        const updateConnectivity = () => {
            const { setConnected } = useSyncStore.getState();
            // @ts-ignore
            setConnected(webrtcProvider.connected);
        };

        webrtcProvider.on('peers', updateConnectivity);
        webrtcProvider.on('status', updateConnectivity);
        webrtcProvider.on('synced', updateConnectivity);
        setTimeout(updateConnectivity, 1000);

        return doc;
    }

    /**
     * Returns the webrtc provider for a specific note.
     * This is needed for CollaborationCursor.
     */
    static getProvider(id: string) {
        const providers = this.providers.get(id);
        return providers?.find((p: any) => p.awareness);
    }

    /**
     * Returns the IndexeddbPersistence instance for a specific note.
     * Use this to wait for the 'synced' event before seeding content,
     * preventing the double-seed race condition where the editor seeds
     * content before IndexedDB has finished loading the existing doc.
     */
    static getPersistence(id: string) {
        const providers = this.providers.get(id);
        return providers?.find((p: any) => p instanceof IndexeddbPersistence) as IndexeddbPersistence | undefined;
    }

    /**
     * Returns the awareness instance for a specific note.
     */
    static getAwareness(id: string) {
        return this.getProvider(id)?.awareness;
    }

    /**
     * Gets the metadata map for a note (stores title, etc.)
     */
    static getMetadata(id: string): Y.Map<any> | null {
        const doc = this.docs.get(id);
        if (!doc) return null;
        return doc.getMap('metadata');
    }

    /**
     * Sets a metadata value for a note
     */
    static setMetadata(id: string, key: string, value: any) {
        const metadata = this.getMetadata(id);
        if (metadata) {
            metadata.set(key, value);
        }
    }

    /**
     * Gets a metadata value for a note
     */
    static getMetadataValue(id: string, key: string): any {
        const metadata = this.getMetadata(id);
        return metadata?.get(key);
    }

    /**
     * Releases a doc and its providers from memory.
     */
    static destroyDoc(id: string) {
        const providers = this.providers.get(id);
        if (providers) {
            providers.forEach(p => p.destroy());
            this.providers.delete(id);
        }

        const doc = this.docs.get(id);
        if (doc) {
            doc.destroy();
            this.docs.delete(id);
        }
    }

    static disconnectAll() {
        console.log('[YjsService] Disconnecting all collaborative documents and providers...');
        const docIds = Array.from(this.docs.keys());
        for (const id of docIds) {
            this.destroyDoc(id);
        }
    }
}

