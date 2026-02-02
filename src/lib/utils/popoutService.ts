/**
 * popoutService.ts
 * Manages the creation and synchronization of external windows for sidebar content.
 */

type PopoutType = 'bible' | 'lexicon' | 'assistant' | 'pins';

export const popoutService = {
    /**
     * Opens a new window with specific content
     */
    open(type: PopoutType) {
        // Construct the URL with a special query param
        const url = `${window.location.origin}${window.location.pathname}?popout=${type}`;
        const width = 600;
        const height = 800;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const win = window.open(
            url,
            `Parchments-${type}`,
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );

        if (!win) {
            console.error('[Popout] Window failed to open. Check pop-up blocker.');
            return null;
        }

        return win;
    },

    /**
     * Checks if the current window is a pop-out
     */
    isPopout() {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        return params.has('popout');
    },

    /**
     * Gets the pop-out type from the URL
     */
    getPopoutType(): PopoutType | null {
        if (typeof window === 'undefined') return null;
        const params = new URLSearchParams(window.location.search);
        return params.get('popout') as PopoutType | null;
    }
};
