import { useEffect, useRef } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { YjsService } from '@/lib/sync/YjsService';
import { fileSystem } from '@/lib/filesystem/FileSystemService';

/**
 * useSpaceSync is a global observer hook that keeps the physical files on disk
 * in sync with real-time collaborative updates for the active note.
 */
export const useSpaceSync = () => {
    const { currentNote, isLocalMode, currentFileHandle, dehydrateAssets } = useNoteStore();
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

                let portableContent = dehydrateAssets(content);
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

    useEffect(() => {
        if (!currentNote || !isLocalMode || !currentFileHandle) return;

        const fileId = currentNote.id;
        console.log(`[Space Sync] Starting observer for active note: ${fileId}`);

        const noteDoc = YjsService.getDoc(fileId);
        const contentText = noteDoc.getText('content');

        const textObserver = () => {
            const { currentNote: activeNote, currentFileHandle: activeHandle } = useNoteStore.getState();
            if (activeNote?.id === fileId && activeHandle) {
                debounceDiskWrite(fileId, activeHandle, contentText.toString());
            }
        };

        contentText.observe(textObserver);

        return () => {
            console.log(`[Space Sync] Stopping observer for note: ${fileId}`);
            contentText.unobserve(textObserver);
            if (writeTimeouts.current[fileId]) {
                clearTimeout(writeTimeouts.current[fileId]);
                delete writeTimeouts.current[fileId];
            }
        };
    }, [currentNote, isLocalMode, currentFileHandle]);
};
