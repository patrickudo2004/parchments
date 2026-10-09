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
    BookOpen,
    Database,
    HardDrive,
    X,
    ArrowRight,
    RotateCcw
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useNoteStore, UNTITLED_NOTE } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { useResearchStore } from '@/stores/researchStore';
import { ShareNoteModal } from '@/components/editor/ShareNoteModal';
import { useReadingPlanStore } from '@/stores/readingPlanStore';


export const FilesSidebar: React.FC = () => {
    const {
        currentNote,
        setCurrentNote, createNote, createVoiceNote, createFolder,
        notes, folders, deleteNote, deleteFolder,
        isLocalMode, localFiles, openLocalFolder, openLocalFile,
        createLocalFolder,
        renameNote, renameFolder,
        hasStudyspace,
        refreshLocalFiles,
        selectedFolderId,
        setSelectedFolderId,
        activeWorkspaceId,
        setActiveWorkspaceId,
        createWorkspace,
        localDirectoryHandle,
        setLocalMode,
        storageFoundation,
        lastLocalFolderName,
        reconnectLocalFolder
    } = useNoteStore();

    const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
    const [isReminderDismissed, setIsReminderDismissed] = useState(() => {
        try {
            const dismissedAt = localStorage.getItem('parchments-dismiss-browser-reminder');
            if (!dismissedAt) return false;
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            return Date.now() - parseInt(dismissedAt, 10) < thirtyDays;
        } catch {
            return false;
        }
    });

    const handleDismissReminder = (e: React.MouseEvent) => {
        e.stopPropagation();
        localStorage.setItem('parchments-dismiss-browser-reminder', Date.now().toString());
        setIsReminderDismissed(true);
    };

    const renderWorkspaceSwitcher = () => {
        const activeWorkspaceFolder = folders.find(f => f.id === activeWorkspaceId);
        const displayName = isLocalMode
            ? (localDirectoryHandle?.name || 'Local Folder')
            : (activeWorkspaceFolder?.name || 'Study Journal');
        const workspaceName = isLocalMode
            ? `${displayName} (Local Folder)`
            : `${displayName} (Browser DB)`;

        const workspaces = folders.filter(f => f.parentId === null);

        const handleSelectWorkspace = (workspaceId: string) => {
            setActiveWorkspaceId(workspaceId);
            setIsWorkspaceDropdownOpen(false);
        };

        const handleCreateWorkspaceClick = () => {
            setIsWorkspaceDropdownOpen(false);
            setPromptConfig({
                isOpen: true,
                title: 'New Workspace',
                label: 'Workspace Name',
                defaultValue: 'New Study Journal',
                onConfirm: async (name) => {
                    if (name) {
                        await createWorkspace(name);
                    }
                    setPromptConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        };

        return (
            <div className="relative z-40">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen);
                    }}
                    className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-bold text-light-text-primary dark:text-dark-text-primary hover:bg-light-background dark:hover:bg-dark-background transition-colors border border-transparent hover:border-light-border dark:hover:border-dark-border max-w-[100px] sm:max-w-[130px]"
                >
                    <FolderOpen size={14} className="text-primary shrink-0" />
                    <span className="truncate">{workspaceName}</span>
                    <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isWorkspaceDropdownOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setIsWorkspaceDropdownOpen(false)} 
                        />
                        <div className="absolute left-0 mt-1 w-56 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface shadow-2xl z-50 py-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-light-text-secondary opacity-60">
                                Workspaces
                            </div>
                            {isLocalMode ? (
                                <div className="px-3 py-2 flex items-center gap-2 text-primary font-bold bg-primary/10">
                                    <Folder size={14} />
                                    <span className="truncate">{displayName} (Local Directory)</span>
                                </div>
                            ) : (
                                <div className="max-h-40 overflow-y-auto">
                                    {workspaces.map(w => (
                                        <button
                                            key={w.id}
                                            onClick={() => handleSelectWorkspace(w.id)}
                                            className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-light-background dark:hover:bg-dark-background transition-colors ${w.id === activeWorkspaceId ? 'text-primary font-bold bg-primary/5' : ''}`}
                                        >
                                            <span className="truncate">{w.name} (Browser Sandbox)</span>
                                            {w.id === activeWorkspaceId && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-light-border dark:border-dark-border my-1" />
                            
                            {!isLocalMode && (
                                <button
                                    onClick={handleCreateWorkspaceClick}
                                    className="w-full px-3 py-2 text-left hover:bg-light-background dark:hover:bg-dark-background transition-colors flex items-center gap-1.5 text-primary font-medium"
                                >
                                    <FolderPlus size={14} />
                                    <span>Create Workspace...</span>
                                </button>
                            )}

                            {isLocalMode && (
                                <button
                                    onClick={() => {
                                        setIsWorkspaceDropdownOpen(false);
                                        setLocalMode(false);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-light-background dark:hover:bg-dark-background transition-colors flex items-center gap-1.5 text-primary font-medium"
                                >
                                    <Database size={14} />
                                    <span>Switch to Browser Database</span>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setIsWorkspaceDropdownOpen(false);
                                    openLocalFolder();
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-light-background dark:hover:bg-dark-background transition-colors flex items-center gap-1.5"
                            >
                                <Upload size={14} />
                                <span>{isLocalMode ? 'Switch Local Folder...' : 'Open Local Folder...'}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const { toggleTemplateModal, toggleNoFolderModal, isMobile, toggleLeftSidebar, isLeftSidebarFloating } = useUIStore();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();
    const [showRecorder, setShowRecorder] = useState(false);
    const [recordingFolderId, setRecordingFolderId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [shareNoteId, setShareNoteId] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
            const localFile = localFiles.find(f => (f.id === item.id || f.name === item.name) && f.kind === 'file');
            if (item.handle || localFile?.handle) {
                openLocalFile(item.handle ? item : localFile);
            } else {
                const note = notes.find(n => String(n.id) === String(item.id)) || item;
                if (note) {
                    setCurrentNote(note);
                }
            }
            if (isMobile || isLeftSidebarFloating || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
                toggleLeftSidebar();
            }
        } else if (item.kind === 'directory' || item.type === 'folder') {
            toggleFolder(e, item.id);
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
        setShareNoteId(null);
        setIsShareModalOpen(true);
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
                    className={`group flex items-center justify-between py-2 px-1.5 rounded-lg cursor-pointer text-sm transition-colors select-none min-h-[38px] sm:min-h-[40px] touch-manipulation ${selectedFolderId === item.id
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'hover:bg-light-background dark:hover:bg-dark-background'
                        }`}
                    style={{ paddingLeft: `${level * 16 + 6}px` }}
                >
                    <div className="flex items-center overflow-hidden flex-1">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            {hasChildren && (
                                <div
                                    onClick={(e) => toggleFolder(e, item.id)}
                                    className="flex items-center justify-center w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
                                className={`p-1.5 min-w-[26px] min-h-[26px] flex items-center justify-center rounded transition-all ${currentNote?.id === item.id ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'} ${isItemPinned(`note-${item.id}`) ? 'text-primary' : 'text-light-text-disabled hover:text-primary'}`}
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
                                    setIsShareModalOpen(true);
                                }}
                                className={`p-1.5 min-w-[26px] min-h-[26px] flex items-center justify-center rounded hover:text-primary transition-all ${currentNote?.id === item.id ? 'opacity-90 text-primary' : 'opacity-0 group-hover:opacity-100 text-light-text-disabled hover:text-primary'}`}
                                title="Share Note"
                            >
                                <Share2 size={12} />
                            </button>
                        )}
                        <button
                            onClick={(e) => handleRenameClick(e, item)}
                            className={`p-1.5 min-w-[26px] min-h-[26px] flex items-center justify-center rounded hover:text-primary transition-all ${currentNote?.id === item.id ? 'opacity-90 text-light-text-secondary' : 'opacity-0 group-hover:opacity-100'}`}
                            title="Rename"
                        >
                            <Edit2 size={13} />
                        </button>
                        <button
                            onClick={(e) => handleDeleteClick(e, item)}
                            className={`p-1.5 min-w-[26px] min-h-[26px] flex items-center justify-center rounded hover:text-red-500 transition-all ${currentNote?.id === item.id ? 'opacity-90 text-light-text-disabled' : 'opacity-0 group-hover:opacity-100'}`}
                            title="Delete"
                        >
                            <Trash2 size={13} />
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
        // 1. MOBILE ONBOARDING: Allow browser database or local folder open if no active Studyspace exists
        if (!hasStudyspace) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-light-surface dark:bg-dark-surface">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg text-primary animate-in zoom-in duration-300">
                        <FolderOpen size={40} className="animate-pulse" />
                    </div>
                    <div className="space-y-2 max-w-xs">
                        <h2 className="text-xl font-extrabold tracking-tight text-light-text-primary dark:text-dark-text-primary">Open Your Library</h2>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                            Parchments is a local-first workspace. Continue with your offline browser database or open a local folder.
                        </p>
                    </div>
                    <div className="w-full space-y-2.5">
                        <button
                            onClick={() => {
                                setLocalMode(false);
                            }}
                            className="w-full py-3 bg-primary text-[#121212] text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95"
                        >
                            Continue with Browser Database (Offline)
                        </button>
                        {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
                            <button
                                onClick={openLocalFolder}
                                className="w-full py-2.5 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/5 transition-all active:scale-95"
                            >
                                Open Local Folder
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        // 2. ACTIVE DRILL DOWN CALCULATION
        const normalizePath = (p: string | null | undefined) => p ? p.replace(/\\/g, '/').replace(/\/+$/, '') : null;

        const currentFolder = isLocalMode
            ? (localFiles.find(f => (String(f.id) === String(selectedFolderId) || normalizePath(f.id) === normalizePath(selectedFolderId)) && f.kind === 'directory') || folders.find(f => String(f.id) === String(selectedFolderId)))
            : folders.find(f => String(f.id) === String(selectedFolderId));
        const parentFolderId = currentFolder 
            ? (currentFolder.parentId === activeWorkspaceId ? null : currentFolder.parentId) 
            : null;
        
        let activeSubfolders: any[] = [];
        if (isLocalMode) {
            const localDirs = localFiles
                .filter(f => f.kind === 'directory' && (selectedFolderId ? (String(f.parentId) === String(selectedFolderId) || normalizePath(f.parentId) === normalizePath(selectedFolderId)) : (!f.parentId || f.parentId === '')))
                .map(f => ({ ...f, type: 'folder' as const }));
            const dbFolders = folders
                .filter(f => (selectedFolderId ? (String(f.parentId) === String(selectedFolderId) || String(f.parentId) === String(currentFolder?.name)) : (f.parentId === null || f.parentId === activeWorkspaceId)) && !localDirs.some(ld => String(ld.id) === String(f.id)))
                .map(f => ({ ...f, type: 'folder' as const }));
            activeSubfolders = [...localDirs, ...dbFolders];
        } else {
            activeSubfolders = folders.filter(f => 
                selectedFolderId 
                    ? (String(f.parentId) === String(selectedFolderId) || String(f.parentId) === String(currentFolder?.name))
                    : (String(f.parentId) === String(activeWorkspaceId) || f.parentId === null)
            ).map(f => ({ ...f, type: 'folder' as const }));
        }

        let activeNotes: any[] = [];
        if (isLocalMode) {
            const localNotesList = localFiles
                .filter(f => f.kind === 'file' && (selectedFolderId ? (String(f.parentId) === String(selectedFolderId) || normalizePath(f.parentId) === normalizePath(selectedFolderId)) : (!f.parentId || f.parentId === '')))
                .map(f => ({
                    id: f.id,
                    title: f.name,
                    name: f.name,
                    content: '',
                    type: 'file' as const,
                    createdAt: Date.now(),
                    handle: f.handle,
                    fileHandle: f.handle,
                    kind: 'file' as const
                }));
            const dbNotesList = notes
                .filter(n => (selectedFolderId ? (String(n.folderId) === String(selectedFolderId) || String(n.folderId) === String(currentFolder?.name)) : (n.folderId === null || n.folderId === activeWorkspaceId)) && !localNotesList.some(ln => String(ln.id) === String(n.id)));
            activeNotes = [...localNotesList, ...dbNotesList];
        } else {
            activeNotes = notes.filter(n => 
                selectedFolderId 
                    ? (String(n.folderId) === String(selectedFolderId) || String(n.folderId) === String(currentFolder?.name))
                    : (String(n.folderId) === String(activeWorkspaceId) || n.folderId === null || !folders.some(f => String(f.id) === String(n.folderId)))
            );
        }

        return (
            <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface overflow-hidden">
                {/* Mobile Explorer Header */}
                <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-background/20 dark:bg-dark-background/20 shrink-0 relative z-30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {selectedFolderId && (
                            <button
                                onClick={() => setSelectedFolderId(parentFolderId)}
                                className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors text-primary mr-1"
                                title="Go Back"
                            >
                                <ChevronRight size={20} className="rotate-180 shrink-0" />
                            </button>
                        )}
                        {selectedFolderId ? (
                            <h3 className="text-base font-extrabold truncate">
                                {currentFolder?.name}
                            </h3>
                        ) : (
                            renderWorkspaceSwitcher()
                        )}
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
                                            if (isLocalMode) {
                                                await createLocalFolder(name, selectedFolderId);
                                            } else {
                                                await createFolder(name, selectedFolderId);
                                            }
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
                                    const noteCount = isLocalMode
                                        ? (localFiles.filter(f => f.kind === 'file' && (String(f.parentId) === String(folder.id) || normalizePath(f.parentId) === normalizePath(folder.id))).length +
                                           notes.filter(n => String(n.folderId) === String(folder.id) || String(n.folderId) === String(folder.name)).length)
                                        : notes.filter(n => String(n.folderId) === String(folder.id) || String(n.folderId) === String(folder.name)).length;
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
                                                const localFile = localFiles.find(f => (f.id === note.id || f.name === note.name) && f.kind === 'file');
                                                if (note.handle || localFile?.handle) {
                                                    openLocalFile(note.handle ? note : localFile);
                                                } else {
                                                    const found = notes.find(n => String(n.id) === String(note.id)) || note;
                                                    setCurrentNote(found);
                                                }
                                                toggleLeftSidebar();
                                            }}
                                            className="p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-2xl shadow-sm hover:border-primary/50 transition-all flex flex-col gap-2 relative group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden pr-8">
                                                    <div className={`p-1.5 rounded-lg shrink-0 ${note.type === 'voice' ? 'bg-primary/10 text-primary' : 'bg-light-text-secondary/10 text-light-text-secondary dark:text-dark-text-secondary'}`}>
                                                        {note.type === 'voice' ? <Mic size={14} /> : <FileText size={14} />}
                                                    </div>
                                                    <h5 className="font-bold text-xs truncate text-light-text-primary dark:text-dark-text-primary">{note.title || note.name}</h5>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShareNoteId(note.id);
                                                            setIsShareModalOpen(true);
                                                        }}
                                                        className="p-1 text-light-text-disabled hover:text-primary transition-colors"
                                                        title="Share Note"
                                                    >
                                                        <Share2 size={12} />
                                                    </button>
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
                                                <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Note'}</span>
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
    const rootFolders = folders.filter(f => f.parentId === activeWorkspaceId).map(f => ({ ...f, type: 'folder' as const }));
    const rootNotes = notes.filter(n => n.folderId === activeWorkspaceId).map(n => ({ ...n, id: n.id!, type: 'file' as const, name: n.title }));

    const allFolders = isLocalMode
        ? [
            ...localFiles.filter(D => !D.parentId && D.kind === 'directory').map(f => ({ ...f, type: 'folder' as const })),
            ...folders.filter(f => f.parentId === null && !localFiles.some(lf => lf.id === f.id)).map(f => ({ ...f, type: 'folder' as const }))
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
            <div className="p-3 border-b border-light-border dark:border-dark-border flex items-center justify-between gap-1 relative z-30">
                {renderWorkspaceSwitcher()}
                <div className="flex items-center gap-0.5 shrink-0 text-light-text-secondary dark:text-dark-text-secondary">
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
                    storageFoundation === 'local' && lastLocalFolderName ? (
                        <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                                <RotateCcw size={22} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wider mb-1">Reconnect Studyspace</p>
                                <p className="text-[10px] text-light-text-secondary leading-relaxed px-2">Resume editing files in <strong className="text-primary font-bold">'{lastLocalFolderName}'</strong>.</p>
                            </div>
                            <div className="w-full space-y-2">
                                <button
                                    onClick={reconnectLocalFolder}
                                    className="w-full py-2.5 bg-primary text-[#121212] text-xs font-black rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
                                >
                                    <HardDrive size={14} />
                                    <span>Reconnect Folder</span>
                                </button>
                                <button
                                    onClick={() => setLocalMode(false)}
                                    className="w-full py-2 border border-light-border dark:border-white/10 text-light-text-secondary hover:text-light-text-primary text-xs font-semibold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[40px] touch-manipulation"
                                >
                                    Switch to Browser DB
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border shadow-sm">
                                <Folder className="text-light-text-disabled" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wider mb-1">No Studyspace</p>
                                <p className="text-[10px] text-light-text-secondary leading-relaxed px-2">Open a local folder or continue with your offline browser database.</p>
                            </div>
                            <div className="w-full space-y-2">
                                <button
                                    onClick={() => setLocalMode(false)}
                                    className="w-full py-2 bg-primary text-[#121212] text-xs font-black rounded-lg shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer min-h-[44px] touch-manipulation"
                                >
                                    Use Browser Database (Offline)
                                </button>
                                {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
                                    <button
                                        onClick={openLocalFolder}
                                        className="w-full py-2 border border-primary/30 text-primary text-xs font-semibold rounded-lg hover:bg-primary/5 transition-all cursor-pointer min-h-[40px] touch-manipulation"
                                    >
                                        Open Local Folder
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                ) : isExplorerEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4">
                        <div className="w-10 h-10 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center">
                            <FileText className="text-light-text-disabled" size={20} />
                        </div>
                        <p className="text-[10px] text-light-text-secondary font-medium italic">This studyspace is empty.</p>
                        <button
                            onClick={handleCreateNote}
                            className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer min-h-[40px] touch-manipulation"
                        >
                            + Create First Note
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Periodic dismissible reminder for Browser DB users on desktop */}
                        {!isLocalMode && !isReminderDismissed && typeof window !== 'undefined' && 'showDirectoryPicker' in window && notes.length > 0 && (
                            <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col gap-1.5 animate-in fade-in duration-300">
                                <div className="flex items-start justify-between gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                                        <HardDrive size={12} /> Local Disk Tip
                                    </span>
                                    <button
                                        onClick={handleDismissReminder}
                                        className="text-light-text-secondary hover:text-light-text-primary p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                        title="Dismiss for 30 days"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <p className="text-[11px] text-light-text-secondary leading-tight">
                                    Saving in browser DB. Want notes saved as physical <strong className="text-light-text-primary dark:text-white">.md files</strong> on your laptop?
                                </p>
                                <button
                                    onClick={openLocalFolder}
                                    className="text-[11px] font-bold text-primary hover:underline text-left cursor-pointer flex items-center gap-1 mt-0.5"
                                >
                                    <span>Link Computer Folder</span>
                                    <ArrowRight size={11} />
                                </button>
                            </div>
                        )}
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

            <ShareNoteModal
                isOpen={isShareModalOpen}
                onClose={() => {
                    setIsShareModalOpen(false);
                    setShareNoteId(null);
                }}
                noteId={shareNoteId}
            />
        </div>
    );
};
