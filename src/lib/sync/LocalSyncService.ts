import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { WebsocketProvider } from 'y-websocket';
import type { Doc } from 'yjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncServerInfo {
  port: number;
  token: string;
  code: string;
  ip: string;
  wsUrl: string;
}

export interface SyncPeer {
  addr: string;
  device_name: string;
  mode: 'editor' | 'follower';
  approved: boolean;
}

export interface PendingPeer {
  addr: string;
  device_name: string;
  mode: 'editor' | 'follower';
}

export interface LocalSyncSession {
  serverInfo: SyncServerInfo;
  peers: SyncPeer[];
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let _provider: WebsocketProvider | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Tauri event unlisteners
const _unlisteners: UnlistenFn[] = [];

// Callbacks for the UI
let _onPeerRequesting: ((peer: PendingPeer) => void) | null = null;
let _onPeerConnected: ((peer: Omit<SyncPeer, 'approved'>) => void) | null = null;
let _onPeerDisconnected: ((addr: string) => void) | null = null;
let _onStatusChange: ((status: 'connected' | 'connecting' | 'disconnected') => void) | null = null;

// ---------------------------------------------------------------------------
// Host-side: start the embedded server
// ---------------------------------------------------------------------------

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

/**
 * Start the embedded Rust WebSocket server for the given note.
 * Returns the session info needed to display the QR code and 6-digit code.
 */
export async function startLocalServer(
  noteId: string,
  noteTitle: string,
  ydoc: Doc,
): Promise<SyncServerInfo> {
  if (!isTauriEnvironment()) {
    throw new Error('Local Wi-Fi hosting requires the Desktop version of Parchments. On mobile devices, you can join any hosted room using "Join Note" or scanning its QR code.');
  }

  const info: SyncServerInfo = await invoke('start_sync_server', {
    noteId,
    noteTitle,
  });

  // Wire Yjs to the local server (host also connects as a client to relay CRDT)
  _connectProvider(ydoc, info.wsUrl);

  // Register Tauri event listeners
  await _registerEventListeners();

  return info;
}

// ---------------------------------------------------------------------------
// Client-side: join an existing host session
// ---------------------------------------------------------------------------

/**
 * Join a host's session. `wsUrl` is decoded from the QR code or entered manually.
 * `deviceName` identifies this device on the host's peer list.
 * `mode` is "editor" (bidirectional) or "follower" (read-only).
 */
export async function joinLocalServer(
  ydoc: Doc,
  wsUrl: string,
  deviceName: string,
  mode: 'editor' | 'follower',
): Promise<void> {
  // The y-websocket provider sends the first message on open.
  // We need to inject our handshake BEFORE Yjs does — so we patch the URL
  // with a handshake query param (server reads it from the first text frame).
  const url = new URL(wsUrl);
  url.searchParams.set('device_name', deviceName);
  url.searchParams.set('mode', mode);

  _connectProvider(ydoc, url.toString());
}

// ---------------------------------------------------------------------------
// Shared: stop everything
// ---------------------------------------------------------------------------

export async function stopLocalSync(): Promise<void> {
  _clearTimers();

  if (_provider) {
    _provider.disconnect();
    _provider.destroy();
    _provider = null;
  }

  // Unregister Tauri events
  for (const fn of _unlisteners) fn();
  _unlisteners.length = 0;

  // Tell Rust to stop the server (host only — safe to call on client too)
  if (isTauriEnvironment()) {
    try {
      await invoke('stop_sync_server');
    } catch {
      // client-side will get a benign error; ignore it
    }
  }

  _reconnectAttempts = 0;
}

// ---------------------------------------------------------------------------
// Host: peer approval
// ---------------------------------------------------------------------------

export async function approvePeer(addr: string): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke('approve_connection', { addr });
}

export async function denyPeer(addr: string): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke('deny_connection', { addr });
}

export async function getPendingPeers(): Promise<PendingPeer[]> {
  if (!isTauriEnvironment()) return [];
  return invoke('get_pending_connection_requests');
}

export async function getSessionInfo(): Promise<LocalSyncSession | null> {
  if (!isTauriEnvironment()) return null;
  const session = await invoke<{
    port: number;
    code: string;
    noteId: string;
    noteTitle: string;
    peers: SyncPeer[];
  } | null>('get_sync_session');

  if (!session) return null;

  const ip: string | null = await invoke('get_local_ip');
  const info: SyncServerInfo = {
    port: session.port,
    token: '',          // token not re-exposed after start
    code: session.code,
    ip: ip ?? '127.0.0.1',
    wsUrl: `ws://${ip ?? '127.0.0.1'}:${session.port}`,
  };

  return { serverInfo: info, peers: session.peers };
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export function onPeerRequesting(cb: (peer: PendingPeer) => void) { _onPeerRequesting = cb; }
export function onPeerConnected(cb: (peer: Omit<SyncPeer, 'approved'>) => void) { _onPeerConnected = cb; }
export function onPeerDisconnected(cb: (addr: string) => void) { _onPeerDisconnected = cb; }
export function onStatusChange(cb: (status: 'connected' | 'connecting' | 'disconnected') => void) { _onStatusChange = cb; }

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _connectProvider(ydoc: Doc, wsUrl: string): void {
  if (_provider) {
    _provider.disconnect();
    _provider.destroy();
  }

  _provider = new WebsocketProvider(wsUrl, 'parchments-sync', ydoc, {
    connect: true,
    // Disable y-websocket's built-in awareness if we're in follower mode
    // (awareness is handled at the CRDT level; follower cannot push updates)
    WebSocketPolyfill: WebSocket,
  });

  _provider.on('status', (event: any) => {
    const status = event?.status;
    if (status === 'connected') {
      _reconnectAttempts = 0;
      _onStatusChange?.('connected');
      _startHeartbeat();
    } else if (status === 'connecting') {
      _onStatusChange?.('connecting');
    } else if (status === 'disconnected') {
      _onStatusChange?.('disconnected');
      _scheduleReconnect(wsUrl, ydoc);
    }
  });
}

function _startHeartbeat(): void {
  _clearTimers();
  _heartbeatTimer = setInterval(() => {
    if (_provider && _provider.wsconnected) {
      // y-websocket keeps connection alive on its own; this is a safety net
    } else {
      _onStatusChange?.('disconnected');
    }
  }, 3000);
}

function _scheduleReconnect(wsUrl: string, ydoc: Doc): void {
  if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[LocalSync] Max reconnect attempts reached. Giving up.');
    return;
  }
  const delay = Math.min(1000 * 2 ** _reconnectAttempts, 30_000);
  _reconnectAttempts++;
  _reconnectTimer = setTimeout(() => {
    console.log(`[LocalSync] Reconnect attempt ${_reconnectAttempts}…`);
    _connectProvider(ydoc, wsUrl);
  }, delay);
}

function _clearTimers(): void {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
}

async function _registerEventListeners(): Promise<void> {
  if (!isTauriEnvironment()) return;
  _unlisteners.push(
    await listen<PendingPeer>('sync:peer-requesting', (e) => {
      _onPeerRequesting?.(e.payload);
    }),
    await listen<Omit<SyncPeer, 'approved'>>('sync:peer-connected', (e) => {
      _onPeerConnected?.(e.payload);
    }),
    await listen<string>('sync:peer-disconnected', (e) => {
      _onPeerDisconnected?.(e.payload);
    }),
  );
}
