import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { TipTapEditor } from './TipTapEditor';
import { ErrorBoundary } from './ErrorBoundary';
import { ContextSummaryPanel } from './ContextSummaryPanel';
import { TagsPanel } from './TagsPanel';
import { GlobalTagsPanel } from './GlobalTagsPanel';
import { TodoPanel } from './TodoPanel';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { WelcomePage } from './WelcomePage';

export const EditorPanel: React.FC = () => {
  const { currentDocument, toggleSidebar, toggleSettings, toggleTags, toggleTodos, tagsOpen, todosOpen, loadTags, settings, closeDocument, sttStatus } = useAppStore();
  const [localTitle, setLocalTitle] = React.useState('');
  const [showSummaryPanel, setShowSummaryPanel] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showClearContextConfirm, setShowClearContextConfirm] = React.useState(false);
  const [showVersionHistory, setShowVersionHistory] = React.useState(false);
  const [contextLength, setContextLength] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSavedTime, setLastSavedTime] = React.useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const titleTimeoutRef = React.useRef<number | null>(null);

  // 监听文档保存事件
  React.useEffect(() => {
    const handleEditing = () => {
      setHasUnsavedChanges(true);
      setLastSavedTime(null);
    };
    
    const handleSaving = () => {
      setIsSaving(true);
      setHasUnsavedChanges(false);
    };
    
    const handleSaved = () => {
      setIsSaving(false);
      setLastSavedTime(Date.now());
      setHasUnsavedChanges(false);
    };

    window.addEventListener('document-editing', handleEditing);
    window.addEventListener('document-saving', handleSaving);
    window.addEventListener('document-saved', handleSaved);

    return () => {
      window.removeEventListener('document-editing', handleEditing);
      window.removeEventListener('document-saving', handleSaving);
      window.removeEventListener('document-saved', handleSaved);
    };
  }, []);

  // 加载标签
  React.useEffect(() => {
    if (currentDocument) {
      loadTags(currentDocument.id);
    }
  }, [currentDocument?.id, loadTags]);

  // 计算上下文长度（仅用于显示，不做限制）
  React.useEffect(() => {
    if (!currentDocument) {
      setContextLength(0);
      return;
    }

    // 查找最后一个上下文分隔符的位置
    let lastSeparatorIndex = -1;
    const allNodes: any[] = [];
    
    const collectNodes = (node: any) => {
      allNodes.push(node);
      if (node.type === 'contextSeparator') {
        lastSeparatorIndex = allNodes.length - 1;
      }
      if (node.content) {
        for (const child of node.content) {
          collectNodes(child);
        }
      }
    };
    
    collectNodes(currentDocument.content);
    
    // 只提取最后一个分隔符之后的节点
    const nodesToExtract = lastSeparatorIndex >= 0 
      ? allNodes.slice(lastSeparatorIndex + 1) 
      : allNodes;

    const extractText = (node: any): string => {
      let text = '';
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.type === 'paragraph') {
        if (node.content) {
          node.content.forEach((child: any) => text += extractText(child));
        }
        text += '\n\n';
      } else if (node.type === 'aiBlock') {
        const prompt = node.attrs?.prompt || '';
        const response = node.attrs?.response || '';
        const status = node.attrs?.status || '';
        if (status === 'accepted' || status === 'complete') {
          text += `\n[用户]: ${prompt}\n[AI]: ${response}\n`;
        }
      } else if (node.content) {
        node.content.forEach((child: any) => text += extractText(child));
      }
      return text;
    };

    let contextText = '';
    for (const node of nodesToExtract) {
      contextText += extractText(node);
    }
    
    setContextLength(contextText.length);
  }, [currentDocument]);



  // 同步 currentDocument.title 到本地状态
  React.useEffect(() => {
    if (currentDocument) {
      setLocalTitle(currentDocument.title);
      // 文档加载时设置为已保存状态
      setLastSavedTime(Date.now());
      setIsSaving(false);
    }
  }, [currentDocument?.id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    // 防抖保存
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    titleTimeoutRef.current = window.setTimeout(() => {
      if (currentDocument) {
        useAppStore.getState().updateDocumentTitle(currentDocument.id, newTitle);
      }
    }, 500);
  };



  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar - Always visible */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm"
            title="切换侧边栏"
          >
            <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {currentDocument ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--accent-primary)] rounded-lg px-3 py-1.5 min-w-[300px] text-[var(--text-primary)]"
                placeholder="文档标题"
              />
              {isSaving ? (
                <span className="text-xs font-medium text-amber-600 flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full shadow-sm">
                  <span className="inline-block w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span>
                  保存中...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-xs font-medium text-orange-600 flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full shadow-sm">
                  <span className="inline-block w-2 h-2 bg-orange-600 rounded-full"></span>
                  未保存
                </span>
              ) : lastSavedTime ? (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full shadow-sm">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  已保存
                </span>
              ) : null}
              <button
                onClick={() => {
                  // 触发保存事件
                  window.dispatchEvent(new Event('document-save-before-close'));
                  // 等待保存完成后关闭
                  setTimeout(() => {
                    closeDocument();
                  }, 100);
                }}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-all"
                title="关闭文档"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-lg font-semibold text-[var(--text-secondary)] px-3">AI 笔记系统</span>
          )}
        </div>
        
        {currentDocument && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm"
                title="导出文档"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {/* 导出菜单 */}
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 min-w-[200px] overflow-hidden">
                    <button
                      onClick={async () => {
                        console.log('📥 导出为 Markdown');
                        const { ExportUtils } = await import('../utils/exportUtils');
                        const markdown = ExportUtils.exportAsMarkdown(currentDocument);
                        ExportUtils.downloadFile(markdown, `${currentDocument.title}.md`, 'text/markdown');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-sm flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={async () => {
                        console.log('📥 导出为纯文本');
                        const { ExportUtils } = await import('../utils/exportUtils');
                        const text = ExportUtils.exportAsText(currentDocument);
                        ExportUtils.downloadFile(text, `${currentDocument.title}.txt`, 'text/plain');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-sm flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>纯文本 (.txt)</span>
                    </button>
                    <button
                      onClick={async () => {
                        console.log('📥 导出为 JSON');
                        const { ExportUtils } = await import('../utils/exportUtils');
                        const json = ExportUtils.exportAsJSON(currentDocument);
                        ExportUtils.downloadFile(json, `${currentDocument.title}.json`, 'application/json');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-sm flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>JSON (.json)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                console.log('🧹 点击清除上下文按钮');
                console.log('当前状态:', showClearContextConfirm);
                setShowClearContextConfirm(true);
                console.log('设置状态为 true');
              }}
              className="p-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm text-xl"
              title="清除上下文（插入分隔符）"
            >
              🧹
            </button>
            <div className="relative">
              <button
                onClick={() => setShowVersionHistory(true)}
                className="p-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm"
                title="版本历史"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
            <button
              onClick={toggleTodos}
              className="p-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm"
              title="当前文档待办"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </button>
            <button
              onClick={toggleTags}
              className="p-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm"
              title="当前文档标签"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            <button
              onClick={toggleSettings}
              className="p-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-all hover:shadow-sm"
              title="设置"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Context Summary Panel */}
      {showSummaryPanel && (
        <ContextSummaryPanel onClose={() => setShowSummaryPanel(false)} />
      )}

      {/* Todos Panel */}
      {todosOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-[var(--bg-primary)] border-l border-[var(--border-color)] shadow-lg z-40">
          <TodoPanel />
        </div>
      )}

      {/* Tags Panel */}
      {tagsOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--bg-primary)] border-l border-[var(--border-color)] shadow-lg z-40">
          {currentDocument ? <TagsPanel /> : <GlobalTagsPanel />}
        </div>
      )}

      {/* Version History Panel */}
      {showVersionHistory && currentDocument && (
        <VersionHistoryPanel
          documentId={currentDocument.id}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Editor or Welcome Page */}
      {currentDocument ? (
        <ErrorBoundary>
          <div className="flex-1 overflow-auto">
            {(() => {
              console.log('🎨 EditorPanel: 渲染编辑器', {
                documentId: currentDocument.id,
                contentType: typeof currentDocument.content,
                contentKeys: currentDocument.content ? Object.keys(currentDocument.content) : 'null'
              });
              return (
                <TipTapEditor
                  documentId={currentDocument.id}
                  initialContent={currentDocument.content}
                />
              );
            })()}
          </div>
        </ErrorBoundary>
      ) : (
        <div className="flex-1 overflow-auto">
          <WelcomePage />
        </div>
      )}

      {/* Status Bar - Always visible at bottom */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg">
        {currentDocument ? (
          <>
            <div className="flex items-center gap-5 text-xs text-[var(--text-secondary)] flex-1">
              {/* STT 服务状态 */}
              <span className="flex items-center gap-1.5" title={sttStatus === 'connected' ? 'STT 服务已连接' : sttStatus === 'disconnected' ? 'STT 服务未连接' : '检查中...'}>
                <span className={`w-2 h-2 rounded-full ${sttStatus === 'connected' ? 'bg-green-500' : sttStatus === 'disconnected' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                <span className={sttStatus === 'connected' ? 'text-green-600' : sttStatus === 'disconnected' ? 'text-red-600' : ''}>
                  STT
                </span>
              </span>
              <span>•</span>
              <span>
                更新时间: {new Date(currentDocument.updatedAt < 10000000000 ? currentDocument.updatedAt * 1000 : currentDocument.updatedAt).toLocaleString('zh-CN')}
              </span>
              <span>•</span>
              <span className={(() => {
                const size = JSON.stringify(currentDocument.content).length;
                if (size > 10 * 1024 * 1024) return 'text-red-500 font-medium';
                if (size > 5 * 1024 * 1024) return 'text-orange-500 font-medium';
                if (size > 1 * 1024 * 1024) return 'text-yellow-600';
                return '';
              })()}>
                大小: {(() => {
                  const size = JSON.stringify(currentDocument.content).length;
                  if (size < 1024) return `${size}B`;
                  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
                  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
                })()}
              </span>
              
              <span>•</span>
              <span>
                上下文: {(contextLength / 1000).toFixed(1)}k 字符
              </span>
              <span>•</span>
              <div className="flex items-center gap-2">
                <span>
                  模型: {settings.defaultModel}
                </span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      (() => {
                        // 根据模型获取最大 token
                        const modelLimits: Record<string, number> = {
                          'Claude-Sonnet-4.5': 200000,
                          'GPT-5-Chat': 400000,
                          'Claude-3-Sonnet': 200000,
                          'GPT-4o': 128000,
                          'Claude-3.5-Sonnet': 200000,
                          'GPT-4-Turbo': 128000,
                          'llama2': 4096,
                          'mistral': 8192,
                          'deepseek-r1:8b': 32768,
                          'qwen2.5:7b': 32768,
                          'llama3.1:8b': 128000,
                        };
                        const maxTokens = modelLimits[settings.defaultModel] || 128000;
                        const maxChars = maxTokens * 0.5; // 1 token ≈ 0.5 中文字符
                        const percentage = Math.min((contextLength / maxChars) * 100, 100);
                        
                        if (percentage > 90) return 'bg-red-500';
                        if (percentage > 80) return 'bg-orange-500';
                        if (percentage > 60) return 'bg-yellow-500';
                        return 'bg-green-500';
                      })()
                    }`}
                    style={{ 
                      width: `${(() => {
                        const modelLimits: Record<string, number> = {
                          'Claude-Sonnet-4.5': 200000,
                          'GPT-5-Chat': 400000,
                          'Claude-3-Sonnet': 200000,
                          'GPT-4o': 128000,
                          'Claude-3.5-Sonnet': 200000,
                          'GPT-4-Turbo': 128000,
                          'llama2': 4096,
                          'mistral': 8192,
                          'deepseek-r1:8b': 32768,
                          'qwen2.5:7b': 32768,
                          'llama3.1:8b': 128000,
                        };
                        const maxTokens = modelLimits[settings.defaultModel] || 128000;
                        const maxChars = maxTokens * 0.5;
                        return Math.min((contextLength / maxChars) * 100, 100);
                      })()}%` 
                    }}
                  />
                </div>
                <span className="text-xs">
                  {(() => {
                    const modelLimits: Record<string, number> = {
                      'Claude-Sonnet-4.5': 200000,
                      'GPT-5-Chat': 400000,
                      'Claude-3-Sonnet': 200000,
                      'GPT-4o': 128000,
                      'Claude-3.5-Sonnet': 200000,
                      'GPT-4-Turbo': 128000,
                      'llama2': 4096,
                      'mistral': 8192,
                      'deepseek-r1:8b': 32768,
                      'qwen2.5:7b': 32768,
                      'llama3.1:8b': 128000,
                    };
                    const maxTokens = modelLimits[settings.defaultModel] || 128000;
                    const maxChars = maxTokens * 0.5;
                    const percentage = Math.min((contextLength / maxChars) * 100, 100);
                    // 如果小于1%，显示一位小数
                    return percentage < 1 ? `${percentage.toFixed(1)}%` : `${percentage.toFixed(0)}%`;
                  })()}
                </span>
              </div>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              就绪
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-5 text-xs text-[var(--text-secondary)]">
              {/* STT 服务状态 */}
              <span className="flex items-center gap-1.5" title={sttStatus === 'connected' ? 'STT 服务已连接' : sttStatus === 'disconnected' ? 'STT 服务未连接' : '检查中...'}>
                <span className={`w-2 h-2 rounded-full ${sttStatus === 'connected' ? 'bg-green-500' : sttStatus === 'disconnected' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                <span className={sttStatus === 'connected' ? 'text-green-600' : sttStatus === 'disconnected' ? 'text-red-600' : ''}>
                  STT
                </span>
              </span>
              <span>•</span>
              <span>未选择文档</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              就绪
            </div>
          </>
        )}
      </div>
      
      {/* 清除上下文确认对话框 */}
      {showClearContextConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl p-8 max-w-md mx-4 border border-[var(--border-color)] animate-slideUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">清除上下文</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              确定要清除上下文吗？
              <br /><br />
              这将在当前位置插入一个分隔符，之后的 AI 对话将不会使用此分隔符之前的内容作为上下文。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearContextConfirm(false)}
                className="px-5 py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all font-medium shadow-sm hover:shadow"
              >
                取消
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('insert-context-separator'));
                  setShowClearContextConfirm(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
