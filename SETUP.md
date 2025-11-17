# 安装和运行指南

## 前置要求

在运行此应用之前，你需要安装以下工具：

### 1. Node.js
- 版本：18 或更高
- 下载地址：https://nodejs.org/

### 2. Rust
Tauri 需要 Rust 来编译后端代码。

**Windows 安装：**
1. 访问 https://rustup.rs/
2. 下载并运行 `rustup-init.exe`
3. 按照提示完成安装
4. 重启终端

**验证安装：**
```bash
rustc --version
cargo --version
```

### 3. Visual Studio C++ Build Tools（仅 Windows）
Rust 在 Windows 上需要 C++ 构建工具。

**安装方式：**
1. 访问 https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. 下载并安装 "Visual Studio Build Tools"
3. 在安装程序中选择 "Desktop development with C++"

### 4. WebView2（仅 Windows）
Tauri 使用 WebView2 来渲染 UI。

**安装方式：**
- Windows 10/11 通常已预装
- 如果没有，访问：https://developer.microsoft.com/microsoft-edge/webview2/

### 5. Ollama（可选，用于本地 AI）
如果你想使用本地 AI 模型：

1. 访问 https://ollama.ai/
2. 下载并安装 Ollama
3. 安装模型：
   ```bash
   ollama pull llama2
   ollama pull mistral
   ```

## 安装步骤

### 1. 克隆或下载项目
```bash
cd ai-note-system
```

### 2. 安装依赖
```bash
npm install
```

### 3. 运行开发模式
```bash
npm run tauri dev
```

首次运行会编译 Rust 代码，可能需要几分钟。

### 4. 构建生产版本
```bash
npm run tauri build
```

构建完成后，安装包位于：
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/appimage/`

## 配置

### 配置 Poe API
1. 启动应用
2. 点击右上角的 ⚙️ 图标
3. 在 "Poe 配置" 中输入你的 API Key
4. 设置默认模型（如 `GPT-5-Chat`）

### 配置 Ollama
1. 确保 Ollama 正在运行
2. 在设置中启用 Ollama
3. 设置服务器地址（默认 `http://localhost:11434`）
4. 设置默认模型（如 `llama2`）

## 故障排除

### 问题：cargo 命令未找到
**解决方案：**
1. 确保已安装 Rust
2. 重启终端
3. 运行 `rustc --version` 验证

### 问题：编译错误
**解决方案：**
1. 确保安装了 Visual Studio C++ Build Tools（Windows）
2. 更新 Rust：`rustup update`
3. 清理并重新构建：
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   npm run tauri dev
   ```

### 问题：Ollama 连接失败
**解决方案：**
1. 确保 Ollama 正在运行
2. 检查服务器地址是否正确
3. 确保已下载模型：`ollama list`

### 问题：Poe API 调用失败
**解决方案：**
1. 检查 API Key 是否正确
2. 确保网络连接正常
3. 检查模型名称是否正确

## 开发模式

### 热重载
开发模式支持热重载：
- 前端代码修改会自动刷新
- Rust 代码修改需要重新编译

### 调试
- 前端：打开开发者工具（F12）
- 后端：查看终端输出

## 生产构建

### 优化构建
```bash
npm run tauri build
```

### 构建选项
编辑 `src-tauri/tauri.conf.json` 来配置：
- 应用名称
- 版本号
- 图标
- 窗口大小
- 等等

## 下一步

1. 创建你的第一个笔记
2. 尝试 `/` 命令与 AI 对话
3. 探索设置选项
4. 享受智能笔记体验！

## 获取帮助

如有问题，请查看：
- README.md - 功能说明
- IMPLEMENTATION_SUMMARY.md - 技术细节
- GitHub Issues - 报告问题
