import React from 'react';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { FilesSidebar } from './FilesSidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { BibleModal } from '@/components/bible/BibleModal';
import { BibleReader } from '@/components/bible/BibleReader';
import { StrongsModal } from '@/components/bible/StrongsModal';
import { SettingsModal } from './SettingsModal';
import { AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const {
        theme,
        isBibleModalOpen,
        isStrongsModalOpen,
        isSettingsModalOpen,
        toggleSettingsModal,
        setLeftSidebarWidth,
        rightSidebarWidth,
        setRightSidebarWidth,
        rightSidebarOpen,
        rightSidebarContent,
        toggleRightSidebar,
        isLeftSidebarOpen
    } = useUIStore();

    const [isResizingLeft, setIsResizingLeft] = React.useState(false);
    const [isResizingRight, setIsResizingRight] = React.useState(false);

    const startResizingLeft = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingLeft(true);
    }, []);

    const startResizingRight = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingRight(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizingLeft(false);
        setIsResizingRight(false);
    }, []);

    const resize = React.useCallback((e: MouseEvent) => {
        if (isResizingLeft) {
            const newWidth = e.clientX;
            if (newWidth > 150 && newWidth < 600) {
                setLeftSidebarWidth(newWidth);
            }
        }
        if (isResizingRight) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 200 && newWidth < 800) {
                setRightSidebarWidth(newWidth);
            }
        }
    }, [isResizingLeft, isResizingRight, setLeftSidebarWidth, setRightSidebarWidth]);

    React.useEffect(() => {
        if (isResizingLeft || isResizingRight) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizingLeft, isResizingRight, resize, stopResizing]);

    // Ensure theme is applied to body on mount
    React.useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [theme]);

    return (
        <div className={`flex flex-col h-screen overflow-hidden bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary ${isResizingLeft || isResizingRight ? 'cursor-col-resize select-none' : ''}`}>
            <TopBar />
            <MenuBar />

            <div className="flex flex-1 overflow-hidden relative">
                {isLeftSidebarOpen && (
                    <>
                        <FilesSidebar />

                        {/* Left Resize Handle */}
                        <div
                            onMouseDown={startResizingLeft}
                            className="w-1.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
                        />
                    </>
                )}

                <main className="flex-1 overflow-hidden bg-light-surface dark:bg-dark-surface shadow-sm relative">
                    {children}
                </main>

                {/* Right Resize Handle */}
                {rightSidebarOpen && (
                    <div
                        onMouseDown={startResizingRight}
                        className="w-1.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
                    />
                )}

                {/* Right Sidebar Placeholder (e.g., Bible Panel) */}
                {rightSidebarOpen && (
                    <aside
                        className="bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border flex flex-col shrink-0 overflow-hidden relative group"
                        style={{ width: `${rightSidebarWidth}px` }}
                    >
                        {/* Global Close Button (visible on hover or always?) -> Let's put it in a consistent header if possible, or floating top-right */}
                        <button
                            onClick={() => toggleRightSidebar()}
                            className="absolute top-2 right-2 z-50 p-1 bg-light-surface dark:bg-dark-surface hover:bg-red-100 dark:hover:bg-red-900/30 text-light-text-secondary dark:text-dark-text-secondary hover:text-red-600 rounded-full shadow-sm border border-transparent hover:border-red-200 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                            title="Close Sidebar"
                        >
                            <CloseIcon fontSize="small" />
                        </button>

                        {rightSidebarContent === 'bible' ? (
                            <BibleReader />
                        ) : (
                            <>
                                <div className="p-4 border-b border-light-border dark:border-dark-border font-bold text-sm uppercase tracking-wider flex justify-between items-center">
                                    Reference Panel
                                </div>
                                <div className="flex-1 p-6 text-light-text-secondary dark:text-dark-text-secondary">
                                    <p className="text-sm italic">Open the Bible or Strong's Lookup to see details here.</p>
                                </div>
                            </>
                        )}
                    </aside>
                )}
            </div>

            <StatusBar />

            {/* Floating Modals Container */}
            <div className="fixed inset-0 pointer-events-none z-[60]">
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
