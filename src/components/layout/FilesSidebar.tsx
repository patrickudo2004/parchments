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
    Globe,
    GripHorizontal,
    PenTool,
    Pin,
    LogOut
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useNoteStore, UNTITLED_NOTE, UNTITLED_FOLDER, UNTITLED_SPACE } from '@/stores/noteStore';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useResearchStore } from '@/stores/researchStore';
import { useSyncStore } from '@/stores/syncStore';
import { roomHashToId, YjsService } from '@/lib/sync/YjsService';
import { ShareSpaceModal } from '@/components/sync/ShareSpaceModal';



export const FilesSidebar: React.FC = () => {
    // Debug log to check re-renders
    // console.log('[FilesSidebar] Rendering...');

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

    // console.log('[FilesSidebar] localFiles count:', localFiles.length);

    const navigate = useNavigate();
    const { toggleTemplateModal, toggleNoFolderModal, isMobile } = useUIStore();
    const { pinItem, unpinItem, isItemPinned } = useResearchStore();
    const { joinedRooms, activeRoom, removeJoinedRoom, updateRoomTitle, sharedFolders, shareFolder, unshareFolder, pairedDeviceName } = useSyncStore();
    const [showRecorder, setShowRecorder] = useState(false);
    const [recordingFolderId, setRecordingFolderId] = useState<string | null>(null);
    // ... rest same ...
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    // const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // MOVED TO GLOBAL STORE
    const [sharedSpacesCollapsed, setSharedSpacesCollapsed] = useState(() => {
        const saved = localStorage.getItem('sharedSpacesCollapsed');
        return saved === 'true';
    });

    const handleCreateNoteInFolder = async (folderId: string | null) => {
        if (!hasStudyspace) {
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
                    await createNote(folderId, name);
                    setPromptConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            await createNote(folderId);
        }
    };

    const handleStartRecordingInFolder = (folderId: string | null) => {
        if (!hasStudyspace) {
            toggleNoFolderModal(true);
        } else {
            setRecordingFolderId(folderId);
            setShowRecorder(true);
        }
    };
    const [sharedSpacesHeight, setSharedSpacesHeight] = useState(() => {
        const saved = localStorage.getItem('sharedSpacesHeight');
        return saved ? parseInt(saved) : 250; // Default 250px
    });
    const [isDragging, setIsDragging] = useState(false);
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
    const [shareSpaceConfig, setShareSpaceConfig] = useState<{
        isOpen: boolean;
        folderId: string;
        folderName: string;
    }>({
        isOpen: false,
        folderId: '',
        folderName: '',
    });

    // Folder Title Sync Effect
    React.useEffect(() => {
        const activeFolderRoom = joinedRooms.find(r => r.hash === activeRoom && r.type === 'folder');
        if (!activeFolderRoom) return;

        const folderId = roomHashToId(activeFolderRoom.hash);
        const ydoc = YjsService.getDoc(folderId, 'folder');
        const metadata = ydoc.getMap('metadata');

        // Seed or Update
        const syncedName = metadata.get('name') as string;
        if (syncedName && syncedName !== activeFolderRoom.title) {
            updateRoomTitle(activeFolderRoom.hash, syncedName);
        }

        const observer = (event: any) => {
            if (event.keysChanged.has('name')) {
                const newName = metadata.get('name') as string;
                if (newName) updateRoomTitle(activeFolderRoom.hash, newName);
            }
        };

        metadata.observe(observer);
        return () => metadata.unobserve(observer);
    }, [activeRoom, joinedRooms, updateRoomTitle]);

    // Periodic File System Refresh (watch for external changes)
    React.useEffect(() => {
        if (!isLocalMode) return;

        // Refresh every 10 seconds to detect external file changes
        const interval = setInterval(() => {
            refreshLocalFiles();
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [isLocalMode, refreshLocalFiles]);

    // Shared Spaces Resize Handler
    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleResizeTouchStart = () => {
        setIsDragging(true);
    };

    React.useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const sidebar = document.querySelector('[data-sidebar]');
            if (!sidebar) return;

            const sidebarRect = sidebar.getBoundingClientRect();
            const newHeight = Math.max(100, Math.min(600, sidebarRect.bottom - e.clientY));
            setSharedSpacesHeight(newHeight);
            localStorage.setItem('sharedSpacesHeight', newHeight.toString());
        };

        const handleTouchMove = (e: TouchEvent) => {
            const sidebar = document.querySelector('[data-sidebar]');
            if (!sidebar) return;

            const sidebarRect = sidebar.getBoundingClientRect();
            const clientY = e.touches[0].clientY;
            const newHeight = Math.max(100, Math.min(600, sidebarRect.bottom - clientY));
            setSharedSpacesHeight(newHeight);
            localStorage.setItem('sharedSpacesHeight', newHeight.toString());
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleDragEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging]);

    // Toggle collapse state
    const toggleSharedSpacesCollapse = () => {
        const newState = !sharedSpacesCollapsed;
        setSharedSpacesCollapsed(newState);
        localStorage.setItem('sharedSpacesCollapsed', newState.toString());
    };

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
            setSelectedFolderId(selectedFolderId === item.id ? null : item.id);
        }
    };

    const handleCreateNote = async () => {
        if (!hasStudyspace) {
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
            await createNote(selectedFolderId);
        }
    };

    const handleCreateFolder = async () => {
        if (!hasStudyspace) {
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

    const handleJoinRoom = () => {
        setPromptConfig({
            isOpen: true,
            title: 'Join Study Room',
            label: 'Room Hash or Link',
            defaultValue: '',
            onConfirm: (input) => {
                if (input) {
                    let hash = input.trim();
                    // Handle full URLs: http://localhost:3000/join/p-xxx
                    if (hash.includes('/join/')) {
                        const parts = hash.split('/join/');
                        hash = parts[parts.length - 1];
                    }

                    if (hash) {
                        navigate(`/join/${hash}`);
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
            title: `Rename ${isFolder ? 'Folder' : 'File'}`,
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

    const handleShareFolder = (e: React.MouseEvent, folder: any) => {
        e.stopPropagation();
        console.log('[SHARE FOLDER] Sharing folder:', folder.id, folder);
        console.log('[SHARE FOLDER] Calling shareFolder:', folder.id);
        shareFolder(folder.id);

        // SYNC: Immediately broadcast the current local state to overwrite any potentially stale remote manifest
        useNoteStore.getState().broadcastFolderChange(folder.id);

        setShareSpaceConfig({
            isOpen: true,
            folderId: folder.id,
            folderName: folder.name || folder.title || UNTITLED_FOLDER
        });
    };

    // Tree Rendering Logic
    const renderTreeItem = (item: any, level: number = 0) => {
        const isExpanded = expandedFolders.has(item.id);
        const hasChildren = item.type === 'folder' || item.kind === 'directory';

        let children: any[] = [];
        if (isLocalMode) {
            // Get children from local files
            const localChildren = localFiles.filter(f => f.parentId === item.id);
            // ALSO get children from database (for ghost notes in shared folders)
            const dbChildren = notes
                .filter(n => n.folderId === item.id && !localChildren.some(lc => lc.id === n.id))
                .map(n => ({ ...n, type: 'file' as const, name: n.title }));
            children = [...localChildren, ...dbChildren];
        } else if (item.type === 'folder') {
            children = notes.filter(n => n.folderId === item.id).map(n => ({ ...n, type: 'file' as const, name: n.title }));
        }

        const finalChildren = children;

        // Determine icon based on item type
        const isFolder = item.type === 'folder' || item.kind === 'directory';
        const isShared = isFolder && sharedFolders.includes(item.id);

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
                        {/* Chevron Column */}
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

                        {/* Icon Column */}
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 mr-1.5">
                            {isFolder ? (
                                isShared ? (
                                    <Users className="text-primary animate-pulse" size={16} />
                                ) : isExpanded ? (
                                    <FolderOpen className="text-primary" size={16} />
                                ) : (
                                    <Folder className="text-primary" size={16} />
                                )
                            ) : (
                                <FileText className="text-light-text-secondary dark:text-dark-text-secondary" size={16} />
                            )}
                        </div>

                        <span className="truncate">{item.name}</span>
                    </div>

                    <div className={`flex items-center ${isMobile ? 'gap-2.5 mr-1' : 'gap-1'}`}>
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
                                className={`p-1 transition-all ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'} ${isItemPinned(`note-${item.id}`) ? 'text-primary' : 'text-light-text-disabled hover:text-primary'}`}
                                title="Pin to Research"
                            >
                                <Pin size={12} />
                            </button>
                        )}
                        <button
                            onClick={(e) => handleRenameClick(e, item)}
                            className={`p-1 hover:text-primary transition-all ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                            title="Rename"
                        >
                            <Edit2 size={14} />
                        </button>
                        {isFolder && (
                            <button
                                onClick={(e) => handleShareFolder(e, item)}
                                className={`p-1 transition-all ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'} ${isShared ? 'text-primary' : 'hover:text-primary'}`}
                                title={isShared ? "Copy Share Link" : "Share Folder"}
                            >
                                <Users size={14} />
                            </button>
                        )}
                        <button
                            onClick={(e) => handleDeleteClick(e, item)}
                            className={`p-1 hover:text-red-500 transition-all ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
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

    // Merge Local Files with DB Ghost Notes/Folders
    // This ensures that shared items (which are in DB but maybe not yet on disk) appear in the sidebar
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

            {/* Shared Spaces Section - Collapsible & Resizable */}
            <div className="border-t border-light-border dark:border-dark-border bg-light-sidebar/30 dark:bg-dark-sidebar/30 overflow-hidden flex flex-col shrink-0">
                {/* Resize Handle */}
                {!sharedSpacesCollapsed && (
                    <div
                        onMouseDown={handleResizeMouseDown}
                        onTouchStart={handleResizeTouchStart}
                        className={`h-1 cursor-row-resize hover:bg-primary/20 transition-colors relative group shrink-0 ${isDragging ? 'bg-primary/30' : ''
                            }`}
                        title="Drag to resize"
                    >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripHorizontal size={12} className="text-light-text-disabled" />
                        </div>
                    </div>
                )}

                {/* Header */}
                <div
                    onClick={toggleSharedSpacesCollapse}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-light-background/50 dark:hover:bg-dark-background/50 transition-colors shrink-0"
                >
                    <div className="flex items-center gap-2">
                        {sharedSpacesCollapsed ? (
                            <ChevronRight size={12} className="text-light-text-secondary" />
                        ) : (
                            <ChevronDown size={12} className="text-light-text-secondary" />
                        )}
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary opacity-70">
                                Shared Spaces
                            </h4>
                            {pairedDeviceName && (
                                <p className="text-[9px] text-primary italic lowercase tracking-normal font-normal opacity-85 mt-0.5">
                                    sync: {pairedDeviceName}
                                </p>
                            )}
                        </div>
                    </div>
                    <Globe size={12} className="text-light-text-disabled" />
                </div>

                {/* Content */}
                {!sharedSpacesCollapsed && (
                    <div
                        className="px-2 pb-4 overflow-y-auto custom-scrollbar"
                        style={{ height: `${sharedSpacesHeight}px` }}
                    >
                        <div className="space-y-1">
                            {joinedRooms.filter(r => r.type === 'folder').length === 0 && sharedFolders.length === 0 ? (
                                <p className="text-[10px] text-light-text-disabled italic px-2">No shared spaces yet.</p>
                            ) : (
                                <>
                                    {/* Joined Folders */}
                                    {joinedRooms
                                        .filter(r => r.type === 'folder')
                                        .map((room) => {
                                            const folderId = roomHashToId(room.hash);
                                            const isExpanded = expandedFolders.has(folderId);
                                            const folderNotes = notes.filter(n => n.folderId === folderId);

                                            return (
                                                <div key={room.hash}>
                                                    {/* Folder Header */}
                                                    <div
                                                        onClick={() => {
                                                            if (expandedFolders.has(folderId)) {
                                                                const next = new Set(expandedFolders);
                                                                next.delete(folderId);
                                                                setExpandedFolders(next);
                                                            } else {
                                                                setExpandedFolders(new Set([...expandedFolders, folderId]));
                                                            }
                                                        }}
                                                        className="group flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-all hover:bg-light-background dark:hover:bg-dark-background border border-transparent"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                            {folderNotes.length > 0 && (
                                                                isExpanded ? (
                                                                    <ChevronDown size={14} className="text-light-text-secondary shrink-0" />
                                                                ) : (
                                                                    <ChevronRight size={14} className="text-light-text-secondary shrink-0" />
                                                                )
                                                            )}
                                                            {!folderNotes.length && <div className="w-3.5" />}
                                                            <Globe size={14} className="text-primary shrink-0" />
                                                            <span className="truncate font-medium">{room.title || 'Shared Space'}</span>
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">JOINED</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCreateNoteInFolder(folderId);
                                                                }}
                                                                className={`p-1 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                title="New Note"
                                                            >
                                                                <FilePlus size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStartRecordingInFolder(folderId);
                                                                }}
                                                                className={`p-1 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                title="Record Voice Note"
                                                            >
                                                                <Mic size={12} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const fakeFolderItem = { id: folderId, name: room.title || 'Shared Space', type: 'folder' };
                                                                    handleRenameClick(e, fakeFolderItem);
                                                                }}
                                                                className={`p-1 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                title="Rename Folder"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     removeJoinedRoom(room.hash);
                                                                 }}
                                                                 className={`p-1 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                 title="Leave Space"
                                                             >
                                                                 <LogOut size={12} />
                                                             </button>
                                                        </div>
                                                    </div>

                                                    {/* Folder Children */}
                                                    {isExpanded && folderNotes.length > 0 && (
                                                        <div className="ml-6 mt-1 space-y-0.5">
                                                            {folderNotes.map(note => (
                                                                <div
                                                                    key={note.id}
                                                                    onClick={() => setCurrentNote(note)}
                                                                    className="group flex items-center justify-between p-1.5 rounded cursor-pointer text-xs hover:bg-light-background dark:hover:bg-dark-background transition-all"
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                                        <FileText size={13} className="text-light-text-secondary shrink-0" />
                                                                        <span className="truncate">{note.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const fakeNoteItem = { id: note.id, title: note.title, type: 'file' };
                                                                                handleRenameClick(e, fakeNoteItem);
                                                                            }}
                                                                            className={`p-0.5 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                            title="Rename Note"
                                                                        >
                                                                            <Edit2 size={11} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const fakeNoteItem = { id: note.id, title: note.title, type: 'file' };
                                                                                handleDeleteClick(e, fakeNoteItem);
                                                                            }}
                                                                            className={`p-0.5 hover:text-red-500 transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                            title="Delete Note"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                    {/* Hosted Folders */}
                                    {sharedFolders.map((folderId) => {
                                        const folder = folders.find(f => f.id === folderId);
                                        const localFolder = localFiles.find(f => f.id === folderId && f.kind === 'directory');
                                        const folderName = folder?.name || localFolder?.name || UNTITLED_SPACE;
                                        const isExpanded = expandedFolders.has(folderId);
                                        const folderNotes = notes.filter(n => n.folderId === folderId);
                                        const localFolderNotes = localFiles.filter(f => f.parentId === folderId && f.kind === 'file');
                                        const allNotes = [...folderNotes, ...localFolderNotes.filter(lf => !folderNotes.some(n => n.id === lf.id))];

                                        return (
                                            <div key={folderId}>
                                                {/* Folder Header */}
                                                <div
                                                    onClick={() => {
                                                        if (expandedFolders.has(folderId)) {
                                                            const next = new Set(expandedFolders);
                                                            next.delete(folderId);
                                                            setExpandedFolders(next);
                                                        } else {
                                                            setExpandedFolders(new Set([...expandedFolders, folderId]));
                                                        }
                                                    }}
                                                    className="group flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-all hover:bg-light-background dark:hover:bg-dark-background border border-transparent"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                        {allNotes.length > 0 && (
                                                            isExpanded ? (
                                                                <ChevronDown size={14} className="text-light-text-secondary shrink-0" />
                                                            ) : (
                                                                <ChevronRight size={14} className="text-light-text-secondary shrink-0" />
                                                            )
                                                        )}
                                                        {!allNotes.length && <div className="w-3.5" />}
                                                        <Globe size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                                                        <span className="truncate font-medium">{folderName}</span>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold">HOSTING</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCreateNoteInFolder(folderId);
                                                            }}
                                                            className={`p-1 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                            title="New Note"
                                                        >
                                                            <FilePlus size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartRecordingInFolder(folderId);
                                                            }}
                                                            className={`p-1 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                            title="Record Voice Note"
                                                        >
                                                            <Mic size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const fakeFolderItem = { id: folderId, name: folderName, type: 'folder' };
                                                                handleRenameClick(e, fakeFolderItem);
                                                            }}
                                                            className={`p-1 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                            title="Rename Folder"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 unshareFolder(folderId);
                                                             }}
                                                             className={`p-1 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                             title="Stop Sharing"
                                                         >
                                                             <LogOut size={12} />
                                                         </button>
                                                    </div>
                                                </div>

                                                {/* Folder Children */}
                                                {isExpanded && allNotes.length > 0 && (
                                                    <div className="ml-6 mt-1 space-y-0.5">
                                                        {allNotes.map(note => {
                                                            const noteTitle = ('title' in note) ? note.title : note.name;
                                                            return (
                                                                <div
                                                                    key={note.id}
                                                                    onClick={() => {
                                                                        if ('title' in note) {
                                                                            setCurrentNote(note);
                                                                        } else {
                                                                            openLocalFile(note);
                                                                        }
                                                                    }}
                                                                    className="group flex items-center justify-between p-1.5 rounded cursor-pointer text-xs hover:bg-light-background dark:hover:bg-dark-background transition-all"
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                                        <FileText size={13} className="text-light-text-secondary shrink-0" />
                                                                        <span className="truncate">{noteTitle}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const fakeNoteItem = { id: note.id, title: noteTitle, type: 'file' };
                                                                                handleRenameClick(e, fakeNoteItem);
                                                                            }}
                                                                            className={`p-0.5 hover:text-primary transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                            title="Rename Note"
                                                                        >
                                                                            <Edit2 size={11} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const fakeNoteItem = { id: note.id, title: noteTitle, type: 'file' };
                                                                                handleDeleteClick(e, fakeNoteItem);
                                                                            }}
                                                                            className={`p-0.5 hover:text-red-500 transition-all rounded-md hover:bg-light-background/60 dark:hover:bg-dark-background/60 ${isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'}`}
                                                                            title="Delete Note"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
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

            <ShareSpaceModal
                isOpen={shareSpaceConfig.isOpen}
                onClose={() => setShareSpaceConfig(prev => ({ ...prev, isOpen: false }))}
                folderId={shareSpaceConfig.folderId}
                folderName={shareSpaceConfig.folderName}
            />
        </div>
    );
};
