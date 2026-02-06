import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { X, Search, Settings, BookOpen } from 'lucide-react';
import { BibleReader } from './BibleReader';
import { BibleSearchOverlay } from './BibleSearchOverlay';
import { useBibleStore } from '@/stores/bibleStore';
import { AnimatePresence } from 'framer-motion';

export const BibleModal: React.FC = () => {
    const { isBibleModalOpen, toggleBibleModal } = useUIStore();
    const { isSearchOpen, setSearchOpen } = useBibleStore();
    const constraintsRef = useRef(null);
    const dragControls = useDragControls();

    if (!isBibleModalOpen) return null;

    return (
        <div ref={constraintsRef} className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <motion.div
                drag
                dragListener={false}
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={constraintsRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="pointer-events-auto bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl flex flex-col border border-light-border dark:border-dark-border overflow-hidden"
                style={{ width: '600px', height: '750px', resize: 'both', overflow: 'hidden', minWidth: '400px', minHeight: '500px' }}
            >
                {/* Header (Drag Handle) */}
                <div
                    className="h-14 border-b border-light-border dark:border-dark-border flex items-center justify-between px-6 bg-light-background/50 dark:bg-dark-background/50 backdrop-blur-md cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <BookOpen size={18} />
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-primary">Mini Bible Studyspace</span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setSearchOpen(!isSearchOpen)}
                            className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-primary text-white' : 'hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-light-text-secondary dark:text-dark-text-secondary'}`}
                            title={isSearchOpen ? "Back to Bible" : "Search (Keywords, References, Strong's)"}
                        >
                            <Search size={16} />
                        </button>
                        <button className="p-2 hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-light-text-secondary dark:text-dark-text-secondary rounded-full transition-colors" title="Settings"><Settings size={16} /></button>
                        <div className="w-[1px] h-4 bg-light-border dark:bg-dark-border mx-1" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleBibleModal();
                            }}
                            className="p-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                            title="Close (Esc)"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    <BibleReader isIndependent={true} />
                    <AnimatePresence>
                        {isSearchOpen && <BibleSearchOverlay key="search-overlay" />}
                    </AnimatePresence>
                </div>

                {/* Resize Handle (Custom) */}
                <div className="absolute bottom-1 right-1 cursor-se-resize p-1 z-50 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2L2 10H10V2Z" className="fill-light-border dark:fill-dark-border" />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
};
