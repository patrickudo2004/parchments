import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { db } from '@/lib/db';
import { YjsService } from './YjsService';

export class PlanSyncManager {
    private static providers: Map<string, WebrtcProvider> = new Map();
    private static docs: Map<string, Y.Doc> = new Map();
    private static observedNotes: Set<string> = new Set();

    /**
     * Joins a P2P sync room for a reading plan.
     */
    static async joinPlanRoom(roomHash: string) {
        if (this.providers.has(roomHash)) {
            console.log(`[PlanSyncManager] Already connected to plan room: ${roomHash}`);
            return this.docs.get(roomHash)!;
        }

        console.log(`[PlanSyncManager] 🔄 Connecting to WebRTC Plan sync room: ${roomHash}`);
        
        const doc = new Y.Doc();
        this.docs.set(roomHash, doc);

        const signalingServers = [
            'wss://parchments-signaling.patrickudo2004.deno.net'
        ];

        const provider = new WebrtcProvider(`parchment-v1-${roomHash}`, doc, {
            signaling: signalingServers
        });

        this.providers.set(roomHash, provider);

        // Define Yjs collections
        const metadata = doc.getMap('metadata');
        const history = doc.getArray('history');
        const notesMap = doc.getMap('notes');

        // 1. Sync handler: Ingest plan metadata and write plan.json on updates
        metadata.observe(async () => {
            const planId = metadata.get('id') as string;
            const planName = metadata.get('name') as string;
            if (!planId || !planName) return;

            console.log(`[PlanSyncManager] 📥 Syncing discovered metadata for plan: ${planName}`);
            const { useNoteStore } = await import('@/stores/noteStore');
            const { useReadingPlanStore, sanitizePathName } = await import('@/stores/readingPlanStore');
            
            const noteStoreState = useNoteStore.getState();
            const isLocalMode = noteStoreState.isLocalMode;

            let targetFolderId = null;

            if (isLocalMode && noteStoreState.localDirectoryHandle) {
                // Ensure physical plan folders exist recursively
                let parentFolder = noteStoreState.localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                if (!parentFolder) {
                    await noteStoreState.createLocalFolder('Lectio Study Journals', null);
                    parentFolder = useNoteStore.getState().localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                }

                if (parentFolder) {
                    const sanitizedPlanName = sanitizePathName(planName);
                    let subFolder = useNoteStore.getState().localFiles.find(
                        f => f.name === sanitizedPlanName && f.parentId === parentFolder!.id && f.kind === 'directory'
                    );
                    if (!subFolder) {
                        await noteStoreState.createLocalFolder(sanitizedPlanName, parentFolder.id);
                        subFolder = useNoteStore.getState().localFiles.find(
                            f => f.name === sanitizedPlanName && f.parentId === parentFolder!.id && f.kind === 'directory'
                        );
                    }
                    targetFolderId = subFolder ? subFolder.id : parentFolder.id;
                }
            }

            // Ingest/update plan in db
            const planData = {
                id: planId,
                name: planName,
                startDate: metadata.get('startDate') as number,
                endDate: metadata.get('endDate') as number,
                status: (metadata.get('status') || 'active') as 'active' | 'completed',
                tracks: metadata.get('tracks') as any[],
                folderId: targetFolderId
            };

            await db.readingPlans.put(planData);
            await useReadingPlanStore.getState().loadPlans();

            // Trigger physical plan.json flusher
            if (isLocalMode) {
                import('@/stores/readingPlanStore').then(({ updateLocalPlanJson }) => {
                    updateLocalPlanJson(planData);
                });
            }
        });

        // 2. Sync handler: Ingest reading history
        history.observe(async () => {
            const list = history.toArray();
            console.log(`[PlanSyncManager] 📥 Syncing plan history records: ${list.length} entries`);
            
            for (const item of list) {
                const record = item as any;
                if (record && record.id) {
                    const existingRec = await db.readingPlanHistory.get(record.id);
                    if (!existingRec || record.completedAt > existingRec.completedAt) {
                        await db.readingPlanHistory.put(record);
                    }
                }
            }
            
            const { useReadingPlanStore } = await import('@/stores/readingPlanStore');
            await useReadingPlanStore.getState().loadPlans();
        });

        // 3. Sync handler: Recursive notes synchronization
        notesMap.observe(async () => {
            const notesList = notesMap.toJSON();
            console.log(`[PlanSyncManager] 📥 Syncing linked note manifest. Discovery size:`, Object.keys(notesList).length);

            const { useNoteStore } = await import('@/stores/noteStore');
            const noteStoreState = useNoteStore.getState();
            const isLocalMode = noteStoreState.isLocalMode;

            for (const [noteId, meta] of Object.entries(notesList)) {
                const noteMeta = meta as any;
                
                // If we are already active observer on this note, skip
                if (this.observedNotes.has(noteId)) continue;

                // Check if note exists in IndexedDB library
                const existingNote = await db.notes.get(noteId);
                if (existingNote) continue;

                this.observedNotes.add(noteId);

                // Spin up temporary WebRTC connection to sync the missing note contents
                console.log(`[PlanSyncManager] 🔄 Replicating missing daily note over WebRTC: ${noteMeta.title}`);
                const noteDoc = YjsService.getDoc(noteId);
                
                const handleNoteSync = async () => {
                    const contentText = noteDoc.getText('content').toString();
                    if (!contentText) return; // Wait for contents to propagate

                    console.log(`[PlanSyncManager] 📥 Merged text for: ${noteMeta.title}`);
                    const timestamp = Date.now();

                    if (isLocalMode && noteStoreState.localDirectoryHandle) {
                        const { sanitizePathName } = await import('@/stores/readingPlanStore');
                        const planName = metadata.get('name') as string;
                        
                        let parentFolder = noteStoreState.localFiles.find(f => f.name === 'Lectio Study Journals' && f.kind === 'directory');
                        let targetFolderId = null;

                        if (parentFolder && planName) {
                            const sanitizedPlanName = sanitizePathName(planName);
                            const subFolder = useNoteStore.getState().localFiles.find(
                                f => f.name === sanitizedPlanName && f.parentId === parentFolder!.id && f.kind === 'directory'
                            );
                            targetFolderId = subFolder ? subFolder.id : parentFolder.id;
                        }

                        const name = noteMeta.title.endsWith('.html') ? noteMeta.title : `${noteMeta.title}.html`;
                        
                        // Write note physically inside subdirectory
                        await noteStoreState.createLocalNote(name, targetFolderId, contentText, noteId);
                    } else {
                        // Write note in database
                        await db.notes.put({
                            id: noteId,
                            title: noteMeta.title,
                            content: contentText,
                            createdAt: noteMeta.createdAt || timestamp,
                            updatedAt: timestamp,
                            folderId: metadata.get('folderId') as string || null,
                            tags: ['lectio'],
                            type: 'text'
                        });
                    }

                    // Detach sync watcher once note is replicated physically
                    noteDoc.getText('content').unobserve(handleNoteSync);
                    YjsService.destroyDoc(noteId);
                    console.log(`[PlanSyncManager] ✅ Sibling note replication complete: ${noteMeta.title}`);
                };

                noteDoc.getText('content').observe(handleNoteSync);
                
                // Fallback: Destroy temporary sync doc if no peer transfers contents in 15 seconds
                setTimeout(() => {
                    noteDoc.getText('content').unobserve(handleNoteSync);
                }, 15000);
            }
        });

        return doc;
    }

