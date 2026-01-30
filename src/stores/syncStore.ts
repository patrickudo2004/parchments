import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IdentityService, type UserIdentity } from '@/lib/auth/identityService';

interface SyncState {
    identity: UserIdentity | null;
    isInitialized: boolean;
    syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
    lastSyncAt: number | null;

    // Actions
    initializeIdentity: () => Promise<void>;
    updateSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void;
    clearIdentity: () => void;
}

export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            identity: null,
            isInitialized: false,
            syncStatus: 'offline',
            lastSyncAt: null,

            initializeIdentity: async () => {
                if (get().identity) return;

                try {
                    const newIdentity = await IdentityService.generateIdentity();
                    set({
                        identity: newIdentity,
                        isInitialized: true,
                        syncStatus: 'idle'
                    });
                } catch (error) {
                    console.error('[SyncStore] Failed to initialize identity:', error);
                    set({ syncStatus: 'error' });
                }
            },

            updateSyncStatus: (status) => set({ syncStatus: status }),

            clearIdentity: () => set({
                identity: null,
                isInitialized: false,
                syncStatus: 'offline'
            }),
        }),
        {
            name: 'parchments-sync',
            // Only persist the identity to keep keys secure but available
            partialize: (state) => ({ identity: state.identity, isInitialized: state.isInitialized }),
        }
    )
);
