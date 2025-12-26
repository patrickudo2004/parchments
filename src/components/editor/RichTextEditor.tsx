import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { useNoteStore } from '@/stores/noteStore';
import { EditorToolbar } from './EditorToolbar';
import debounce from 'lodash/debounce';

export const RichTextEditor: React.FC = () => {
    const { currentNote, updateNote, setSaveStatus } = useNoteStore();

    // Debounced save function
    const debouncedSave = useCallback(
        debounce(async (content: string) => {
            if (currentNote) {
                await updateNote(currentNote.id, { content });
            }
        }, 1500),
        [currentNote, updateNote]
    );

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
            }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Placeholder.configure({
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') {
                        return 'What\'s on your mind?';
                    }
                    return 'Start writing your sermon or notes... Use Ctrl+B for bold, Ctrl+/ for bible references...';
                },
            }),
        ],
        content: currentNote?.content || '',
        onUpdate: ({ editor }) => {
            setSaveStatus('typing');
            debouncedSave(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] px-8 py-10 dark:prose-invert',
            },
        },
    }, [currentNote?.id]); // Re-initialize when note changes

    // Update editor content when currentNote changes externally
    useEffect(() => {
        if (editor && currentNote && editor.getHTML() !== currentNote.content) {
            editor.commands.setContent(currentNote.content);
        }
    }, [currentNote?.id, editor]);

    if (!currentNote) {
        return (
            <div className="flex-1 flex items-center justify-center text-light-text-disabled dark:text-dark-text-disabled italic">
                Select a note or create a new one to start writing.
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-dark-background transition-colors">
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-y-auto pt-4">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};
