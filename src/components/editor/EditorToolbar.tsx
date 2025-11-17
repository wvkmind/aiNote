import React, { useState } from 'react';
import { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const addImageFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const shortcuts = [
    { keys: 'Ctrl+B', action: '加粗', icon: '𝐁' },
    { keys: 'Ctrl+I', action: '斜体', icon: '𝐼' },
    { keys: 'Ctrl+U', action: '下划线', icon: 'U̲' },
    { keys: 'Ctrl+Shift+X', action: '删除线', icon: 'S̶' },
    { keys: 'Ctrl+Shift+C', action: '代码', icon: '</>' },
    { keys: 'Ctrl+Shift+7', action: '有序列表', icon: '1.' },
    { keys: 'Ctrl+Shift+8', action: '无序列表', icon: '•' },
    { keys: 'Ctrl+Shift+9', action: '待办清单', icon: '☑' },
    { keys: 'Ctrl+Alt+1', action: '标题 1', icon: 'H1' },
    { keys: 'Ctrl+Alt+2', action: '标题 2', icon: 'H2' },
    { keys: 'Ctrl+Alt+3', action: '标题 3', icon: 'H3' },
    { keys: 'Ctrl+Z', action: '撤销', icon: '↶' },
    { keys: 'Ctrl+Shift+Z', action: '重做', icon: '↷' },
    { keys: 'Ctrl+A', action: '全选', icon: '⊞' },
    { keys: '/', action: 'AI 对话', icon: '🤖' },
  ];

  return (
    <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 flex items-center gap-2 flex-wrap sticky top-0 z-10 shadow-sm">
      {/* 文本格式 */}
      <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('bold') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="加粗 (Ctrl+B)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 5a1 1 0 011-1h5.5a3.5 3.5 0 110 7H4v3a1 1 0 11-2 0V5zm9.5 5a1.5 1.5 0 100-3H5v3h7.5z" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('italic') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="斜体 (Ctrl+I)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 2a1 1 0 011 1v1h2V3a1 1 0 112 0v1h1a1 1 0 110 2h-1v8h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H6a1 1 0 110-2h1V6H6a1 1 0 010-2h1V3a1 1 0 011-1h0zm2 4v8h2V6h-2z" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('strike') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="删除线 (Ctrl+Shift+X)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2.5-5.5A2.5 2.5 0 018 2h4a2.5 2.5 0 010 5H8a2.5 2.5 0 01-2.5-2.5zM8 4a.5.5 0 000 1h4a.5.5 0 000-1H8zm-2.5 9.5A2.5 2.5 0 008 11h4a2.5 2.5 0 010 5H8a2.5 2.5 0 01-2.5-2.5zM8 13a.5.5 0 000 1h4a.5.5 0 000-1H8z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('code') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="代码 (Ctrl+Shift+C)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>

      {/* 标题 */}
      <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg-hover)] text-sm font-bold ${
            editor.isActive('heading', { level: 1 }) ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="标题 1 (Ctrl+Alt+1)"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg-hover)] text-sm font-bold ${
            editor.isActive('heading', { level: 2 }) ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="标题 2 (Ctrl+Alt+2)"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded-lg transition-all hover:bg-[var(--bg-hover)] text-sm font-bold ${
            editor.isActive('heading', { level: 3 }) ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="标题 3 (Ctrl+Alt+3)"
        >
          H3
        </button>
      </div>

      {/* 列表 */}
      <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('bulletList') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="无序列表 (Ctrl+Shift+8)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('orderedList') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="有序列表 (Ctrl+Shift+7)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('taskList') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="待办清单 (Ctrl+Shift+9)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>
      </div>

      {/* 表格 */}
      <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2">
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
          title="插入表格"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        {editor.isActive('table') && (
          <>
            <button
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
              title="在左侧插入列"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
              title="在右侧插入列"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="p-2 rounded-lg transition-all hover:bg-red-50 text-red-500"
              title="删除列"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
              title="在上方插入行"
            >
              ↑+
            </button>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
              title="在下方插入行"
            >
              ↓+
            </button>
            <button
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="p-2 rounded-lg transition-all hover:bg-red-50 text-red-500"
              title="删除行"
            >
              ✕行
            </button>
            <button
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="p-2 rounded-lg transition-all hover:bg-red-50 text-red-500"
              title="删除表格"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* 图片 */}
      <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2 relative">
        <button
          onClick={() => setShowImageInput(!showImageInput)}
          className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
          title="插入图片"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        {showImageInput && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowImageInput(false)} />
            <div className="absolute top-full left-0 mt-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-xl shadow-xl z-50 p-4 min-w-[300px]">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">图片 URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 rounded-lg border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addImage();
                      if (e.key === 'Escape') setShowImageInput(false);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addImage}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
                  >
                    插入
                  </button>
                  <button
                    onClick={addImageFromFile}
                    className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-all font-medium"
                  >
                    上传文件
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 其他 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('codeBlock') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="代码块"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] ${
            editor.isActive('blockquote') ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]' : ''
          }`}
          title="引用"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
          title="分隔线"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* 快捷键帮助 */}
      <div className="ml-auto relative">
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="p-2 rounded-lg transition-all hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          title="快捷键"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
        {showShortcuts && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowShortcuts(false)} />
            <div className="absolute top-full right-0 mt-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-xl shadow-xl z-50 p-4 min-w-[300px] max-h-[400px] overflow-y-auto">
              <h3 className="font-semibold mb-3 text-[var(--text-primary)]">快捷键</h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{shortcut.action}</span>
                    <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs font-mono">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
