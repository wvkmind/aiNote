import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { VoiceInput } from './VoiceInput';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, isStreaming, onStop }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // 自动调整高度
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  // 语音转文字后插入到编辑器文档
  const handleVoiceInsertToEditor = (text: string) => {
    // 触发自定义事件，让编辑器插入文字
    window.dispatchEvent(new CustomEvent('insert-voice-text', { detail: { text } }));
  };

  // 语音转文字后插入到聊天框
  const handleVoiceForInput = (text: string) => {
    setMessage(prev => prev + text);
    // 聚焦输入框并调整高度
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className="py-5">
      {/* 输入区域 - 与编辑器内容对齐 */}
      <div className="px-8 flex items-end gap-4">
        {/* 左侧：插入到编辑器文档的语音按钮 */}
        <div className={`flex flex-col items-center gap-2 ${isStreaming ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="relative group">
            <VoiceInput 
              onTranscript={handleVoiceInsertToEditor}
              mode="insert"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[var(--bg-secondary)]"></div>
          </div>
          <span className="text-xs font-medium text-[var(--text-tertiary)] whitespace-nowrap">插入文档</span>
        </div>

        {/* 中间：输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "AI 正在生成回复..." : "输入消息或使用语音... (Enter 发送，Shift+Enter 换行)"}
            disabled={disabled || isStreaming}
            className={`w-full px-5 py-4 rounded-2xl border-2 focus:outline-none resize-none overflow-y-auto transition-all shadow-sm ${
              isStreaming 
                ? 'bg-[var(--bg-tertiary)] border-[var(--border-color)] cursor-not-allowed' 
                : 'bg-[var(--bg-primary)] border-[var(--border-color)] focus:border-[var(--accent-primary)] focus:shadow-lg'
            }`}
            style={{ minHeight: '56px', maxHeight: '200px' }}
            rows={1}
          />
          {isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>AI 对话中...</span>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：语音输入到聊天框和发送按钮 */}
        <div className="flex items-center gap-3">
          {!isStreaming && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <VoiceInput 
                  onTranscript={handleVoiceForInput}
                  mode="send"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-[var(--bg-secondary)]"></div>
              </div>
              <span className="text-xs font-medium text-[var(--text-tertiary)] whitespace-nowrap">语音输入</span>
            </div>
          )}
          
          {/* 发送/停止按钮 */}
          {isStreaming ? (
            <button
              onClick={onStop}
              className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
              title="停止生成"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              <span>停止</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              className={`p-4 rounded-2xl transition-all shadow-md ${
                message.trim() && !disabled
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
              }`}
              title="发送消息 (Enter)"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
