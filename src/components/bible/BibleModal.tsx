import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { BibleReader } from './BibleReader';

export const BibleModal: React.FC = () => {
    const { isBibleModalOpen, toggleBibleModal } = useUIStore();
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
                className="pointer-events-auto bg-light-surface dark:bg-dark-surface rounded-lg shadow-2xl flex flex-col border border-light-border dark:border-dark-border overflow-hidden"
                style={{ width: '600px', height: '700px', resize: 'both', overflow: 'hidden', minWidth: '400px', minHeight: '500px' }}
            >
                {/* Header (Drag Handle) */}
                <div
                    className="h-12 border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 bg-light-background dark:bg-dark-background cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="flex items-center gap-2">
                        <MenuBookIcon sx={{ fontSize: 18 }} className="text-primary" />
                        <span className="font-bold text-xs uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">Mini Bible App</span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                        <button className="p-1.5 hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-light-text-secondary dark:text-dark-text-secondary rounded transition-colors" title="Search"><SearchIcon fontSize="small" /></button>
                        <button className="p-1.5 hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-light-text-secondary dark:text-dark-text-secondary rounded transition-colors" title="Settings"><TextFieldsIcon fontSize="small" /></button>
                        <div className="w-[1px] h-4 bg-light-border dark:bg-dark-border mx-1" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleBibleModal();
                            }}
                            className="p-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                            title="Close (Esc)"
                        >
                            <CloseIcon fontSize="small" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <BibleReader isIndependent={true} />

                {/* Resize Handle (Custom) */}
                <div className="absolute bottom-1 right-1 cursor-se-resize p-1 z-50 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2L2 10H10V2Z" fill="#A4A9B6" />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
};
