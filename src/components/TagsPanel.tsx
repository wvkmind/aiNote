import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export const TagsPanel: React.FC = () => {
  const { tags, deleteTag, updateTag, toggleTags } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSave = async (id: string) => {
    if (editText.trim()) {
      await updateTag(id, editText.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    // 使用 Tauri 对话框
    const { ask } = await import('@tauri-apps/plugin-dialog');
    const confirmed = await ask('确定要删除这个标签吗？', {
      title: '删除标签',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    
    if (confirmed) {
      await deleteTag(id);
    }
  };

  const handleTagClick = (tagId: string) => {
    // 触发编辑器查找标签并滚动到对应位置
    const event = new CustomEvent('scrollToTag', { detail: { tagId } });
    window.dispatchEvent(event);
  };

  // 过滤标签
  const filteredTags = tags.filter((tag) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (tag.text || '').toLowerCase().includes(query) ||
      (tag.selectedText || '').toLowerCase().includes(query)
    );
  });

  // 高亮搜索词
  const highlightText = (text: string | undefined) => {
    if (!text) return '';
    if (!searchQuery.trim()) return text;
    
    const query = searchQuery.trim();
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">标签</h2>
          <button
            onClick={toggleTags}
            className="text-2xl hover:bg-[var(--bg-tertiary)] rounded p-1"
          >
            ×
          </button>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签..."
            className="w-full px-3 py-2 pl-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
              title="清除搜索"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto p-4">
        {tags.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] py-8">
            <p>暂无标签</p>
            <p className="text-sm mt-2">选中文字后可以添加标签</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] py-8">
            <p>未找到匹配的标签</p>
            <p className="text-sm mt-2">尝试其他搜索词</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => handleTagClick(tag.id)}
              >
                {editingId === tag.id ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSave(tag.id);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(tag.id)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-blue-600 mb-1">
                          {highlightText(tag.text)}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] truncate">
                          {highlightText(tag.selectedText)}
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(tag.id, tag.text);
                          }}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-sm"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tag.id);
                          }}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-sm"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      {tag.createdAt ? new Date(tag.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
