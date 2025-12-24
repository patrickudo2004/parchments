import { useEffect } from 'react';

interface ShortcutMap {
    [key: string]: () => void;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

            // Build shortcut string (e.g., "Ctrl+N", "Ctrl+Shift+N")
            let shortcut = '';
            if (ctrlKey || metaKey) shortcut += 'Ctrl+';
            if (shiftKey) shortcut += 'Shift+';
            if (altKey) shortcut += 'Alt+';

            // Handle case where key itself is a modifier
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

            shortcut += key.toUpperCase();

            if (shortcuts[shortcut]) {
                event.preventDefault();
                shortcuts[shortcut]();
            }

            // Also handle plain function keys (F1-F12)
            if (/^F\d+$/.test(key) && shortcuts[key]) {
                event.preventDefault();
                shortcuts[key]();
            }

            // Handle backslash separately as it needs escaping in some strings but not here
            if (key === '\\' && shortcuts['Ctrl+\\']) {
                event.preventDefault();
                shortcuts['Ctrl+\\']();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};
