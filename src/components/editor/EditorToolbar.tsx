import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Quote,
    Link as LinkIcon,
    Image as ImageIcon,
    Highlighter,
    Sparkles,
    Undo,
    Redo,
    RotateCcw,
    Heading1,
    Heading2,
    CaseSensitive
} from 'lucide-react';
import { PromptModal } from '@/components/ui/PromptModal';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';

interface EditorToolbarProps {
    editor: Editor | null;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
    const { showToast } = useUIStore();
    const { saveLocalAsset } = useNoteStore();
    const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
    const [previousUrl, setPreviousUrl] = useState('');
    const [isCaseMenuExpanded, setIsCaseMenuExpanded] = useState(false);

    if (!editor) return null;

    const Button = ({ onClick, isActive, icon: Icon, title, disabled }: any) => (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`p-1.5 rounded transition-all flex items-center justify-center ${isActive ? 'bg-primary text-white shadow-md' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
            <Icon size={18} />
        </button>
    );

    const setLink = () => {
        const url = editor?.getAttributes('link').href;
        setPreviousUrl(url || '');
        setIsLinkPromptOpen(true);
    };

    const handleLinkConfirm = (url: string) => {
        setIsLinkPromptOpen(false);
        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update link
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const handleScan = () => {
        editor.chain().focus().scanScriptures().run();
        showToast('Scripture scan complete', 'success');
    };

    const handleImageClick = async () => {
        const _isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
        console.log('[EditorToolbar] handleImageClick, isTauri:', _isTauri);

        if (_isTauri) {
            try {
                // Use Tauri's open dialog for a native feel
                const { open } = await import('@tauri-apps/plugin-dialog');
                const selected = await open({
                    multiple: false,
                    filters: [{
                        name: 'Images',
                        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
                    }]
                });

                if (selected && !Array.isArray(selected)) {
                    const { readFile } = await import('@tauri-apps/plugin-fs');
                    const data = await readFile(selected);
                    const fileName = selected.split(/[/\\]/).pop() || 'image.png';
                    const file = new File([data], fileName, { type: `image/${fileName.split('.').pop()}` });

                    const result = await saveLocalAsset(file);
                    if (result) {
                        const { url, fileName } = result;
                        editor.chain().focus().setImage({
                            src: url,
                            // @ts-ignore - for custom attribute support in Tiptap chain
                            'data-asset-name': fileName
                        }).run();
                    }
                }
            } catch (error) {
                console.error('Failed to insert image:', error);
                showToast('Failed to insert image', 'error');
            }
        } else {
            // Browser Fallback: Use standard hidden input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    const result = await saveLocalAsset(file);
                    if (result) {
                        const { url, fileName } = result;
                        editor.chain().focus().setImage({
                            src: url,
                            // @ts-ignore
                            'data-asset-name': fileName
                        }).run();
                    } else {
                        // If no Studyspace is open, fallback to Base64 (Optional)
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                editor.chain().focus().setImage({ src: reader.result }).run();
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
            };
            input.click();
        }
    };

    return (
        <div className="h-12 border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface flex items-center px-4 gap-1 shrink-0 sticky top-0 z-20 overflow-x-auto no-scrollbar">
            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    icon={Undo}
                    title="Undo (Ctrl+Z)"
                />
                <Button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    icon={Redo}
                    title="Redo (Ctrl+Y)"
                />
            </div>

            {/* Clear Formatting */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                    icon={RotateCcw}
                    title="Clear All Formatting"
                />
            </div>

            {/* Headers */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon={Heading1}
                    title="Heading 1"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon={Heading2}
                    title="Heading 2"
                />
            </div>

            {/* Basic Formatting */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon={Bold}
                    title="Bold"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon={Italic}
                    title="Italic"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    icon={Underline}
                    title="Underline"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    icon={Strikethrough}
                    title="Strikethrough"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive('highlight')}
                    icon={Highlighter}
                    title="Highlight"
                />
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-2">
                <Button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    icon={AlignLeft}
                    title="Align Left"
                />
                <Button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    icon={AlignCenter}
                    title="Align Center"
                />
                <Button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    isActive={editor.isActive({ textAlign: 'right' })}
                    icon={AlignRight}
                    title="Align Right"
                />
            </div>

            {/* Lists & Blocks */}
            <div className="flex items-center gap-0.5">
                <Button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    icon={List}
                    title="Bullet List"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    icon={ListOrdered}
                    title="Numbered List"
                />
                <Button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    icon={Quote}
                    title="Quote"
                />
            </div>

            <div className="ml-auto flex items-center gap-2">
                {/* Text Case Menu */}
                {isCaseMenuExpanded ? (
                    <div className="flex items-center gap-1 bg-light-background dark:bg-dark-background p-1 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-right-2 duration-200">
                        <button
                            onClick={() => {
                                editor.chain().focus().uppercase().run();
                                setIsCaseMenuExpanded(false);
                            }}
                            className="px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                            UPPER
                        </button>
                        <button
                            onClick={() => {
                                editor.chain().focus().lowercase().run();
                                setIsCaseMenuExpanded(false);
                            }}
                            className="px-2 py-1 text-[10px] font-black lowercase tracking-tighter text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                            lower
                        </button>
                        <button
                            onClick={() => {
                                editor.chain().focus().capitalize().run();
                                setIsCaseMenuExpanded(false);
                            }}
                            className="px-2 py-1 text-[10px] font-black capitalize tracking-tighter text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                            Title
                        </button>
                        <div className="w-[1px] h-3 bg-primary/20 mx-1" />
                        <button
                            onClick={() => setIsCaseMenuExpanded(false)}
                            className="p-1 text-light-text-disabled hover:text-primary transition-colors"
                            title="Close"
                        >
                            <RotateCcw size={12} className="rotate-45" />
                        </button>
                    </div>
                ) : (
                    <Button
                        onClick={() => setIsCaseMenuExpanded(true)}
                        icon={CaseSensitive}
                        title="Text Case Transformations"
                    />
                )}

                <Button
                    onClick={handleScan}
                    icon={Sparkles}
                    title="Scan for Scripture References"
                />
                <Button
                    onClick={setLink}
                    isActive={editor.isActive('link')}
                    icon={LinkIcon}
                    title="Insert/Edit Link"
                />
                <Button
                    onClick={handleImageClick}
                    icon={ImageIcon}
                    title="Insert Image"
                />
            </div>

            <PromptModal
                isOpen={isLinkPromptOpen}
                title="Insert Link"
                label="URL"
                defaultValue={previousUrl}
                placeholder="https://example.com"
                onConfirm={handleLinkConfirm}
                onCancel={() => setIsLinkPromptOpen(false)}
            />
        </div>
    );
};
