import React, { useState, useEffect, useRef } from 'react';

interface SlashCommandMenuProps {
  position: { top: number; left: number };
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  position,
  onSubmit,
  onCancel,
}) => {
  const [prompt, setPrompt] = useState('');
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 自动聚焦输入框
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // 调整位置，避免被遮挡
    if (menuRef.current) {
      const menuHeight = menuRef.current.offsetHeight;
      const menuWidth = menuRef.current.offsetWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let top = position.top + 30;
      let left = position.left;
      
      // 检查是否超出底部
      if (top + menuHeight > viewportHeight) {
        // 显示在光标上方
        top = position.top - menuHeight - 10;
      }
      
      // 检查是否超出右侧
      if (left + menuWidth > viewportWidth) {
        left = viewportWidth - menuWidth - 20;
      }
      
      // 确保不超出左侧
      if (left < 10) {
        left = 10;
      }
      
      // 确保不超出顶部
      if (top < 10) {
        top = 10;
      }
      
      setAdjustedPosition({ top, left });
    }
  }, [position]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  // 快捷命令建议
  const suggestions = [
    { label: '总结', prompt: '总结以上内容' },
    { label: '扩写', prompt: '扩写这段内容' },
    { label: '翻译', prompt: '翻译成英文' },
    { label: '整理', prompt: '整理成要点列表' },
  ];

  return (
    <div
      ref={menuRef}
      className="slash-command-menu"
      style={{
        position: 'fixed',
        top: adjustedPosition.top,
        left: adjustedPosition.left,
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '0.75rem',
        zIndex: 1000,
        minWidth: '300px',
        maxWidth: '500px',
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题或命令..."
            className="ai-chat-input"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        {/* 快捷命令建议 */}
        {!prompt && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              快捷命令：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => setPrompt(suggestion.prompt)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          按 Enter 发送，Esc 取消
        </div>
      </form>
    </div>
  );
};
