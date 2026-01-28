import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { FilesSidebar } from './FilesSidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { BibleModal } from '@/components/bible/BibleModal';
import { BibleReader } from '@/components/bible/BibleReader';
import { SettingsModal } from './SettingsModal';
import { ShortcutModal } from './ShortcutModal';
import { CommandPalette } from '@/components/search/CommandPalette';
import {
    GitBranch, BookOpen, Search, Pin, X, ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { ActivityBar } from './ActivityBar';
import { OutlineSidebar } from '@/components/bible/OutlineSidebar';
import { VoiceSidebar } from '@/components/voice/VoiceSidebar';
import { ResearchSidebar } from '@/components/bible/ResearchSidebar';
import { StrongsModal } from '@/components/bible/StrongsModal';
import { LexiconSidebar } from '@/components/bible/LexiconSidebar';
import { CrossRefSidebar } from '@/components/bible/CrossRefSidebar';
import { TemplatePickerModal } from '@/components/notes/TemplatePickerModal';
import { ConnectionsSidebar } from '@/components/bible/ConnectionsSidebar';
import { AssistantSidebar } from '@/components/bible/AssistantSidebar';
import { useAIStore } from '@/stores/aiStore';
import { useNoteStore } from '@/stores/noteStore';

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
        leftSidebarWidth, // Added
        leftSidebarContent, // Added
        rightSidebarWidth,
        setRightSidebarWidth,
        rightSidebarOpen,
        rightSidebarContent,
        toggleRightSidebar,
        isLeftSidebarOpen,
        isSearchModalOpen,
        searchQuery,
        toggleSearchModal,
        isStrongsModalOpen,
        selectedStrongsId,
        toggleStrongsModal,
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

    // Initialize local AI intelligence layer
    const { init: initAI, isModelLoaded, startIndexing } = useAIStore();
    React.useEffect(() => {
        initAI();
    }, [initAI]);

    // Trigger indexing when AI model is loaded or local files change
    const { localFiles } = useNoteStore();
    React.useEffect(() => {
        if (isModelLoaded) {
            startIndexing(localFiles);
        }
    }, [isModelLoaded, startIndexing, localFiles]);

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
                {/* Activity Bar - Always visible unless focus mode */}
                {!isFocusMode && <ActivityBar />}

                {/* Left Sidebar - Tabbed Content */}
                {!isFocusMode && isLeftSidebarOpen && (
                    <>
                        <aside
                            className="bg-light-sidebar dark:bg-dark-sidebar flex flex-col h-full shrink-0 relative transition-all duration-300 ease-in-out"
                            style={{ width: `${leftSidebarWidth}px` }}
                        >
                            {leftSidebarContent === 'files' && <FilesSidebar />}
                            {leftSidebarContent === 'outline' && <OutlineSidebar />}
                            {leftSidebarContent === 'voice' && <VoiceSidebar />}
                        </aside>

                        {/* Left Resize Handle */}
                        <div
                            onMouseDown={startResizingLeft}
                            className="w-1 px-0.5 hover:bg-primary/30 cursor-col-resize transition-colors z-10 shrink-0"
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
                            className="bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border flex flex-col h-full shrink-0 relative transition-all duration-300 ease-in-out"
                            style={{ width: `${rightSidebarWidth}px` }}
                        >
                            {/* Sidebar Tabs */}
                            <div className="flex border-b border-light-border dark:border-dark-border bg-light-background/20 dark:bg-dark-background/10">
                                <button
                                    onClick={() => toggleRightSidebar('bible')}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 transition-all relative ${rightSidebarContent === 'bible' ? 'text-primary' : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary'}`}
                                >
                                    <BookOpen size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Bible</span>
                                    {rightSidebarContent === 'bible' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                                <button
                                    onClick={() => toggleRightSidebar('lexicon')}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 transition-all relative ${rightSidebarContent === 'lexicon' ? 'text-primary' : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary'}`}
                                >
                                    <Search size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Lexicon</span>
                                    {rightSidebarContent === 'lexicon' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                                <button
                                    onClick={() => toggleRightSidebar('crossrefs')}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 transition-all relative ${rightSidebarContent === 'crossrefs' ? 'text-primary' : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary'}`}
                                >
                                    <GitBranch size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Refs</span>
                                    {rightSidebarContent === 'crossrefs' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                                <button
                                    onClick={() => toggleRightSidebar('pins')}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 transition-all relative ${rightSidebarContent === 'pins' ? 'text-primary' : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary'}`}
                                >
                                    <Pin size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Pins</span>
                                    {rightSidebarContent === 'pins' && <motion.div layoutId="activeTabBadge" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                            </div>
                            <button onClick={() => toggleRightSidebar()} className="p-1.5 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-disabled"><X size={18} /></button>
                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                {rightSidebarContent === 'bible' && <BibleReader />}
                                {rightSidebarContent === 'lexicon' && <LexiconSidebar />}
                                {rightSidebarContent === 'crossrefs' && <CrossRefSidebar />}
                                {rightSidebarContent === 'pins' && <div className="h-full bg-light-surface dark:bg-dark-surface p-4">Pins (TBD)</div>}
                                {rightSidebarContent === 'connections' && <ConnectionsSidebar />}
                                {rightSidebarContent === 'assistant' && <AssistantSidebar />}

                                {!rightSidebarContent && (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border shadow-sm opacity-50">
                                            <Search size={32} className="text-light-text-disabled" />
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
