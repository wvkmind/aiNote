import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { Sidebar } from './Sidebar';
import { EditorPanel } from './EditorPanel';
import { SettingsPanel } from './SettingsPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { useToast } from './Toast';
import { BackupPanel } from './BackupPanel';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const { theme, sidebarOpen, settingsOpen, backupOpen, loadDocuments, loadFolders, loadLastOpenedDocument, loadSettings } = useAppStore();
  const { ToastContainer } = useToast();
  const [sidebarWidth, setSidebarWidth] = React.useState(320); // 默认宽度从 256px (w-64) 增加到 320px
  const [isResizing, setIsResizing] = React.useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Load documents and settings on mount
    const init = async () => {
      try {
        // Load settings first
        await loadSettings();
        
        // Then load folders and documents
        await loadFolders();
        await loadDocuments();
        
        // Load last opened document
        await loadLastOpenedDocument();
      } finally {
        // 延迟 500ms 后隐藏 loading 界面
        setTimeout(() => {
          setIsInitializing(false);
        }, 500);
      }
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

  // Loading 界面
  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center z-50">
        <div className="text-center">
          {/* Logo 动画 */}
          <div className="mb-8 relative">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl flex items-center justify-center animate-bounce">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-3xl bg-blue-500 animate-ping opacity-20"></div>
          </div>
          
          {/* 标题 */}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 animate-pulse">
            {t('app.title')}
          </h1>
          
          {/* 加载动画 */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          
          <p className="text-gray-600 mt-4 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

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
