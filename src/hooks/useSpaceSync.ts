import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import { YjsService, roomHashToId } from '@/lib/sync/YjsService';
import { db } from '@/lib/db';

/**
 * useSpaceSync is a global observer hook that keeps the local database
 * in sync with the Shared Space manifests.
 * 
 * It listens for remote file additions/deletions/renames and automatically
 * creates or updates local placeholders (ghost notes).
 */
export const useSpaceSync = () => {
    const { joinedRooms, sharedFolders } = useSyncStore();
    const observedRooms = useRef<Set<string>>(new Set());

    useEffect(() => {
        console.log('[Space Sync INIT] useSpaceSync running');

        // Find all folders we should be observing
        const activeFolders = [
            ...joinedRooms.filter(r => r.type === 'folder').map(r => ({ id: roomHashToId(r.hash), hash: r.hash })),
            ...sharedFolders.map(id => ({ id, hash: `space-${id}` }))
        ];

        console.log('[Space Sync INIT] Active folders to observe:', activeFolders);

        activeFolders.forEach(folder => {
            if (observedRooms.current.has(folder.id)) return;
            observedRooms.current.add(folder.id);

            const isHosted = sharedFolders.includes(folder.id);
            console.log(`[Space Sync] Starting observer for folder: ${folder.id} (isHosted: ${isHosted})`);

            const ydoc = YjsService.getDoc(folder.id, 'folder');
            const manifest = ydoc.getMap('manifest');

            // Force an initial broadcast if we are the host to ensure the room matches our disk
            if (isHosted) {
                console.log(`[Space Sync] 📢 Initial broadcast for hosted folder: ${folder.id}`);
                useNoteStore.getState().broadcastFolderChange(folder.id);
            }

            const handleManifestChange = async () => {
                const remoteFiles = manifest.get('files') as Record<string, any>;
                const currentNotes = useNoteStore.getState().notes; // Use real-time state to avoid stale closure

                console.log(`[Space Sync OBSERVER] Manifest change detected for folder: ${folder.id}`);

                if (!remoteFiles) return;

                // CRITICAL: If we are the HOST, we NEVER create placeholders (ghosts) from the manifest.
                // Our local file system is the source of truth. We only listen for deletions/renames IF they happen remotely.
                // Actually, as a host, we should probably ignore the manifest entirely for CREATION,
                // because we are the one who POPULATES it via broadcastFolderChange.
                if (isHosted) {
                    console.log(`[Space Sync OBSERVER] Host mode: Skipping placeholder creation check for ${folder.id}`);
                }

                let dbChanged = false;

                // 1. Process each file in the remote manifest (Additions/Renames)
                for (const fileId of Object.keys(remoteFiles)) {
                    const remoteFile = remoteFiles[fileId];
                    const localFile = currentNotes.find(n => n.id === fileId);

                    if (!localFile && !isHosted) {
                        // GHOST HYDRATION: Create a local placeholder (ONLY FOR GUESTS)
                        console.log(`[Space Sync OBSERVER] 🆕 Creating placeholder for remote note: ${remoteFile.title} (${fileId})`);
                        try {
                            await db.notes.put({
                                id: fileId,
                                title: remoteFile.title,
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
                    } else if (localFile && localFile.title !== remoteFile.title) {
                        // RENAME SYNC: Update local title if it changed remotely
                        console.log(`[Space Sync OBSERVER] 📝 Updating title for ${fileId}: "${localFile.title}" -> "${remoteFile.title}"`);
                        await db.notes.update(fileId, { title: remoteFile.title, updatedAt: remoteFile.updatedAt || Date.now() });
                        dbChanged = true;
                    }
                }

                // 2. HANDLING DELETIONS
                // We check for local ghost notes in this folder that are NOT in the remote manifest
                const localGhostNotes = currentNotes.filter(n => n.folderId === folder.id);

                for (const note of localGhostNotes) {
                    if (!remoteFiles[note.id]) {
                        console.log(`[Space Sync OBSERVER] 🗑️ Remote deletion detected for: ${note.title} (${note.id})`);
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
            handleManifestChange();

            return () => {
                manifest.unobserve(handleManifestChange);
                observedRooms.current.delete(folder.id);
            };
        });
    }, [joinedRooms, sharedFolders]); // Removed notes.length to avoid unnecessary re-attachments
};
