import { invoke } from '@tauri-apps/api/core';
import { Tag } from '../types';

export class TagService {
  // 获取文档的所有标签
  static async getTagsByDocument(documentId: string): Promise<Tag[]> {
    try {
      const tags = await invoke<Tag[]>('get_tags_by_document', { documentId });
      return tags;
    } catch (error) {
      console.error('获取标签失败:', error);
      return [];
    }
  }

  // 创建标签
  static async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    try {
      const newTag = await invoke<Tag>('create_tag', {
        documentId: tag.documentId,
        text: tag.text,
        selectedText: tag.selectedText,
        position: tag.position,
        aiBlockId: tag.aiBlockId,
        color: tag.color,
      });
      return newTag;
    } catch (error) {
      console.error('创建标签失败:', error);
      throw error;
    }
  }

  // 更新标签
  static async updateTag(id: string, text: string): Promise<void> {
    try {
      await invoke('update_tag', { id, text });
    } catch (error) {
      console.error('更新标签失败:', error);
      throw error;
    }
  }

  // 删除标签
  static async deleteTag(id: string): Promise<void> {
    try {
      await invoke('delete_tag', { id });
    } catch (error) {
      console.error('删除标签失败:', error);
      throw error;
    }
  }
}
