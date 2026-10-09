import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, FolderCheck, ShieldCheck, ArrowRight, Loader2, X } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';

export const MigrationModal: React.FC = () => {
    const {
        isMigrationModalOpen,
        setIsMigrationModalOpen,
        pendingMigrationCount,
        migrateBrowserNotesToLocalFolder,
        localDirectoryHandle
    } = useNoteStore();

    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState<{ migratedNotes: number; migratedFolders: number } | null>(null);

    if (!isMigrationModalOpen) return null;

    const folderName = localDirectoryHandle?.name || 'Local Folder';

    const handleConfirmMigration = async () => {
        setIsMigrating(true);
        try {
            const res = await migrateBrowserNotesToLocalFolder();
            setMigrationResult(res);
            setTimeout(() => {
                setIsMigrationModalOpen(false);
                setMigrationResult(null);
                setIsMigrating(false);
            }, 1800);
        } catch (error) {
            console.error('Migration failed:', error);
            setIsMigrating(false);
        }
    };

    const handleSkip = () => {
        setIsMigrationModalOpen(false);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-lg bg-light-surface dark:bg-[#141414] border border-light-border dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8"
                >
                    {/* Close button */}
                    {!isMigrating && (
                        <button
                            onClick={handleSkip}
                            className="absolute top-5 right-5 p-2 rounded-xl text-light-text-secondary dark:text-white/40 hover:text-light-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    )}

                    {/* Icon header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            {migrationResult ? (
                                <FolderCheck size={28} className="text-green-500 animate-bounce" />
                            ) : (
                                <Copy size={28} />
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                Storage Migration Assistant
                            </span>
                            <h3 className="text-xl font-bold text-light-text-primary dark:text-white">
                                {migrationResult ? 'Migration Complete!' : 'Copy Browser Notes to Local Folder?'}
                            </h3>
                        </div>
                    </div>

                    {migrationResult ? (
                        <div className="py-6 text-center space-y-3">
                            <p className="text-sm font-semibold text-light-text-primary dark:text-white">
                                Successfully copied <span className="text-primary font-bold">{migrationResult.migratedNotes}</span> note(s) into <span className="text-primary font-bold">{folderName}</span>!
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-white/50">
                                Your browser database remains untouched as a safe backup.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-light-text-secondary dark:text-white/70 leading-relaxed mb-6">
                                We found <strong className="text-light-text-primary dark:text-white font-bold">{pendingMigrationCount} existing note(s)</strong> in your offline Browser Database. Would you like to copy and export them into your newly connected local folder (<strong className="text-primary font-bold">{folderName}</strong>)?
                            </p>

                            {/* Feature highlights */}
                            <div className="space-y-3 p-4 bg-light-background dark:bg-white/[0.03] border border-light-border dark:border-white/5 rounded-2xl mb-8 text-xs text-light-text-secondary dark:text-white/60">
                                <div className="flex items-start gap-2.5">
                                    <ArrowRight size={14} className="text-primary mt-0.5 shrink-0" />
                                    <span>Converts notes to clean <strong className="text-light-text-primary dark:text-white font-semibold">.md Markdown</strong> files with YAML frontmatter.</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <ShieldCheck size={14} className="text-green-500 mt-0.5 shrink-0" />
                                    <span><strong className="text-light-text-primary dark:text-white font-semibold">Zero Risk of Data Loss:</strong> Original notes remain safely preserved in your browser database as an offline backup.</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                                <button
                                    onClick={handleSkip}
                                    disabled={isMigrating}
                                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-light-border dark:border-white/10 text-xs font-bold text-light-text-secondary dark:text-white/60 hover:text-light-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                                >
                                    Start Fresh (Keep in Browser DB)
                                </button>
                                <button
                                    onClick={handleConfirmMigration}
                                    disabled={isMigrating}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-[#121212] font-black text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation"
                                >
                                    {isMigrating ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Copying Notes...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} />
                                            <span>Copy Notes to Local Folder</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
