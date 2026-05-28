import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { Loader2 } from 'lucide-react';
import { YjsService } from '@/lib/sync/YjsService';

export const JoinHandler: React.FC = () => {
    const navigate = useNavigate();
    const { joinRoom, addJoinedRoom } = useSyncStore();
    const { showToast } = useUIStore();

    // Manually extract hash from /join/HASH
    const pathParts = window.location.pathname.split('/join/');
    const roomHash = pathParts.length > 1 ? pathParts[1] : null;

    // Parse the ?title= search parameter for display name
    const urlTitle = new URLSearchParams(window.location.search).get('title') || undefined;

    const isJoining = React.useRef(false);

    useEffect(() => {
        const handleJoin = async () => {
            if (!roomHash || isJoining.current) return;
            isJoining.current = true;

            showToast('Connecting to collaborative session...', 'info');

            // Format of roomHash: 'local-[encodedId]' or 'p-[vault]-[encodedId]'
            const parts = roomHash.split('-');
            const startIndex = roomHash.startsWith('local-') ? 1 : 2;
            const encodedNoteId = parts.slice(startIndex).join('-');
            const remoteNoteId = decodeURIComponent(encodedNoteId);

            if (!remoteNoteId) {
                showToast('Invalid room link', 'error');
                navigate('/app', { replace: true });
                return;
            }

            // 1. Join WebRTC Room via Store
            addJoinedRoom(roomHash, urlTitle || 'Shared Note', 'note');
            joinRoom(roomHash, 'note');

            // 2. SAFE SYNC HANDSHAKE
            // Initiate Yjs Doc to trigger WebRTC signaling connection
            const doc = YjsService.getDoc(remoteNoteId);
            
            // Wait for WebRTC Provider to fully sync remote edits
            const waitForSync = () => {
                return new Promise<void>((resolve) => {
                    const provider = YjsService.getProvider(remoteNoteId);
                    
                    // If already synced and connected, resolve immediately
                    if (provider && provider.connected && provider.synced) {
                        resolve();
                        return;
                    }
                    
                    let resolved = false;
                    const handleSynced = () => {
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    };
                    
                    if (provider) {
                        provider.on('synced', handleSynced);
                        // Fallback timeout after 3.5 seconds to proceed anyway
                        setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                provider.off('synced', handleSynced);
                                resolve();
                            }
                        }, 3500);
                    } else {
                        // Let IndexedDB persistence finish loading
                        const persistence = YjsService.getPersistence(remoteNoteId);
                        if (persistence) {
                            persistence.whenSynced.then(() => resolve());
                        } else {
                            resolve();
                        }
                    }
                });
            };

            await waitForSync();

            // 3. Extract Synced Content (Strictly preventing blank overwrites)
            const contentText = doc.getText('content').toString();
            const metadata = YjsService.getMetadata(remoteNoteId);
            const syncedTitle = metadata ? metadata.get('title') as string : null;
            const displayTitle = syncedTitle || urlTitle || 'Shared Note';

            const { notes, setCurrentNote, isLocalMode, createLocalNote, refreshLocalFiles } = useNoteStore.getState();
            let existingNote = notes.find((n: any) => n.id === remoteNoteId);

            if (!existingNote) {
                const { db } = await import('@/lib/db');
                existingNote = await db.notes.get(remoteNoteId);
            }

            if (existingNote) {
                // If it already exists in the library, open it immediately
                setCurrentNote(existingNote);
                showToast('Opened collaborative note', 'success');
            } else {
                if (isLocalMode) {
                    // Desktop local mode: Save directly to disk, using full synced content
                    try {
                        const name = displayTitle.endsWith('.html') ? displayTitle : `${displayTitle}.html`;
                        // Create physical disk file with the remote text, avoiding empty files
                        await createLocalNote(name, null, contentText, remoteNoteId);
                        await refreshLocalFiles();
                        showToast('Note synced and saved to Studyspace', 'success');
                    } catch (err) {
                        console.error('Failed to create local disk note:', err);
                        // Fallback to in-memory preview
                        const tempNote = {
                            id: remoteNoteId,
                            title: displayTitle,
                            content: contentText,
                            folderId: null,
                            tags: [],
                            type: 'text' as const,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            isSharedPlaceholder: true
                        };
                        setCurrentNote(tempNote);
                    }
                } else {
                    // Mobile view: Load as an in-memory collaborative preview.
                    // The mobile user is prompted to tap "Save to Folder" to save it permanently.
                    const tempNote = {
                        id: remoteNoteId,
                        title: displayTitle,
                        content: contentText,
                        folderId: null,
                        tags: [],
                        type: 'text' as const,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        isSharedPlaceholder: true
                    };
                    setCurrentNote(tempNote);
                    showToast('Joined collaboration session', 'success');
                }
            }

            // Small delay to ensure state propagates before navigating to the app workspace
            setTimeout(() => {
                navigate('/app', { replace: true });
            }, 300);
        };

        handleJoin();
    }, [roomHash, joinRoom, navigate, showToast, addJoinedRoom]);

    return (
        <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-light-background dark:bg-dark-background">
            <Loader2 size={48} className="text-primary animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest opacity-50">Entering Study Room...</p>
        </div>
    );
};
