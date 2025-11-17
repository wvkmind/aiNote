import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TagService } from '../services/TagService';
import { Tag } from '../types';

export const GlobalTagsPanel: React.FC = () => {
  const { toggleTags, selectDocument, documents } = useAppStore();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 加载所有文档的标签
  useEffect(() => {
    const loadAllTags = async () => {
      setLoading(true);
      try {
        const tags: Tag[] = [];
        for (const doc of documents) {
          const docTags = await TagService.getTagsByDocument(doc.id);
          tags.push(...docTags);
        }
        setAllTags(tags);
      } catch (error) {
        console.error('Failed to load all tags:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllTags();
  }, [documents]);

  // 过滤标签
  const filteredTags = allTags.filter((tag) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (tag.text || '').toLowerCase().includes(query) ||
      (tag.selectedText || '').toLowerCase().includes(query)
    );
  });

  // 按文档分组
  const groupedTags = filteredTags.reduce((acc, tag) => {
    if (!acc[tag.documentId]) {
      const doc = documents.find(d => d.id === tag.documentId);
      acc[tag.documentId] = {
        documentTitle: doc?.title || '未知文档',
        tags: [],
      };
    }
    acc[tag.documentId].tags.push(tag);
    return acc;
  }, {} as Record<string, { documentTitle: string; tags: Tag[] }>);

  const handleTagClick = async (tag: Tag) => {
    // 跳转到对应文档
    await selectDocument(tag.documentId);
    // 等待编辑器加载
    setTimeout(() => {
      // 触发滚动到标签位置
      const event = new CustomEvent('scrollToTag', { detail: { tagId: tag.id } });
      window.dispatchEvent(event);
    }, 100);
  };

  const handleDelete = async (tagId: string) => {
    const { ask } = await import('@tauri-apps/plugin-dialog');
    const confirmed = await ask('确定要删除这个标签吗？', {
      title: '删除标签',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    
    if (confirmed) {
      await TagService.deleteTag(tagId);
      setAllTags(allTags.filter(t => t.id !== tagId));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">全局标签</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              所有文档的标签
            </p>
          </div>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          )}
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span>共 {allTags.length} 个标签</span>
          {searchQuery && <span>· 找到 {filteredTags.length} 个</span>}
        </div>
      </div>

      {/* Tags List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-[var(--text-secondary)]">加载中...</p>
            </div>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[var(--text-secondary)]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-sm">
                {searchQuery ? '未找到匹配的标签' : '暂无标签'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTags).map(([docId, group]) => (
              <div key={docId} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">{group.documentTitle}</h3>
                  <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                    {group.tags.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="group p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                      onClick={() => handleTagClick(tag)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {tag.text || '(无标题)'}
                            </span>
                          </div>
                          {tag.selectedText && (
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                              "{tag.selectedText}"
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tag.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all text-red-500"
                          title="删除标签"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {new Date(tag.createdAt < 10000000000 ? tag.createdAt * 1000 : tag.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
