import React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useSyncStore } from '@/stores/syncStore';
import { RichTextEditor } from './RichTextEditor';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AlertCircle } from 'lucide-react';

export const EditorContainer: React.FC = () => {
    const { currentNote, isLocalMode, setCurrentNote } = useNoteStore();
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
            <ErrorBoundary
                key={editorKey}
                fallback={
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                            <AlertCircle size={28} />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                Unable to display note
                            </h3>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary max-w-sm leading-relaxed">
                                An unexpected error occurred while loading this note or rendering its media.
                            </p>
                        </div>
                        <button
                            onClick={() => setCurrentNote(null)}
                            className="px-4 py-2 bg-primary text-[#121212] font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
                        >
                            Return to Notes
                        </button>
                    </div>
                }
            >
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
            </ErrorBoundary>
        </div>
    );
};
