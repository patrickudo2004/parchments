import React from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import {
    Download,
    AlertTriangle,
    ArrowRight,
    Lock,
    X
} from 'lucide-react';

export const UpdateBanner: React.FC = () => {
    const { versionStatus, updateInfo, setVersionStatus } = useUIStore();

    if (versionStatus !== 'outdated' || !updateInfo) return null;

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-primary text-white overflow-hidden relative z-[100]"
        >
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-white/20 rounded-lg">
                        <Download size={14} className="text-white" />
                    </div>
                    <p className="text-xs font-bold tracking-tight">
                        Parchments {updateInfo.latest} is now available! <span className="hidden sm:inline opacity-80 font-normal">— {updateInfo.message}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={updateInfo.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-white text-primary rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-1.5 shadow-lg shadow-black/10"
                    >
                        Update Now <ArrowRight size={12} />
                    </a>
                    <button
                        onClick={() => setVersionStatus('up-to-date', updateInfo)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const VersionLockModal: React.FC = () => {
    const { versionStatus, updateInfo } = useUIStore();

    if (versionStatus !== 'obsolete' || !updateInfo) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-light-background/60 dark:bg-dark-background/80 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-lg bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-[32px] shadow-2xl overflow-hidden"
            >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />

                <div className="p-10 text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center shadow-inner">
                        <Lock size={40} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary tracking-tight">Version Expired</h2>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed px-4">
                            To ensure your data remains secure and compatible with the latest sync protocols, this beta version of Parchments has been retired.
                        </p>
                    </div>

                    <div className="p-4 bg-light-background dark:bg-dark-background/50 border border-light-border dark:border-dark-border rounded-2xl text-left flex gap-3">
                        <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[11px] font-black uppercase text-amber-600 tracking-wider mb-1">Developer Notice</p>
                            <p className="text-xs text-light-text-secondary">"{updateInfo.message}"</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <a
                            href={updateInfo.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            Download Stable Version <Download size={18} />
                        </a>
                        <p className="text-[10px] text-light-text-disabled uppercase font-black tracking-widest">
                            Your notes are safe and will be accessible in the new version.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
