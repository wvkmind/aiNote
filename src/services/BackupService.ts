import { invoke } from '@tauri-apps/api/core';

export interface BackupInfo {
  backup_count: number;
  total_size: number;
  backup_dir: string;
}

export class BackupService {
  // 创建备份
  static async createBackup(): Promise<string> {
    try {
      const backupPath = await invoke<string>('create_backup');
      console.log('✅ 备份创建成功:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('❌ 创建备份失败:', error);
      throw error;
    }
  }

  // 列出所有备份
  static async listBackups(): Promise<string[]> {
    try {
      const backups = await invoke<string[]>('list_backups');
      return backups;
    } catch (error) {
      console.error('❌ 获取备份列表失败:', error);
      throw error;
    }
  }

  // 恢复备份
  static async restoreBackup(backupFilename: string): Promise<void> {
    try {
      await invoke('restore_backup', { backupFilename });
      console.log('✅ 备份恢复成功');
    } catch (error) {
      console.error('❌ 恢复备份失败:', error);
      throw error;
    }
  }

  // 删除备份
  static async deleteBackup(backupFilename: string): Promise<void> {
    try {
      await invoke('delete_backup', { backupFilename });
      console.log('✅ 备份删除成功');
    } catch (error) {
      console.error('❌ 删除备份失败:', error);
      throw error;
    }
  }

  // 导出数据库
  static async exportDatabase(): Promise<string> {
    try {
      const exportPath = await invoke<string>('export_database');
      console.log('✅ 数据库导出成功:', exportPath);
      return exportPath;
    } catch (error) {
      console.error('❌ 导出数据库失败:', error);
      throw error;
    }
  }

  // 导入数据库
  static async importDatabase(): Promise<void> {
    try {
      await invoke('import_database');
      console.log('✅ 数据库导入成功');
    } catch (error) {
      console.error('❌ 导入数据库失败:', error);
      throw error;
    }
  }

  // 获取备份信息
  static async getBackupInfo(): Promise<BackupInfo> {
    try {
      const info = await invoke<BackupInfo>('get_backup_info');
      return info;
    } catch (error) {
      console.error('❌ 获取备份信息失败:', error);
      throw error;
    }
  }

  // 获取数据库哈希（用于检测变更）
  static async getDatabaseHash(): Promise<string> {
    try {
      const hash = await invoke<string>('get_database_hash');
      return hash;
    } catch (error) {
      console.error('❌ 获取数据库哈希失败:', error);
      throw error;
    }
  }

  // 清理旧备份
  static async cleanOldBackups(keepCount: number): Promise<void> {
    try {
      await invoke('clean_old_backups', { keepCount });
      console.log(`✅ 清理旧备份完成，保留最新 ${keepCount} 个`);
    } catch (error) {
      console.error('❌ 清理旧备份失败:', error);
      throw error;
    }
  }

  // 打开备份文件夹
  static async openBackupFolder(): Promise<void> {
    try {
      await invoke('open_backup_folder');
      console.log('✅ 打开备份文件夹');
    } catch (error) {
      console.error('❌ 打开备份文件夹失败:', error);
      throw error;
    }
  }

  // 格式化文件大小
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // 从备份文件名提取时间戳
  static extractTimestamp(filename: string): Date | null {
    const match = filename.match(/ai_notes_backup_(\d+)\.db/);
    if (match) {
      const timestamp = parseInt(match[1]);
      return new Date(timestamp * 1000);
    }
    return null;
  }
}
