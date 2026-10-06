import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Check, Folder, Calendar } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';

interface PulpitNoteSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
    themeMode?: 'light' | 'dark' | 'contrast';
    onSelectNote: (note: any) => void;
}

export const PulpitNoteSwitcher: React.FC<PulpitNoteSwitcherProps> = ({
    isOpen,
    onClose,
    themeMode = 'dark',
    onSelectNote,
}) => {
    const { notes, folders, currentNote, localFiles, isLocalMode } = useNoteStore();
    const { isMobile } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');

    const isContrast = themeMode === 'contrast';
    const isDark = themeMode === 'dark' || isContrast;

    // Aggregate available notes (both localFiles and IndexedDB notes)
    const allAvailableNotes = useMemo(() => {
        const list: any[] = [];
        const seenIds = new Set<string>();

        // 1. Local files if in local mode
        if (isLocalMode) {
            localFiles
                .filter(f => f.kind === 'file')
                .forEach(f => {
                    seenIds.add(String(f.id));
                    list.push({
                        id: f.id,
                        title: f.name.replace(/\.(md|html|txt)$/i, ''),
                        name: f.name,
                        kind: 'file',
                        handle: f.handle,
                        folderId: f.parentId,
                        updatedAt: Date.now(),
                    });
                });
        }

        // 2. Database notes
        notes.forEach(n => {
            if (!seenIds.has(String(n.id))) {
                seenIds.add(String(n.id));
                list.push(n);
            }
        });

        return list;
    }, [isLocalMode, localFiles, notes]);

    // Filter notes by search query
    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return allAvailableNotes;
        const q = searchQuery.toLowerCase();
        return allAvailableNotes.filter(n =>
            (n.title && n.title.toLowerCase().includes(q)) ||
            (n.name && n.name.toLowerCase().includes(q)) ||
            (n.content && n.content.toLowerCase().includes(q))
        );
    }, [allAvailableNotes, searchQuery]);

    // Find folder name of current note
    const currentFolder = useMemo(() => {
        if (!currentNote?.folderId) return null;
        return folders.find(f => String(f.id) === String(currentNote.folderId));
    }, [currentNote?.folderId, folders]);

    if (!isOpen) return null;

    const modalBg = isContrast
        ? 'bg-black text-amber-300 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)]'
        : isDark
            ? 'bg-neutral-900 text-neutral-100 border-neutral-700 shadow-2xl'
            : 'bg-white text-neutral-900 border-neutral-200 shadow-2xl';

    const headerBg = isContrast
        ? 'border-amber-500/30 bg-neutral-950/80'
        : isDark
            ? 'border-neutral-800 bg-neutral-900/90'
            : 'border-neutral-200 bg-neutral-50/90';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                {/* Backdrop Click */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, y: isMobile ? 100 : 30, scale: isMobile ? 1 : 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isMobile ? 100 : 30, scale: isMobile ? 1 : 0.96 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`relative z-10 w-full sm:max-w-xl max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border overflow-hidden ${modalBg}`}
                >
                    {/* Header */}
                    <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-md ${headerBg}`}>
                        <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl shrink-0 ${isContrast ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/10 text-primary'}`}>
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black tracking-tight">
                                    Switch Sermon Note
                                </h3>
                                <p className="text-xs opacity-60">
                                    {currentFolder ? `Folder: ${currentFolder.name}` : 'Select a note to preach from'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-all active:scale-95 min-w-[40px] min-h-[40px] flex items-center justify-center border ${isContrast ? 'border-amber-500/30 hover:bg-amber-500/20 text-amber-300' : 'border-current/10 hover:bg-black/5 dark:hover:bg-white/5'}`}
                            title="Close (Esc)"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Search Input Bar */}
                    <div className="p-3 border-b border-current/10 shrink-0">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isContrast ? 'bg-neutral-950 border-amber-500/30' : isDark ? 'bg-neutral-800/80 border-neutral-700' : 'bg-neutral-100 border-neutral-300'}`}>
                            <Search size={16} className="opacity-50 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search sermon notes by title or content..."
                                autoFocus
                                className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:opacity-40"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="p-1 opacity-50 hover:opacity-100">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Note List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                        {filteredNotes.length === 0 ? (
                            <div className="py-12 text-center opacity-50">
                                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-semibold">No notes found matching "{searchQuery}"</p>
                            </div>
                        ) : (
                            filteredNotes.map(n => {
                                const isSelected = currentNote?.id === n.id;
                                const folder = folders.find(f => String(f.id) === String(n.folderId));

                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => {
                                            onSelectNote(n);
                                            onClose();
                                        }}
                                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 active:scale-[0.99] touch-manipulation min-h-[52px] ${isSelected
                                            ? isContrast
                                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                                                : 'bg-primary/10 border-primary/40 text-primary font-bold'
                                            : isContrast
                                                ? 'bg-neutral-950/60 border-amber-500/10 hover:border-amber-500/40 text-amber-300/90'
                                                : isDark
                                                    ? 'bg-neutral-800/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                                                    : 'bg-neutral-50/60 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`p-2 rounded-xl shrink-0 ${isSelected
                                                ? isContrast ? 'bg-amber-500 text-black' : 'bg-primary text-white'
                                                : isContrast ? 'bg-amber-500/10 text-amber-400' : 'bg-current/10 text-current'
                                                }`}>
                                                <FileText size={16} />
                                            </div>
                                            <div className="truncate">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-extrabold truncate">
                                                        {n.title || n.name || 'Untitled Sermon'}
                                                    </h4>
                                                    {isSelected && (
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isContrast ? 'bg-amber-500/30 text-amber-300' : 'bg-primary/20 text-primary'}`}>
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] opacity-60 mt-0.5">
                                                    {folder && (
                                                        <span className="flex items-center gap-1">
                                                            <Folder size={11} />
                                                            {folder.name}
                                                        </span>
                                                    )}
                                                    {n.updatedAt && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={11} />
                                                            {new Date(n.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className={`p-1.5 rounded-full shrink-0 ${isContrast ? 'bg-amber-500 text-black' : 'bg-primary text-white'}`}>
                                                <Check size={14} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Tip */}
                    <div className={`px-5 py-2.5 border-t text-[11px] flex items-center justify-between opacity-60 select-none ${headerBg}`}>
                        <span>Parchments Stage Switcher</span>
                        <span>1-Tap to load note immediately</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
