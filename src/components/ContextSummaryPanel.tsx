import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DocumentService } from '../services/DocumentService';
import { aiService } from '../services/ai';

interface ContextSummaryPanelProps {
  onClose: () => void;
}

export const ContextSummaryPanel: React.FC<ContextSummaryPanelProps> = ({ onClose }) => {
  const { currentDocument } = useAppStore();
  const [summary, setSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const docService = new DocumentService();

  useEffect(() => {
    if (currentDocument?.contextSummary) {
      setSummary(currentDocument.contextSummary);
    }
  }, [currentDocument]);

  const handleSave = async () => {
    if (!currentDocument) return;
    
    try {
      await docService.updateContextSummary(currentDocument.id, summary);
      alert('总结已保存');
      setIsEditing(false);
    } catch (error) {
      alert(`保存失败: ${error}`);
    }
  };

  const handleRegenerate = async () => {
    if (!currentDocument) return;
    
    const confirmed = confirm('确定要重新生成总结吗？这将覆盖现有的总结。');
    if (!confirmed) return;
    
    setIsRegenerating(true);
    try {
      // 提取文档内容
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
      
      const content = extractText(currentDocument.content);
      
      // 调用 AI 生成总结
      await aiService.regenerateSummary(content);
      
      // 重新加载文档获取新总结
      const updatedDoc = await docService.getDocument(currentDocument.id);
      if (updatedDoc.contextSummary) {
        setSummary(updatedDoc.contextSummary);
      }
      
      alert('总结已重新生成');
    } catch (error) {
      alert(`重新生成失败: ${error}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!currentDocument) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-bold">上下文总结历史</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:bg-[var(--bg-tertiary)] rounded p-1"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {summary ? (
            isEditing ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="编辑总结内容..."
              />
            ) : (
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
                  {summary}
                </pre>
              </div>
            )
          ) : (
            <div className="text-center text-[var(--text-secondary)] py-12">
              <p className="text-lg mb-2">暂无总结历史</p>
              <p className="text-sm">当文档内容超过阈值时，系统会自动生成总结</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    if (currentDocument.contextSummary) {
                      setSummary(currentDocument.contextSummary);
                    }
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={!summary}
                >
                  编辑
                </button>
                <button
                  onClick={handleRegenerate}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  disabled={isRegenerating}
                >
                  {isRegenerating ? '生成中...' : '重新生成'}
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
