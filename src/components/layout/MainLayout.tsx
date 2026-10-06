import React from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { FilesSidebar } from './FilesSidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { useShallow } from 'zustand/react/shallow';
import { useReadingPlanStore } from '@/stores/readingPlanStore';
import { MobileNav } from './MobileNav';

import { BibleModal } from '@/components/bible/BibleModal';
import { BibleReader } from '@/components/bible/BibleReader';
import { SettingsModal } from './SettingsModal';
import { ShortcutModal } from './ShortcutModal';
import { UserGuideModal } from '@/components/help/UserGuideModal';
import { CommandPalette } from '@/components/search/CommandPalette';
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
import { CommentarySidebar } from '@/components/bible/CommentarySidebar';
import { DictionarySidebar } from '@/components/bible/DictionarySidebar';
import { TemplatePickerModal } from '@/components/notes/TemplatePickerModal';
import { ResearchSidebar } from '@/components/bible/ResearchSidebar';
import { RightActivityBar } from './RightActivityBar';
import { useNoteStore } from '@/stores/noteStore';
import { storagePersistence } from '@/lib/utils/storagePersistence';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { UpdateBanner, VersionLockModal } from './VersioningUI';
import { LectioMode } from '@/components/bible/LectioMode';
import { HostApprovalToast } from '@/components/sync/HostApprovalToast';


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
        isUserGuideOpen,
        userGuideChapterId,
        toggleUserGuide,
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
        setRightSidebarPosition,
        mobileBibleState,
        pulpitMode
    } = useUIStore(
        useShallow(state => ({
            theme: state.theme,
            density: state.density,
            isBibleModalOpen: state.isBibleModalOpen,
            isTemplateModalOpen: state.isTemplateModalOpen,
            isSettingsModalOpen: state.isSettingsModalOpen,
            toggleSettingsModal: state.toggleSettingsModal,
            isShortcutModalOpen: state.isShortcutModalOpen,
            toggleShortcutModal: state.toggleShortcutModal,
            isUserGuideOpen: state.isUserGuideOpen,
            userGuideChapterId: state.userGuideChapterId,
            toggleUserGuide: state.toggleUserGuide,
            setLeftSidebarWidth: state.setLeftSidebarWidth,
            leftSidebarWidth: state.leftSidebarWidth,
            leftSidebarContent: state.leftSidebarContent,
            rightSidebarWidth: state.rightSidebarWidth,
            setRightSidebarWidth: state.setRightSidebarWidth,
            rightSidebarOpen: state.rightSidebarOpen,
            rightSidebarContent: state.rightSidebarContent,
            toggleRightSidebar: state.toggleRightSidebar,
            isLeftSidebarOpen: state.isLeftSidebarOpen,
            toggleLeftSidebar: state.toggleLeftSidebar,
            isSearchModalOpen: state.isSearchModalOpen,
            searchQuery: state.searchQuery,
            toggleSearchModal: state.toggleSearchModal,
            isStrongsModalOpen: state.isStrongsModalOpen,
            selectedStrongsId: state.selectedStrongsId,
            toggleStrongsModal: state.toggleStrongsModal,
            isFocusMode: state.isFocusMode,
            toast: state.toast,
            isMobile: state.isMobile,
            setIsMobile: state.setIsMobile,
            isNoFolderModalOpen: state.isNoFolderModalOpen,
            toggleNoFolderModal: state.toggleNoFolderModal,
            isRightSidebarFloating: state.isRightSidebarFloating,
            isLeftSidebarFloating: state.isLeftSidebarFloating,
            leftSidebarPosition: state.leftSidebarPosition,
            setLeftSidebarPosition: state.setLeftSidebarPosition,
            rightSidebarPosition: state.rightSidebarPosition,
            setRightSidebarPosition: state.setRightSidebarPosition,
            mobileBibleState: state.mobileBibleState,
            pulpitMode: state.pulpitMode,
        }))
    );
    const { isLectioModeActive } = useReadingPlanStore();
    const hasStudyspace = useNoteStore(s => s.hasStudyspace);
    const openLocalFolder = useNoteStore(s => s.openLocalFolder);
    const createNote = useNoteStore(s => s.createNote);
    const openLooseFile = useNoteStore(s => s.openLooseFile);

    const leftDragControls = useDragControls();
    const rightDragControls = useDragControls();

    const [isResizingLeft, setIsResizingLeft] = React.useState(false);
    const [isResizingRight, setIsResizingRight] = React.useState(false);

    const [isTablet, setIsTablet] = React.useState(typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024);

    // Responsive Breakpoint Detection (Mobile < 768px, Tablet 768px - 1023px, Desktop >= 1024px)
    React.useEffect(() => {
        (window as any).useUIStore = useUIStore;
        (window as any).useNoteStore = useNoteStore;
        
        const checkBreakpoints = () => {
            const w = window.innerWidth;
            setIsMobile(w < 768);
            setIsTablet(w >= 768 && w < 1024);
        };
        checkBreakpoints();
        window.addEventListener('resize', checkBreakpoints);
        return () => window.removeEventListener('resize', checkBreakpoints);
    }, [setIsMobile]);

    const startResizingLeft = React.useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
        setIsResizingLeft(true);
    }, []);

    const startResizingRight = React.useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
        setIsResizingRight(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizingLeft(false);
        setIsResizingRight(false);
    }, []);

    const resize = React.useCallback((e: PointerEvent) => {
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
            window.addEventListener('pointermove', resize);
            window.addEventListener('pointerup', stopResizing);
            window.addEventListener('pointercancel', stopResizing);
        } else {
            window.removeEventListener('pointermove', resize);
            window.removeEventListener('pointerup', stopResizing);
            window.removeEventListener('pointercancel', stopResizing);
        }
        return () => {
            window.removeEventListener('pointermove', resize);
            window.removeEventListener('pointerup', stopResizing);
            window.removeEventListener('pointercancel', stopResizing);
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

            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                openLooseFile();
            }

            if (e.key === 'F1') {
                e.preventDefault();
                toggleUserGuide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearchModal, hasStudyspace, createNote, openLooseFile, toggleUserGuide]);

    return (
        <ErrorBoundary>
            <div className={`h-[100dvh] w-full flex flex-col bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary overflow-x-hidden ${density === 'compact' ? 'density-compact' : ''} ${isMobile && !pulpitMode && !isLectioModeActive ? 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))]' : ''}`}>
                <UpdateBanner />
                <VersionLockModal />
                {!isMobile && !isLectioModeActive && !pulpitMode && <TopBar />}
                {!isFocusMode && !isMobile && !isLectioModeActive && !pulpitMode && <MenuBar />}

                <div className={`flex-1 flex overflow-hidden relative ${isMobile && rightSidebarOpen && rightSidebarContent === 'bible' ? 'flex-col' : 'flex-row'}`}>
                    {/* ... rest of the component ... */}
                    {/* Mobile & Tablet Backdrop */}
                    <AnimatePresence>
                        {(isMobile || isTablet) && (isLeftSidebarOpen || (rightSidebarOpen && rightSidebarContent !== 'bible')) && !isFocusMode && !pulpitMode && !isLectioModeActive && (
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

                    {/* Activity Bar - Always visible unless focus mode or mobile or pulpit or lectio */}
                    {!isFocusMode && !pulpitMode && !isMobile && !isLectioModeActive && <ActivityBar />}

                    {/* Left Sidebar - Explorer */}
                    {!isFocusMode && !pulpitMode && !isLectioModeActive && isLeftSidebarOpen && (
                        <>
                            <motion.aside
                                drag={!isTablet && isLeftSidebarFloating}
                                dragListener={false}
                                dragControls={leftDragControls}
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
                                    x: !isTablet && isLeftSidebarFloating ? leftSidebarPosition.x : 0,
                                    y: !isTablet && isLeftSidebarFloating ? leftSidebarPosition.y : 0
                                }}
                                className={`bg-light-surface dark:bg-dark-surface border-r border-light-border dark:border-dark-border flex flex-col h-full shrink-0 relative ${isMobile || isTablet || !isLeftSidebarFloating ? 'transition-all duration-300 ease-in-out' : ''} ${isMobile ? 'fixed inset-y-0 left-0 z-[60] shadow-2xl' : isTablet ? 'fixed inset-y-0 left-12 z-[60] shadow-2xl border-r' : isLeftSidebarFloating ? 'absolute inset-y-0 left-0 z-[40] shadow-2xl border-r rounded-r-xl overflow-hidden' : ''}`}
                                style={{
                                    width: isMobile ? '85vw' : isTablet ? '320px' : `${Math.max(leftSidebarWidth || 280, 150)}px`,
                                    height: !isTablet && isLeftSidebarFloating ? '80vh' : '100%',
                                    marginTop: !isTablet && isLeftSidebarFloating ? '64px' : '0'
                                }}
                            >
                                {/* Drag Handle (isolated touch control) */}
                                {!isTablet && isLeftSidebarFloating && (
                                    <div
                                        onPointerDown={(e) => leftDragControls.start(e)}
                                        className="h-7 bg-light-background dark:bg-dark-background border-b border-light-border dark:border-dark-border flex items-center justify-center cursor-move group touch-none select-none shrink-0"
                                    >
                                        <div className="w-12 h-1.5 rounded-full bg-light-border dark:border-dark-border group-hover:bg-primary/50 transition-colors" />
                                    </div>
                                )}
                                <div className="flex-1 overflow-hidden">
                                    {leftSidebarContent === 'files' && <FilesSidebar />}
                                    {leftSidebarContent === 'outline' && <OutlineSidebar />}
                                    {leftSidebarContent === 'voice' && <VoiceSidebar />}
                                </div>
                            </motion.aside>

                            {/* Left Resize Handle (Touch-Accessible Hit Target) */}
                            {!isMobile && !isTablet && !isLeftSidebarFloating && (
                                <div
                                    onPointerDown={startResizingLeft}
                                    className="w-2 -mx-0.5 hover:bg-primary/30 active:bg-primary/50 cursor-col-resize transition-colors z-20 shrink-0 touch-none flex items-center justify-center group"
                                >
                                    <div className="w-[1px] h-full bg-light-border dark:bg-dark-border group-hover:bg-primary/70 transition-colors" />
                                </div>
                            )}
                        </>
                    )}

                    {/* Main Content Area - Editor */}
                    <main className={`overflow-hidden bg-light-surface dark:bg-dark-surface shadow-sm relative z-0 ${
                        isMobile && rightSidebarOpen && rightSidebarContent === 'bible'
                            ? mobileBibleState === 'full'
                                ? 'hidden'
                                : 'h-[55%] w-full order-last'
                            : 'flex-1 h-full'
                    }`}>
                        {children}
                    </main>

                    {/* Right Sidebar - Bible/Search */}
                    {!isFocusMode && !pulpitMode && !isLectioModeActive && rightSidebarOpen && (
                        <>
                            {/* Right Resize Handle (Touch-Accessible Hit Target) */}
                            {!isMobile && !isTablet && !isRightSidebarFloating && (
                                <div
                                    onPointerDown={startResizingRight}
                                    className="w-2 -mx-0.5 hover:bg-primary/30 active:bg-primary/50 cursor-col-resize transition-colors z-20 shrink-0 touch-none flex items-center justify-center group"
                                >
                                    <div className="w-[1px] h-full bg-light-border dark:bg-dark-border group-hover:bg-primary/70 transition-colors" />
                                </div>
                            )}

                            <motion.aside
                                drag={!isMobile && !isTablet && isRightSidebarFloating}
                                dragListener={false}
                                dragControls={rightDragControls}
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
                                    x: !isTablet && isRightSidebarFloating ? rightSidebarPosition.x : 0,
                                    y: !isTablet && isRightSidebarFloating ? rightSidebarPosition.y : 0
                                }}
                                className={`bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border flex flex-col shrink-0 relative transition-all duration-300 ease-in-out ${
                                    isMobile && rightSidebarContent === 'bible'
                                        ? `w-full border-b order-first z-10 ${mobileBibleState === 'full' ? 'fixed inset-0 z-[65]' : 'h-[45%]'}`
                                        : isMobile
                                            ? 'fixed inset-y-0 right-0 z-[60] shadow-2xl border-l'
                                            : isTablet
                                                ? 'fixed inset-y-0 right-12 z-[60] shadow-2xl border-l'
                                                : isRightSidebarFloating
                                                    ? 'absolute inset-y-0 right-0 z-[40] shadow-2xl border-l rounded-l-xl overflow-hidden'
                                                    : 'border-l h-full'
                                }`}
                                style={isMobile && rightSidebarContent === 'bible' ? {} : {
                                    width: isMobile ? '85vw' : isTablet ? '380px' : `${Math.max(rightSidebarWidth || 350, 200)}px`,
                                    height: !isTablet && isRightSidebarFloating ? '80vh' : '100%',
                                    marginTop: !isTablet && isRightSidebarFloating ? '64px' : '0'
                                }}
                            >
                                {/* Drag Handle (isolated touch control) */}
                                {!isTablet && isRightSidebarFloating && (
                                    <div
                                        onPointerDown={(e) => rightDragControls.start(e)}
                                        className="h-7 bg-light-background dark:bg-dark-background border-b border-light-border dark:border-dark-border flex items-center justify-center cursor-move group touch-none select-none shrink-0"
                                    >
                                        <div className="w-12 h-1.5 rounded-full bg-light-border dark:border-dark-border group-hover:bg-primary/50 transition-colors" />
                                    </div>
                                )}
                                {/* Content */}
                                <div className="flex-1 overflow-hidden">
                                    {rightSidebarContent === 'bible' && <BibleReader />}
                                    {rightSidebarContent === 'lexicon' && <LexiconSidebar />}
                                    {rightSidebarContent === 'crossrefs' && <CrossRefSidebar />}
                                    {rightSidebarContent === 'commentary' && <CommentarySidebar />}
                                    {rightSidebarContent === 'dictionary' && <DictionarySidebar />}
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

                    {/* Right Activity Bar - Always visible unless focus mode or mobile or pulpit or lectio */}
                    {!isFocusMode && !pulpitMode && !isMobile && !isLectioModeActive && <RightActivityBar />}
                </div>

                {/* Mobile Navigation */}
                {isMobile && !isFocusMode && !pulpitMode && !isLectioModeActive && <MobileNav />}

                {/* Status Bar */}
                {!isFocusMode && !pulpitMode && !isMobile && <StatusBar />}

                {/* Floating Modals Container */}
                <div className="fixed inset-0 pointer-events-none z-[150]">
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
            <HostApprovalToast />
            <CommandPalette
                isOpen={isSearchModalOpen}
                initialQuery={searchQuery}
                onClose={toggleSearchModal}
            />
            <SettingsModal isOpen={isSettingsModalOpen} onClose={toggleSettingsModal} />
            <ShortcutModal isOpen={isShortcutModalOpen} onClose={toggleShortcutModal} />
            <UserGuideModal
                isOpen={isUserGuideOpen}
                onClose={toggleUserGuide}
                initialChapterId={userGuideChapterId}
            />
                {/* Toast System */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-dark-surface border border-dark-border rounded-full shadow-2xl flex items-center gap-3"
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
