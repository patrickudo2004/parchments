import React, { useState, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export const StrongsModal: React.FC = () => {
    const { isStrongsModalOpen, toggleStrongsModal } = useUIStore();
    const constraintsRef = useRef(null);
    const dragControls = useDragControls();
    const [activeTab, setActiveTab] = useState('Definition');

    // Mock Data based on the image
    const wordData = {
        greek: 'ἀγάπη',
        transliteration: 'Agapé',
        strongsNumber: 'G26',
        pos: 'Noun, Feminine',
        pronunciation: 'ag-ah\'-pay',
        shortDef: 'Brotherly love, affection, good will, love, benevolence.',
        detailedDef: [
            'Love, Generosity: kindly concern, devotedness.',
            'The love feasts of the early church.'
        ],
        usage: 'Love, i.e. affection or benevolence; spec. (plural) a love-feast.',
        stats: [
            { label: 'love', count: 86 },
            { label: 'charity', count: 27 },
            { label: 'dear', count: 1 },
            { label: 'charitably', count: 1 },
            { label: 'feast of charity', count: 1 },
        ],
        root: { word: 'ἀγαπάω (agapaō)', id: 'G25' }
    };

    if (!isStrongsModalOpen) return null;

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
                className="pointer-events-auto bg-light-surface dark:bg-dark-surface rounded-xl shadow-2xl flex flex-col border border-light-border dark:border-dark-border overflow-hidden"
                style={{ width: '650px', height: '750px', resize: 'both', overflow: 'hidden', minWidth: '400px', minHeight: '500px' }}
            >
                {/* Header (Drag Handle) */}
                <div
                    className="h-14 border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 bg-light-background dark:bg-dark-background cursor-move select-none shrink-0"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <div className="flex items-center gap-2 text-primary font-bold text-lg">
                        <MenuBookIcon />
                        <span>Strong's Lookup</span>
                    </div>
                    <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                        <button className="p-1.5 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded transition-colors"><HistoryIcon fontSize="small" /></button>
                        <button onClick={toggleStrongsModal} className="p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded transition-colors"><CloseIcon fontSize="small" /></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-surface flex flex-col">
                    {/* Search Bar */}
                    <div className="p-4 pb-0">
                        <div className="relative group">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-disabled dark:text-dark-text-disabled group-focus-within:text-primary" />
                            <input
                                type="text"
                                defaultValue="G26"
                                className="w-full pl-10 pr-12 py-2 bg-light-background dark:bg-dark-sidebar border border-light-border dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-text-disabled border px-1 rounded">ESC</span>
                        </div>
                    </div>

                    {/* Word Header */}
                    <div className="px-6 pt-6 pb-2">
                        <div className="flex items-baseline gap-3 mb-1">
                            <h1 className="text-4xl font-bold font-serif text-light-text-primary dark:text-dark-text-primary">{wordData.greek}</h1>
                            <span className="text-xl text-light-text-secondary dark:text-dark-text-secondary">({wordData.transliteration})</span>
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold font-mono self-center">{wordData.strongsNumber}</span>
                        </div>
                        <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary opacity-80 italic">
                            {wordData.pos} | Pronunciation: <span className="opacity-100 not-italic">{wordData.pronunciation}</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-6 border-b border-light-border dark:border-dark-border flex gap-6 mt-4">
                        {['Definition', 'Concordance', 'Etymology'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab
                                        ? 'text-primary'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                                    }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 space-y-8">
                        {/* Short Def */}
                        <section>
                            <h3 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider mb-2">Short Definition</h3>
                            <p className="text-light-text-primary dark:text-dark-text-primary text-lg leading-relaxed">{wordData.shortDef}</p>
                        </section>

                        {/* Detailed Def */}
                        <section>
                            <h3 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider mb-2">Detailed Definition</h3>
                            <ol className="list-decimal list-inside space-y-2 text-light-text-primary dark:text-dark-text-primary leading-relaxed">
                                {wordData.detailedDef.map((def, i) => <li key={i}>{def}</li>)}
                            </ol>
                            <div className="mt-3 text-sm text-light-text-secondary dark:text-dark-text-secondary pl-4 border-l-2 border-light-border dark:border-dark-border">
                                Usage: {wordData.usage}
                            </div>
                        </section>

                        {/* Usage Stats Pills */}
                        <section className="bg-light-background dark:bg-dark-background p-4 rounded-lg border border-light-border dark:border-dark-border">
                            <h3 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider mb-3">KJV Usage Statistics (116)</h3>
                            <div className="flex flex-wrap gap-2">
                                {wordData.stats.map((stat) => (
                                    <div key={stat.label} className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-full px-3 py-1 text-sm flex items-center gap-2 shadow-sm">
                                        <span className="text-light-text-primary dark:text-dark-text-primary">{stat.label}</span>
                                        <span className="bg-light-background dark:bg-dark-background px-1.5 rounded text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Root Word */}
                        <section>
                            <h3 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider mb-2">Root Word</h3>
                            <p className="text-light-text-primary dark:text-dark-text-primary">
                                From <span className="text-primary hover:underline cursor-pointer">{wordData.root.word} - {wordData.root.id}</span>
                            </p>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="h-16 bg-light-background dark:bg-dark-background border-t border-light-border dark:border-dark-border flex items-center justify-between px-6 shrink-0 z-10">
                    <span className="text-xs text-light-text-disabled">Based on Strong's Exhaustive Concordance</span>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md text-sm font-medium shadow-sm hover:shaodw-md transition-shadow text-light-text-primary dark:text-dark-text-primary">
                            <ContentCopyIcon fontSize="small" /> Copy Definition
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium shadow-md hover:bg-primary-hover transition-colors">
                            <BookmarkAddIcon fontSize="small" /> Add to Sermon
                        </button>
                    </div>
                </div>

                {/* Resize Handle */}
                <div className="absolute bottom-1 right-1 cursor-se-resize p-1 z-50">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2L2 10H10V2Z" fill="#A4A9B6" />
                    </svg>
                </div>
            </motion.div>
        </div>
    );
};
