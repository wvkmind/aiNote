# AI Notes System

A local-first note-taking application integrated with Poe API and Ollama, supporting AI-assisted writing.

## 🌍 Multi-language Support

This application supports the following languages:
- 🇨🇳 简体中文 (Simplified Chinese)
- 🇺🇸 English
- 🇯🇵 日本語 (Japanese)
- 🇰🇷 한국어 (Korean)
- 🇪🇸 Español (Spanish)
- 🇫🇷 Français (French)
- 🇩🇪 Deutsch (German)

**Switch Language:** Open Settings → Select Language dropdown → Choose your preferred language

## 🚀 Quick Start

### Install Dependencies

```bash
cd aiNote
npm install
```

### Development Mode

```bash
npm run tauri dev
```

### Build Production Version

```bash
npm run tauri build
```

After building, the installer will be located in the `src-tauri/target/release/bundle/` directory.

## ✨ Key Features

- 📝 **Rich Text Editor** - Powerful editor based on TipTap
- 🤖 **AI Integration** - Support for Poe and Ollama
- 🗂️ **Folder Management** - Hierarchical folder organization
- 🏷️ **Tag System** - Flexible tag management
- ✅ **Todo Items** - Built-in task management
- 🎙️ **Voice Input** - Speech-to-text functionality
- 🌍 **Multi-language** - Support for 7 languages
- 💾 **Auto Backup** - Data safety guarantee
- 🎨 **Theme Switching** - Light and dark themes

## 📁 Project Structure

```
aiNote/
├── src/                      # Frontend source code
│   ├── components/           # React components
│   │   ├── editor/          # Editor-related components
│   │   ├── AppLayout.tsx    # Main layout
│   │   ├── Sidebar.tsx      # Sidebar
│   │   ├── EditorPanel.tsx  # Editor panel
│   │   └── SettingsPanel.tsx # Settings panel
│   ├── i18n/                # Internationalization
│   │   ├── index.ts         # i18n configuration
│   │   └── locales/         # Translation files
│   │       ├── zh.json      # Simplified Chinese
│   │       ├── en.json      # English
│   │       ├── ja.json      # Japanese
│   │       ├── ko.json      # Korean
│   │       ├── es.json      # Spanish
│   │       ├── fr.json      # French
│   │       └── de.json      # German
│   ├── services/            # Service layer
│   │   ├── ai/             # AI Provider
│   │   ├── ContextManager.ts # Context management
│   │   ├── DocumentService.ts
│   │   └── SettingsService.ts
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── src-tauri/              # Tauri backend
│   └── src/
│       ├── commands.rs     # Tauri commands
│       ├── db.rs          # Database initialization
│       └── models.rs      # Data models
└── .kiro/specs/           # Design documents
```

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📧 Contact

For questions or suggestions, please contact us through GitHub Issues.
