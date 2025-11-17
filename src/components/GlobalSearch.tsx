import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  matchType: 'title' | 'content';
}

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { documents, selectDocument, searchDocuments } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // 全局快捷键 Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 搜索逻辑
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        await searchDocuments(query);
        
        // 处理搜索结果，提取匹配片段
        const searchResults: SearchResult[] = documents.map(doc => {
          const lowerQuery = query.toLowerCase();
          const lowerTitle = doc.title.toLowerCase();
          
          // 检查标题匹配
          if (lowerTitle.includes(lowerQuery)) {
            return {
              id: doc.id,
              title: doc.title,
              snippet: highlightMatch(doc.title, query),
              matchType: 'title' as const,
            };
          }
          
          // 提取内容文本
          const contentText = extractTextFromContent(doc.content);
          const lowerContent = contentText.toLowerCase();
          
          // 查找匹配位置
          const matchIndex = lowerContent.indexOf(lowerQuery);
          if (matchIndex !== -1) {
            // 提取匹配周围的文本
            const start = Math.max(0, matchIndex - 50);
            const end = Math.min(contentText.length, matchIndex + query.length + 50);
            let snippet = contentText.substring(start, end);
            
            if (start > 0) snippet = '...' + snippet;
            if (end < contentText.length) snippet = snippet + '...';
            
            return {
              id: doc.id,
              title: doc.title,
              snippet: highlightMatch(snippet, query),
              matchType: 'content' as const,
            };
          }
          
          return null;
        }).filter(Boolean) as SearchResult[];
        
        setResults(searchResults);
      } catch (error) {
        console.error('搜索失败:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, documents, searchDocuments]);

  const extractTextFromContent = (content: any): string => {
    if (!content) return '';
    
    let text = '';
    
    const traverse = (node: any) => {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.type === 'paragraph' || node.type === 'heading') {
        if (node.content) {
          node.content.forEach(traverse);
        }
        text += ' ';
      } else if (node.content) {
        node.content.forEach(traverse);
      }
    };
    
    if (content.content) {
      content.content.forEach(traverse);
    }
    
    return text.trim();
  };

  const highlightMatch = (text: string, query: string): string => {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const handleSelectResult = (id: string) => {
    // 设置标记，跳过光标恢复，并保存搜索关键词用于定位
    useAppStore.setState({ 
      skipCursorRestore: true,
      searchQuery: query 
    });
    selectDocument(id);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-all text-sm text-[var(--text-secondary)]"
        title="全局搜索 (Ctrl+K)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>搜索</span>
        <kbd className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-xs">Ctrl+K</kbd>
      </button>
    );
  }

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={() => setIsOpen(false)}
      />
      
      {/* 搜索面板 */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50 animate-slideUp">
        <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl border-2 border-[var(--border-color)] overflow-hidden">
          {/* 搜索输入 */}
          <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)]">
            <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文档标题和内容..."
              className="flex-1 bg-transparent outline-none text-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
            />
            {isSearching && (
              <svg className="w-5 h-5 text-[var(--accent-primary)] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 搜索结果 */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query && results.length === 0 && !isSearching && (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>没有找到匹配的文档</p>
              </div>
            )}
            
            {!query && (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>输入关键词搜索文档</p>
                <p className="text-xs mt-2">支持搜索标题和内容</p>
              </div>
            )}

            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => handleSelectResult(result.id)}
                className="p-4 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border-b border-[var(--border-color)] last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    result.matchType === 'title' 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'bg-purple-100 dark:bg-purple-900'
                  }`}>
                    {result.matchType === 'title' ? (
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--text-primary)] mb-1 truncate">
                      {result.title}
                    </h3>
                    <p 
                      className="text-sm text-[var(--text-secondary)] line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        result.matchType === 'title'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      }`}>
                        {result.matchType === 'title' ? '标题匹配' : '内容匹配'}
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* 底部提示 */}
          {results.length > 0 && (
            <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
              <span>找到 {results.length} 个结果</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">↑↓</kbd>
                  导航
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">Enter</kbd>
                  打开
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded">Esc</kbd>
                  关闭
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
