import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isDanger = false,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-light-surface dark:bg-dark-surface rounded-lg shadow-2xl overflow-hidden border border-light-border dark:border-dark-border"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-full ${isDanger ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                    <WarningAmberIcon />
                                </div>
                                <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {title}
                                </h2>
                            </div>

                            <div className="text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                {message}
                            </div>
                        </div>

                        <div className="p-4 bg-light-background dark:bg-dark-background flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={onCancel}
                            >
                                {cancelLabel}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={onConfirm}
                                className={isDanger ? 'bg-red-600 hover:bg-red-700 text-white border-none' : ''}
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
