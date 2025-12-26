import React, { useEffect, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import {
    Folder as FolderIcon,
    FileText,
    ChevronRight,
    ChevronDown,
    Plus,
    FolderPlus,
    MoreVertical,
    Search
} from 'lucide-react';

export const FilesSidebar: React.FC = () => {
    const {
        folders,
        notes,
        currentNote,
        loadFolders,
        loadNotes,
        setCurrentNote,
        createNote,
        createFolder
    } = useNoteStore();

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadFolders();
        loadNotes();
    }, [loadFolders, loadNotes]);

    const toggleFolder = (folderId: string) => {
        const next = new Set(expandedFolders);
        if (next.has(folderId)) {
            next.delete(folderId);
        } else {
            next.add(folderId);
        }
        setExpandedFolders(next);
    };

    const handleCreateNote = async (folderId: string | null = null) => {
        const note = await createNote(folderId);
        setCurrentNote(note);
    };

    const handleCreateFolder = async () => {
        const name = window.prompt('Folder Name');
        if (name) {
            await createFolder(name, null);
        }
    };

    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const rootNotes = filteredNotes.filter(n => !n.folderId);
    const rootFolders = folders.filter(f => !f.parentId);

    return (
        <aside className="w-64 bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border flex flex-col overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <h2 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider">
                    Files
                </h2>
                <div className="flex gap-1">
                    <button onClick={handleCreateFolder} className="p-1 hover:bg-light-surface dark:hover:bg-dark-surface rounded" title="New Folder">
                        <FolderPlus size={14} />
                    </button>
                    <button onClick={() => handleCreateNote(null)} className="p-1 hover:bg-light-surface dark:hover:bg-dark-surface rounded" title="New Note">
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-2">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-light-text-disabled" size={14} />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-7 py-1 text-xs focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {/* Folders */}
                {rootFolders.map(folder => (
                    <div key={folder.id} className="space-y-1">
                        <button
                            onClick={() => toggleFolder(folder.id)}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-light-surface dark:hover:bg-dark-surface text-xs font-medium group transition-colors"
                        >
                            {expandedFolders.has(folder.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <FolderIcon size={14} className="text-primary/70" />
                            <span className="flex-1 text-left truncate">{folder.name}</span>
                            <MoreVertical size={14} className="opacity-0 group-hover:opacity-100 text-light-text-disabled" />
                        </button>

                        {expandedFolders.has(folder.id) && (
                            <div className="pl-4 space-y-1">
                                {filteredNotes.filter(n => n.folderId === folder.id).map(note => (
                                    <button
                                        key={note.id}
                                        onClick={() => setCurrentNote(note)}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${currentNote?.id === note.id
                                            ? 'bg-primary/20 text-primary font-medium'
                                            : 'hover:bg-light-surface dark:hover:bg-dark-surface'
                                            }`}
                                    >
                                        <FileText size={14} />
                                        <span className="flex-1 text-left truncate">{note.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Root Notes */}
                {rootNotes.map(note => (
                    <button
                        key={note.id}
                        onClick={() => setCurrentNote(note)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${currentNote?.id === note.id
                            ? 'bg-primary/20 text-primary font-medium'
                            : 'hover:bg-light-surface dark:hover:bg-dark-surface'
                            }`}
                    >
                        <FileText size={14} />
                        <span className="flex-1 text-left truncate">{note.title}</span>
                    </button>
                ))}

                {notes.length === 0 && !searchQuery && (
                    <p className="text-[10px] text-center mt-8 text-light-text-disabled dark:text-dark-text-disabled italic">
                        No notes yet. Click + to create one.
                    </p>
                )}
            </div>
        </aside>
    );
};
