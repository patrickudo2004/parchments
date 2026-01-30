import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Users, Lock, Info } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';

interface ShareNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
}

export const ShareNoteModal: React.FC<ShareNoteModalProps> = ({ isOpen, onClose, noteId }) => {
    const { identity } = useSyncStore();
    const { notes } = useNoteStore();
    const note = notes.find(n => n.id === noteId);
    const [copied, setCopied] = useState(false);

    if (!isOpen || !note) return null;

    // The "Join Link" is a conceptual link for now. 
    // In a real PWA, this would be a URL that opens the app with these params.
    const roomHash = identity ? `p-${identity.vaultHash.slice(0, 8)}-${noteId}` : `local-${noteId}`;
    const shareUrl = `${window.location.origin}/join/${roomHash}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden"
                >
                    <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Share2 size={20} />
                            </div>
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">Share Note</h3>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-secondary dark:text-dark-text-secondary">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-light-text-secondary">Collaboration Link</h4>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[10px] font-bold uppercase">
                                    <Lock size={10} />
                                    <span>Encrypted</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 p-3 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl text-xs font-mono truncate text-light-text-secondary">
                                    {shareUrl}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'}`}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-[10px] text-light-text-disabled uppercase font-black leading-relaxed">
                                Anyone with this link can collaborate on this note in real-time. edii-level and encrypted.
                            </p>
                        </div>

                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                                <Users size={18} />
                                <h5 className="font-bold text-sm">Study Room Mode</h5>
                            </div>
                            <p className="text-xs text-light-text-secondary leading-relaxed">
                                Your **Vault Key** is required to unlock this note. When a collaborator clicks the link, they will request access to your private studyspace.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                            <Info size={18} className="text-amber-600 shrink-0" />
                            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                                **Local-First Notice:** Collaboration works best when all editors are on the same network or using a public signaling relay.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-light-background dark:bg-dark-background/40 border-t border-light-border dark:border-dark-border flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-dark-background transition-all"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
