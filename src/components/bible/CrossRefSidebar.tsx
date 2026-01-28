import React, { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/lib/db';
import type { BibleCrossRef, Note } from '@/types/database';
import { Link2, BookOpen, FileText, ExternalLink, Plus, Search, Trash2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { AlertModal } from '@/components/ui/AlertModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export const CrossRefSidebar: React.FC = () => {
    const { selectedVerseId } = useUIStore();
    const [isPickingNote, setIsPickingNote] = useState(false);
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Fetch cross references for the selected verse
    const crossRefs = useLiveQuery(
        () => selectedVerseId ? db.crossReferences.where('sourceVerseId').equals(selectedVerseId).toArray() : [],
        [selectedVerseId]
    ) || [];

    // Grouping logic for the UI
    const tskRefs = crossRefs.filter(r => r.linkType === 'tsk' || r.linkType === 'parallel');
    const noteRefs = crossRefs.filter(r => r.targetType === 'note');

    // Note search results for picking
    const noteResults = useLiveQuery(
        async () => {
            if (!noteSearchQuery.trim()) return [];
            return await db.notes
                .filter(n => n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()))
                .limit(5)
                .toArray();
        },
        [noteSearchQuery]
    ) || [];

    const handleAddNoteLink = async (note: Note) => {
        if (!selectedVerseId) return;

        // Check if already linked
        const existing = noteRefs.find(r => r.targetId === note.id);
        if (existing) {
            setIsAlertOpen(true);
            return;
        }

        await db.crossReferences.add({
            id: uuidv4(),
            sourceVerseId: selectedVerseId,
            targetType: 'note',
            targetId: note.id,
            linkType: 'user'
        });

        setIsPickingNote(false);
        setNoteSearchQuery('');
    };

    const handleDeleteRef = async (id: string) => {
        setPendingDeleteId(id);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (pendingDeleteId) {
            await db.crossReferences.delete(pendingDeleteId);
            setPendingDeleteId(null);
        }
        setIsConfirmOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Header Area */}
            <div className="p-4 border-b border-light-border dark:border-dark-border bg-light-background/30 dark:bg-dark-background/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Link2 size={16} />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Cross References</h2>
                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary truncate max-w-[150px]">
                                {selectedVerseId || 'Select a Verse'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                {!selectedVerseId ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-16 h-16 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center mb-4 border border-light-border dark:border-dark-border">
                            <BookOpen size={24} className="text-light-text-disabled" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-light-text-primary mb-2">No Verse Selected</h3>
                        <p className="text-xs text-light-text-secondary leading-relaxed max-w-[200px]">
                            Click on a verse number in the Bible reader to view its cross-references.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* User Linked Notes */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                    <FileText size={14} />
                                    <span>Linked Notes</span>
                                </div>
                                <button
                                    onClick={() => setIsPickingNote(!isPickingNote)}
                                    className={`p-1 transition-colors rounded-full ${isPickingNote ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                                    title="Add Link to Note"
                                >
                                    {isPickingNote ? <X size={14} /> : <Plus size={14} />}
                                </button>
                            </div>

                            {isPickingNote && (
                                <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={12} />
                                        <input
                                            type="text"
                                            placeholder="Find note title..."
                                            value={noteSearchQuery}
                                            onChange={(e) => setNoteSearchQuery(e.target.value)}
                                            className="w-full bg-white dark:bg-dark-background border-none rounded-lg pl-8 p-2 text-xs focus:ring-1 focus:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        {noteResults.map(note => (
                                            <button
                                                key={note.id}
                                                onClick={() => handleAddNoteLink(note)}
                                                className="w-full text-left p-2 hover:bg-white dark:hover:bg-dark-surface rounded-lg text-xs font-bold text-light-text-primary dark:text-dark-text-primary transition-colors flex items-center justify-between group"
                                            >
                                                <span className="truncate">{note.title}</span>
                                                <Plus size={10} className="text-primary opacity-0 group-hover:opacity-100" />
                                            </button>
                                        ))}
                                        {noteSearchQuery && noteResults.length === 0 && (
                                            <p className="text-[10px] text-light-text-disabled text-center py-2">No notes found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {noteRefs.length > 0 ? (
                                    noteRefs.map(ref => (
                                        <NoteLinkItem key={ref.id} refData={ref} onDelete={() => handleDeleteRef(ref.id)} />
                                    ))
                                ) : (
                                    !isPickingNote && (
                                        <div className="p-4 rounded-xl border border-dashed border-light-border dark:border-dark-border text-center">
                                            <p className="text-[10px] text-light-text-disabled italic">No notes linked to this verse yet.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </section>

                        {/* TSK / Chain References */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                <BookOpen size={14} />
                                <span>Chain References (TSK)</span>
                            </div>

                            <div className="space-y-2">
                                {tskRefs.length > 0 ? (
                                    tskRefs.map(ref => (
                                        <VerseLinkItem key={ref.id} refData={ref} />
                                    ))
                                ) : (
                                    <div className="p-10 text-center">
                                        <div className="w-10 h-10 rounded-full bg-light-background dark:bg-dark-background flex items-center justify-center mx-auto mb-3 opacity-50">
                                            <Search size={16} className="text-light-text-disabled" />
                                        </div>
                                        <p className="text-[10px] text-light-text-disabled leading-relaxed">
                                            Indexing reference data...<br />Sample TSK coming in Phase 2.1
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>

            <AlertModal
                isOpen={isAlertOpen}
                title="Already Linked"
                message="This note is already linked to this verse."
                type="info"
                onClose={() => setIsAlertOpen(false)}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="Remove Reference"
                message="Are you sure you want to remove this cross-reference?"
                onConfirm={confirmDelete}
                onCancel={() => setIsConfirmOpen(false)}
                isDanger={true}
            />
        </div>
    );
};

const NoteLinkItem: React.FC<{ refData: BibleCrossRef, onDelete: () => void }> = ({ refData, onDelete }) => {
    const note = useLiveQuery(() => db.notes.get(refData.targetId), [refData.targetId]);

    return (
        <div className="flex items-center gap-3 p-3 bg-light-background/50 dark:bg-dark-background/50 rounded-xl border border-light-border dark:border-dark-border group hover:border-primary/30 transition-all">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                    {note?.title || 'Unknown Note'}
                </p>
                <p className="text-[10px] text-light-text-disabled mt-0.5">User Link</p>
            </div>
            <button
                onClick={onDelete}
                className="p-1.5 text-light-text-disabled hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
};

const VerseLinkItem: React.FC<{ refData: BibleCrossRef }> = ({ refData }) => {
    return (
        <button className="w-full flex flex-col items-start gap-1 p-3 bg-white dark:bg-dark-background/30 rounded-xl border border-light-border dark:border-dark-border hover:border-primary transition-all text-left">
            <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-primary">{refData.targetId.toUpperCase().replace(/-/g, ' ')}</span>
                <ExternalLink size={10} className="text-light-text-disabled" />
            </div>
        </button>
    );
};
