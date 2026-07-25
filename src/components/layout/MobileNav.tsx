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
    Maximize2
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import { useSyncStore } from '@/stores/syncStore';
import { AnimatePresence, motion } from 'framer-motion';

export const MobileNav: React.FC = () => {
    const {
        leftSidebarContent,
        toggleLeftSidebar,
        rightSidebarOpen,
        rightSidebarContent,
        toggleRightSidebar,
        toggleSettingsModal,
        toggleSearchModal,
        toggleTemplateModal,
        toggleNoFolderModal,
        openExportModal
    } = useUIStore();

    const { hasStudyspace, currentNote } = useNoteStore();
    const { identity } = useSyncStore();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [bibleMobileFullscreen, setBibleMobileFullscreen] = useState(false);
    const bibleTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const bibleTapCount = React.useRef(0);

    const handleNewStudy = () => {
        setIsMenuOpen(false);
        if (!hasStudyspace) {
            toggleNoFolderModal(true);
            return;
        }
        toggleTemplateModal();
    };

    // Double-tap handler for the Bible button:
    //  - 1st tap: opens the bible panel at half-height (normal)
    //  - 2nd tap within 400ms: expands to full-screen
    //  - Tapping while in full-screen: closes it back to half (or closes if already closed)
    const handleBibleTap = () => {
        bibleTapCount.current += 1;

        if (bibleTapCount.current === 1) {
            // First tap — open/toggle at half height
            if (!rightSidebarOpen || rightSidebarContent !== 'bible') {
                setBibleMobileFullscreen(false);
                toggleRightSidebar('bible');
            }
            // Start the window for double-tap
            bibleTapTimer.current = setTimeout(() => {
                bibleTapCount.current = 0;
            }, 400);
        } else if (bibleTapCount.current === 2) {
            // Double tap — toggle full-screen
            if (bibleTapTimer.current) clearTimeout(bibleTapTimer.current);
            bibleTapCount.current = 0;
            if (rightSidebarOpen && rightSidebarContent === 'bible') {
                const next = !bibleMobileFullscreen;
                setBibleMobileFullscreen(next);
                // Dispatch a custom event so MainLayout can apply the full-screen class
                window.dispatchEvent(new CustomEvent('bible-mobile-fullscreen', { detail: { fullscreen: next } }));
            } else {
                // Bible is closed — open it at full-screen directly
                setBibleMobileFullscreen(true);
                toggleRightSidebar('bible');
                window.dispatchEvent(new CustomEvent('bible-mobile-fullscreen', { detail: { fullscreen: true } }));
            }
        }
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
                            className="fixed bottom-16 left-4 right-4 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-4 shadow-2xl z-[85] space-y-3"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
                                <span className="text-xs font-black uppercase tracking-widest text-light-text-secondary">Actions</span>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleNewStudy}
                                    className="flex items-center gap-3 p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl transition-all font-bold text-xs"
                                >
                                    <div className="p-2 bg-primary text-white rounded-xl">
                                        <PenTool size={16} />
                                    </div>
                                    <span>New Study</span>
                                </button>

                                {currentNote && (
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            openExportModal('docx');
                                        }}
                                        className="flex items-center gap-3 p-3 bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs"
                                    >
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                                            <Download size={16} />
                                        </div>
                                        <span>Export Note</span>
                                    </button>
                                )}

                                {currentNote && identity && (
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            // Share modal is toggled in TopBar / app state
                                            toggleSettingsModal('sync');
                                        }}
                                        className="flex items-center gap-3 p-3 bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs"
                                    >
                                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                            <Share2 size={16} />
                                        </div>
                                        <span>Sync Room</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        toggleSearchModal();
                                    }}
                                    className="flex items-center gap-3 p-3 bg-light-background dark:bg-dark-background hover:opacity-80 rounded-2xl transition-all font-bold text-xs"
                                >
                                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                                        <BookMarked size={16} />
                                    </div>
                                    <span>Search All</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Bar */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border flex items-center justify-around px-2 z-[70] pb-[var(--safe-area-bottom,0px)] shadow-2xl">
                <button
                    onClick={() => toggleLeftSidebar('files')}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${leftSidebarContent === 'files' ? 'text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
                >
                    <Files size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Files</span>
                </button>

                <button
                    onClick={handleBibleTap}
                    className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${rightSidebarOpen && rightSidebarContent === 'bible' ? 'text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary opacity-60'}`}
                >
                    <BookOpen size={18} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Bible</span>
                    {rightSidebarOpen && rightSidebarContent === 'bible' && !bibleMobileFullscreen && (
                        <Maximize2 size={9} className="opacity-50 -mt-0.5" />
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
        </>
    );
};
