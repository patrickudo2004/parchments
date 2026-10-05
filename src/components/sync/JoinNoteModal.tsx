import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Check, X } from 'lucide-react';
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
  const [tab, setTab] = useState<InputTab>('qr');
  const [mode, setMode] = useState<JoinMode>('editor');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-camera selection support
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  const { setLocalSyncStatus, deviceName } = useSyncStore();
  const currentNote = useNoteStore((s) => s.currentNote);

  // ---- Enumerate available cameras ----
  useEffect(() => {
    let isMounted = true;
    if (isOpen && tab === 'qr') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (isMounted && devices && devices.length > 0) {
            setCameras(devices);
            setSelectedCameraId((prev) => {
              if (prev && devices.some((d) => d.id === prev)) return prev;
              // Prefer back/rear camera if available
              const backCam = devices.find((d) => {
                const label = d.label.toLowerCase();
                return label.includes('back') || label.includes('rear') || label.includes('environment');
              });
              return backCam ? backCam.id : devices[0].id;
            });
          }
        })
        .catch((err) => {
          console.warn('Could not enumerate cameras:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, tab]);

  // ---- QR scanner lifecycle ----
  useEffect(() => {
    if (!isOpen || tab !== 'qr') return;

    let isCancelled = false;

    // Small delay so the DOM node is mounted
    const timer = setTimeout(async () => {
      if (isScanningRef.current) return;
      const el = document.getElementById(QR_SCANNER_ID);
      if (!el) return;

      try {
        const scanner = new Html5Qrcode(QR_SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;
        isScanningRef.current = true;
        setStatus('scanning');

        const cameraConfig = selectedCameraId ? selectedCameraId : { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
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
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg(`Camera access unavailable (${msg}). Please enter the host address manually.`);
          setStatus('error');
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab, selectedCameraId]);

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
      let note = currentNote;
      if (!note) {
        const { createNote, setCurrentNote } = useNoteStore.getState();
        note = await createNote(null, 'Shared Note');
        if (note) setCurrentNote(note);
      }

      const ydoc = getYDoc(note?.id ?? 'join-temp');

      // Build the full ws URL — raw might be just a code like "839-204" or IP:port
      const wsUrl = rawUrl.startsWith('ws://') || rawUrl.startsWith('wss://') ? rawUrl : resolveCodeToUrl(rawUrl);
      if (!wsUrl) {
        throw new Error('Please enter a valid connection address (e.g. 192.168.1.5:8765) or scan the host QR code.');
      }

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
      const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

      if (isHttps && !isTauri && !isCapacitor && wsUrl.startsWith('ws://')) {
        throw new Error('Browser security blocks insecure local Wi-Fi connections (ws://) from HTTPS web pages. To join notes over local Wi-Fi, please use the Parchments Desktop or Mobile application.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-[440px] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">

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
            className="text-white/40 hover:text-white/80 p-1 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
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
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              ✏️ Co-Editor
            </button>
            <button
              onClick={() => setMode('follower')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                mode === 'follower'
                  ? 'bg-purple-700 border-purple-600 text-white shadow-sm'
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
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'qr' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                📷 Scan QR Code
              </button>
              <button
                onClick={() => handleTabSwitch('code')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'code' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
                }`}
              >
                🔢 Enter Code
              </button>
            </div>

            {/* QR scanner */}
            {tab === 'qr' && (
              <div className="flex flex-col items-center gap-3">
                {/* Camera Switcher Dropdown (if multiple cameras detected) */}
                {cameras.length > 1 && (
                  <div className="w-full flex items-center justify-between gap-2 px-1">
                    <label className="text-white/60 text-xs font-semibold flex items-center gap-1.5 shrink-0">
                      <Camera size={14} className="text-indigo-400" />
                      <span>Camera ({cameras.length})</span>
                    </label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        if (scannerRef.current && isScanningRef.current) {
                          scannerRef.current.stop().catch(() => {}).then(() => {
                            isScanningRef.current = false;
                            setSelectedCameraId(newId);
                          });
                        } else {
                          setSelectedCameraId(newId);
                        }
                      }}
                      className="bg-white/10 text-white text-xs rounded-xl px-2.5 py-1.5 border border-white/15 focus:outline-none focus:border-indigo-400 truncate max-w-[220px]"
                    >
                      {cameras.map((c, idx) => (
                        <option key={c.id} value={c.id} className="bg-[#1e1e2e] text-white">
                          {c.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                  placeholder="e.g. ws://192.168.1.5:48921?token=…"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || status === 'connecting'}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors shadow-md"
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
            <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
              <Check size={28} />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-base">Connected!</p>
              <p className="text-white/50 text-xs mt-1">
                You are {mode === 'editor' ? 'co-editing' : 'following'} this note live.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
              >
                Open Note
              </button>
              <button
                onClick={handleDisconnect}
                className="py-2.5 px-4 bg-red-800/40 hover:bg-red-700/50 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl transition-colors"
              >
                Leave Session
              </button>
            </div>
          </div>
        )}

        {/* Connecting spinner */}
        {status === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-4 text-white/60">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            <span className="text-sm">Connecting to host…</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Resolve a connection code or address to a ws:// URL.
// ---------------------------------------------------------------------------
function resolveCodeToUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) return trimmed;
  // If user entered IP:PORT or host:port e.g. 192.168.1.5:8765
  if (/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|[\w.-]+):\d+/.test(trimmed)) {
    return trimmed.includes('/sync') ? `ws://${trimmed}` : `ws://${trimmed}/sync`;
  }
  return null;
}
