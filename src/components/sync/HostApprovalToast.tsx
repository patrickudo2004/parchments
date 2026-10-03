/**
 * HostApprovalToast
 *
 * Renders stacked "Allow / Deny" banners at the top-right of the screen
 * whenever a device is knocking to join the host's local sync session.
 *
 * This is a standalone overlay — mount it once near the app root so it's
 * always visible regardless of which modal or panel is open.
 */
import React from 'react';
import { approvePeer, denyPeer } from '@/lib/sync/LocalSyncService';
import { useSyncStore } from '@/stores/syncStore';

export const HostApprovalToast: React.FC = () => {
  const {
    pendingConnectionRequests,
    isLocalSyncActive,
    removePendingRequest,
    addLocalPeer,
  } = useSyncStore();

  if (!isLocalSyncActive || pendingConnectionRequests.length === 0) return null;

  const handleApprove = async (addr: string, deviceName: string, mode: 'editor' | 'follower') => {
    await approvePeer(addr);
    removePendingRequest(addr);
    addLocalPeer({ addr, device_name: deviceName, mode, approved: true });
  };

  const handleDeny = async (addr: string) => {
    await denyPeer(addr);
    removePendingRequest(addr);
  };

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="assertive"
      aria-label="Connection requests"
    >
      {pendingConnectionRequests.map((peer) => (
        <div
          key={peer.addr}
          className="pointer-events-auto flex flex-col gap-2 bg-[#1e1e2e] border border-yellow-500/40 rounded-2xl shadow-2xl p-4 w-80 animate-in slide-in-from-right-4 duration-300"
        >
          {/* Icon + info */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-lg shrink-0">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{peer.device_name}</p>
              <p className="text-white/50 text-xs mt-0.5 truncate">{peer.addr}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                peer.mode === 'editor'
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-purple-500/20 text-purple-300'
              }`}>
                {peer.mode === 'editor' ? '✏️ Co-Editor' : '👁 Follower'}
              </span>
            </div>
          </div>

          <p className="text-white/60 text-xs">
            Wants to join your note session. Allow this device?
          </p>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(peer.addr, peer.device_name, peer.mode)}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Allow
            </button>
            <button
              onClick={() => handleDeny(peer.addr)}
              className="flex-1 py-2 bg-red-800/60 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
