use crate::models::{Document, Settings};
use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;

fn get_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    Ok(app_dir.join("settings.json"))
}

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    // 尝试从设置中读取自定义路径
    if let Ok(settings) = get_settings_sync(app) {
        if let Some(custom_path) = settings.database_path {
            if !custom_path.is_empty() {
                let path = PathBuf::from(&custom_path);
                // 确保父目录存在
                if let Some(parent) = path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create database directory: {}", e))?;
                }
                return Ok(path);
            }
        }
    }
    
    // 默认路径
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    Ok(app_dir.join("ai_notes.db"))
}

fn get_settings_sync(app: &AppHandle) -> Result<Settings, String> {
    let settings_path = get_settings_path(app)?;
    
    println!("📋 Settings path: {:?}", settings_path);
    println!("📋 Settings file exists: {}", settings_path.exists());
    
    if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        
        println!("📋 Settings file content length: {}", content.len());
        
        // 先解析为 Value，然后手动提取字段（忽略未知字段）
        let value: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| {
                println!("❌ Failed to parse JSON: {}", e);
                format!("Failed to parse settings JSON: {}", e)
            })?;
        
        println!("📋 Parsed JSON successfully");
        println!("📋 ai_providers: {:?}", value["ai_providers"]);
        
        let ai_providers_result: Result<Vec<crate::models::AIProviderConfig>, _> = 
            serde_json::from_value(value["ai_providers"].clone());
        
        let ai_providers = match ai_providers_result {
            Ok(providers) => {
                println!("✅ Parsed {} AI providers", providers.len());
                providers
            },
            Err(e) => {
                println!("⚠️ Failed to parse ai_providers: {}, using defaults", e);
                Settings::default().ai_providers
            }
        };
        
        let settings = Settings {
            ai_providers,
            default_provider: value["default_provider"].as_str()
                .unwrap_or("poe").to_string(),
            default_model: value["default_model"].as_str()
                .unwrap_or("Claude-Sonnet-4.5").to_string(),
            theme: value["theme"].as_str()
                .unwrap_or("light").to_string(),
            auto_save: value["auto_save"].as_bool()
                .unwrap_or(true),
            auto_save_delay: value["auto_save_delay"].as_i64()
                .unwrap_or(2000) as i32,
            database_path: value["database_path"].as_str()
                .map(|s| s.to_string()),
        };
        
        println!("✅ Settings loaded successfully");
        println!("📋 POE key present: {}", settings.ai_providers.iter()
            .find(|p| p.provider_type == "poe")
            .and_then(|p| p.poe_api_key.as_ref())
            .map(|k| !k.is_empty())
            .unwrap_or(false));
        
        Ok(settings)
    } else {
        println!("⚠️ Settings file not found, using defaults");
        Ok(Settings::default())
    }
}

#[tauri::command]
pub async fn get_all_documents(app: AppHandle) -> Result<Vec<Document>, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 确保表存在
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create table: {}", e))?;
    
    // 安全地添加新字段 - 检查字段是否存在
    let check_column = |table: &str, column: &str| -> bool {
        conn.query_row(
            &format!("SELECT COUNT(*) FROM pragma_table_info('{}') WHERE name='{}'", table, column),
            [],
            |row| row.get::<_, i32>(0)
        ).unwrap_or(0) > 0
    };
    
    if !check_column("documents", "context_summary") {
        conn.execute("ALTER TABLE documents ADD COLUMN context_summary TEXT", [])
            .map_err(|e| format!("Failed to add context_summary: {}", e))?;
    }
    
    if !check_column("documents", "folder_id") {
        conn.execute("ALTER TABLE documents ADD COLUMN folder_id TEXT", [])
            .map_err(|e| format!("Failed to add folder_id: {}", e))?;
    }
    
    if !check_column("documents", "is_pinned") {
        conn.execute("ALTER TABLE documents ADD COLUMN is_pinned INTEGER DEFAULT 0", [])
            .map_err(|e| format!("Failed to add is_pinned: {}", e))?;
    }
    
    if !check_column("documents", "is_important") {
        conn.execute("ALTER TABLE documents ADD COLUMN is_important INTEGER DEFAULT 0", [])
            .map_err(|e| format!("Failed to add is_important: {}", e))?;
    }
    
    // 创建文档版本历史表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS document_versions (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            version_number INTEGER NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create versions table: {}", e))?;
    
    // 创建索引（如果不存在）
    conn.execute("CREATE INDEX IF NOT EXISTS idx_versions_document_id ON document_versions(document_id)", [])
        .map_err(|e| format!("Failed to create index: {}", e))?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_versions_created_at ON document_versions(created_at DESC)", [])
        .map_err(|e| format!("Failed to create index: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at, context_summary, folder_id, is_pinned, is_important FROM documents ORDER BY is_pinned DESC, updated_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let documents = stmt.query_map([], |row| {
        Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            context_summary: row.get(5)?,
            folder_id: row.get(6)?,
            is_pinned: row.get(7).ok(),
            is_important: row.get(8).ok(),
        })
    })
    .map_err(|e| format!("Failed to query documents: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect documents: {}", e))?;
    
    Ok(documents)
}

