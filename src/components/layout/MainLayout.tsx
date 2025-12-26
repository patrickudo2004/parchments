import React from 'react';
import { TopBar } from './TopBar';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { RichTextEditor } from '../editor/RichTextEditor';
import { FilesSidebar } from './FilesSidebar';
import { useNoteStore } from '@/stores/noteStore';

interface MainLayoutProps {
    children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { createNote, setCurrentNote } = useNoteStore();

    // Define global shortcuts
    useKeyboardShortcuts({
        'Ctrl+N': async () => {
            const note = await createNote(null);
            setCurrentNote(note);
        },
        'Ctrl+Shift+N': () => console.log('Shortcut: New Folder'),
        'Ctrl+P': () => window.print(),
        'Ctrl+Z': () => console.log('Shortcut: Undo'),
        'Ctrl+Y': () => console.log('Shortcut: Redo'),
        'Ctrl+\\': () => console.log('Shortcut: Toggle Sidebar'),
        'F11': () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        },
        'Ctrl+=': () => console.log('Shortcut: Zoom In'),
        'Ctrl+-': () => console.log('Shortcut: Zoom Out'),
        'Ctrl+B': () => console.log('Shortcut: Bible Verse'),
        'Ctrl+K': () => console.log('Shortcut: Link'),
    });

    return (
        <div className="h-screen flex flex-col bg-light-background dark:bg-dark-background transition-colors overflow-hidden">
            {/* Header section */}
            <TopBar />
            <MenuBar />

            {/* Main content area */}
            <main className="flex-1 flex overflow-hidden relative">
                <FilesSidebar />

                {/* Editor area */}
                <div className="flex-1 h-full overflow-hidden flex flex-col">
                    {children || <RichTextEditor />}
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
