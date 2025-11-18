import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AppState, Settings, Tag } from '../types';
import { JSONContent } from '@tiptap/react';
import { DocumentService } from '../services/DocumentService';
import { SettingsService } from '../services/SettingsService';
import { TagService } from '../services/TagService';
import { FolderService } from '../services/FolderService';

const documentService = new DocumentService();
const settingsService = new SettingsService();
const folderService = new FolderService();

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    // 初始状态
    documents: [],
    currentDocumentId: null,
    currentDocument: null,
    folders: [],
    expandedFolders: { '__root__': true }, // 根目录默认展开
    tags: [],
    tagsOpen: false,
    todosOpen: false,
    backupOpen: false,
    sidebarOpen: true,
    settingsOpen: false,
    theme: 'light',
    aiStreaming: false,
    currentAIBlockId: null,
    skipCursorRestore: false,
    searchQuery: null,
    settings: {
      aiProviders: [
        {
          type: 'poe',
          enabled: true,
          poeApiKey: '',
          ollamaBaseUrl: undefined,
        },
        {
          type: 'ollama',
          enabled: true,
          poeApiKey: undefined,
          ollamaBaseUrl: 'http://localhost:11434',
        },
      ],
      defaultProvider: 'poe',
      defaultModel: 'Claude-Sonnet-4.5',
      customModels: [],
      theme: 'light',
      autoSave: true,
      autoSaveDelay: 2000,
      databasePath: undefined,
    },
    lastOpenedDocument: null, // 最近打开的文档 ID
    cursorPosition: null, // 光标位置
    sttStatus: 'unknown' as 'connected' | 'disconnected' | 'unknown', // STT 服务状态

    // Actions
    setSttStatus: (status: 'connected' | 'disconnected' | 'unknown') => {
      set((state) => {
        state.sttStatus = status;
      });
    },

    loadSettings: async () => {
      try {
        const settings = await settingsService.getSettings();
        set((state) => {
          state.settings = settings;
          state.theme = settings.theme;
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    },

    loadDocuments: async () => {
      try {
        console.log('📚 Store: 开始加载文档列表');
        const documents = await documentService.getAllDocuments();
        console.log('📚 Store: 文档列表加载成功，数量:', documents.length);
        set((state) => {
          state.documents = documents;
        });
      } catch (error) {
        console.error('❌ Failed to load documents:', error);
      }
    },

    selectDocument: async (id: string) => {
      try {
        console.log('📂 Store: 选择文档', id);
        const document = await documentService.getDocument(id);
        console.log('📄 Store: 文档加载成功', document.id, '内容长度:', JSON.stringify(document.content).length);
        set((state) => {
          state.currentDocumentId = id;
          state.currentDocument = document;
          state.lastOpenedDocument = id;
        });
        // 保存最近打开的文档到 localStorage
        localStorage.setItem('lastOpenedDocument', id);
      } catch (error) {
        console.error('❌ Failed to select document:', error);
      }
    },

    createDocument: async (title: string, folderId?: string) => {
      try {
        const document = await documentService.createDocument(title, folderId);
        set((state) => {
          state.documents.unshift(document);
          state.currentDocumentId = document.id;
          state.currentDocument = document;
          // 自动展开包含新文档的文件夹
          if (folderId) {
            state.expandedFolders[folderId] = true;
          }
        });
      } catch (error) {
        console.error('Failed to create document:', error);
      }
    },

    updateDocument: async (id: string, content: JSONContent) => {
      try {
        console.log('💾 Store: 开始保存文档', id);
        await documentService.updateDocument(id, content);
        
        // 智能版本保存：只在有实际修改且距离上次保存超过5分钟时才保存版本
        const state = get();
        const lastVersionTime = (state as any).lastVersionSaveTime?.[id] || 0;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        // 检查内容是否真的有变化
        const currentDoc = state.documents.find(d => d.id === id);
        const contentChanged = currentDoc && JSON.stringify(currentDoc.content) !== JSON.stringify(content);
        
        if (contentChanged && (now - lastVersionTime > fiveMinutes)) {
          try {
            await documentService.saveDocumentVersion(id, content);
            console.log('📚 Store: 版本已保存（距上次保存超过5分钟）');
            
            // 记录保存时间
            set((state) => {
              if (!(state as any).lastVersionSaveTime) {
                (state as any).lastVersionSaveTime = {};
              }
              (state as any).lastVersionSaveTime[id] = now;
            });
          } catch (versionError) {
            console.warn('⚠️ Store: 保存版本失败（不影响文档保存）:', versionError);
          }
        } else if (!contentChanged) {
          console.log('⏭️ Store: 内容未变化，跳过版本保存');
        } else {
          console.log('⏭️ Store: 距上次版本保存不足5分钟，跳过');
        }
        
        console.log('✅ Store: 文档保存成功', id);
        set((state) => {
          if (state.currentDocument && state.currentDocument.id === id) {
            state.currentDocument.content = content;
            state.currentDocument.updatedAt = Date.now();
          }
          const docIndex = state.documents.findIndex((d) => d.id === id);
          if (docIndex !== -1) {
            state.documents[docIndex].content = content;
            state.documents[docIndex].updatedAt = Date.now();
          }
        });
      } catch (error) {
        console.error('❌ Failed to update document:', error);
      }
    },

    updateDocumentTitle: async (id: string, title: string) => {
      try {
        console.log('📝 Store: 更新文档标题', id, title);
        await documentService.updateDocumentTitle(id, title);
        set((state) => {
          if (state.currentDocument && state.currentDocument.id === id) {
            state.currentDocument.title = title;
            state.currentDocument.updatedAt = Date.now();
          }
          const docIndex = state.documents.findIndex((d) => d.id === id);
          if (docIndex !== -1) {
            state.documents[docIndex].title = title;
            state.documents[docIndex].updatedAt = Date.now();
          }
        });
      } catch (error) {
        console.error('❌ Failed to update document title:', error);
      }
    },

    deleteDocument: async (id: string) => {
      try {
        await documentService.deleteDocument(id);
        set((state) => {
          state.documents = state.documents.filter((d) => d.id !== id);
          if (state.currentDocumentId === id) {
            state.currentDocumentId = null;
            state.currentDocument = null;
          }
        });
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    },

    closeDocument: () => {
      set((state) => {
        state.currentDocumentId = null;
        state.currentDocument = null;
      });
      // 清除最近打开的文档记录
      localStorage.removeItem('lastOpenedDocument');
    },

    searchDocuments: async (query: string) => {
      try {
        console.log('🔍 Store: 开始搜索文档，关键词:', query);
        const documents = await documentService.searchDocuments(query);
        console.log('🔍 Store: 搜索结果数量:', documents.length);
        set((state) => {
          state.documents = documents;
        });
      } catch (error) {
        console.error('❌ Failed to search documents:', error);
      }
    },

    updateSettings: async (newSettings: Partial<Settings>) => {
      try {
        const updatedSettings = { ...get().settings, ...newSettings };
        await settingsService.updateSettings(updatedSettings);
        set((state) => {
          state.settings = updatedSettings;
          if (newSettings.theme) {
            state.theme = newSettings.theme;
          }
        });
      } catch (error) {
        console.error('Failed to update settings:', error);
      }
    },

    toggleSidebar: () => {
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      });
    },

    toggleSettings: () => {
      set((state) => {
        state.settingsOpen = !state.settingsOpen;
      });
    },

    setTheme: (theme: 'light' | 'dark') => {
      set((state) => {
        state.theme = theme;
        state.settings.theme = theme;
      });
    },

    setAIStreaming: (streaming: boolean) => {
      set((state) => {
        state.aiStreaming = streaming;
      });
    },

    // 标签 Actions
    loadTags: async (documentId: string) => {
      try {
        const tags = await TagService.getTagsByDocument(documentId);
        set((state) => {
          state.tags = tags;
        });
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    },

    createTag: async (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newTag = await TagService.createTag(tag);
        set((state) => {
          state.tags.push(newTag);
        });
        return newTag;
      } catch (error) {
        console.error('Failed to create tag:', error);
        throw error;
      }
    },

    updateTag: async (id: string, text: string) => {
      try {
        await TagService.updateTag(id, text);
        set((state) => {
          const tagIndex = state.tags.findIndex((t) => t.id === id);
          if (tagIndex !== -1) {
            state.tags[tagIndex].text = text;
            state.tags[tagIndex].updatedAt = Date.now();
          }
        });
      } catch (error) {
        console.error('Failed to update tag:', error);
      }
    },

    deleteTag: async (id: string) => {
      try {
        await TagService.deleteTag(id);
        set((state) => {
          state.tags = state.tags.filter((t) => t.id !== id);
        });
        
        // 触发事件通知编辑器移除标签高亮
        const event = new CustomEvent('removeTagMark', { detail: { tagId: id } });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to delete tag:', error);
      }
    },

    toggleTags: () => {
      set((state) => {
        state.tagsOpen = !state.tagsOpen;
      });
    },

    // 待办 Actions
    toggleTodos: () => {
      set((state) => {
        state.todosOpen = !state.todosOpen;
      });
    },

    // 备份 Actions
    toggleBackup: () => {
      set((state) => {
        state.backupOpen = !state.backupOpen;
      });
    },

    // 文件夹 Actions
    loadFolders: async () => {
      try {
        const folders = await folderService.getAllFolders();
        set((state) => {
          state.folders = folders;
        });
      } catch (error) {
        console.error('Failed to load folders:', error);
      }
    },

    createFolder: async (name: string, parentId?: string) => {
      try {
        const folder = await folderService.createFolder(name, parentId);
        set((state) => {
          state.folders.push(folder);
          // 自动展开父文件夹和新文件夹
          if (parentId) {
            state.expandedFolders[parentId] = true;
          }
          state.expandedFolders[folder.id] = true;
        });
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    },

    updateFolder: async (id: string, name: string) => {
      try {
        await folderService.updateFolder(id, name);
        set((state) => {
          const folderIndex = state.folders.findIndex((f) => f.id === id);
          if (folderIndex !== -1) {
            state.folders[folderIndex].name = name;
            state.folders[folderIndex].updatedAt = Date.now();
          }
        });
      } catch (error) {
        console.error('Failed to update folder:', error);
      }
    },

    deleteFolder: async (id: string) => {
      try {
        await folderService.deleteFolder(id);
        set((state) => {
          // 删除文件夹及其子文件夹
          const deleteRecursive = (folderId: string) => {
            state.folders = state.folders.filter((f) => {
              if (f.id === folderId) return false;
              if (f.parentId === folderId) {
                deleteRecursive(f.id);
                return false;
              }
              return true;
            });
          };
          deleteRecursive(id);
          delete state.expandedFolders[id];
        });
        // 重新加载文档列表
        get().loadDocuments();
      } catch (error) {
        console.error('Failed to delete folder:', error);
      }
    },

    toggleFolder: (id: string) => {
      set((state) => {
        state.expandedFolders[id] = !state.expandedFolders[id];
      });
    },

    // 全部折叠
    collapseAllFolders: () => {
      set((state) => {
        state.expandedFolders = {};
      });
    },

    // 全部展开
    expandAllFolders: () => {
      set((state) => {
        const allFolders: Record<string, boolean> = { '__root__': true };
        get().folders.forEach(folder => {
          allFolders[folder.id] = true;
        });
        state.expandedFolders = allFolders;
      });
    },

    // 导航到当前文档（展开其所在文件夹，折叠其他）
    navigateToCurrentDocument: () => {
      const state = get();
      const currentDoc = state.currentDocument;
      if (!currentDoc) return;

      set((state) => {
        // 先全部折叠
        state.expandedFolders = { '__root__': true };
        
        // 如果文档在文件夹中，展开该文件夹及其所有父文件夹
        if (currentDoc.folderId) {
          const expandParents = (folderId: string) => {
            state.expandedFolders[folderId] = true;
            const folder = state.folders.find(f => f.id === folderId);
            if (folder?.parentId) {
              expandParents(folder.parentId);
            }
          };
          expandParents(currentDoc.folderId);
        }
      });
    },

    moveDocument: async (documentId: string, folderId?: string) => {
      try {
        await folderService.moveDocument(documentId, folderId);
        set((state) => {
          const docIndex = state.documents.findIndex((d) => d.id === documentId);
          if (docIndex !== -1) {
            state.documents[docIndex].folderId = folderId;
          }
          if (state.currentDocument && state.currentDocument.id === documentId) {
            state.currentDocument.folderId = folderId;
          }
        });
      } catch (error) {
        console.error('Failed to move document:', error);
      }
    },

    // 置顶文档
    togglePinDocument: async (id: string) => {
      try {
        await documentService.togglePinDocument(id);
        await get().loadDocuments(); // 重新加载以更新排序
      } catch (error) {
        console.error('Failed to toggle pin document:', error);
      }
    },

    // 标记重要文档
    toggleImportantDocument: async (id: string) => {
      try {
        await documentService.toggleImportantDocument(id);
        set((state) => {
          const docIndex = state.documents.findIndex((d) => d.id === id);
          if (docIndex !== -1) {
            state.documents[docIndex].isImportant = !state.documents[docIndex].isImportant;
          }
          if (state.currentDocument && state.currentDocument.id === id) {
            state.currentDocument.isImportant = !state.currentDocument.isImportant;
          }
        });
      } catch (error) {
        console.error('Failed to toggle important document:', error);
      }
    },

    // 保存文档版本
    saveDocumentVersion: async (documentId: string, content: JSONContent) => {
      try {
        await documentService.saveDocumentVersion(documentId, content);
      } catch (error) {
        console.error('Failed to save document version:', error);
      }
    },

    // 获取文档版本历史
    getDocumentVersions: async (documentId: string) => {
      try {
        return await documentService.getDocumentVersions(documentId);
      } catch (error) {
        console.error('Failed to get document versions:', error);
        return [];
      }
    },

    // 恢复文档版本
    restoreDocumentVersion: async (documentId: string, versionId: string) => {
      try {
        await documentService.restoreDocumentVersion(documentId, versionId);
        // 重新加载文档
        await get().selectDocument(documentId);
      } catch (error) {
        console.error('Failed to restore document version:', error);
      }
    },

    // 保存光标位置
    saveCursorPosition: (documentId: string, position: number) => {
      try {
        set((state) => {
          state.cursorPosition = position;
        });
        // 保存到 localStorage
        const cursorData = JSON.parse(localStorage.getItem('cursorPositions') || '{}');
        cursorData[documentId] = position;
        localStorage.setItem('cursorPositions', JSON.stringify(cursorData));
      } catch (error) {
        console.error('❌ Failed to save cursor position:', error);
      }
    },

    // 获取光标位置
    getCursorPosition: (documentId: string): number | null => {
      try {
        const cursorData = JSON.parse(localStorage.getItem('cursorPositions') || '{}');
        return cursorData[documentId] || null;
      } catch (error) {
        console.error('❌ Failed to get cursor position:', error);
        return null;
      }
    },

    // 加载最近打开的文档
    loadLastOpenedDocument: async () => {
      try {
        const lastDocId = localStorage.getItem('lastOpenedDocument');
        if (!lastDocId) {
          console.log('📂 Store: 没有最近打开的文档记录');
          return;
        }
        
        console.log('📂 Store: 尝试加载最近打开的文档', lastDocId);
        
        // 检查文档是否存在
        const documents = get().documents;
        const docExists = documents.some(doc => doc.id === lastDocId);
        
        if (!docExists) {
          console.warn('⚠️ Store: 最近打开的文档不存在，清除记录', lastDocId);
          localStorage.removeItem('lastOpenedDocument');
          return;
        }
        
        await get().selectDocument(lastDocId);
        console.log('✅ Store: 成功加载最近打开的文档');
      } catch (error) {
        console.error('❌ Failed to load last opened document:', error);
        // 清除无效的记录
        localStorage.removeItem('lastOpenedDocument');
      }
    },
  }))
);
