import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    FilePlus,
    FolderPlus,
    Mic,
    Upload,
    Award,
    Database,
    HardDrive,
    ShieldCheck,
    Check,
    Sparkles,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useUIStore } from '@/stores/uiStore';
import { useReadingPlanStore } from '@/stores/readingPlanStore';
import { Capacitor } from '@capacitor/core';

export const EmptyState: React.FC = () => {
    const {
        createNote,
        createVoiceNote,
        createFolder,
        isLocalMode,
        hasStudyspace,
        openLocalFolder,
        selectStorageFoundation,
        lastLocalFolderName,
        reconnectLocalFolder
    } = useNoteStore();

    const { openRightSidebar, isLeftSidebarOpen, closeLeftSidebar } = useUIStore();
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

    // Option A: Ensure sidebars are cleanly closed on welcome screen / initial launch
    useEffect(() => {
        if (!hasStudyspace && isLeftSidebarOpen) {
            closeLeftSidebar();
        }
    }, [hasStudyspace, isLeftSidebarOpen, closeLeftSidebar]);

    const isFileSystemSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    const isNativeApp = typeof window !== 'undefined' && (
        !!(window as any).__TAURI_INTERNALS__ ||
        !!(window as any).__TAURI__ ||
        Capacitor.isNativePlatform()
    );
    const canOpenLocalFolder = isNativeApp || isFileSystemSupported;

    // First Launch / No Studyspace Choice Screen
    if (!hasStudyspace) {
        return (
            <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-6 md:px-10 pt-10 sm:pt-14 md:pt-16 pb-20 animate-in fade-in duration-500">
                <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">

                    {/* Logo & Welcome Header */}
                    <div className="mb-6 relative mt-2 sm:mt-4">
                        <div className="absolute inset-0 bg-primary/15 rounded-full blur-2xl animate-pulse" />
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-light-surface dark:bg-[#141414] border border-light-border dark:border-white/10 shadow-xl flex items-center justify-center p-3">
                            <img src="/logo.png" alt="Parchments" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                        <Sparkles size={12} />
                        <span>Storage Foundation</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-light-text-primary dark:text-white tracking-tight mb-3">
                        Welcome to Parchments
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-light-text-secondary dark:text-white/60 max-w-xl mb-8 leading-relaxed">
                        Where would you like to store your study library? Parchments is <strong className="text-light-text-primary dark:text-white font-bold">100% offline-first and private</strong>—your data never touches a remote server.
                    </p>

                    {/* Reconnect Banner (if previously connected) */}
                    {lastLocalFolderName && (
                        <div className="w-full max-w-2xl mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/20 text-primary shrink-0">
                                    <RotateCcw size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-light-text-primary dark:text-white">
                                        Resume previous session in <span className="text-primary font-black">'{lastLocalFolderName}'</span>
                                    </p>
                                    <p className="text-[10px] text-light-text-secondary dark:text-white/60">
                                        Click reconnect to re-authorize and load your notes.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={reconnectLocalFolder}
                                className="w-full sm:w-auto px-5 py-2.5 bg-primary text-[#121212] font-black text-xs rounded-xl shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
                            >
                                <HardDrive size={14} />
                                <span>Reconnect Folder</span>
                            </button>
                        </div>
                    )}

                    {/* Dual Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full max-w-3xl mb-8 text-left">

                        {/* Card 1: Local Computer Folder */}
                        <div className={`relative p-6 sm:p-7 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                            canOpenLocalFolder
                                ? 'bg-light-surface dark:bg-[#121212] border-light-border dark:border-white/10 hover:border-primary/50 shadow-xl'
                                : 'bg-light-surface/60 dark:bg-white/[0.02] border-light-border/40 dark:border-white/5 opacity-80'
                        }`}>
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                                        <HardDrive size={24} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        Best for PC / Mac
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-light-text-primary dark:text-white mb-1.5">
                                    Local Computer Folder
                                </h3>
                                <p className="text-xs text-light-text-secondary dark:text-white/60 mb-5 leading-relaxed">
                                    Stores your study notes as standard <strong className="text-light-text-primary dark:text-white">.md Markdown</strong> files in an actual folder on your hard drive.
                                </p>

                                <ul className="space-y-2.5 text-xs text-light-text-secondary dark:text-white/60 mb-6">
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-primary mt-0.5 shrink-0" />
                                        <span>Directly editable in Obsidian, VS Code, or Word</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-primary mt-0.5 shrink-0" />
                                        <span>Safe from browser cache or history clearing</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-primary mt-0.5 shrink-0" />
                                        <span>Permanent, portable, and easy to back up</span>
                                    </li>
                                </ul>
                            </div>

                            {canOpenLocalFolder ? (
                                <button
                                    onClick={openLocalFolder}
                                    className="w-full py-4 px-6 bg-primary text-[#121212] font-black rounded-2xl text-xs sm:text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation min-h-[50px]"
                                >
                                    <Upload size={18} />
                                    <span>Choose Folder on PC / Mac</span>
                                </button>
                            ) : (
                                <div className="p-3 rounded-2xl bg-light-background dark:bg-white/[0.03] border border-light-border dark:border-white/5 text-[11px] text-light-text-secondary dark:text-white/50 flex items-start gap-2">
                                    <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                                    <span>Desktop only: Mobile web browsers restrict direct file system access. Use Browser Database below.</span>
                                </div>
                            )}
                        </div>

                        {/* Card 2: Browser Database */}
                        <div className="relative p-6 sm:p-7 rounded-3xl bg-light-surface dark:bg-[#121212] border border-light-border dark:border-white/10 hover:border-primary/50 shadow-xl transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                        <Database size={24} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        Instant & Mobile-Ready
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-light-text-primary dark:text-white mb-1.5">
                                    Browser Database
                                </h3>
                                <p className="text-xs text-light-text-secondary dark:text-white/60 mb-5 leading-relaxed">
                                    Stores notes securely inside this browser's private offline database (<strong className="text-light-text-primary dark:text-white">IndexedDB</strong>) on your device.
                                </p>

                                <ul className="space-y-2.5 text-xs text-light-text-secondary dark:text-white/60 mb-6">
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                        <span>Zero setup or filesystem permissions required</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                        <span>Works across all phones, tablets, and computers</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                        <span>Easily link a local folder or export anytime</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={() => selectStorageFoundation('browser')}
                                className="w-full py-4 px-6 bg-light-background dark:bg-white/10 hover:bg-primary hover:text-[#121212] dark:hover:bg-primary dark:hover:text-[#121212] text-light-text-primary dark:text-white font-black rounded-2xl text-xs sm:text-sm border border-light-border dark:border-white/10 hover:border-transparent transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation min-h-[50px]"
                            >
                                <Database size={18} />
                                <span>Start in Browser Database</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Access Exploration Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                        <span className="text-[10px] font-bold text-light-text-secondary dark:text-white/40 uppercase tracking-widest mr-1">
                            Or Explore Scripture:
                        </span>
                        <button
                            onClick={() => openRightSidebar('bible')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-light-surface dark:bg-white/[0.04] border border-light-border dark:border-white/10 text-xs font-bold text-light-text-primary dark:text-white/80 hover:text-primary hover:border-primary/40 transition-all cursor-pointer touch-manipulation min-h-[44px]"
                        >
                            <BookOpen size={15} />
                            <span>Read Bible</span>
                        </button>
                        <button
                            onClick={() => useReadingPlanStore.setState({ isLectioModeActive: true, activePlanId: null })}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-light-surface dark:bg-white/[0.04] border border-light-border dark:border-white/10 text-xs font-bold text-light-text-primary dark:text-white/80 hover:text-primary hover:border-primary/40 transition-all cursor-pointer touch-manipulation min-h-[44px]"
                        >
                            <Award size={15} className="text-primary" />
                            <span>Lectio Divina</span>
                        </button>
                    </div>

                    {/* Security & Privacy Guarantee Footer */}
                    <div className="p-4 rounded-2xl bg-light-surface dark:bg-white/[0.02] border border-light-border dark:border-white/5 max-w-lg flex items-center gap-3 text-left">
                        <ShieldCheck size={20} className="text-green-500 shrink-0" />
                        <p className="text-[11px] text-light-text-secondary dark:text-white/50 leading-relaxed">
                            <strong className="text-light-text-primary dark:text-white/80">Privacy Covenant:</strong> 100% Offline & Private. No cloud servers, no account logins, and no telemetry. All data is saved exclusively on your device.
                        </p>
                    </div>

                </div>
            </div>
        );
    }

    // Default Canvas when Studyspace is Active
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="mb-8 p-0 bg-transparent rounded-full overflow-hidden shadow-2xl ring-4 ring-primary/20">
                <img src="/logo.png" alt="Parchments" className="w-24 h-24 object-contain" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Studyspace Ready</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-sm mb-8">
                Create your first study note or select a file from the sidebar to begin.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                <button
                    onClick={() => createNote(null)}
                    className="flex flex-col items-center gap-3 p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group touch-manipulation cursor-pointer active:scale-95 min-h-[50px]"
                >
                    <div className="p-4 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                        <FilePlus size={24} />
                    </div>
                    <div className="text-sm font-bold">New Text Note</div>
                </button>

                <button
                    onClick={() => setShowVoiceRecorder(true)}
                    className="flex flex-col items-center gap-3 p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group touch-manipulation cursor-pointer active:scale-95 min-h-[50px]"
                >
                    <div className="p-4 bg-red-500/10 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <Mic size={24} />
                    </div>
                    <div className="text-sm font-bold">New Voice Note</div>
                </button>

                <button
                    onClick={() => createFolder('New Folder', null)}
                    className="flex flex-col items-center gap-3 p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group touch-manipulation cursor-pointer active:scale-95 min-h-[50px]"
                >
                    <div className="p-4 bg-secondary/10 text-secondary rounded-xl group-hover:bg-secondary group-hover:text-white transition-colors">
                        <FolderPlus size={24} />
                    </div>
                    <div className="text-sm font-bold">New Folder</div>
                </button>
            </div>

            <div className="mt-12 flex items-center gap-6 text-xs text-light-text-disabled uppercase tracking-widest font-bold">
                <div className="flex items-center gap-1.5"><span className="p-1.5 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">Ctrl</span> + <span className="p-1.5 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">N</span> New Note</div>
                <div className="flex items-center gap-1.5"><span className="p-1.5 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">Ctrl</span> + <span className="p-1.5 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">,</span> Settings</div>
            </div>

            {/* Voice Recorder Modal */}
            {showVoiceRecorder && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <VoiceRecorder
                        onSave={async (blob, duration, transcript) => {
                            if (isLocalMode) {
                                await useNoteStore.getState().createLocalVoiceNote(blob, null, transcript);
                            } else {
                                await createVoiceNote(null, blob, duration, transcript);
                            }
                            setShowVoiceRecorder(false);
                        }}
                        onCancel={() => setShowVoiceRecorder(false)}
                    />
                </div>
            )}
        </div>
    );
};
