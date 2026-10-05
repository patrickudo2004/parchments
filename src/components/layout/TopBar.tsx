import React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { exportService, type ExportOptions } from '@/lib/export/ExportService';
import { ExportOptionsModal } from '@/components/export/ExportOptionsModal';
import { useState } from 'react';
import { PenTool, Search, Moon, Sun, Settings, Download, Share2, BookOpen } from 'lucide-react';
import { AlertModal } from '@/components/ui/AlertModal';
import { useSyncStore } from '@/stores/syncStore';
import { CollaborationList } from '@/components/editor/CollaborationList';
import { ShareNoteModal } from '@/components/editor/ShareNoteModal';
import { useReadingPlanStore } from '@/stores/readingPlanStore';

export const TopBar: React.FC = () => {
    const { currentNote, hasStudyspace } = useNoteStore();
    const {
        theme, toggleTheme, toggleSettingsModal, toggleSearchModal,
        isExportModalOpen, exportFormat, closeExportModal, openExportModal,
        toggleTemplateModal, toggleNoFolderModal
    } = useUIStore();
    const { identity } = useSyncStore();
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleFormatSelect = (format: 'pdf' | 'docx' | 'md' | 'html' | 'txt') => {
        openExportModal(format);
        setShowExportMenu(false);
    };

    const handleNewStudy = () => {
        if (!hasStudyspace) {
            toggleNoFolderModal(true);
            return;
        }

        toggleTemplateModal();
    };

    const handleExportConfirm = async (options: ExportOptions) => {
        if (!currentNote) return;

        closeExportModal();
        const { title, content } = currentNote;
        const author = identity ? `Parchments User (${identity.publicKey.slice(0, 8)})` : 'Parchments User';
        const exportOptions = { ...options, author };

        try {
            switch (exportFormat) {
                case 'docx':
                    await exportService.exportToDocx(title, content, exportOptions);
                    break;
                case 'pdf':
                    await exportService.exportToPdf(title, content, exportOptions);
                    break;
                case 'md':
                    await exportService.exportToMarkdown(title, content, exportOptions);
                    break;
                case 'html':
                    await exportService.exportToHtml(title, content, exportOptions);
                    break;
                case 'txt':
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = content;
                    exportService.exportToTxt(title, tempDiv.textContent || '');
                    break;
            }
        } catch (error) {
            console.error('Export failed', error);
            setAlertMessage('Export failed due to an error. Check console.');
            setIsAlertOpen(true);
        }
    };

    return (
        <header className="h-14 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 z-50 relative pt-[var(--safe-area-top,0px)] gap-2">
            {/* Left: Branding & Quick Study / Lectio triggers */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                        <img src="/logo.png" alt="Parchments" className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="font-extrabold text-lg sm:text-xl text-primary tracking-tight hidden md:block">Parchments</span>
                </div>

                <button
                    onClick={handleNewStudy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-full hover:bg-primary/20 transition-all active:scale-95 shrink-0"
                >
                    <PenTool size={13} />
                    <span className="hidden sm:inline">New Study</span>
                </button>

                <button
                    onClick={() => useReadingPlanStore.setState({ isLectioModeActive: true, activePlanId: null })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest rounded-full hover:bg-primary/20 transition-all active:scale-95 shrink-0"
                >
                    <BookOpen size={13} />
                    <span className="hidden sm:inline">Lectio Mode</span>
                </button>
            </div>

            {/* Center: Note Title & Collaboration badge (flex-1 so it truncates and NEVER overlaps buttons) */}
            <div className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2">
                <span className="text-xs sm:text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary truncate max-w-[140px] sm:max-w-[240px] md:max-w-[320px] text-center">
                    {currentNote?.title || 'Home'}
                </span>
                {currentNote && (
                    <div className="hidden lg:block shrink-0">
                        <CollaborationList noteId={currentNote.id} />
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Search */}
                <div
                    className="relative hidden xl:block cursor-pointer group"
                    onClick={() => toggleSearchModal()}
                >
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary group-hover:text-primary transition-colors">
                        <Search size={15} />
                    </div>
                    <div className="pl-9 pr-3 py-1.5 rounded-full bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-xs text-light-text-disabled w-40 flex items-center justify-between transition-all hover:border-primary/50">
                        <span>Search...</span>
                        <kbd className="text-[10px] font-bold opacity-50 px-1 py-0.5 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">⌘K</kbd>
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
                            <Download size={18} />
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

                {/* Collaborate / Share Button (ALWAYS VISIBLE!) */}
                <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-primary active:scale-95"
                    title={currentNote ? "Share / Collaborate on Note" : "Join a Shared Note"}
                >
                    <Share2 size={18} />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button
                    onClick={() => toggleSettingsModal()}
                    className="p-2 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                    title="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>

            <ExportOptionsModal
                isOpen={isExportModalOpen}
                format={exportFormat || 'docx'}
                onConfirm={handleExportConfirm}
                onCancel={closeExportModal}
            />

            <AlertModal
                isOpen={isAlertOpen}
                title="Export Error"
                message={alertMessage}
                type="error"
                onClose={() => setIsAlertOpen(false)}
            />

            <ShareNoteModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                noteId={currentNote?.id}
            />
        </header>
    );
};
