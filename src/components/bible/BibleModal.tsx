import React, { useState, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import InfoIcon from '@mui/icons-material/Info';

export const BibleModal: React.FC = () => {
    const { isBibleModalOpen, toggleBibleModal } = useUIStore();
    const constraintsRef = useRef(null);
    const dragControls = useDragControls();

    // Mock state for content
    const [version, setVersion] = useState('ESV');
    const [book, setBook] = useState('John');
    const [chapter, setChapter] = useState('3');

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
                    className="h-14 border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 bg-light-background dark:bg-dark-background cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    {/* Left: Selectors */}
                    <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                        <select
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option>ESV</option>
                            <option>NIV</option>
                            <option>KJV</option>
                        </select>
                        <span className="text-light-text-disabled">|</span>
                        <select
                            value={book}
                            onChange={(e) => setBook(e.target.value)}
                            className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option>John</option>
                            <option>Matthew</option>
                            <option>Mark</option>
                            <option>Luke</option>
                        </select>
                        <select
                            value={chapter}
                            onChange={(e) => setChapter(e.target.value)}
                            className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option>3</option>
                            <option>1</option>
                            <option>2</option>
                        </select>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary" onPointerDown={(e) => e.stopPropagation()}>
                        <button className="p-2 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"><SearchIcon fontSize="small" /></button>
                        <button className="p-2 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"><TextFieldsIcon fontSize="small" /></button>
                        <div className="w-[1px] h-4 bg-light-border dark:border-dark-border mx-1" />
                        <button onClick={toggleBibleModal} className="p-2 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded transition-colors"><CloseIcon fontSize="small" /></button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-dark-surface">
                    <h1 className="text-3xl font-bold mb-6 text-light-text-primary dark:text-dark-text-primary">John 3</h1>

                    {/* Summary Box */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 mb-6 flex gap-3 text-sm text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800">
                        <InfoIcon className="text-primary shrink-0" fontSize="small" />
                        <div>
                            <span className="font-bold">Summary:</span> Jesus teaches Nicodemus about the necessity of being born again. He emphasizes that salvation is a work of God's Spirit and famously declares God's love for the world in sending His Son to save rather than condemn.
                        </div>
                    </div>

                    {/* Text */}
                    <div className="space-y-4 text-lg leading-relaxed text-light-text-primary dark:text-dark-text-primary font-serif">
                        <p>
                            <sup className="text-secondary font-bold text-xs mr-1 align-top select-none">1</sup>
                            Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews.
                        </p>
                        <p>
                            <sup className="text-secondary font-bold text-xs mr-1 align-top select-none">2</sup>
                            This man came to Jesus by night and said to him, “Rabbi, we know that you are a teacher come from God, for no one can do these signs that you do unless God is with him.”
                        </p>
                        <p>
                            <sup className="text-secondary font-bold text-xs mr-1 align-top select-none">3</sup>
                            Jesus answered him, “Truly, truly, I say to you, unless one is born again he cannot see the kingdom of God.”
                        </p>
                        <p>
                            <sup className="text-secondary font-bold text-xs mr-1 align-top select-none">4</sup>
                            Nicodemus said to him, “How can a man be born when he is old? Can he enter a second time into his mother's womb and be born?”
                        </p>
                        <p>
                            <sup className="text-secondary font-bold text-xs mr-1 align-top select-none">5</sup>
                            Jesus answered, “Truly, truly, I say to you, unless one is born of water and the Spirit, he cannot enter the kingdom of God.
                            <sup className="text-secondary font-bold text-xs mx-1 align-top select-none">6</sup>
                            That which is born of the flesh is flesh, and that which is born of the Spirit is spirit.
                        </p>
                        <p>
                            <sup className="text-secondary font-bold text-xs mr-1 align-top select-none">7</sup>
                            Do not marvel that I said to you, ‘You must be born again.’
                            <sup className="text-secondary font-bold text-xs mx-1 align-top select-none">8</sup>
                            The wind blows where it wishes, and you hear its sound, but you do not know where it comes from or where it goes. So it is with everyone who is born of the Spirit.”
                        </p>
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="h-12 border-t border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background flex items-center justify-between px-4 shrink-0 text-sm font-medium text-primary select-none">
                    <button className="flex items-center hover:underline"><NavigateBeforeIcon fontSize="small" /> John 2</button>
                    <span className="text-light-text-disabled text-xs hidden sm:block">ESV Text Edition: 2016</span>
                    <button className="flex items-center hover:underline">John 4 <NavigateNextIcon fontSize="small" /></button>
                </div>

                {/* Resize Handle (Custom) */}
                <div className="absolute bottom-1 right-1 cursor-se-resize p-1 z-50">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2L2 10H10V2Z" fill="#A4A9B6" />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
};
