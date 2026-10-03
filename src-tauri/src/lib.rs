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
// App entry point
// --------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sync_state: SharedSyncState = Arc::new(Mutex::new(SyncState::default()));

    tauri::Builder::default()
        .manage(sync_state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
