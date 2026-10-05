import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  startLocalServer,
  stopLocalSync,
  approvePeer,
  denyPeer,
  onPeerRequesting,
  onPeerConnected,
  onPeerDisconnected,
  onStatusChange,
  type SyncServerInfo,
  type SyncPeer,
  type PendingPeer,
} from '@/lib/sync/LocalSyncService';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';

interface PairNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PairNoteModal: React.FC<PairNoteModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = React.useState<'idle' | 'starting' | 'active'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const {
    localSyncCode,
    localSyncWsUrl,
    localSyncStatus,
    localSyncPeers,
    pendingConnectionRequests,
    isLocalSyncActive,
    setLocalSyncSession,
    setLocalSyncStatus,
    addLocalPeer,
    removeLocalPeer,
    addPendingRequest,
    removePendingRequest,
    clearLocalSyncSession,
    deviceName,
  } = useSyncStore();

  const currentNote = useNoteStore((s) => s.currentNote);
  const ydocRef = useRef<import('yjs').Doc | null>(null);

  // Start the session when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (isLocalSyncActive) { setStep('active'); return; }

    setStep('starting');
    setError(null);

    const launch = async () => {
      try {
        const { getYDoc } = await import('@/lib/sync/YjsService');
        const ydoc = getYDoc(currentNote?.id ?? 'temp');
        ydocRef.current = ydoc;

        const info: SyncServerInfo = await startLocalServer(
          currentNote?.id ?? 'temp',
          currentNote?.title ?? 'Untitled',
          ydoc,
        );

        setLocalSyncSession(info);
        setStep('active');

        // Wire event callbacks
        onPeerRequesting((peer: PendingPeer) => addPendingRequest(peer));
        onPeerConnected((peer) => {
          removePendingRequest(peer.addr);
          addLocalPeer({ ...peer, approved: true });
        });
        onPeerDisconnected((addr: string) => removeLocalPeer(addr));
        onStatusChange((status) => {
          if (status === 'connected') setLocalSyncStatus('connected');
          else if (status === 'connecting') setLocalSyncStatus('joining');
          else setLocalSyncStatus('disconnected');
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep('idle');
      }
    };

    launch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleEndSession = async () => {
    await stopLocalSync();
    clearLocalSyncSession();
    setStep('idle');
    onClose();
  };

  const handleApprove = async (addr: string) => {
    await approvePeer(addr);
    removePendingRequest(addr);
  };

  const handleDeny = async (addr: string) => {
    await denyPeer(addr);
    removePendingRequest(addr);
  };

  if (!isOpen) return null;

  const statusLabel: Record<string, string> = {
    idle: 'Ready',
    hosting: 'Hosting · Waiting for devices…',
    joining: 'Connecting…',
    connected: 'Active',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Share Note on Local Network</h2>
            <p className="text-white/50 text-xs mt-0.5">
              Same Wi-Fi or hotspot · No internet required
            </p>
          </div>
          <button
            onClick={handleEndSession}
            className="text-white/40 hover:text-white/80 text-xl transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs rounded-xl p-4 flex flex-col gap-3">
            <p className="leading-relaxed">{error}</p>
            <button
              onClick={handleEndSession}
              className="self-start px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Loading */}
        {step === 'starting' && (
          <div className="flex flex-col items-center gap-3 py-8 text-white/60">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            <span className="text-sm">Starting local server…</span>
          </div>
        )}

        {/* Active session */}
        {step === 'active' && localSyncWsUrl && (
          <>
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                localSyncStatus === 'connected' ? 'bg-green-400' :
                localSyncStatus === 'hosting' ? 'bg-yellow-400 animate-pulse' :
                'bg-red-400'
              }`} />
              <span className="text-white/60 text-xs">{statusLabel[localSyncStatus] ?? localSyncStatus}</span>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center gap-4 bg-white rounded-2xl p-5">
              <QRCodeSVG
                value={localSyncWsUrl}
                size={220}
                level="M"
                includeMargin={false}
              />
              <p className="text-[#1e1e2e]/60 text-xs text-center">
                Scan with your phone or tablet to join this note
              </p>
            </div>

            {/* 6-digit code */}
            <div className="text-center">
              <p className="text-white/50 text-xs mb-1">Or enter this code manually</p>
              <span className="text-white font-mono text-3xl tracking-[0.3em] select-all">
                {localSyncCode ?? '···-···'}
              </span>
            </div>

            {/* Pending approvals */}
            {pendingConnectionRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Waiting for approval
                </p>
                {pendingConnectionRequests.map((peer) => (
                  <div
                    key={peer.addr}
                    className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{peer.device_name}</p>
                      <p className="text-white/40 text-xs">
                        {peer.addr} · {peer.mode === 'editor' ? 'Co-Editor' : 'Presentation Follower'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(peer.addr)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition-colors"
                      >
                        Allow
                      </button>
                      <button
                        onClick={() => handleDeny(peer.addr)}
                        className="px-3 py-1.5 bg-red-700/60 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Connected peers */}
            {localSyncPeers.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Connected ({localSyncPeers.length})
                </p>
                {localSyncPeers.map((peer: SyncPeer) => (
                  <div
                    key={peer.addr}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
                  >
                    <div>
                      <p className="text-white text-sm">{peer.device_name}</p>
                      <p className="text-white/40 text-xs">
                        {peer.mode === 'editor' ? '✏️ Co-Editor' : '👁 Presentation Follower'}
                      </p>
                    </div>
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {localSyncPeers.length === 0 && pendingConnectionRequests.length === 0 && (
              <p className="text-white/30 text-sm text-center py-2">
                No devices connected yet. Scan the QR code to start.
              </p>
            )}

            {/* End session */}
            <button
              onClick={handleEndSession}
              className="w-full mt-2 py-2.5 bg-red-800/40 hover:bg-red-700/50 border border-red-500/30 text-red-300 text-sm font-medium rounded-xl transition-colors"
            >
              End Session
            </button>

            {/* Note info */}
            <p className="text-white/30 text-xs text-center">
              Sharing: <span className="text-white/50">{currentNote?.title ?? 'Untitled'}</span>
              {' '}· Host: <span className="text-white/50">{deviceName}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
