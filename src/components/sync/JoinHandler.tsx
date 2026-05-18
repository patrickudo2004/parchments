import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { Loader2 } from 'lucide-react';
import { roomHashToId } from '@/lib/sync/YjsService';

export const JoinHandler: React.FC = () => {
    const navigate = useNavigate();
    const { joinRoom, addJoinedRoom } = useSyncStore();
    const { showToast } = useUIStore();

    // Manually extract hash from /join/HASH
    const pathParts = window.location.pathname.split('/join/');
    const roomHash = pathParts.length > 1 ? pathParts[1] : null;

    const isJoining = React.useRef(false);

    useEffect(() => {
        const handleJoin = async () => {
            if (!roomHash || isJoining.current) return;
            isJoining.current = true;

            const isFolderSpace = roomHash.startsWith('space-');
            const roomType = isFolderSpace ? 'folder' : 'note';

            showToast(`Connecting to ${roomType} study room...`, 'info');

            // Try to extract an initial title from the hash
            const titleMatch = roomHash.match(/-([^-]+)$/);
            const initialTitle = titleMatch ? decodeURIComponent(titleMatch[1]) : undefined;

            // Pin the room to the sidebar
            addJoinedRoom(roomHash, initialTitle, roomType);
            joinRoom(roomHash, roomType);

            if (isFolderSpace) {
                // For folders, we extract the folderId
                const remoteFolderId = roomHashToId(roomHash);

                if (remoteFolderId) {
                    const { folders, createFolder } = useNoteStore.getState();
                    const existingFolder = folders.find(f => f.id === remoteFolderId);

                    if (!existingFolder) {
                        try {
                            const name = remoteFolderId.replace(/-/g, ' ');
                            await createFolder(name || 'Shared Space', remoteFolderId);
                            showToast('Joined shared space', 'success');
                        } catch (err) {
                            console.error('Failed to create room folder:', err);
                        }
                    }
                }
            } else {
                // Note sync logic
                const parts = roomHash.split('-');
                const encodedNoteId = parts.slice(2).join('-'); // p-[vault]-noteId
                const remoteNoteId = decodeURIComponent(encodedNoteId);

                if (remoteNoteId) {
                    const { notes, setCurrentNote, createNote } = useNoteStore.getState();
                    let existingNote = notes.find((n: any) => n.id === remoteNoteId);

                    if (!existingNote) {
                        const { db } = await import('@/lib/db');
                        existingNote = await db.notes.get(remoteNoteId);
                    }

                    if (existingNote) {
                        setCurrentNote(existingNote);
                    } else {
                        const noteTitle = remoteNoteId.replace(/\.html$/, '').replace(/-/g, ' ');
                        const displayTitle = noteTitle.split(' ').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');

                        try {
                            const newNote = await createNote(null, displayTitle || 'Shared Note', remoteNoteId);
                            if (newNote) setCurrentNote(newNote);
                            showToast('Joined collaborative session', 'success');
                        } catch (err) {
                            console.error('Failed to create room note:', err);
                            showToast('Failed to join room', 'error');
                        }
                    }
                }
            }

            // Small delay to ensure state propagates before navigation
            setTimeout(() => {
                navigate('/app', { replace: true });
            }, 500);
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
