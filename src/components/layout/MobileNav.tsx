import React from 'react';
import {
    Files,
    BookOpen,
    Search,
    Settings,
    Mic
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const MobileNav: React.FC = () => {
    const {
        leftSidebarContent,
        toggleLeftSidebar,
        rightSidebarOpen,
        rightSidebarContent,
        toggleRightSidebar,
        toggleSettingsModal,
        toggleSearchModal
    } = useUIStore();

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border flex items-center justify-around px-2 z-[70] pb-[var(--safe-area-bottom,0px)]">
            <button
                onClick={() => toggleLeftSidebar('files')}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${leftSidebarContent === 'files' ? 'text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
            >
                <Files size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Files</span>
            </button>

            <button
                onClick={() => toggleRightSidebar('bible')}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${rightSidebarOpen && rightSidebarContent === 'bible' ? 'text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
            >
                <BookOpen size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Bible</span>
            </button>

            <button
                onClick={() => toggleSearchModal()}
                className="flex flex-col items-center gap-1 p-2 text-light-text-secondary dark:text-dark-text-secondary opacity-60"
            >
                <Search size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Search</span>
            </button>

            <button
                onClick={() => toggleLeftSidebar('voice')}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${leftSidebarContent === 'voice' ? 'text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
            >
                <Mic size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Voice</span>
            </button>

            <button
                onClick={() => toggleSettingsModal()}
                className="flex flex-col items-center gap-1 p-2 text-light-text-secondary dark:text-dark-text-secondary opacity-60"
            >
                <Settings size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
            </button>
        </nav>
    );
};
