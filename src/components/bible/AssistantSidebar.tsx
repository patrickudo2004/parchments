import React, { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { Sparkles, Wand2, Brain, Loader2, ListChecks, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AssistantSidebar: React.FC = () => {
    const { currentNote } = useNoteStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);

    const generateOutline = () => {
        if (!currentNote) return;
        setIsGenerating(true);

        // Simulating Local LLM processing time
        setTimeout(() => {
            const content = currentNote.content.toLowerCase();
            let prompt_suggestion = "";

            if (content.includes('god') || content.includes('lord')) {
                prompt_suggestion = `
                    <h3>Suggested Sermon Outline: The Sovereignty of God</h3>
                    <ul>
                        <li><strong>Introduction:</strong> Establishing the context of Divine Authority.</li>
                        <li><strong>Point 1:</strong> The character of God revealed in the text.</li>
                        <li><strong>Point 2:</strong> Our response to His Sovereignty.</li>
                        <li><strong>Conclusion:</strong> Rest and trust in His power.</li>
                    </ul>
                `;
            } else {
                prompt_suggestion = `
                    <h3>Generic Theological Outline</h3>
                    <ul>
                        <li><strong>Observation:</strong> Identifying the central tension.</li>
                        <li><strong>Interpretation:</strong> Historical and Theological context.</li>
                        <li><strong>Application:</strong> Modern life integration.</li>
                    </ul>
                `;
            }

            setSuggestion(prompt_suggestion);
            setIsGenerating(false);
        }, 2000);
    };

    if (!currentNote) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-light-text-secondary opacity-50">
                <Brain size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No Context</p>
                <p className="text-xs">Select a note to activate the Exegesis Assistant</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-500">
                    <Sparkles size={18} />
                    <h2 className="text-sm font-black uppercase tracking-tighter">Exegesis Assistant</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Generation Trigger */}
                <div className="p-4 rounded-2xl border-2 border-dashed border-light-border dark:border-dark-border flex flex-col items-center text-center gap-4 bg-gray-50/50 dark:bg-white/5">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">Need a structure?</p>
                        <p className="text-[10px] text-light-text-secondary mt-1">Analyze your research and generate a formal sermon outline.</p>
                    </div>
                    <button
                        onClick={generateOutline}
                        disabled={isGenerating}
                        className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Brain size={14} />
                                Generate Outline
                            </>
                        )}
                    </button>
                </div>

                {/* Suggestions Area */}
                <AnimatePresence>
                    {suggestion && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                <ListChecks size={12} />
                                <span>AI Suggestion</span>
                            </div>
                            <div
                                className="prose prose-xs dark:prose-invert p-4 rounded-2xl bg-white dark:bg-black/20 border border-light-border dark:border-dark-border"
                                dangerouslySetInnerHTML={{ __html: suggestion }}
                            />
                            <div className="flex gap-2">
                                <button className="flex-1 py-1.5 bg-gray-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all">
                                    Apply Template
                                </button>
                                <button
                                    onClick={() => setSuggestion(null)}
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!suggestion && !isGenerating && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                            <Quote size={12} />
                            <span>Quick Context Tips</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                "Mention historical context to trigger better outlines.",
                                "Keep your cross-references focused for accurate summaries.",
                                "You can customize results in AI Settings (Phase 4.3.5)."
                            ].map((tip, i) => (
                                <div key={i} className="text-[10px] text-light-text-secondary leading-relaxed p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-light-border/50">
                                    • {tip}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-light-border dark:border-dark-border bg-purple-50/50 dark:bg-purple-900/10">
                <p className="text-[9px] text-purple-600/70 dark:text-purple-400/50 leading-relaxed font-medium">
                    Assistant utilizes **Local Inference** to maintain your homiletical privacy. Outlines are generated based on your own notes.
                </p>
            </div>
        </div>
    );
};
