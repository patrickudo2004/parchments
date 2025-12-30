import React from 'react';
import { Button } from '@/components/ui/Button';
import AddIcon from '@mui/icons-material/Add';
import MicIcon from '@mui/icons-material/Mic';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GTranslateIcon from '@mui/icons-material/GTranslate';

export const MenuBar: React.FC = () => {
    const MENU_ITEMS = [
        { label: 'File', shortcuts: 'Alt+F' },
        { label: 'Edit', shortcuts: 'Alt+E' },
        { label: 'View', shortcuts: 'Alt+V' },
        { label: 'Insert', shortcuts: 'Alt+I' },
        { label: 'Tools', shortcuts: 'Alt+T' },
        { label: 'Help', shortcuts: 'Alt+H' },
    ];

    return (
        <div className="h-20 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-6 shrink-0 relative z-40">
            {/* Left: Traditional Menu */}
            <div className="flex items-center gap-1">
                {MENU_ITEMS.map((item) => (
                    <button
                        key={item.label}
                        className="px-3 py-1.5 text-sm font-medium text-light-text-primary dark:text-dark-text-primary hover:bg-light-background dark:hover:bg-dark-background rounded transition-colors"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Right: Big Actions (Filled, Spacious) */}
            <div className="flex items-center gap-3">
                <Button variant="primary" icon={<AddIcon />}>Note</Button>
                <Button variant="primary" icon={<MicIcon />}>Voice</Button>
                <Button variant="primary" icon={<MenuBookIcon />}>Bible</Button>
                <Button variant="primary" icon={<GTranslateIcon />}>Strong's</Button>
            </div>
        </div>
    );
};
