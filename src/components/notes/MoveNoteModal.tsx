import React from 'react';
import { useNoteStore, normalizeFsPath } from '@/stores/noteStore';
import { Folder, HardDrive, Database, X, Check, ArrowRight } from 'lucide-react';

interface MoveNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    noteTitle: string;
}

export const MoveNoteModal: React.FC<MoveNoteModalProps> = ({
    isOpen,
    onClose,
    noteId,
    noteTitle,
}) => {
    const { isLocalMode, localFiles, folders, moveNote, currentNote } = useNoteStore();
    const [isMoving, setIsMoving] = React.useState(false);

    if (!isOpen) return null;

    // Available target destinations
    const destinations: { id: string | null; name: string; isRoot?: boolean }[] = [];

    // Root destination
    destinations.push({
        id: null,
        name: isLocalMode ? 'Root Studyspace Folder' : 'Workspace Root',
        isRoot: true,
    });

    if (isLocalMode) {
        const dirs = localFiles
            .filter(f => f.kind === 'directory')
            .sort((a, b) => a.name.localeCompare(b.name));
        for (const d of dirs) {
            destinations.push({
                id: d.id,
                name: d.name,
                isRoot: false,
            });
        }
    } else {
        const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
        for (const f of sortedFolders) {
            destinations.push({
                id: f.id,
                name: f.name,
                isRoot: false,
            });
        }
    }

    const currentFolderId = currentNote?.id === noteId ? currentNote.folderId : null;

    const handleSelectDestination = async (destId: string | null) => {
        setIsMoving(true);
        try {
            await moveNote(noteId, destId);
            onClose();
        } finally {
            setIsMoving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Move note to folder"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                    <div className="min-w-0 flex-1 pr-2">
                        <h3 className="text-sm font-bold truncate text-light-text-primary dark:text-dark-text-primary">
                            Move Note
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate opacity-75">
                            "{noteTitle}"
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-light-text-secondary hover:text-light-text-primary dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Destination List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-light-text-disabled px-2 mb-1">
                        Select Destination Folder
                    </p>
                    {destinations.map((dest) => {
                        const isCurrent = isLocalMode
                            ? normalizeFsPath(dest.id) === normalizeFsPath(currentFolderId)
                            : dest.id === currentFolderId;

                        return (
                            <button
                                key={dest.id || 'root'}
                                disabled={isMoving || isCurrent}
                                onClick={() => handleSelectDestination(dest.id)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all touch-manipulation ${
                                    isCurrent
                                        ? 'bg-light-background/60 dark:bg-dark-background/60 opacity-50 cursor-not-allowed'
                                        : 'hover:bg-primary/10 hover:text-primary cursor-pointer active:scale-[0.98]'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="p-1.5 rounded-lg bg-light-background dark:bg-dark-background text-primary shrink-0">
                                        {dest.isRoot ? (
                                            isLocalMode ? <HardDrive size={14} /> : <Database size={14} />
                                        ) : (
                                            <Folder size={14} />
                                        )}
                                    </div>
                                    <span className="truncate font-medium">
                                        {dest.name}
                                    </span>
                                </div>
                                {isCurrent ? (
                                    <span className="text-[10px] text-light-text-disabled shrink-0 flex items-center gap-1">
                                        <Check size={12} /> Current
                                    </span>
                                ) : (
                                    <ArrowRight size={13} className="text-light-text-disabled shrink-0 opacity-40" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
