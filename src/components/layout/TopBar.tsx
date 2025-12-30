import React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import { ProfileModal } from '../profile/ProfileModal';

export const TopBar: React.FC = () => {
    const { currentNote } = useNoteStore();
    const { theme, toggleTheme } = useUIStore();
    const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

    return (
        <header className="h-16 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 z-50 relative">
            {/* Left: Branding */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <span className="font-extrabold text-xl text-primary tracking-tight hidden sm:block">Parchments</span>
                </div>
            </div>

            {/* Center: Note Title */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary truncate max-w-[300px] block text-center">
                    {currentNote?.title || 'Home'}
                </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative hidden md:block">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary">
                        <SearchIcon fontSize="small" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-1.5 rounded-full bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-48 transition-all"
                    />
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </button>

                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                    title="Settings"
                >
                    <SettingsIcon fontSize="small" />
                </button>
            </div>

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </header>
    );
};
