import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { dbHelpers } from '@/lib/db';
import { parseScriptureReference } from '@/lib/scriptureParser';

interface SearchResult {
    id: string;
    type: 'note' | 'folder' | 'scripture' | 'action';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    handler: () => void;
}

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void; initialQuery?: string }> = ({ isOpen, onClose, initialQuery = '' }) => {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { setCurrentNote, isLocalMode, localFiles, openLocalFile } = useNoteStore();
    const { toggleTheme, openRightSidebar } = useUIStore();
    const { setBibleFocus } = useBibleStore();

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialQuery]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const newResults: SearchResult[] = [];
        const lowerQuery = searchQuery.toLowerCase();

        // 1. Check for Scripture Reference
        const scripture = parseScriptureReference(searchQuery);
        if (scripture) {
            newResults.push({
                id: `scripture-${scripture.book}-${scripture.chapter}`,
                type: 'scripture',
                title: `${scripture.book} ${scripture.chapter}${scripture.verse ? ':' + scripture.verse : ''}`,
                subtitle: 'Jump to Bible',
                icon: <AutoAwesomeIcon className="text-amber-500" fontSize="small" />,
                handler: () => {
                    setBibleFocus(scripture);
                    openRightSidebar('bible');
                    onClose();
                }
            });
        }

        // 2. Search Database Notes (if not in local mode or searching both)
        if (!isLocalMode) {
            const matchedNotes = await dbHelpers.searchNotes(searchQuery);
            matchedNotes.forEach(note => {
                newResults.push({
                    id: note.id,
                    type: 'note',
                    title: note.title,
                    subtitle: `In ${note.type} notes`,
                    icon: <DescriptionIcon className="text-primary" fontSize="small" />,
                    handler: () => {
                        setCurrentNote(note);
                        onClose();
                    }
                });
            });
        } else {
            // Search Local Files
            localFiles.filter(f => f.name.toLowerCase().includes(lowerQuery)).forEach(file => {
                newResults.push({
                    id: file.id,
                    type: file.kind === 'file' ? 'note' : 'folder',
                    title: file.name,
                    subtitle: file.kind === 'file' ? 'Local File' : 'Local Folder',
                    icon: file.kind === 'file' ? <DescriptionIcon className="text-primary" fontSize="small" /> : <FolderIcon className="text-amber-500" fontSize="small" />,
                    handler: () => {
                        if (file.kind === 'file') {
                            openLocalFile(file as any);
                        }
                        onClose();
                    }
                });
            });
        }

        // 3. Quick Actions
        const actions: SearchResult[] = [
            { id: 'act-theme', type: 'action', title: 'Toggle Theme', subtitle: 'Switch between light/dark', icon: <BoltIcon />, handler: toggleTheme },
            { id: 'act-bible', type: 'action', title: 'Open Bible', subtitle: 'Open Bible reader', icon: <AutoAwesomeIcon />, handler: () => openRightSidebar('bible') },
        ];

        actions.filter(a => a.title.toLowerCase().includes(lowerQuery)).forEach(a => {
            newResults.push({ ...a, type: 'action', icon: <BoltIcon className="text-purple-500" fontSize="small" />, handler: () => { a.handler(); onClose(); } });
        });

        setResults(newResults);
        setSelectedIndex(0);
    }, [isLocalMode, localFiles, setCurrentNote, setBibleFocus, openRightSidebar, toggleTheme, onClose, openLocalFile]);

    useEffect(() => {
        const timeout = setTimeout(() => performSearch(query), 150);
        return () => clearTimeout(timeout);
    }, [query, performSearch]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].handler();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Auto-scroll to selected index
    useEffect(() => {
        const selectedElement = scrollRef.current?.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="w-full max-w-2xl bg-white dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden border border-light-border dark:border-dark-border relative flex flex-col"
                    >
                        {/* Input Area */}
                        <div className="flex items-center gap-4 px-6 py-4 border-b border-light-border dark:border-dark-border">
                            <SearchIcon className="text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search everything... (Try 'John 3:16' or '> Theme')"
                                className="flex-1 bg-transparent border-none outline-none text-lg text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-disabled"
                            />
                            <div className="flex items-center gap-1 opacity-50">
                                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold">ESC</kbd>
                            </div>
                        </div>

                        {/* Results Area */}
                        <div
                            ref={scrollRef}
                            className="max-h-[60vh] overflow-y-auto py-2 custom-scrollbar"
                        >
                            {results.length > 0 ? (
                                results.map((result, idx) => (
                                    <div
                                        key={result.id}
                                        onClick={() => result.handler()}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`px-6 py-3 flex items-center gap-4 cursor-pointer transition-colors ${idx === selectedIndex
                                            ? 'bg-primary/10 dark:bg-primary/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${idx === selectedIndex ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                            }`}>
                                            {result.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary truncate">
                                                {result.title}
                                            </p>
                                            {result.subtitle && (
                                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                                                    {result.subtitle}
                                                </p>
                                            )}
                                        </div>
                                        {idx === selectedIndex && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Enter</span>
                                        )}
                                    </div>
                                ))
                            ) : query.trim() ? (
                                <div className="px-6 py-12 text-center text-light-text-secondary dark:text-dark-text-secondary">
                                    <p className="text-sm font-medium">No results found for "{query}"</p>
                                </div>
                            ) : (
                                <div className="px-6 py-8 text-center text-light-text-secondary dark:text-dark-text-secondary opacity-60">
                                    <p className="text-xs uppercase font-black tracking-widest mb-1">Search Anything</p>
                                    <p className="text-xs font-medium">Find notes, local files, scripture, or run commands</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gray-50 dark:bg-black/20 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                            <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-widest text-light-text-disabled">
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">↑↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1 rounded bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-sm">↵</kbd>
                                    <span>Select</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
