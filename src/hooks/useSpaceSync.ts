import { useEffect, useRef } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { YjsService, roomHashToId } from '@/lib/sync/YjsService';
import { db } from '@/lib/db';
import { fileSystem } from '@/lib/filesystem/FileSystemService';

/**
 * useSpaceSync is a global observer hook that keeps the local database
 * and physical files on disk in sync with the Shared Space manifests.
 *
 * TRUE MULTI-MASTER CRDT ARCHITECTURE:
 * -  Both Host and Client are equal peers. Neither is the "source of truth".
 * -  The manifest Y.Map stores individual noteId keys (not a single 'files' blob).
 * -  When ANY device creates a note, it adds its noteId to the Y.Map.
 * -  When ANY device deletes a note, it removes its noteId from the Y.Map.
 * -  Both devices observe the Y.Map keys and react to additions/deletions.
 * -  For the Desktop host (local mode), changes are physically written to and deleted from disk.
 */
export const useSpaceSync = () => {
    const { joinedRooms, sharedFolders, pairedDeviceName } = useSyncStore();
    const observedRooms = useRef<Set<string>>(new Set());
    const activeObservers = useRef<Map<string, () => void>>(new Map());
    const writeTimeouts = useRef<Record<string, any>>({});

    const debounceDiskWrite = (fileId: string, handle: any, content: string) => {
        if (writeTimeouts.current[fileId]) {
            clearTimeout(writeTimeouts.current[fileId]);
        }
        writeTimeouts.current[fileId] = setTimeout(async () => {
            try {
                console.log(`[Space Sync FLUSHER] 💾 Flushing Yjs updates for ${fileId} directly to disk...`);
                
                // Read existing content to preserve metadata comment if present
                let rawContent = '';
                try {
                    rawContent = await fileSystem.readFile(handle) as string;
                } catch (readError) {
                    console.log(`[Space Sync FLUSHER] Could not read existing file for metadata preservation:`, readError);
                }

                let meta: any = { id: fileId, createdAt: Date.now() };
                const metaMatch = rawContent.match(/<!--\s*parchments-meta:\s*(.*?)\s*-->/);
                if (metaMatch && metaMatch[1]) {
                    try {
                        meta = JSON.parse(metaMatch[1]);
                    } catch (e) {
                        console.warn('[Space Sync FLUSHER] Failed to parse existing metadata:', e);
                    }
                }

                // Supplement with notes list metadata if available
                const storeNote = useNoteStore.getState().notes.find(n => n.id === fileId);
                if (storeNote) {
                    if (storeNote.createdAt) meta.createdAt = storeNote.createdAt;
                    if (storeNote.type === 'voice' && storeNote.transcript) meta.transcript = storeNote.transcript;
                }

                let portableContent = useNoteStore.getState().dehydrateAssets(content);
                const metaTag = `\n<!-- parchments-meta: ${JSON.stringify(meta)} -->`;
                if (portableContent.includes('parchments-meta:')) {
                    portableContent = portableContent.replace(/<!--\s*parchments-meta:.*?\s*-->/, `<!-- parchments-meta: ${JSON.stringify(meta)} -->`);
                } else {
                    portableContent += metaTag;
                }

                await fileSystem.writeFile(handle, portableContent);
                delete writeTimeouts.current[fileId];
            } catch (e) {
                console.error(`[Space Sync FLUSHER] Failed to flush to disk for ${fileId}:`, e);
            }
        }, 1500);
    };

    const deleteLocalFile = async (fileId: string) => {
        const { localFiles, localDirectoryHandle, refreshLocalFiles } = useNoteStore.getState();
        const item = localFiles.find(lf => lf.id === fileId && lf.kind === 'file');
        if (item && localDirectoryHandle) {
            try {
                let parentHandle = localDirectoryHandle;
                if (item.parentId && item.parentId !== 'global-root') {
                    const parent = localFiles.find(f => f.id === item.parentId && f.kind === 'directory');
                    if (parent) parentHandle = parent.handle as any;
                }
                console.log(`[Space Sync OBSERVER] 🗑️ Physically deleting file from disk: ${item.name}`);
                await fileSystem.deleteEntry(parentHandle, item.name);
                await refreshLocalFiles();
            } catch (e) {
                console.error('[Space Sync OBSERVER] Failed to delete local file from disk:', e);
            }
        }
    };

    useEffect(() => {
        console.log('[Space Sync INIT] useSpaceSync running (Multi-Master mode)');

        // Find all folders we should be observing (both hosted and joined)
        const activeFolders = [
            ...joinedRooms.filter(r => r.type === 'folder').map(r => ({ id: roomHashToId(r.hash), hash: r.hash, isHosted: false })),
            ...sharedFolders.map(id => ({ id, hash: `space-${id}`, isHosted: true }))
        ].filter(f => f.id); // Remove any null IDs

        // Automatically register the virtual global-root room if device is paired
        if (pairedDeviceName && !activeFolders.some(f => f.id === 'global-root')) {
            activeFolders.push({ id: 'global-root', hash: 'space-global-root', isHosted: true });
        }

        console.log('[Space Sync INIT] Active folders to observe:', activeFolders);

        const cleanupFns: (() => void)[] = [];

        activeFolders.forEach(folder => {
            if (!folder.id || observedRooms.current.has(folder.id)) return;
            observedRooms.current.add(folder.id);

            console.log(`[Space Sync] Starting observer for folder: ${folder.id} (isHosted: ${folder.isHosted})`);

            const ydoc = YjsService.getDoc(folder.id, 'folder');
            const manifest = ydoc.getMap('manifest');

            // ALL peers broadcast their current notes on startup to populate the shared map.
            console.log(`[Space Sync] 📢 Initial broadcast for folder: ${folder.id}`);
            useNoteStore.getState().broadcastFolderChange(folder.id === 'global-root' ? null : folder.id);

            const handleManifestChange = async () => {
                const { notes, isLocalMode, localFiles, createLocalNote, refreshLocalFiles } = useNoteStore.getState();
                console.log(`[Space Sync OBSERVER] Manifest change detected for folder: ${folder.id}`);

                // ── 0. UNPAIR EVENT PROPAGATION ────────────────────────────────────
                if (folder.id === 'global-root') {
                    const unpairEvent = manifest.get('unpaired_event') as any;
                    if (unpairEvent && unpairEvent.timestamp && Date.now() - unpairEvent.timestamp < 10000) {
                        const { pairedDeviceName, setPairedDeviceName } = useSyncStore.getState();
                        if (pairedDeviceName) {
                            console.log(`[Space Sync OBSERVER] 🚨 Received remote unpaired_event from ${unpairEvent.sender}! Cleanly unpairing...`);
                            try {
                                YjsService.disconnectAll();
                            } catch (e) {
                                console.error('[Space Sync OBSERVER] Error disconnecting providers during remote unpair:', e);
                            }
                            setPairedDeviceName(null);
                            const { joinedRooms, removeJoinedRoom } = useSyncStore.getState();
                            joinedRooms.forEach(room => {
                                if (room.hash.startsWith('space-')) {
                                    removeJoinedRoom(room.hash);
                                }
                            });
                            useUIStore.getState().showToast(`Device unpaired by remote peer ${unpairEvent.sender}`, 'info');
                            return; // Stop processing further changes
                        }
                    }
                }

                let dbChanged = false;

                const reservedKeys = new Set(['lastUpdated', 'files', 'unpaired_event']);
                const remoteNoteIds = new Set<string>();
                const remoteFiles: Record<string, any> = {};

                manifest.forEach((value, key) => {
                    if (reservedKeys.has(key)) return;
                    remoteNoteIds.add(key);
                    remoteFiles[key] = value;
                });

                // ── 1. ADDITION / RENAME SYNC ─────────────────────────────────────
                for (const fileId of remoteNoteIds) {
                    const remoteFile = remoteFiles[fileId];
                    if (!remoteFile) continue;

                    const localNote = notes.find(n => n.id === fileId);
                    const localDiskFile = localFiles.find(f => f.id === fileId);

                    // Check both DB and physical disk depending on mode
                    const existsLocally = isLocalMode ? !!localDiskFile : !!localNote;

                    if (!existsLocally) {
                        // GHOST HYDRATION
                        console.log(`[Space Sync OBSERVER] 🆕 Creating remote note locally: "${remoteFile.title}" (${fileId})`);
                        try {
                            if (isLocalMode) {
                                // Physically create file on local hard disk
                                const parentId = folder.id === 'global-root' ? null : folder.id;
                                await createLocalNote(remoteFile.title || 'Untitled', parentId, '', fileId);
                                await refreshLocalFiles();
                            } else {
                                // Create placeholder inside IndexedDB
                                await db.notes.put({
                                    id: fileId,
                                    title: remoteFile.title || 'Untitled',
                                    content: '',
                                    folderId: folder.id === 'global-root' ? null : folder.id,
                                    tags: [],
                                    type: remoteFile.type || 'text',
                                    transcript: remoteFile.transcript || undefined,
                                    duration: remoteFile.duration || undefined,
                                    createdAt: Date.now(),
                                    updatedAt: remoteFile.updatedAt || Date.now()
                                });
                                dbChanged = true;
                            }
                        } catch (error) {
                            console.error(`[Space Sync OBSERVER] ❌ Failed to create local placeholder for ${fileId}:`, error);
                        }
                    } else if (localNote && localNote.title !== remoteFile.title && remoteFile.title) {
                        // RENAME SYNC: Update local title if it changed on another peer
                        console.log(`[Space Sync OBSERVER] 📝 Syncing title for ${fileId}: "${localNote.title}" -> "${remoteFile.title}"`);
                        await db.notes.update(fileId, { title: remoteFile.title, updatedAt: remoteFile.updatedAt || Date.now() });
                        dbChanged = true;
                    }

                    // ── 1.5. CONTENT BACKFILL / RECONCILIATION FLOW ─────────────────────
                    const noteDoc = YjsService.getDoc(fileId, 'note');
                    const contentText = noteDoc.getText('content');

                    if (contentText.toString() === '') {
                        let localContent = '';
                        if (isLocalMode && localDiskFile) {
                            try {
                                const raw = await fileSystem.readFile(localDiskFile.handle as any) as string;
                                // Strip metadata comments
                                localContent = raw.replace(/<!--\s*parchments-meta:.*?\s*-->/g, '').trim();
                            } catch (readErr) {
                                console.error(`[Space Sync RECONCILER] Failed to read disk file ${fileId} for backfill:`, readErr);
                            }
                        } else if (!isLocalMode && localNote && localNote.content) {
                            localContent = localNote.content;
                        }

                        if (localContent) {
                            console.log(`[Space Sync RECONCILER] 🌱 Backfilling empty YDoc for ${fileId} using local content...`);
                            noteDoc.transact(() => {
                                contentText.insert(0, localContent);
                            }, 'reconciliation-backfill');
                        }
                    }

                    // ── 1.8. BACKGROUND REAL-TIME FLUSHERS ──────────────────────────────
                    if (!activeObservers.current.has(fileId)) {
                        if (isLocalMode) {
                            // Desktop Flusher: keep physical disk files updated
                            const textObserver = () => {
                                const { localFiles: currentLocalFiles } = useNoteStore.getState();
                                const fileItem = currentLocalFiles.find(lf => lf.id === fileId);
                                if (fileItem && fileItem.handle) {
                                    debounceDiskWrite(fileId, fileItem.handle, contentText.toString());
                                }
                            };

                            contentText.observe(textObserver);
                            activeObservers.current.set(fileId, () => {
                                contentText.unobserve(textObserver);
                            });
                        } else {
                            // Mobile Flusher: keep IndexedDB and Zustand store updated silently in real-time
                            const dbObserver = async () => {
                                const newContent = contentText.toString();
                                const store = useNoteStore.getState();
                                
                                const updatedNotes = store.notes.map(n => {
                                    if (n.id === fileId) {
                                        return { ...n, content: newContent, updatedAt: Date.now() };
                                    }
                                    return n;
                                });
                                
                                useNoteStore.setState({
                                    notes: updatedNotes,
                                    currentNote: store.currentNote?.id === fileId
                                        ? { ...store.currentNote, content: newContent, updatedAt: Date.now() }
                                        : store.currentNote
                                });

                                try {
                                    await db.notes.update(fileId, {
                                        content: newContent,
                                        updatedAt: Date.now()
                                    });
                                } catch (e) {
                                    console.error(`[Space Sync FLUSHER MOBILE] Background DB update failed for ${fileId}:`, e);
                                }
                            };

                            contentText.observe(dbObserver);
                            activeObservers.current.set(fileId, () => {
                                contentText.unobserve(dbObserver);
                            });
                        }
                    }
                }

                // ── 2. DELETION SYNC ──────────────────────────────────────────────
                if (isLocalMode) {
                    // Check for deletion on disk
                    const localDiskNotes = localFiles.filter(f => f.kind === 'file' && (f.parentId === folder.id || (!f.parentId && folder.id === 'global-root')));
                    for (const diskFile of localDiskNotes) {
                        const matchingNote = notes.find(n => n.id === diskFile.id);
                        const isGhost = !matchingNote || matchingNote.content === '';
                        if (!remoteNoteIds.has(diskFile.id) && remoteNoteIds.size > 0 && isGhost) {
                            console.log(`[Space Sync OBSERVER] 🗑️ Remote deletion detected, deleting from disk: "${diskFile.name}"`);
                            await deleteLocalFile(diskFile.id);
                        }
                    }
                } else {
                    // Check for deletion in IndexedDB
                    const localNotesInFolder = notes.filter(n => n.folderId === folder.id || (!n.folderId && folder.id === 'global-root'));
                    for (const note of localNotesInFolder) {
                        if (!remoteNoteIds.has(note.id) && remoteNoteIds.size > 0 && note.content === '') {
                            console.log(`[Space Sync OBSERVER] 🗑️ Remote deletion detected: "${note.title}" (${note.id})`);
                            await db.notes.delete(note.id);
                            dbChanged = true;
                        }
                    }
                }

                if (dbChanged) {
                    console.log(`[Space Sync OBSERVER] 🔄 Reloading notes due to DB changes`);
                    useNoteStore.getState().loadNotes();
                }
            };

            manifest.observe(handleManifestChange);
            handleManifestChange();

            cleanupFns.push(() => {
                manifest.unobserve(handleManifestChange);
                observedRooms.current.delete(folder.id);
            });
        });

        return () => {
            cleanupFns.forEach(fn => fn());
            // Unsubscribe all active text observers to prevent leaks
            activeObservers.current.forEach(unsubscribe => unsubscribe());
            activeObservers.current.clear();
        };
    }, [joinedRooms, sharedFolders, pairedDeviceName]);
};
