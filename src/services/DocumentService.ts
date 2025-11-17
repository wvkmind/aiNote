import { invoke } from '@tauri-apps/api/core';
import { Document } from '../types';
import { JSONContent } from '@tiptap/react';

export class DocumentService {
  async getAllDocuments(): Promise<Document[]> {
    try {
      console.log('📚 DocumentService: 调用 Tauri get_all_documents');
      const documents = await invoke<Document[]>('get_all_documents');
      console.log('📚 DocumentService: Tauri 返回文档数量:', documents.length);
      const parsed = documents.map(doc => ({
        ...doc,
        content: typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content
      }));
      console.log('✅ DocumentService: 文档列表解析完成');
      return parsed;
    } catch (error) {
      console.error('❌ Failed to get all documents:', error);
      throw error;
    }
  }

  async getDocument(id: string): Promise<Document> {
    try {
      console.log('📂 DocumentService: 调用 Tauri get_document', id);
      const document = await invoke<Document>('get_document', { id });
      console.log('📄 DocumentService: Tauri 返回文档', document.id, 'content type:', typeof document.content);
      const parsedDoc = {
        ...document,
        content: typeof document.content === 'string' ? JSON.parse(document.content) : document.content
      };
      console.log('✅ DocumentService: 文档解析完成，内容长度:', JSON.stringify(parsedDoc.content).length);
      return parsedDoc;
    } catch (error) {
      console.error('❌ Failed to get document:', error);
      throw error;
    }
  }

  async createDocument(title: string, folderId?: string): Promise<Document> {
    try {
      const document = await invoke<Document>('create_document', { title, folderId });
      return {
        ...document,
        content: typeof document.content === 'string' ? JSON.parse(document.content) : document.content
      };
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  }

  async updateDocument(id: string, content: JSONContent): Promise<void> {
    try {
      const contentStr = JSON.stringify(content);
      console.log('💾 DocumentService: 调用 Tauri update_document', id, '内容长度:', contentStr.length);
      await invoke('update_document', { id, content: contentStr });
      console.log('✅ DocumentService: Tauri 调用成功');
    } catch (error) {
      console.error('❌ DocumentService: Failed to update document:', error);
      throw error;
    }
  }

  async updateDocumentTitle(id: string, title: string): Promise<void> {
    try {
      console.log('📝 DocumentService: 更新文档标题', id, title);
      await invoke('update_document_title', { id, title });
      console.log('✅ DocumentService: 标题更新成功');
    } catch (error) {
      console.error('❌ DocumentService: Failed to update document title:', error);
      throw error;
    }
  }

  async updateContextSummary(id: string, summary: string): Promise<void> {
    try {
      console.log('📝 DocumentService: 更新上下文总结', id);
      await invoke('update_context_summary', { id, summary });
      console.log('✅ DocumentService: 上下文总结更新成功');
    } catch (error) {
      console.error('❌ DocumentService: Failed to update context summary:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await invoke('delete_document', { id });
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  async searchDocuments(query: string): Promise<Document[]> {
    try {
      console.log('🔍 DocumentService: 调用 Tauri search_documents，关键词:', query);
      const documents = await invoke<Document[]>('search_documents', { query });
      console.log('🔍 DocumentService: Tauri 返回搜索结果数量:', documents.length);
      const parsed = documents.map(doc => ({
        ...doc,
        content: typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content
      }));
      console.log('✅ DocumentService: 搜索结果解析完成');
      return parsed;
    } catch (error) {
      console.error('❌ Failed to search documents:', error);
      throw error;
    }
  }

  async exportDocument(id: string, format: string = 'json'): Promise<string> {
    try {
      return await invoke<string>('export_document', { id, format });
    } catch (error) {
      console.error('Failed to export document:', error);
      throw error;
    }
  }

  async togglePinDocument(id: string): Promise<void> {
    try {
      await invoke('toggle_pin_document', { id });
    } catch (error) {
      console.error('Failed to toggle pin document:', error);
      throw error;
    }
  }

  async toggleImportantDocument(id: string): Promise<void> {
    try {
      await invoke('toggle_important_document', { id });
    } catch (error) {
      console.error('Failed to toggle important document:', error);
      throw error;
    }
  }

  async saveDocumentVersion(documentId: string, content: JSONContent): Promise<void> {
    try {
      const contentStr = JSON.stringify(content);
      await invoke('save_document_version', { documentId, content: contentStr });
    } catch (error) {
      console.error('Failed to save document version:', error);
      throw error;
    }
  }

  async getDocumentVersions(documentId: string): Promise<any[]> {
    try {
      const versions = await invoke<any[]>('get_document_versions', { documentId });
      return versions.map(v => ({
        ...v,
        content: typeof v.content === 'string' ? JSON.parse(v.content) : v.content
      }));
    } catch (error) {
      console.error('Failed to get document versions:', error);
      throw error;
    }
  }

  async restoreDocumentVersion(documentId: string, versionId: string): Promise<void> {
    try {
      await invoke('restore_document_version', { documentId, versionId });
    } catch (error) {
      console.error('Failed to restore document version:', error);
      throw error;
    }
  }
}
