import React from 'react';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="h-screen flex flex-col bg-light-background dark:bg-dark-background transition-colors overflow-hidden">
            {/* Header section */}
            <TopBar />
            <MenuBar />

            {/* Main content area */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar placeholder */}
                <aside className="w-64 bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border hidden lg:flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-light-border dark:border-dark-border">
                        <h2 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider">
                            Files
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <p className="text-xs text-center mt-8 text-light-text-disabled dark:text-dark-text-disabled italic">
                            No files yet
                        </p>
                    </div>
                </aside>

                {/* Editor area */}
                <div className="flex-1 h-full overflow-hidden flex flex-col">
                    {children}
                </div>

                {/* Right Sidebar placeholder (Bible/Strong's) */}
                <aside className="w-80 bg-light-surface dark:bg-dark-surface border-l border-light-border dark:border-dark-border hidden xl:flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                        <h2 className="text-xs font-bold text-light-text-disabled dark:text-dark-text-disabled uppercase tracking-wider">
                            Bible Library
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <p className="text-sm text-center mt-12 text-light-text-disabled dark:text-dark-text-disabled">
                            Select a verse or open the library to view content here.
                        </p>
                    </div>
                </aside>
            </main>

            {/* Footer section */}
            <StatusBar />
        </div>
    );
};
