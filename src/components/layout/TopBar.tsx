import React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportService, type ExportOptions } from '@/lib/export/ExportService';
import { ExportOptionsModal } from '@/components/export/ExportOptionsModal';
import { useState } from 'react';

export const TopBar: React.FC = () => {
    const { currentNote } = useNoteStore();
    const { theme, toggleTheme, toggleSettingsModal, toggleSearchModal } = useUIStore();
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<'docx' | 'pdf' | 'md' | 'html' | 'txt'>('pdf');

    const handleFormatSelect = (format: 'docx' | 'pdf' | 'md' | 'html' | 'txt') => {
        setSelectedFormat(format);
        setShowExportMenu(false);
        setShowExportModal(true);
    };

    const handleExportConfirm = async (options: ExportOptions) => {
        if (!currentNote) return;

        setShowExportModal(false);
        const { title, content } = currentNote;

        try {
            switch (selectedFormat) {
                case 'docx':
                    await exportService.exportToDocx(title, content, options);
                    break;
                case 'pdf':
                    await exportService.exportToPdf(title, content, options);
                    break;
                case 'md':
                    await exportService.exportToMarkdown(title, content, options);
                    break;
                case 'html':
                    await exportService.exportToHtml(title, content, options);
                    break;
                case 'txt':
                    // We might want proper plain text extraction later, for now using content
                    // Ideally pass simple text
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    exportService.exportToTxt(title, tempDiv.textContent || '');
                    break;
            }
        } catch (error) {
            console.error('Export failed', error);
            alert('Export failed due to an error. Check console.');
        }
    };

    return (
        <header className="h-16 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 z-50 relative">
            {/* ... branding and note title ... */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <span className="font-extrabold text-xl text-primary tracking-tight hidden sm:block">Parchments</span>
                </div>
            </div>

            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary truncate max-w-[300px] block text-center">
                    {currentNote?.title || 'Home'}
                </span>
            </div>

            <div className="flex items-center gap-4">
                {/* Search */}
                <div
                    className="relative hidden md:block cursor-pointer group"
                    onClick={toggleSearchModal}
                >
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary group-hover:text-primary transition-colors">
                        <SearchIcon fontSize="small" />
                    </div>
                    <div className="pl-9 pr-4 py-1.5 rounded-full bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-sm text-light-text-disabled w-48 flex items-center justify-between transition-all hover:border-primary/50">
                        <span>Search...</span>
                        <kbd className="text-[10px] font-bold opacity-50 px-1.5 py-0.5 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">⌘K</kbd>
                    </div>
                </div>

                {/* Export Menu */}
                {currentNote && (
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                            title="Export Note"
                        >
                            <FileDownloadIcon fontSize="small" />
                        </button>

                        {showExportMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-light-border dark:border-dark-border py-2 z-20 flex flex-col">
                                    <div className="px-4 py-2 border-b border-light-border dark:border-dark-border mb-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-light-text-secondary">Export As</p>
                                    </div>
                                    {[
                                        { id: 'docx', label: 'Word Document (.docx)' },
                                        { id: 'pdf', label: 'PDF Document (.pdf)' },
                                        { id: 'md', label: 'Markdown (.md)' },
                                        { id: 'html', label: 'HTML File (.html)' },
                                        { id: 'txt', label: 'Plain Text (.txt)' },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleFormatSelect(opt.id as any)}
                                            className="px-4 py-2 text-left text-sm hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Export Options Modal */}
                <ExportOptionsModal
                    isOpen={showExportModal}
                    format={selectedFormat}
                    onConfirm={handleExportConfirm}
                    onCancel={() => setShowExportModal(false)}
                />

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </button>

                <button
                    onClick={toggleSettingsModal}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                    title="Settings"
                >
                    <SettingsIcon fontSize="small" />
                </button>
            </div>
        </header>
    );
};
