use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

pub struct VoiceService {
    process: Mutex<Option<Child>>,
}

impl VoiceService {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }

    pub fn start(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let mut process = self.process.lock().unwrap();
        
        if process.is_some() {
            return Ok(()); // 已经在运行
        }

        // 获取资源路径
        let resource_path = app_handle
            .path()
            .resolve("voice-service", tauri::path::BaseDirectory::Resource)
            .map_err(|e| format!("Failed to resolve voice-service path: {}", e))?;

        println!("🚀 启动语音服务: {:?}", resource_path);

        // 启动进程
        let child = Command::new(resource_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start voice service: {}", e))?;

        *process = Some(child);
        println!("✅ 语音服务进程已启动");
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut process = self.process.lock().unwrap();
        
        if let Some(mut child) = process.take() {
            println!("🛑 停止语音服务...");
            child.kill()
                .map_err(|e| format!("Failed to stop voice service: {}", e))?;
            println!("✅ 语音服务已停止");
        }
        
        Ok(())
    }

    pub async fn check_health(&self) -> bool {
        match reqwest::get("http://127.0.0.1:8765/health").await {
            Ok(response) => {
                let is_ok = response.status().is_success();
                if is_ok {
                    println!("✅ 语音服务健康检查通过");
                }
                is_ok
            }
            Err(e) => {
                println!("⚠️ 语音服务健康检查失败: {}", e);
                false
            }
        }
    }

    pub fn is_running(&self) -> bool {
        let process = self.process.lock().unwrap();
        process.is_some()
    }
}

impl Drop for VoiceService {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
