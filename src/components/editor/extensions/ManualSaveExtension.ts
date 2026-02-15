import { Extension } from '@tiptap/core';

interface ManualSaveExtensionOptions {
    onSave: () => void;
}

/**
 * Manual Save Extension
 * 
 * Provides Ctrl+S / Cmd+S keyboard shortcut for manual saving
 * when auto-save is disabled.
 */
export const ManualSaveExtension = Extension.create<ManualSaveExtensionOptions>({
    name: 'manualSave',

    addOptions() {
        return {
            onSave: () => { }
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-s': () => {
                const { onSave } = this.options;
                if (onSave) {
                    onSave();
                }
                return true; // Prevent default browser save dialog
            },
        };
    },
});
