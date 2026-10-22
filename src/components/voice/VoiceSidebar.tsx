import React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { Mic, History, Info, Play, Clock } from 'lucide-react';

export const VoiceSidebar: React.FC = () => {
    const { createVoiceNote, hasStudyspace, openLocalFolder, notes, setCurrentNote } = useNoteStore();
    const { showToast } = useUIStore();

    const voiceNotes = notes.filter(n => n.type === 'voice');

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full bg-light-background dark:bg-dark-background overflow-hidden select-none">
            {/* Header */}
            <div className="p-3 border-b border-light-border dark:border-dark-border flex items-center gap-2 shrink-0">
                <Mic size={14} className="text-primary shrink-0" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text-primary dark:text-dark-text-primary truncate">
                    Voice Transcription
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4">
                {!hasStudyspace ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="p-4 rounded-full bg-primary/10 text-primary">
                            <Mic size={28} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold mb-1">Studyspace Required</h3>
                            <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary leading-relaxed max-w-[200px] mx-auto opacity-70">
                                Open a local folder or browser database to record and transcribe studies.
                            </p>
                        </div>
                        <button
                            onClick={openLocalFolder}
                            className="text-[10px] font-black uppercase tracking-widest bg-primary text-[#121212] px-5 py-2 rounded-full hover:bg-primary-hover transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            Open Studyspace
                        </button>
                    </div>
                ) : (
                    <>
                        {/* On-device Privacy Pill */}
                        <div className="bg-primary/5 rounded-xl border border-primary/10 p-2.5 flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                <Info size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-light-text-primary dark:text-dark-text-primary leading-tight">100% On-Device</p>
                                <p className="text-[9px] text-light-text-secondary dark:text-dark-text-secondary leading-tight opacity-75 truncate">
                                    Audio is processed locally on your device.
                                </p>
                            </div>
                        </div>

                        {/* Responsive Voice Recorder */}
                        <VoiceRecorder
                            onSave={async (blob, duration, transcript) => {
                                await createVoiceNote(null, blob, duration, transcript);
                                showToast('Voice note created!', 'success');
                            }}
                            onCancel={() => {
                                showToast('Recording discarded', 'info');
                            }}
                        />

                        {/* Recent Recordings List */}
                        <div className="pt-2 border-t border-light-border dark:border-dark-border">
                            <div className="flex items-center gap-1.5 mb-2.5 text-light-text-disabled uppercase tracking-widest text-[9px] font-black">
                                <History size={11} className="shrink-0" />
                                <span>Recent Recordings ({voiceNotes.length})</span>
                            </div>

                            {voiceNotes.length === 0 ? (
                                <p className="text-[10px] text-center py-6 opacity-40 font-medium italic">
                                    Saved recordings will appear here.
                                </p>
                            ) : (
                                <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                                    {voiceNotes.slice(0, 10).map((note) => (
                                        <div
                                            key={note.id}
                                            onClick={() => setCurrentNote(note)}
                                            className="p-2 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-[#121212] transition-colors">
                                                    <Play size={11} className="fill-current" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold truncate text-light-text-primary dark:text-dark-text-primary">
                                                        {note.title || 'Voice Note'}
                                                    </p>
                                                    <p className="text-[9px] text-light-text-disabled flex items-center gap-1">
                                                        <Clock size={9} />
                                                        <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            {note.duration ? (
                                                <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md shrink-0">
                                                    {formatDuration(note.duration)}
                                                </span>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
