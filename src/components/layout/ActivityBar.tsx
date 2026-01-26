import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import {
    Files,
    LayoutList,
    Mic,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ActivityBar: React.FC = () => {
    const {
        leftSidebarContent,
        toggleLeftSidebar,
        isLeftSidebarOpen,
        toggleSettingsModal
    } = useUIStore();

    const items = [
        { id: 'files', icon: Files, label: 'Explorer' },
        { id: 'outline', icon: LayoutList, label: 'Outline' },
        { id: 'voice', icon: Mic, label: 'Voice' },
    ];

    return (
        <aside className="w-12 bg-light-background dark:bg-dark-background border-r border-light-border dark:border-dark-border flex flex-col items-center py-4 z-20 shrink-0">
            {/* Top Navigation */}
            <div className="flex-1 flex flex-col gap-4 w-full px-2">
                {items.map((item) => {
                    const isActive = isLeftSidebarOpen && leftSidebarContent === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => toggleLeftSidebar(item.id as any)}
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
                                    layoutId="activeBarIndicator"
                                    className="absolute left-[-8px] w-1 h-4 bg-primary rounded-r-full"
                                />
                            )}

                            {/* Tooltip (CSS Only) */}
                            <div className="absolute left-10 px-2 py-1 rounded bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Bottom Global Actions */}
            <div className="flex flex-col gap-4 w-full px-2">
                <button
                    onClick={toggleSettingsModal}
                    className="group relative flex items-center justify-center w-8 h-8 rounded-lg text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all"
                    title="Settings"
                >
                    <Settings size={18} />
                </button>

                <button
                    onClick={() => toggleLeftSidebar()}
                    className="group relative flex items-center justify-center w-8 h-8 rounded-lg text-light-text-disabled hover:text-light-text-secondary dark:hover:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all"
                >
                    {isLeftSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
            </div>
        </aside>
    );
};
