import React from 'react';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { FilesSidebar } from './FilesSidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { BibleModal } from '@/components/bible/BibleModal';
import { StrongsModal } from '@/components/bible/StrongsModal';
import { SettingsModal } from './SettingsModal';
import { AnimatePresence } from 'framer-motion';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { theme, isBibleModalOpen, isStrongsModalOpen, isSettingsModalOpen, toggleSettingsModal } = useUIStore();

    // Ensure theme is applied to body on mount
    React.useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [theme]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary">
            <TopBar />
            <MenuBar />

            <div className="flex flex-1 overflow-hidden relative">
                <FilesSidebar />
                <main className="flex-1 overflow-hidden bg-light-surface dark:bg-dark-surface shadow-sm">
                    {children}
                </main>
            </div>

            <StatusBar />

            {/* Floating Modals Container */}
            <div className="fixed inset-0 pointer-events-none z-50">
                <div className="absolute inset-0">
                    <AnimatePresence>
                        {isBibleModalOpen && <BibleModal />}
                        {isStrongsModalOpen && <StrongsModal />}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global Settings Modal */}
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={toggleSettingsModal}
            />
        </div>
    );
};
