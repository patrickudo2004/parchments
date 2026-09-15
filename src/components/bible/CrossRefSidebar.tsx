import React, { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { db, dbHelpers } from '@/lib/db';
import type { BibleCrossRef, Note, TSKReferenceItem } from '@/types/database';
import { Link2, BookOpen, FileText, ExternalLink, Plus, Search, Trash2, X, Maximize2, Minimize2, Loader2, ChevronDown, ChevronUp, ClipboardCopy, ArrowLeft } from 'lucide-react';
import { popoutService } from '@/lib/utils/popoutService';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { AlertModal } from '@/components/ui/AlertModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { referenceDataService } from '@/lib/bible/ReferenceDataService';
import { parseScriptureReference } from '@/lib/scriptureParser';

export const CrossRefSidebar: React.FC<{ isIndependent?: boolean }> = ({ isIndependent = false }) => {
    const { selectedVerseId, isRightSidebarFloating, toggleRightSidebarFloating, closeRightSidebar, activeEditor } = useUIStore();
    const { setBibleFocus, mainVersion } = useBibleStore();
    const [isPickingNote, setIsPickingNote] = useState(false);
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [realTskRefs, setRealTskRefs] = useState<TSKReferenceItem[]>([]);
    const [isLoadingTsk, setIsLoadingTsk] = useState(false);

    // --- Back-breadcrumb navigation state ---
    const [previousVerseId, setPreviousVerseId] = useState<string | null>(null);

    // --- Inline verse preview state: index → preview text ---
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [previewText, setPreviewText] = useState<string>('');
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // --- Insert-to-note loading state ---
    const [insertingIdx, setInsertingIdx] = useState<number | null>(null);

    // Fetch cross references for the selected verse
    const crossRefs = useLiveQuery(
        () => selectedVerseId ? db.crossReferences.where('sourceVerseId').equals(selectedVerseId).toArray() : [],
        [selectedVerseId]
    ) || [];

    // Load actual Treasury of Scripture Knowledge cross-references
    useEffect(() => {
        let isMounted = true;
        if (!selectedVerseId) {
            setRealTskRefs([]);
            return;
        }

        // Reset expansion when verse changes
        setExpandedIdx(null);
        setPreviewText('');

        const loadTsk = async () => {
            setIsLoadingTsk(true);
            try {
                const installed = await referenceDataService.isTSKInstalled();
                if (!installed) {
                    await referenceDataService.installTSK();
                }
                const refs = await referenceDataService.getTSKRefs(selectedVerseId);
                if (isMounted) {
                    setRealTskRefs(refs);
                }
            } catch (err) {
                console.error('[CrossRefSidebar] TSK load error:', err);
            } finally {
                if (isMounted) setIsLoadingTsk(false);
            }
        };

        loadTsk();
        return () => { isMounted = false; };
    }, [selectedVerseId]);

    /** Navigate to a TSK reference verse, saving the current verse for back-navigation. */
    const handleNavigateToRef = useCallback((item: TSKReferenceItem) => {
        const parsed = parseScriptureReference(item.displayRef);
        if (parsed) {
            // Save current verse for breadcrumb back-nav
            if (selectedVerseId) {
                setPreviousVerseId(selectedVerseId);
            }
            setBibleFocus({
                book: parsed.book,
                chapter: parsed.chapter,
                verse: parsed.verse
            });
        }
    }, [selectedVerseId, setBibleFocus]);

    /** Navigate back to the previous verse. */
    const handleNavigateBack = useCallback(() => {
        if (!previousVerseId) return;
        const parts = previousVerseId.split('-'); // e.g. john-3-16
        if (parts.length < 3) return;
        const verse = parseInt(parts[parts.length - 1], 10);
        const chapter = parseInt(parts[parts.length - 2], 10);
        const book = parts.slice(0, parts.length - 2).join('-');
        const displayBook = book.charAt(0).toUpperCase() + book.slice(1);
        setBibleFocus({ book: displayBook, chapter, verse });
        setPreviousVerseId(null);
    }, [previousVerseId, setBibleFocus]);

    /** Fetch and decrypt a verse for inline preview. */
    const handleTogglePreview = useCallback(async (item: TSKReferenceItem, idx: number) => {
        if (expandedIdx === idx) {
            setExpandedIdx(null);
            setPreviewText('');
            return;
        }

        const parsed = parseScriptureReference(item.displayRef);
        if (!parsed || parsed.verse === null) {
            setExpandedIdx(idx);
            setPreviewText('(Could not parse reference)');
            return;
        }

        setExpandedIdx(idx);
        setIsLoadingPreview(true);
        setPreviewText('');

        try {
            const versionId = mainVersion || 'kjv';
            const raw = await dbHelpers.getVerseText(versionId, parsed.book, parsed.chapter, parsed.verse);
            if (raw) {
                const { decryptVerseText } = await import('@/lib/bible/bibleCryptoService');
                const decrypted = await decryptVerseText(raw);
                setPreviewText(decrypted);
            } else {
                // Fallback to KJV if verse not found in active version
                const kjvRaw = await dbHelpers.getVerseText('kjv', parsed.book, parsed.chapter, parsed.verse);
                if (kjvRaw) {
                    const { decryptVerseText } = await import('@/lib/bible/bibleCryptoService');
                    setPreviewText(await decryptVerseText(kjvRaw));
                } else {
                    setPreviewText('Verse not found.');
                }
            }
        } catch (err) {
            console.error('[CrossRefSidebar] preview fetch error:', err);
            setPreviewText('Error loading verse.');
        } finally {
            setIsLoadingPreview(false);
        }
    }, [expandedIdx, mainVersion]);

    /** Insert TSK verse as a blockquote into the active note editor. */
    const handleInsertIntoNote = useCallback(async (item: TSKReferenceItem, idx: number) => {
        const parsed = parseScriptureReference(item.displayRef);
        if (!parsed || parsed.verse === null) return;

        setInsertingIdx(idx);
        try {
            const versionId = mainVersion || 'kjv';
            let raw = await dbHelpers.getVerseText(versionId, parsed.book, parsed.chapter, parsed.verse);
            let usedVersion = versionId;
            if (!raw) {
                raw = await dbHelpers.getVerseText('kjv', parsed.book, parsed.chapter, parsed.verse);
                usedVersion = 'kjv';
            }

            if (!raw) return;

            const { decryptVerseText } = await import('@/lib/bible/bibleCryptoService');
            const text = await decryptVerseText(raw);
            const citation = `${parsed.book} ${parsed.chapter}:${parsed.verse} (${usedVersion.toUpperCase()})`;
            const quoteHtml = `<blockquote><p>${text}</p><cite>${citation}</cite></blockquote><p></p>`;

            if (activeEditor && !activeEditor.isDestroyed) {
                activeEditor.chain().focus().insertContent(quoteHtml).run();
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(`"${text}" — ${citation}`);
            }
        } catch (err) {
            console.error('[CrossRefSidebar] insert error:', err);
        } finally {
            setInsertingIdx(null);
        }
    }, [mainVersion, activeEditor]);

    // Format verse ID for display (e.g. "john-3-16" → "John 3:16")
    const formatVerseIdDisplay = (vid: string) => {
        const parts = vid.split('-');
        if (parts.length < 3) return vid;
        const verse = parts[parts.length - 1];
        const chapter = parts[parts.length - 2];
        const book = parts.slice(0, parts.length - 2).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        return `${book} ${chapter}:${verse}`;
    };

    // Grouping logic for the UI
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
                                {selectedVerseId ? formatVerseIdDisplay(selectedVerseId) : 'Select a Verse'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isIndependent && (
                            <button
                                onClick={toggleRightSidebarFloating}
                                className={`p-1 rounded-md transition-colors ${isRightSidebarFloating ? 'bg-primary/10 text-primary' : 'hover:bg-light-background dark:hover:bg-dark-background text-light-text-disabled'}`}
                                title={isRightSidebarFloating ? "Dock" : "Undock"}
                            >
                                {isRightSidebarFloating ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                popoutService.open('bible'); // For now, cross-refs pop out with bible context or similar
                                // Actually, should we have a special 'references' popout? 
                                // Let's just have it pop out 'bible' which is the primary context.
                                if (!isIndependent) closeRightSidebar();
                            }}
                            className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-md transition-colors text-light-text-disabled hover:text-primary"
                            title="Pop out Bible"
                        >
                            <ExternalLink size={14} />
                        </button>
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
                        {/* Back Breadcrumb */}
                        {previousVerseId && (
                            <button
                                onClick={handleNavigateBack}
                                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors -mt-2 mb-2"
                            >
                                <ArrowLeft size={13} />
                                Back to {formatVerseIdDisplay(previousVerseId)}
                            </button>
                        )}

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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-light-text-disabled">
                                    <BookOpen size={14} />
                                    <span>Treasury of Scripture Knowledge ({realTskRefs.length})</span>
                                </div>
                                {isLoadingTsk && <Loader2 size={12} className="animate-spin text-primary" />}
                            </div>

                            <div className="space-y-2">
                                {realTskRefs.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {realTskRefs.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-xl border border-light-border dark:border-dark-border overflow-hidden bg-white dark:bg-dark-background/40 hover:border-primary/40 transition-all"
                                            >
                                                {/* Reference header row */}
                                                <div className="flex items-center gap-1 px-3 py-2.5">
                                                    {/* Navigate button */}
                                                    <button
                                                        onClick={() => handleNavigateToRef(item)}
                                                        className="flex-1 flex items-center gap-2 min-w-0 text-left group/nav"
                                                        title={`Go to ${item.displayRef}`}
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover/nav:scale-125 transition-transform shrink-0" />
                                                        <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary group-hover/nav:text-primary transition-colors truncate">
                                                            {item.displayRef}
                                                        </span>
                                                        {item.votes !== undefined && item.votes > 0 && (
                                                            <span className="text-[10px] font-semibold text-light-text-disabled bg-light-background dark:bg-dark-surface px-2 py-0.5 rounded-md border border-light-border/40 dark:border-dark-border/40 shrink-0">
                                                                {item.votes} votes
                                                            </span>
                                                        )}
                                                    </button>

                                                    {/* Insert into note button */}
                                                    <button
                                                        onClick={() => handleInsertIntoNote(item, idx)}
                                                        className="p-1 rounded-md text-light-text-disabled hover:text-primary hover:bg-primary/10 transition-all shrink-0"
                                                        title={activeEditor ? "Insert verse into note" : "Copy verse to clipboard"}
                                                        disabled={insertingIdx === idx}
                                                    >
                                                        {insertingIdx === idx
                                                            ? <Loader2 size={12} className="animate-spin" />
                                                            : <ClipboardCopy size={12} />
                                                        }
                                                    </button>

                                                    {/* Expand preview toggle */}
                                                    <button
                                                        onClick={() => handleTogglePreview(item, idx)}
                                                        className="p-1 rounded-md text-light-text-disabled hover:text-primary hover:bg-primary/10 transition-all shrink-0"
                                                        title="Preview verse text"
                                                    >
                                                        {expandedIdx === idx
                                                            ? <ChevronUp size={12} />
                                                            : <ChevronDown size={12} />
                                                        }
                                                    </button>
                                                </div>

                                                {/* Inline verse preview */}
                                                {expandedIdx === idx && (
                                                    <div className="px-4 pb-3 border-t border-light-border/40 dark:border-dark-border/40 bg-primary/5 animate-in fade-in slide-in-from-top-1 duration-150">
                                                        {isLoadingPreview ? (
                                                            <div className="flex items-center gap-2 py-2 text-[11px] text-light-text-disabled">
                                                                <Loader2 size={11} className="animate-spin" />
                                                                Loading verse…
                                                            </div>
                                                        ) : (
                                                            <p className="text-[12px] leading-relaxed text-light-text-main dark:text-dark-text-main pt-2 italic">
                                                                "{previewText}"
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : isLoadingTsk ? (
                                    <div className="p-8 text-center">
                                        <Loader2 size={20} className="animate-spin text-primary mx-auto mb-2" />
                                        <p className="text-[11px] text-light-text-disabled">Loading cross-references...</p>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center rounded-xl border border-dashed border-light-border dark:border-dark-border">
                                        <BookOpen size={16} className="text-light-text-disabled mx-auto mb-2 opacity-50" />
                                        <p className="text-[11px] text-light-text-disabled">No TSK cross-references found for this verse.</p>
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
