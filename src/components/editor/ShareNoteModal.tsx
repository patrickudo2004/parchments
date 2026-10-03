/**
 * ShareNoteModal — unified share sheet.
 *
 * Tab 1 (default): Local Wi-Fi — opens PairNoteModal (QR / pairing code).
 * Tab 2: Join another host — opens JoinNoteModal.
 * Tab 3: Link Share (legacy Deno/WebRTC) — kept for users without shared Wi-Fi.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Check, Wifi, Link2, LogIn } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';
import { PairNoteModal } from '@/components/sync/PairNoteModal';
import { JoinNoteModal } from '@/components/sync/JoinNoteModal';

interface ShareNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
}

type Sheet = 'menu' | 'host' | 'join';

export const ShareNoteModal: React.FC<ShareNoteModalProps> = ({ isOpen, onClose, noteId }) => {
    const { identity } = useSyncStore();
    const { notes, currentNote } = useNoteStore();
    const note = notes.find(n => n.id === noteId) || (currentNote?.id === noteId ? currentNote : null);

    const [sheet, setSheet] = useState<Sheet>('menu');
    const [copiedLink, setCopiedLink] = useState(false);

    // Legacy link-share
    const encodedNoteId = encodeURIComponent(noteId);
    const roomHash = identity
        ? `p-${identity.vaultHash.slice(0, 8)}-${encodedNoteId}`
        : `local-${encodedNoteId}`;
    const shareUrl = `${window.location.origin}/join/${roomHash}${note?.title ? `?title=${encodeURIComponent(note.title)}` : ''}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const el = document.createElement('textarea');
            el.value = shareUrl;
            el.style.position = 'fixed';
            el.style.left = '-999999px';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // Reset to menu when closed
    React.useEffect(() => {
        if (!isOpen) setTimeout(() => setSheet('menu'), 300);
    }, [isOpen]);

    if (!note) return null;

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

    // ── Main menu sheet ──────────────────────────────────────────────────────
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
                                        Share Note
                                    </h3>
                                    <p className="text-light-text-secondary text-xs truncate max-w-[220px]">
                                        {note.title || 'Untitled'}
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
                            {/* ── Option 1: Host local session ─────────────── */}
                            <button
                                onClick={() => setSheet('host')}
                                className="flex items-center gap-4 p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl transition-colors text-left group"
                            >
                                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/30 transition-colors shrink-0">
                                    <Wifi size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold text-light-text-primary dark:text-dark-text-primary text-sm">
                                        Share on Local Wi-Fi
                                    </p>
                                    <p className="text-light-text-secondary text-xs mt-0.5 leading-relaxed">
                                        Host a session. Others scan your QR code to co-edit or follow — no internet needed.
                                    </p>
                                </div>
                            </button>

                            {/* ── Option 2: Join a host ────────────────────── */}
                            <button
                                onClick={() => setSheet('join')}
                                className="flex items-center gap-4 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-2xl transition-colors text-left group"
                            >
                                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30 transition-colors shrink-0">
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

                            {/* ── Divider ──────────────────────────────────── */}
                            <div className="flex items-center gap-3 my-1">
                                <div className="flex-1 h-px bg-light-border dark:bg-dark-border" />
                                <span className="text-light-text-disabled text-xs">or share a link</span>
                                <div className="flex-1 h-px bg-light-border dark:bg-dark-border" />
                            </div>

                            {/* ── Option 3: Legacy link share ──────────────── */}
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl text-xs font-mono break-all text-light-text-secondary">
                                    {shareUrl}
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                        copiedLink
                                            ? 'bg-green-500 text-white'
                                            : 'bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-background'
                                    }`}
                                >
                                    {copiedLink ? <Check size={14} /> : <Link2 size={14} />}
                                    {copiedLink ? 'Link Copied!' : 'Copy Internet Share Link'}
                                </button>
                                <p className="text-[10px] text-light-text-disabled text-center leading-relaxed">
                                    Requires both devices to be online. Uses an external signaling relay.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
