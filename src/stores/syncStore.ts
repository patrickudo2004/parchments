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
    deviceName: string;

    // ---- Local Wi-Fi sync session ----
    isLocalSyncActive: boolean;
    localSyncIp: string | null;
    localSyncPort: number | null;
    localSyncToken: string | null;
    localSyncCode: string | null;
    localSyncWsUrl: string | null;
    localSyncPeers: import('@/lib/sync/LocalSyncService').SyncPeer[];
    localSyncStatus: 'idle' | 'hosting' | 'joining' | 'connected' | 'reconnecting' | 'disconnected';
    pendingConnectionRequests: import('@/lib/sync/LocalSyncService').PendingPeer[];

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
    updateDeviceName: (name: string) => void;

    // Local sync actions
    setLocalSyncSession: (info: import('@/lib/sync/LocalSyncService').SyncServerInfo) => void;
    setLocalSyncStatus: (status: SyncState['localSyncStatus']) => void;
    addLocalPeer: (peer: import('@/lib/sync/LocalSyncService').SyncPeer) => void;
    removeLocalPeer: (addr: string) => void;
    addPendingRequest: (peer: import('@/lib/sync/LocalSyncService').PendingPeer) => void;
    removePendingRequest: (addr: string) => void;
    clearLocalSyncSession: () => void;
}


const getFriendlyDeviceName = () => {
    if (typeof window === 'undefined') return 'Parchments Device';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone/iPad';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Macintosh/.test(ua)) return 'Mac Computer';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Linux/.test(ua)) return 'Linux PC';
    return 'Web Device';
};

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
            deviceName: getFriendlyDeviceName(),

            // Local Wi-Fi sync
            isLocalSyncActive: false,
            localSyncIp: null,
            localSyncPort: null,
            localSyncToken: null,
            localSyncCode: null,
            localSyncWsUrl: null,
            localSyncPeers: [],
            localSyncStatus: 'idle',
            pendingConnectionRequests: [],

            initializeIdentity: async () => {
                if (get().identity) {
                    set({ isInitialized: true, syncStatus: 'idle' });
                    return;
                }

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
                const targetRoom = joinedRooms.find(r => r.hash === hash);
                if (!targetRoom || targetRoom.title === title) return;

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

            updateDeviceName: (name) => set({ deviceName: name }),

            // ---- Local sync actions ----
            setLocalSyncSession: (info) => set({
                isLocalSyncActive: true,
                localSyncIp: info.ip,
                localSyncPort: info.port,
                localSyncToken: info.token,
                localSyncCode: info.code,
                localSyncWsUrl: info.wsUrl,
                localSyncStatus: 'hosting',
                localSyncPeers: [],
                pendingConnectionRequests: [],
            }),

            setLocalSyncStatus: (status) => set({ localSyncStatus: status }),

            addLocalPeer: (peer) => set((state) => ({
                localSyncPeers: [...state.localSyncPeers.filter(p => p.addr !== peer.addr), peer],
            })),

            removeLocalPeer: (addr) => set((state) => ({
                localSyncPeers: state.localSyncPeers.filter(p => p.addr !== addr),
            })),

            addPendingRequest: (peer) => set((state) => ({
                pendingConnectionRequests: [
                    ...state.pendingConnectionRequests.filter(p => p.addr !== peer.addr),
                    peer,
                ],
            })),

            removePendingRequest: (addr) => set((state) => ({
                pendingConnectionRequests: state.pendingConnectionRequests.filter(p => p.addr !== addr),
            })),

            clearLocalSyncSession: () => set({
                isLocalSyncActive: false,
                localSyncIp: null,
                localSyncPort: null,
                localSyncToken: null,
                localSyncCode: null,
                localSyncWsUrl: null,
                localSyncPeers: [],
                localSyncStatus: 'idle',
                pendingConnectionRequests: [],
            }),
        }),
        {
            name: 'parchments-sync',
            // Only persist identity, joined rooms, and device names
            partialize: (state) => ({
                identity: state.identity,
                isInitialized: state.isInitialized,
                joinedRooms: state.joinedRooms,
                deviceName: state.deviceName,
            }),
        }
    )
);
