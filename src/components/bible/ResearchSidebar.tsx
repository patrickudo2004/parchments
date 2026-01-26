import React from 'react';
import { useResearchStore } from '@/stores/researchStore';
import type { PinItem } from '@/stores/researchStore';
import { useUIStore } from '@/stores/uiStore';
import {
    Pin,
    Trash2,
    Copy,
    BookOpen,
    Hash,
    FileText,
    Clock,
    Sparkles,
    Clock,
    Sparkles,
    Check,
    Link as LinkIcon,
    Layers,
    PlusSquare,
    ChevronDown,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

export const ResearchSidebar: React.FC = () => {
    const { pins, unpinItem, clearPins, pinItem } = useResearchStore();
    const { activeEditor, showToast } = useUIStore();
    const [copiedId, setCopiedId] = React.useState<string | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleInsertToEditor = (pin: PinItem, refOnly = false) => {
        let content = '';
        if (refOnly) {
            content = `<a href="#" class="font-bold text-primary hover:underline">${pin.reference}</a>`;
        } else {
            content = `<blockquote>${pin.content}<cite>— ${pin.reference}</cite></blockquote><p></p>`;
        }

        if (activeEditor) {
            activeEditor.chain().focus().insertContent(content).run();
            setCopiedId(pin.id + (refOnly ? '-ref' : ''));
            showToast(refOnly ? 'Reference inserted!' : 'Citation inserted!', 'success');
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(content).then(() => {
                setCopiedId(pin.id + (refOnly ? '-ref' : ''));
                showToast('No active note. Copied to clipboard!', 'info');
                setTimeout(() => setCopiedId(null), 2000);
            });
        }
    };

    const handleGroupInsert = (refOnly = false) => {
        if (selectedIds.size === 0) return;
        const selectedPins = pins.filter(p => selectedIds.has(p.id));

        let content = '';
        if (refOnly) {
            content = selectedPins.map(p => `<a href="#" class="font-bold text-primary hover:underline">${p.reference}</a>`).join(', ');
        } else {
            content = selectedPins.map(p => `<blockquote>${p.content}<cite>— ${p.reference}</cite></blockquote>`).join('<p></p>');
            content += '<p></p>';
        }

        if (activeEditor) {
            activeEditor.chain().focus().insertContent(content).run();
            showToast(`Inserted ${selectedPins.length} items!`, 'success');
        } else {
            navigator.clipboard.writeText(content);
            showToast('Copied group to clipboard!', 'info');
        }
        setSelectedIds(new Set());
    };

    const handleMerge = () => {
        if (selectedIds.size < 2) return;
        const selectedPins = pins.filter(p => selectedIds.has(p.id));

        const combinedContent = selectedPins.map(p => p.content).join('<br/><br/>');
        const refs = selectedPins.map(p => p.reference).join(', ');

        const newPin: Omit<PinItem, 'timestamp'> = {
            id: `merge-${Date.now()}`,
            type: 'note',
            title: `Merged: ${selectedPins[0].reference}...`,
            content: combinedContent,
            reference: refs,
            metadata: { mergedFrom: selectedPins.map(p => p.id) },
            sourceIds: selectedPins.flatMap(p => p.sourceIds || [p.id])
        };

        pinItem(newPin);
        selectedPins.forEach(p => unpinItem(p.id));
        setSelectedIds(new Set());
        showToast('Pins merged into one!', 'success');
    };

    const getTypeIcon = (type: PinItem['type']) => {
        switch (type) {
            case 'verse': return <BookOpen size={14} className="text-blue-500" />;
            case 'lexicon': return <Hash size={14} className="text-purple-500" />;
            case 'note': return <FileText size={14} className="text-green-500" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-background/30 dark:bg-dark-background/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Pin size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-light-text-primary dark:text-dark-text-primary">Research Pins</h3>
                        <p className="text-[10px] text-light-text-disabled">{pins.length} items collected</p>
                    </div>
                </div>
                {pins.length > 0 && (
                    <button
                        onClick={clearPins}
                        className="p-2 text-light-text-disabled hover:text-red-500 transition-colors"
                        title="Clear all pins"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                <AnimatePresence initial={false}>
                    {pins.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4"
                        >
                            <div className="w-16 h-16 rounded-3xl bg-light-background dark:bg-dark-background flex items-center justify-center border border-light-border dark:border-dark-border">
                                <Sparkles size={24} className="text-light-text-disabled opacity-50" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-light-text-secondary mb-2 text-primary">Your Staging Area</h4>
                                <p className="text-[10px] text-light-text-disabled leading-relaxed max-w-[200px]">
                                    Pin verses, lexicon entries, or notes to keep them handy while you write.
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        pins.map((pin) => (
                            <motion.div
                                key={pin.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                className="group relative bg-light-background dark:bg-dark-background/50 rounded-2xl border border-light-border dark:border-dark-border overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
                            >
                                <div className="p-4 space-y-3">
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(pin.id)}
                                                onChange={() => toggleSelection(pin.id)}
                                                className="w-3 h-3 rounded border-light-border dark:border-dark-border text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                            />
                                            {getTypeIcon(pin.type)}
                                            <span className="text-[10px] font-black uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary">
                                                {pin.reference}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleInsertToEditor(pin, true)}
                                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                                title="Insert Reference Only"
                                            >
                                                {copiedId === pin.id + '-ref' ? <Check size={14} /> : <LinkIcon size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleInsertToEditor(pin)}
                                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                                title="Insert Full Citation"
                                            >
                                                {copiedId === pin.id ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                            <button
                                                onClick={() => unpinItem(pin.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-light-text-disabled hover:text-red-500 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content Snippet */}
                                    <div
                                        className="text-xs text-light-text-secondary dark:text-dark-text-secondary line-clamp-3 font-serif italic border-l-2 border-primary/20 pl-3 py-1"
                                        dangerouslySetInnerHTML={{ __html: pin.content }}
                                    />

                                    {/* Footer */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Clock size={10} className="text-light-text-disabled" />
                                        <span className="text-[9px] text-light-text-disabled">
                                            pinned {formatTimeAgo(pin.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Group Actions Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-dark-surface border-t border-white/10 p-3 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-primary flex items-center justify-center text-[10px] font-black">{selectedIds.size}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Selected</span>
                            </div>
                            <button onClick={() => setSelectedIds(new Set())} className="text-white/50 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleGroupInsert(false)}
                                className="flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                                <PlusSquare size={12} />
                                Insert Group
                            </button>
                            <button
                                onClick={handleMerge}
                                disabled={selectedIds.size < 2}
                                className="flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Layers size={12} />
                                Merge Pins
                            </button>
                            <button
                                onClick={() => handleGroupInsert(true)}
                                className="col-span-2 flex items-center justify-center gap-2 py-2 border border-white/10 hover:bg-white/5 text-white/70 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all mt-1"
                            >
                                <LinkIcon size={12} />
                                Insert Selected Refs Only
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hint */}
            {pins.length > 0 && selectedIds.size === 0 && (
                <div className="p-4 bg-primary/5 border-t border-primary/10">
                    <p className="text-[9px] text-primary/70 text-center font-medium leading-relaxed">
                        Select multiple items to merge them or insert them as a single group.
                    </p>
                </div>
            )}
        </div>
    );
};