#[tauri::command]
pub async fn get_document(app: AppHandle, id: String) -> Result<Document, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at, context_summary, folder_id, is_pinned, is_important FROM documents WHERE id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let document = stmt.query_row([&id], |row| {
        Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            context_summary: row.get(5)?,
            folder_id: row.get(6)?,
            is_pinned: row.get(7).ok(),
            is_important: row.get(8).ok(),
        })
    })
    .map_err(|e| format!("Document not found: {}", e))?;
    
    Ok(document)
}

#[tauri::command]
pub async fn create_document(app: AppHandle, title: String, folder_id: Option<String>) -> Result<Document, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 确保表存在
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create table: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let empty_content = r#"{"type":"doc","content":[]}"#;
    
    conn.execute(
        "INSERT INTO documents (id, title, content, created_at, updated_at, context_summary, folder_id, is_pinned, is_important) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![&id, &title, empty_content, &now, &now, "", &folder_id, 0, 0],
    ).map_err(|e| format!("Failed to insert document: {}", e))?;
    
    Ok(Document {
        id,
        title,
        content: empty_content.to_string(),
        created_at: now,
        updated_at: now,
        context_summary: None,
        folder_id,
        is_pinned: Some(false),
        is_important: Some(false),
    })
}

#[tauri::command]
pub async fn update_document(app: AppHandle, id: String, content: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let now = chrono::Utc::now().timestamp();
    
    conn.execute(
        "UPDATE documents SET content = ?1, updated_at = ?2 WHERE id = ?3",
        [&content, &now.to_string(), &id],
    ).map_err(|e| format!("Failed to update document: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_document_title(app: AppHandle, id: String, title: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let now = chrono::Utc::now().timestamp();
    
    conn.execute(
        "UPDATE documents SET title = ?1, updated_at = ?2 WHERE id = ?3",
        [&title, &now.to_string(), &id],
    ).map_err(|e| format!("Failed to update document title: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn delete_document(app: AppHandle, id: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute(
        "DELETE FROM documents WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to delete document: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn search_documents(app: AppHandle, query: String) -> Result<Vec<Document>, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let search_pattern = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, title, content, created_at, updated_at, context_summary, folder_id, is_pinned, is_important FROM documents 
         WHERE title LIKE ?1 OR content LIKE ?1 
         ORDER BY is_pinned DESC, updated_at DESC"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let documents = stmt.query_map([&search_pattern], |row| {
        Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            context_summary: row.get(5)?,
            folder_id: row.get(6)?,
            is_pinned: row.get(7).ok(),
            is_important: row.get(8).ok(),
        })
    })
    .map_err(|e| format!("Failed to query documents: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect documents: {}", e))?;
    
    Ok(documents)
}

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<Settings, String> {
    get_settings_sync(&app)
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let settings_path = get_settings_path(&app)?;
    
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn reset_settings(app: AppHandle) -> Result<(), String> {
    let settings_path = get_settings_path(&app)?;
    
    // 删除设置文件，下次会使用默认值
    if settings_path.exists() {
        fs::remove_file(&settings_path)
            .map_err(|e| format!("Failed to delete settings: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn export_document(app: AppHandle, id: String, format: String) -> Result<String, String> {
    let document = get_document(app, id).await?;
    
    match format.as_str() {
        "json" => {
            serde_json::to_string_pretty(&document)
                .map_err(|e| format!("Failed to serialize document: {}", e))
        }
        _ => Err(format!("Unsupported format: {}", format))
    }
}

#[tauri::command]
pub async fn get_default_db_path(app: AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    Ok(app_dir.join("ai_notes.db").to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_current_db_path(app: AppHandle) -> Result<String, String> {
    let path = get_db_path(&app)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn update_context_summary(app: AppHandle, id: String, summary: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let now = chrono::Utc::now().timestamp();
    
    conn.execute(
        "UPDATE documents SET context_summary = ?1, updated_at = ?2 WHERE id = ?3",
        [&summary, &now.to_string(), &id],
    ).map_err(|e| format!("Failed to update context summary: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn change_database_path(app: AppHandle, new_path: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    // 获取当前数据库路径
    let old_path = get_db_path(&app)?;
    let new_path_buf = PathBuf::from(&new_path);
    
    // 确保新路径的父目录存在
    if let Some(parent) = new_path_buf.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // 如果旧数据库存在，复制到新位置
    if old_path.exists() && old_path != new_path_buf {
        // 先测试新路径是否可写
        let test_conn = Connection::open(&new_path_buf)
            .map_err(|e| format!("Cannot create database at new location: {}", e))?;
        test_conn.close()
            .map_err(|e| format!("Failed to close test connection: {:?}", e))?;
        
        // 复制数据库文件
        fs::copy(&old_path, &new_path_buf)
            .map_err(|e| format!("Failed to copy database: {}", e))?;
        
        println!("✅ Database copied from {:?} to {:?}", old_path, new_path_buf);
    } else if !new_path_buf.exists() {
        // 如果新位置不存在数据库，创建一个新的
        let conn = Connection::open(&new_path_buf)
            .map_err(|e| format!("Failed to create database: {}", e))?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| format!("Failed to create table: {}", e))?;
        
        println!("✅ New database created at {:?}", new_path_buf);
    }
    
    // 更新设置中的数据库路径
    let mut settings = get_settings_sync(&app)?;
    settings.database_path = Some(new_path);
    
    let settings_path = get_settings_path(&app)?;
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;
    
    Ok(())
}


// ==================== 文件导出命令 ====================

#[tauri::command]
pub async fn save_file(path: String, content: String) -> Result<(), String> {
    use std::fs;
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to save file: {}", e))?;
    
    Ok(())
}

// ==================== 文件夹相关命令 ====================

#[tauri::command]
pub async fn get_all_folders(app: AppHandle) -> Result<Vec<crate::models::Folder>, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, name, parent_id, created_at, updated_at FROM folders ORDER BY name ASC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let folders = stmt.query_map([], |row| {
        Ok(crate::models::Folder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })
    .map_err(|e| format!("Failed to query folders: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect folders: {}", e))?;
    
    Ok(folders)
}

#[tauri::command]
pub async fn create_folder(app: AppHandle, name: String, parent_id: Option<String>) -> Result<crate::models::Folder, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    
    conn.execute(
        "INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &name, &parent_id, &now, &now],
    ).map_err(|e| format!("Failed to insert folder: {}", e))?;
    
    Ok(crate::models::Folder {
        id,
        name,
        parent_id,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_folder(app: AppHandle, id: String, name: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let now = chrono::Utc::now().timestamp();
    
    conn.execute(
        "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&name, &now, &id],
    ).map_err(|e| format!("Failed to update folder: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn delete_folder(app: AppHandle, id: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 删除文件夹（级联删除子文件夹和文档）
    conn.execute("DELETE FROM folders WHERE id = ?1", rusqlite::params![&id])
        .map_err(|e| format!("Failed to delete folder: {}", e))?;
    
    // 将该文件夹下的文档移到根目录
    conn.execute("UPDATE documents SET folder_id = NULL WHERE folder_id = ?1", rusqlite::params![&id])
        .map_err(|e| format!("Failed to update documents: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn move_document(app: AppHandle, document_id: String, folder_id: Option<String>) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let now = chrono::Utc::now().timestamp();
    
    conn.execute(
        "UPDATE documents SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&folder_id, &now, &document_id],
    ).map_err(|e| format!("Failed to move document: {}", e))?;
    
    Ok(())
}

// ==================== 标签相关命令 ====================

#[tauri::command]
pub async fn get_tags_by_document(
    app: AppHandle,
    document_id: String,
) -> Result<Vec<crate::models::Tag>, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, document_id, text, selected_text, position, ai_block_id, color, created_at, updated_at FROM tags WHERE document_id = ? ORDER BY position ASC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let tags = stmt.query_map([&document_id], |row| {
        Ok(crate::models::Tag {
            id: row.get(0)?,
            document_id: row.get(1)?,
            text: row.get(2)?,
            selected_text: row.get(3)?,
            position: row.get(4)?,
            ai_block_id: row.get(5)?,
            color: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })
    .map_err(|e| format!("Failed to query tags: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect tags: {}", e))?;
    
    Ok(tags)
}

#[tauri::command]
pub async fn create_tag(
    app: AppHandle,
    document_id: String,
    text: String,
    selected_text: String,
    position: i32,
    ai_block_id: Option<String>,
    color: Option<String>,
) -> Result<crate::models::Tag, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    
    conn.execute(
        "INSERT INTO tags (id, document_id, text, selected_text, position, ai_block_id, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            &id,
            &document_id,
            &text,
            &selected_text,
            &position,
            &ai_block_id,
            &color,
            &now,
            &now,
        ],
    )
    .map_err(|e| format!("Failed to create tag: {}", e))?;
    
    Ok(crate::models::Tag {
        id,
        document_id,
        text,
        selected_text,
        position,
        ai_block_id,
        color,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_tag(
    app: AppHandle,
    id: String,
    text: String,
) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE tags SET text = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&text, &now, &id],
    )
    .map_err(|e| format!("Failed to update tag: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn delete_tag(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![&id])
        .map_err(|e| format!("Failed to delete tag: {}", e))?;
    
    Ok(())
}

// 语音识别命令
#[tauri::command]
pub async fn transcribe_audio(audio_path: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // 读取音频文件
    let audio_data = tokio::fs::read(&audio_path)
        .await
        .map_err(|e| format!("Failed to read audio file: {}", e))?;
    
    // 创建 multipart form
    let part = reqwest::multipart::Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to create multipart: {}", e))?;
    
    let form = reqwest::multipart::Form::new()
        .part("file", part);
    
    // 发送到本地 STT 服务
    let response = client
        .post("http://127.0.0.1:8765/transcribe")
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    if result["success"].as_bool().unwrap_or(false) {
        Ok(result["text"].as_str().unwrap_or("").to_string())
    } else {
        Err(result["error"].as_str().unwrap_or("Unknown error").to_string())
    }
}

// ==================== 语音服务管理 ====================

use std::process::{Child, Command};
use std::sync::Mutex;
use once_cell::sync::Lazy;

// 全局存储 Python 服务进程
static STT_SERVICE: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
pub async fn start_stt_service(app: AppHandle) -> Result<String, String> {
    let mut service = STT_SERVICE.lock().unwrap();
    
    // 如果服务已经在运行，直接返回
    if let Some(child) = service.as_mut() {
        if let Ok(None) = child.try_wait() {
            return Ok("Service already running".to_string());
        }
    }
    
    // 获取应用资源目录
    let resource_dir = app.path().resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;
    
    let stt_dir = resource_dir.join("stt-service");
    
    // 跨平台路径处理
    #[cfg(target_os = "windows")]
    let python_exe = stt_dir.join("venv").join("Scripts").join("python.exe");
    
    #[cfg(target_os = "macos")]
    let python_exe = stt_dir.join("venv").join("bin").join("python");
    
    #[cfg(target_os = "linux")]
    let python_exe = stt_dir.join("venv").join("bin").join("python");
    
    let server_py = stt_dir.join("server.py");
    
    // 检查文件是否存在
    if !server_py.exists() {
        return Err(format!("STT service not found at: {:?}", server_py));
    }
    
    // 启动 Python 服务
    let child = if python_exe.exists() {
        // 使用虚拟环境的 Python
        Command::new(&python_exe)
            .arg(&server_py)
            .current_dir(&stt_dir)
            .spawn()
            .map_err(|e| format!("Failed to start STT service: {}", e))?
    } else {
        // 使用系统 Python
        #[cfg(target_os = "windows")]
        let python_cmd = "python";
        
        #[cfg(not(target_os = "windows"))]
        let python_cmd = "python3";
        
        Command::new(python_cmd)
            .arg(&server_py)
            .current_dir(&stt_dir)
            .spawn()
            .map_err(|e| format!("Failed to start STT service: {}", e))?
    };
    
    *service = Some(child);
    
    Ok("STT service started".to_string())
}

#[tauri::command]
pub async fn stop_stt_service() -> Result<String, String> {
    let mut service = STT_SERVICE.lock().unwrap();
    
    if let Some(mut child) = service.take() {
        child.kill()
            .map_err(|e| format!("Failed to stop STT service: {}", e))?;
        Ok("STT service stopped".to_string())
    } else {
        Ok("STT service not running".to_string())
    }
}

#[tauri::command]
pub async fn check_stt_service() -> Result<bool, String> {
    // 检查服务是否响应
    let client = reqwest::Client::new();
    match client.get("http://127.0.0.1:8765/health")
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}


#[tauri::command]
pub async fn toggle_pin_document(app: AppHandle, id: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 切换置顶状态
    conn.execute(
        "UPDATE documents SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to toggle pin: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn toggle_important_document(app: AppHandle, id: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 切换重要标记
    conn.execute(
        "UPDATE documents SET is_important = CASE WHEN is_important = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to toggle important: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn save_document_version(app: AppHandle, document_id: String, content: String) -> Result<(), String> {
    use rusqlite::Connection;
    use uuid::Uuid;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 获取当前版本号
    let version_number: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = ?1",
        [&document_id],
        |row| row.get(0),
    ).unwrap_or(1);
    
    let id = Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    conn.execute(
        "INSERT INTO document_versions (id, document_id, content, created_at, version_number) VALUES (?1, ?2, ?3, ?4, ?5)",
        [&id, &document_id, &content, &now.to_string(), &version_number.to_string()],
    ).map_err(|e| format!("Failed to save version: {}", e))?;
    
    // 只保留最近20个版本
    conn.execute(
        "DELETE FROM document_versions WHERE document_id = ?1 AND version_number < (
            SELECT MAX(version_number) - 20 FROM document_versions WHERE document_id = ?1
        )",
        [&document_id],
    ).ok();
    
    Ok(())
}

#[tauri::command]
pub async fn get_document_versions(app: AppHandle, document_id: String) -> Result<Vec<crate::models::DocumentVersion>, String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, document_id, content, created_at, version_number FROM document_versions 
         WHERE document_id = ?1 ORDER BY version_number DESC LIMIT 20"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let versions = stmt.query_map([&document_id], |row| {
        Ok(crate::models::DocumentVersion {
            id: row.get(0)?,
            document_id: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            version_number: row.get(4)?,
        })
    })
    .map_err(|e| format!("Failed to query versions: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect versions: {}", e))?;
    
    Ok(versions)
}

#[tauri::command]
pub async fn restore_document_version(app: AppHandle, document_id: String, version_id: String) -> Result<(), String> {
    use rusqlite::Connection;
    
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 获取版本内容
    let content: String = conn.query_row(
        "SELECT content FROM document_versions WHERE id = ?1",
        [&version_id],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to get version: {}", e))?;
    
    // 更新文档
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    conn.execute(
        "UPDATE documents SET content = ?1, updated_at = ?2 WHERE id = ?3",
        [&content, &now.to_string(), &document_id],
    ).map_err(|e| format!("Failed to restore version: {}", e))?;
    
    Ok(())
}

// ==================== 备份相关命令 ====================

#[tauri::command]
pub async fn create_backup(app: AppHandle) -> Result<String, String> {
    use std::time::SystemTime;
    
    let db_path = get_db_path(&app)?;
    
    // 创建备份目录
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_dir = app_dir.join("backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    // 生成备份文件名（带时间戳）
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let backup_filename = format!("ai_notes_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    // 复制数据库文件
    fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn list_backups(app: AppHandle) -> Result<Vec<String>, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_dir = app_dir.join("backups");
    
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut backups = Vec::new();
    let entries = fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("db") {
            if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                backups.push(filename.to_string());
            }
        }
    }
    
    // 按时间戳排序（最新的在前）
    backups.sort_by(|a, b| b.cmp(a));
    
    Ok(backups)
}

#[tauri::command]
pub async fn restore_backup(app: AppHandle, backup_filename: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_path = app_dir.join("backups").join(&backup_filename);
    
    if !backup_path.exists() {
        return Err("Backup file not found".to_string());
    }
    
    let db_path = get_db_path(&app)?;
    
    // 在恢复前创建当前数据库的备份
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let safety_backup = db_path.parent().unwrap().join(format!("ai_notes_before_restore_{}.db", timestamp));
    fs::copy(&db_path, &safety_backup)
        .map_err(|e| format!("Failed to create safety backup: {}", e))?;
    
    // 恢复备份
    fs::copy(&backup_path, &db_path)
        .map_err(|e| format!("Failed to restore backup: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn delete_backup(app: AppHandle, backup_filename: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_path = app_dir.join("backups").join(&backup_filename);
    
    if backup_path.exists() {
        fs::remove_file(&backup_path)
            .map_err(|e| format!("Failed to delete backup: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn export_database(app: AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    
    // 使用 tauri-plugin-dialog
    use tauri_plugin_dialog::DialogExt;
    
    let save_path = app.dialog()
        .file()
        .set_title("导出数据库")
        .add_filter("数据库文件", &["db"])
        .set_file_name("ai_notes_export.db")
        .blocking_save_file();
    
    if let Some(file_path) = save_path {
        let path_buf = file_path.into_path().map_err(|e| format!("Failed to get path: {:?}", e))?;
        fs::copy(&db_path, &path_buf)
            .map_err(|e| format!("Failed to export database: {}", e))?;
        Ok(path_buf.to_string_lossy().to_string())
    } else {
        Err("Export cancelled".to_string())
    }
}

#[tauri::command]
pub async fn import_database(app: AppHandle) -> Result<(), String> {
    // 使用 tauri-plugin-dialog
    use tauri_plugin_dialog::DialogExt;
    
    // 打开文件选择对话框
    let import_path = app.dialog()
        .file()
        .set_title("导入数据库")
        .add_filter("数据库文件", &["db"])
        .blocking_pick_file();
    
    if let Some(file_path) = import_path {
        let path_buf = file_path.into_path().map_err(|e| format!("Failed to get path: {:?}", e))?;
        let db_path = get_db_path(&app)?;
        
        // 创建当前数据库的备份
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let backup_path = db_path.parent().unwrap().join(format!("ai_notes_before_import_{}.db", timestamp));
        fs::copy(&db_path, &backup_path)
            .map_err(|e| format!("Failed to create backup before import: {}", e))?;
        
        // 导入数据库
        fs::copy(&path_buf, &db_path)
            .map_err(|e| format!("Failed to import database: {}", e))?;
        
        Ok(())
    } else {
        Err("Import cancelled".to_string())
    }
}

#[tauri::command]
pub async fn get_backup_info(app: AppHandle) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_dir = app_dir.join("backups");
    
    let mut total_size: u64 = 0;
    let mut backup_count = 0;
    
    if backup_dir.exists() {
        let entries = fs::read_dir(&backup_dir)
            .map_err(|e| format!("Failed to read backup directory: {}", e))?;
        
        for entry in entries {
            if let Ok(entry) = entry {
                if let Ok(metadata) = entry.metadata() {
                    if entry.path().extension().and_then(|s| s.to_str()) == Some("db") {
                        total_size += metadata.len();
                        backup_count += 1;
                    }
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "backup_count": backup_count,
        "total_size": total_size,
        "backup_dir": backup_dir.to_string_lossy().to_string(),
    }))
}

#[tauri::command]
pub async fn get_database_hash(app: AppHandle) -> Result<String, String> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let db_path = get_db_path(&app)?;
    
    if !db_path.exists() {
        return Ok(String::new());
    }
    
    let metadata = fs::metadata(&db_path)
        .map_err(|e| format!("Failed to get database metadata: {}", e))?;
    
    let mut hasher = DefaultHasher::new();
    metadata.len().hash(&mut hasher);
    metadata.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
        .hash(&mut hasher);
    
    Ok(format!("{:x}", hasher.finish()))
}

#[tauri::command]
pub async fn clean_old_backups(app: AppHandle, keep_count: usize) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_dir = app_dir.join("backups");
    
    if !backup_dir.exists() {
        return Ok(());
    }
    
    let mut backups: Vec<(String, std::time::SystemTime)> = Vec::new();
    let entries = fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("db") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                            backups.push((filename.to_string(), modified));
                        }
                    }
                }
            }
        }
    }
    
    // 按时间排序（最新的在前）
    backups.sort_by(|a, b| b.1.cmp(&a.1));
    
    // 删除超过保留数量的备份
    for (filename, _) in backups.iter().skip(keep_count) {
        let path = backup_dir.join(filename);
        if let Err(e) = fs::remove_file(&path) {
            eprintln!("Failed to delete old backup {}: {}", filename, e);
        } else {
            println!("🗑️ Deleted old backup: {}", filename);
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn open_backup_folder(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let backup_dir = app_dir.join("backups");
    
    // 确保目录存在
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    // 打开文件夹
    app.opener()
        .open_path(backup_dir.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("Failed to open backup folder: {}", e))?;
    
    Ok(())
}
