/**
 * ShareNoteModal — Unified local collaboration sheet.
 *
 * Mode 1: Host on Local Wi-Fi (QR code & 6-digit PIN via PairNoteModal)
 * Mode 2: Join a Shared Note (Camera QR scanner & manual PIN via JoinNoteModal)
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Wifi, LogIn } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { PairNoteModal } from '@/components/sync/PairNoteModal';
import { JoinNoteModal } from '@/components/sync/JoinNoteModal';

interface ShareNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId?: string | null;
}

type Sheet = 'menu' | 'host' | 'join';

export const ShareNoteModal: React.FC<ShareNoteModalProps> = ({ isOpen, onClose, noteId }) => {
    const { notes, currentNote } = useNoteStore();
    const effectiveNoteId = noteId || currentNote?.id;
    const note = notes.find(n => n.id === effectiveNoteId) || (currentNote?.id === effectiveNoteId ? currentNote : null);

    const [sheet, setSheet] = useState<Sheet>('menu');

    // Reset to menu when closed
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => setSheet('menu'), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Sub-modals render on top and are self-contained
    if (sheet === 'host') {
        return (
            <PairNoteModal
                isOpen={isOpen}
                onClose={() => { setSheet('menu'); }}
            />
        );
    }

    if (sheet === 'join') {
        return (
            <JoinNoteModal
                isOpen={isOpen}
                onClose={() => { setSheet('menu'); }}
            />
        );
    }

    // Main menu sheet
    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <Share2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                        {note ? 'Share Note' : 'Collaborate'}
                                    </h3>
                                    <p className="text-light-text-secondary text-xs truncate max-w-[220px]">
                                        {note ? (note.title || 'Untitled Note') : 'Local Wi-Fi Sync'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-3">
                            {/* Option 1: Host local session */}
                            <button
                                onClick={() => {
                                    if (note) setSheet('host');
                                }}
                                disabled={!note}
                                className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                                    note
                                        ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 active:scale-[0.98]'
                                        : 'opacity-40 bg-gray-500/10 border-gray-500/20 cursor-not-allowed'
                                }`}
                            >
                                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                                    <Wifi size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-light-text-primary dark:text-dark-text-primary text-sm">
                                        Share on Local Wi-Fi
                                    </p>
                                    <p className="text-light-text-secondary text-xs mt-0.5 leading-relaxed">
                                        {note
                                            ? 'Host a session. Others scan your QR code to co-edit or follow without internet.'
                                            : 'Open a study note first to host a sharing session.'}
                                    </p>
                                </div>
                            </button>

                            {/* Option 2: Join a host */}
                            <button
                                onClick={() => setSheet('join')}
                                className="flex items-center gap-4 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-2xl transition-all text-left active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
                                    <LogIn size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-light-text-primary dark:text-dark-text-primary text-sm">
                                        Join a Shared Note
                                    </p>
                                    <p className="text-light-text-secondary text-xs mt-0.5 leading-relaxed">
                                        Scan the host's QR code or enter the 6-digit pairing code to connect.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
