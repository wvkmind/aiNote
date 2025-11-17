# AI 笔记系统

一个本地优先的笔记软件，集成 Poe API 和 Ollama，支持与 AI 边聊天边写笔记。

## 🚀 快速开始

### 安装依赖

```bash
cd aiNote
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


## 📁 项目结构

```
aiNote/
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

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系。
