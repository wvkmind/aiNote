# AI 笔记系统

一个本地优先的 Notion 风格笔记软件，集成 Poe API 和 Ollama，支持与 AI 边聊天边写笔记。

## ✨ 核心特性

### 📝 笔记功能
- **富文本编辑**：支持标题、段落、列表、代码块等
- **自动保存**：2秒防抖自动保存
- **文档管理**：创建、删除、搜索文档
- **本地存储**：所有数据存储在本地 SQLite 数据库

### 🤖 AI 交互
- **`/` 命令触发**：在编辑器中输入 `/` 即可与 AI 对话
- **流式渲染**：实时显示 AI 回复
- **灵活操作**：保留全部、部分保留或丢弃 AI 生成的内容
- **双 Provider 支持**：同时支持 Poe API 和本地 Ollama
- **智能上下文管理**：超长文档自动总结，保留关键信息

### ⚙️ 配置系统
- **AI Provider 配置**：Poe API Key、Ollama 地址
- **模型选择**：自由选择使用的 AI 模型
- **主题切换**：浅色/深色主题
- **上下文管理**：可配置的智能上下文总结
- **自动保存**：可调整保存延迟

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Rust（用于 Tauri）
- （可选）Ollama（用于本地 AI 模型）

### 安装依赖

```bash
cd ai-note-system
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

构建完成后，安装包将位于 `src-tauri/target/release/bundle/` 目录下。

## 📖 使用指南

### 1. 配置 AI Provider

首次使用时，点击右上角的 ⚙️ 图标打开设置面板：

**使用 Poe API：**
1. 在设置中启用 Poe
2. 输入你的 Poe API Key
3. 设置默认模型（如 `GPT-5-Chat`、`Claude-3-Sonnet`）

**使用 Ollama（本地）：**
1. 确保 Ollama 已安装并运行
2. 在设置中启用 Ollama
3. 设置服务器地址（默认 `http://localhost:11434`）
4. 设置默认模型（如 `llama2`、`mistral`）

### 2. 创建笔记

1. 点击左侧边栏的"新建文档"按钮
2. 开始输入内容

### 3. 与 AI 对话

1. 在编辑器中输入 `/`
2. 在弹出的输入框中输入你的问题或命令
3. 按 Enter 发送
4. AI 会实时生成回复
5. 选择"保留全部"、"部分保留"或"丢弃"

### 4. 智能上下文管理

当文档内容超过 1024 字符时，系统会自动使用 Ollama 对上下文进行智能总结，确保 AI 对话不会丢失关键信息。

你可以在设置中调整：
- 最大上下文长度
- 保留的最近文本长度
- 总结使用的模型

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + TailwindCSS
- **编辑器**：TipTap（基于 ProseMirror）
- **状态管理**：Zustand
- **桌面框架**：Tauri 2.x
- **数据库**：SQLite
- **AI 集成**：Poe API + Ollama

## 📁 项目结构

```
ai-note-system/
├── src/                      # 前端源代码
│   ├── components/           # React 组件
│   │   ├── editor/          # 编辑器相关组件
│   │   ├── AppLayout.tsx    # 主布局
│   │   ├── Sidebar.tsx      # 侧边栏
│   │   ├── EditorPanel.tsx  # 编辑器面板
│   │   └── SettingsPanel.tsx # 设置面板
│   ├── services/            # 服务层
│   │   ├── ai/             # AI Provider
│   │   ├── ContextManager.ts # 上下文管理
│   │   ├── DocumentService.ts
│   │   └── SettingsService.ts
│   ├── store/              # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
├── src-tauri/              # Tauri 后端
│   └── src/
│       ├── commands.rs     # Tauri 命令
│       ├── db.rs          # 数据库初始化
│       └── models.rs      # 数据模型
└── .kiro/specs/           # 设计文档
```

## 🎯 核心功能演示

### `/` 命令触发 AI 对话

```
用户输入：/帮我总结以上内容

AI 回复：[实时流式显示]
这是一个关于 AI 笔记系统的文档...

[✅ 保留全部] [✂️ 部分保留] [❌ 丢弃]
```

### 智能上下文管理

```
文档长度：2000 字符
触发 / 命令
→ 自动检测超过 1024 字符
→ 使用 Ollama 总结前 1800 字符
→ 保留最近 200 字符原文
→ 构建上下文：[摘要] + [最近内容]
→ 发送给 AI
```

## 🔧 配置选项

### AI Provider 配置
- Poe API Key
- Ollama 服务器地址
- 默认 Provider
- 默认模型

### 编辑器配置
- 上下文长度（默认 500 字符）
- 自动保存（默认启用）
- 保存延迟（默认 2000ms）

### 上下文管理配置
- 启用智能上下文管理（默认启用）
- 最大上下文长度（默认 1024 字符）
- 保留最近文本长度（默认 200 字符）
- 总结模型（默认 llama2）
- 缓存超时时间（默认 5 分钟）

### UI 配置
- 主题（浅色/深色）

## 📝 开发说明

### 添加新的 AI Provider

1. 在 `src/services/ai/` 创建新的 Provider 类
2. 实现 `AIProvider` 接口
3. 在 `TipTapEditor` 中注册 Provider

### 自定义 TipTap 扩展

编辑器扩展位于 `src/components/editor/`：
- `AIBlockExtension.tsx`：AI 内容块
- `AIBlockComponent.tsx`：AI 块的 React 组件
- `SlashCommandMenu.tsx`：/ 命令菜单

## 🐛 故障排除

### Ollama 连接失败
- 确保 Ollama 已安装并运行
- 检查服务器地址是否正确（默认 `http://localhost:11434`）
- 确保已下载所需的模型（`ollama pull llama2`）

### Poe API 调用失败
- 检查 API Key 是否正确
- 确保网络连接正常
- 检查模型名称是否正确

### 数据库错误
- 检查应用数据目录的写入权限
- 尝试删除数据库文件重新初始化

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系。
