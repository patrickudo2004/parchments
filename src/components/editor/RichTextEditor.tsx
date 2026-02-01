import React, { useEffect, useState, useCallback } from 'react';
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
import { EditorToolbar } from './EditorToolbar';
import { FocusExtension } from './extensions/FocusExtension';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { useAIStore } from '@/stores/aiStore';
import { AutoLinkSuggestion } from './AutoLinkSuggestion';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Image from '@tiptap/extension-image';
import { YjsService } from '@/lib/sync/YjsService';
import { useSyncStore } from '@/stores/syncStore';
import { ImageResizer } from './extensions/ImageResizer';

export const RichTextEditor: React.FC = () => {
    const { currentNote, saveCurrentNote, isLocalMode, saveLocalAsset } = useNoteStore();
    const {
        writingLayout,
        editorFontFamily,
        editorFontSize,
        editorLineSpacing,
        setEditorStats,
        updateSettings,
        focusedHeadingPos,
        setFocusedHeadingPos
    } = useUIStore();
    const [title, setTitle] = useState(currentNote?.title || '');
    const [isSaving, setIsSaving] = useState(false);
    const [suggestedNoteId, setSuggestedNoteId] = useState<string | null>(null);

    const { search } = useAIStore();
    const { identity } = useSyncStore();

    // 1. Initialize Yjs Doc for this note (Only if not in local mode)
    const ydoc = (currentNote && !isLocalMode) ? YjsService.getDoc(currentNote.id) : null;
    const provider = (currentNote && !isLocalMode) ? YjsService.getProvider(currentNote.id) : null;

    // Sync local title state with currentNote
    useEffect(() => {
        if (currentNote) {
            setTitle(currentNote.title);
        }
    }, [currentNote?.id]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false,
                orderedList: false,
                blockquote: false,
                listItem: false,
                // history is included by default, no need to configure it here if it's causing issues
                // These are the ones often duplicated in some Tiptap versions
                dropcursor: false,
                gapcursor: false,
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
            ListItem,
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
            // Collaboration logic - only include if document/provider exists AND not in local mode
            ...((ydoc && !isLocalMode) ? [Collaboration.configure({ document: ydoc })] : []),
            ...((provider && !isLocalMode) ? [CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: identity?.publicKey.slice(0, 8) || 'Anonymous Scribe',
                    color: '#1a73e8',
                },
            })] : []),
        ],
        editorProps: {
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
        content: currentNote?.content || '',
        onUpdate: ({ editor }) => {
            debouncedSave(title, editor.getHTML());
        },
    }, [currentNote?.id]);

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
            let autoLinkTimeout: any;

            return (t: string, c: string) => {
                clearTimeout(timeout);
                clearTimeout(autoLinkTimeout);

                timeout = setTimeout(() => saveToDB(t, c), 2000);

                // Auto-Linking Logic: Search for related context
                autoLinkTimeout = setTimeout(async () => {
                    const cleanText = c.replace(/<[^>]*>/g, '').trim();
                    if (cleanText.length < 50) return; // Only search if there's enough context

                    // Last 200 chars for context-aware search
                    const searchSnippet = cleanText.slice(-200);
                    const results = await search(searchSnippet);

                    // Find a highly relevant note that isn't the current one
                    const topMatch = results.find(r => r.noteId !== currentNote?.id && r.score > 0.75);
                    if (topMatch) {
                        setSuggestedNoteId(topMatch.noteId);
                    }
                }, 3000);
            };
        })(),
        [currentNote?.id, search]
    );

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (editor) {
            debouncedSave(newTitle, editor.getHTML());
        }
    };

    if (!currentNote) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-dark-surface overflow-hidden">
            <EditorToolbar editor={editor} />

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
                    {/* Note Header / Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Note Title"
                        className={`w-full text-5xl font-black mb-8 bg-transparent border-none outline-none focus:ring-0 placeholder:opacity-20 transition-all hover:placeholder:opacity-30 ${focusedHeadingPos !== null ? 'opacity-20 blur-[1px]' : ''}`}
                    />

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs font-bold text-light-text-disabled uppercase tracking-widest mb-6 border-b border-light-border dark:border-dark-border pb-4">
                        <span>Created: {new Date(currentNote.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={isSaving ? 'text-primary animate-pulse' : ''}>
                            {isSaving ? 'Saving Changes...' : 'All Changes Saved'}
                        </span>
                    </div>

                    {/* Voice Note Player (Inline) */}
                    {currentNote.type === 'voice' && (
                        <div className="mb-12">
                            <VoiceNotePlayer
                                audioBlob={currentNote.audioBlob}
                                audioUrl={currentNote.audioUrl}
                            />
                            <div className="mt-8 border-b-2 border-dashed border-light-border dark:border-dark-border opacity-50" />
                        </div>
                    )}

                    {/* Tiptap Editor */}
                    <ScriptureTooltipProvider>
                        <div
                            className={`prose prose-lg dark:prose-invert max-w-none tiptap-editor ${focusedHeadingPos !== null ? 'focus-active' : ''}`}
                            style={{
                                fontSize: `${editorFontSize}px`,
                                lineHeight: editorLineSpacing,
                            }}
                        >
                            <EditorContent editor={editor} />
                        </div>
                    </ScriptureTooltipProvider>
                </div>
            </div>

            {/* AI Suggestions Layer */}
            {suggestedNoteId && (
                <AutoLinkSuggestion
                    noteId={suggestedNoteId}
                    onDismiss={() => setSuggestedNoteId(null)}
                    onLink={(id) => {
                        // For now, we'll just open the note. 
                        // In the future, we can insert an actual link into the editor.
                        if (editor) {
                            const note = useNoteStore.getState().notes.find(n => n.id === id);
                            if (note) {
                                editor.chain().focus().extendMarkRange('link').setLink({ href: `note://${id}` }).run();
                            }
                        }
                        setSuggestedNoteId(null);
                    }}
                />
            )}
        </div>
    );
};
