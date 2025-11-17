use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: "
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                
                CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add context_summary to documents",
            sql: "
                ALTER TABLE documents ADD COLUMN context_summary TEXT;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create tags table",
            sql: "
                CREATE TABLE IF NOT EXISTS tags (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    selected_text TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    color TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_tags_document_id ON tags(document_id);
                CREATE INDEX IF NOT EXISTS idx_tags_position ON tags(position);
            ",
            kind: MigrationKind::Up,
        },
    ]
}
