import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Sidebar } from './Sidebar';
import { EditorPanel } from './EditorPanel';
import { SettingsPanel } from './SettingsPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { useToast } from './Toast';
import { BackupPanel } from './BackupPanel';

export const AppLayout: React.FC = () => {
  const { theme, sidebarOpen, settingsOpen, backupOpen, loadDocuments, loadFolders, loadLastOpenedDocument, loadSettings } = useAppStore();
  const { ToastContainer } = useToast();
  const [sidebarWidth, setSidebarWidth] = React.useState(320); // 默认宽度从 256px (w-64) 增加到 320px
  const [isResizing, setIsResizing] = React.useState(false);

  useEffect(() => {
    // Load documents and settings on mount
    const init = async () => {
      // Load settings first
      await loadSettings();
      
      // Then load folders and documents
      await loadFolders();
      await loadDocuments();
      
      // Load last opened document
      await loadLastOpenedDocument();
    };
    
    init();
  }, [loadDocuments, loadFolders, loadLastOpenedDocument, loadSettings]);

  // 自动备份功能
  useEffect(() => {
    let lastBackupHash = '';

    const autoBackup = async () => {
      try {
        const { BackupService } = await import('../services/BackupService');
        
        // 检查数据库是否有变更
        const currentHash = await BackupService.getDatabaseHash();
        if (currentHash === lastBackupHash) {
          console.log('⏭️ 数据库无变更，跳过备份');
          return;
        }

        // 创建备份
        await BackupService.createBackup();
        lastBackupHash = currentHash;
        console.log('✅ 自动备份完成');

        // 清理旧备份，只保留最新3个
        await BackupService.cleanOldBackups(3);
      } catch (error) {
        console.error('❌ 自动备份失败:', error);
      }
    };

    // 延迟5秒后首次备份（避免启动时阻塞）
    const initialTimeout = setTimeout(autoBackup, 5000);

    // 设置定时器（24小时 = 86400000毫秒）
    const interval = setInterval(autoBackup, 24 * 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  // 处理侧边栏宽度调整
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      // 限制最小宽度 200px，最大宽度 600px
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div 
          className="border-r border-[var(--border-color)] flex-shrink-0 relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          <Sidebar />
          {/* 调整宽度的拖拽手柄 */}
          <div
            className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent-primary)] transition-colors group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -right-1 w-3" />
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorPanel />
      </div>

      {/* Settings Panel (Overlay) */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <ErrorBoundary>
              <SettingsPanel />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Backup Panel (Overlay) */}
      {backupOpen && <BackupPanel />}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
