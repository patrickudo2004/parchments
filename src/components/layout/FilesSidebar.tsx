import React from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import MicIcon from '@mui/icons-material/Mic';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { useNoteStore } from '@/stores/noteStore';
import type { Note } from '@/types/database';

export const FilesSidebar: React.FC = () => {
    const { setCurrentNote, createNote } = useNoteStore();

    // Mock data for visual verification
    const items = [
        { id: '1', name: 'Sermons', type: 'folder' },
        { id: '2', name: 'Bible Study', type: 'folder' },
        { id: '3', name: 'Sunday Service', type: 'file' },
        { id: '4', name: 'Midweek Notes', type: 'file' },
    ];

    const handleItemClick = (item: typeof items[0]) => {
        if (item.type === 'file') {
            const mockNote: Note = {
                id: item.id,
                title: item.name,
                content: '<p>Mock content</p>',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                folderId: null,
                tags: [],
                type: 'text'
            };
            setCurrentNote(mockNote);
        }
    };

    const handleCreateNote = async () => {
        await createNote(null);
    };

    return (
        <div className="w-[280px] bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border flex flex-col h-full shrink-0">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center gap-2 p-2 hover:bg-light-background dark:hover:bg-dark-background rounded cursor-pointer text-sm"
                    >
                        {item.type === 'folder' ? (
                            <FolderIcon className="text-primary" fontSize="small" />
                        ) : (
                            <InsertDriveFileIcon className="text-light-text-secondary dark:text-dark-text-secondary" fontSize="small" />
                        )}
                        <span>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
