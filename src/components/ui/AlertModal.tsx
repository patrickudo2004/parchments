import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    type?: 'info' | 'error' | 'success';
    confirmLabel?: string;
    onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    title,
    message,
    type = 'info',
    confirmLabel = 'Got it',
    onClose,
}) => {
    const icons = {
        info: <Info size={24} className="text-blue-500" />,
        error: <AlertCircle size={24} className="text-red-500" />,
        success: <CheckCircle size={24} className="text-green-500" />,
    };

    const bgColors = {
        info: 'bg-blue-100 dark:bg-blue-900/30',
        error: 'bg-red-100 dark:bg-red-900/30',
        success: 'bg-green-100 dark:bg-green-900/30',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden border border-light-border dark:border-dark-border"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-xl ${bgColors[type]}`}>
                                    {icons[type]}
                                </div>
                                <h2 className="text-xl font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tighter">
                                    {title}
                                </h2>
                            </div>

                            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-medium">
                                {message}
                            </div>
                        </div>

                        <div className="p-4 bg-light-background dark:bg-dark-background flex justify-end">
                            <Button
                                variant="primary"
                                onClick={onClose}
                                className="rounded-xl px-8"
                            >
                                {confirmLabel}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
