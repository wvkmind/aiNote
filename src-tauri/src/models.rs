use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub context_summary: Option<String>,  // 上下文总结历史
    pub folder_id: Option<String>,  // 所属文件夹ID
    pub is_pinned: Option<bool>,  // 是否置顶
    pub is_important: Option<bool>,  // 是否标记为重要
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DocumentVersion {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub created_at: i64,
    pub version_number: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,  // 父文件夹ID，None表示根文件夹
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub document_id: String,
    pub text: String,
    pub selected_text: String,
    pub position: i32,
    pub ai_block_id: Option<String>,
    pub color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomModel {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub max_tokens: i32,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub ai_providers: Vec<AIProviderConfig>,
    pub default_provider: String,
    pub default_model: String,
    pub custom_models: Option<Vec<CustomModel>>,
    pub theme: String,
    pub auto_save: bool,
    pub auto_save_delay: i32,
    pub database_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIProviderConfig {
    pub provider_type: String,
    pub enabled: bool,
    pub poe_api_key: Option<String>,
    pub ollama_base_url: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            ai_providers: vec![
                AIProviderConfig {
                    provider_type: "poe".to_string(),
                    enabled: true,
                    poe_api_key: Some("".to_string()),
                    ollama_base_url: None,
                },
                AIProviderConfig {
                    provider_type: "ollama".to_string(),
                    enabled: true,
                    poe_api_key: None,
                    ollama_base_url: Some("http://localhost:11434".to_string()),
                },
            ],
            default_provider: "poe".to_string(),
            default_model: "Claude-Sonnet-4.5".to_string(),
            custom_models: Some(vec![]),
            theme: "light".to_string(),
            auto_save: true,
            auto_save_delay: 2000,
            database_path: None,
        }
    }
}
