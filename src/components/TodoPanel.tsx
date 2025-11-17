import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { JSONContent } from '@tiptap/react';

interface TodoItem {
  id: string;
  documentId: string;
  documentTitle: string;
  text: string;
  checked: boolean;
  position: number;
}

export const TodoPanel: React.FC = () => {
  const { t } = useTranslation();
  const { documents, selectDocument, updateDocument, currentDocument } = useAppStore();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // 从文档中提取待办事项（如果有当前文档则只提取当前文档的，否则提取所有）
  useEffect(() => {
    const extractTodos = () => {
      const allTodos: TodoItem[] = [];
      let globalPosition = 0;

      const docsToProcess = currentDocument ? [currentDocument] : documents;
      
      docsToProcess.forEach(doc => {
        const extractFromContent = (content: JSONContent, docId: string, docTitle: string) => {
          if (!content) return;

          if (content.type === 'taskList' && content.content) {
            content.content.forEach((taskItem, index) => {
              if (taskItem.type === 'taskItem') {
                const text = extractText(taskItem);
                const checked = taskItem.attrs?.checked || false;
                
                allTodos.push({
                  id: `${docId}-${globalPosition}-${index}`,
                  documentId: docId,
                  documentTitle: docTitle,
                  text: text || t('todo.emptyTodo'),
                  checked,
                  position: globalPosition,
                });
              }
            });
          }

          if (content.content) {
            content.content.forEach(child => {
              extractFromContent(child, docId, docTitle);
              globalPosition++;
            });
          }
        };

        extractFromContent(doc.content, doc.id, doc.title);
        globalPosition = 0;
      });

      setTodos(allTodos);
    };

    extractTodos();
  }, [documents, currentDocument]);

  // 提取文本内容
  const extractText = (node: JSONContent): string => {
    if (node.type === 'text') {
      return node.text || '';
    }
    if (node.content) {
      return node.content.map(extractText).join('');
    }
    return '';
  };

  // 切换待办状态
  const toggleTodo = async (todo: TodoItem) => {
    const doc = documents.find(d => d.id === todo.documentId);
    if (!doc) return;

    const updateTaskInContent = (content: JSONContent): JSONContent => {
      if (!content) return content;

      if (content.type === 'taskList' && content.content) {
        return {
          ...content,
          content: content.content.map(taskItem => {
            if (taskItem.type === 'taskItem') {
              const text = extractText(taskItem);
              if (text === todo.text) {
                return {
                  ...taskItem,
                  attrs: {
                    ...taskItem.attrs,
                    checked: !todo.checked,
                  },
                };
              }
            }
            return taskItem;
          }),
        };
      }

      if (content.content) {
        return {
          ...content,
          content: content.content.map(updateTaskInContent),
        };
      }

      return content;
    };

    const updatedContent = updateTaskInContent(doc.content);
    await updateDocument(doc.id, updatedContent);
  };

  // 跳转到待办所在文档
  const navigateToTodo = async (todo: TodoItem) => {
    await selectDocument(todo.documentId);
    // 给编辑器一点时间加载
    setTimeout(() => {
      // 触发滚动到待办位置的事件
      window.dispatchEvent(new CustomEvent('scrollToTodo', { detail: { text: todo.text } }));
    }, 100);
  };

  // 过滤待办
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.checked;
    if (filter === 'completed') return todo.checked;
    return true;
  });

  // 按文档分组
  const groupedTodos = filteredTodos.reduce((acc, todo) => {
    if (!acc[todo.documentId]) {
      acc[todo.documentId] = {
        documentTitle: todo.documentTitle,
        todos: [],
      };
    }
    acc[todo.documentId].todos.push(todo);
    return acc;
  }, {} as Record<string, { documentTitle: string; todos: TodoItem[] }>);

  // 统计信息
  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.checked).length,
    completed: todos.filter(t => t.checked).length,
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('todo.title')}</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {currentDocument ? `${t('todo.currentDoc')}：${currentDocument.title}` : t('todo.globalTodos')}
            </p>
          </div>
          <button
            onClick={() => useAppStore.getState().toggleTodos()}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={t('todo.close')}
          >
            <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-blue-600 mt-1">{t('todo.total')}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
            <div className="text-xs text-orange-600 mt-1">{t('todo.active')}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-green-600 mt-1">{t('todo.completed')}</div>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t('todo.all')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'active'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t('todo.active')}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'completed'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t('todo.completed')}
          </button>
        </div>
      </div>

      {/* 待办列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-16 h-16 text-[var(--text-tertiary)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-[var(--text-secondary)] text-sm">
              {filter === 'all' && t('todo.noTodos')}
              {filter === 'active' && t('todo.noActiveTodos')}
              {filter === 'completed' && t('todo.noCompletedTodos')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTodos).map(([docId, group]) => (
              <div key={docId} className="bg-[var(--bg-secondary)] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">{group.documentTitle}</h3>
                  <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                    {group.todos.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.todos.map(todo => (
                    <div
                      key={todo.id}
                      className="group flex items-start gap-3 p-3 hover:bg-[var(--bg-hover)] rounded-lg transition-all cursor-pointer"
                      onClick={() => navigateToTodo(todo)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTodo(todo);
                        }}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          todo.checked
                            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                            : 'border-[var(--text-tertiary)] hover:border-[var(--accent-primary)]'
                        }`}
                      >
                        {todo.checked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          todo.checked
                            ? 'text-[var(--text-tertiary)] line-through'
                            : 'text-[var(--text-primary)]'
                        }`}>
                          {todo.text}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
