use std::net::TcpListener;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State, WindowEvent};

pub struct BackendState {
    pub port: Mutex<u16>,
    pub child_process: Mutex<Option<Child>>,
    pub is_ready: Mutex<bool>,
}

fn find_available_port() -> u16 {
    if let Ok(listener) = TcpListener::bind("127.0.0.1:0") {
        if let Ok(addr) = listener.local_addr() {
            return addr.port();
        }
    }
    8000
}

#[tauri::command]
fn get_backend_url(state: State<BackendState>) -> Result<String, String> {
    let port = *state.port.lock().unwrap();
    let is_ready = *state.is_ready.lock().unwrap();
    if is_ready {
        Ok(format!("http://127.0.0.1:{}", port))
    } else {
        Err("Backend is still initializing".to_string())
    }
}

#[tauri::command]
fn get_backend_status(state: State<BackendState>) -> bool {
    *state.is_ready.lock().unwrap()
}

#[tauri::command]
async fn restart_backend(state: State<"_, BackendState>, app: AppHandle) -> Result<String, String> {
    {
        let mut child_guard = state.child_process.lock().unwrap();
        if let Some(mut child) = child_guard.take() {
            let _ = child.kill();
        }
        *state.is_ready.lock().unwrap() = false;
    }

    let port = find_available_port();
    *state.port.lock().unwrap() = port;

    start_backend_process(&state, port, &app)?;
    wait_for_health_check(&state, port).await?;

    Ok(format!("http://127.0.0.1:{}", port))
}

fn start_backend_process(
    state: &BackendState,
    port: u16,
    _app: &AppHandle,
) -> Result<(), String> {
    let child = Command::new("binaries/memeasy-backend-x86_64-pc-windows-msvc.exe")
        .arg("serve")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string())
        .spawn()
        .map_err(|e| format!("Failed to launch backend sidecar: {}", e))?;

    let mut guard = state.child_process.lock().unwrap();
    *guard = Some(child);
    Ok(())
}

async fn wait_for_health_check(state: &BackendState, port: u16) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(800))
        .build()
        .unwrap();

    let health_url = format!("http://127.0.0.1:{}/api/health", port);
    let start_time = std::time::Instant::now();
    let max_timeout = Duration::from_secs(15);

    while start_time.elapsed() < max_timeout {
        if let Ok(res) = client.get(&health_url).send().await {
            if res.status().is_success() {
                *state.is_ready.lock().unwrap() = true;
                return Ok(());
            }
        }
        tokio::time::sleep(Duration::from_millis(300)).await;
    }

    Err("Backend health check timed out after 15s".to_string())
}

pub fn run() {
    let port = find_available_port();
    let backend_state = BackendState {
        port: Mutex::new(port),
        child_process: Mutex::new(None),
        is_ready: Mutex::new(false),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .manage(backend_state)
        .invoke_handler(tauri::generate_handler![
            get_backend_url,
            get_backend_status,
            restart_backend
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state: State<BackendState> = handle.state();
                let p = *state.port.lock().unwrap();
                if let Err(e) = start_backend_process(&state, p, &handle) {
                    eprintln!("[MEMEASY] Backend spawn warning: {}", e);
                }
                let _ = wait_for_health_check(&state, p).await;
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                let state: State<BackendState> = window.state();
                if let Some(mut child) = state.child_process.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running MEMEASY application");
}
