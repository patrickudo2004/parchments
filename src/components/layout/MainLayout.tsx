import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { FilesSidebar } from './FilesSidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { MobileNav } from './MobileNav';

import { BibleModal } from '@/components/bible/BibleModal';
import { BibleReader } from '@/components/bible/BibleReader';
import { SettingsModal } from './SettingsModal';
import { ShortcutModal } from './ShortcutModal';
import { CommandPalette } from '@/components/search/CommandPalette';
import { PairingModal } from '@/components/sync/PairingModal';
import {
    Search as SearchIcon
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ActivityBar } from './ActivityBar';
import { OutlineSidebar } from '@/components/bible/OutlineSidebar';
import { VoiceSidebar } from '@/components/voice/VoiceSidebar';
import { StrongsModal } from '@/components/bible/StrongsModal';
import { LexiconSidebar } from '@/components/bible/LexiconSidebar';
import { CrossRefSidebar } from '@/components/bible/CrossRefSidebar';
import { TemplatePickerModal } from '@/components/notes/TemplatePickerModal';
import { ResearchSidebar } from '@/components/bible/ResearchSidebar';
import { RightActivityBar } from './RightActivityBar';
import { useNoteStore } from '@/stores/noteStore';
import { storagePersistence } from '@/lib/utils/storagePersistence';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { UpdateBanner, VersionLockModal } from './VersioningUI';
import { LectioMode } from '@/components/bible/LectioMode';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const {
        theme,
        density,
        isBibleModalOpen,
        isTemplateModalOpen,
        isSettingsModalOpen,
        toggleSettingsModal,
        isShortcutModalOpen,
        toggleShortcutModal,
        setLeftSidebarWidth,
        leftSidebarWidth,
        leftSidebarContent,
        rightSidebarWidth,
        setRightSidebarWidth,
        rightSidebarOpen,
        rightSidebarContent,
        toggleRightSidebar,
        isLeftSidebarOpen,
        toggleLeftSidebar,
        isSearchModalOpen,
        searchQuery,
        toggleSearchModal,
        isStrongsModalOpen,
        selectedStrongsId,
        toggleStrongsModal,
        isFocusMode,
        toast,
        isMobile,
        setIsMobile,
        isNoFolderModalOpen,
        toggleNoFolderModal,
        isRightSidebarFloating,
        isLeftSidebarFloating,
        leftSidebarPosition,
        setLeftSidebarPosition,
        rightSidebarPosition,
        setRightSidebarPosition
    } = useUIStore();
    const { hasStudyspace, openLocalFolder, createNote } = useNoteStore();

    const [isResizingLeft, setIsResizingLeft] = React.useState(false);
    const [isResizingRight, setIsResizingRight] = React.useState(false);

    // Mobile detection
    React.useEffect(() => {
        (window as any).useUIStore = useUIStore;
        (window as any).useNoteStore = useNoteStore;
        
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [setIsMobile]);

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

    React.useEffect(() => {
        storagePersistence.requestPersistence();
    }, []);

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

            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (!hasStudyspace) {
                    toggleNoFolderModal(true);
                } else {
                    createNote(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearchModal, hasStudyspace, createNote]);

    return (
        <ErrorBoundary>
            <div className={`h-[100dvh] w-full flex flex-col bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary overflow-x-hidden ${density === 'compact' ? 'density-compact' : ''} ${isMobile ? 'pb-16' : ''}`}>
                <UpdateBanner />
                <VersionLockModal />
                {!isMobile && <TopBar />}
                {!isFocusMode && !isMobile && <MenuBar />}

                <div className={`flex-1 flex overflow-hidden relative ${isMobile && rightSidebarOpen && rightSidebarContent === 'bible' ? 'flex-col' : 'flex-row'}`}>
                    {/* ... rest of the component ... */}
                    {/* Mobile Backdrop */}
                    <AnimatePresence>
                        {isMobile && (isLeftSidebarOpen || (rightSidebarOpen && rightSidebarContent !== 'bible')) && !isFocusMode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    if (isLeftSidebarOpen) toggleLeftSidebar();
                                    if (rightSidebarOpen) toggleRightSidebar();
                                }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
                            />
                        )}
                    </AnimatePresence>

                    {/* Activity Bar - Always visible unless focus mode or mobile */}
                    {!isFocusMode && !isMobile && <ActivityBar />}

                    {/* Left Sidebar - Explorer */}
                    {!isFocusMode && isLeftSidebarOpen && (
                        <>
                            <motion.aside
                                drag={isLeftSidebarFloating}
                                dragMomentum={false}
                                dragElastic={0}
                                dragConstraints={{ left: 0, top: 0, right: window.innerWidth - leftSidebarWidth, bottom: window.innerHeight - 100 }}
                                onDragEnd={(_, info) => {
                                    setLeftSidebarPosition({
                                        x: leftSidebarPosition.x + info.offset.x,
                                        y: leftSidebarPosition.y + info.offset.y
                                    });
                                }}
                                initial={false}
                                animate={{
                                    x: isLeftSidebarFloating ? leftSidebarPosition.x : 0,
                                    y: isLeftSidebarFloating ? leftSidebarPosition.y : 0
                                }}
                                className={`bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border flex flex-col h-full shrink-0 relative ${isMobile || !isLeftSidebarFloating ? 'transition-all duration-300 ease-in-out' : ''} ${isMobile ? 'fixed inset-y-0 left-0 z-[60] shadow-2xl' : isLeftSidebarFloating ? 'absolute inset-y-0 left-0 z-[40] shadow-2xl border-r rounded-r-xl overflow-hidden' : ''}`}
                                style={{
                                    width: isMobile ? '85vw' : `${Math.max(leftSidebarWidth || 280, 150)}px`,
                                    height: isLeftSidebarFloating ? '80vh' : '100%',
                                    marginTop: isLeftSidebarFloating ? '64px' : '0'
                                }}
                            >
                                {/* Drag Handle */}
                                {isLeftSidebarFloating && (
                                    <div className="h-6 bg-light-background dark:bg-dark-background border-b border-light-border dark:border-dark-border flex items-center justify-center cursor-move group">
                                        <div className="w-12 h-1 rounded-full bg-light-border dark:border-dark-border group-hover:bg-primary/50 transition-colors" />
                                    </div>
                                )}
                                <div className="flex-1 overflow-hidden">
                                    {leftSidebarContent === 'files' && <FilesSidebar />}
                                    {leftSidebarContent === 'outline' && <OutlineSidebar />}
                                    {leftSidebarContent === 'voice' && <VoiceSidebar />}
                                </div>
                            </motion.aside>

                            {/* Left Resize Handle */}
                            {!isMobile && !isLeftSidebarFloating && (
                                <div
                                    onMouseDown={startResizingLeft}
                                    className="w-1 px-0.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
                                />
                            )}
                        </>
                    )}

                    {/* Main Content Area - Editor */}
                    <main className={`overflow-hidden bg-light-surface dark:bg-dark-surface shadow-sm relative z-0 ${isMobile && rightSidebarOpen && rightSidebarContent === 'bible' ? 'h-[55%] w-full order-last' : 'flex-1 h-full'}`}>
                        {children}
                    </main>

                    {/* Right Sidebar - Bible/Search */}
                    {!isFocusMode && rightSidebarOpen && (
                        <>
                            {/* Right Resize Handle */}
                            {!isMobile && !isRightSidebarFloating && (
                                <div
                                    onMouseDown={startResizingRight}
                                    className="w-1.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
                                />
                            )}

                            <motion.aside
                                drag={!isMobile && isRightSidebarFloating}
                                dragMomentum={false}
                                dragElastic={0}
                                dragConstraints={{ left: -(window.innerWidth - rightSidebarWidth), top: 0, right: 0, bottom: window.innerHeight - 100 }}
                                onDragEnd={(_, info) => {
                                    setRightSidebarPosition({
                                        x: rightSidebarPosition.x + info.offset.x,
                                        y: rightSidebarPosition.y + info.offset.y
                                    });
                                }}
                                initial={false}
                                animate={{
                                    x: isRightSidebarFloating ? rightSidebarPosition.x : 0,
                                    y: isRightSidebarFloating ? rightSidebarPosition.y : 0
                                }}
                                className={`bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border flex flex-col shrink-0 relative transition-all duration-300 ease-in-out ${
                                    isMobile && rightSidebarContent === 'bible'
                                        ? 'w-full h-[45%] border-b order-first z-10'
                                        : isMobile
                                            ? 'fixed inset-y-0 right-0 z-[60] shadow-2xl border-l'
                                            : isRightSidebarFloating
                                                ? 'absolute inset-y-0 right-0 z-[40] shadow-2xl border-l rounded-l-xl overflow-hidden'
                                                : 'border-l h-full'
                                }`}
                                style={isMobile && rightSidebarContent === 'bible' ? {} : {
                                    width: isMobile ? '85vw' : `${Math.max(rightSidebarWidth || 350, 200)}px`,
                                    height: isRightSidebarFloating ? '80vh' : '100%',
                                    marginTop: isRightSidebarFloating ? '64px' : '0'
                                }}
                            >
                                {/* Drag Handle */}
                                {isRightSidebarFloating && (
                                    <div className="h-6 bg-light-background dark:bg-dark-background border-b border-light-border dark:border-dark-border flex items-center justify-center cursor-move group">
                                        <div className="w-12 h-1 rounded-full bg-light-border dark:border-dark-border group-hover:bg-primary/50 transition-colors" />
                                    </div>
                                )}
                                {/* Content */}
                                <div className="flex-1 overflow-hidden">
                                    {rightSidebarContent === 'bible' && <BibleReader />}
                                    {rightSidebarContent === 'lexicon' && <LexiconSidebar />}
                                    {rightSidebarContent === 'crossrefs' && <CrossRefSidebar />}
                                    {rightSidebarContent === 'pins' && <ResearchSidebar />}

                                    {!rightSidebarContent && (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border shadow-sm opacity-50">
                                                <SearchIcon size={32} className="text-light-text-disabled" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest mb-1">Reference Tool</p>
                                                <p className="text-xs text-light-text-secondary leading-relaxed max-w-[200px] mx-auto opacity-70">
                                                    Lexicons, Cross-references and Parallel views will appear here.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.aside>
                        </>
                    )}

                    {/* Right Activity Bar - Always visible unless focus mode or mobile */}
                    {!isFocusMode && !isMobile && <RightActivityBar />}
                </div>

                {/* Mobile Navigation */}
                {isMobile && !isFocusMode && <MobileNav />}

                {/* Status Bar */}
                {!isFocusMode && !isMobile && <StatusBar />}

                {/* Floating Modals Container */}
                <div className="fixed inset-0 pointer-events-none z-[60]">
                    <div className="absolute inset-0 pointer-events-none">
                        <AnimatePresence>
                            {isBibleModalOpen && (
                                <div key="bible-modal-wrapper" className="pointer-events-auto">
                                    <BibleModal />
                                </div>
                            )}
                            {isTemplateModalOpen && (
                                <div key="template-modal-wrapper" className="pointer-events-auto">
                                    <TemplatePickerModal />
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

                            {isNoFolderModalOpen && (
                                <div key="no-folder-modal-wrapper" className="pointer-events-auto">
                                    <ConfirmModal
                                        isOpen={isNoFolderModalOpen}
                                        title="Open Studyspace"
                                        message="You need to open a local folder to begin creating notes. Select a folder on your device where your study sessions will be saved."
                                        confirmLabel="Open Folder"
                                        onConfirm={() => {
                                            toggleNoFolderModal(false);
                                            openLocalFolder();
                                        }}
                                        onCancel={() => toggleNoFolderModal(false)}
                                    />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            {/* Global Modals */}
            <LectioMode />
            <PairingModal />
            <CommandPalette
                isOpen={isSearchModalOpen}
                initialQuery={searchQuery}
                onClose={toggleSearchModal}
            />
            <BibleModal />
            <SettingsModal isOpen={isSettingsModalOpen} onClose={toggleSettingsModal} />
            <ShortcutModal isOpen={isShortcutModalOpen} onClose={toggleShortcutModal} />
            <TemplatePickerModal />
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
        </ErrorBoundary>
    );
};
