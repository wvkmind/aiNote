import { invoke } from '@tauri-apps/api/core';
import { Folder } from '../types';

export class FolderService {
  async getAllFolders(): Promise<Folder[]> {
    try {
      const folders = await invoke<Folder[]>('get_all_folders');
      return folders.map(folder => ({
        ...folder,
        createdAt: typeof folder.createdAt === 'number' ? folder.createdAt * 1000 : folder.createdAt,
        updatedAt: typeof folder.updatedAt === 'number' ? folder.updatedAt * 1000 : folder.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to get all folders:', error);
      throw error;
    }
  }

  async createFolder(name: string, parentId?: string): Promise<Folder> {
    try {
      const folder = await invoke<Folder>('create_folder', { name, parentId });
      return {
        ...folder,
        createdAt: typeof folder.createdAt === 'number' ? folder.createdAt * 1000 : folder.createdAt,
        updatedAt: typeof folder.updatedAt === 'number' ? folder.updatedAt * 1000 : folder.updatedAt,
      };
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  async updateFolder(id: string, name: string): Promise<void> {
    try {
      await invoke('update_folder', { id, name });
    } catch (error) {
      console.error('Failed to update folder:', error);
      throw error;
    }
  }

  async deleteFolder(id: string): Promise<void> {
    try {
      await invoke('delete_folder', { id });
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  }

  async moveDocument(documentId: string, folderId?: string): Promise<void> {
    try {
      await invoke('move_document', { documentId, folderId });
    } catch (error) {
      console.error('Failed to move document:', error);
      throw error;
    }
  }
}
