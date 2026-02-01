import React from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore, STUDY_TEMPLATES } from '@/stores/noteStore';
import { useState } from 'react';
import {
    X,
    BookOpen,
    Search,
    MessageSquare,
    PenTool,
    Info,
    Calendar,
    ChevronRight
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

export const TemplatePickerModal: React.FC = () => {
    const { toggleTemplateModal, toggleNoFolderModal } = useUIStore();
    const { createNoteFromTemplate, createNote, hasStudyspace } = useNoteStore();

    const handleSelectTemplate = async (templateId: string) => {
        if (!hasStudyspace) {
            toggleNoFolderModal(true);
            return;
        }
        await createNoteFromTemplate(null, templateId);
        toggleTemplateModal();
    };

    const templates = [
        {
            id: 'soap',
            name: STUDY_TEMPLATES.soap.name,
            description: STUDY_TEMPLATES.soap.description,
            icon: <BookOpen className="text-blue-500" size={24} />,
            details: "Scripture, Observation, Application, Prayer. Perfect for personal devotions."
        },
        {
            id: 'inductive',
            name: STUDY_TEMPLATES.inductive.name,
            description: STUDY_TEMPLATES.inductive.description,
            icon: <Search className="text-purple-500" size={24} />,
            details: "Observation, Interpretation, Application. For deep analytical research."
        },
        {
            id: 'expository',
            name: STUDY_TEMPLATES.expository.name,
            description: STUDY_TEMPLATES.expository.description,
            icon: <MessageSquare className="text-orange-500" size={24} />,
            details: "Title, Introduction, Main Points, Conclusion. Ideal for sermon prep."
        },
        {
            id: 'journal',
            name: STUDY_TEMPLATES.journal.name,
            description: STUDY_TEMPLATES.journal.description,
            icon: <Calendar className="text-green-500" size={24} />,
            details: "A simple space for your daily thoughts and prayers."
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleTemplateModal}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-3xl shadow-2xl overflow-hidden border border-light-border dark:border-dark-border"
            >
                {/* Header */}
                <div className="p-8 border-b border-light-border dark:border-dark-border bg-light-background/50 dark:bg-dark-background/50">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary flex items-center gap-3">
                            <PenTool className="text-primary" />
                            Start a New Study
                        </h2>
                        <button
                            onClick={toggleTemplateModal}
                            className="p-2 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-disabled"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Choose a structured template to guide your research and composition.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Tooltip.Provider delayDuration={200}>
                            {templates.map((template) => (
                                <Tooltip.Root key={template.id}>
                                    <Tooltip.Trigger asChild>
                                        <button
                                            onClick={() => handleSelectTemplate(template.id)}
                                            className="group relative flex flex-col items-start p-6 rounded-2xl border-2 border-light-border dark:border-dark-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-background shadow-sm border border-light-border dark:border-dark-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                {template.icon}
                                            </div>
                                            <h3 className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary mb-1 flex items-center gap-2">
                                                {template.name}
                                                <ChevronRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </h3>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                                {template.description}
                                            </p>

                                            <div className="absolute top-4 right-4 text-light-text-disabled/30 group-hover:text-primary/30 transition-colors">
                                                <Info size={16} />
                                            </div>
                                        </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                        <Tooltip.Content
                                            className="z-[110] max-w-[240px] rounded-xl bg-gray-900/95 backdrop-blur-md px-4 py-3 text-xs leading-relaxed text-white shadow-2xl border border-white/10 animate-in fade-in-0 zoom-in-95"
                                            sideOffset={8}
                                        >
                                            <p className="font-medium text-primary mb-1">{template.name}</p>
                                            <p className="text-gray-300">{template.details}</p>
                                            <Tooltip.Arrow className="fill-gray-900/95" />
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                </Tooltip.Root>
                            ))}
                        </Tooltip.Provider>

                        {/* Blank Note Option */}
                        <button
                            onClick={() => {
                                if (!hasStudyspace) {
                                    toggleNoFolderModal(true);
                                    return;
                                }
                                createNote(null);
                                toggleTemplateModal();
                            }}
                            className="sm:col-span-2 group flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-light-border dark:border-dark-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left italic"
                        >
                            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Or start with a blank white page...</span>
                            <PlusIcon className="text-primary" size={18} />
                        </button>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <p className="text-[10px] text-light-text-disabled uppercase tracking-widest font-black">Centralized Local Storage enabled</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const PlusIcon: React.FC<{ className?: string, size?: number }> = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);
