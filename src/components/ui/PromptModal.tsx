import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Input } from './Input';
import { Edit2 } from 'lucide-react';

interface PromptModalProps {
    isOpen: boolean;
    title: string;
    label: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
    isOpen,
    title,
    label,
    defaultValue = '',
    placeholder = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        onConfirm(value);
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
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden border border-light-border dark:border-dark-border"
                    >
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Edit2 size={24} />
                                </div>
                                <h2 className="text-xl font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tighter">
                                    {title}
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                    {label}
                                </label>
                                <Input
                                    autoFocus
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full"
                                />
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onCancel}
                                    className="rounded-xl px-6"
                                >
                                    {cancelLabel}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="rounded-xl px-6"
                                >
                                    {confirmLabel}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
