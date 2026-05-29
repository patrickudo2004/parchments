import React, { useState } from 'react';
import { BookOpen, FilePlus, FolderPlus, Mic, FolderOpen, Upload, Award } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useUIStore } from '@/stores/uiStore';
import { useReadingPlanStore } from '@/stores/readingPlanStore';

export const EmptyState: React.FC = () => {
    const { createNote, createVoiceNote, createFolder, isLocalMode, hasStudyspace, openLocalFolder } = useNoteStore();
    const { openRightSidebar } = useUIStore();
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

    if (!hasStudyspace) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-700">
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                    <div className="relative p-10 bg-light-sidebar dark:bg-dark-sidebar rounded-3xl shadow-xl border border-light-border dark:border-dark-border">
                        <FolderOpen size={64} className="text-primary" />
                    </div>
                </div>

                <h2 className="text-3xl font-black mb-3">Unlock your Studyspace</h2>
                <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md mb-10 leading-relaxed">
                    Parchments is a file-first editor. To begin your study, open a folder on your computer to use as your local library.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={openLocalFolder}
                        className="group relative flex items-center gap-4 px-8 py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                    >
                        <Upload size={24} />
                        <span>Open Local Folder</span>
                        <div className="absolute inset-0 rounded-2xl ring-4 ring-primary/20 scale-110 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>

                    <button
                        onClick={() => openRightSidebar('bible')}
                        className="flex items-center gap-3 px-8 py-5 bg-light-sidebar dark:bg-dark-sidebar text-light-text-primary dark:text-dark-text-primary border border-light-border dark:border-dark-border rounded-2xl font-black text-lg shadow-xl transition-all hover:border-primary hover:text-primary hover:scale-105 active:scale-95"
                    >
                        <BookOpen size={24} />
                        <span>Browse Bible</span>
                    </button>

                    <button
                        onClick={() => useReadingPlanStore.setState({ isLectioModeActive: true, activePlanId: null })}
                        className="flex items-center gap-3 px-8 py-5 bg-light-sidebar dark:bg-dark-sidebar text-light-text-primary dark:text-dark-text-primary border border-light-border dark:border-dark-border rounded-2xl font-black text-lg shadow-xl transition-all hover:border-primary hover:text-primary hover:scale-105 active:scale-95"
                    >
                        <Award size={24} className="text-primary" />
                        <span>Lectio Plans</span>
                    </button>
                </div>

                <div className="mt-12 p-4 bg-light-background dark:bg-dark-background/50 rounded-xl border border-light-border dark:border-dark-border max-w-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-light-text-disabled mb-2">Why Local?</p>
                    <p className="text-xs text-light-text-secondary italic">
                        Your data stays on your machine, in your folders, exactly where it belongs. Private, offline, and forever yours.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="mb-8 p-0 bg-transparent rounded-full overflow-hidden shadow-2xl ring-4 ring-primary/20">
                <img src="/logo.png" alt="Parchments" className="w-24 h-24 object-contain" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Studyspace Ready</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-sm mb-8">
                Create your first study note or select a file from the sidebar to begin.
            </p>

            <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                <button
                    onClick={() => createNote(null)}
                    className="flex flex-col items-center gap-3 p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group"
                >
                    <div className="p-4 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                        <FilePlus size={24} />
                    </div>
                    <div className="text-sm font-bold">New Text Note</div>
                </button>

                <button
                    onClick={() => setShowVoiceRecorder(true)}
                    className="flex flex-col items-center gap-3 p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group"
                >
                    <div className="p-4 bg-red-500/10 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <Mic size={24} />
                    </div>
                    <div className="text-sm font-bold">New Voice Note</div>
                </button>

                <button
                    onClick={() => createFolder('New Folder', null)}
                    className="flex flex-col items-center gap-3 p-8 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group"
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
