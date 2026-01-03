import React from 'react';
import { Editor } from '@tiptap/react';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import TitleIcon from '@mui/icons-material/Title';
import LinkIcon from '@mui/icons-material/Link';
import HighlightingIcon from '@mui/icons-material/BorderColor';

interface EditorToolbarProps {
    editor: Editor | null;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
    if (!editor) return null;

    const Button = ({ onClick, isActive, icon: Icon, title }: any) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded transition-all ${isActive ? 'bg-primary text-white shadow-md' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                }`}
        >
            <Icon fontSize="small" />
        </button>
    );

    return (
        <div className="h-12 border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface flex items-center px-4 gap-1 shrink-0 sticky top-0 z-20 overflow-x-auto no-scrollbar">
            {/* Headers */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon={TitleIcon}
                    title="Heading 1"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon={TitleIcon}
                    style={{ scale: '0.8' }}
                    title="Heading 2"
                />
            </div>

            {/* Basic Formatting */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon={FormatBoldIcon}
                    title="Bold"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon={FormatItalicIcon}
                    title="Italic"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    icon={FormatUnderlinedIcon}
                    title="Underline"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    icon={StrikethroughSIcon}
                    title="Strikethrough"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive('highlight')}
                    icon={HighlightingIcon}
                    title="Highlight"
                />
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    icon={FormatAlignLeftIcon}
                    title="Align Left"
                />
                <Button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    icon={FormatAlignCenterIcon}
                    title="Align Center"
                />
                <Button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    isActive={editor.isActive({ textAlign: 'right' })}
                    icon={FormatAlignRightIcon}
                    title="Align Right"
                />
            </div>

            {/* Lists & Blocks */}
            <div className="flex items-center gap-0.5">
                <Button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    icon={FormatListBulletedIcon}
                    title="Bullet List"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    icon={FormatListNumberedIcon}
                    title="Numbered List"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    icon={FormatQuoteIcon}
                    title="Quote"
                />
            </div>

            <div className="ml-auto">
                <Button
                    onClick={() => { }}
                    isActive={false}
                    icon={LinkIcon}
                    title="Insert Link"
                />
            </div>
        </div>
    );
};
