import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import type { Note } from '@/types/database';

/**
 * YjsService provides the engine for real-time collaboration and conflict-free
 * document merging (CRDTs).
 * 
 * Every note in Parchments can be backed by a Y.Doc, which handles character-level
 * sync and history.
 */
export const roomHashToId = (hash: string) => {
    if (hash.startsWith('space-')) {
        // Space hash format: space-[vault]-[folderId] OR space-[folderId]
        const parts = hash.split('-');
        if (parts.length >= 3) {
            // It's a full space hash with vault ID
            return decodeURIComponent(parts.slice(2).join('-'));
        }
        return decodeURIComponent(hash.replace('space-', ''));
    }
    if (hash.startsWith('p-')) {
        const parts = hash.split('-');
        return decodeURIComponent(parts.slice(2).join('-'));
    }
    return hash;
};

export class YjsService {
    private static docs: Map<string, Y.Doc> = new Map();
    public static providers: Map<string, any[]> = new Map();

    static getDoc(id: string, type: 'note' | 'folder' = 'note'): Y.Doc {
        const { identity, activeRoom, joinedRooms, sharedFolders } = useSyncStore.getState();
        const { notes } = useNoteStore.getState();

        let expectedRoomName = '';

        // 1. FOLDER LOGIC: Determine room name for a Space
        if (type === 'folder') {
            // Check if this ID belongs to a known joined room
            // We must find a room where roomHashToId(room.hash) === id
            const joinedSpace = joinedRooms.find(r => r.type === 'folder' && roomHashToId(r.hash) === id);

            if (joinedSpace) {
                expectedRoomName = joinedSpace.hash;
            } else if (sharedFolders.includes(id)) {
                // It's a local folder we are sharing
                if (identity) {
                    expectedRoomName = `space-${identity.vaultHash.slice(0, 8)}-${encodeURIComponent(id)}`;
                } else {
                    expectedRoomName = `space-local-${encodeURIComponent(id)}`;
                }
            } else {
                // Fallback for creating a new space from scratch?
                // Or maybe we just use the ID as is if we can't find context
                if (identity) {
                    expectedRoomName = `space-${identity.vaultHash.slice(0, 8)}-${encodeURIComponent(id)}`;
                } else {
                    expectedRoomName = `space-local-${encodeURIComponent(id)}`;
                }
            }
        }

        // 2. NOTE LOGIC
        else {
            const note = notes.find((n: Note) => n.id === id);
            const parentFolderId = note?.folderId;

            // 2a. Check if the note belongs to a SHARED FOLDER (Recursive Collaboration)
            // This must take precedence to ensure notes in shared folders ALWAYS open in shared mode
            const sharedFolder = joinedRooms.find(r => r.type === 'folder' && roomHashToId(r.hash) === parentFolderId);
            const isHostedFolder = parentFolderId && sharedFolders.includes(parentFolderId);

            if (sharedFolder) {
                // IT IS A JOINED SHARED FOLDER
                // The room name MUST be derived from the folder's hash to match the host
                // sharedFolder.hash is roughly: space-[vault]-[folderId]
                // We want: space-note-[vault]-[noteId]

                // If the hash is just space-[folderId] (legacy or local), handle gracefully

                expectedRoomName = `space-note-${sharedFolder.hash.replace('space-', '')}-${encodeURIComponent(id)}`;
            }
            else if (isHostedFolder && identity) {
                // IT IS A HOSTED SHARED FOLDER
                const spaceHash = `space-${identity.vaultHash.slice(0, 8)}-${encodeURIComponent(parentFolderId!)}`;
                expectedRoomName = `space-note-${spaceHash.replace('space-', '')}-${encodeURIComponent(id)}`;
            }

            // 2b. Manual Join / Active Room Override
            else if (activeRoom) {
                expectedRoomName = activeRoom;
                // If the active room is a SPACE, and we are opening a NOTE, derive a note-room
                if (activeRoom.startsWith('space-') && type === 'note') {
                    expectedRoomName = `space-note-${activeRoom.replace('space-', '')}-${encodeURIComponent(id)}`;
                }
            }

            // 2c. Fallback: Personal Cloud or Local
            else if (identity) {
                expectedRoomName = `p-${identity.vaultHash.slice(0, 8)}-${encodeURIComponent(id)}`;
            } else {
                expectedRoomName = `local-${encodeURIComponent(id)}`;
            }
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
            // Public fallbacks are currently disabled to prevent console clutter during public server downtime
            // 'wss://signaling.yjs.dev',
            // 'wss://y-webrtc.fly.dev',
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

