import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, ShieldAlert, HardDrive, Database, Folder, FileText, ChevronDown } from 'lucide-react';

interface DeleteProtectionModalProps {
    isOpen: boolean;
    targetType: 'file' | 'folder';
    targetName: string;
    isLocalMode: boolean;
    noteCount?: number;
    folderCount?: number;
    sampleNames?: string[];
    onMoveToTrash: () => Promise<void> | void;
    onPermanentDelete: () => Promise<void> | void;
    onCancel: () => void;
}

export const DeleteProtectionModal: React.FC<DeleteProtectionModalProps> = ({
    isOpen,
    targetType,
    targetName,
    isLocalMode,
    noteCount = 0,
    folderCount = 0,
    sampleNames = [],
    onMoveToTrash,
    onPermanentDelete,
    onCancel,
}) => {
    const [showPermanentZone, setShowPermanentZone] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isWorking, setIsWorking] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowPermanentZone(false);
            setConfirmText('');
            setIsWorking(false);
        }
    }, [isOpen, targetName]);

    const isNonEmptyFolder = targetType === 'folder' && (noteCount > 0 || folderCount > 0);
    const requiresNameConfirmation = isNonEmptyFolder;
    const isPermanentUnlocked = !requiresNameConfirmation || confirmText.trim().toLowerCase() === targetName.trim().toLowerCase();

    const handleTrash = async () => {
        setIsWorking(true);
        try {
            await onMoveToTrash();
        } finally {
            setIsWorking(false);
        }
    };

    const handlePermanent = async () => {
        if (!isPermanentUnlocked) return;
        setIsWorking(true);
        try {
            await onPermanentDelete();
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    key="delete-protection-modal"
                    data-testid="delete-protection-modal"
                    className="fixed inset-0 z-[210] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Delete ${targetType}`}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={isWorking ? undefined : onCancel}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        className="relative w-full max-w-md bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden border border-light-border dark:border-dark-border"
                    >
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                    <AlertTriangle size={22} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-extrabold text-light-text-primary dark:text-dark-text-primary leading-snug">
                                        Remove {targetType === 'folder' ? 'Folder' : 'Note'}?
                                    </h2>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5 flex items-center gap-1.5 truncate">
                                        {targetType === 'folder' ? <Folder size={13} className="text-primary shrink-0" /> : <FileText size={13} className="text-primary shrink-0" />}
                                        <span className="font-bold truncate">"{targetName}"</span>
                                    </p>
                                </div>
                            </div>

                            {/* Storage Location Awareness Banner */}
                            <div className="p-3 rounded-xl bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border text-xs space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {isLocalMode ? (
                                        <>
                                            <HardDrive size={13} className="text-primary shrink-0" />
                                            <span>Connected Local Folder (Physical Files)</span>
                                        </>
                                    ) : (
                                        <>
                                            <Database size={13} className="text-blue-500 shrink-0" />
                                            <span>Offline Browser Database</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                    {isLocalMode
                                        ? 'Moving to Trash safely stores a backup inside .parchments-trash/ for 30 days so you can restore anytime. Deleting permanently erases files directly from your drive.'
                                        : 'Moving to Trash keeps a recoverable copy in Recently Deleted for 30 days. Deleting permanently cannot be undone.'}
                                </p>
                            </div>

                            {/* Folder Blast Radius Warning */}
                            {isNonEmptyFolder && (
                                <div
                                    data-testid="folder-blast-radius-warning"
                                    className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2"
                                >
                                    <div className="flex items-center gap-2 text-xs font-extrabold text-red-600 dark:text-red-400">
                                        <ShieldAlert size={16} className="shrink-0" />
                                        <span>
                                            Contains {noteCount} note{noteCount === 1 ? '' : 's'}
                                            {folderCount > 0 ? ` and ${folderCount} subfolder${folderCount === 1 ? '' : 's'}` : ''}
                                        </span>
                                    </div>
                                    {sampleNames.length > 0 && (
                                        <ul className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary space-y-0.5 pl-4 list-disc">
                                            {sampleNames.slice(0, 4).map((name, i) => (
                                                <li key={i} className="truncate">{name}</li>
                                            ))}
                                            {(noteCount + folderCount) > sampleNames.slice(0, 4).length && (
                                                <li className="italic opacity-75">
                                                    + {(noteCount + folderCount) - sampleNames.slice(0, 4).length} more item(s)
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Primary Safe Actions */}
                            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                <button
                                    type="button"
                                    disabled={isWorking}
                                    onClick={onCancel}
                                    className="flex-1 py-2.5 px-4 rounded-xl border border-light-border dark:border-dark-border text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-all cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isWorking}
                                    data-testid="move-to-trash-btn"
                                    onClick={handleTrash}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-[#121212] text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    <span>Move to Trash</span>
                                </button>
                            </div>

                            {/* Secondary Explicit Permanent Delete Section (Option A) */}
                            <div className="pt-2 border-t border-light-border/70 dark:border-dark-border/70">
                                <button
                                    type="button"
                                    data-testid="toggle-permanent-delete-btn"
                                    onClick={() => setShowPermanentZone(prev => !prev)}
                                    className="w-full flex items-center justify-between text-[11px] font-bold text-red-600/80 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 transition-colors py-1"
                                >
                                    <span>Or delete permanently instead (cannot be undone)</span>
                                    <ChevronDown size={14} className={`transition-transform ${showPermanentZone ? 'rotate-180' : ''}`} />
                                </button>

                                {showPermanentZone && (
                                    <div className="mt-2.5 p-3.5 rounded-xl bg-red-500/5 border border-red-500/25 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed font-medium">
                                            <strong>Permanent deletion skips Trash.</strong>{' '}
                                            {isLocalMode
                                                ? 'These files will be immediately erased from your computer or phone folder.'
                                                : 'This content will be immediately wiped from your local database and cannot be recovered.'}
                                        </p>

                                        {requiresNameConfirmation && (
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                                                    Type <span className="font-mono bg-red-500/15 px-1.5 py-0.5 rounded select-all">{targetName}</span> to confirm:
                                                </label>
                                                <input
                                                    type="text"
                                                    data-testid="permanent-delete-confirm-input"
                                                    value={confirmText}
                                                    onChange={(e) => setConfirmText(e.target.value)}
                                                    placeholder={targetName}
                                                    autoComplete="off"
                                                    className="w-full px-3 py-2 rounded-lg bg-light-surface dark:bg-dark-surface border border-red-500/40 text-xs text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            data-testid="permanent-delete-confirm-btn"
                                            disabled={!isPermanentUnlocked || isWorking}
                                            onClick={handlePermanent}
                                            className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            Delete Permanently
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
