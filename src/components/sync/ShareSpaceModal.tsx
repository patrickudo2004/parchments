import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Users, Lock, Info, Folder } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';

interface ShareSpaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string;
    folderName: string;
}

export const ShareSpaceModal: React.FC<ShareSpaceModalProps> = ({ isOpen, onClose, folderId, folderName }) => {
    const { identity, joinRoom, activeRoom } = useSyncStore();
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);

    const roomHash = identity ? `space-${identity.vaultHash.slice(0, 8)}-${encodeURIComponent(folderId)}` : `space-local-${encodeURIComponent(folderId)}`;
    const shareUrl = `${window.location.origin}/join/${roomHash}`;

    // Automatically join the room as the host when opening the share UI
    React.useEffect(() => {
        if (isOpen && roomHash && activeRoom !== roomHash) {
            joinRoom(roomHash, 'folder');
        }
    }, [isOpen, roomHash, joinRoom, activeRoom]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleCopyHash = async () => {
        try {
            await navigator.clipboard.writeText(roomHash);
            setCopiedHash(true);
            setTimeout(() => setCopiedHash(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
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
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">Share Space</h3>
                                <p className="text-[10px] text-light-text-secondary uppercase tracking-widest font-black opacity-60 flex items-center gap-1">
                                    <Folder size={10} />
                                    {folderName}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-secondary dark:text-dark-text-secondary">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-light-text-secondary">Space Collaboration Link</h4>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[10px] font-bold uppercase">
                                    <Lock size={10} />
                                    <span>End-to-End</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl text-xs font-mono break-all text-light-text-secondary">
                                    {shareUrl}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopy}
                                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${copiedLink ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'}`}
                                    >
                                        {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                                        {copiedLink ? 'Link Copied' : 'Copy Space Link'}
                                    </button>
                                    <button
                                        onClick={handleCopyHash}
                                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${copiedHash ? 'bg-green-500 text-white' : 'bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-background'}`}
                                    >
                                        {copiedHash ? <Check size={16} /> : <Copy size={16} />}
                                        <span>{copiedHash ? 'Hash' : 'Hash Only'}</span>
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-light-text-disabled uppercase font-black leading-relaxed">
                                Anyone with this link can collaborate on all notes within this folder in real-time.
                            </p>
                        </div>

                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                                <Users size={18} />
                                <h5 className="font-bold text-sm">Shared Space Mode</h5>
                            </div>
                            <p className="text-xs text-light-text-secondary leading-relaxed font-medium">
                                This space uses **P2P Encryption**. Collaborators will see all notes and subfolders. Changes are synced across all connected peers instantly.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                            <Info size={18} className="text-amber-600 shrink-0" />
                            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 leading-relaxed font-medium">
                                **Recursive Sync:** Creating a new note inside this folder automatically makes it available to all space members.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-light-background dark:bg-dark-background/40 border-t border-light-border dark:border-dark-border flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
                        >
                            Start Collaborating
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
