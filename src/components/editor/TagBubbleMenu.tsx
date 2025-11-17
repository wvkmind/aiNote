import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useAppStore } from '../../store/useAppStore';

interface TagBubbleMenuProps {
  editor: Editor;
}

export const TagBubbleMenu: React.FC<TagBubbleMenuProps> = ({ editor }) => {
  const { createTag, currentDocumentId } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [tagText, setTagText] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMenu = () => {
      const { state, view } = editor;
      const { from, to } = state.selection;
      
      // 检查是否有选中文字
      const text = state.doc.textBetween(from, to, ' ');
      if (text.length === 0 || editor.isActive('aiBlock')) {
        setShowMenu(false);
        setShowInput(false);
        return;
      }

      // 计算位置
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      
      setPosition({
        top: start.top - 50,
        left: (start.left + end.left) / 2,
      });
      
      setShowMenu(true);
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('update', updateMenu);

    return () => {
      editor.off('selectionUpdate', updateMenu);
      editor.off('update', updateMenu);
    };
  }, [editor]);

  const handleAddTag = async () => {
    if (!tagText.trim() || !currentDocumentId) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (!selectedText) return;

    try {
      await createTag({
        documentId: currentDocumentId,
        text: tagText.trim(),
        selectedText,
        position: from,
      });

      // 添加标签标记
      editor.chain().focus().setTagMark({ tagId: Date.now().toString() }).run();

      setTagText('');
      setShowInput(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  if (!showMenu) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          🏷️ 添加标签
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="输入标签文字..."
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
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
          <button
            onClick={handleAddTag}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setShowInput(false);
              setTagText('');
            }}
            className="px-2 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
