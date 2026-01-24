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
import { ShortcutModal } from './ShortcutModal';
import { CommandPalette } from '@/components/search/CommandPalette';
import { AnimatePresence, motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const {
        theme,
        density,
        isBibleModalOpen,
        isStrongsModalOpen,
        selectedStrongsId,
        toggleStrongsModal,
        isSettingsModalOpen,
        toggleSettingsModal,
        isShortcutModalOpen,
        toggleShortcutModal,
        setLeftSidebarWidth,
        rightSidebarWidth,
        setRightSidebarWidth,
        rightSidebarOpen,
        rightSidebarContent,
        toggleRightSidebar,
        isLeftSidebarOpen,
        isSearchModalOpen,
        searchQuery,
        toggleSearchModal,
        isFocusMode,
        toast
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

    // Global Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
                e.preventDefault();
                toggleSearchModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearchModal]);

    return (
        <div className={`h-screen flex flex-col bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary ${density === 'compact' ? 'density-compact' : ''}`}>
            <TopBar />
            {!isFocusMode && <MenuBar />}

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar - Files/Explorer */}
                {!isFocusMode && isLeftSidebarOpen && (
                    <>
                        <FilesSidebar />

                        {/* Left Resize Handle */}
                        <div
                            onMouseDown={startResizingLeft}
                            className="w-1.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
                        />
                    </>
                )}

                {/* Main Content Area - Editor */}
                <main className="flex-1 overflow-hidden bg-light-surface dark:bg-dark-surface shadow-sm relative">
                    {children}
                </main>

                {/* Right Sidebar - Bible/Search */}
                {!isFocusMode && rightSidebarOpen && (
                    <>
                        {/* Right Resize Handle */}
                        <div
                            onMouseDown={startResizingRight}
                            className="w-1.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
                        />

                        <aside
                            className="bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border flex flex-col shrink-0 overflow-hidden relative group"
                            style={{ width: `${rightSidebarWidth}px` }}
                        >
                            {/* Sidebar Header */}
                            <div className="h-12 border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 shrink-0">
                                <span className="text-xs font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">{rightSidebarContent === 'bible' ? 'Bible Panel' : 'Reference Panel'}</span>
                                <button onClick={() => toggleRightSidebar()} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><CloseIcon fontSize="small" /></button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                {rightSidebarContent === 'bible' ? (
                                    <BibleReader />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border shadow-sm opacity-50">
                                            <SearchIcon className="text-light-text-disabled" fontSize="large" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest mb-1">Reference Tool</p>
                                            <p className="text-xs text-light-text-secondary leading-relaxed max-w-[200px] mx-auto opacity-70">
                                                Lexicons, Cross-references and Parallel views will appear here.
                                            </p>
                                        </div>
                                        <div className="pt-4">
                                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter rounded-full border border-primary/20">
                                                Coming in Phase 2
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                )}
            </div>

            {/* Status Bar */}
            {!isFocusMode && <StatusBar />}

            {/* Floating Modals Container */}
            <div className="fixed inset-0 pointer-events-none z-[60]">
                <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                        {isBibleModalOpen && (
                            <div key="bible-modal-wrapper" className="pointer-events-auto">
                                <BibleModal />
                            </div>
                        )}
                        {isStrongsModalOpen && (
                            <div key="strongs-modal-wrapper" className="pointer-events-auto">
                                <StrongsModal
                                    strongsId={selectedStrongsId}
                                    onClose={() => toggleStrongsModal(null)}
                                />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global Settings Modal */}
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={toggleSettingsModal}
            />

            <ShortcutModal
                isOpen={isShortcutModalOpen}
                onClose={toggleShortcutModal}
            />

            <CommandPalette
                isOpen={isSearchModalOpen}
                initialQuery={searchQuery}
                onClose={toggleSearchModal}
            />

            {/* Toast System */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-dark-surface border border-dark-border rounded-full shadow-2xl flex items-center gap-3"
                    >
                        <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-primary'}`} />
                        <span className="text-sm font-bold text-white tracking-tight">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
