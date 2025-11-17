use rusqlite::Connection;
use std::path::PathBuf;

pub fn run_migrations(db_path: &PathBuf) -> Result<(), String> {
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 检查是否已有 context_summary 列
    let has_column: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('documents') WHERE name='context_summary'",
            [],
            |row| row.get(0),
        )
        .map(|count: i32| count > 0)
        .unwrap_or(false);
    
    if !has_column {
        println!("🔧 添加 context_summary 列到 documents 表...");
        conn.execute(
            "ALTER TABLE documents ADD COLUMN context_summary TEXT",
            [],
        )
        .map_err(|e| format!("Failed to add context_summary column: {}", e))?;
        println!("✅ context_summary 列添加成功");
    } else {
        println!("✓ context_summary 列已存在");
    }
    
    // 检查是否已有 tags 表
    let has_tags_table: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tags'",
            [],
            |row| row.get(0),
        )
        .map(|count: i32| count > 0)
        .unwrap_or(false);
    
    if !has_tags_table {
        println!("🔧 创建 tags 表...");
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                text TEXT NOT NULL,
                selected_text TEXT NOT NULL,
                position INTEGER NOT NULL,
                ai_block_id TEXT,
                color TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )",
            [],
        )
        .map_err(|e| format!("Failed to create tags table: {}", e))?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_document_id ON tags(document_id)",
            [],
        )
        .map_err(|e| format!("Failed to create index: {}", e))?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tags_position ON tags(position)",
            [],
        )
        .map_err(|e| format!("Failed to create index: {}", e))?;
        
        println!("✅ tags 表创建成功");
    } else {
        println!("✓ tags 表已存在");
        
        // 检查是否需要添加 ai_block_id 列
        let has_ai_block_id: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('tags') WHERE name='ai_block_id'",
                [],
                |row| row.get(0),
            )
            .map(|count: i32| count > 0)
            .unwrap_or(false);
        
        if !has_ai_block_id {
            println!("🔧 添加 ai_block_id 列到 tags 表...");
            conn.execute(
                "ALTER TABLE tags ADD COLUMN ai_block_id TEXT",
                [],
            )
            .map_err(|e| format!("Failed to add ai_block_id column: {}", e))?;
            println!("✅ ai_block_id 列添加成功");
        }
    }
    
    // 检查是否已有 folders 表
    let has_folders_table: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='folders'",
            [],
            |row| row.get(0),
        )
        .map(|count: i32| count > 0)
        .unwrap_or(false);
    
    if !has_folders_table {
        println!("🔧 创建 folders 表...");
        conn.execute(
            "CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
            )",
            [],
        )
        .map_err(|e| format!("Failed to create folders table: {}", e))?;
        
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)",
            [],
        )
        .map_err(|e| format!("Failed to create index: {}", e))?;
        
        println!("✅ folders 表创建成功");
    } else {
        println!("✓ folders 表已存在");
    }
    
    // 检查 documents 表是否有 folder_id 列
    let has_folder_id: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('documents') WHERE name='folder_id'",
            [],
            |row| row.get(0),
        )
        .map(|count: i32| count > 0)
        .unwrap_or(false);
    
    if !has_folder_id {
        println!("🔧 添加 folder_id 列到 documents 表...");
        conn.execute(
            "ALTER TABLE documents ADD COLUMN folder_id TEXT",
            [],
        )
        .map_err(|e| format!("Failed to add folder_id column: {}", e))?;
        println!("✅ folder_id 列添加成功");
    } else {
        println!("✓ folder_id 列已存在");
    }
    
    Ok(())
}
