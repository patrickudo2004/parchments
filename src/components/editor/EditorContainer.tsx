import React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useSyncStore } from '@/stores/syncStore';
import { RichTextEditor } from './RichTextEditor';
import { EmptyState } from './EmptyState';

export const EditorContainer: React.FC = () => {
    const { currentNote, isLocalMode } = useNoteStore();
    const { identity, activeRoom } = useSyncStore();

    // Force key change on room/mode switch to guarantee clean Tiptap mount
    const editorKey = currentNote
        ? `${currentNote.id}-${isLocalMode}-${!!activeRoom}-${identity?.publicKey?.slice(0, 10)}`
        : 'empty';

    // Only use Yjs sync when:
    // 1. In DB mode (not local mode), OR
    // 2. Actively in a single-note collaboration room
    const shouldSync = !isLocalMode || !!activeRoom;

    return (
        <div className="h-full flex flex-col bg-light-background dark:bg-dark-background relative overflow-hidden">
            {currentNote ? (
                <RichTextEditor
                    key={editorKey}
                    activeRoom={activeRoom}
                    identity={identity}
                    shouldSync={shouldSync}
                />
            ) : (
                <EmptyState />
            )}
        </div>
    );
};
