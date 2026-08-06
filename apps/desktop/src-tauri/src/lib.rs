mod auth_keychain;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            auth_keychain::delete_session_token,
            auth_keychain::load_session_token,
            auth_keychain::save_session_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
