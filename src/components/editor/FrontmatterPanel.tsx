import React, { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import {
    ChevronDown,
    ChevronRight,
    SlidersHorizontal,
    Plus,
    X,
    User,
    Calendar,
    BookOpen,
    Layers,
    Tag,
    Hash
} from 'lucide-react';

interface FrontmatterPanelProps {
    pulpitMode?: boolean;
    onMetadataChange?: () => void;
}

const COMMON_KEYS = [
    { key: 'speaker', label: 'Speaker', icon: User, placeholder: 'e.g. Pastor John' },
    { key: 'series', label: 'Series', icon: Layers, placeholder: 'e.g. Gospel of John' },
    { key: 'date', label: 'Date', icon: Calendar, placeholder: 'YYYY-MM-DD' },
    { key: 'scripture', label: 'Scripture', icon: BookOpen, placeholder: 'e.g. John 3:16-18' },
    { key: 'tags', label: 'Tags', icon: Tag, placeholder: 'e.g. faith, grace' }
];

export const FrontmatterPanel: React.FC<FrontmatterPanelProps> = ({
    pulpitMode = false,
    onMetadataChange
}) => {
    const { currentNote, updateCurrentNoteMetadata, currentFileHandle } = useNoteStore();
    const isMarkdown = currentFileHandle ? /\.(md|markdown)$/i.test(currentFileHandle.name) : true;

    // Start expanded if there are properties present, collapsed if empty
    const metadata = currentNote?.metadata || {};
    const keys = Object.keys(metadata).filter(k => k !== 'id' && k !== 'createdAt');
    const [isExpanded, setIsExpanded] = useState<boolean>(keys.length > 0);
    const [newKeyName, setNewKeyName] = useState('');
    const [isAddingCustom, setIsAddingCustom] = useState(false);

    if (pulpitMode) {
        return null;
    }

    const handleValueChange = (key: string, value: any) => {
        const updated = {
            ...metadata,
            [key]: value
        };
        updateCurrentNoteMetadata(updated);
        onMetadataChange?.();
    };

    const handleRemoveKey = (keyToRemove: string) => {
        const updated = { ...metadata };
        delete updated[keyToRemove];
        updateCurrentNoteMetadata(updated);
        onMetadataChange?.();
    };

    const handleAddKey = (keyToAdd: string) => {
        if (!keyToAdd) return;
        const normalizedKey = keyToAdd.trim().toLowerCase().replace(/\s+/g, '_');
        if (metadata[normalizedKey] !== undefined) return;

        let initialVal: any = '';
        if (normalizedKey === 'date') {
            initialVal = new Date().toISOString().split('T')[0];
        } else if (normalizedKey === 'tags') {
            initialVal = [];
        }

        const updated = {
            ...metadata,
            [normalizedKey]: initialVal
        };
        updateCurrentNoteMetadata(updated);
        setIsAddingCustom(false);
        setNewKeyName('');
        setIsExpanded(true);
        onMetadataChange?.();
    };

    const unusedCommonKeys = COMMON_KEYS.filter(c => metadata[c.key] === undefined);

    return (
        <div className="mb-6 rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-light-surface/40 dark:bg-dark-surface/40 backdrop-blur-sm transition-all text-xs">
            {/* Header / Toggle Row */}
            <div className="flex items-center justify-between px-3 py-2">
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 font-bold text-light-text-secondary dark:text-dark-text-secondary hover:text-primary transition-colors uppercase tracking-wider text-[11px]"
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <SlidersHorizontal size={13} className="text-primary" />
                    <span>Properties</span>
                    {keys.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded-md font-mono text-[10px]">
                            {keys.length}
                        </span>
                    )}
                    {isMarkdown && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-mono text-[9px] lowercase">
                            frontmatter
                        </span>
                    )}
                </button>

                {isExpanded && (
                    <div className="flex items-center gap-1.5">
                        {unusedCommonKeys.slice(0, 3).map(common => (
                            <button
                                key={common.key}
                                type="button"
                                onClick={() => handleAddKey(common.key)}
                                className="px-2 py-0.5 rounded-lg border border-dashed border-light-border dark:border-dark-border text-light-text-disabled hover:text-primary hover:border-primary/50 transition-all text-[10px] flex items-center gap-1"
                                title={`Add ${common.label}`}
                            >
                                <Plus size={10} />
                                <span>{common.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Expanded Property List */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-light-border/30 dark:border-dark-border/30">
                    {keys.length === 0 && !isAddingCustom && (
                        <div className="py-2 text-center text-light-text-disabled text-[11px]">
                            No document properties yet. Add metadata such as speaker, series, scripture, or tags.
                        </div>
                    )}

                    {keys.map(key => {
                        const common = COMMON_KEYS.find(c => c.key === key);
                        const Icon = common?.icon || Hash;
                        const label = common?.label || key;
                        const rawValue = metadata[key];
                        const displayValue = Array.isArray(rawValue) ? rawValue.join(', ') : (rawValue ?? '');

                        return (
                            <div
                                key={key}
                                className="group flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-light-background/60 dark:hover:bg-dark-background/60 transition-colors"
                            >
                                <div className="flex items-center gap-1.5 w-28 shrink-0 text-light-text-secondary dark:text-dark-text-secondary font-semibold">
                                    <Icon size={12} className="text-light-text-disabled group-hover:text-primary transition-colors" />
                                    <span className="truncate capitalize">{label}</span>
                                </div>

                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={displayValue}
                                        placeholder={common?.placeholder || `Enter ${label}...`}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (key === 'tags') {
                                                const tagsArray = val.split(',').map(s => s.trim()).filter(Boolean);
                                                handleValueChange(key, tagsArray);
                                            } else {
                                                handleValueChange(key, val);
                                            }
                                        }}
                                        className="w-full bg-transparent px-2 py-1 text-xs text-light-text-primary dark:text-dark-text-primary outline-none border border-transparent focus:border-primary/40 focus:bg-light-surface dark:focus:bg-dark-surface rounded-md transition-all placeholder:text-light-text-disabled/50 font-normal"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleRemoveKey(key)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-light-text-disabled hover:text-red-500 rounded transition-all shrink-0"
                                    title={`Remove ${label}`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}

                    {/* Add Custom Property Input */}
                    {isAddingCustom ? (
                        <div className="flex items-center gap-2 pt-1 px-2">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Property name (e.g. topic, church)"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddKey(newKeyName);
                                    } else if (e.key === 'Escape') {
                                        setIsAddingCustom(false);
                                    }
                                }}
                                className="bg-light-background dark:bg-dark-background px-2 py-1 text-xs rounded border border-primary/50 outline-none w-48"
                            />
                            <button
                                type="button"
                                onClick={() => handleAddKey(newKeyName)}
                                className="px-2 py-1 bg-primary text-white rounded text-[10px] font-bold"
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAddingCustom(false)}
                                className="px-2 py-1 text-light-text-disabled hover:text-light-text-secondary text-[10px]"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="pt-1 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddingCustom(true)}
                                className="flex items-center gap-1 text-[11px] font-medium text-light-text-disabled hover:text-primary transition-colors px-2 py-1 rounded"
                            >
                                <Plus size={11} />
                                <span>Add custom property</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
