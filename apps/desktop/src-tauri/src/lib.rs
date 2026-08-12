mod anki_delivery;
mod auth_keychain;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let state = anki_delivery::NativeDeliveryState::initialize(app_data_dir)?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            anki_delivery::enqueue_anki_delivery,
            anki_delivery::get_anki_catalog,
            anki_delivery::get_anki_status,
            anki_delivery::list_anki_deliveries,
            anki_delivery::load_anki_profile,
            anki_delivery::mark_anki_delivery_pending,
            anki_delivery::mark_anki_delivery_sent_synced,
            anki_delivery::process_anki_deliveries,
            anki_delivery::save_anki_profile,
            auth_keychain::delete_session_token,
            auth_keychain::load_session_token,
            auth_keychain::save_session_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
