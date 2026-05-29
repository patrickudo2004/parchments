import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import { ScriptureExtension } from './extensions/ScriptureExtension';
import { ScriptureTooltipProvider } from './ScriptureTooltip';
import { VoiceNotePlayer } from '@/components/voice/VoiceNotePlayer';
import { RotateCcw, LogOut, Share2, Folder } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';
import { FocusExtension } from './extensions/FocusExtension';
import { EnterKeyExtension } from './extensions/EnterKeyExtension';
import { ManualSaveExtension } from './extensions/ManualSaveExtension';
import { TextCaseExtension } from './extensions/TextCaseExtension';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import Collaboration from '@tiptap/extension-collaboration';
import Image from '@tiptap/extension-image';
import { YjsService } from '@/lib/sync/YjsService';
import { ImageResizer } from './extensions/ImageResizer';
import { useSyncStore } from '@/stores/syncStore';
import { ShareNoteModal } from './ShareNoteModal';

interface RichTextEditorProps {
    activeRoom: string | null;
    identity: { publicKey: string } | null; // Minimal interface needed
    shouldSync: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ activeRoom, identity, shouldSync }) => {
    const { currentNote, saveCurrentNote, saveLocalAsset } = useNoteStore();
    const titleRef = React.useRef<HTMLTextAreaElement>(null);
    const {
        writingLayout,
        editorFontFamily,
        editorFontSize,
        editorLineSpacing,
        setEditorStats,
        updateSettings,
        focusedHeadingPos,
        setFocusedHeadingPos,
        enableAutoSave,
        pulpitMode,
        togglePulpitMode,
        theme,
        toggleTheme
    } = useUIStore();
    const [title, setTitle] = useState(currentNote?.title || '');
    const [isSaving, setIsSaving] = useState(false);

    // Guards against double-seeding race: ensures IndexedDB has finished loading
    // before we seed Yjs with local content.
    const [isPersistenceSynced, setIsPersistenceSynced] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSaveToFolderDialogOpen, setIsSaveToFolderDialogOpen] = useState(false);
    const { folders } = useNoteStore();
    const { showToast } = useUIStore();


    // 1. Initialize Yjs Doc for this note
    const { ydoc, provider } = useMemo(() => {
        if (!currentNote || !shouldSync) return { ydoc: null, provider: null };
        return {
            ydoc: YjsService.getDoc(currentNote.id),
            provider: YjsService.getProvider(currentNote.id)
        };
    }, [currentNote?.id, shouldSync, activeRoom, identity]);

    // Wait for IndexedDB persistence to fully load before allowing content seeding.
    // This prevents the double-seed race: without this guard the editor seeds empty content,
    // then IndexedDB finishes loading and Yjs merges — resulting in duplicated text.
    useEffect(() => {
        if (!shouldSync || !currentNote?.id || !ydoc) {
            setIsPersistenceSynced(true); // Non-sync mode: immediately allow seeding
            return;
        }

        setIsPersistenceSynced(false);

        const persistence = YjsService.getPersistence(currentNote.id);
        if (!persistence) {
            setIsPersistenceSynced(true);
            return;
        }

        // whenSynced resolves immediately if already synced, otherwise waits for load
        persistence.whenSynced.then(() => {
            setIsPersistenceSynced(true);
        });
    }, [shouldSync, currentNote?.id, ydoc]);

    // Auto-resize title textarea
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [title]);

    // Sync local title state with currentNote
    useEffect(() => {
        if (currentNote) {
            setTitle(currentNote.title);
        }
    }, [currentNote?.id, currentNote?.title]);

    // Title Synchronization via Yjs for Collaboration
    useEffect(() => {
        if (!shouldSync || !ydoc || !currentNote) return;

        const metadata = YjsService.getMetadata(currentNote.id);
        if (!metadata) return;

        // Seed initial title if empty
        const syncedTitle = metadata.get('title');
        if (!syncedTitle && currentNote.title) {
            metadata.set('title', currentNote.title);
            console.log('[Title Sync] Seeded title to Yjs:', currentNote.title);
        } else if (syncedTitle && syncedTitle !== title) {
            // Update local state if Yjs has a different title
            setTitle(syncedTitle);
            console.log('[Title Sync] Updated local title from Yjs:', syncedTitle);
        }

        // Listen for title changes from other collaborators
        const observer = (event: any) => {
            if (event.keysChanged.has('title')) {
                const newTitle = metadata.get('title');
                if (newTitle && newTitle !== title) {
                    setTitle(newTitle);
                    // Also update the note in the database
                    saveCurrentNote(newTitle, currentNote.content);
                    console.log('[Title Sync] Received title update from collaborator:', newTitle);
                }
            }
        };

        metadata.observe(observer);
        return () => metadata.unobserve(observer);
    }, [shouldSync, ydoc, currentNote?.id, currentNote?.content, saveCurrentNote, title]);

    const { updateRoomTitle, joinedRooms, isConnected, leaveRoom } = useSyncStore();

    // Title Discovery for Shared Rooms: Update sidebar title once data is synced
    // BUT: Only update if the activeRoom is a NOTE room, not a FOLDER room
    useEffect(() => {
        if (!activeRoom || !currentNote?.title || currentNote.title === 'Shared Room Note') return;

        // Find if this activeRoom corresponds to a folder
        const activeFolderRoom = joinedRooms.find(r => r.hash === activeRoom && r.type === 'folder');

        // ONLY update title if activeRoom is NOT a folder (i.e., it's a note or unknown)
        // This prevents note titles from overwriting folder titles
        if (!activeFolderRoom) {
            const activeNoteRoom = joinedRooms.find(r => r.hash === activeRoom);
            if (activeNoteRoom && activeNoteRoom.title !== currentNote.title) {
                updateRoomTitle(activeRoom, currentNote.title);
            }
        }
    }, [activeRoom, currentNote?.title, updateRoomTitle, joinedRooms]);

    // Unified Save Logic via Store
    const saveToDB = async (newTitle: string, newContent: string) => {
        setIsSaving(true);
        try {
            await saveCurrentNote(newTitle, newContent);
        } finally {
            setIsSaving(false);
        }
    };


    // Debounce Save (2 seconds)
    const debouncedSave = useCallback(
        (() => {
            let timeout: any;

            return (t: string, c: string) => {
                // Only auto-save if the setting is enabled
                if (!enableAutoSave) return;

                clearTimeout(timeout);

                timeout = setTimeout(() => saveToDB(t, c), 2000);
            };
        })(),
        [currentNote?.id, saveCurrentNote, enableAutoSave]
    );

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Ensure none of our manual ones conflict with StarterKit defaults
                bulletList: false,
                orderedList: false,
                blockquote: false,
                listItem: false,
                underline: false, // We import Underline separately
                link: false, // We import Link separately
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            BulletList.configure({
                HTMLAttributes: { class: 'list-disc pl-4' },
            }),
            OrderedList.configure({
                HTMLAttributes: { class: 'list-decimal pl-4' },
            }),
            ListItem.extend({
                addKeyboardShortcuts() {
                    return {
                        ...this.parent?.(),
                        Backspace: () => {
                            const { state, commands } = this.editor;
                            const { selection } = state;
                            const { $from, empty } = selection;

                            if (!empty) {
                                return false;
                            }

                            const parentNode = $from.node(-1);
                            if (parentNode && parentNode.type.name === 'listItem') {
                                const isParagraphEmpty = $from.parent.content.size === 0;
                                if (isParagraphEmpty) {
                                    return commands.liftListItem('listItem');
                                }
                            }

                            return false;
                        },
                    };
                },
            }),
            Blockquote.configure({
                HTMLAttributes: { class: 'border-l-4 border-light-border dark:border-dark-border pl-4 italic' },
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'listItem', 'blockquote'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
            }),
            Placeholder.configure({
                placeholder: 'Begin your study or sermon notes here...',
            }),
            CharacterCount,
            ScriptureExtension,
            FocusExtension,
            EnterKeyExtension,
            TextCaseExtension,
            ManualSaveExtension.configure({
                onSave: () => {
                    if (editor && currentNote) {
                        saveToDB(title, editor.getHTML());
                    }
                },
            }),
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        'data-asset-name': {
                            default: null,
                        },
                        width: {
                            default: '100%',
                            renderHTML: attributes => ({
                                width: attributes.width,
                            }),
                            parseHTML: element => element.getAttribute('width'),
                        },
                    };
                },
                addNodeView() {
                    return ReactNodeViewRenderer(ImageResizer);
                },
            }).configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-lg shadow-md max-w-full h-auto my-8 mx-auto block cursor-pointer transition-transform hover:scale-[1.01]',
                },
            }),
            // Collaboration logic - only include if shouldSync
            ...(shouldSync && ydoc ? [Collaboration.configure({ document: ydoc })] : []),
        ],
        editorProps: {
            transformPastedHTML(html) {
                return html
                    .replace(/ style="[^"]*"/gi, '')
                    .replace(/ style='[^']*'/gi, '');
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItems = items.filter(item => item.type.startsWith('image'));

                if (imageItems.length > 0) {
                    event.preventDefault();
                    imageItems.forEach(async item => {
                        const file = item.getAsFile();
                        if (file) {
                            const result = await saveLocalAsset(file);
                            if (result) {
                                const { url, fileName } = result;
                                view.dispatch(view.state.tr.replaceSelectionWith(
                                    view.state.schema.nodes.image.create({
                                        src: url,
                                        'data-asset-name': fileName
                                    })
                                ));
                            }
                        }
                    });
                    return true;
                }
                return false;
            },
            handleDrop: (view, event, _slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                    const files = Array.from(event.dataTransfer.files);
                    const images = files.filter(file => file.type.startsWith('image'));

                    if (images.length > 0) {
                        event.preventDefault();
                        images.forEach(async file => {
                            const result = await saveLocalAsset(file);
                            if (result) {
                                const { url, fileName } = result;
                                const { schema } = view.state;
                                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                                if (coordinates) {
                                    const node = schema.nodes.image.create({
                                        src: url,
                                        'data-asset-name': fileName
                                    });
                                    const transaction = view.state.tr.insert(coordinates.pos, node);
                                    view.dispatch(transaction);
                                }
                            }
                        });
                        return true;
                    }
                }
                return false;
            },
        },
        // When sync is enabled, don't set initial content - let Yjs load from IndexedDB
        // Only set content when in local-only mode
        ...(shouldSync ? {} : { content: currentNote?.content || '' }),
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            debouncedSave(title, html);
            if (shouldSync && ydoc) {
                const text = ydoc.getText('content');
                if (text.toString() !== html) {
                    ydoc.transact(() => {
                        text.delete(0, text.length);
                        text.insert(0, html);
                    }, 'rich-text-editor-sync');
                }
            }
        },
    }, [currentNote?.id, ydoc, provider, shouldSync, activeRoom, identity]);

    // Seed Yjs with local content if it's empty and we're starting a sync session.
    // IMPORTANT: We guard behind isPersistenceSynced to prevent double-seeding.
    // Without this guard the editor sees an empty YDoc (IndexedDB still loading),
    // seeds local content, then IndexedDB merges — causing duplicated text.
    useEffect(() => {
        if (!isPersistenceSynced) return; // Wait for IndexedDB to finish loading first

        if (editor && shouldSync && currentNote?.content && ydoc) {
            const fragment = ydoc.getXmlFragment('default');

            // Get current editor HTML to compare
            const editorHTML = editor.getHTML();
            const isEditorEmpty = editorHTML === '<p></p>' || editorHTML === '';

            console.log('[RichTextEditor] Seeding check (post-persistence-sync):', {
                fragmentLength: fragment.length,
                fragmentToString: fragment.toString().substring(0, 100),
                editorHTML: editorHTML.substring(0, 100),
                isEditorEmpty,
                hasLocalContent: !!currentNote?.content,
                noteId: currentNote?.id
            });

            // Seed only if the fragment is genuinely empty after IndexedDB has loaded
            if ((fragment.length === 0 || isEditorEmpty) && currentNote?.content) {
                console.log('[RichTextEditor] Seeding Yjs doc with local content (post-persistence sync)');
                editor.commands.setContent(currentNote.content);
            }
        }
    }, [editor, isPersistenceSynced, shouldSync, currentNote?.id, currentNote?.content, ydoc]);

    // Clear Yjs cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentNote?.id) {
                // We keep the doc alive in memory while it's being used
                // but we could destroy it if switching notes
            }
        };
    }, [currentNote?.id]);

    const { setEditor } = useUIStore();
    useEffect(() => {
        if (editor) {
            setEditor(editor);
            return () => setEditor(null);
        }
    }, [editor, setEditor]);

    // Sync Focus Mode with Editor (only when the target heading changes in the store)
    useEffect(() => {
        if (editor) {
            // We only need to tell the editor to switch focus if the target changes
            // The extension's apply() method handles position mapping during edits
            editor.commands.setFocusHeading(focusedHeadingPos);
        }
    }, [focusedHeadingPos, editor]); // Removing editor instance as a trigger if possible, or being careful here.

    // Sync Tiptap editability with pulpitMode
    useEffect(() => {
        if (editor) {
            editor.setEditable(!pulpitMode);
        }
    }, [editor, pulpitMode]);

    // Zoom Keyboard Shortcuts
    useEffect(() => {
        const handleZoom = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    updateSettings({ editorFontSize: Math.min(32, editorFontSize + 1) });
                } else if (e.key === '-') {
                    e.preventDefault();
                    updateSettings({ editorFontSize: Math.max(12, editorFontSize - 1) });
                } else if (e.key === '0') {
                    e.preventDefault();
                    updateSettings({ editorFontSize: 18 });
                }
            }
        };

        window.addEventListener('keydown', handleZoom);
        return () => window.removeEventListener('keydown', handleZoom);
    }, [editorFontSize, updateSettings]);

    // Update word count stats
    useEffect(() => {
        if (editor) {
            const updateStats = () => {
                const words = editor.storage.characterCount.words();
                const characters = editor.storage.characterCount.characters();
                setEditorStats(words || 0, characters || 0);
            };

            updateStats(); // Initial update
            editor.on('update', updateStats);

            return () => {
                editor.off('update', updateStats);
            };
        }
    }, [editor, setEditorStats]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newTitle = e.target.value.replace(/\n/g, ''); // Prevent newlines in title
        setTitle(newTitle);

        // Sync title to Yjs metadata for collaboration
        if (shouldSync && currentNote) {
            YjsService.setMetadata(currentNote.id, 'title', newTitle);
        }

        if (editor) {
            debouncedSave(newTitle, editor.getHTML());
        }
    };

    if (!currentNote) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            {pulpitMode ? (
                <div className="h-12 border-b border-light-border dark:border-dark-border bg-emerald-500/10 dark:bg-emerald-500/5 flex items-center justify-between px-6 shrink-0 relative z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Pulpit Mode Active</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => updateSettings({ editorFontSize: Math.max(12, editorFontSize - 1) })}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary font-black text-xs shrink-0"
                            title="Decrease Text Size"
                        >
                            A-
                        </button>
                        <button
                            onClick={() => updateSettings({ editorFontSize: Math.min(36, editorFontSize + 1) })}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary font-black text-xs shrink-0"
                            title="Increase Text Size"
                        >
                            A+
                        </button>

                        <div className="w-[1px] h-3 bg-light-border dark:bg-dark-border mx-2 shrink-0" />

                        <button
                            onClick={toggleTheme}
                            className="p-1.5 rounded-lg hover:bg-light-background dark:hover:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary shrink-0 text-xs"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                        </button>

                        <button
                            onClick={togglePulpitMode}
                            className="ml-3 px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-600 transition-all shrink-0"
                        >
                            Exit Presentation
                        </button>
                    </div>
                </div>
            ) : (
                <EditorToolbar editor={editor} />
            )}

            {focusedHeadingPos !== null && (
                <div className="bg-primary/5 border-b border-primary/10 px-6 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Focused on Section</span>
                    </div>
                    <button
                        onClick={() => setFocusedHeadingPos(null)}
                        className="text-[10px] font-black uppercase tracking-widest bg-primary text-white px-3 py-1 rounded hover:bg-primary-hover transition-colors"
                    >
                        Exit Focus
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div
                    className={`mx-auto py-16 px-8 min-h-full transition-all duration-500 ${writingLayout === 'centered' ? 'max-w-4xl shadow-sm bg-light-surface dark:bg-dark-background/30' : 'max-w-none'
                        }`}
                    style={{
                        fontFamily: editorFontFamily === 'serif' ? '"Source Serif 4", Georgia, serif' : 'Inter, sans-serif',
                    }}
                >
                    {/* Collaborative Import Banner */}
                    {currentNote.isSharedPlaceholder && (
                        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-sm animate-in slide-in-from-top duration-300">
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Collaborative Shared Note</h4>
                                <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-semibold">
                                    Save this note to one of your folders to keep it in your local library.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSaveToFolderDialogOpen(true)}
                                className="px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 shrink-0"
                            >
                                Save to Folder
                            </button>
                        </div>
                    )}

                    {/* Note Header / Title */}
                    <textarea
                        ref={titleRef}
                        value={title}
                        onChange={handleTitleChange}
                        readOnly={pulpitMode}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                editor?.chain().focus().run(); // Focus editor on Enter
                            }
                        }}
                        placeholder="Note Title"
                        rows={1}
                        className={`w-full text-5xl font-black mb-8 bg-transparent border-none outline-none focus:ring-0 placeholder:opacity-20 transition-all hover:placeholder:opacity-30 resize-none overflow-hidden block ${focusedHeadingPos !== null ? 'opacity-20 blur-[1px]' : ''} ${pulpitMode ? 'cursor-default pointer-events-none select-none' : ''}`}
                        style={{ height: 'auto' }}
                    />

                    {/* Meta Info */}
                    <div className="flex items-center justify-between mb-6 border-b border-light-border dark:border-dark-border pb-4">
                        <div className="flex items-center gap-4 text-xs font-bold text-light-text-disabled uppercase tracking-widest">
                            <span>Created: {new Date(currentNote.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={isSaving ? 'text-primary animate-pulse' : ''}>
                                {isSaving ? 'Saving...' : 'All Saved'}
                            </span>
                            {/* Real-time Sync Connection Badge */}
                            {shouldSync && (
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                        isConnected
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-amber-400/10 text-amber-500 animate-pulse'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        isConnected ? 'bg-emerald-500' : 'bg-amber-400'
                                    }`} />
                                    {isConnected ? 'Sync Connected' : 'Connecting...'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Share Note Button */}
                            {identity && (
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
                                    title="Share Note"
                                >
                                    <Share2 size={12} />
                                    <span>Share Note</span>
                                </button>
                            )}
                            {/* Leave Room Button — only shown in collaborative mode */}
                            {shouldSync && activeRoom && (
                                <button
                                    onClick={() => {
                                        leaveRoom();
                                        useUIStore.getState().showToast('Left the collaborative room', 'info');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
                                    title="Leave collaborative room"
                                >
                                    <LogOut size={12} />
                                    <span>Leave Room</span>
                                </button>
                            )}
                            {/* Manual Save Button */}
                            <button
                                onClick={() => saveToDB(title, editor?.getHTML() || '')}
                                disabled={isSaving || !editor}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <RotateCcw size={12} className={isSaving ? 'animate-spin' : ''} />
                                <span>Save Now</span>
                            </button>
                        </div>
                    </div>

                    {/* Voice Note Player (Inline) */}
                    {currentNote.type === 'voice' && (
                        <div className="mb-12">
                            <VoiceNotePlayer
                                audioBlob={currentNote.audioBlob}
                                audioUrl={currentNote.audioUrl}
                            />

                            {/* Transcript Display */}
                            {currentNote.transcript && (
                                <div className="mt-8 p-6 bg-light-background/50 dark:bg-dark-background/30 rounded-2xl border border-light-border dark:border-dark-border">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary opacity-50">
                                            Voice Transcript
                                        </h3>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(currentNote.transcript || '')}
                                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                                        >
                                            Copy Text
                                        </button>
                                    </div>
                                    <p className="text-base leading-relaxed text-light-text-main dark:text-dark-text-main font-medium border-l-2 border-primary/30 pl-4 py-2">
                                        {currentNote.transcript}
                                    </p>
                                </div>
                            )}

                            <div className="mt-8 border-b-2 border-dashed border-light-border dark:border-dark-border opacity-50" />
                        </div>
                    )}

                    {/* Tiptap Editor */}
                    {/* If we have a structured transcript field, we hide the visual editor content if it duplicates the transcript */
                        /* Logic: If type is voice AND we have transcript field, hide the editor content (which contains the backup transcript) */
                        (currentNote.type === 'voice' && currentNote.transcript) ? (
                            <div className="hidden">
                                {/* Hide content because we already showed the transcript above */}
                                <EditorContent editor={editor} />
                            </div>
                        ) : (
                            <ScriptureTooltipProvider>
                                <div
                                    className={`prose prose-lg dark:prose-invert max-w-none tiptap-editor ${focusedHeadingPos !== null ? 'focus-active' : ''} ${pulpitMode ? 'pulpit-active select-none' : ''}`}
                                    style={{
                                        fontSize: pulpitMode ? `${Math.max(editorFontSize * 1.35, 24)}px` : `${editorFontSize}px`,
                                        lineHeight: pulpitMode ? 1.8 : editorLineSpacing,
                                    }}
                                >
                                    <EditorContent editor={editor} />
                                </div>
                            </ScriptureTooltipProvider>
                        )
                    }
                </div>
            </div>


            {/* Share Note Modal */}
            {isShareModalOpen && currentNote && (
                <ShareNoteModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    noteId={currentNote.id}
                />
            )}

            {/* Save to Folder Dialog Overlay */}
            {isSaveToFolderDialogOpen && currentNote && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsSaveToFolderDialogOpen(false)}>
                    <div className="w-full max-w-sm bg-light-surface dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center space-y-1">
                            <h4 className="font-extrabold text-base text-light-text-primary dark:text-dark-text-primary">Select Folder</h4>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Choose a folder to save this collaborative note.</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                            {folders.length === 0 ? (
                                <p className="text-xs italic text-light-text-disabled text-center py-4">No folders created yet.</p>
                            ) : (
                                folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={async () => {
                                            setIsSaveToFolderDialogOpen(false);
                                            const { db } = await import('@/lib/db');
                                            
                                            // Save to DB
                                            await db.notes.add({
                                                id: currentNote.id,
                                                title: title,
                                                content: editor?.getHTML() || currentNote.content,
                                                folderId: folder.id,
                                                tags: [],
                                                type: currentNote.type || 'text',
                                                createdAt: currentNote.createdAt || Date.now(),
                                                updatedAt: Date.now()
                                            });
                                            
                                            // Update local store state
                                            const store = useNoteStore.getState();
                                            const newNote = {
                                                ...currentNote,
                                                title: title,
                                                isSharedPlaceholder: false,
                                                folderId: folder.id
                                            };
                                            useNoteStore.setState({
                                                notes: [...store.notes, newNote],
                                                currentNote: newNote
                                            });
                                            
                                            showToast('Saved note to folder successfully', 'success');
                                        }}
                                        className="w-full p-3 text-left text-xs font-bold rounded-xl hover:bg-light-background dark:hover:bg-dark-background border border-transparent hover:border-primary/20 transition-all flex items-center gap-2"
                                    >
                                        <Folder size={16} className="text-primary" />
                                        <span className="text-light-text-primary dark:text-dark-text-primary">{folder.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setIsSaveToFolderDialogOpen(false)}
                                className="px-4 py-2 border border-light-border dark:border-dark-border text-xs font-bold rounded-xl hover:bg-light-background dark:hover:bg-dark-background transition-all text-light-text-secondary dark:text-dark-text-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
