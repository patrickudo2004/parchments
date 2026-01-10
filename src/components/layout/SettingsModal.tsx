import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import StorageIcon from '@mui/icons-material/Storage';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { db } from '@/lib/db';
import type { BibleVersion } from '@/types/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { bibleDownloadService, type CatalogBibleVersion } from '@/lib/bible/BibleDownloadService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TABS = [
    { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
    { id: 'bible', label: 'Bible Versions', icon: MenuBookIcon },
    { id: 'editor', label: 'Editor', icon: EditIcon },
    { id: 'storage', label: 'Data & Storage', icon: StorageIcon },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const settings = useUIStore();
    const { updateSettings, setTheme } = settings;
    const [activeTab, setActiveTab] = useState('appearance');

    // Bible State
    const [importingState, setImportingState] = useState<{ status: string, progress: number } | null>(null);
    const [catalog, setCatalog] = useState<CatalogBibleVersion[]>([]);
    const [isFetchingCatalog, setIsFetchingCatalog] = useState(false);
    const bibleVersions = useLiveQuery(() => db.bibleVersions.toArray()) || [];
    const installedVersions = bibleVersions.filter((v: BibleVersion) => v.isDownloaded);

    // Fetch catalog logic
    useEffect(() => {
        if (activeTab === 'bible' && catalog.length === 0) {
            const loadCatalog = async () => {
                setIsFetchingCatalog(true);
                try {
                    const data = await bibleDownloadService.fetchCatalog();
                    setCatalog(data);
                } catch (err) {
                    console.error('Failed to load Bible catalog:', err);
                } finally {
                    setIsFetchingCatalog(false);
                }
            };
            loadCatalog();
        }
    }, [activeTab, catalog.length]);

    const handleDownload = async (v: CatalogBibleVersion) => {
        try {
            await bibleDownloadService.downloadVersion(v, (status, progress) => {
                setImportingState({ status, progress });
            });
            setImportingState(null);
        } catch (err: any) {
            alert(`Download failed: ${err.message}`);
            setImportingState(null);
        }
    };

    const handleManualImport = async (file: File) => {
        if (!file.name.endsWith('.json')) {
            alert('Currently only JSON format is supported for manual import. USFM support coming soon!');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                // 1. Create version record if it doesn't exist
                const versionId = data.metadata?.id?.toLowerCase() || `custom-${Date.now()}`;
                const existing = await db.bibleVersions.get(versionId);

                if (!existing) {
                    await db.bibleVersions.add({
                        id: versionId,
                        name: data.metadata?.name || 'Custom Version',
                        abbreviation: data.metadata?.abbreviation || 'CUST',
                        language: data.metadata?.language || 'und',
                        copyright: data.metadata?.copyright || 'User Provided',
                        isDownloaded: false
                    });
                }

                // 2. Start worker
                const worker = new Worker(new URL('../../workers/bibleImportWorker.ts', import.meta.url), { type: 'module' });

                worker.onmessage = (event) => {
                    const { status, progress, message, error } = event.data;

                    if (status === 'complete') {
                        setImportingState(null);
                        worker.terminate();
                    } else if (status === 'error') {
                        alert(`Import failed: ${error}`);
                        setImportingState(null);
                        worker.terminate();
                    } else {
                        setImportingState({ status: message || status, progress: progress || 0 });
                    }
                };

                worker.postMessage({ type: 'IMPORT_JSON', data, versionId });

            } catch (err) {
                console.error('Failed to parse Bible JSON:', err);
                alert('Invalid JSON format. Please ensure the file matches the Parchments Bible format.');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    const accentColors = [
        { name: 'Deep Blue', value: '#1a73e8' },
        { name: 'Charcoal', value: '#3c4043' },
        { name: 'Forest Green', value: '#137333' },
        { name: 'Crimson', value: '#d93025' },
        { name: 'Purple', value: '#9334e6' },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-4xl max-h-[80vh] bg-light-surface dark:bg-dark-surface rounded-xl shadow-2xl flex overflow-hidden border border-light-border dark:border-dark-border"
                >
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-light-sidebar dark:bg-dark-sidebar border-r border-light-border dark:border-dark-border p-4 flex flex-col shrink-0">
                        <h2 className="text-xl font-bold mb-6 px-2">Settings</h2>
                        <nav className="space-y-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background'
                                        }`}
                                >
                                    <tab.icon fontSize="small" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        <div className="mt-auto pt-4 border-t border-light-border dark:border-dark-border opacity-50">
                            <p className="text-xs text-center">Parchments v1.0.0</p>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                            <h3 className="font-bold">{TABS.find(t => t.id === activeTab)?.label}</h3>
                            <button onClick={onClose} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors"><CloseIcon /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    {activeTab === 'appearance' && (
                                        <>
                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Theme</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['light', 'dark', 'system'].map((t) => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setTheme(t as any)}
                                                            className={`p-4 border rounded-xl text-center capitalize transition-all ${settings.theme === t
                                                                ? 'border-primary ring-1 ring-primary bg-primary/5'
                                                                : 'border-light-border dark:border-dark-border hover:bg-light-background dark:hover:bg-dark-background'
                                                                }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${t === 'dark' ? 'bg-gray-800' : t === 'light' ? 'bg-gray-100 border' : 'bg-gradient-to-br from-gray-100 to-gray-800'
                                                                }`}>
                                                                {settings.theme === t && <CheckCircleIcon style={{ color: t === 'dark' ? 'white' : '#1a73e8' }} fontSize="small" />}
                                                            </div>
                                                            <span className="text-sm font-medium">{t}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Accent Color</h4>
                                                <div className="flex flex-wrap gap-4">
                                                    {accentColors.map((color) => (
                                                        <button
                                                            key={color.value}
                                                            onClick={() => updateSettings({ accentColor: color.value })}
                                                            className="flex flex-col items-center gap-2 group"
                                                        >
                                                            <div
                                                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${settings.accentColor === color.value ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-dark-surface' : 'hover:scale-110'
                                                                    }`}
                                                                style={{ backgroundColor: color.value }}
                                                            >
                                                                {settings.accentColor === color.value && <CheckCircleIcon style={{ color: 'white' }} />}
                                                            </div>
                                                            <span className="text-xs">{color.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Interface Density</h4>
                                                    <div className="flex bg-light-background dark:bg-dark-background p-1 rounded-lg border border-light-border dark:border-dark-border">
                                                        {['comfortable', 'compact'].map((d) => (
                                                            <button
                                                                key={d}
                                                                onClick={() => updateSettings({ density: d as any })}
                                                                className={`flex-1 py-2 text-sm font-medium rounded capitalize transition-all ${settings.density === d ? 'bg-light-surface dark:bg-dark-surface shadow-sm text-primary' : 'text-light-text-secondary hover:text-light-text-primary'
                                                                    }`}
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Default Sidebar</h4>
                                                    <div className="flex bg-light-background dark:bg-dark-background p-1 rounded-lg border border-light-border dark:border-dark-border">
                                                        {['expanded', 'collapsed'].map((s) => (
                                                            <button
                                                                key={s}
                                                                onClick={() => updateSettings({ sidebarDefaultState: s as any })}
                                                                className={`flex-1 py-2 text-sm font-medium rounded capitalize transition-all ${settings.sidebarDefaultState === s ? 'bg-light-surface dark:bg-dark-surface shadow-sm text-primary' : 'text-light-text-secondary hover:text-light-text-primary'
                                                                    }`}
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'bible' && (
                                        <>
                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Preferred Version</h4>
                                                <div className="max-w-md">
                                                    <select
                                                        value={settings.preferredBibleVersion}
                                                        onChange={(e) => updateSettings({ preferredBibleVersion: e.target.value })}
                                                        className="w-full p-2.5 bg-light-background dark:bg-dark-background/40 border border-light-border dark:border-dark-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                                    >
                                                        {installedVersions.length > 0 ? (
                                                            installedVersions.map(v => (
                                                                <option key={v.id} value={v.id.toUpperCase()}>{v.name} ({v.abbreviation})</option>
                                                            ))
                                                        ) : (
                                                            <option disabled>No versions installed yet</option>
                                                        )}
                                                    </select>
                                                    <p className="text-[10px] text-light-text-disabled uppercase font-black mt-2 px-1">This version will be used for auto-linking and tooltips.</p>
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Official Versions Catalog</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {isFetchingCatalog ? (
                                                        <div className="col-span-full py-10 text-center">
                                                            <CircularProgress size={24} className="text-primary mb-2" />
                                                            <p className="text-xs text-light-text-disabled uppercase font-black tracking-widest">Checking Cloud Library...</p>
                                                        </div>
                                                    ) : (
                                                        catalog.map((v: CatalogBibleVersion) => {
                                                            const isInstalled = bibleVersions.find(lv => lv.id === v.id)?.isDownloaded;
                                                            return (
                                                                <div key={v.id} className="p-4 border border-light-border dark:border-dark-border rounded-xl bg-light-background dark:bg-dark-background/50 flex items-center justify-between group">
                                                                    <div>
                                                                        <p className="font-bold text-sm tracking-tight">{v.name} ({v.abbreviation})</p>
                                                                        <p className="text-[10px] text-light-text-disabled uppercase font-black">{v.language} • {v.size}</p>
                                                                    </div>
                                                                    {isInstalled ? (
                                                                        <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                                            <CheckCircleIcon fontSize="inherit" /> Installed
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                                                            disabled={importingState !== null}
                                                                            onClick={() => handleDownload(v)}
                                                                        >
                                                                            Download
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Manual Bible Import</h4>
                                                <div className="p-8 border-2 border-dashed border-light-border dark:border-dark-border rounded-2xl flex flex-col items-center justify-center gap-4 text-center group hover:border-primary/50 transition-all bg-light-background/20">
                                                    {importingState ? (
                                                        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                                                            <CircularProgress variant="determinate" value={importingState.progress} size={48} thickness={5} className="text-primary" />
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-bold uppercase tracking-widest">{importingState.status}</p>
                                                                <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${importingState.progress}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-16 h-16 bg-light-background dark:bg-dark-background rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                                <CloudUploadIcon className="text-light-text-disabled group-hover:text-primary" fontSize="large" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold">Import Custom Bible Version</p>
                                                                <p className="text-xs text-light-text-disabled mt-1 max-w-xs mx-auto">Upload a <b>JSON</b> or <b>USFM</b> file to add it to your local library. (Requires Offline-Conversion)</p>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <label className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                                                                    Choose File
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept=".json,.usfm,.sfm"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleManualImport(file);
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button className="px-6 py-2 border border-light-border dark:border-dark-border rounded-xl text-sm font-bold hover:bg-light-background">Help</button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background/40 rounded-xl border border-light-border dark:border-dark-border group">
                                                    <div>
                                                        <p className="text-sm font-bold">Verse Hover Previews</p>
                                                        <p className="text-xs text-light-text-secondary group-hover:text-light-text-primary transition-colors">Show floating preview when hovering linked references</p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ verseHoverPreviews: !settings.verseHoverPreviews })}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.verseHoverPreviews ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.verseHoverPreviews ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'editor' && (
                                        <>
                                            <section className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Typography</h4>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-medium mb-1.5 block">Font Family</label>
                                                            <div className="flex bg-light-background dark:bg-dark-background p-1 rounded-lg border border-light-border dark:border-dark-border">
                                                                {['sans', 'serif'].map((f) => (
                                                                    <button
                                                                        key={f}
                                                                        onClick={() => updateSettings({ editorFontFamily: f as any })}
                                                                        className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${settings.editorFontFamily === f ? 'bg-light-surface dark:bg-dark-surface shadow-sm text-primary' : 'text-light-text-secondary'
                                                                            }`}
                                                                    >
                                                                        {f}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex-1">
                                                                <label className="text-xs font-medium mb-1.5 block">Font Size ({settings.editorFontSize}px)</label>
                                                                <input
                                                                    type="range" min="12" max="24" step="1"
                                                                    value={settings.editorFontSize}
                                                                    onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
                                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-xs font-medium mb-1.5 block">Line Spacing ({settings.editorLineSpacing})</label>
                                                                <input
                                                                    type="range" min="1" max="2.5" step="0.1"
                                                                    value={settings.editorLineSpacing}
                                                                    onChange={(e) => updateSettings({ editorLineSpacing: Number(e.target.value) })}
                                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Writing Layout</h4>
                                                    <div className="flex bg-light-background dark:bg-dark-background p-1 rounded-lg border border-light-border dark:border-dark-border">
                                                        {['centered', 'full'].map((l) => (
                                                            <button
                                                                key={l}
                                                                onClick={() => updateSettings({ writingLayout: l as any })}
                                                                className={`flex-1 py-2 text-sm font-medium rounded capitalize transition-all ${settings.writingLayout === l ? 'bg-light-surface dark:bg-dark-surface shadow-sm text-primary' : 'text-light-text-secondary hover:text-light-text-primary'
                                                                    }`}
                                                            >
                                                                {l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold">Auto-save Frequency</p>
                                                        <p className="text-xs text-light-text-secondary">Delay before saving changes to local database</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={settings.autoSaveFrequency}
                                                            onChange={(e) => updateSettings({ autoSaveFrequency: Number(e.target.value) })}
                                                            className="w-20 p-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg text-sm text-center"
                                                        />
                                                        <span className="text-xs text-light-text-disabled">ms</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background rounded-xl border border-light-border dark:border-dark-border">
                                                    <div>
                                                        <p className="text-sm font-bold">Markdown Support</p>
                                                        <p className="text-xs text-light-text-secondary">Use ### for headers, * for lists, etc.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ markdownSupport: !settings.markdownSupport })}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.markdownSupport ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.markdownSupport ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'storage' && (
                                        <>
                                            <section className="grid grid-cols-2 gap-1.5 [&>div]:p-6 [&>div]:border [&>div]:rounded-2xl transition-all">
                                                <div className="bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border group hover:border-primary/30">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                                            <CloudUploadIcon />
                                                        </div>
                                                        <h4 className="font-bold text-sm">Backup Library</h4>
                                                    </div>
                                                    <p className="text-xs text-light-text-secondary mb-4">Export all notes, folders, and settings into a single file.</p>
                                                    <button className="w-full py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-background transition-colors flex items-center justify-center gap-2">
                                                        <DownloadIcon fontSize="inherit" /> Export Now
                                                    </button>
                                                </div>
                                                <div className="bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border group hover:border-primary/30">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                                            <StorageIcon />
                                                        </div>
                                                        <h4 className="font-bold text-sm">Restore Data</h4>
                                                    </div>
                                                    <p className="text-xs text-light-text-secondary mb-4">Upload a previously exported .parchment backup file.</p>
                                                    <button className="w-full py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-background transition-colors flex items-center justify-center gap-2">
                                                        <CloudUploadIcon fontSize="inherit" /> Upload Backup
                                                    </button>
                                                </div>
                                            </section>

                                            <section className="space-y-4 pt-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Offline Manager</h4>
                                                <div className="space-y-1">
                                                    {[
                                                        { name: 'KJV Bible Version', size: '2.4 MB', type: 'Bible' },
                                                        { name: 'Whisper AI (Tiny)', size: '39.2 MB', type: 'AI Model' }
                                                    ].map((item) => (
                                                        <div key={item.name} className="flex items-center justify-between p-3 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                                                                    <StorageIcon fontSize="inherit" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium">{item.name}</p>
                                                                    <p className="text-[10px] text-light-text-disabled uppercase font-bold tracking-tight">{item.type} • {item.size}</p>
                                                                </div>
                                                            </div>
                                                            <button className="text-xs text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Delete</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="space-y-4 pt-6 border-t border-light-border dark:border-dark-border">
                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background rounded-xl border border-light-border dark:border-dark-border">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold">Higher Accuracy Transcription</p>
                                                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">Beta</span>
                                                        </div>
                                                        <p className="text-xs text-light-text-secondary mt-1">Uses Whisper Base (~75MB) instead of Tiny (~40MB). Recommended for devices with modern GPUs.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ highAccuracyTranscription: !settings.highAccuracyTranscription })}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.highAccuracyTranscription ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.highAccuracyTranscription ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </section>
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

