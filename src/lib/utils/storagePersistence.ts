/**
 * Utility to manage browser storage persistence.
 * This helps prevent the browser from automatically evicting IndexedDB data (Bible, notes, etc.)
 * when disk space is low.
 */
export const storagePersistence = {
    /**
     * Checks if storage is already persistent
     */
    async isPersistent(): Promise<boolean> {
        if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persisted) {
            return false;
        }
        return await navigator.storage.persisted();
    },

    /**
     * Requests the browser to make storage persistent.
     * Most browsers will grant this if the site is installed (PWA) or has high engagement.
     */
    async requestPersistence(): Promise<boolean> {
        if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
            return false;
        }

        const persisted = await navigator.storage.persist();
        if (persisted) {
            console.log('[Storage] persistence granted 🛡️');
        } else {
            // Silencing this warning as it's common in development/uninstalled environments
            // console.warn('[Storage] persistence denied/not possible ⚠️');
        }
        return persisted;
    },

    /**
     * Returns the estimated storage usage and quota
     */
    async getEstimate(): Promise<StorageEstimate | null> {
        if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
            return null;
        }
        return await navigator.storage.estimate();
    }
};
