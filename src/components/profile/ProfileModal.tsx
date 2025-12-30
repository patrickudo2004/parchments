import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { theme, toggleTheme } = useUIStore();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-light-surface dark:bg-dark-surface rounded-lg shadow-xl overflow-hidden"
                >
                    <div className="p-6 border-b border-light-border dark:border-dark-border flex justify-between items-center">
                        <h2 className="text-xl font-bold">Settings</h2>
                        <button onClick={onClose}><CloseIcon /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Dark Mode</span>
                            <button onClick={toggleTheme} className="px-4 py-2 bg-primary text-white rounded">
                                {theme === 'dark' ? 'On' : 'Off'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
