import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, X, Folder, FileText, AlertTriangle, HardDrive, Database } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';

interface TrashModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
    const {
        trashItems,
        loadTrash,
        restoreTrashItem,
        permanentlyDeleteTrashItem,
        emptyTrash,
        isLocalMode
    } = useNoteStore();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
    const [emptyInput, setEmptyInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadTrash();
            setShowEmptyConfirm(false);
            setEmptyInput('');
        }
    }, [isOpen, loadTrash]);

    const visibleItems = trashItems.filter(item => item.storageMode === (isLocalMode ? 'local' : 'browser'));

    const daysLeft = (expiresAt: number) => {
        const diff = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
        return Math.max(1, diff);
    };

    const handleRestore = async (id: string) => {
        setBusyId(id);
        try {
            await restoreTrashItem(id);
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteForever = async (id: string) => {
        setBusyId(id);
        try {
            await permanentlyDeleteTrashItem(id);
        } finally {
            setBusyId(null);
        }
    };

    const handleEmptyAll = async () => {
        if (emptyInput.trim().toUpperCase() !== 'DELETE') return;
        setBusyId('__all__');
        try {
            await emptyTrash();
            setShowEmptyConfirm(false);
            setEmptyInput('');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    key="trash-modal"
                    data-testid="trash-modal"
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Recently Deleted Trash"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        className="relative w-full max-w-lg max-h-[82vh] flex flex-col bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-light-border dark:border-dark-border flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                                    <Trash2 size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-extrabold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                                        <span>Recently Deleted</span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-primary/15 text-primary">
                                            {visibleItems.length}
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1 mt-0.5">
                                        {isLocalMode ? <HardDrive size={11} /> : <Database size={11} />}
                                        <span>Items are safely kept for 30 days before permanent removal.</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-light-text-secondary hover:text-light-text-primary dark:hover:text-white hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {visibleItems.length === 0 ? (
                                <div className="py-12 text-center space-y-2 opacity-60">
                                    <Trash2 size={32} className="mx-auto text-light-text-disabled" strokeWidth={1.5} />
                                    <p className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary">
                                        Trash is empty
                                    </p>
                                    <p className="text-[11px] text-light-text-disabled max-w-xs mx-auto">
                                        Deleted notes and folders appear here so you can restore them anytime within 30 days.
                                    </p>
                                </div>
                            ) : (
                                visibleItems.map(item => (
                                    <div
                                        key={item.id}
                                        data-testid="trash-item-row"
                                        className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-light-background/50 dark:bg-dark-background/40 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                            <div className="p-2 rounded-lg bg-light-surface dark:bg-dark-surface text-primary shrink-0 mt-0.5">
                                                {item.kind === 'folder' ? <Folder size={15} /> : <FileText size={15} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                                                    {item.name}
                                                </p>
                                                <p className="text-[10px] text-light-text-disabled mt-0.5">
                                                    Deleted {new Date(item.deletedAt).toLocaleDateString()} · {daysLeft(item.expiresAt)}d left
                                                    {item.kind === 'folder' && item.itemCount ? ` · ${item.itemCount} item${item.itemCount === 1 ? '' : 's'}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                data-testid="trash-restore-btn"
                                                disabled={busyId !== null}
                                                onClick={() => handleRestore(item.id)}
                                                className="px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-[#121212] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                                                title="Restore to original location"
                                            >
                                                <RotateCcw size={12} />
                                                <span>Restore</span>
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="trash-delete-forever-btn"
                                                disabled={busyId !== null}
                                                onClick={() => handleDeleteForever(item.id)}
                                                className="p-1.5 rounded-lg text-light-text-disabled hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                                                title="Delete permanently"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer: Empty Trash with explicit DELETE gate */}
                        {visibleItems.length > 0 && (
                            <div className="px-5 py-3.5 border-t border-light-border dark:border-dark-border bg-light-background/50 dark:bg-dark-background/50 shrink-0 space-y-2.5">
                                {!showEmptyConfirm ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-light-text-disabled">
                                            Need space immediately?
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmptyConfirm(true)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                        >
                                            Empty Trash
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                                            <AlertTriangle size={14} />
                                            <span>Type DELETE to permanently wipe all {visibleItems.length} trashed item(s):</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={emptyInput}
                                                onChange={(e) => setEmptyInput(e.target.value)}
                                                placeholder="DELETE"
                                                className="flex-1 px-3 py-1.5 rounded-lg bg-light-surface dark:bg-dark-surface border border-red-500/40 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                            />
                                            <button
                                                type="button"
                                                disabled={emptyInput.trim().toUpperCase() !== 'DELETE' || busyId !== null}
                                                onClick={handleEmptyAll}
                                                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase disabled:opacity-40 cursor-pointer"
                                            >
                                                Wipe All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowEmptyConfirm(false); setEmptyInput(''); }}
                                                className="px-2.5 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-xs font-bold"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
