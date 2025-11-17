import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { useAppStore } from '../../store/useAppStore';

interface TagContextMenuProps {
  editor: Editor;
}

export const TagContextMenu: React.FC<TagContextMenuProps> = ({ editor }) => {
  const { createTag, currentDocumentId, updateDocument } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [tagText, setTagText] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState({ from: 0, to: 0 });

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const { state } = editor;
      const { from, to } = state.selection;
      const text = state.doc.textBetween(from, to, ' ');

      // 只要有选中文字就显示菜单（包括 AIBlock 中的文字）
      if (text.length > 0) {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        setSelectedText(text);
        setSelectionRange({ from, to });
        setPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY });
        setShowMenu(true);
        setShowInput(false);
      }
    };

    const handleClick = () => {
      if (showMenu && !showInput) {
        setShowMenu(false);
      }
    };

    // 监听整个文档的右键事件，确保能捕获 AIBlock 内的事件
    const editorElement = editor.view.dom;
    const editorContainer = editorElement.closest('.ProseMirror') || editorElement;
    
    // 使用捕获阶段确保优先处理
    editorContainer.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('click', handleClick);

    return () => {
      editorContainer.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('click', handleClick);
    };
  }, [editor, showMenu, showInput]);

  const handleAddTag = async () => {
    if (!tagText.trim() || !currentDocumentId) return;

    try {
      const newTag = await createTag({
        documentId: currentDocumentId,
        text: tagText.trim(),
        selectedText,
        position: selectionRange.from,
      });

      // 添加标签标记，使用返回的标签 ID
      console.log('🏷️ 准备添加标签 Mark，ID:', newTag.id, '范围:', selectionRange);
      
      editor.chain().focus().setTextSelection(selectionRange).setTagMark({ tagId: newTag.id }).run();
      
      console.log('✅ 标签 Mark 已添加');
      
      // 立即保存文档，确保标签 Mark 被持久化
      setTimeout(() => {
        const content = editor.getJSON();
        console.log('💾 添加标签后立即保存文档');
        console.log('📄 文档内容片段:', JSON.stringify(content).substring(0, 200));
        updateDocument(currentDocumentId, content);
      }, 100);

      setTagText('');
      setShowInput(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('添加标签失败');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    setShowMenu(false);
  };

  const handleCut = () => {
    navigator.clipboard.writeText(selectedText);
    editor.chain().focus().setTextSelection(selectionRange).deleteSelection().run();
    setShowMenu(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().setTextSelection(selectionRange).insertContent(text).run();
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  if (!showMenu) return null;

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[180px]"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {!showInput ? (
        <div className="py-1">
          {/* 复制 */}
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span>📋</span>
            <span>复制</span>
            <span className="ml-auto text-xs text-gray-400">Ctrl+C</span>
          </button>

          {/* 剪切 */}
          <button
            onClick={handleCut}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span>✂️</span>
            <span>剪切</span>
            <span className="ml-auto text-xs text-gray-400">Ctrl+X</span>
          </button>

          {/* 粘贴 */}
          <button
            onClick={handlePaste}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span>📄</span>
            <span>粘贴</span>
            <span className="ml-auto text-xs text-gray-400">Ctrl+V</span>
          </button>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          {/* 添加标签 */}
          <button
            onClick={() => setShowInput(true)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span>🏷️</span>
            <span>添加标签</span>
          </button>

          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            已选中: {selectedText.substring(0, 30)}
            {selectedText.length > 30 ? '...' : ''}
          </div>
        </div>
      ) : (
        <div className="p-3 min-w-[250px]">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            为选中文字添加标签
          </div>
          <input
            type="text"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="输入标签文字..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              } else if (e.key === 'Escape') {
                setShowInput(false);
                setTagText('');
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddTag}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              确定
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setTagText('');
              }}
              className="flex-1 px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
