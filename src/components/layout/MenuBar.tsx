import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import { Button } from '@/components/ui/Button';
import { Plus, Mic, BookOpen, Languages } from 'lucide-react';


export const MenuBar: React.FC = () => {
    const {
        toggleBibleModal,
        toggleStrongsModal,
        toggleSettingsModal,
        toggleRightSidebar,
        toggleLeftSidebar,
        toggleSearchModal,
        toggleShortcutModal,
        openExportModal,
        showToast,
        toggleNoFolderModal,
        activeEditor,
        updateSettings,
        editorFontSize,
        toggleFocusMode
    } = useUIStore();
    const { currentNote, saveCurrentNote, createNote, createFolder, hasStudyspace, openLocalFolder } = useNoteStore();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleItemClick = (label: string) => {
        if (!activeEditor && ['Undo', 'Redo', 'Sermon Template', 'Current Date', 'Horizontal Line', 'Find in Note'].includes(label)) {
            showToast('Open a note to use this feature', 'info');
            return;
        }

        switch (label) {
            case 'New Note':
                if (!hasStudyspace) {
                    toggleNoFolderModal(true);
                } else {
                    createNote(null);
                }
                break;
            case 'New Folder':
                createFolder('New Folder', null);
                break;
            case 'Quick Save':
                if (currentNote) {
                    saveCurrentNote(currentNote.id, activeEditor?.getHTML() || currentNote.content);
                    showToast('Note saved!', 'success');
                }
                break;
            case 'Export to PDF': openExportModal('pdf'); break;
            case 'Export to Word': openExportModal('docx'); break;
            case 'Settings':
                toggleSettingsModal();
                break;
            case 'Switch Workspace Folder...':
                openLocalFolder();
                break;
            case 'Toggle Sidebar':
                toggleLeftSidebar();
                break;
            case 'Toggle Bible Panel':
                toggleRightSidebar('bible');
                break;
            case 'Focus Mode':
                toggleFocusMode();
                break;
            case 'Zoom In':
                updateSettings({ editorFontSize: Math.min(32, editorFontSize + 1) });
                break;
            case 'Zoom Out':
                updateSettings({ editorFontSize: Math.max(12, editorFontSize - 1) });
                break;
            case 'Strong\'s Lookup':
                toggleStrongsModal();
                break;
            case 'Keyboard Shortcuts':
                toggleShortcutModal();
                break;
            case 'Find in Bible':
                toggleSearchModal('bible:');
                break;
            case 'Undo':
                activeEditor?.chain().focus().undo().run();
                break;
            case 'Redo':
                activeEditor?.chain().focus().redo().run();
                break;
            case 'Find in Note':
                showToast('Use Ctrl+F to find in browser', 'info');
                break;
            case 'Current Date':
                activeEditor?.chain().focus().insertContent(new Date().toLocaleDateString()).run();
                break;
            case 'Horizontal Line':
                activeEditor?.chain().focus().setHorizontalRule().run();
                break;
            case 'Voice Dictation':
                toggleLeftSidebar('voice');
                break;
            case 'Sermon Template':
                if (activeEditor) {
                    activeEditor.chain().focus().insertContent(`
                        <h1>Sermon Title</h1>
                        <p><strong>Scripture:</strong> [Reference]</p>
                        <p><strong>Theme:</strong> [Theme]</p>
                        <hr />
                        <h2>I. Introduction</h2>
                        <p>[Introduction hook and context]</p>
                        <h2>II. Points</h2>
                        <h3>1. [Point One]</h3>
                        <p>[Scripture and Explanation]</p>
                        <h3>2. [Point Two]</h3>
                        <p>[Scripture and Explanation]</p>
                        <h2>III. Application</h2>
                        <p>[Life application points]</p>
                        <h2>IV. Conclusion</h2>
                        <p>[Summary and Closing prayer]</p>
                    `).run();
                }
                break;
            default:
                console.log(`Clicked ${label}`);
        }
        setActiveMenu(null);
    };

    const MENU_STRUCTURE = [
        {
            label: 'File',
            items: [
                { label: 'New Note', shortcut: 'Ctrl+N' },
                { label: 'New Folder', shortcut: 'Ctrl+Shift+N' },
                { label: 'Quick Save', shortcut: 'Ctrl+S' },
                { type: 'separator' },
                { label: 'Export to PDF', shortcut: 'Ctrl+E' },
                { label: 'Export to Word', shortcut: 'Ctrl+Shift+E' },
                { label: 'Print', shortcut: 'Ctrl+P' },
                { type: 'separator' },
                { label: 'Settings', shortcut: 'Ctrl+,' },
                { type: 'separator' },
                { label: 'Switch Workspace Folder...', shortcut: '' },
            ]
        },
        {
            label: 'Edit',
            items: [
                { label: 'Undo', shortcut: 'Ctrl+Z' },
                { label: 'Redo', shortcut: 'Ctrl+Y' },
                { type: 'separator' },
                { label: 'Copy as Citation', shortcut: 'Ctrl+Shift+C' },
                { label: 'Copy Scripture Text', shortcut: 'Ctrl+Alt+C' },
                { type: 'separator' },
                { label: 'Find in Note', shortcut: 'Ctrl+F' },
                { label: 'Find in Bible', shortcut: 'Ctrl+Shift+F' },
            ]
        },
        {
            label: 'View',
            items: [
                { label: 'Toggle Sidebar', shortcut: 'Ctrl+B' },
                { label: 'Toggle Bible Panel', shortcut: 'Ctrl+]' },
                { type: 'separator' },
                { label: 'Focus Mode', shortcut: 'F11' },
                { type: 'separator' },
                { label: 'Zoom In', shortcut: 'Ctrl++' },
                { label: 'Zoom Out', shortcut: 'Ctrl+-' },
                { type: 'separator' },
                { label: 'Markdown Preview', shortcut: 'Ctrl+Shift+P' },
            ]
        },
        {
            label: 'Insert',
            items: [
                { label: 'Scripture Ref', shortcut: 'Ctrl+R' },
                { label: 'Current Date', shortcut: 'Alt+Shift+D' },
                { label: 'Sermon Template', shortcut: '' },
                { type: 'separator' },
                { label: 'Footnote', shortcut: 'Ctrl+Alt+F' },
                { label: 'Horizontal Line', shortcut: 'Ctrl+Shift+-' },
            ]
        },
        {
            label: 'Tools',
            items: [
                { label: 'Strong\'s Lookup', shortcut: 'Ctrl+K' },
                { label: 'Voice Dictation', shortcut: 'Ctrl+Shift+R' },
                { type: 'separator' },
                { label: 'Word Count', shortcut: '' },
            ]
        },
        {
            label: 'Help',
            items: [
                { label: 'Keyboard Shortcuts', shortcut: 'F1' },
                { label: 'About Parchments', shortcut: '' },
            ]
        },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="h-14 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-6 shrink-0 relative z-40">
            {/* Left: Traditional Menu */}
            <div className="flex items-center gap-1" ref={menuRef}>
                {MENU_STRUCTURE.map((menu) => (
                    <div key={menu.label} className="relative">
                        <button
                            onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                            onMouseEnter={() => {
                                if (activeMenu) setActiveMenu(menu.label);
                            }}
                            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${activeMenu === menu.label
                                ? 'bg-light-sidebar dark:bg-dark-sidebar text-primary'
                                : 'text-light-text-primary dark:text-dark-text-primary hover:bg-light-background dark:hover:bg-dark-background'
                                }`}
                        >
                            {menu.label}
                        </button>

                        {/* Dropdown */}
                        {activeMenu === menu.label && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded shadow-lg py-1 z-50">
                                {menu.items.map((item, index) => (
                                    'type' in item && item.type === 'separator' ? (
                                        <div key={index} className="h-[1px] bg-light-border dark:border-dark-border my-1" />
                                    ) : (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                const label = ('label' in item && typeof item.label === 'string') ? (item.label as string) : '';
                                                handleItemClick(label);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-light-text-primary dark:text-dark-text-primary hover:bg-primary hover:text-white flex justify-between items-center group"
                                        >
                                            <span>{'label' in item ? item.label : ''}</span>
                                            <span className="text-light-text-disabled dark:text-dark-text-disabled text-xs group-hover:text-white/80">
                                                {'shortcut' in item ? item.shortcut : ''}
                                            </span>
                                        </button>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Right: Big Actions (Filled, Spacious) */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={() => {
                        if (!hasStudyspace) {
                            toggleNoFolderModal(true);
                        } else {
                            createNote(null);
                        }
                    }}
                    variant="primary"
                    icon={<Plus size={18} />}
                >
                    Note
                </Button>
                <Button
                    onClick={() => {
                        if (!hasStudyspace) {
                            toggleNoFolderModal(true);
                        } else {
                            toggleLeftSidebar('voice');
                        }
                    }}
                    variant="primary"
                    icon={<Mic size={18} />}
                >
                    Voice
                </Button>
                <Button onClick={toggleBibleModal} variant="primary" icon={<BookOpen size={18} />}>Bible</Button>
                <Button onClick={() => toggleStrongsModal()} variant="primary" icon={<Languages size={18} />}>Strong's</Button>
            </div>
        </div>
    );
};
