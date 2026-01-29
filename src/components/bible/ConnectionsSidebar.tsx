import React, { useEffect, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useAIStore } from '@/stores/aiStore';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { db } from '@/lib/db';
import { FileText, Zap, Link as LinkIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConnectionsSidebar: React.FC = () => {
    const { currentNote, setCurrentNote, localFiles, openLocalFile } = useNoteStore();
    const { getRelatedNotes, searchBible, isIndexing, isBibleIndexing } = useAIStore();
    const [relatedNotes, setRelatedNotes] = useState<any[]>([]);
    const [relatedScriptures, setRelatedScriptures] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchRelated = async () => {
            if (!currentNote) {
                setRelatedNotes([]);
                setRelatedScriptures([]);
                return;
            }

            setIsLoading(true);
            try {
                // 1. Fetch Related Notes
                const hits = await getRelatedNotes(currentNote.id);
                const noteItems = [];

                for (const hit of hits) {
                    const dbNote = await db.notes.get(hit.noteId);
                    if (dbNote) {
                        noteItems.push({ ...dbNote, score: hit.score, source: 'db' });
                        continue;
                    }

                    const localItem = localFiles.find(f => f.id === hit.noteId);
                    if (localItem && localItem.kind === 'file') {
                        noteItems.push({
                            id: localItem.id,
                            title: localItem.name,
                            score: hit.score,
                            source: 'local',
                            handle: localItem.handle
                        });
                    }
                }
                setRelatedNotes(noteItems);

                // 2. Fetch Related Scriptures
                const cleanContent = currentNote.content.replace(/<[^>]*>/g, '').trim();
                if (cleanContent.length > 50) {
                    const bibleHits = await searchBible(cleanContent.slice(0, 500));
                    setRelatedScriptures(bibleHits);
                }
            } catch (err) {
                console.error('Failed to fetch connections:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRelated();
    }, [currentNote, getRelatedNotes, searchBible, localFiles]);

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
                {(isIndexing || isBibleIndexing) && <Loader2 size={14} className="animate-spin text-primary" />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-light-text-secondary opacity-50">
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Scanning Theological Galaxy...</p>
                    </div>
                ) : (
                    <>
                        {/* Note Connections */}
                        {relatedNotes.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled mb-4">
                                    Related Research ({relatedNotes.length})
                                </p>
                                <AnimatePresence mode="popLayout">
                                    {relatedNotes.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => {
                                                if (item.source === 'db') setCurrentNote(item);
                                                else openLocalFile(item as any);
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
                        )}

                        {/* Scripture Connections */}
                        {relatedScriptures.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled mb-4">
                                    Theological Cross-Refs ({relatedScriptures.length})
                                </p>
                                <div className="space-y-2">
                                    {relatedScriptures.map((ref, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500/50 transition-all cursor-pointer group"
                                            onClick={() => {
                                                const { openRightSidebar } = useUIStore.getState();
                                                const { setBibleFocus } = useBibleStore.getState();
                                                openRightSidebar('bible');
                                                setBibleFocus({ book: ref.book, chapter: ref.chapter, verse: 1 });
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase">
                                                    {ref.book} {ref.chapter}
                                                </span>
                                                <span className="text-[9px] font-bold text-amber-600/50">
                                                    {Math.round(ref.score * 100)}% Match
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-medium text-light-text-secondary dark:text-dark-text-primary leading-tight line-clamp-2 italic">
                                                Chapter matches the theme of your current research.
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {relatedNotes.length === 0 && relatedScriptures.length === 0 && (
                            <div className="flex flex-col items-center py-12 text-center text-light-text-secondary opacity-30">
                                <LinkIcon size={32} className="mb-4" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">No direct connections found</p>
                                <p className="text-[9px] mt-1">Try writing more detailed notes to build your map.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="p-4 border-t border-light-border dark:border-dark-border bg-gray-50/50 dark:bg-black/10">
                <p className="text-[9px] text-light-text-disabled leading-relaxed">
                    These connections are calculated locally using **Personal Knowledge Graphs** and **Semantic Search**. No data leaves your machine.
                </p>
            </div>
        </div>
    );
};
