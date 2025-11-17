import React, { useState, useEffect } from 'react';
import { BackupService, BackupInfo } from '../services/BackupService';
import { useAppStore } from '../store/useAppStore';

export const BackupPanel: React.FC = () => {
  const { toggleBackup } = useAppStore();
  const [backups, setBackups] = useState<string[]>([]);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
    loadBackupInfo();
  }, []);

  const loadBackups = async () => {
    try {
      const list = await BackupService.listBackups();
      setBackups(list);
    } catch (error) {
      console.error('加载备份列表失败:', error);
    }
  };

  const loadBackupInfo = async () => {
    try {
      const info = await BackupService.getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      console.error('加载备份信息失败:', error);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      await BackupService.createBackup();
      await loadBackups();
      await loadBackupInfo();
      alert('备份创建成功！');
    } catch (error) {
      alert('备份创建失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`确定要恢复备份 "${filename}" 吗？\n\n当前数据将被替换，但会自动创建安全备份。`)) {
      return;
    }

    setLoading(true);
    try {
      await BackupService.restoreBackup(filename);
      alert('备份恢复成功！\n\n请重启应用以加载恢复的数据。');
      // 重新加载应用
      window.location.reload();
    } catch (error) {
      alert('备份恢复失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`确定要删除备份 "${filename}" 吗？`)) {
      return;
    }

    setLoading(true);
    try {
      await BackupService.deleteBackup(filename);
      await loadBackups();
      await loadBackupInfo();
    } catch (error) {
      alert('删除备份失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    setLoading(true);
    try {
      const path = await BackupService.exportDatabase();
      alert(`数据库导出成功！\n\n保存位置: ${path}`);
    } catch (error) {
      if (error !== 'Export cancelled') {
        alert('导出失败: ' + error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportDatabase = async () => {
    if (!confirm('确定要导入数据库吗？\n\n当前数据将被替换，但会自动创建安全备份。')) {
      return;
    }

    setLoading(true);
    try {
      await BackupService.importDatabase();
      alert('数据库导入成功！\n\n请重启应用以加载导入的数据。');
      window.location.reload();
    } catch (error) {
      if (error !== 'Import cancelled') {
        alert('导入失败: ' + error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">备份管理</h2>
            <button
              onClick={toggleBackup}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 统计信息 */}
          {backupInfo && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-600">{backupInfo.backup_count}</div>
                <div className="text-sm text-blue-600 mt-1">备份数量</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {BackupService.formatSize(backupInfo.total_size)}
                </div>
                <div className="text-sm text-purple-600 mt-1">总大小</div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await BackupService.openBackupFolder();
                  } catch (error) {
                    alert('打开文件夹失败: ' + error);
                  }
                }}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 hover:from-green-100 hover:to-green-200 transition-all cursor-pointer text-left w-full"
                title={`点击打开：${backupInfo.backup_dir}`}
              >
                <div className="text-sm font-medium text-green-600 truncate">
                  {backupInfo.backup_dir}
                </div>
                <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>点击打开文件夹</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="p-6 border-b border-[var(--border-color)] flex gap-3">
          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建备份
          </button>
          <button
            onClick={handleExportDatabase}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出数据库
          </button>
          <button
            onClick={handleImportDatabase}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入数据库
          </button>
        </div>

        {/* 备份列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">备份历史</h3>
          {backups.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p>暂无备份</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => {
                const timestamp = BackupService.extractTimestamp(backup);
                return (
                  <div
                    key={backup}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedBackup === backup
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-hover)]'
                        : 'border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                    onClick={() => setSelectedBackup(backup)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <span className="font-medium text-[var(--text-primary)]">{backup}</span>
                        </div>
                        {timestamp && (
                          <p className="text-sm text-[var(--text-secondary)] ml-7">
                            {timestamp.toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreBackup(backup);
                          }}
                          disabled={loading}
                          className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary)]/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          恢复
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBackup(backup);
                          }}
                          disabled={loading}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 提示信息 */}
        <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium mb-1">备份说明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>备份会自动保存在应用数据目录</li>
                <li>恢复或导入前会自动创建安全备份</li>
                <li>建议定期创建备份以保护数据</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
