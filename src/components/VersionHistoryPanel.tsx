import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DocumentVersion } from '../types';

interface VersionHistoryPanelProps {
  documentId: string;
  onClose: () => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({ documentId, onClose }) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const { getDocumentVersions, restoreDocumentVersion } = useAppStore();

  useEffect(() => {
    loadVersions();
  }, [documentId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const versionList = await getDocumentVersions(documentId);
      setVersions(versionList);
    } catch (error) {
      console.error('加载版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('确定要恢复到这个版本吗？当前内容将被替换。')) {
      return;
    }

    try {
      await restoreDocumentVersion(documentId, versionId);
      alert('版本恢复成功！');
      onClose();
    } catch (error) {
      console.error('恢复版本失败:', error);
      alert('恢复版本失败');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const extractPreview = (content: any): string => {
    if (!content || !content.content) return '空文档';
    
    let text = '';
    const traverse = (node: any) => {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.content) {
        node.content.forEach(traverse);
      }
    };
    
    content.content.forEach(traverse);
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
      <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border-2 border-[var(--border-color)] animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">版本历史</h2>
              <p className="text-sm text-[var(--text-secondary)]">查看和恢复文档的历史版本</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const currentDoc = useAppStore.getState().currentDocument;
                if (currentDoc) {
                  try {
                    await useAppStore.getState().saveDocumentVersion(documentId, currentDoc.content);
                    alert('✅ 当前版本已保存！');
                    loadVersions();
                  } catch (error) {
                    alert('❌ 保存版本失败');
                  }
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
              title="手动保存当前版本"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>保存当前版本</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-all"
            >
              <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Version List */}
          <div className="w-1/3 border-r border-[var(--border-color)] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 mx-auto mb-3 text-[var(--accent-primary)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-[var(--text-secondary)]">加载中...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto mb-3 text-[var(--text-tertiary)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-[var(--text-secondary)]">暂无版本历史</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-2">编辑文档后会自动保存版本</p>
              </div>
            ) : (
              <div className="p-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`p-4 mb-2 rounded-xl cursor-pointer transition-all ${
                      selectedVersion?.id === version.id
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-500'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        index === 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}>
                        {index === 0 ? '最新' : `版本 ${version.versionNumber}`}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      {formatDate(version.createdAt)}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">
                      {extractPreview(version.content)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedVersion ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      版本 {selectedVersion.versionNumber}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {formatDate(selectedVersion.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(selectedVersion.id)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>恢复此版本</span>
                  </button>
                </div>
                <div className="prose prose-sm max-w-none bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)]">
                  <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-mono">
                    {extractPreview(selectedVersion.content)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-[var(--text-secondary)]">
                  <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <p>选择一个版本查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>自动保存：内容变化且距上次保存超过 5 分钟</span>
            </div>
            <span>·</span>
            <span>保留最近 20 个版本</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
