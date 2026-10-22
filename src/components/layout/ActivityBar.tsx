import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
    Files,
    LayoutList,
    Mic,
    Settings,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { motion } from 'framer-motion';

export const ActivityBar: React.FC = () => {
    const {
        leftSidebarContent,
        toggleLeftSidebar,
        isLeftSidebarOpen,
        toggleRightSidebar,
        rightSidebarContent,
        rightSidebarOpen,
        toggleSettingsModal,
        isLeftSidebarFloating,
        toggleLeftSidebarFloating
    } = useUIStore();

    const items = [
        { id: 'files', icon: Files, label: 'Explorer' },
        { id: 'outline', icon: LayoutList, label: 'Outline' },
        { id: 'voice', icon: Mic, label: 'Voice' },
    ];

    return (
        <aside className="w-12 bg-light-background dark:bg-dark-background border-r border-light-border dark:border-dark-border flex flex-col items-center py-4 z-20 shrink-0 select-none">
            {/* Top Navigation */}
            <div className="flex-1 flex flex-col gap-3 w-full px-1 items-center">
                {items.map((item: any) => {
                    const isActive = (item.target === 'right')
                        ? (rightSidebarOpen && rightSidebarContent === item.id)
                        : (isLeftSidebarOpen && leftSidebarContent === item.id);

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.target === 'right') {
                                    toggleRightSidebar(item.id as any);
                                } else {
                                    toggleLeftSidebar(item.id as any);
                                }
                            }}
                            className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-95 ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                                }`}
                            title={item.label}
                            aria-label={item.label}
                        >
                            <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />

                            {/* Active Indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeBarIndicator"
                                    className="absolute left-[-4px] w-1 h-5 bg-primary rounded-r-full"
                                />
                            )}

                            {/* Tooltip (CSS Only) */}
                            <div className="absolute left-11 px-2.5 py-1 rounded bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Bottom Global Actions */}
            <div className="flex flex-col gap-3 w-full px-1 items-center">
                <button
                    onClick={toggleLeftSidebarFloating}
                    className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 active:scale-95 ${isLeftSidebarFloating ? 'text-primary bg-primary/10' : 'text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'}`}
                    title={isLeftSidebarFloating ? 'Dock Sidebar' : 'Undock Sidebar'}
                    aria-label={isLeftSidebarFloating ? 'Dock Sidebar' : 'Undock Sidebar'}
                >
                    {isLeftSidebarFloating ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
                </button>

                <button
                    onClick={() => toggleSettingsModal()}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all active:scale-95"
                    title="Settings"
                    aria-label="Settings"
                >
                    <Settings size={19} />
                </button>

                <button
                    onClick={() => toggleLeftSidebar()}
                    className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all active:scale-95"
                    title={isLeftSidebarOpen ? 'Collapse Left Sidebar' : 'Expand Left Sidebar'}
                    aria-label={isLeftSidebarOpen ? 'Collapse Left Sidebar' : 'Expand Left Sidebar'}
                >
                    {isLeftSidebarOpen ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}
                </button>
            </div>
        </aside>
    );
};
