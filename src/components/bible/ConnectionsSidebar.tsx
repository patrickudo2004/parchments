import React, { useEffect, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useAIStore } from '@/stores/aiStore';
import { db } from '@/lib/db';
import { FileText, Zap, Link as LinkIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConnectionsSidebar: React.FC = () => {
    const { currentNote, setCurrentNote, localFiles, openLocalFile } = useNoteStore();
    const { getRelatedNotes, isIndexing } = useAIStore();
    const [relatedItems, setRelatedItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchRelated = async () => {
            if (!currentNote) {
                setRelatedItems([]);
                return;
            }

            setIsLoading(true);
            try {
                const hits = await getRelatedNotes(currentNote.id);
                const items = [];

                for (const hit of hits) {
                    // Check DB
                    const dbNote = await db.notes.get(hit.noteId);
                    if (dbNote) {
                        items.push({ ...dbNote, score: hit.score, source: 'db' });
                        continue;
                    }

                    // Check Local
                    const localItem = localFiles.find(f => f.id === hit.noteId);
                    if (localItem && localItem.kind === 'file') {
                        items.push({
                            id: localItem.id,
                            title: localItem.name,
                            score: hit.score,
                            source: 'local',
                            handle: localItem.handle
                        });
                    }
                }
                setRelatedItems(items);
            } catch (err) {
                console.error('Failed to fetch related notes:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRelated();
    }, [currentNote, getRelatedNotes, localFiles]);

    if (!currentNote) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-light-text-secondary opacity-50">
                <LinkIcon size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No Note Selected</p>
                <p className="text-xs">Open a note to see AI-powered connections</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                    <Zap size={18} />
                    <h2 className="text-sm font-black uppercase tracking-tighter">Semantic Connections</h2>
                </div>
                {isIndexing && <Loader2 size={14} className="animate-spin text-primary" />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-light-text-secondary opacity-50">
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Scanning Galaxy...</p>
                    </div>
                ) : relatedItems.length > 0 ? (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled mb-4">
                            Relational Matches ({relatedItems.length})
                        </p>
                        <AnimatePresence mode="popLayout">
                            {relatedItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => {
                                        if (item.source === 'db') {
                                            setCurrentNote(item);
                                        } else {
                                            openLocalFile({ id: item.id, name: item.title, kind: 'file', handle: item.handle } as any);
                                        }
                                    }}
                                    className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-black/20 hover:border-primary/50 cursor-pointer group transition-all"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            {item.source === 'db' ? <FileText size={14} /> : <Zap size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary truncate uppercase tracking-tight">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary"
                                                        style={{ width: `${Math.round(item.score * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-primary">
                                                    {Math.round(item.score * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-12 text-center text-light-text-secondary opacity-30">
                        <LinkIcon size={32} className="mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No direct connections found</p>
                        <p className="text-[9px] mt-1">Try writing more detailed notes to build your map.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-black/10">
                <p className="text-[9px] text-light-text-disabled leading-relaxed">
                    These connections are calculated locally using **Personal Knowledge Graphs**. No data leaves your machine.
                </p>
            </div>
        </div>
    );
};
