import React from 'react';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { FilesSidebar } from './FilesSidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';

export const MainLayout: React.FC = () => {
    const { theme } = useUIStore();

    // Ensure theme is applied to body on mount
    React.useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [theme]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary">
            <TopBar />
            <MenuBar />

            <div className="flex flex-1 overflow-hidden">
                <FilesSidebar />
                <main className="flex-1 overflow-y-auto p-8 relative flex flex-col items-center justify-center">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold text-primary">Welcome to Parchments</h1>
                        <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary">Select a note to begin editing.</p>
                    </div>
                </main>
                {/* Right sidebar placeholder */}
            </div>

            <StatusBar />
        </div>
    );
};
