import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
    BookOpen,
    Search,
    GitBranch,
    Pin,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { motion } from 'framer-motion';

export const RightActivityBar: React.FC = () => {
    const {
        rightSidebarContent,
        toggleRightSidebar,
        rightSidebarOpen,
        isRightSidebarFloating,
        toggleRightSidebarFloating
    } = useUIStore();

    const items = [
        { id: 'bible', icon: BookOpen, label: 'Bible' },
        { id: 'lexicon', icon: Search, label: 'Lexicon' },
        { id: 'crossrefs', icon: GitBranch, label: 'References' },
        { id: 'pins', icon: Pin, label: 'Pins' },
    ];

    return (
        <aside className="w-12 bg-light-background dark:bg-dark-background border-l border-light-border dark:border-dark-border flex flex-col items-center py-4 z-20 shrink-0">
            {/* Top Navigation */}
            <div className="flex-1 flex flex-col gap-4 w-full px-2">
                {items.map((item) => {
                    const isActive = rightSidebarOpen && rightSidebarContent === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => toggleRightSidebar(item.id as any)}
                            className={`group relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                                }`}
                            title={item.label}
                        >
                            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />

                            {/* Active Indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="rightActiveBarIndicator"
                                    className="absolute right-[-8px] w-1 h-4 bg-primary rounded-l-full"
                                />
                            )}

                            {/* Tooltip (CSS Only) */}
                            <div className="absolute right-10 px-2 py-1 rounded bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-4 w-full px-2">
                <button
                    onClick={toggleRightSidebarFloating}
                    className={`group relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${isRightSidebarFloating ? 'text-primary bg-primary/10' : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'}`}
                    title={isRightSidebarFloating ? 'Dock Sidebar' : 'Undock Sidebar'}
                >
                    {isRightSidebarFloating ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                <button
                    onClick={() => toggleRightSidebar()}
                    className="group relative flex items-center justify-center w-8 h-8 rounded-lg text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all"
                >
                    {rightSidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
};
