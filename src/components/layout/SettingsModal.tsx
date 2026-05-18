import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useBibleStore } from '@/stores/bibleStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Palette,
    BookOpen,
    Edit3,
    Database,
    Upload,
    Download,
    CheckCircle2,
    Trash2,
    AlertTriangle,
    Search,
    Shield,
    Zap,
    Cloud,
    Lock,
    Share2,
    Key,
    Smartphone,
    Brain,
    Cpu,
    Info,
    Copy,
    Check
} from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';
import { db, dbHelpers } from '@/lib/db';
import { saveAs } from 'file-saver';
import { AlertModal } from '@/components/ui/AlertModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { BibleVersion } from '@/types/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { bibleDownloadService, type CatalogBibleVersion } from '@/lib/bible/BibleDownloadService';
import { useAIStore } from '@/stores/aiStore';
import { useSyncStore } from '@/stores/syncStore';
import { APP_VERSION } from '@/lib/version';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TABS = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'bible', label: 'Bible Versions', icon: BookOpen },
    { id: 'editor', label: 'Editor', icon: Edit3 },
    { id: 'intelligence', label: 'Intelligence', icon: Brain },
    { id: 'sync', label: 'Sync & Collaboration', icon: Cloud },
    { id: 'storage', label: 'Data & Storage', icon: Database },
    { id: 'support', label: 'Support & About', icon: Info },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const settings = useUIStore();
    const { mainVersion, setMainVersion, verseHoverPreviews, toggleVerseHoverPreviews } = useBibleStore();
    const {
        isAIFeaturesEnabled,
        toggleAIFeatures,
        indexBible,
        isBibleIndexing,
        bibleIndexingProgress,
        downloadGenerativeModel,
        isGenerativeModelDownloaded,
        isGenerativeModelLoading,
        downloadProgress,
        statusMessage
    } = useAIStore();
    const {
        identity,
        isInitialized: isSyncInitialized,
        syncStatus,
        initializeIdentity,
        clearIdentity
    } = useSyncStore();
    const { updateSettings, setTheme } = settings;
    const [activeTab, setActiveTab] = useState('appearance');

    const indexedVersions = useLiveQuery(() => db.bibleVectors.toArray()) || [];
    const indexedSet = new Set(indexedVersions.map(v => v.versionId));

    // Bible State
    const [importingState, setImportingState] = useState<{ status: string, progress: number } | null>(null);
    const [catalog, setCatalog] = useState<CatalogBibleVersion[]>([]);
    const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
    const [isFetchingCatalog, setIsFetchingCatalog] = useState(false);
    const bibleVersions = useLiveQuery(() => db.bibleVersions.toArray()) || [];
    const installedVersions = bibleVersions.filter((v: BibleVersion) => v.isDownloaded);
        const [bibleSearchQuery, setBibleSearchQuery] = useState('');

    // Feedback State
    const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'question' | 'praise'>('bug');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
    const [showDiagnosticPreview, setShowDiagnosticPreview] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [diagnosticData, setDiagnosticData] = useState<any>(null);

    // Gather diagnostics dynamically when Support tab is loaded
    useEffect(() => {
        if (activeTab === 'support') {
            const getStats = async () => {
                try {
                    const noteCount = await db.notes.count();
                    const folderCount = await db.folders.count();
                    const bibleCount = installedVersions.length;
                    const bibleList = installedVersions.map(v => v.abbreviation).join(', ') || 'None';
                    
                    let storageUsed = 'Unknown';
                    if (navigator.storage && navigator.storage.estimate) {
                        const estimate = await navigator.storage.estimate();
                        if (estimate.usage !== undefined) {
                            storageUsed = `${(estimate.usage / (1024 * 1024)).toFixed(2)} MB`;
                        }
                    }

                    const isTauri = !!(window as any).__TAURI__;
                    const platformName = isTauri 
                        ? 'Tauri Desktop App' 
                        : `Web Browser (${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown Browser'} / ${navigator.platform})`;

                    setDiagnosticData({
                        appVersion: APP_VERSION,
                        platform: platformName,
                        database: {
                            notes: noteCount,
                            folders: folderCount,
                            installedBibles: `${bibleCount} (${bibleList})`
                        },
                        storage: {
                            estimatedUsage: storageUsed
                        },
                        settings: {
                            theme: settings.theme,
                            density: settings.density,
                            preferredBible: mainVersion,
                            aiFeaturesEnabled: isAIFeaturesEnabled,
                            isGenerativeModelDownloaded,
                            highAccuracyTranscription: settings.highAccuracyTranscription
                        }
                    });
                } catch (error) {
                    console.error('Failed to gather diagnostics:', error);
                }
            };
            getStats();
        }
    }, [activeTab, installedVersions.length, mainVersion, isAIFeaturesEnabled, isGenerativeModelDownloaded, settings.theme, settings.density, settings.highAccuracyTranscription]);

    const handleSendEmail = () => {
        if (!feedbackMessage.trim()) {
            settings.showToast('Please type a message first.', 'info');
            return;
        }

        const email = 'patrickudo2004@gmail.com';
        const subject = `Parchments Feedback [${feedbackType.toUpperCase()}]`;
        
        let body = `### User Message\n\n${feedbackMessage}\n\n`;
        
        if (includeDiagnostics && diagnosticData) {
            body += `### Diagnostic Information\n\n`;
            body += `*   **App Version:** ${diagnosticData.appVersion}\n`;
            body += `*   **Platform:** ${diagnosticData.platform}\n`;
            body += `*   **Preferred Bible:** ${diagnosticData.settings.preferredBible}\n`;
            body += `*   **UI Settings:** Theme: ${diagnosticData.settings.theme}, Density: ${diagnosticData.settings.density}\n`;
            body += `*   **Database Stats:** Notes: ${diagnosticData.database.notes}, Folders: ${diagnosticData.database.folders}\n`;
            body += `*   **Installed Bibles:** ${diagnosticData.database.installedBibles}\n`;
            body += `*   **Storage Estimated:** ${diagnosticData.storage.estimatedUsage}\n`;
            body += `*   **Local AI Status:** AI Enabled: ${diagnosticData.settings.aiFeaturesEnabled ? 'Yes' : 'No'}, Model Downloaded: ${diagnosticData.settings.isGenerativeModelDownloaded ? 'Yes' : 'No'}, High Accuracy: ${diagnosticData.settings.highAccuracyTranscription ? 'Yes' : 'No'}\n`;
        }
        
        body += `\n*Submitted via Parchments Diagnostic Feedback Center*`;

        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
        
        settings.showToast('Opening your default mail client...', 'success');
    };

    const handleCopyReport = async () => {
        if (!feedbackMessage.trim()) {
            settings.showToast('Please type a message first.', 'info');
            return;
        }

        let report = `# Parchments Feedback Report [${feedbackType.toUpperCase()}]\n\n`;
        report += `## User Message\n${feedbackMessage}\n\n`;
        
        if (includeDiagnostics && diagnosticData) {
            report += `## Diagnostic Details\n`;
            report += `\`\`\`json\n${JSON.stringify(diagnosticData, null, 2)}\n\`\`\`\n`;
        }
        
        report += `\n*Copied from Parchments Feedback Center*`;

        try {
            setIsCopying(true);
            await navigator.clipboard.writeText(report);
            settings.showToast('Diagnostic report copied to clipboard!', 'success');
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error('Failed to copy report:', err);
            settings.showToast('Failed to copy report to clipboard.', 'error');
            setIsCopying(false);
        }
    };

    // Modal State
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type: 'info' | 'error' | 'success' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, isDanger: boolean }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDanger: false
    });

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
            setAlertConfig({
                isOpen: true,
                title: 'Download Failed',
                message: `Download failed: ${err.message}`,
                type: 'error'
            });
            setImportingState(null);
        }
    };

    const handleManualImport = async (file: File) => {
        const isJSON = file.name.endsWith('.json');
        const isUSFM = file.name.endsWith('.usfm') || file.name.endsWith('.sfm');

        if (!isJSON && !isUSFM) {
            setAlertConfig({
                isOpen: true,
                title: 'Format Error',
                message: 'Unsupported file format. Please use .json or .usfm',
                type: 'error'
            });
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
                        setAlertConfig({
                            isOpen: true,
                            title: 'Import Failed',
                            message: `Import failed: ${error}`,
                            type: 'error'
                        });
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
                setAlertConfig({
                    isOpen: true,
                    title: 'Import Failed',
                    message: 'Import failed. Please check the file format.',
                    type: 'error'
                });
            }
        };

        if (isJSON) reader.readAsText(file);
        else reader.readAsText(file);
    };

    const handleDeleteVersion = async (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Bible Version',
            message: 'Are you sure you want to delete this Bible version? This will remove all verses from your offline storage.',
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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
            }
        });
    };

    const handleFactoryReset = async () => {
        setConfirmConfig({
            isOpen: true,
            title: 'Factory Reset',
            message: 'CRITICAL: This will PERMANENTLY delete all your notes, folders, and downloaded Bible versions. This action cannot be undone. Are you absolutely sure?',
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    await db.delete();
                    localStorage.clear();
                    window.location.reload();
                } catch (err) {
                    console.error('Factory reset failed:', err);
                    setAlertConfig({
                        isOpen: true,
                        title: 'Reset Failed',
                        message: 'Failed to reset application data.',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleBackup = async () => {
        try {
            const backup = await dbHelpers.exportDatabase();
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            saveAs(blob, `parchments-backup-${new Date().toISOString().split('T')[0]}.json`);
        } catch (err) {
            console.error('Backup failed:', err);
            setAlertConfig({
                isOpen: true,
                title: 'Backup Failed',
                message: 'Backup failed.',
                type: 'error'
            });
        }
    };

    const handleRestore = async (file: File) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Restore Backup',
            message: 'Are you sure you want to restore this backup? This will overwrite your current settings and data.',
            isDanger: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const json = JSON.parse(e.target?.result as string);
                        await dbHelpers.importDatabase(json);
                        window.location.reload();
                    } catch (err) {
                        console.error('Restore failed:', err);
                        setAlertConfig({
                            isOpen: true,
                            title: 'Restore Failed',
                            message: 'Restore failed. Invalid file format.',
                            type: 'error'
                        });
                    }
                };
                reader.readAsText(file);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div key="settings-backdrop" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
                <motion.div
                    key="settings-content"
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
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        <div className="mt-auto pt-4 border-t border-light-border dark:border-dark-border opacity-50">
                            <p className="text-xs text-center text-light-text-secondary dark:text-dark-text-secondary">Parchments v{APP_VERSION}</p>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">{TABS.find(t => t.id === activeTab)?.label}</h3>
                            <button onClick={onClose} className="p-1 hover:bg-light-background dark:hover:bg-dark-background rounded-full transition-colors text-light-text-secondary dark:text-dark-text-secondary"><X size={20} /></button>
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
                                                                {settings.theme === t && <CheckCircle2 size={16} style={{ color: t === 'dark' ? 'white' : '#1a73e8' }} />}
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
                                                            installedVersions.map((v, idx) => (
                                                                <option key={v.id || `inst-${idx}`} value={v.id.toUpperCase()}>{v.name} ({v.abbreviation})</option>
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
                                                                    {catalog.map((v: CatalogBibleVersion, idx) => {
                                                                        const isInstalled = bibleVersions.some(lv => lv.id === v.id && lv.isDownloaded);
                                                                        return (
                                                                            <option key={v.id || `cat-${idx}`} value={v.id}>
                                                                                {v.name} ({v.abbreviation}) {isInstalled ? '✓ Installed' : ''}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                                <BookOpen size={18} />
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
                                                                    <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Installed</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-2"><Download size={16} /> Download</span>
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
                                                                <Upload size={32} />
                                                            </div>
                                                            <div className="px-4">
                                                                <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">Import Custom Bible Version</p>
                                                                <p className="text-xs text-light-text-disabled mt-1 max-w-xs mx-auto">Upload a <b>JSON</b> or <b>USFM</b> file to add it to your local library.</p>
                                                                <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-primary bg-primary/5 py-1 px-3 rounded-full border border-primary/10">
                                                                    <Info size={12} />
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
                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background rounded-xl border border-light-border dark:border-dark-border group">
                                                    <div className="text-light-text-primary dark:text-dark-text-primary">
                                                        <p className="text-sm font-bold">Enable Auto-Save</p>                                                        <p className="text-xs text-light-text-secondary">Automatically save changes as you type</p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ enableAutoSave: !settings.enableAutoSave })}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.enableAutoSave ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.enableAutoSave ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

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
                                                            disabled={!settings.enableAutoSave}
                                                            className="w-20 p-2 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-lg text-sm text-center text-light-text-primary dark:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

                                    {activeTab === 'intelligence' && (
                                        <>
                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background/40 rounded-xl border border-light-border dark:border-dark-border group">
                                                    <div>
                                                        <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                                                            Enable Deep Intelligence
                                                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">Local-First</span>
                                                        </p>
                                                        <p className="text-xs text-light-text-secondary group-hover:text-light-text-primary transition-colors">Activate conversational research and advanced theological analysis.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleAIFeatures(!isAIFeaturesEnabled)}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${isAIFeaturesEnabled ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${isAIFeaturesEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </section>

                                            <section className="space-y-6">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">AI Asset Manager</h4>

                                                <div className="p-6 bg-light-background dark:bg-dark-background/20 border border-light-border dark:border-dark-border rounded-2xl space-y-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                                            <Cpu size={24} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h5 className="font-bold text-light-text-primary dark:text-dark-text-primary">Advanced Logic Engine (Qwen 2.5)</h5>
                                                                <span className="text-[10px] font-black text-light-text-disabled uppercase tracking-widest">~500 MB</span>
                                                            </div>
                                                            <p className="text-xs text-light-text-secondary leading-relaxed">
                                                                Downloading this engine enables offline chat, sermon outlining, and topic summarization. It runs entirely on your hardware.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {isGenerativeModelLoading ? (
                                                        <div className="space-y-3 pt-2">
                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-primary">
                                                                <span>{statusMessage}</span>
                                                                <span>{Math.round(downloadProgress * 100)}%</span>
                                                            </div>
                                                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full bg-primary"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${downloadProgress * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : isGenerativeModelDownloaded ? (
                                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-200 dark:border-green-900/30">
                                                            <CheckCircle2 size={16} />
                                                            <span className="text-xs font-bold">Engine ready and stored locally.</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={downloadGenerativeModel}
                                                            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Download size={16} /> Download Engine
                                                        </button>
                                                    )}

                                                    <div className="pt-2 border-t border-light-border dark:border-dark-border mt-4">
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Are you sure you want to delete all local AI models? This will free up space but require a re-download if you want to use AI again.')) {
                                                                    const { clearModelCache } = useAIStore.getState();
                                                                    await clearModelCache();
                                                                }
                                                            }}
                                                            className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-2"
                                                        >
                                                            <Trash2 size={12} /> Purge Local AI Cache
                                                        </button>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 pt-4">
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl flex gap-3">
                                                    <Shield size={20} className="text-blue-600 shrink-0" />
                                                    <div>
                                                        <h5 className="text-xs font-bold text-blue-800 dark:text-blue-400">Your Study stays Yours</h5>
                                                        <p className="text-[11px] text-blue-700/80 dark:text-blue-400/70 mt-0.5 leading-relaxed">
                                                            Parchments uses <b>Local Intelligence</b>. Unlike other apps, your notes are never uploaded to a cloud for processing. All "thinking" happens inside this browser window.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl flex gap-3">
                                                    <Info size={20} className="text-amber-600 shrink-0" />
                                                    <div>
                                                        <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400">Performance Notice</h5>
                                                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 mt-0.5 leading-relaxed">
                                                            Generative AI requires a modern computer with enough RAM (8GB+ recommended). If your device feels sluggish, you can disable these features at any time.
                                                        </p>
                                                    </div>
                                                </div>
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'support' && (
                                        <>
                                            <section className="space-y-6">
                                                {/* Header Banner */}
                                                <div className="flex items-start gap-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl">
                                                    <div className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 shrink-0">
                                                        <Info size={22} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-md font-bold text-light-text-primary dark:text-dark-text-primary">Diagnostic Feedback Center</h4>
                                                        <p className="text-xs text-light-text-secondary mt-1 leading-relaxed">
                                                            Your feedback shapes Parchments. Use this secure, local-first console to submit bug reports, share suggestions, or copy complete system diagnostics for troubleshooting.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Category Pills */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                                                        Select Feedback Type
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'bug', label: 'Bug Report', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10 border-red-500/30 ring-red-500/20' },
                                                            { id: 'suggestion', label: 'Feature Idea', icon: Cpu, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30 ring-amber-500/20' },
                                                            { id: 'question', label: 'Question', icon: Search, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30 ring-blue-500/20' },
                                                            { id: 'praise', label: 'Praise', icon: Zap, color: 'text-rose-500 bg-rose-500/10 border-rose-500/30 ring-rose-500/20' }
                                                        ].map((cat) => {
                                                            const Icon = cat.icon;
                                                            const isSelected = feedbackType === cat.id;
                                                            return (
                                                                <button
                                                                    key={cat.id}
                                                                    onClick={() => setFeedbackType(cat.id as any)}
                                                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                                                                        isSelected
                                                                            ? `${cat.color} border-current ring-2`
                                                                            : 'border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background hover:text-light-text-primary dark:hover:text-dark-text-primary'
                                                                    }`}
                                                                >
                                                                    <Icon size={14} />
                                                                    <span>{cat.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Textarea Message */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                                                        Your Message
                                                    </label>
                                                    <textarea
                                                        value={feedbackMessage}
                                                        onChange={(e) => setFeedbackMessage(e.target.value)}
                                                        rows={4}
                                                        placeholder={
                                                            feedbackType === 'bug'
                                                                ? 'What went wrong? Please share step-by-step how to trigger the issue...'
                                                                : feedbackType === 'suggestion'
                                                                ? 'What awesome feature or improvement are you dreaming of? Let us know...'
                                                                : feedbackType === 'question'
                                                                ? 'What are you stuck on or curious about? We are happy to help...'
                                                                : 'We love hearing from you! What has been your favorite part of Parchments?'
                                                        }
                                                        className="w-full p-4 bg-light-background dark:bg-dark-background/40 border border-light-border dark:border-dark-border rounded-2xl text-sm placeholder-light-text-disabled dark:placeholder-dark-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-light-text-primary dark:text-dark-text-primary resize-y min-h-[100px] transition-all"
                                                    />
                                                </div>

                                                {/* Toggle & Collapsible Drawer */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-4 bg-light-background dark:bg-dark-background/20 border border-light-border dark:border-dark-border rounded-2xl">
                                                        <div className="flex items-start gap-2.5">
                                                            <Shield size={18} className="text-primary mt-0.5 shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">Attach Local Diagnostics</p>
                                                                <p className="text-[10px] text-light-text-secondary mt-0.5 leading-relaxed">
                                                                    Includes anonymized app version, OS platform, and database sizes to help debug the issue.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setIncludeDiagnostics(!includeDiagnostics)}
                                                            className={`w-10 h-6 rounded-full p-0.5 transition-all flex items-center shrink-0 cursor-pointer ${
                                                                includeDiagnostics ? 'bg-primary shadow-sm shadow-primary/20' : 'bg-gray-300 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all ${includeDiagnostics ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>

                                                    {includeDiagnostics && diagnosticData && (
                                                        <div className="border border-light-border dark:border-dark-border rounded-2xl overflow-hidden bg-light-background/5 dark:bg-dark-background/5">
                                                            <button
                                                                onClick={() => setShowDiagnosticPreview(!showDiagnosticPreview)}
                                                                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background/20 dark:hover:bg-dark-background/20 transition-colors cursor-pointer"
                                                            >
                                                                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[9px] font-black">
                                                                    <Database size={12} /> Preview Diagnostic Details
                                                                </span>
                                                                <span className="text-[9px] uppercase font-black text-primary">
                                                                    {showDiagnosticPreview ? 'Hide Details ▲' : 'Show Details ▼'}
                                                                </span>
                                                            </button>
                                                            {showDiagnosticPreview && (
                                                                <div className="border-t border-light-border dark:border-dark-border p-4 text-[10px] font-mono leading-relaxed bg-light-background dark:bg-black/25 text-light-text-secondary dark:text-dark-text-secondary overflow-x-auto max-h-[160px] custom-scrollbar">
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 min-w-[300px]">
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">App Version</span> {diagnosticData.appVersion}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Platform</span> {diagnosticData.platform}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Active Theme</span> {diagnosticData.settings.theme}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Preferred Bible</span> {diagnosticData.settings.preferredBible}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Database Notes</span> {diagnosticData.database.notes}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Database Folders</span> {diagnosticData.database.folders}</div>
                                                                        <div className="col-span-2"><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Installed Bibles</span> {diagnosticData.database.installedBibles}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">Storage Used</span> {diagnosticData.storage.estimatedUsage}</div>
                                                                        <div><span className="text-light-text-disabled uppercase font-bold text-[8px] block tracking-wide">AI Features Active</span> {diagnosticData.settings.aiFeaturesEnabled ? 'Yes' : 'No'}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Submit Buttons */}
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={handleSendEmail}
                                                        className="flex-1 py-3 px-4 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        <Edit3 size={14} /> Send Email
                                                    </button>
                                                    <button
                                                        onClick={handleCopyReport}
                                                        className="py-3 px-4 bg-light-background dark:bg-dark-background/60 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary text-xs font-bold rounded-xl hover:bg-light-surface dark:hover:bg-dark-surface active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        {isCopying ? (
                                                            <>
                                                                <Check size={14} className="text-green-500" />
                                                                <span className="text-green-500">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={14} />
                                                                <span>Copy Markdown Report</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Links footer */}
                                                <div className="space-y-3 pt-5 border-t border-light-border dark:border-dark-border">
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Project Links</h4>
                                                    <div className="flex gap-3">
                                                        <a
                                                            href="https://github.com/patrickudo2004/parchments/releases"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-light-background dark:bg-dark-background/50 border border-light-border dark:border-dark-border rounded-xl text-xs font-bold text-light-text-primary dark:text-dark-text-primary hover:bg-light-surface dark:hover:bg-dark-surface transition-all flex items-center gap-2"
                                                        >
                                                            <Zap size={12} /> Release Notes
                                                        </a>
                                                        <a
                                                            href="https://github.com/patrickudo2004/parchments"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-light-background dark:bg-dark-background/50 border border-light-border dark:border-dark-border rounded-xl text-xs font-bold text-light-text-primary dark:text-dark-text-primary hover:bg-light-surface dark:hover:bg-dark-surface transition-all flex items-center gap-2"
                                                        >
                                                            <Share2 size={12} /> Source Code
                                                        </a>
                                                    </div>
                                                </div>
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'sync' && (
                                        <>
                                            <section className="space-y-6">
                                                {!isSyncInitialized ? (
                                                    <div className="p-8 border-2 border-dashed border-light-border dark:border-dark-border rounded-2xl flex flex-col items-center text-center gap-6 bg-primary/5">
                                                        <div className="w-16 h-16 bg-white dark:bg-dark-surface rounded-2xl flex items-center justify-center shadow-lg text-primary">
                                                            <Cloud size={32} />
                                                        </div>
                                                        <div className="max-w-md">
                                                            <h4 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Enable Sync & Collaboration</h4>
                                                            <p className="text-sm text-light-text-secondary mt-2">
                                                                Access your Studyspace across devices and work with others in real-time. Parchments uses <b>End-to-End Encryption</b> to keep your data private.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={initializeIdentity}
                                                            className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <Lock size={18} /> Generate Secure Vault
                                                        </button>
                                                        <p className="text-[10px] text-light-text-disabled uppercase font-black">
                                                            No email required. Your identity is unique to you.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-8">
                                                        {/* Vault Header */}
                                                        <div className="flex items-center gap-4 p-4 bg-light-background dark:bg-dark-background/40 rounded-xl border border-light-border dark:border-dark-border">
                                                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                                                <Shield size={24} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary">Vault Active & Secure</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className={`w-2 h-2 rounded-full animate-pulse ${syncStatus === 'offline' ? 'bg-gray-400' : 'bg-green-500'}`} />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary">
                                                                        {syncStatus.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={clearIdentity}
                                                                className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/5 transition-all"
                                                            >
                                                                Deactivate Vault
                                                            </button>
                                                        </div>

                                                        {/* Public Identity */}
                                                        <section className="space-y-4">
                                                            <h4 className="text-sm font-bold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">Your Public Handle</h4>
                                                            <div className="p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-xl flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                                                                        {identity?.publicKey.slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="max-w-[200px] sm:max-w-xs">
                                                                        <p className="text-xs font-bold break-all text-light-text-primary dark:text-dark-text-primary">{identity?.publicKey}</p>
                                                                        <p className="text-[10px] text-light-text-disabled uppercase font-black">Share this key to be invited to Study Rooms</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-primary"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(identity?.publicKey || '');
                                                                        settings.showToast('Public key copied', 'success');
                                                                    }}
                                                                >
                                                                    <Share2 size={18} />
                                                                </button>
                                                            </div>
                                                        </section>

                                                        {/* Device Pairing */}
                                                        <section className="grid grid-cols-2 gap-4">
                                                            <div className="p-6 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-2xl space-y-3">
                                                                <Smartphone size={24} className="text-primary" />
                                                                <h5 className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary">Add Device</h5>
                                                                <p className="text-xs text-light-text-secondary leading-relaxed">Pair your tablet or mobile phone to sync your notes.</p>
                                                                <button
                                                                    onClick={() => settings.showToast('Device pairing coming soon in next update', 'info')}
                                                                    className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-md hover:bg-primary-hover transition-all"
                                                                >
                                                                    Generate Pairing Code
                                                                </button>
                                                            </div>
                                                            <div className="p-6 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-2xl space-y-3">
                                                                <Key size={24} className="text-primary" />
                                                                <h5 className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary">Recovery Phrase</h5>
                                                                <p className="text-xs text-light-text-secondary leading-relaxed">Your "Master Key" to restore your vault on new devices.</p>
                                                                <button
                                                                    onClick={() => {
                                                                        setAlertConfig({
                                                                            isOpen: true,
                                                                            title: 'Your Recovery Phrase',
                                                                            message: identity?.mnemonic || 'No mnemonic available.',
                                                                            type: 'info'
                                                                        });
                                                                    }}
                                                                    className="w-full py-2 border border-light-border dark:border-dark-border rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-light-text-primary dark:text-dark-text-primary"
                                                                >
                                                                    View Safe Phrase
                                                                </button>
                                                            </div>
                                                        </section>

                                                        {/* Privacy Alert */}
                                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl flex gap-3">
                                                            <Lock size={18} className="text-amber-600 shrink-0" />
                                                            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                                                                <b>Warning:</b> Parchments cannot reset your Vault Key. If you lose your Recovery Phrase AND all paired devices, your synced data will be permanently inaccessible.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        </>
                                    )}

                                    {activeTab === 'storage' && (
                                        <>
                                            <section className="grid grid-cols-2 gap-1.5 [&>div]:p-6 [&>div]:border [&>div]:rounded-2xl transition-all">
                                                <div className="bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border group hover:border-primary/30">
                                                    <div className="flex items-center gap-3 mb-4 text-light-text-primary dark:text-dark-text-primary">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                                            <Upload size={20} />
                                                        </div>
                                                        <h4 className="font-bold text-sm">Backup Library</h4>
                                                    </div>
                                                    <p className="text-xs text-light-text-secondary mb-4">Export all notes, folders, and settings into a single file.</p>
                                                    <button
                                                        onClick={handleBackup}
                                                        className="w-full py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-background transition-colors flex items-center justify-center gap-2 text-light-text-primary dark:text-dark-text-primary"
                                                    >
                                                        <Download size={16} /> Export Now
                                                    </button>
                                                </div>
                                                <div className="bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border group hover:border-primary/30">
                                                    <div className="flex items-center gap-3 mb-4 text-light-text-primary dark:text-dark-text-primary">
                                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                                            <Database size={20} />
                                                        </div>
                                                        <h4 className="font-bold text-sm">Restore Data</h4>
                                                    </div>
                                                    <p className="text-xs text-light-text-secondary mb-4">Upload a previously exported .json backup file.</p>
                                                    <label className="w-full py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-background transition-colors flex items-center justify-center gap-2 cursor-pointer text-light-text-primary dark:text-dark-text-primary">
                                                        <Upload size={16} /> Upload Backup
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
                                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-light-text-disabled" />
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

                                                        return filtered.map((v: BibleVersion, idx) => {
                                                            const isIndexed = indexedSet.has(v.id);
                                                            return (
                                                                <div key={v.id || `off-${idx}`} className="flex items-center justify-between p-3 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors group">
                                                                    <div className="flex items-center gap-3 text-light-text-primary dark:text-dark-text-primary">
                                                                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                                                                            <Database size={14} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium">{v.name}</p>
                                                                            <p className="text-[10px] text-light-text-disabled uppercase font-bold tracking-tight">Bible • {v.abbreviation}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {isBibleIndexing && !isIndexed ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <CircularProgress size={12} variant="determinate" value={bibleIndexingProgress * 100} />
                                                                                <span className="text-[10px] font-bold text-primary animate-pulse">Indexing...</span>
                                                                            </div>
                                                                        ) : isIndexed ? (
                                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
                                                                                <Zap size={10} />
                                                                                <span className="text-[9px] font-bold uppercase">Semantic Ready</span>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => indexBible(v.id)}
                                                                                className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                                                                            >
                                                                                Index for AI Search
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDeleteVersion(v.id)}
                                                                            className="text-xs text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}

                                                    <div key="off-whisper-tiny" className="flex items-center justify-between p-3 hover:bg-light-background dark:hover:bg-dark-background rounded-lg transition-colors group opacity-50 text-light-text-primary dark:text-dark-text-primary">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded">
                                                                <Database size={14} />
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
                                                        <AlertTriangle size={20} />
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
                                                            <Trash2 size={16} /> Factory Reset Application
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

            <AlertModal
                key="settings-alert-modal"
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />

            <ConfirmModal
                key="settings-confirm-modal"
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                isDanger={confirmConfig.isDanger}
            />
        </AnimatePresence>
    );
};
