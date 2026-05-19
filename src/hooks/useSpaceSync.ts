import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import { YjsService, roomHashToId } from '@/lib/sync/YjsService';
import { db } from '@/lib/db';

/**
 * useSpaceSync is a global observer hook that keeps the local database
 * in sync with the Shared Space manifests.
 *
 * TRUE MULTI-MASTER CRDT ARCHITECTURE:
 * -  Both Host and Client are equal peers. Neither is the "source of truth".
 * -  The manifest Y.Map stores individual noteId keys (not a single 'files' blob).
 * -  When ANY device creates a note, it adds its noteId to the Y.Map.
 * -  When ANY device deletes a note, it removes its noteId from the Y.Map.
 * -  Both devices observe the Y.Map keys and react to additions/deletions.
 * -  This eliminates the Single Writer problem where Mobile notes didn't reflect on Desktop.
 */
export const useSpaceSync = () => {
    const { joinedRooms, sharedFolders } = useSyncStore();
    const observedRooms = useRef<Set<string>>(new Set());

    useEffect(() => {
        console.log('[Space Sync INIT] useSpaceSync running (Multi-Master mode)');

        // Find all folders we should be observing (both hosted and joined)
        const activeFolders = [
            ...joinedRooms.filter(r => r.type === 'folder').map(r => ({ id: roomHashToId(r.hash), hash: r.hash, isHosted: false })),
            ...sharedFolders.map(id => ({ id, hash: `space-${id}`, isHosted: true }))
        ].filter(f => f.id); // Remove any null IDs

        console.log('[Space Sync INIT] Active folders to observe:', activeFolders);

        const cleanupFns: (() => void)[] = [];

        activeFolders.forEach(folder => {
            if (!folder.id || observedRooms.current.has(folder.id)) return;
            observedRooms.current.add(folder.id);

            console.log(`[Space Sync] Starting observer for folder: ${folder.id} (isHosted: ${folder.isHosted})`);

            const ydoc = YjsService.getDoc(folder.id, 'folder');
            const manifest = ydoc.getMap('manifest');

            // ALL peers broadcast their current notes on startup to populate the shared map.
            // Hosts publish their local notes; Clients publish any notes they've created.
            console.log(`[Space Sync] 📢 Initial broadcast for folder: ${folder.id}`);
            useNoteStore.getState().broadcastFolderChange(folder.id);

            const handleManifestChange = async () => {
                const currentNotes = useNoteStore.getState().notes; // Use real-time state to avoid stale closure
                console.log(`[Space Sync OBSERVER] Manifest change detected for folder: ${folder.id}`);

                let dbChanged = false;

                // Build the set of all noteIds present in the shared manifest.
                // The manifest now stores individual noteId keys directly.
                // We skip the 'lastUpdated' metadata key.
                const reservedKeys = new Set(['lastUpdated', 'files']); // 'files' is the legacy key
                const remoteNoteIds = new Set<string>();
                const remoteFiles: Record<string, any> = {};

                manifest.forEach((value, key) => {
                    if (reservedKeys.has(key)) return;
                    remoteNoteIds.add(key);
                    remoteFiles[key] = value;
                });

                // ── 1. ADDITION / RENAME SYNC ─────────────────────────────────────
                // For every noteId in the remote manifest, check if it exists locally.
                for (const fileId of remoteNoteIds) {
                    const remoteFile = remoteFiles[fileId];
                    if (!remoteFile) continue;

                    const localNote = currentNotes.find(n => n.id === fileId);

                    if (!localNote) {
                        // GHOST HYDRATION: Note exists on a peer but not locally. Create a placeholder.
                        console.log(`[Space Sync OBSERVER] 🆕 Creating placeholder for remote note: "${remoteFile.title}" (${fileId})`);
                        try {
                            await db.notes.put({
                                id: fileId,
                                title: remoteFile.title || 'Untitled',
                                content: '',
                                folderId: folder.id,
                                tags: [],
                                type: remoteFile.type || 'text',
                                transcript: remoteFile.transcript || undefined,
                                duration: remoteFile.duration || undefined,
                                createdAt: Date.now(),
                                updatedAt: remoteFile.updatedAt || Date.now()
                            });
                            dbChanged = true;
                        } catch (error) {
                            console.error(`[Space Sync OBSERVER] ❌ Failed to create placeholder for ${fileId}:`, error);
                        }
                    } else if (localNote.title !== remoteFile.title && remoteFile.title) {
                        // RENAME SYNC: Update local title if it changed on another peer
                        console.log(`[Space Sync OBSERVER] 📝 Syncing title for ${fileId}: "${localNote.title}" -> "${remoteFile.title}"`);
                        await db.notes.update(fileId, { title: remoteFile.title, updatedAt: remoteFile.updatedAt || Date.now() });
                        dbChanged = true;
                    }
                }

                // ── 2. DELETION SYNC ──────────────────────────────────────────────
                // If a local note in this folder is NOT in the remote manifest, it was deleted on a peer.
                // We only delete ghost notes (content === '') to avoid destroying locally-authored content
                // in edge cases where the manifest hasn't fully synced yet.
                const localNotesInFolder = currentNotes.filter(n => n.folderId === folder.id);

                for (const note of localNotesInFolder) {
                    // Only delete if:
                    // 1. Note is not in the remote manifest
                    // 2. The manifest is non-empty (if it's empty, we might just not have synced yet)
                    // 3. The note has no content (it's a ghost/placeholder, not authored locally)
                    if (!remoteNoteIds.has(note.id) && remoteNoteIds.size > 0 && note.content === '') {
                        console.log(`[Space Sync OBSERVER] 🗑️ Remote deletion detected: "${note.title}" (${note.id})`);
                        await db.notes.delete(note.id);
                        dbChanged = true;
                    }
                }

                if (dbChanged) {
                    console.log(`[Space Sync OBSERVER] 🔄 Reloading notes due to DB changes`);
                    useNoteStore.getState().loadNotes();
                }
            };

            manifest.observe(handleManifestChange);
            // Run once immediately to hydrate from any existing shared state
            handleManifestChange();

            cleanupFns.push(() => {
                manifest.unobserve(handleManifestChange);
                observedRooms.current.delete(folder.id);
            });
        });

        return () => {
            cleanupFns.forEach(fn => fn());
        };
    }, [joinedRooms, sharedFolders]);
};
