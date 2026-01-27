import React, { useState } from 'react';
import {
    Folder,
    FolderOpen,
    FileText,
    FilePlus,
    Mic,
    FolderPlus,
    Trash2,
    Upload,
    ChevronRight,
    ChevronDown,
    AlertTriangle
} from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useUIStore } from '@/stores/uiStore';
import { PenTool, Pin } from 'lucide-react';
import { useResearchStore } from '@/stores/researchStore';


export const FilesSidebar: React.FC = () => {
    const {
        setCurrentNote, createNote, createVoiceNote, createFolder,
        notes, folders, deleteNote, deleteFolder,
        isLocalMode, localFiles, openLocalFolder, openLocalFile,
        createLocalFolder,
        hasStudyspace
    } = useNoteStore();
    const { toggleTemplateModal } = useUIStore();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();
    const [showRecorder, setShowRecorder] = useState(false);
    // ... rest same ...
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [deleteConfig, setDeleteConfig] = useState<{
        isOpen: boolean;
        targetId: string;
        targetType: 'file' | 'folder';
        targetName: string;
    }>({
        isOpen: false,
        targetId: '',
        targetType: 'file',
        targetName: '',
    });

    const toggleFolder = (e: React.MouseEvent, folderId: string) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const handleItemClick = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        if (item.kind === 'file' || item.type === 'file') {
            if (isLocalMode) {
                openLocalFile(item);
            } else {
                const note = notes.find(n => n.id === item.id);
                if (note) {
                    setCurrentNote(note);
                }
            }
        } else if (item.kind === 'directory' || item.type === 'folder') {
            setSelectedFolderId(prev => (prev === item.id ? null : item.id));
        }
    };

    const handleCreateNote = async () => {
        await createNote(selectedFolderId);
    };

    const handleCreateFolder = async () => {
        if (isLocalMode) {
            const name = prompt('Enter folder name:');
            if (name) {
                await createLocalFolder(name, selectedFolderId);
            }
        } else {
            await createFolder('New Folder', selectedFolderId);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        const type = (item.kind === 'file' || item.type === 'file') ? 'file' : 'folder';
        setDeleteConfig({
            isOpen: true,
            targetId: item.id,
            targetType: type,
            targetName: item.name || item.title,
        });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfig.targetType === 'file') {
            await deleteNote(deleteConfig.targetId);
        } else {
            await deleteFolder(deleteConfig.targetId);
        }
        setDeleteConfig(prev => ({ ...prev, isOpen: false }));
    };

    const isFolderEmpty = (folderId: string) => {
        return !notes.some(n => n.folderId === folderId);
    };

    // Tree Rendering Logic
    const renderTreeItem = (item: any, level: number = 0) => {
        const isExpanded = expandedFolders.has(item.id);
        const hasChildren = item.type === 'folder' || item.kind === 'directory';

        let children: any[] = [];
        if (isLocalMode) {
            children = localFiles.filter(f => f.parentId === item.id);
        } else if (item.type === 'folder') {
            children = notes.filter(n => n.folderId === item.id).map(n => ({ ...n, type: 'file' as const, name: n.title }));
        }

        const finalChildren = children;

        // Determine icon based on item type
        const isFolder = item.type === 'folder' || item.kind === 'directory';

        return (
            <React.Fragment key={item.id}>
                <div
                    onClick={(e) => handleItemClick(e, item)}
                    className={`group flex items - center justify - between p - 1.5 rounded cursor - pointer text - sm transition - colors ${selectedFolderId === item.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                        } `}
                    style={{ paddingLeft: `${level * 12 + 8} px` }}
                >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                        {hasChildren ? (
                            <div
                                onClick={(e) => toggleFolder(e, item.id)}
                                className="flex items-center justify-center w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded"
                            >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        ) : (
                            <div className="w-4" /> // Spacing for items without chevrons
                        )}

                        {isFolder ? (
                            isExpanded ? (
                                <FolderOpen className="text-primary shrink-0" size={16} />
                            ) : (
                                <Folder className="text-primary shrink-0" size={16} />
                            )
                        ) : (
                            <FileText className="text-light-text-secondary dark:text-dark-text-secondary shrink-0" size={16} />
                        )}
                        <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {!hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const id = `note - ${item.id} `;
                                    if (isItemPinned(id)) {
                                        unpinItem(id);
                                    } else {
                                        pinItem({
                                            id,
                                            type: 'note',
                                            title: item.name,
                                            content: `Note Reference: ${item.name} `,
                                            reference: `Note: ${item.name} `,
                                            metadata: { noteId: item.id }
                                        });
                                    }
                                }}
                                className={`p - 1 opacity - 0 group - hover: opacity - 100 transition - all ${isItemPinned(`note-${item.id}`) ? 'text-primary' : 'text-light-text-disabled hover:text-primary'} `}
                                title="Pin to Research"
                            >
                                <Pin size={12} />
                            </button>
                        )}
                        <button
                            onClick={(e) => handleDeleteClick(e, item)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="flex flex-col">
                        {finalChildren.map(child => renderTreeItem(child, level + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    const rootFolders = folders.map(f => ({ ...f, type: 'folder' as const }));
    const rootNotes = notes.filter(n => !n.folderId).map(n => ({ ...n, id: n.id!, type: 'file' as const, name: n.title }));

    const rootItems = isLocalMode
        ? localFiles.filter(D => !D.parentId)
        : [...rootFolders, ...rootNotes];

    return (
        <div
            className="flex flex-col h-full shrink-0 select-none overflow-hidden"
        >
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Explorer</h3>
                <div className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary">
                    <button
                        onClick={handleCreateNote}
                        disabled={!hasStudyspace}
                        className={`p - 1 rounded transition - colors ${!hasStudyspace ? 'opacity-30 cursor-not-allowed' : 'hover:bg-light-background dark:hover:bg-dark-background'} `}
                        title={!hasStudyspace ? "Open a Studyspace first" : (isLocalMode ? "New Local Note" : "New Note")}
                    >
                        <FilePlus size={16} />
                    </button>
                    <button
                        onClick={toggleTemplateModal}
                        disabled={!hasStudyspace}
                        className={`p - 1 rounded transition - colors ${!hasStudyspace ? 'opacity-30 cursor-not-allowed' : 'hover:bg-light-background dark:hover:bg-dark-background text-primary'} `}
                        title={!hasStudyspace ? "Open a Studyspace first" : "New Study Template"}
                    >
                        <PenTool size={16} />
                    </button>
                    <button
                        onClick={() => hasStudyspace && setShowRecorder(true)}
                        disabled={!hasStudyspace}
                        className={`p - 1 rounded transition - colors ${!hasStudyspace ? 'opacity-30 cursor-not-allowed' : 'hover:bg-light-background dark:hover:bg-dark-background'} `}
                        title={!hasStudyspace ? "Open a Studyspace first" : (isLocalMode ? "New Local Voice Note" : "New Voice Note")}
                    >
                        <Mic size={16} />
                    </button>
                    <button
                        onClick={handleCreateFolder}
                        disabled={!hasStudyspace}
                        className={`p - 1 rounded transition - colors ${!hasStudyspace ? 'opacity-30 cursor-not-allowed' : 'hover:bg-light-background dark:hover:bg-dark-background'} `}
                        title={!hasStudyspace ? "Open a Studyspace first" : (isLocalMode ? "New Local Folder" : "New Folder")}
                    >
                        <FolderPlus size={16} />
                    </button>
                    <button onClick={openLocalFolder} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded transition-colors text-primary" title="Open Local Studyspace">
                        <Upload size={16} />
                    </button>
                </div>
            </div>

            {showRecorder && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <VoiceRecorder
                        onSave={async (blob, duration, transcript) => {
                            await createVoiceNote(selectedFolderId, blob, duration, transcript);
                            setShowRecorder(false);
                        }}
                        onCancel={() => setShowRecorder(false)}
                    />
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2" onClick={() => setSelectedFolderId(null)}>
                {!hasStudyspace ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border shadow-sm">
                            <Folder className="text-light-text-disabled" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wider mb-1">No Studyspace</p>
                            <p className="text-[10px] text-light-text-secondary leading-relaxed px-2">Open a local folder to start managing your notes.</p>
                        </div>
                        <button
                            onClick={openLocalFolder}
                            className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Open Folder
                        </button>
                    </div>
                ) : isLocalMode && localFiles.filter(f => !f.parentId).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4">
                        <div className="w-10 h-10 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center">
                            <FileText className="text-light-text-disabled" size={20} />
                        </div>
                        <p className="text-[10px] text-light-text-secondary font-medium italic">This studyspace is empty.</p>
                        <button
                            onClick={handleCreateNote}
                            className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg border border-primary/20 hover:bg-primary/20 transition-all"
                        >
                            + Create First Note
                        </button>
                    </div>
                ) : (
                    <>
                        {rootItems.map(item => renderTreeItem(item, 0))}
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteConfig.isOpen}
                title={`Delete ${deleteConfig.targetType === 'file' ? 'File' : 'Folder'} `}
                message={
                    deleteConfig.targetType === 'folder' && !isFolderEmpty(deleteConfig.targetId) ? (
                        <div className="space-y-2">
                            <p>Are you sure you want to delete <span className="font-bold">"{deleteConfig.targetName}"</span>?</p>
                            <p className="text-red-500 font-bold flex items-center gap-1 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                <AlertTriangle size={16} />
                                WARNING: This folder contains files. Deleting it may leave those files without a home.
                            </p>
                        </div>
                    ) : (
                        <p>Are you sure you want to delete <span className="font-bold">"{deleteConfig.targetName}"</span>?</p>
                    )
                }
                confirmLabel="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfig(prev => ({ ...prev, isOpen: false }))}
                isDanger={true}
            />
        </div>
    );
};
