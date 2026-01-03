import React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { RichTextEditor } from './RichTextEditor';
import { EmptyState } from './EmptyState';

export const EditorContainer: React.FC = () => {
    const { currentNote } = useNoteStore();

    return (
        <div className="h-full flex flex-col bg-light-background dark:bg-dark-background relative overflow-hidden">
            {currentNote ? (
                <RichTextEditor />
            ) : (
                <EmptyState />
            )}
        </div>
    );
};
