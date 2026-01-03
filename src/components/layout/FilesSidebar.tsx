import React, { useState } from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import MicIcon from '@mui/icons-material/Mic';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNoteStore } from '@/stores/noteStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { Note, Folder } from '@/types/database';

export const FilesSidebar: React.FC = () => {
    const { setCurrentNote, createNote, notes, folders, deleteNote, deleteFolder } = useNoteStore();
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1', '2'])); // Default expanded for mocks
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

    const handleItemClick = (item: any) => {
        if (item.type === 'file') {
            const note = notes.find(n => n.id === item.id) || {
                id: item.id,
                title: item.name,
                content: '<p>Mock content</p>',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                folderId: null,
                tags: [],
                type: 'text'
            } as Note;
            setCurrentNote(note as Note);
        }
    };

    const handleCreateNote = async () => {
        await createNote(null);
    };

    const handleDeleteClick = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        setDeleteConfig({
            isOpen: true,
            targetId: item.id,
            targetType: item.type,
            targetName: item.name,
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
        const hasChildren = item.type === 'folder';
        const children = item.type === 'folder'
            ? notes.filter(n => n.folderId === item.id).map(n => ({ ...n, type: 'file' as const, name: n.title }))
            : [];

        // For mocks/demo if real data is empty
        const mockChildren: any[] = [];
        if (item.id === '1' && notes.length === 0) mockChildren.push({ id: 'mock1', name: 'Example Sermon.docx', type: 'file' });
        if (item.id === '2' && notes.length === 0) mockChildren.push({ id: 'mock2', name: 'James 1 Study.txt', type: 'file' });

        const finalChildren = children.length > 0 ? children : mockChildren;

        return (
            <React.Fragment key={item.id}>
                <div
                    onClick={() => handleItemClick(item)}
                    className="group flex items-center justify-between p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded cursor-pointer text-sm transition-colors"
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                        {hasChildren ? (
                            <div
                                onClick={(e) => toggleFolder(e, item.id)}
                                className="flex items-center justify-center w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded"
                            >
                                {isExpanded ? <ExpandMoreIcon fontSize="inherit" /> : <ChevronRightIcon fontSize="inherit" />}
                            </div>
                        ) : (
                            <div className="w-4" /> // Spacing for items without chevrons
                        )}

                        {item.type === 'folder' ? (
                            isExpanded ? (
                                <FolderOpenIcon className="text-primary shrink-0" fontSize="small" />
                            ) : (
                                <FolderIcon className="text-primary shrink-0" fontSize="small" />
                            )
                        ) : (
                            <InsertDriveFileIcon className="text-light-text-secondary dark:text-dark-text-secondary shrink-0" fontSize="small" />
                        )}
                        <span className="truncate">{item.name}</span>
                    </div>

                    <button
                        onClick={(e) => handleDeleteClick(e, item)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                        title="Delete"
                    >
                        <DeleteIcon style={{ fontSize: '14px' }} />
                    </button>
                </div>

                {hasChildren && isExpanded && (
                    <div className="flex flex-col">
                        {finalChildren.map(child => renderTreeItem(child, level + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    const rootFolders = folders.length > 0 ? folders.map(f => ({ ...f, type: 'folder' as const })) : [
        { id: '1', name: 'Sermons', type: 'folder' as const },
        { id: '2', name: 'Bible Study', type: 'folder' as const },
    ];
    const rootNotes = notes.filter(n => !n.folderId).map(n => ({ ...n, id: n.id!, type: 'file' as const, name: n.title }));

    // For demo if empty
    const displayRootNotes = rootNotes.length > 0 ? rootNotes : (notes.length === 0 ? [
        { id: '3', name: 'Sunday Service', type: 'file' as const },
        { id: '4', name: 'Midweek Notes', type: 'file' as const },
    ] : []);

    return (
        <div className="w-[280px] bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border flex flex-col h-full shrink-0 select-none">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Explorer</h3>
                <div className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary">
                    <button onClick={handleCreateNote} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded transition-colors" title="New Note">
                        <NoteAddIcon fontSize="small" />
                    </button>
                    <button className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded transition-colors" title="New Voice Note">
                        <MicIcon fontSize="small" />
                    </button>
                    <button className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded transition-colors" title="New Folder">
                        <CreateNewFolderIcon fontSize="small" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {rootFolders.map(folder => renderTreeItem(folder, 0))}
                {displayRootNotes.map(note => renderTreeItem(note, 0))}
            </div>

            <ConfirmModal
                isOpen={deleteConfig.isOpen}
                title={`Delete ${deleteConfig.targetType === 'file' ? 'File' : 'Folder'}`}
                message={
                    deleteConfig.targetType === 'folder' && !isFolderEmpty(deleteConfig.targetId) ? (
                        <div className="space-y-2">
                            <p>Are you sure you want to delete <span className="font-bold">"{deleteConfig.targetName}"</span>?</p>
                            <p className="text-red-500 font-bold flex items-center gap-1 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                <WarningAmberIcon fontSize="small" />
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
