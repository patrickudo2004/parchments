import { Editor } from '@tiptap/react';

type DictationStatusListener = (isDictating: boolean, error?: string) => void;

class InlineDictationService {
    private recognition: any = null;
    private isDictating: boolean = false;
    private listeners: Set<DictationStatusListener> = new Set();
    private activeEditor: Editor | null = null;

    public isSupported(): boolean {
        return typeof window !== 'undefined' &&
            Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    }

    public subscribe(listener: DictationStatusListener): () => void {
        this.listeners.add(listener);
        listener(this.isDictating);
        return () => this.listeners.delete(listener);
    }

    private notify(isDictating: boolean, error?: string): void {
        this.isDictating = isDictating;
        this.listeners.forEach(cb => cb(isDictating, error));
    }

    public start(editor: Editor): boolean {
        if (!this.isSupported()) {
            this.notify(false, 'Speech recognition is not supported in this environment.');
            return false;
        }

        if (this.isDictating) {
            this.stop();
            return false;
        }

        try {
            const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognitionClass();
            recognition.continuous = true;
            recognition.interimResults = false; // Only insert finalized sentences/words into the document
            recognition.lang = 'en-US';

            this.activeEditor = editor;

            recognition.onresult = (event: any) => {
                if (!this.activeEditor) return;

                let speechText = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        speechText += event.results[i][0].transcript;
                    }
                }

                const cleaned = speechText.trim();
                if (cleaned.length > 0) {
                    // Insert at current cursor position followed by space
                    this.activeEditor.commands.insertContent(`${cleaned} `);
                }
            };

            recognition.onerror = (event: any) => {
                console.warn('[InlineDictation] Error:', event.error);
                if (event.error === 'not-allowed') {
                    this.notify(false, 'Microphone permission denied.');
                    this.stop();
                } else if (event.error === 'network') {
                    this.notify(false, 'Speech service offline or unreachable.');
                    this.stop();
                }
            };

            recognition.onend = () => {
                if (this.isDictating) {
                    // Restart automatically to keep continuous Word-style dictation active
                    try {
                        recognition.start();
                    } catch {
                        setTimeout(() => {
                            if (this.isDictating) {
                                try { recognition.start(); } catch {}
                            }
                        }, 250);
                    }
                } else {
                    this.notify(false);
                }
            };

            recognition.start();
            this.recognition = recognition;
            this.notify(true);
            return true;
        } catch (err: any) {
            console.error('[InlineDictation] Failed to start:', err);
            this.notify(false, err?.message || 'Could not start microphone');
            return false;
        }
    }

    public stop(): void {
        this.isDictating = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch {}
            this.recognition = null;
        }
        this.notify(false);
    }

    public toggle(editor: Editor): boolean {
        if (this.isDictating) {
            this.stop();
            return false;
        } else {
            return this.start(editor);
        }
    }

    public getIsDictating(): boolean {
        return this.isDictating;
    }
}

export const inlineDictation = new InlineDictationService();
