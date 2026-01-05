import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import TextFieldsIcon from '@mui/icons-material/TextFields';
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
                    className="h-10 border-b border-light-border dark:border-dark-border flex items-center justify-between px-3 bg-light-background dark:bg-dark-background cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <span className="font-bold text-xs uppercase tracking-wider text-light-text-secondary">Quick Bible Reference</span>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary" onPointerDown={(e) => e.stopPropagation()}>
                        <button className="p-1 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"><SearchIcon fontSize="small" /></button>
                        <button className="p-1 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"><TextFieldsIcon fontSize="small" /></button>
                        <div className="w-[1px] h-3 bg-light-border dark:border-dark-border mx-1" />
                        <button onClick={toggleBibleModal} className="p-1 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded transition-colors"><CloseIcon fontSize="small" /></button>
                    </div>
                </div>

                {/* Content Area */}
                <BibleReader />

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
