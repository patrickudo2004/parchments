import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { Mic, History, Info } from 'lucide-react';

export const VoiceSidebar: React.FC = () => {
    const { createVoiceNote, hasStudyspace, openLocalFolder } = useNoteStore();
    const { showToast, toggleNoFolderModal } = useUIStore();

    return (
        <div className="flex flex-col h-full bg-light-background dark:bg-dark-background overflow-hidden">
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center gap-2">
                <Mic size={14} className="text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text-primary dark:text-dark-text-primary">
                    Voice Transcription
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                {!hasStudyspace ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="p-6 rounded-full bg-primary/10 text-primary">
                            <Mic size={32} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold mb-1">Studyspace Required</h3>
                            <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed max-w-[200px] mx-auto opacity-70">
                                Please open a local folder to start transcribing your studies.
                            </p>
                        </div>
                        <button
                            onClick={openLocalFolder}
                            className="text-[10px] font-black uppercase tracking-widest bg-primary text-white px-6 py-2.5 rounded-full hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                        >
                            Open Studyspace
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="bg-primary/5 rounded-xl border border-primary/10 p-4">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Info size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary mb-1">Local Processing</p>
                                    <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                        Audio is transcribed on your device. Nothing is sent to the cloud.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <VoiceRecorder
                            onSave={async (blob, duration, transcript) => {
                                await createVoiceNote(null, blob, duration, transcript);
                                showToast('Voice note created!', 'success');
                            }}
                            onCancel={() => { }}
                        />

                        <div className="pt-4 border-t border-light-border dark:border-dark-border">
                            <div className="flex items-center gap-2 mb-3 text-light-text-disabled uppercase tracking-widest text-[9px] font-black">
                                <History size={10} />
                                <span>Recent Recordings</span>
                            </div>
                            <p className="text-[10px] text-center py-8 opacity-40 font-medium italic">
                                History will appear after you record.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
