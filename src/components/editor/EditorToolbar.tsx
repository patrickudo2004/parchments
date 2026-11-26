import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
    Mic,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    ListChecks,
    IndentIncrease,
    IndentDecrease,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Quote,
    Minus,
    Link as LinkIcon,
    Image as ImageIcon,
    Highlighter,
    Palette,
    Sparkles,
    Undo,
    Redo,
    RotateCcw,
    Heading1,
    Heading2,
    Heading3,
    CaseSensitive,
    Play,
    Save,
    MoreHorizontal,
    ChevronUp
} from 'lucide-react';
import { PromptModal } from '@/components/ui/PromptModal';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import { inlineDictation } from '@/lib/voice/inlineDictationService';

interface EditorToolbarProps {
    editor: Editor | null;
}

const HIGHLIGHT_SWATCHES = [
    { label: 'Gold', color: '#FEF08A' },
    { label: 'Amber', color: '#FDE68A' },
    { label: 'Mint', color: '#BBF7D0' },
    { label: 'Sky', color: '#BAE6FD' },
    { label: 'Rose', color: '#FECDD3' },
];

const TEXT_COLOR_SWATCHES = [
    { label: 'Antique Gold', color: '#B48834' },
    { label: 'Crimson', color: '#DC2626' },
    { label: 'Ocean', color: '#2563EB' },
    { label: 'Forest', color: '#15803D' },
    { label: 'Muted Slate', color: '#6B7280' },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
    const { showToast, pulpitMode, togglePulpitMode, isMobile } = useUIStore();
    const { saveLocalAsset, currentNote, saveCurrentNote } = useNoteStore();
    const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
    const [previousUrl, setPreviousUrl] = useState('');
    const [isCaseMenuExpanded, setIsCaseMenuExpanded] = useState(false);
    const [openColorMenu, setOpenColorMenu] = useState<'highlight' | 'text' | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDictating, setIsDictating] = useState(false);
    const [dictateLevel, setDictateLevel] = useState(0);

    React.useEffect(() => {
        const unsub = inlineDictation.subscribe((dictating, err) => {
            setIsDictating(dictating);
            if (err) showToast(err, 'error');
        });
        const unsubLevel = inlineDictation.subscribeAudioLevel((level) => {
            setDictateLevel(level);
        });
        return () => {
            unsub();
            unsubLevel();
        };
    }, [showToast]);

    React.useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                if (editor) {
                    inlineDictation.toggle(editor);
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [editor]);

    const handleSave = async () => {
        if (!currentNote || !editor) return;
        setIsSaving(true);
        try {
            await saveCurrentNote(currentNote.title, editor.getHTML());
            showToast('Note saved successfully', 'success');
        } catch (e) {
            console.error('[Toolbar Save] Error saving note:', e);
            showToast('Failed to save note', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!editor) return null;

    const handleIndent = () => {
        if (editor.isActive('taskItem')) {
            editor.chain().focus().sinkListItem('taskItem').run();
        } else if (editor.isActive('listItem')) {
            editor.chain().focus().sinkListItem('listItem').run();
        } else {
            editor.chain().focus().insertContent('\u00A0\u00A0\u00A0\u00A0').run();
        }
    };

    const handleOutdent = () => {
        if (editor.isActive('taskItem')) {
            editor.chain().focus().liftListItem('taskItem').run();
        } else if (editor.isActive('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
        } else {
            const { $from, empty } = editor.state.selection;
            if (empty && $from.parentOffset > 0) {
                const textBefore = $from.parent.textBetween(0, $from.parentOffset);
                const match = textBefore.match(/([\u00A0 ]{1,4})$/);
                if (match) {
                    editor.chain().focus().deleteRange({ from: $from.pos - match[1].length, to: $from.pos }).run();
                }
            }
        }
    };

    const Button = ({ onClick, isActive, icon: Icon, title, disabled, testId }: any) => (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            onMouseDown={(e) => {
                if (!isMobile) e.preventDefault();
            }}
            title={title}
            disabled={disabled}
            className={`p-1.5 rounded transition-all flex items-center justify-center min-w-[34px] min-h-[34px] sm:min-w-[36px] sm:min-h-[36px] ${
                isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
            } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
            <Icon size={17} />
        </button>
    );

    const setLink = () => {
        const url = editor?.getAttributes('link').href;
        setPreviousUrl(url || '');
        setIsLinkPromptOpen(true);
    };

    const handleLinkConfirm = (url: string) => {
        setIsLinkPromptOpen(false);
        if (url === null) return;
        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const handleScan = () => {
        editor.chain().focus().scanScriptures().run();
        showToast('Scripture scan complete', 'success');
    };

    const handleImageClick = async () => {
        const _isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

        if (_isTauri) {
            try {
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
                        const { url, fileName: savedName } = result;
                        editor.chain().focus().setImage({
                            src: url,
                            // @ts-ignore - custom attribute support in Tiptap chain
                            'data-asset-name': savedName
                        }).run();
                    } else {
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                editor.chain().focus().setImage({ src: reader.result }).run();
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
            } catch (error) {
                console.error('Failed to insert image:', error);
                showToast('Failed to insert image', 'error');
            }
        } else {
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

    const renderHighlightAndColorControls = () => (
        <div className="relative flex items-center gap-0.5 shrink-0">
            <Button
                onClick={() => setOpenColorMenu(prev => (prev === 'highlight' ? null : 'highlight'))}
                isActive={editor.isActive('highlight') || openColorMenu === 'highlight'}
                icon={Highlighter}
                title="Highlight Color"
                testId="toolbar-highlight-btn"
            />
            <Button
                onClick={() => setOpenColorMenu(prev => (prev === 'text' ? null : 'text'))}
                isActive={Boolean(editor.getAttributes('textStyle')?.color) || openColorMenu === 'text'}
                icon={Palette}
                title="Text Color"
                testId="toolbar-color-btn"
            />
        </div>
    );

    return (
        <div className={`border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface flex flex-col shrink-0 sticky top-0 z-20 transition-all duration-300 w-full max-w-full ${isMobile ? (showAdvanced ? 'h-24' : 'h-12') : 'min-h-[48px] h-auto'}`}>
            {/* Primary Row — Horizontal scroll strip with pinned Mobile Advanced Toggle */}
            <div className="w-full flex items-center">
                <div className={`flex-1 min-w-0 flex items-center px-2 sm:px-3 gap-1 ${isMobile ? 'h-12 overflow-x-auto no-scrollbar' : 'min-h-[48px] py-1 flex-wrap'}`}>
                    {/* Save button */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
                        <button
                            type="button"
                            onClick={handleSave}
                            onMouseDown={(e) => {
                                if (!isMobile) e.preventDefault();
                            }}
                            disabled={isSaving}
                            className={`p-1.5 rounded transition-all flex items-center justify-center min-w-[36px] min-h-[36px] ${isSaving ? 'text-primary animate-spin' : 'text-primary hover:bg-primary/10'}`}
                            title="Save note now (Ctrl+S)"
                        >
                            <Save size={18} />
                        </button>
                    </div>

                    {/* Pulpit Presentation Mode Button */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
                        <button
                            type="button"
                            onClick={togglePulpitMode}
                            onMouseDown={(e) => {
                                if (!isMobile) e.preventDefault();
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-black uppercase tracking-wider shrink-0 shadow-sm active:scale-95 ${pulpitMode ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                            title="Pulpit Presentation Mode"
                        >
                            <Play size={12} fill="currentColor" />
                            <span className="hidden sm:inline">Pulpit Mode</span>
                            <span className="sm:hidden">Pulpit</span>
                        </button>
                    </div>

                    {/* Inline Voice Dictation */}
                    <div className="relative flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
                        {isDictating && (
                            <div
                                className="absolute inset-0 rounded-lg bg-red-500/20 pointer-events-none transition-transform duration-75"
                                style={{
                                    transform: `scale(${1.1 + dictateLevel * 0.4})`,
                                    opacity: Math.max(0.3, dictateLevel * 0.85)
                                }}
                            />
                        )}
                        <button
                            type="button"
                            data-testid="inline-dictate-btn"
                            aria-label={isDictating ? 'Stop Voice Dictation' : 'Voice Dictate at Cursor'}
                            onClick={() => {
                                const ed = editor || useUIStore.getState().activeEditor;
                                if (ed) {
                                    inlineDictation.toggle(ed);
                                }
                            }}
                            onMouseDown={(e) => {
                                if (!isMobile) e.preventDefault();
                            }}
                            style={isDictating ? { transform: `scale(${1 + dictateLevel * 0.12})` } : undefined}
                            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-75 text-xs font-black uppercase tracking-wider shrink-0 min-h-[36px] shadow-sm active:scale-95 ${
                                isDictating
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30'
                                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background hover:text-primary'
                            }`}
                            title={isDictating ? 'Stop Voice Dictation (Ctrl+Shift+R)' : 'Voice Dictate at Cursor (Ctrl+Shift+R)'}
                        >
                            <Mic size={16} className={isDictating ? 'text-white' : ''} />
                            <span className="hidden md:inline">{isDictating ? 'Listening...' : 'Dictate'}</span>
                        </button>
                    </div>

                    {/* Undo/Redo */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
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

                    {/* Basic Formatting Group */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
                        <Button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive('bold')}
                            icon={Bold}
                            title="Bold (Ctrl+B)"
                        />
                        <Button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive('italic')}
                            icon={Italic}
                            title="Italic (Ctrl+I)"
                        />
                        <Button
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            isActive={editor.isActive('underline')}
                            icon={Underline}
                            title="Underline (Ctrl+U)"
                        />
                        {renderHighlightAndColorControls()}
                    </div>

                    {/* Lists & Outlining (Bullets, Numbering, Checklist, Indent/Outdent) */}
                    <div className="flex items-center gap-0.5 shrink-0">
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
                            onClick={() => editor.chain().focus().toggleTaskList().run()}
                            isActive={editor.isActive('taskList')}
                            icon={ListChecks}
                            title="Checklist"
                            testId="toolbar-tasklist-btn"
                        />
                        <Button
                            onClick={handleOutdent}
                            icon={IndentDecrease}
                            title="Outdent (Shift+Tab)"
                            testId="toolbar-outdent-btn"
                        />
                        <Button
                            onClick={handleIndent}
                            icon={IndentIncrease}
                            title="Indent (Tab)"
                            testId="toolbar-indent-btn"
                        />
                    </div>

                    {/* Desktop Extended Actions */}
                    {!isMobile && (
                        <>
                            <div className="w-[1px] h-4 bg-light-border dark:bg-dark-border mx-1.5 shrink-0" />

                            {/* Headings H1 / H2 / H3 */}
                            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
                                <Button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                    isActive={editor.isActive('heading', { level: 1 })}
                                    icon={Heading1}
                                    title="Heading 1"
                                    testId="toolbar-h1-btn"
                                />
                                <Button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                    isActive={editor.isActive('heading', { level: 2 })}
                                    icon={Heading2}
                                    title="Heading 2"
                                    testId="toolbar-h2-btn"
                                />
                                <Button
                                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                    isActive={editor.isActive('heading', { level: 3 })}
                                    icon={Heading3}
                                    title="Heading 3"
                                    testId="toolbar-h3-btn"
                                />
                            </div>

                            {/* Alignments */}
                            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
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

                            {/* Quote, Divider, Strike, Clear Formats */}
                            <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border mr-1 shrink-0">
                                <Button
                                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                    isActive={editor.isActive('blockquote')}
                                    icon={Quote}
                                    title="Blockquote"
                                />
                                <Button
                                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                                    icon={Minus}
                                    title="Insert Horizontal Divider"
                                    testId="toolbar-hr-btn"
                                />
                                <Button
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    isActive={editor.isActive('strike')}
                                    icon={Strikethrough}
                                    title="Strikethrough"
                                />
                                <Button
                                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                                    icon={RotateCcw}
                                    title="Clear All Formatting"
                                />
                            </div>

                            {/* Right side options */}
                            <div className="flex items-center gap-1 shrink-0">
                                {isCaseMenuExpanded ? (
                                    <div className="flex items-center gap-1 bg-light-background dark:bg-dark-background p-1 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                editor.chain().focus().uppercase().run();
                                                setIsCaseMenuExpanded(false);
                                            }}
                                            onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
                                            className="px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-primary hover:bg-primary/10 rounded transition-colors"
                                        >
                                            UPPER
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                editor.chain().focus().lowercase().run();
                                                setIsCaseMenuExpanded(false);
                                            }}
                                            onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
                                            className="px-2 py-1 text-[10px] font-black lowercase tracking-tighter text-primary hover:bg-primary/10 rounded transition-colors"
                                        >
                                            lower
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                editor.chain().focus().capitalize().run();
                                                setIsCaseMenuExpanded(false);
                                            }}
                                            onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
                                            className="px-2 py-1 text-[10px] font-black capitalize tracking-tighter text-primary hover:bg-primary/10 rounded transition-colors"
                                        >
                                            Title
                                        </button>
                                        <div className="w-[1px] h-3 bg-primary/20 mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => setIsCaseMenuExpanded(false)}
                                            onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
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
                        </>
                    )}
                </div>

                {isMobile && (
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
                        className={`p-1.5 mr-2 rounded-lg border border-light-border/70 dark:border-dark-border transition-all flex items-center justify-center shrink-0 min-w-[38px] min-h-[38px] ${
                            showAdvanced
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-light-background dark:bg-dark-background text-light-text-secondary dark:text-dark-text-secondary hover:text-primary'
                        }`}
                        title="Advanced formatting tools"
                    >
                        {showAdvanced ? <ChevronUp size={18} /> : <MoreHorizontal size={18} />}
                    </button>
                )}
            </div>

            {/* Color / Highlight Popover Bar (non-clipping on desktop & mobile) */}
            {openColorMenu && (
                <div className="px-3 py-1.5 border-t border-light-border dark:border-dark-border bg-light-background/90 dark:bg-dark-background/95 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary shrink-0">
                        {openColorMenu === 'highlight' ? 'Highlight:' : 'Text Color:'}
                    </span>
                    {(openColorMenu === 'highlight' ? HIGHLIGHT_SWATCHES : TEXT_COLOR_SWATCHES).map((swatch) => (
                        <button
                            key={swatch.color}
                            type="button"
                            onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
                            onClick={() => {
                                if (openColorMenu === 'highlight') {
                                    editor.chain().focus().toggleHighlight({ color: swatch.color }).run();
                                } else {
                                    editor.chain().focus().setColor(swatch.color).run();
                                }
                                setOpenColorMenu(null);
                            }}
                            title={swatch.label}
                            className="w-6 h-6 rounded-full border border-black/20 dark:border-white/25 hover:scale-110 transition-transform shrink-0 shadow-sm"
                            style={{ backgroundColor: swatch.color }}
                        />
                    ))}
                    <button
                        type="button"
                        onMouseDown={(e) => { if (!isMobile) e.preventDefault(); }}
                        onClick={() => {
                            if (openColorMenu === 'highlight') {
                                editor.chain().focus().unsetHighlight().run();
                            } else {
                                editor.chain().focus().unsetColor().run();
                            }
                            setOpenColorMenu(null);
                        }}
                        className="px-2 py-1 text-[10px] font-bold rounded-md border border-light-border dark:border-dark-border text-light-text-secondary hover:text-primary shrink-0"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpenColorMenu(null)}
                        className="ml-auto px-2 py-0.5 text-[10px] font-bold text-light-text-disabled hover:text-primary shrink-0"
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Mobile Secondary Expandable Row */}
            {isMobile && showAdvanced && (
                <div className="h-12 w-full flex items-center px-3 gap-1.5 border-t border-light-border dark:border-dark-border overflow-x-auto no-scrollbar animate-in slide-in-from-top-4 duration-300">
                    {/* Headings H1 / H2 / H3 */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border shrink-0">
                        <Button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            isActive={editor.isActive('heading', { level: 1 })}
                            icon={Heading1}
                            title="Heading 1"
                            testId="mobile-toolbar-h1-btn"
                        />
                        <Button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            isActive={editor.isActive('heading', { level: 2 })}
                            icon={Heading2}
                            title="Heading 2"
                            testId="mobile-toolbar-h2-btn"
                        />
                        <Button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            isActive={editor.isActive('heading', { level: 3 })}
                            icon={Heading3}
                            title="Heading 3"
                            testId="mobile-toolbar-h3-btn"
                        />
                    </div>

                    {/* Quote, Divider, Strike, Clear */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border shrink-0">
                        <Button
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            isActive={editor.isActive('blockquote')}
                            icon={Quote}
                            title="Quote"
                        />
                        <Button
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            icon={Minus}
                            title="Divider"
                        />
                        <Button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            isActive={editor.isActive('strike')}
                            icon={Strikethrough}
                            title="Strikethrough"
                        />
                        <Button
                            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                            icon={RotateCcw}
                            title="Clear All Formatting"
                        />
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-light-border dark:border-dark-border shrink-0">
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

                    {/* Media & Advanced options (duplicate Pulpit button removed) */}
                    <div className="flex items-center gap-1 shrink-0">
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
                        <Button
                            onClick={handleScan}
                            icon={Sparkles}
                            title="Scan for Scripture References"
                        />

                        {isCaseMenuExpanded ? (
                            <div className="flex items-center gap-1.5 bg-light-background dark:bg-dark-background p-1 rounded-lg border border-primary/20 animate-in fade-in duration-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().uppercase().run();
                                        setIsCaseMenuExpanded(false);
                                    }}
                                    className="px-2.5 py-1 text-xs font-black uppercase text-primary hover:bg-primary/10 rounded-md min-h-[32px] flex items-center justify-center"
                                >
                                    UP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().lowercase().run();
                                        setIsCaseMenuExpanded(false);
                                    }}
                                    className="px-2.5 py-1 text-xs font-black lowercase text-primary hover:bg-primary/10 rounded-md min-h-[32px] flex items-center justify-center"
                                >
                                    low
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().capitalize().run();
                                        setIsCaseMenuExpanded(false);
                                    }}
                                    className="px-2.5 py-1 text-xs font-black capitalize text-primary hover:bg-primary/10 rounded-md min-h-[32px] flex items-center justify-center"
                                >
                                    Title
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCaseMenuExpanded(false)}
                                    className="p-1.5 text-light-text-disabled hover:text-primary min-w-[32px] min-h-[32px] flex items-center justify-center"
                                >
                                    <RotateCcw size={12} className="rotate-45" />
                                </button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => setIsCaseMenuExpanded(true)}
                                icon={CaseSensitive}
                                title="Text Case"
                            />
                        )}
                    </div>
                </div>
            )}

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
