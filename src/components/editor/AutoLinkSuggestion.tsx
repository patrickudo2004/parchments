import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Link as LinkIcon } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';

interface AutoLinkSuggestionProps {
    noteId: string;
    onDismiss: () => void;
    onLink: (noteId: string) => void;
}

export const AutoLinkSuggestion: React.FC<AutoLinkSuggestionProps> = ({ noteId, onDismiss, onLink }) => {
    const { notes } = useNoteStore();
    const suggestedNote = notes.find(n => n.id === noteId);

    if (!suggestedNote) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bottom-24 right-8 z-50 max-w-xs w-full bg-white dark:bg-dark-surface shadow-2xl rounded-2xl border border-primary/20 p-4 flex flex-col gap-3 overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-1">
                    <button
                        onClick={onDismiss}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-light-text-disabled transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Lightbulb size={18} />
                    </div>
                    <div className="space-y-1 pr-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">Related Note Found</h4>
                        <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary line-clamp-1">
                            {suggestedNote.title}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                        onClick={() => onLink(noteId)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                    >
                        <LinkIcon size={12} /> Link
                    </button>
                    <button
                        onClick={onDismiss}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 text-light-text-secondary dark:text-dark-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                    >
                        Dismiss
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
