import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EditIcon from '@mui/icons-material/Edit';
import StorageIcon from '@mui/icons-material/Storage';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningIcon from '@mui/icons-material/Warning';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import { db, dbHelpers } from '@/lib/db';
import { saveAs } from 'file-saver';
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
    const { mainVersion, setMainVersion, verseHoverPreviews, toggleVerseHoverPreviews } = useBibleStore();
    const { updateSettings, setTheme } = settings;
    const [activeTab, setActiveTab] = useState('appearance');

    // Bible State
    const [importingState, setImportingState] = useState<{ status: string, progress: number } | null>(null);
    const [catalog, setCatalog] = useState<CatalogBibleVersion[]>([]);
    const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
    const [isFetchingCatalog, setIsFetchingCatalog] = useState(false);
    const bibleVersions = useLiveQuery(() => db.bibleVersions.toArray()) || [];
    const installedVersions = bibleVersions.filter((v: BibleVersion) => v.isDownloaded);
    const [bibleSearchQuery, setBibleSearchQuery] = useState('');

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
        const isJSON = file.name.endsWith('.json');
        const isUSFM = file.name.endsWith('.usfm') || file.name.endsWith('.sfm');

        if (!isJSON && !isUSFM) {
            alert('Unsupported file format. Please use .json or .usfm');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let data: any = e.target?.result;
                let versionId = `custom-${Date.now()}`;
                let name = file.name.split('.')[0].toUpperCase();

                if (isJSON) {
                    const json = JSON.parse(data as string);
                    versionId = json.metadata?.id?.toLowerCase() || versionId;
                    name = json.metadata?.name || name;
                } else {
                    versionId = file.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                }

                const existing = await db.bibleVersions.get(versionId);
                if (!existing) {
                    await db.bibleVersions.add({
                        id: versionId,
                        name: name,
                        abbreviation: name.slice(0, 4),
                        language: 'und',
                        copyright: 'User Provided',
                        isDownloaded: false
                    });
                }

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

                worker.postMessage({
                    type: isJSON ? 'IMPORT_JSON' : 'IMPORT_USFM',
                    data: isJSON ? JSON.parse(data as string) : data,
                    versionId
                });

            } catch (err) {
                console.error('Import failed:', err);
                alert('Import failed. Please check the file format.');
            }
        };

        if (isJSON) reader.readAsText(file);
        else reader.readAsText(file);
    };

    const handleDeleteVersion = async (id: string) => {
        if (!confirm(`Are you sure you want to delete this Bible version? This will remove all verses from your offline storage.`)) return;

        try {
            setImportingState({ status: 'Deleting...', progress: 0 });
            await db.bibleVerses.where('versionId').equals(id).delete();
            await db.bibleVersions.delete(id);

            if (mainVersion === id) {
                const remaining = await db.bibleVersions.where('isDownloaded').equals(1).first();
                setMainVersion(remaining?.id || 'kjv');
            }

            setImportingState(null);
        } catch (err) {
            console.error('Delete failed:', err);
            setImportingState(null);
        }
    };

    const handleFactoryReset = async () => {
        if (!confirm('CRITICAL: This will PERMANENTLY delete all your notes, folders, and downloaded Bible versions. This action cannot be undone. Are you absolutely sure?')) return;

        try {
            await db.delete();
            localStorage.clear();
            window.location.reload();
        } catch (err) {
            console.error('Factory reset failed:', err);
            alert('Failed to reset application data.');
        }
    };

    const handleBackup = async () => {
        try {
            const backup = await dbHelpers.exportDatabase();
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            saveAs(blob, `parchments-backup-${new Date().toISOString().split('T')[0]}.json`);
        } catch (err) {
            console.error('Backup failed:', err);
            alert('Backup failed.');
        }
    };

    const handleRestore = async (file: File) => {
        if (!confirm('Are you sure you want to restore this backup? This will overwrite your current settings and data.')) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                await dbHelpers.importDatabase(json);
                window.location.reload();
            } catch (err) {
                console.error('Restore failed:', err);
                alert('Restore failed. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

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
                        <h2 className="text-xl font-bold mb-6 px-2 text-light-text-primary dark:text-dark-text-primary">Settings</h2>
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
                            <p className="text-xs text-center text-light-text-secondary dark:text-dark-text-secondary">Parchments v1.0.0</p>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">{TABS.find(t => t.id === activeTab)?.label}</h3>
                            <button onClick={onClose} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-secondary dark:text-dark-text-secondary"><CloseIcon /></button>
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
                                                            <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">{t}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>

                                            <section className="grid grid-cols-1 max-w-sm">
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
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'bible' && (
                                        <>
                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Preferred Version</h4>
                                                <div className="max-w-md">
                                                    <select
                                                        value={mainVersion}
                                                        onChange={(e) => setMainVersion(e.target.value)}
                                                        className="w-full p-2.5 bg-light-background dark:bg-dark-background/40 border border-light-border dark:border-dark-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-light-text-primary dark:text-dark-text-primary"
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

                                                {isFetchingCatalog ? (
                                                    <div className="py-10 text-center">
                                                        <CircularProgress size={24} className="text-primary mb-2" />
                                                        <p className="text-xs text-light-text-disabled uppercase font-black tracking-widest">Checking Cloud Library...</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex gap-4">
                                                            <div className="flex-1 relative">
                                                                <select
                                                                    value={selectedCatalogId}
                                                                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                                                                    className="w-full p-3 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-light-text-primary dark:text-dark-text-primary"
                                                                >
                                                                    <option value="">Select a version to download...</option>
                                                                    {catalog.map((v: CatalogBibleVersion) => {
                                                                        const isInstalled = bibleVersions.some(lv => lv.id === v.id && lv.isDownloaded);
                                                                        return (
                                                                            <option key={v.id} value={v.id}>
                                                                                {v.name} ({v.abbreviation}) {isInstalled ? '✓ Installed' : ''}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-light-text-disabled">
                                                                    <MenuBookIcon fontSize="small" />
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => {
                                                                    const v = catalog.find(c => c.id === selectedCatalogId);
                                                                    if (v) handleDownload(v);
                                                                }}
                                                                disabled={!selectedCatalogId || importingState !== null || bibleVersions.some(lv => lv.id === selectedCatalogId && lv.isDownloaded)}
                                                                className={`px-6 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${bibleVersions.some(lv => lv.id === selectedCatalogId && lv.isDownloaded)
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 cursor-default'
                                                                    : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                {bibleVersions.some(lv => lv.id === selectedCatalogId && lv.isDownloaded) ? (
                                                                    <span className="flex items-center gap-2"><CheckCircleIcon fontSize="small" /> Installed</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-2"><DownloadIcon fontSize="small" /> Download</span>
                                                                )}
                                                            </button>
                                                        </div>

                                                        {selectedCatalogId && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="p-4 bg-light-background dark:bg-dark-background/50 border border-light-border dark:border-dark-border rounded-xl"
                                                            >
                                                                {(() => {
                                                                    const v = catalog.find(c => c.id === selectedCatalogId);
                                                                    if (!v) return null;
                                                                    return (
                                                                        <div className="flex justify-between items-center text-light-text-primary dark:text-dark-text-primary">
                                                                            <div>
                                                                                <h5 className="font-bold">{v.name}</h5>
                                                                                <p className="text-xs text-light-text-secondary mt-1">{v.copyright}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-[10px] font-black uppercase tracking-wider inline-block">
                                                                                    {v.language}
                                                                                </div>
                                                                                <p className="text-[10px] text-light-text-disabled mt-1">{v.size}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                )}
                                            </section>

                                            <section className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Manual Bible Import</h4>
                                                <div className="p-8 border-2 border-dashed border-light-border dark:border-dark-border rounded-2xl flex flex-col items-center justify-center gap-4 text-center group hover:border-primary/50 transition-all bg-light-background/20">
                                                    {importingState ? (
                                                        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                                                            <CircularProgress variant="determinate" value={importingState.progress} size={48} thickness={5} className="text-primary" />
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-bold uppercase tracking-widest text-light-text-primary dark:text-dark-text-primary">{importingState.status}</p>
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
                                                            <div className="px-4">
                                                                <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">Import Custom Bible Version</p>
                                                                <p className="text-xs text-light-text-disabled mt-1 max-w-xs mx-auto">Upload a <b>JSON</b> or <b>USFM</b> file to add it to your local library.</p>
                                                                <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-primary bg-primary/5 py-1 px-3 rounded-full border border-primary/10">
                                                                    <InfoIcon style={{ fontSize: '12px' }} />
                                                                    <span>Download free formats from <b>ebible.org</b></span>
                                                                </div>
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
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background/40 rounded-xl border border-light-border dark:border-dark-border group">
                                                    <div>
                                                        <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">Verse Hover Previews</p>
                                                        <p className="text-xs text-light-text-secondary group-hover:text-light-text-primary transition-colors">Show floating preview when hovering linked references</p>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleVerseHoverPreviews()}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${verseHoverPreviews ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${verseHoverPreviews ? 'translate-x-6' : 'translate-x-0'}`} />
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
                                                            <label className="text-xs font-medium mb-1.5 block text-light-text-primary dark:text-dark-text-primary">Font Family</label>
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
                                                                <label className="text-xs font-medium mb-1.5 block text-light-text-primary dark:text-dark-text-primary">Font Size ({settings.editorFontSize}px)</label>
                                                                <input
                                                                    type="range" min="12" max="24" step="1"
                                                                    value={settings.editorFontSize}
                                                                    onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
                                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-xs font-medium mb-1.5 block text-light-text-primary dark:text-dark-text-primary">Line Spacing ({settings.editorLineSpacing})</label>
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
                                                    <div className="text-light-text-primary dark:text-dark-text-primary">
                                                        <p className="text-sm font-bold">Auto-save Frequency</p>
                                                        <p className="text-xs text-light-text-secondary">Delay before saving changes to local database</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={settings.autoSaveFrequency}
                                                            onChange={(e) => updateSettings({ autoSaveFrequency: Number(e.target.value) })}
                                                            className="w-20 p-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg text-sm text-center text-light-text-primary dark:text-dark-text-primary"
                                                        />
                                                        <span className="text-xs text-light-text-disabled">ms</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background rounded-xl border border-light-border dark:border-dark-border">
                                                    <div className="text-light-text-primary dark:text-dark-text-primary">
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
                                                    <div className="flex items-center gap-3 mb-4 text-light-text-primary dark:text-dark-text-primary">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                                            <CloudUploadIcon />
                                                        </div>
                                                        <h4 className="font-bold text-sm">Backup Library</h4>
                                                    </div>
                                                    <p className="text-xs text-light-text-secondary mb-4">Export all notes, folders, and settings into a single file.</p>
                                                    <button
                                                        onClick={handleBackup}
                                                        className="w-full py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-background transition-colors flex items-center justify-center gap-2 text-light-text-primary dark:text-dark-text-primary"
                                                    >
                                                        <DownloadIcon fontSize="inherit" /> Export Now
                                                    </button>
                                                </div>
                                                <div className="bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border group hover:border-primary/30">
                                                    <div className="flex items-center gap-3 mb-4 text-light-text-primary dark:text-dark-text-primary">
                                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                                            <StorageIcon />
                                                        </div>
                                                        <h4 className="font-bold text-sm">Restore Data</h4>
                                                    </div>
                                                    <p className="text-xs text-light-text-secondary mb-4">Upload a previously exported .json backup file.</p>
                                                    <label className="w-full py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-background transition-colors flex items-center justify-center gap-2 cursor-pointer text-light-text-primary dark:text-dark-text-primary">
                                                        <CloudUploadIcon fontSize="inherit" /> Upload Backup
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".json"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleRestore(file);
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </section>

                                            <section className="space-y-4 pt-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Offline Manager</h4>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={bibleSearchQuery}
                                                            onChange={(e) => setBibleSearchQuery(e.target.value)}
                                                            placeholder="Search..."
                                                            className="pl-8 pr-2 py-1 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/20 text-light-text-primary dark:text-dark-text-primary"
                                                        />
                                                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-light-text-disabled" style={{ fontSize: '12px' }} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                    {(() => {
                                                        const filtered = installedVersions.filter(v =>
                                                            v.name.toLowerCase().includes(bibleSearchQuery.toLowerCase()) ||
                                                            v.abbreviation.toLowerCase().includes(bibleSearchQuery.toLowerCase())
                                                        );

                                                        if (filtered.length === 0) {
                                                            return <p className="text-xs text-light-text-disabled italic p-3">No matching bibles.</p>;
                                                        }

                                                        return filtered.map((v: BibleVersion) => (
                                                            <div key={v.id} className="flex items-center justify-between p-3 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors group">
                                                                <div className="flex items-center gap-3 text-light-text-primary dark:text-dark-text-primary">
                                                                    <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                                                                        <StorageIcon fontSize="inherit" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium">{v.name}</p>
                                                                        <p className="text-[10px] text-light-text-disabled uppercase font-bold tracking-tight">Bible • {v.abbreviation}</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteVersion(v.id)}
                                                                    className="text-xs text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        ));
                                                    })()}

                                                    <div className="flex items-center justify-between p-3 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors group opacity-50 text-light-text-primary dark:text-dark-text-primary">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                                                                <StorageIcon fontSize="inherit" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">Whisper AI (Tiny)</p>
                                                                <p className="text-[10px] text-light-text-disabled uppercase font-bold tracking-tight">System • 39.2 MB</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-light-text-disabled uppercase tracking-widest">Required</span>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 pt-6 border-t border-light-border dark:border-dark-border">
                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background rounded-xl border border-light-border dark:border-dark-border">
                                                    <div className="text-light-text-primary dark:text-dark-text-primary">
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

                                            <section className="mt-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg shrink-0">
                                                        <WarningIcon />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-red-600">Danger Zone: Factory Reset</h4>
                                                        <p className="text-xs text-red-500/80 mt-1 mb-4 leading-relaxed">
                                                            Permanently delete all data stored in this browser. This includes all your notes, transcribed audio, and downloaded Bibles. This cannot be undone.
                                                        </p>
                                                        <button
                                                            onClick={handleFactoryReset}
                                                            className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <DeleteForeverIcon fontSize="small" /> Factory Reset Application
                                                        </button>
                                                    </div>
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
