mod sync_server;

use sync_server::{SharedSyncState, SyncState};
use std::sync::{Arc, Mutex};

// --------------------------------------------------------------------------
// Tauri commands — Local Sync Server
// --------------------------------------------------------------------------

#[tauri::command]
async fn start_sync_server(
    state: tauri::State<'_, SharedSyncState>,
    app_handle: tauri::AppHandle,
    note_id: String,
    note_title: String,
) -> Result<serde_json::Value, String> {
    let (port, token, code) =
        sync_server::start_server(state.inner().clone(), note_id, note_title, app_handle).await?;

    let ip = sync_server::get_local_ip().unwrap_or_else(|| "127.0.0.1".to_string());

    Ok(serde_json::json!({
        "port": port,
        "token": token,
        "code": code,
        "ip": ip,
        "wsUrl": format!("ws://{}:{}?token={}", ip, port, token)
    }))
}

#[tauri::command]
async fn stop_sync_server(state: tauri::State<'_, SharedSyncState>) -> Result<(), String> {
    sync_server::stop_server(state.inner());
    Ok(())
}

#[tauri::command]
fn get_local_ip() -> Option<String> {
    sync_server::get_local_ip()
}

#[tauri::command]
fn get_pending_connection_requests(
    state: tauri::State<'_, SharedSyncState>,
) -> Vec<sync_server::PendingPeer> {
    let s = state.lock().unwrap();
    s.pending.clone()
}

#[tauri::command]
fn approve_connection(
    state: tauri::State<'_, SharedSyncState>,
    addr: String,
) -> Result<(), String> {
    let mut s = state.lock().unwrap();
    // Move peer from pending to approved session peers
    if let Some(idx) = s.pending.iter().position(|p| p.addr == addr) {
        let pending = s.pending.remove(idx);
        if let Some(session) = s.session.as_mut() {
            session.peers.push(sync_server::PeerInfo {
                addr: pending.addr,
                device_name: pending.device_name,
                mode: pending.mode,
                approved: true,
            });
        }
        Ok(())
    } else {
        Err(format!("Peer {} not in pending list", addr))
    }
}

#[tauri::command]
fn deny_connection(
    state: tauri::State<'_, SharedSyncState>,
    addr: String,
) -> Result<(), String> {
    let mut s = state.lock().unwrap();
    s.pending.retain(|p| p.addr != addr);
    Ok(())
}

#[tauri::command]
fn get_sync_session(
    state: tauri::State<'_, SharedSyncState>,
) -> Option<serde_json::Value> {
    let s = state.lock().unwrap();
    s.session.as_ref().map(|session| {
        serde_json::json!({
            "port": session.port,
            "code": session.code,
            "noteId": session.note_id,
            "noteTitle": session.note_title,
            "peers": session.peers,
        })
    })
}

// --------------------------------------------------------------------------
// Tauri commands — System & Performance Acceleration Engine
// --------------------------------------------------------------------------

#[tauri::command]
fn get_system_engine_info() -> serde_json::Value {
    let cores = std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(1);

    serde_json::json!({
        "engine": "Rust Native Core",
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "cpu_cores": cores,
        "edition": "2021",
        "status": "ready"
    })
}

#[tauri::command]
fn fast_text_search_native(
    corpus: Vec<String>,
    query: String,
    case_sensitive: bool,
) -> Vec<usize> {
    let search_term = if case_sensitive {
        query
    } else {
        query.to_lowercase()
    };

    corpus
        .iter()
        .enumerate()
        .filter_map(|(idx, text)| {
            let matches = if case_sensitive {
                text.contains(&search_term)
            } else {
                text.to_lowercase().contains(&search_term)
            };
            if matches { Some(idx) } else { None }
        })
        .collect()
}

#[derive(serde::Deserialize)]
pub struct VerseSearchQuery {
    pub corpus: Vec<String>,
    pub terms: Vec<String>,
    pub match_all: bool,
}

#[tauri::command]
fn native_search_verses(query: VerseSearchQuery) -> Vec<usize> {
    let lower_terms: Vec<String> = query.terms.iter().map(|t| t.to_lowercase()).collect();
    if lower_terms.is_empty() {
        return Vec::new();
    }

    query.corpus
        .iter()
        .enumerate()
        .filter_map(|(idx, text)| {
            let lower_text = text.to_lowercase();
            let matches = if query.match_all {
                lower_terms.iter().all(|term| lower_text.contains(term))
            } else {
                lower_terms.iter().any(|term| lower_text.contains(term))
            };
            if matches { Some(idx) } else { None }
        })
        .collect()
}

#[tauri::command]
fn native_concordance_lookup(keys: Vec<String>, target: String) -> Vec<usize> {
    let target_clean = target.trim().to_uppercase();
    keys.iter()
        .enumerate()
        .filter_map(|(idx, k)| {
            if k.trim().to_uppercase() == target_clean {
                Some(idx)
            } else {
                None
            }
        })
        .collect()
}

#[tauri::command]
fn native_transcribe_chunk(audio: Vec<f32>, _high_accuracy: bool) -> String {
    if audio.is_empty() {
        return String::new();
    }
    // Returns empty to allow seamless client worker or browser STT processing
    String::new()
}

#[tauri::command]
fn get_sync_document_state(
    state: tauri::State<'_, SharedSyncState>,
) -> serde_json::Value {
    let s = state.lock().unwrap();
    serde_json::json!({
        "active": s.session.is_some(),
        "peer_count": s.session.as_ref().map(|sess| sess.peers.len()).unwrap_or(0),
        "pending_count": s.pending.len(),
        "server_port": s.session.as_ref().map(|sess| sess.port).unwrap_or(0)
    })
}

// --------------------------------------------------------------------------
// Tauri commands — External links (update downloads, release notes)
// --------------------------------------------------------------------------

/// Opens an allow-listed HTTPS URL in the user's default browser.
/// WebViews ignore `target="_blank"`, so update "Download" links did nothing on desktop.
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    const ALLOWED_PREFIXES: [&str; 3] = [
        "https://github.com/patrickudo2004/parchments",
        "https://api.github.com/repos/patrickudo2004/parchments",
        "https://parchments.vercel.app",
    ];
    if !ALLOWED_PREFIXES.iter().any(|p| url.starts_with(p)) {
        return Err("URL not permitted".into());
    }
    if url.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'' || c == '&' || c == '|' || c == '^') {
        return Err("URL contains disallowed characters".into());
    }

    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("rundll32")
        .arg("url.dll,FileProtocolHandler")
        .arg(&url)
        .spawn();
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open").arg(&url).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let result = std::process::Command::new("xdg-open").arg(&url).spawn();

    result.map(|_| ()).map_err(|e| e.to_string())
}

// --------------------------------------------------------------------------
// App entry point
// --------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sync_state: SharedSyncState = Arc::new(Mutex::new(SyncState::default()));

    tauri::Builder::default()
        .manage(sync_state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_sync_server,
            stop_sync_server,
            get_local_ip,
            get_pending_connection_requests,
            approve_connection,
            deny_connection,
            get_sync_session,
            get_system_engine_info,
            fast_text_search_native,
            native_search_verses,
            native_concordance_lookup,
            native_transcribe_chunk,
            get_sync_document_state,
            open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
