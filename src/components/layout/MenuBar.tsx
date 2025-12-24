import React from 'react';
interface MenuItem {
    label?: string;
    action?: () => void;
    items?: MenuItem[];
    shortcut?: string;
    divider?: boolean;
}

export const MenuBar: React.FC = () => {
    const menus: { [key: string]: MenuItem[] } = {
        File: [
            { label: 'New Note', shortcut: 'Ctrl+N' },
            { label: 'New Folder', shortcut: 'Ctrl+Shift+N' },
            { divider: true },
            { label: 'Import...', divider: false },
            { label: 'Export...', divider: false },
            { divider: true },
            { label: 'Print', shortcut: 'Ctrl+P' },
        ],
        Edit: [
            { label: 'Undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', shortcut: 'Ctrl+Y' },
            { divider: true },
            { label: 'Cut', shortcut: 'Ctrl+X' },
            { label: 'Copy', shortcut: 'Ctrl+C' },
            { label: 'Paste', shortcut: 'Ctrl+V' },
        ],
        View: [
            { label: 'Toggle Sidebar', shortcut: 'Ctrl+\\' },
            { label: 'Full Screen', shortcut: 'F11' },
            { divider: true },
            { label: 'Zoom In', shortcut: 'Ctrl+=' },
            { label: 'Zoom Out', shortcut: 'Ctrl+-' },
        ],
        Insert: [
            { label: 'Bible Verse', shortcut: 'Ctrl+B' },
            { label: 'Link', shortcut: 'Ctrl+K' },
            { label: 'Image', divider: false },
            { label: 'Table', divider: false },
        ],
        Tools: [
            { label: 'Spelling & Grammar', divider: false },
            { label: 'Word Count', divider: false },
            { label: 'Voice Recording', divider: false },
        ],
        Help: [
            { label: 'Tutorial', divider: false },
            { label: 'Shortcuts', divider: false },
            { divider: true },
            { label: 'About Parchments', divider: false },
        ]
    };

    return (
        <div className="h-8 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center px-4 space-x-4">
            {Object.keys(menus).map((menuName) => (
                <div key={menuName} className="relative group">
                    <button className="text-xs font-medium px-2 py-1 rounded hover:bg-light-background dark:hover:bg-dark-background transition-colors">
                        {menuName}
                    </button>

                    {/* Dropdown placeholder - fixed items for now */}
                    <div className="absolute left-0 top-full hidden group-hover:block w-56 card shadow-lg p-1 z-50">
                        {menus[menuName].map((item, idx) => (
                            item.divider ? (
                                <div key={idx} className="my-1 border-t border-light-border dark:border-dark-border" />
                            ) : (
                                <button
                                    key={idx}
                                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded hover:bg-light-background dark:hover:bg-dark-background transition-colors text-left"
                                >
                                    <span>{item.label}</span>
                                    {item.shortcut && (
                                        <span className="text-light-text-disabled dark:text-dark-text-disabled ml-4">
                                            {item.shortcut}
                                        </span>
                                    )}
                                </button>
                            )
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
