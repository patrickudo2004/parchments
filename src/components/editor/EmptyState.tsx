import React, { useState } from 'react';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import MicIcon from '@mui/icons-material/Mic';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useNoteStore } from '@/stores/noteStore';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';

export const EmptyState: React.FC = () => {
    const { createNote, createVoiceNote, createFolder } = useNoteStore();
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="mb-8 p-6 bg-light-sidebar dark:bg-dark-sidebar rounded-full shadow-inner border border-light-border dark:border-dark-border">
                <MenuBookIcon style={{ fontSize: '4rem' }} className="text-primary/20" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Welcome to Parchments</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-sm mb-8">
                Your digital desk for deep study and sermon preparation. Select a note from the sidebar or start something new.
            </p>

            <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                <button
                    onClick={() => createNote(null)}
                    className="flex flex-col items-center gap-3 p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group"
                >
                    <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                        <NoteAddIcon />
                    </div>
                    <div className="text-sm font-bold">New Text Note</div>
                </button>

                <button
                    onClick={() => setShowVoiceRecorder(true)}
                    className="flex flex-col items-center gap-3 p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group"
                >
                    <div className="p-3 bg-red-500/10 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <MicIcon />
                    </div>
                    <div className="text-sm font-bold">New Voice Note</div>
                </button>

                <button
                    onClick={() => createFolder('New Folder', null)}
                    className="flex flex-col items-center gap-3 p-6 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all group"
                >
                    <div className="p-3 bg-secondary/10 text-secondary rounded-xl group-hover:bg-secondary group-hover:text-white transition-colors">
                        <CreateNewFolderIcon />
                    </div>
                    <div className="text-sm font-bold">New Folder</div>
                </button>
            </div>

            <div className="mt-12 flex items-center gap-6 text-xs text-light-text-disabled uppercase tracking-widest font-bold">
                <div className="flex items-center gap-1.5"><span className="p-1 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">Ctrl</span> + <span className="p-1 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">N</span> New Note</div>
                <div className="flex items-center gap-1.5"><span className="p-1 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">Ctrl</span> + <span className="p-1 bg-light-sidebar dark:bg-dark-sidebar rounded border border-light-border dark:border-dark-border">,</span> Settings</div>
            </div>

            {/* Voice Recorder Modal */}
            {showVoiceRecorder && (
                <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <VoiceRecorder
                        onSave={async (blob, duration) => {
                            await createVoiceNote(null, blob, duration);
                            setShowVoiceRecorder(false);
                        }}
                        onCancel={() => setShowVoiceRecorder(false)}
                    />
                </div>
            )}
        </div>
    );
};
