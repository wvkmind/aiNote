mod models;
mod db;
mod commands;
mod migrate;
mod voice_service;

use commands::*;
use voice_service::VoiceService;
use tauri::Manager;

#[tauri::command]
async fn get_voice_service_status(
    state: tauri::State<'_, VoiceService>,
) -> Result<bool, String> {
    Ok(state.check_health().await)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let voice_service = VoiceService::new();

    tauri::Builder::default()
        .manage(voice_service)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ai_notes.db", db::get_migrations())
                .build(),
        )
        .setup(|app| {
            // 运行数据库迁移
            match commands::get_db_path(&app.handle()) {
                Ok(db_path) => {
                    if let Err(e) = migrate::run_migrations(&db_path) {
                        eprintln!("❌ 数据库迁移失败: {}", e);
                    }
                }
                Err(e) => {
                    eprintln!("❌ 获取数据库路径失败: {}", e);
                }
            }
            
            println!("✅ AI 笔记系统已启动");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_all_documents,
            get_document,
            create_document,
            update_document,
            update_document_title,
            update_context_summary,
            delete_document,
            search_documents,
            get_settings,
            update_settings,
            reset_settings,
            export_document,
            get_default_db_path,
            get_current_db_path,
            change_database_path,
            save_file,
            get_all_folders,
            create_folder,
            update_folder,
            delete_folder,
            move_document,
            get_tags_by_document,
            create_tag,
            update_tag,
            delete_tag,
            transcribe_audio,
            start_stt_service,
            stop_stt_service,
            check_stt_service,
            get_voice_service_status,
            toggle_pin_document,
            toggle_important_document,
            save_document_version,
            get_document_versions,
            restore_document_version,
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
            export_database,
            import_database,
            get_backup_info,
            get_database_hash,
            clean_old_backups,
            open_backup_folder,
        ])

        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
