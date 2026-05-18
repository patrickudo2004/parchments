import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Monitor, ShieldCheck, Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSyncStore } from '@/stores/syncStore';
import { PairingService } from '@/lib/sync/PairingService';

export const PairingModal: React.FC = () => {
    const { isPairingModalOpen, pairingMode, togglePairingModal, showToast } = useUIStore();
    const { joinedRooms, sharedFolders, joinRoom, addJoinedRoom } = useSyncStore();
    
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [clientInput, setClientInput] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [statusText, setStatusText] = useState('');

    // Reset state when modal closes
    useEffect(() => {
        if (!isPairingModalOpen) {
            PairingService.destroySession();
            setPairingCode(null);
            setClientInput('');
            setIsConnecting(false);
            setStatusText('');
        }
    }, [isPairingModalOpen]);

    // Host Effect
    useEffect(() => {
        if (isPairingModalOpen && pairingMode === 'host') {
            const initHost = async () => {
                setStatusText('Generating secure tunnel...');
                try {
                    // Gather all active room hashes
                    const hashes: string[] = [];
                    joinedRooms.forEach(r => hashes.push(r.hash));
                    sharedFolders.forEach(id => hashes.push(`space-${id}`)); // Simplified space hash

                    const { code } = await PairingService.startHostSession(hashes, () => {
                        showToast('Device connected successfully!', 'success');
                        setTimeout(() => togglePairingModal(null), 1500);
                    });
                    
                    setPairingCode(code);
                    setStatusText('Waiting for device...');
                } catch (error) {
                    showToast('Failed to start pairing session', 'error');
                    togglePairingModal(null);
                }
            };
            initHost();
        }
    }, [isPairingModalOpen, pairingMode]);

    // Client Effect
    useEffect(() => {
        if (isPairingModalOpen && pairingMode === 'client' && clientInput.length === 6) {
            const initClient = async () => {
                setIsConnecting(true);
                setStatusText('Negotiating secure tunnel...');
                
                try {
                    const hashes = await PairingService.joinClientSession(clientInput);
                    setStatusText(`Received ${hashes.length} secure workspaces...`);
                    
                    // Join all received rooms
                    let joinedCount = 0;
                    for (const hash of hashes) {
                        if (hash.startsWith('space-')) {
                            addJoinedRoom(hash, 'Shared Space', 'folder');
                            joinRoom(hash, 'folder');
                            joinedCount++;
                        }
                    }
                    
                    showToast(`Successfully paired ${joinedCount} spaces`, 'success');
                    setTimeout(() => togglePairingModal(null), 1500);
                } catch (error: any) {
                    showToast(error.message || 'Failed to connect to device', 'error');
                    setClientInput('');
                    setIsConnecting(false);
                    setStatusText('');
                }
            };
            initClient();
        }
    }, [clientInput, isPairingModalOpen, pairingMode]);

    if (!isPairingModalOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                onClick={() => togglePairingModal(null)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="w-full max-w-md bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-background/50 dark:bg-dark-background/50">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={20} className="text-primary" />
                            <h2 className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                Device Pairing
                            </h2>
                        </div>
                        <button
                            onClick={() => togglePairingModal(null)}
                            className="p-1 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-lg transition-colors text-light-text-secondary dark:text-dark-text-secondary"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 flex flex-col items-center text-center space-y-6">
                        {pairingMode === 'host' ? (
                            <>
                                <Monitor size={48} className="text-primary opacity-80" />
                                <div className="space-y-2">
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                        Enter this code on your mobile device to sync immediately.
                                    </p>
                                    <div className="text-5xl font-black tracking-[0.25em] text-light-text-primary dark:text-dark-text-primary py-4">
                                        {pairingCode ? (
                                            <span className="flex items-center justify-center gap-2">
                                                {pairingCode.slice(0, 3)} <span className="text-primary/50">-</span> {pairingCode.slice(3)}
                                            </span>
                                        ) : (
                                            <Loader2 size={32} className="animate-spin text-primary mx-auto" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        {statusText}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Smartphone size={48} className="text-primary opacity-80" />
                                <div className="space-y-4 w-full">
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                        Enter the 6-digit code shown on your laptop.
                                    </p>
                                    
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={clientInput}
                                        onChange={(e) => setClientInput(e.target.value.replace(/\D/g, ''))}
                                        disabled={isConnecting}
                                        className="w-full text-center text-4xl font-black tracking-[0.25em] py-4 bg-light-background dark:bg-dark-background border-2 border-primary/30 focus:border-primary rounded-xl outline-none text-light-text-primary dark:text-dark-text-primary transition-colors disabled:opacity-50"
                                        placeholder="------"
                                        autoFocus
                                    />

                                    {isConnecting && (
                                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary animate-pulse pt-4">
                                            <Loader2 size={16} className="animate-spin" />
                                            {statusText}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
