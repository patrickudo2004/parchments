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
    AlertTriangle,
    Edit2,
    Users,
    PenTool,
    Pin,
    Share2,
    BookOpen
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useNoteStore, UNTITLED_NOTE } from '@/stores/noteStore';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useResearchStore } from '@/stores/researchStore';
import { ShareNoteModal } from '@/components/editor/ShareNoteModal';
import { useReadingPlanStore } from '@/stores/readingPlanStore';


export const FilesSidebar: React.FC = () => {
    const {
        setCurrentNote, createNote, createVoiceNote, createFolder,
        notes, folders, deleteNote, deleteFolder,
        isLocalMode, localFiles, openLocalFolder, openLocalFile,
        createLocalFolder,
        renameNote, renameFolder,
        hasStudyspace,
        refreshLocalFiles,
        selectedFolderId,
        setSelectedFolderId
    } = useNoteStore();

    const navigate = useNavigate();
    const { toggleTemplateModal, toggleNoFolderModal, isMobile, toggleLeftSidebar } = useUIStore();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();
    const [showRecorder, setShowRecorder] = useState(false);
    const [recordingFolderId, setRecordingFolderId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [shareNoteId, setShareNoteId] = useState<string | null>(null);

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

    const [promptConfig, setPromptConfig] = useState<{
        isOpen: boolean;
        title: string;
        label: string;
        defaultValue: string;
        onConfirm: (val: string) => void;
    }>({
        isOpen: false,
        title: '',
        label: '',
        defaultValue: '',
        onConfirm: () => { },
    });

    // Periodic File System Refresh for Desktop mode (watch for external changes)
    React.useEffect(() => {
        if (!isLocalMode) return;
        const interval = setInterval(() => {
            refreshLocalFiles();
        }, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, [isLocalMode, refreshLocalFiles]);

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
            if (isMobile) toggleLeftSidebar();
        } else if (item.kind === 'directory' || item.type === 'folder') {
            setSelectedFolderId(selectedFolderId === item.id ? null : item.id);
        }
    };

    const handleCreateNote = async () => {
        if (!hasStudyspace && !isMobile) {
            toggleNoFolderModal(true);
            return;
        }

        if (isLocalMode) {
            setPromptConfig({
                isOpen: true,
                title: 'New Note',
                label: 'Note Name',
                defaultValue: UNTITLED_NOTE,
                onConfirm: async (name) => {
                    await createNote(selectedFolderId, name);
                    setPromptConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            const note = await createNote(selectedFolderId);
            if (isMobile && note) {
                setCurrentNote(note);
                toggleLeftSidebar();
            }
        }
    };

    const handleCreateFolder = async () => {
        if (!hasStudyspace && !isMobile) {
            toggleNoFolderModal(true);
            return;
        }

        if (isLocalMode) {
            setPromptConfig({
                isOpen: true,
                title: 'New Folder',
                label: 'Folder Name',
                defaultValue: 'New Folder',
                onConfirm: async (name) => {
                    await createLocalFolder(name, selectedFolderId);
                    setPromptConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            await createFolder('New Folder', selectedFolderId);
        }
    };

    const handleStartRecordingInFolder = (folderId: string | null) => {
        if (!hasStudyspace && !isMobile) {
            toggleNoFolderModal(true);
        } else {
            setRecordingFolderId(folderId);
            setShowRecorder(true);
        }
    };

    const handleJoinRoom = () => {
        setPromptConfig({
            isOpen: true,
            title: 'Join Collaborative Note',
            label: 'Note Link or Hash',
            defaultValue: '',
            onConfirm: (input) => {
                if (input) {
                    let hash = input.trim();
                    if (hash.includes('/join/')) {
                        const parts = hash.split('/join/');
                        hash = parts[parts.length - 1];
                    }
                    if (hash) {
                        navigate(`/join/${hash}`);
                        if (isMobile) toggleLeftSidebar();
                    }
                }
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
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

    const handleRenameClick = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        const isFolder = item.kind === 'directory' || item.type === 'folder';
        const currentName = item.name || item.title;

        setPromptConfig({
            isOpen: true,
            title: `Rename ${isFolder ? 'Folder' : 'Note'}`,
            label: 'New Name',
            defaultValue: currentName,
            onConfirm: async (newName) => {
                if (newName && newName !== currentName) {
                    if (isFolder) {
                        await renameFolder(item.id, newName);
                    } else {
                        await renameNote(item.id, newName);
                    }
                }
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
            }
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

    // Desktop Tree Item Renderer
    const renderTreeItem = (item: any, level: number = 0) => {
        const isExpanded = expandedFolders.has(item.id);
        const hasChildren = item.type === 'folder' || item.kind === 'directory';

        let children: any[] = [];
        if (isLocalMode) {
            const localChildren = localFiles.filter(f => f.parentId === item.id);
            const dbChildren = notes
                .filter(n => n.folderId === item.id && !localChildren.some(lc => lc.id === n.id))
                .map(n => ({ ...n, type: 'file' as const, name: n.title }));
            children = [...localChildren, ...dbChildren];
        } else if (item.type === 'folder') {
            children = notes.filter(n => n.folderId === item.id).map(n => ({ ...n, type: 'file' as const, name: n.title }));
        }

        const finalChildren = children;
        const isFolder = item.type === 'folder' || item.kind === 'directory';

        return (
            <React.Fragment key={item.id}>
                <div
                    onClick={(e) => handleItemClick(e, item)}
                    className={`group flex items-center justify-between p-1 rounded cursor-pointer text-sm transition-colors select-none ${selectedFolderId === item.id
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                        }`}
                    style={{ paddingLeft: `${level * 16 + 4}px` }}
                >
                    <div className="flex items-center overflow-hidden flex-1">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {hasChildren && (
                                <div
                                    onClick={(e) => toggleFolder(e, item.id)}
                                    className="flex items-center justify-center w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"
                                >
                                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </div>
                            )}
                        </div>

                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mr-1.5">
                            {isFolder ? (
                                isExpanded ? <FolderOpen className="text-primary" size={16} /> : <Folder className="text-primary" size={16} />
                            ) : (
                                <FileText className="text-light-text-secondary dark:text-dark-text-secondary" size={16} />
                            )}
                        </div>

                        <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        {!hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const id = `note-${item.id}`;
                                    if (isItemPinned(id)) {
                                        unpinItem(id);
                                    } else {
                                        pinItem({
                                            id,
                                            type: 'note',
                                            title: item.name,
                                            content: `Note Reference: ${item.name}`,
                                            reference: `Note: ${item.name}`,
                                            metadata: { noteId: item.id }
                                        });
                                    }
                                }}
                                                                className={`p-1 transition-all opacity-0 group-hover:opacity-100 ${isItemPinned(`note-${item.id}`) ? 'text-primary' : 'text-light-text-disabled hover:text-primary'}`}
                                title="Pin to Research"
                            >
                                <Pin size={12} />
                            </button>
                        )}
                        {!hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShareNoteId(item.id);
                                }}
                                className="p-1 hover:text-primary transition-all opacity-0 group-hover:opacity-100 text-light-text-disabled hover:text-primary"
                                title="Share Note"
                            >
                                <Share2 size={12} />
                            </button>
                        )}
                        <button
                            onClick={(e) => handleRenameClick(e, item)}
                            className="p-1 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                            title="Rename"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={(e) => handleDeleteClick(e, item)}
                            className="p-1 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
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

    // Responsive Mobile Grid View render path
    if (isMobile) {
        // 1. MOBILE ONBOARDING: Force local folder open if no active Studyspace exists
        if (!hasStudyspace) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-light-surface dark:bg-dark-surface">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg text-primary animate-in zoom-in duration-300">
                        <FolderOpen size={40} className="animate-pulse" />
                    </div>
                    <div className="space-y-2 max-w-xs">
                        <h2 className="text-xl font-extrabold tracking-tight text-light-text-primary dark:text-dark-text-primary">Open Your Library</h2>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                            Parchments is a local-first workspace. Select or open a folder to organize your study notes and transcripts.
                        </p>
                    </div>
                    <button
                        onClick={openLocalFolder}
                        className="w-full py-3 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 animate-bounce"
                    >
                        Open Local Folder
                    </button>
                </div>
            );
        }

        // 2. ACTIVE DRILL DOWN CALCULATION
        const currentFolder = folders.find(f => f.id === selectedFolderId);
        const parentFolderId = currentFolder ? currentFolder.parentId : null;
        
        const activeSubfolders = folders.filter(f => f.parentId === selectedFolderId);
        const activeNotes = notes.filter(n => n.folderId === selectedFolderId);

        return (
            <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface overflow-hidden">
                {/* Mobile Explorer Header */}
                <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-background/20 dark:bg-dark-background/20 shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {selectedFolderId && (
                            <button
                                onClick={() => setSelectedFolderId(parentFolderId)}
                                className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-primary mr-1"
                                title="Go Back"
                            >
                                <ChevronRight size={20} className="rotate-180 shrink-0" />
                            </button>
                        )}
                        <h3 className="text-base font-extrabold truncate">
                            {currentFolder ? currentFolder.name : 'Library'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={async () => {
                                const note = await createNote(selectedFolderId);
                                if (note) {
                                    setCurrentNote(note);
                                    toggleLeftSidebar();
                                }
                            }}
                            className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-primary"
                            title="New Note"
                        >
                            <FilePlus size={18} />
                        </button>
                        <button
                            onClick={() => handleStartRecordingInFolder(selectedFolderId)}
                            className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-primary"
                            title="Record Voice Note"
                        >
                            <Mic size={18} />
                        </button>
                        <button
                            onClick={() => {
                                setPromptConfig({
                                    isOpen: true,
                                    title: 'Create Folder',
                                    label: 'Folder Name',
                                    defaultValue: 'New Folder',
                                    onConfirm: async (name) => {
                                        if (name) {
                                            await createFolder(name, selectedFolderId);
                                        }
                                        setPromptConfig(prev => ({ ...prev, isOpen: false }));
                                    }
                                });
                            }}
                            className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-primary"
                            title="New Folder"
                        >
                            <FolderPlus size={18} />
                        </button>
                        <button
                            onClick={handleJoinRoom}
                            className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-primary"
                            title="Join Collaborative Note"
                        >
                            <Users size={18} />
                        </button>
                    </div>
                </div>

                {/* Mobile Explorer Grid Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Folders Section */}
                    {activeSubfolders.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary opacity-60">Folders</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {activeSubfolders.map(folder => {
                                    const noteCount = notes.filter(n => n.folderId === folder.id).length;
                                    return (
                                        <div
                                            key={folder.id}
                                            onClick={() => setSelectedFolderId(folder.id)}
                                            className="group flex flex-col justify-between p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-2xl shadow-sm hover:border-primary/50 transition-all active:scale-[0.98] select-none"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                                    <Folder size={20} />
                                                </div>
                                                <div className="flex gap-0.5">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRenameClick(e, { ...folder, title: folder.name, type: 'folder' });
                                                        }}
                                                        className="p-1 text-light-text-disabled hover:text-primary transition-colors"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(e, { ...folder, title: folder.name, type: 'folder' });
                                                        }}
                                                        className="p-1 text-light-text-disabled hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <h5 className="font-bold text-xs truncate text-light-text-primary dark:text-dark-text-primary">{folder.name}</h5>
                                                <p className="text-[10px] text-light-text-disabled mt-0.5">{noteCount} note{noteCount !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary opacity-60">
                            {activeNotes.length > 0 ? 'Notes' : ''}
                        </h4>
                        {activeNotes.length === 0 && activeSubfolders.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                                <FileText size={32} className="text-light-text-disabled" />
                                <p className="text-xs italic text-light-text-secondary">This folder is empty.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {activeNotes.map(note => {
                                    const snippet = note.content
                                        ? note.content.replace(/<[^>]*>/g, '').trim().slice(0, 70)
                                        : note.transcript
                                            ? note.transcript.trim().slice(0, 70)
                                            : 'No content yet...';

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => {
                                                setCurrentNote(note);
                                                toggleLeftSidebar();
                                            }}
                                            className="p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-2xl shadow-sm hover:border-primary/50 transition-all flex flex-col gap-2 relative group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden pr-8">
                                                    <div className={`p-1.5 rounded-lg shrink-0 ${note.type === 'voice' ? 'bg-primary/10 text-primary' : 'bg-light-text-secondary/10 text-light-text-secondary dark:text-dark-text-secondary'}`}>
                                                        {note.type === 'voice' ? <Mic size={14} /> : <FileText size={14} />}
                                                    </div>
                                                    <h5 className="font-bold text-xs truncate text-light-text-primary dark:text-dark-text-primary">{note.title}</h5>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRenameClick(e, note);
                                                        }}
                                                        className="p-1 text-light-text-disabled hover:text-primary transition-colors"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(e, note);
                                                        }}
                                                        className="p-1 text-light-text-disabled hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-light-text-secondary leading-relaxed line-clamp-2">
                                                {snippet || 'Empty note'}
                                            </p>
                                            <div className="flex items-center justify-between text-[8px] font-bold text-light-text-disabled uppercase mt-1">
                                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                                {note.type === 'voice' && note.duration && (
                                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                        {Math.floor(note.duration / 60)}:{(note.duration % 60).toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmModal
                    isOpen={deleteConfig.isOpen}
                    title={`Delete ${deleteConfig.targetType === 'file' ? 'File' : 'Folder'}`}
                    message={`Are you sure you want to delete "${deleteConfig.targetName}"?`}
                    confirmLabel="Delete"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteConfig(prev => ({ ...prev, isOpen: false }))}
                    isDanger={true}
                />

                <PromptModal
                    isOpen={promptConfig.isOpen}
                    title={promptConfig.title}
                    label={promptConfig.label}
                    defaultValue={promptConfig.defaultValue}
                    onConfirm={promptConfig.onConfirm}
                    onCancel={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
                />
            </div>
        );
    }

    // Desktop explorer layout
    const rootFolders = folders.map(f => ({ ...f, type: 'folder' as const }));
    const rootNotes = notes.filter(n => !n.folderId).map(n => ({ ...n, id: n.id!, type: 'file' as const, name: n.title }));

    const allFolders = isLocalMode
        ? [
            ...localFiles.filter(D => !D.parentId && D.kind === 'directory').map(f => ({ ...f, type: 'folder' as const })),
            ...folders.filter(f => !localFiles.some(lf => lf.id === f.id)).map(f => ({ ...f, type: 'folder' as const }))
        ]
        : rootFolders;

    const allNotes = isLocalMode
        ? [
            ...localFiles.filter(D => !D.parentId && D.kind === 'file').map(f => ({ ...f, type: 'file' as const })),
            ...rootNotes.filter(n => !localFiles.some(lf => lf.id === n.id))
        ]
        : rootNotes;

    const rootItems = [...allFolders, ...allNotes];
    const isExplorerEmpty = isLocalMode
        ? localFiles.filter(f => !f.parentId).length === 0
        : rootItems.length === 0;

    return (
        <div
            data-sidebar
            className="flex flex-col h-full shrink-0 select-none overflow-hidden"
        >
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Explorer</h3>
                <div className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary">
                    <button
                        onClick={handleCreateNote}
                        className="p-1 rounded transition-colors hover:bg-light-background dark:hover:bg-dark-background"
                        title={isLocalMode ? "New Local Note" : "New Note"}
                    >
                        <FilePlus size={16} />
                    </button>
                    <button
                        onClick={() => useReadingPlanStore.setState({ isLectioModeActive: true, activePlanId: null })}
                        className="p-1 rounded transition-colors hover:bg-light-background dark:hover:bg-dark-background text-primary"
                        title="Lectio Mode"
                    >
                        <BookOpen size={16} />
                    </button>
                    <button
                        onClick={() => {
                            if (!hasStudyspace) {
                                toggleNoFolderModal(true);
                            } else {
                                toggleTemplateModal();
                            }
                        }}
                        className="p-1 rounded transition-colors hover:bg-light-background dark:hover:bg-dark-background text-primary"
                        title="New Study Template"
                    >
                        <PenTool size={16} />
                    </button>
                    <button
                        onClick={() => handleStartRecordingInFolder(selectedFolderId)}
                        className="p-1 rounded transition-colors hover:bg-light-background dark:hover:bg-dark-background"
                        title={isLocalMode ? "New Local Voice Note" : "New Voice Note"}
                    >
                        <Mic size={16} />
                    </button>
                    <button
                        onClick={handleCreateFolder}
                        className="p-1 rounded transition-colors hover:bg-light-background dark:hover:bg-dark-background"
                        title={isLocalMode ? "New Local Folder" : "New Folder"}
                    >
                        <FolderPlus size={16} />
                    </button>
                    <button
                        onClick={handleJoinRoom}
                        className="p-1 rounded transition-colors hover:bg-light-background dark:hover:bg-dark-background text-primary"
                        title="Join Shared Room"
                    >
                        <Users size={16} />
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
                            await createVoiceNote(recordingFolderId, blob, duration, transcript);
                            setShowRecorder(false);
                            setRecordingFolderId(null);
                        }}
                        onCancel={() => {
                            setShowRecorder(false);
                            setRecordingFolderId(null);
                        }}
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
                            className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-[0.95] transition-all"
                        >
                            Open Folder
                        </button>
                    </div>
                ) : isExplorerEmpty ? (
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
                title={`Delete ${deleteConfig.targetType === 'file' ? 'File' : 'Folder'}`}
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

            <PromptModal
                isOpen={promptConfig.isOpen}
                title={promptConfig.title}
                label={promptConfig.label}
                defaultValue={promptConfig.defaultValue}
                onConfirm={promptConfig.onConfirm}
                onCancel={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {shareNoteId && (
                <ShareNoteModal
                    isOpen={!!shareNoteId}
                    onClose={() => setShareNoteId(null)}
                    noteId={shareNoteId}
                />
            )}
        </div>
    );
};
