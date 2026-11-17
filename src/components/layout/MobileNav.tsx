import React, { useState } from 'react';
import {
    Files,
    BookOpen,
    Search,
    Settings,
    Plus,
    PenTool,
    Download,
    Share2,
    BookMarked,
    X,
    BookText,
    HelpCircle,
    Mic,
    LayoutList,
    GitBranch,
    Book,
    Pin,
    Sun,
    Moon,
    FilePlus
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useReadingPlanStore } from '@/stores/readingPlanStore';
import { ShareNoteModal } from '@/components/editor/ShareNoteModal';

export const MobileNav: React.FC = () => {
    const {
        leftSidebarContent,
        toggleLeftSidebar,
        rightSidebarOpen,
        rightSidebarContent,
        openRightSidebar,
        toggleSettingsModal,
        toggleSearchModal,
        toggleTemplateModal,
        toggleNoFolderModal,
        openExportModal,
        mobileBibleState,
        cycleMobileBibleState,
        toggleUserGuide,
        theme,
        toggleTheme
    } = useUIStore();

    const { hasStudyspace, currentNote, createNote } = useNoteStore();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleNewStudy = () => {
        setIsMenuOpen(false);
        if (!hasStudyspace) {
            toggleNoFolderModal(true);
            return;
        }
        toggleTemplateModal();
    };

    const handleNewBlankNote = async () => {
        setIsMenuOpen(false);
        if (!hasStudyspace) {
            toggleNoFolderModal(true);
            return;
        }
        await createNote(null);
    };

    const handleLectioMode = () => {
        setIsMenuOpen(false);
        useReadingPlanStore.setState({ isLectioModeActive: true, activePlanId: null });
    };

    const handleBibleTap = () => {
        cycleMobileBibleState();
    };

    return (
        <>
            {/* Mobile Actions Sheet */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed left-3 right-3 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-4 shadow-2xl z-[85] space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar"
                            style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                                <span className="text-xs font-black uppercase tracking-widest text-light-text-secondary">Actions & Tools</span>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    aria-label="Close Actions"
                                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleNewBlankNote}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-primary text-white rounded-xl shrink-0">
                                        <FilePlus size={15} />
                                    </div>
                                    <span className="truncate">New Text Note</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        toggleLeftSidebar('voice');
                                    }}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-rose-500/15 text-rose-500 rounded-xl shrink-0">
                                        <Mic size={15} />
                                    </div>
                                    <span className="truncate">Voice Studio</span>
                                </button>

                                <button
                                    onClick={handleNewStudy}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                                        <PenTool size={15} />
                                    </div>
                                    <span className="truncate">New Study</span>
                                </button>

                                <button
                                    onClick={handleLectioMode}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl shrink-0">
                                        <BookText size={15} />
                                    </div>
                                    <span className="truncate">Lectio Mode</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsShareModalOpen(true);
                                    }}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
                                        <Share2 size={15} />
                                    </div>
                                    <span className="truncate">Collaborate / Sync</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        toggleTheme();
                                    }}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                                    </div>
                                    <span className="truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        toggleLeftSidebar('outline');
                                    }}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-sky-500/10 text-sky-500 rounded-xl shrink-0">
                                        <LayoutList size={15} />
                                    </div>
                                    <span className="truncate">Outline</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        toggleSearchModal();
                                    }}
                                    className="flex items-center gap-2.5 p-2.5 min-h-[44px] bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs text-left touch-manipulation"
                                >
                                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                                        <Search size={15} />
                                    </div>
                                    <span className="truncate">Search All</span>
                                </button>
                            </div>

                            {currentNote && (
                                <div className="space-y-1.5 pt-2 border-t border-light-border dark:border-dark-border">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary opacity-70">Export Current Note</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['md', 'pdf', 'docx'] as const).map((fmt) => (
                                            <button
                                                key={fmt}
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    openExportModal(fmt);
                                                }}
                                                className="flex items-center justify-center gap-1.5 py-2 px-2 min-h-[40px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs uppercase touch-manipulation"
                                            >
                                                <Download size={13} />
                                                <span>{fmt}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Study Reference Sidebars */}
                            <div className="space-y-1.5 pt-2 border-t border-light-border dark:border-dark-border">
                                <span className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary opacity-70">Bible Exegesis & Study Panels</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setIsMenuOpen(false); openRightSidebar('crossrefs'); }}
                                        className="flex items-center gap-2 p-2.5 min-h-[42px] bg-light-background dark:bg-dark-background rounded-xl text-xs font-bold text-left touch-manipulation"
                                    >
                                        <GitBranch size={14} className="text-primary shrink-0" />
                                        <span className="truncate">TSK References</span>
                                    </button>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); openRightSidebar('lexicon'); }}
                                        className="flex items-center gap-2 p-2.5 min-h-[42px] bg-light-background dark:bg-dark-background rounded-xl text-xs font-bold text-left touch-manipulation"
                                    >
                                        <Search size={14} className="text-primary shrink-0" />
                                        <span className="truncate">Strong&apos;s Lexicon</span>
                                    </button>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); openRightSidebar('commentary'); }}
                                        className="flex items-center gap-2 p-2.5 min-h-[42px] bg-light-background dark:bg-dark-background rounded-xl text-xs font-bold text-left touch-manipulation"
                                    >
                                        <BookMarked size={14} className="text-primary shrink-0" />
                                        <span className="truncate">Commentary</span>
                                    </button>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); openRightSidebar('dictionary'); }}
                                        className="flex items-center gap-2 p-2.5 min-h-[42px] bg-light-background dark:bg-dark-background rounded-xl text-xs font-bold text-left touch-manipulation"
                                    >
                                        <Book size={14} className="text-primary shrink-0" />
                                        <span className="truncate">Dictionary</span>
                                    </button>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); openRightSidebar('pins'); }}
                                        className="flex items-center gap-2 p-2.5 min-h-[42px] bg-light-background dark:bg-dark-background rounded-xl text-xs font-bold text-left touch-manipulation"
                                    >
                                        <Pin size={14} className="text-primary shrink-0" />
                                        <span className="truncate">Pinned Research</span>
                                    </button>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); toggleUserGuide(); }}
                                        className="flex items-center gap-2 p-2.5 min-h-[42px] bg-light-background dark:bg-dark-background rounded-xl text-xs font-bold text-left touch-manipulation"
                                    >
                                        <HelpCircle size={14} className="text-indigo-500 shrink-0" />
                                        <span className="truncate">User Guide</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Bar — safe-area-inset-bottom for iPhone home indicator */}
            <nav
                className="fixed bottom-0 left-0 right-0 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border flex items-center justify-around px-2 z-[70] shadow-2xl"
                style={{
                    height: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)'
                }}
            >
                <button
                    onClick={() => toggleLeftSidebar('files')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${leftSidebarContent === 'files' ? 'text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
                >
                    <Files size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Files</span>
                </button>

                <button
                    onClick={handleBibleTap}
                    className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${rightSidebarOpen && rightSidebarContent === 'bible' ? 'text-primary font-bold' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
                >
                    <BookOpen size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                        {rightSidebarOpen && rightSidebarContent === 'bible' && mobileBibleState === 'full' ? 'Bible (Full)' : 'Bible'}
                    </span>
                    {rightSidebarOpen && rightSidebarContent === 'bible' && (
                        <span className="text-[7px] font-black uppercase tracking-tighter opacity-75 leading-none">
                            {mobileBibleState === 'half' ? '▲ Expand' : '✕ Close'}
                        </span>
                    )}
                </button>

                {/* Center Compose Action Button */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-transform -mt-4 border-4 border-light-surface dark:border-dark-surface"
                >
                    <Plus size={22} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                <button
                    onClick={() => toggleSearchModal()}
                    className="flex flex-col items-center gap-1 p-2 text-light-text-secondary dark:text-dark-text-secondary opacity-60"
                >
                    <Search size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Search</span>
                </button>

                <button
                    onClick={() => toggleSettingsModal()}
                    className="flex flex-col items-center gap-1 p-2 text-light-text-secondary dark:text-dark-text-secondary opacity-60"
                >
                    <Settings size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Settings</span>
                </button>
            </nav>

            <ShareNoteModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                noteId={currentNote?.id}
            />
        </>
    );
};
