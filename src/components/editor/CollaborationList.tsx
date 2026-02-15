import React, { useEffect, useState } from 'react';
import { YjsService } from '@/lib/sync/YjsService';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';

interface Peer {
    clientId: number;
    name: string;
    color: string;
}

export const CollaborationList: React.FC<{ noteId: string }> = ({ noteId }) => {
    const [peers, setPeers] = useState<Peer[]>([]);
    const [showAll, setShowAll] = useState(false);
    const { activeRoom, identity } = useSyncStore();

    useEffect(() => {
        const providers = YjsService.providers.get(noteId);
        const webrtcProvider = providers?.find((p: any) => p.awareness);

        if (!webrtcProvider) {
            setPeers([]);
            return;
        }

        const handleUpdate = () => {
            const states = webrtcProvider.awareness.getStates();
            const activePeers: Peer[] = [];

            states.forEach((state: any, clientId: number) => {
                if (state.user) {
                    activePeers.push({
                        clientId,
                        name: state.user.name || 'Anonymous',
                        color: state.user.color || '#1a73e8'
                    });
                }
            });

            setPeers(activePeers);
        };

        webrtcProvider.awareness.on('update', handleUpdate);
        handleUpdate();

        return () => {
            webrtcProvider.awareness.off('update', handleUpdate);
        };
    }, [noteId, activeRoom, identity]);

    if (peers.length <= 1) return null;

    return (
        <div className="flex items-center -space-x-2 px-2 py-1 bg-light-background dark:bg-dark-background/50 rounded-full border border-light-border dark:border-dark-border">
            <AnimatePresence>
                {peers.slice(0, 3).map((peer: Peer) => (
                    <motion.div
                        key={peer.clientId}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="w-8 h-8 rounded-full border-2 border-white dark:border-dark-surface flex items-center justify-center text-[10px] font-bold text-white shadow-sm cursor-help"
                        style={{ backgroundColor: peer.color }}
                        title={peer.name}
                    >
                        {peer.name.slice(0, 2).toUpperCase()}
                    </motion.div>
                ))}
            </AnimatePresence>

            {peers.length > 3 && (
                <div
                    className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border-2 border-white dark:border-dark-surface flex items-center justify-center text-[10px] font-bold text-light-text-secondary cursor-pointer"
                    onClick={() => setShowAll(!showAll)}
                >
                    +{peers.length - 3}
                </div>
            )}

            <div className="pl-3 pr-1 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                <Users size={12} className="inline mr-1" />
                Collaborating
            </div>
        </div>
    );
};
