use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, accept_hdr_async, tungstenite::Message};
use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
use rand::Rng;

/// Represents a single active pairing session on the host.
#[derive(Debug, Clone)]
pub struct SyncSession {
    pub port: u16,
    pub token: String,
    pub code: String,           // 6-digit code for desktop-to-desktop
    pub note_id: String,
    pub note_title: String,
    pub peers: Vec<PeerInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PeerInfo {
    pub addr: String,
    pub device_name: String,
    pub mode: PeerMode,         // "editor" | "follower"
    pub approved: bool,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PeerMode {
    Editor,
    Follower,
}

/// Pending connection waiting for host approval.
#[derive(Debug, Clone, serde::Serialize)]
pub struct PendingPeer {
    pub addr: String,
    pub device_name: String,
    pub mode: PeerMode,
}

/// State shared between the sync server and Tauri command handlers.
pub struct SyncState {
    pub session: Option<SyncSession>,
    pub pending: Vec<PendingPeer>,
    /// Broadcast channel for approved Yjs update bytes.
    pub tx: Option<broadcast::Sender<Vec<u8>>>,
    /// Shutdown signal sender.
    pub shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl Default for SyncState {
    fn default() -> Self {
        Self {
            session: None,
            pending: Vec::new(),
            tx: None,
            shutdown_tx: None,
        }
    }
}

pub type SharedSyncState = Arc<Mutex<SyncState>>;

/// Discover the primary local-network IP address of this machine.
/// Uses a zero-packet UDP connect trick (no data is actually sent).
pub fn get_local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}

/// Generate a cryptographically random 6-digit pairing code like "839-204".
fn generate_code() -> String {
    let mut rng = rand::thread_rng();
    let n: u32 = rng.gen_range(100_000..999_999);
    format!("{}-{}", &n.to_string()[..3], &n.to_string()[3..])
}

/// Generate a 32-character secure session token.
fn generate_token() -> String {
    let rng = rand::thread_rng();
    rng.sample_iter(&rand::distributions::Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

/// Start the embedded local WebSocket sync server.
///
/// Returns (port, token, code) that the frontend uses to build the QR code and
/// display the 6-digit pairing code.
pub async fn start_server(
    state: SharedSyncState,
    note_id: String,
    note_title: String,
    app_handle: tauri::AppHandle,
) -> Result<(u16, String, String), String> {
    let mut s = state.lock().unwrap();

    // If already running, return existing session info
    if let Some(session) = &s.session {
        return Ok((session.port, session.token.clone(), session.code.clone()));
    }

    let code = generate_code();
    let token = generate_token();
    let (tx, _rx) = broadcast::channel::<Vec<u8>>(512);
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    // Bind to preferred port 48921 (falls back to 48922..48941 if busy)
    let listener = bind_port(48921).await?;
    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    s.session = Some(SyncSession {
        port,
        token: token.clone(),
        code: code.clone(),
        note_id,
        note_title,
        peers: Vec::new(),
    });
    s.pending = Vec::new();
    s.tx = Some(tx.clone());
    s.shutdown_tx = Some(shutdown_tx);

    let state_clone = state.clone();
    let token_clone = token.clone();
    let app_handle_clone = app_handle.clone();

    tokio::spawn(async move {
        run_server(
            listener,
            state_clone,
            token_clone,
            tx,
            shutdown_rx,
            app_handle_clone,
        )
        .await;
    });

    Ok((port, token, code))
}

/// Bind to the preferred port with automatic fallback.
async fn bind_port(preferred: u16) -> Result<TcpListener, String> {
    for port in preferred..preferred + 20 {
        let addr = format!("0.0.0.0:{}", port);
        if let Ok(listener) = TcpListener::bind(&addr).await {
            log::info!("[SyncServer] Listening on port {}", port);
            return Ok(listener);
        }
    }
    Err(format!(
        "Could not bind any port in range {}–{}",
        preferred,
        preferred + 20
    ))
}

/// Main server loop.
async fn run_server(
    listener: TcpListener,
    state: SharedSyncState,
    expected_token: String,
    tx: broadcast::Sender<Vec<u8>>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    app_handle: tauri::AppHandle,
) {
    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, addr)) => {
                        let state_c = state.clone();
                        let token_c = expected_token.clone();
                        let tx_c = tx.clone();
                        let app_c = app_handle.clone();
                        tokio::spawn(async move {
                            handle_connection(stream, addr, state_c, token_c, tx_c, app_c).await;
                        });
                    }
                    Err(e) => {
                        log::error!("[SyncServer] Accept error: {}", e);
                        break;
                    }
                }
            }
            _ = &mut shutdown_rx => {
                log::info!("[SyncServer] Received shutdown signal. Stopping.");
                break;
            }
        }
    }
}