    /**
     * Broadcasts current plan updates to the plan's sync room.
     */
    static async broadcastPlanUpdate(planId: string) {
        const { identity } = useSyncStore.getState();
        const roomHash = identity 
            ? `plan-sync-${identity.vaultHash.slice(0, 8)}-${planId}`
            : `plan-sync-local-${planId}`;

        const doc = this.docs.get(roomHash);
        if (!doc) return;

        const plan = await db.readingPlans.get(planId);
        if (!plan) return;

        console.log(`[PlanSyncManager] 📤 Broadcasting plan update to room: ${roomHash}`);

        // Update shared metadata map
        const metadata = doc.getMap('metadata');
        doc.transact(() => {
            metadata.set('id', plan.id);
            metadata.set('name', plan.name);
            metadata.set('startDate', plan.startDate);
            metadata.set('endDate', plan.endDate);
            metadata.set('status', plan.status);
            metadata.set('tracks', plan.tracks);
        });

        // Update shared history array
        const historyArray = doc.getArray('history');
        const localHistory = await db.readingPlanHistory.where('planId').equals(planId).toArray();
        
        doc.transact(() => {
            historyArray.delete(0, historyArray.length);
            historyArray.push(localHistory);
        });

        // Update shared notes map
        const notesMap = doc.getMap('notes');
        const { notes } = await getPlanMetadataAndHistory(planId);
        
        doc.transact(() => {
            for (const [noteId, meta] of Object.entries(notes)) {
                notesMap.set(noteId, meta);
            }
        });
    }

    static leavePlanRoom(roomHash: string) {
        const provider = this.providers.get(roomHash);
        if (provider) {
            provider.destroy();
            this.providers.delete(roomHash);
        }

        const doc = this.docs.get(roomHash);
        if (doc) {
            doc.destroy();
            this.docs.delete(roomHash);
        }
    }
}

// Helpers for plan sync compilation
const getPlanMetadataAndHistory = async (planId: string) => {
    const history = await db.readingPlanHistory.where('planId').equals(planId).toArray();
    const notes: Record<string, any> = {};
    
    for (const record of history) {
        if (record.noteId) {
            const note = await db.notes.get(record.noteId);
            if (note) {
                notes[record.noteId] = {
                    title: note.title,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt
                };
            }
        }
    }
    return { history, notes };
};

// Hook up identity state
import { useSyncStore } from '@/stores/syncStore';
