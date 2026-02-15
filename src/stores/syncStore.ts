import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IdentityService, type UserIdentity } from '@/lib/auth/identityService';

interface JoinedRoom {
    hash: string;
    title?: string;
    type: 'note' | 'folder';
    lastJoinedAt: number;
}

interface SyncState {
    identity: UserIdentity | null;
    isInitialized: boolean;
    syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
    lastSyncAt: number | null;
    isConnected: boolean;
    activeRoom: string | null;
    joinedRooms: JoinedRoom[];
    sharedFolders: string[]; // IDs of local folders being shared

    // Actions
    initializeIdentity: () => Promise<void>;
    updateSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void;
    setConnected: (connected: boolean) => void;
    clearIdentity: () => void;
    joinRoom: (hash: string, type?: 'note' | 'folder') => void;
    leaveRoom: () => void;
    addJoinedRoom: (hash: string, title?: string, type?: 'note' | 'folder') => void;
    updateRoomTitle: (hash: string, title: string) => void;
    removeJoinedRoom: (hash: string) => void;
    shareFolder: (folderId: string) => void;
    unshareFolder: (folderId: string) => void;
}

export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            identity: null,
            isInitialized: false,
            syncStatus: 'offline',
            lastSyncAt: null,
            activeRoom: null,
            isConnected: false,
            joinedRooms: [],
            sharedFolders: [],

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
            setConnected: (connected) => set({ isConnected: connected }),

            clearIdentity: () => set({
                identity: null,
                isInitialized: false,
                syncStatus: 'offline',
                activeRoom: null,
                isConnected: false
            }),

            joinRoom: (hash, type = 'note') => {
                // Pin the room to the sidebar if it's not already there
                get().addJoinedRoom(hash, undefined, type);

                set({
                    syncStatus: 'syncing',
                    activeRoom: hash
                });
                // We'll use this hash in YjsService for discovery
                setTimeout(() => set({ syncStatus: 'idle' }), 1000);
            },

            leaveRoom: () => {
                set({
                    syncStatus: 'idle',
                    activeRoom: null
                });
            },

            addJoinedRoom: (hash, title, type = 'note') => {
                const { joinedRooms } = get();
                if (joinedRooms.some(r => r.hash === hash)) return;

                set({
                    joinedRooms: [
                        ...joinedRooms,
                        { hash, title, type, lastJoinedAt: Date.now() }
                    ]
                });
            },

            updateRoomTitle: (hash, title) => {
                const { joinedRooms } = get();
                set({
                    joinedRooms: joinedRooms.map(r =>
                        r.hash === hash ? { ...r, title } : r
                    )
                });
            },

            removeJoinedRoom: (hash) => {
                const { joinedRooms, activeRoom } = get();
                set({
                    joinedRooms: joinedRooms.filter(r => r.hash !== hash),
                    activeRoom: activeRoom === hash ? null : activeRoom
                });
            },

            shareFolder: (folderId) => {
                const { sharedFolders } = get();
                if (sharedFolders.includes(folderId)) return;
                set({ sharedFolders: [...sharedFolders, folderId] });
            },

            unshareFolder: (folderId) => {
                const { sharedFolders } = get();
                set({ sharedFolders: sharedFolders.filter(id => id !== folderId) });
            }
        }),
        {
            name: 'parchments-sync',
            // Only persist identity and the list of joined rooms
            partialize: (state) => ({
                identity: state.identity,
                isInitialized: state.isInitialized,
                joinedRooms: state.joinedRooms,
                sharedFolders: state.sharedFolders
            }),
        }
    )
);
