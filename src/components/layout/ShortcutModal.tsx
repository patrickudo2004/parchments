import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';

interface ShortcutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    {
        category: 'General', items: [
            { label: 'Search / Command Palette', keys: ['Ctrl', 'K'] },
            { label: 'Toggle Left Sidebar', keys: ['Ctrl', 'B'] },
            { label: 'Toggle Bible Panel', keys: ['Ctrl', ']'] },
            { label: 'Open Settings', keys: ['Ctrl', ','] },
            { label: 'Help / Shortcuts', keys: ['F1'] },
        ]
    },
    {
        category: 'Editor', items: [
            { label: 'New Note', keys: ['Ctrl', 'N'] },
            { label: 'Save Changes', keys: ['Ctrl', 'S'] },
            { label: 'Undo', keys: ['Ctrl', 'Z'] },
            { label: 'Redo', keys: ['Ctrl', 'Y'] },
            { label: 'Find in Note', keys: ['Ctrl', 'F'] },
            { label: 'Toggle Bold', keys: ['Ctrl', 'B'] },
            { label: 'Toggle Italic', keys: ['Ctrl', 'I'] },
        ]
    },
    {
        category: 'Bible & Study', items: [
            { label: 'Strong\'s Lookup', keys: ['Ctrl', 'K'] },
            { label: 'Scan for Scriptures', keys: ['Ctrl', 'Alt', 'S'] },
            { label: 'Copy as Citation', keys: ['Ctrl', 'Shift', 'C'] },
        ]
    }
];

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl bg-light-surface dark:bg-dark-surface rounded-xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden"
                >
                    <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold">
                            <KeyboardIcon className="text-primary" />
                            <span>Keyboard Shortcuts</span>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><CloseIcon /></button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {SHORTCUTS.map((section) => (
                            <div key={section.category} className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary/70">{section.category}</h4>
                                <div className="space-y-3">
                                    {section.items.map((item) => (
                                        <div key={item.label} className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{item.label}</span>
                                            <div className="flex gap-1">
                                                {item.keys.map((key) => (
                                                    <kbd key={key} className="px-1.5 py-0.5 min-w-[24px] text-center text-[10px] font-bold bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded shadow-sm">
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-light-background dark:bg-dark-background border-t border-light-border dark:border-dark-border text-center">
                        <p className="text-[10px] text-light-text-disabled uppercase font-bold">Pro Tip: Use the Command Palette (Ctrl+K) for quick access to everything.</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
