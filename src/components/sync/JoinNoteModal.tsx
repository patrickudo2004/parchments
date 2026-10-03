import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { joinLocalServer, stopLocalSync, onStatusChange } from '@/lib/sync/LocalSyncService';
import { useSyncStore } from '@/stores/syncStore';
import { useNoteStore } from '@/stores/noteStore';

interface JoinNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill the ws URL when opened from a deep-link or external QR scan */
  prefillWsUrl?: string;
}

type JoinMode = 'editor' | 'follower';
type InputTab = 'qr' | 'code';

const QR_SCANNER_ID = 'parchments-qr-scanner';

export const JoinNoteModal: React.FC<JoinNoteModalProps> = ({
  isOpen,
  onClose,
  prefillWsUrl,
}) => {
  const [tab, setTab] = React.useState<InputTab>('qr');
  const [mode, setMode] = React.useState<JoinMode>('editor');
  const [manualCode, setManualCode] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'scanning' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  const { setLocalSyncStatus, deviceName } = useSyncStore();
  const currentNote = useNoteStore((s) => s.currentNote);

  // ---- QR scanner lifecycle ----
  useEffect(() => {
    if (!isOpen || tab !== 'qr') return;

    // Small delay so the DOM node is mounted
    const timer = setTimeout(async () => {
      if (isScanningRef.current) return;
      try {
        const scanner = new Html5Qrcode(QR_SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;
        isScanningRef.current = true;
        setStatus('scanning');

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            // Stop scanner and connect
            scanner.stop().catch(() => {});
            isScanningRef.current = false;
            handleConnect(decodedText);
          },
          () => { /* scan frame error — ignore */ },
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(`Camera error: ${msg}`);
        setStatus('error');
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab]);

  // Pre-fill if ws URL was passed in (e.g. from deep-link)
  useEffect(() => {
    if (prefillWsUrl) {
      setTab('code');
      setManualCode(prefillWsUrl);
    }
  }, [prefillWsUrl]);

  // ---- Stop scanner when switching tabs ----
  const handleTabSwitch = (t: InputTab) => {
    if (t === tab) return;
    if (scannerRef.current && isScanningRef.current) {
      scannerRef.current.stop().catch(() => {});
      isScanningRef.current = false;
    }
    setStatus('idle');
    setErrorMsg(null);
    setTab(t);
  };

  // ---- Connect to host ----
  const handleConnect = async (rawUrl: string) => {
    setErrorMsg(null);
    setStatus('connecting');

    try {
      const { getYDoc } = await import('@/lib/sync/YjsService');
      const ydoc = getYDoc(currentNote?.id ?? 'join-temp');

      // Build the full ws URL — raw might be just a code like "839-204"
      const wsUrl = rawUrl.startsWith('ws://') ? rawUrl : resolveCodeToUrl(rawUrl);
      if (!wsUrl) {
        throw new Error('Invalid pairing code. Please try again.');
      }

      await joinLocalServer(ydoc, wsUrl, deviceName, mode);

      onStatusChange((s) => {
        if (s === 'connected') {
          setStatus('connected');
          setLocalSyncStatus('connected');
        } else if (s === 'connecting') {
          setLocalSyncStatus('joining');
        } else {
          setLocalSyncStatus('disconnected');
        }
      });

      setStatus('connected');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    handleConnect(trimmed);
  };

  const handleDisconnect = async () => {
    await stopLocalSync();
    setStatus('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-2xl w-[440px] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Join a Shared Note</h2>
            <p className="text-white/50 text-xs mt-0.5">
              Connect to a host on the same Wi-Fi or hotspot
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 text-xl transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Join mode selector */}
        <div className="flex flex-col gap-1.5">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Join as</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('editor')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                mode === 'editor'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              ✏️ Co-Editor
            </button>
            <button
              onClick={() => setMode('follower')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                mode === 'follower'
                  ? 'bg-purple-700 border-purple-600 text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              👁 Presentation Follower
            </button>
          </div>
          {mode === 'follower' && (
            <p className="text-white/30 text-xs">
              Read-only view. Useful for projectors, teleprompters, and secondary screens.
            </p>
          )}
        </div>

        {/* Input tabs */}
        {status !== 'connected' && (
          <>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => handleTabSwitch('qr')}
                className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                  tab === 'qr' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                📷 Scan QR Code
              </button>
              <button
                onClick={() => handleTabSwitch('code')}
                className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                  tab === 'code' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                🔢 Enter Code
              </button>
            </div>

            {/* QR scanner */}
            {tab === 'qr' && (
              <div className="flex flex-col items-center gap-3">
                <div
                  id={QR_SCANNER_ID}
                  className="w-full rounded-xl overflow-hidden bg-black"
                  style={{ minHeight: 260 }}
                />
                {status === 'scanning' && (
                  <p className="text-white/40 text-xs text-center">
                    Point your camera at the host's QR code
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-red-400 text-xs text-center">{errorMsg}</p>
                )}
              </div>
            )}

            {/* Manual code entry */}
            {tab === 'code' && (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 839-204 or ws://192.168.1.5:48921?token=…"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || status === 'connecting'}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {status === 'connecting' ? 'Connecting…' : 'Connect'}
                </button>
                {errorMsg && (
                  <p className="text-red-400 text-xs">{errorMsg}</p>
                )}
              </form>
            )}
          </>
        )}

        {/* Connected state */}
        {status === 'connected' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl">
              ✓
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Connected!</p>
              <p className="text-white/50 text-sm mt-1">
                You are {mode === 'editor' ? 'co-editing' : 'following'} this note.
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-6 py-2.5 bg-red-800/40 hover:bg-red-700/50 border border-red-500/30 text-red-300 text-sm font-medium rounded-xl transition-colors"
            >
              Leave Session
            </button>
          </div>
        )}

        {/* Connecting spinner */}
        {status === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-4 text-white/60">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            <span className="text-sm">Waiting for host approval…</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Resolve a 6-digit pairing code to a ws:// URL.
// This only works if the code encodes the host IP — in practice the user will
// also need to enter the host IP or the QR contains the full URL.
// For desktop-to-desktop with manual code, the user pastes the full ws:// URL.
// ---------------------------------------------------------------------------
function resolveCodeToUrl(raw: string): string | null {
  // If it looks like a 6-digit code (NNN-NNN), we can't resolve it without
  // knowing the host IP, so return null and let the UI prompt for the full URL.
  if (/^\d{3}-\d{3}$/.test(raw)) return null;
  // Otherwise treat the input as the full URL (ws:// already checked by caller)
  return raw.startsWith('ws://') || raw.startsWith('wss://') ? raw : null;
}