/// Handshake message sent by client when first connecting.
#[derive(Debug, serde::Deserialize)]
struct HandshakeMsg {
    token: String,
    device_name: String,
    mode: PeerMode,
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    state: SharedSyncState,
    expected_token: String,
    tx: broadcast::Sender<Vec<u8>>,
    app_handle: tauri::AppHandle,
) {
    let query_capture = Arc::new(Mutex::new(None::<String>));
    let q_clone = query_capture.clone();

    let ws_stream = match accept_hdr_async(stream, move |req: &Request, resp: Response| {
        if let Some(q) = req.uri().query() {
            *q_clone.lock().unwrap() = Some(q.to_string());
        }
        Ok(resp)
    })
    .await
    {
        Ok(ws) => ws,
        Err(e) => {
            log::warn!("[SyncServer] WebSocket handshake failed {}: {}", addr, e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Check if handshake params were provided in the upgrade URL query string
    let captured_query = query_capture.lock().unwrap().clone();
    let mut token_from_query = String::new();
    let mut device_name_from_query = "Remote Device".to_string();
    let mut mode_from_query = PeerMode::Follower;
    let mut has_query_handshake = false;

    if let Some(q) = captured_query {
        for param in q.split('&') {
            let mut kv = param.splitn(2, '=');
            let k = kv.next().unwrap_or("");
            let v = kv.next().unwrap_or("");
            let val = v.replace("%20", " ").replace('+', " ");
            match k {
                "token" => {
                    token_from_query = val;
                    has_query_handshake = true;
                }
                "device_name" => device_name_from_query = val,
                "mode" => {
                    if val.to_lowercase() == "editor" {
                        mode_from_query = PeerMode::Editor;
                    }
                }
                _ => {}
            }
        }
    }

    let handshake = if has_query_handshake {
        HandshakeMsg {
            token: token_from_query,
            device_name: device_name_from_query,
            mode: mode_from_query,
        }
    } else {
        // Fallback: expect handshake as first message
        match ws_receiver.next().await {
            Some(Ok(Message::Text(text))) => match serde_json::from_str(&text) {
                Ok(h) => h,
                Err(_) => {
                    log::warn!("[SyncServer] Invalid handshake JSON from {}", addr);
                    let _ = ws_sender.send(Message::Text("{\"error\":\"bad_handshake\"}".into())).await;
                    return;
                }
            },
            _ => {
                log::warn!("[SyncServer] No handshake message from {}", addr);
                return;
            }
        }
    };

    // --- Token verification ---
    if handshake.token != expected_token {
        log::warn!("[SyncServer] Invalid token from {}", addr);
        let _ = ws_sender.send(Message::Text("{\"error\":\"invalid_token\"}".into())).await;
        return;
    }

    // Host connection loopback auto-approval
    let is_host_loopback = addr.ip().is_loopback();

    let approved = if is_host_loopback {
        true
    } else {
        // Add to pending and emit event to frontend for approval
        {
            let mut s = state.lock().unwrap();
            s.pending.push(PendingPeer {
                addr: addr.to_string(),
                device_name: handshake.device_name.clone(),
                mode: handshake.mode,
            });
        }

        // Fire Tauri event to prompt host with "Allow / Deny" dialog
        let _ = app_handle.emit("sync:peer-requesting", serde_json::json!({
            "addr": addr.to_string(),
            "device_name": &handshake.device_name,
            "mode": &handshake.mode,
        }));

        // Wait for approval or timeout (60 seconds)
        tokio::time::timeout(
            std::time::Duration::from_secs(60),
            wait_for_approval(state.clone(), addr.to_string()),
        )
        .await
        .unwrap_or(false)
    };

    if !approved {
        let _ = ws_sender.send(Message::Text("{\"error\":\"denied\"}".into())).await;
        log::info!("[SyncServer] Connection from {} was denied or timed out.", addr);
        return;
    }

    if !is_host_loopback {
        // Notify frontend that a new peer is connected
        let _ = app_handle.emit("sync:peer-connected", serde_json::json!({
            "addr": addr.to_string(),
            "device_name": &handshake.device_name,
            "mode": &handshake.mode,
        }));
    }

    log::info!("[SyncServer] Peer {} ({:?}) approved and connected.", addr, handshake.mode);

    // --- Yjs relay loop ---
    let mut rx = tx.subscribe();

    loop {
        tokio::select! {
            // Forward incoming Yjs update bytes only if peer is an authorized editor
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Binary(data))) => {
                        if handshake.mode == PeerMode::Editor || is_host_loopback {
                            let _ = tx.send(data);
                        } else {
                            log::warn!("[SyncServer] Rejected binary update from read-only follower peer {}", addr);
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        log::info!("[SyncServer] Peer {} disconnected.", addr);
                        break;
                    }
                    _ => {}
                }
            }
            // Forward broadcast updates from other peers to this peer
            broadcast_msg = rx.recv() => {
                match broadcast_msg {
                    Ok(data) => {
                        if ws_sender.send(Message::Binary(data)).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        log::warn!("[SyncServer] Peer {} lagged by {} updates", addr, skipped);
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        break;
                    }
                }
            }
        }
    }

    // Remove from peers list and notify frontend
    {
        let mut s = state.lock().unwrap();
        if let Some(session) = s.session.as_mut() {
            session.peers.retain(|p| p.addr != addr.to_string());
        }
        s.pending.retain(|p| p.addr != addr.to_string());
    }
    let _ = app_handle.emit("sync:peer-disconnected", addr.to_string());
}

/// Polls state waiting for the host frontend to call `approve_peer` or `deny_peer`.
/// Returns true if approved, false if denied or timed out.
async fn wait_for_approval(state: SharedSyncState, addr: String) -> bool {
    loop {
        {
            let s = state.lock().unwrap();
            // Check if approved — peer moved from pending to session.peers
            if let Some(session) = &s.session {
                if let Some(peer) = session.peers.iter().find(|p| p.addr == addr) {
                    return peer.approved;
                }
            }
            // Check if removed from pending without being added (denied)
            if !s.pending.iter().any(|p| p.addr == addr) {
                return false;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }
}

/// Stop the server cleanly.
pub fn stop_server(state: &SharedSyncState) {
    let mut s = state.lock().unwrap();
    if let Some(tx) = s.shutdown_tx.take() {
        let _ = tx.send(());
    }
    s.session = None;
    s.pending = Vec::new();
    s.tx = None;
}
