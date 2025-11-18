import { JSONContent } from '@tiptap/react';

// 文档模型
export interface Document {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
  folderId?: string;  // 所属文件夹ID
  isPinned?: boolean;  // 是否置顶
  isImportant?: boolean;  // 是否标记为重要
}

// 文档版本模型
export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  createdAt: number;
  versionNumber: number;
}

// 文件夹模型
export interface Folder {
  id: string;
  name: string;
  parentId?: string;  // 父文件夹ID
  createdAt: number;
  updatedAt: number;
}

// 标签模型
export interface Tag {
  id: string;
  documentId: string;
  text: string;              // 标签文本
  selectedText: string;      // 被标记的文本
  position: number;          // 在文档中的位置（字符偏移）
  aiBlockId?: string;        // 如果标签在 AIBlock 中，记录 AIBlock 的 timestamp
  color?: string;            // 标签颜色
  createdAt: number;
  updatedAt: number;
}

// 内容块（TipTap Node）
export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'codeBlock' | 'aiBlock' | string;
  attrs?: Record<string, any>;
  content?: ContentBlock[];
  text?: string;
}

// AI 块特定属性
export interface AIBlockAttrs {
  prompt: string;
  response: string;
  status: 'streaming' | 'complete' | 'accepted' | 'discarded';
  model: string;
  timestamp: number;
}

// 自定义模型配置
export interface CustomModel {
  id: string;
  name: string;
  provider: 'poe' | 'ollama';
  maxTokens: number;
  isDefault?: boolean;
}

// AI Provider 配置
export interface AIProviderConfig {
  type: 'poe' | 'ollama';
  enabled: boolean;
  // Poe 配置
  poeApiKey?: string;
  // Ollama 配置
  ollamaBaseUrl?: string;
}

// 设置模型
export interface Settings {
  // AI 配置
  aiProviders: AIProviderConfig[];
  defaultProvider: 'poe' | 'ollama';
  defaultModel: string;
  customModels?: CustomModel[];
  
  // UI 配置
  theme: 'light' | 'dark';
  
  // 编辑器配置
  autoSave: boolean;
  autoSaveDelay: number;
  
  // 数据库配置
  databasePath?: string;  // 自定义数据库路径
}

// Zustand Store
export interface AppState {
  // 文档状态
  documents: Document[];
  currentDocumentId: string | null;
  currentDocument: Document | null;
  
  // 文件夹状态
  folders: Folder[];
  expandedFolders: Record<string, boolean>; // 改用对象存储展开状态
  
  // 标签状态
  tags: Tag[];
  tagsOpen: boolean;
  
  // 待办状态
  todosOpen: boolean;
  
  // 备份状态
  backupOpen: boolean;
  
  // UI 状态
  sidebarOpen: boolean;
  settingsOpen: boolean;
  theme: 'light' | 'dark';
  
  // AI 状态
  aiStreaming: boolean;
  currentAIBlockId: string | null;
  
  // 设置
  settings: Settings;
  
  // 最近打开的文档
  lastOpenedDocument: string | null;
  cursorPosition: number | null;
  skipCursorRestore: boolean; // 标记是否跳过光标恢复（用于搜索等场景）
  searchQuery: string | null; // 搜索关键词，用于定位到匹配位置
  
  // STT 服务状态
  sttStatus: 'connected' | 'disconnected' | 'unknown';
  
  // Actions
  setSttStatus: (status: 'connected' | 'disconnected' | 'unknown') => void;
  loadSettings: () => Promise<void>;
  loadDocuments: () => Promise<void>;
  selectDocument: (id: string) => Promise<void>;
  createDocument: (title: string, folderId?: string) => Promise<void>;
  updateDocument: (id: string, content: JSONContent) => Promise<void>;
  updateDocumentTitle: (id: string, title: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  closeDocument: () => void;
  searchDocuments: (query: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAIStreaming: (streaming: boolean) => void;
  
  // 文件夹 Actions
  loadFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string) => Promise<void>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolder: (id: string) => void;
  collapseAllFolders: () => void;
  expandAllFolders: () => void;
  navigateToCurrentDocument: () => void;
  moveDocument: (documentId: string, folderId?: string) => Promise<void>;
  
  // 文档标记 Actions
  togglePinDocument: (id: string) => Promise<void>;
  toggleImportantDocument: (id: string) => Promise<void>;
  
  // 版本历史 Actions
  saveDocumentVersion: (documentId: string, content: JSONContent) => Promise<void>;
  getDocumentVersions: (documentId: string) => Promise<DocumentVersion[]>;
  restoreDocumentVersion: (documentId: string, versionId: string) => Promise<void>;
  
  // 标签 Actions
  loadTags: (documentId: string) => Promise<void>;
  createTag: (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tag>;
  updateTag: (id: string, text: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  toggleTags: () => void;
  
  // 待办 Actions
  toggleTodos: () => void;
  
  // 备份 Actions
  toggleBackup: () => void;
  
  // 光标位置 Actions
  saveCursorPosition: (documentId: string, position: number) => void;
  getCursorPosition: (documentId: string) => number | null;
  loadLastOpenedDocument: () => Promise<void>;
}

// AI Provider 接口
export interface AIProvider {
  name: 'poe' | 'ollama';
  sendPrompt(
    prompt: string,
    context: string,
    model: string,
    onChunk: (text: string) => void
  ): Promise<void>;
}
