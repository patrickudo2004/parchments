import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { EditorToolbar } from './EditorToolbar';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/lib/db';

export const RichTextEditor: React.FC = () => {
    const { currentNote, notes, setNotes } = useNoteStore();
    const { writingLayout, editorFontFamily, editorFontSize, editorLineSpacing, setEditorStats } = useUIStore();
    const [title, setTitle] = useState(currentNote?.title || '');
    const [isSaving, setIsSaving] = useState(false);

    // Sync local title state with currentNote
    useEffect(() => {
        if (currentNote) {
            setTitle(currentNote.title);
        }
    }, [currentNote?.id]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false, // We'll add it explicitly
                orderedList: false,
                blockquote: false,
                listItem: false,
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            BulletList.configure({
                HTMLAttributes: {
                    class: 'list-disc pl-4',
                },
            }),
            OrderedList.configure({
                HTMLAttributes: {
                    class: 'list-decimal pl-4',
                },
            }),
            ListItem,
            Blockquote.configure({
                HTMLAttributes: {
                    class: 'border-l-4 border-light-border dark:border-dark-border pl-4 italic',
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'listItem', 'blockquote'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            Placeholder.configure({
                placeholder: 'Begin your study or sermon notes here...',
            }),
            CharacterCount,
        ],
        content: currentNote?.content || '',
        onUpdate: ({ editor }) => {
            debouncedSave(title, editor.getHTML());
        },
    }, [currentNote?.id]);

    // Handle initial content load
    useEffect(() => {
        if (editor && currentNote && editor.getHTML() !== currentNote.content) {
            editor.commands.setContent(currentNote.content);
        }
    }, [currentNote?.id, editor]);

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

    // DB Save Logic
    const saveToDB = async (newTitle: string, newContent: string) => {
        if (!currentNote?.id) return;

        setIsSaving(true);
        try {
            await db.notes.update(currentNote.id, {
                title: newTitle,
                content: newContent,
                updatedAt: Date.now(),
            });

            // Sync store
            const updatedNotes = notes.map(n =>
                n.id === currentNote.id
                    ? { ...n, title: newTitle, content: newContent, updatedAt: Date.now() }
                    : n
            );
            setNotes(updatedNotes);
        } catch (error) {
            console.error('Failed to save note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Debounce Save (2 seconds)
    const debouncedSave = useCallback(
        (() => {
            let timeout: any;
            return (t: string, c: string) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => saveToDB(t, c), 2000);
            };
        })(),
        [currentNote?.id]
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
                        className="w-full text-5xl font-black mb-8 bg-transparent border-none outline-none focus:ring-0 placeholder:opacity-20 transition-all hover:placeholder:opacity-30"
                    />

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs font-bold text-light-text-disabled uppercase tracking-widest mb-12 border-b border-light-border dark:border-dark-border pb-4">
                        <span>Created: {new Date(currentNote.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={isSaving ? 'text-primary animate-pulse' : ''}>
                            {isSaving ? 'Saving Changes...' : 'All Changes Saved'}
                        </span>
                    </div>

                    {/* Tiptap Editor */}
                    <div
                        className="prose prose-lg dark:prose-invert max-w-none tiptap-editor"
                        style={{
                            fontSize: `${editorFontSize}px`,
                            lineHeight: editorLineSpacing,
                        }}
                    >
                        <EditorContent editor={editor} />
                    </div>
                </div>
            </div>
        </div>
    );
};
