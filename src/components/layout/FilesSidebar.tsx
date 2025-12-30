import React from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

export const FilesSidebar: React.FC = () => {
    // Mock data for visual verification
    const items = [
        { id: '1', name: 'Sermons', type: 'folder' },
        { id: '2', name: 'Bible Study', type: 'folder' },
        { id: '3', name: 'Sunday Service.note', type: 'file' },
    ];

    return (
        <div className="w-[280px] bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-light-border dark:border-dark-border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Explorer</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 hover:bg-light-background dark:hover:bg-dark-background rounded cursor-pointer text-sm">
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
