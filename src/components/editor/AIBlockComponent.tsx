import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Editor } from '@tiptap/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAppStore } from '../../store/useAppStore';

interface AIBlockComponentProps {
  node: ProseMirrorNode;
  updateAttributes: (attrs: Record<string, any>) => void;
  deleteNode: () => void;
  editor: Editor;
  getPos: () => number;
}

export const AIBlockComponent: React.FC<AIBlockComponentProps> = ({
  node,
  updateAttributes,
  deleteNode,
  editor,
  getPos,
}) => {
  const { prompt, response, status, model } = node.attrs;
  const { createTag, currentDocumentId } = useAppStore();
  const [selectedTexts, setSelectedTexts] = React.useState<string[]>([]);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; text: string } | null>(null);
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [tagText, setTagText] = React.useState('');
  const responseRef = React.useRef<HTMLDivElement>(null);

  // 监听文本选择（只在 complete 状态时启用）
  React.useEffect(() => {
    // 如果已经保存，不启用选择功能
    if (status === 'accepted') {
      return;
    }

    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && responseRef.current?.contains(selection.anchorNode)) {
        const text = selection.toString().trim();
        if (text) {
          // 添加到选中列表（如果不存在）
          setSelectedTexts(prev => {
            if (!prev.includes(text)) {
              console.log('📝 添加选中文本:', text);
              return [...prev, text];
            }
            return prev;
          });
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [status]);

  const clearSelection = () => {
    setSelectedTexts([]);
  };

  const removeSelectedText = (index: number) => {
    setSelectedTexts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAcceptAll = () => {
    console.log('✅ 保留全部 - 保留 AI 响应样式');
    
    // 只更新状态为 accepted，保持 AIBlock 结构
    updateAttributes({ status: 'accepted' });
  };

  const handleConvertToMarkdown = () => {
    console.log('📝 转换为 Markdown');
    
    // 获取当前位置
    const pos = getPos();
    
    // 删除当前 AIBlock
    const tr = editor.state.tr;
    tr.delete(pos, pos + node.nodeSize);
    editor.view.dispatch(tr);
    
    // 构建完整内容：提问 + 回答
    const fullContent = `**Q: ${prompt}**\n\n**A:**\n\n${response}`;
    
    // 转换为 HTML
    const htmlContent = convertMarkdownToHTML(fullContent);
    
    // 使用 insertContent 插入 HTML
    editor.chain().focus().insertContentAt(pos, htmlContent).run();
    
    console.log('✅ 已转换为普通 Markdown 内容（包含提问和回答）');
  };

  // 将 Markdown 转换为 HTML
  const convertMarkdownToHTML = (markdown: string): string => {
    const lines = markdown.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // 代码块
      if (line.startsWith('```')) {
        const lang = line.substring(3).trim();
        let codeContent = '';
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        result.push(`<pre><code>${codeContent}</code></pre>`);
        i++;
        continue;
      }
      
      // 表格检测（| 开头）
      if (line.trim().startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        
        if (tableLines.length > 0) {
          result.push(convertTableToHTML(tableLines));
          continue;
        }
      }
      
      // 标题
      if (line.match(/^#{1,6} /)) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.substring(level + 1);
        result.push(`<h${level}>${formatInlineMarkdown(text)}</h${level}>`);
      }
      // 无序列表（包括缩进）
      else if (line.match(/^[\s]*[\*\-\+] /)) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].match(/^[\s]*[\*\-\+] /)) {
          const indent = lines[i].match(/^[\s]*/)?.[0].length || 0;
          const text = lines[i].replace(/^[\s]*[\*\-\+] /, '');
          listItems.push(`<li>${formatInlineMarkdown(text)}</li>`);
          i++;
        }
        result.push(`<ul>${listItems.join('')}</ul>`);
        continue;
      }
      // 有序列表（包括缩进）
      else if (line.match(/^[\s]*\d+\. /)) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].match(/^[\s]*\d+\. /)) {
          const text = lines[i].replace(/^[\s]*\d+\. /, '');
          listItems.push(`<li>${formatInlineMarkdown(text)}</li>`);
          i++;
        }
        result.push(`<ol>${listItems.join('')}</ol>`);
        continue;
      }
      // 引用块
      else if (line.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].substring(2));
          i++;
        }
        result.push(`<blockquote><p>${quoteLines.join('<br>')}</p></blockquote>`);
        continue;
      }
      // 水平线
      else if (line.match(/^[\-\*_]{3,}$/)) {
        result.push('<hr>');
      }
      // 空行
      else if (line.trim() === '') {
        // 跳过空行，不添加空段落
      }
      // 普通段落
      else {
        result.push(`<p>${formatInlineMarkdown(line)}</p>`);
      }
      
      i++;
    }
    
    return result.join('\n');
  };

  // 格式化行内 Markdown（粗体、斜体、代码、链接等）
  const formatInlineMarkdown = (text: string): string => {
    let formatted = text;
    
    // 粗体
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // 斜体
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // 删除线
    formatted = formatted.replace(/~~(.+?)~~/g, '<s>$1</s>');
    
    // 行内代码
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 链接 [文字](URL)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
    
    return formatted;
  };

  // 将 Markdown 表格转换为 HTML
  const convertTableToHTML = (tableLines: string[]): string => {
    if (tableLines.length < 2) return '';
    
    // 第一行是表头
    const headerLine = tableLines[0];
    const headers = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // 第二行是分隔符（跳过）
    // 剩余行是数据
    const dataLines = tableLines.slice(2);
    
    let html = '<table><thead><tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    dataLines.forEach(line => {
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      html += '<tr>';
      cells.forEach(cell => {
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
  };

  const handlePartialAccept = () => {
    console.log('✂️ 部分保留，已选文本:', selectedTexts);
    
    if (selectedTexts.length === 0) {
      alert('请先在 AI 响应中选择要保留的文本');
      return;
    }
    
    // 将所有选中的文本合并
    const combinedText = selectedTexts.join('\n\n');
    
    // 构建完整内容：提问 + 部分回答
    const fullContent = `**Q: ${prompt}**\n\n**A:**\n\n${combinedText}`;
    
    // 获取当前位置
    const pos = getPos();
    
    // 删除当前 AIBlock
    const tr = editor.state.tr;
    tr.delete(pos, pos + node.nodeSize);
    editor.view.dispatch(tr);
    
    // 转换为 HTML 并插入
    const htmlContent = convertMarkdownToHTML(fullContent);
    editor.chain().focus().insertContentAt(pos, htmlContent).run();
    
    // 清空选择
    setSelectedTexts([]);
    
    console.log('✅ 已转换部分内容为 Markdown（包含提问）');
  };



  const handleDiscard = () => {
    console.log('❌ 丢弃 AIBlock');
    updateAttributes({ status: 'discarded' });
    // 添加淡出动画后删除节点
    setTimeout(() => {
      deleteNode();
    }, 300);
  };

  return (
    <NodeViewWrapper className="ai-block-wrapper">
      <div
        className={`ai-block ${status === 'discarded' ? 'opacity-0 transition-opacity duration-300' : ''}`}
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
          padding: '1.5rem',
          borderRadius: '1rem',
          margin: '1rem 0',
          border: '2px solid',
          borderColor: status === 'streaming' ? 'var(--accent-primary)' : 'var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Prompt Display */}
        <div className="ai-prompt" style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '0.75rem',
          borderLeft: '4px solid var(--accent-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <svg style={{ width: '1rem', height: '1rem', color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Question
            </span>
          </div>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {prompt}
          </span>
        </div>

        {/* AI Response */}
        <div className="ai-response" style={{ position: 'relative' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginBottom: '1rem',
            padding: '0.5rem 0',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <svg style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                AI Assistant
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {model}
              </div>
            </div>
            {status === 'streaming' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '9999px',
              }}>
                <svg className="animate-spin" style={{ width: '1rem', height: '1rem', color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="loading-dots" style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--accent-primary)' }}>
                  生成中
                </span>
              </div>
            )}
          </div>

          <div 
            ref={responseRef}
            style={{ 
              userSelect: 'text',
              cursor: 'text',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: selectedTexts.length > 0 && status !== 'accepted' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const selection = window.getSelection();
              const selectedText = selection?.toString().trim() || '';
              
              if (selectedText) {
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  text: selectedText,
                });
              }
            }}
          >
            <MarkdownRenderer content={response} />
            {status === 'streaming' && <span className="cursor-blink">▊</span>}
          </div>
          {selectedTexts.length > 0 && status !== 'accepted' && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>已选择 {selectedTexts.length} 段文本:</span>
                <button
                  onClick={clearSelection}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                  }}
                >
                  清空
                </button>
              </div>
              {selectedTexts.map((text, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                  padding: '0.25rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '0.25rem',
                }}>
                  <span style={{ flex: 1, fontSize: '0.75rem' }}>
                    {index + 1}. "{text.substring(0, 40)}{text.length > 40 ? '...' : ''}"
                  </span>
                  <button
                    onClick={() => removeSelectedText(index)}
                    style={{
                      padding: '0.125rem 0.25rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {status === 'complete' && (
          <div className="ai-actions" style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            gap: '0.75rem', 
            flexWrap: 'wrap',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}>
            <button
              onClick={handleConvertToMarkdown}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              title="将 AI 回复转换为可编辑的 Markdown 内容，支持标签功能"
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>接受全部</span>
            </button>
            <button
              onClick={handlePartialAccept}
              style={{
                padding: '0.75rem 1.5rem',
                background: selectedTexts.length > 0 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                  : 'var(--bg-tertiary)',
                color: selectedTexts.length > 0 ? 'white' : 'var(--text-tertiary)',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: selectedTexts.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: selectedTexts.length > 0 ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              disabled={selectedTexts.length === 0}
              onMouseEnter={(e) => {
                if (selectedTexts.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = selectedTexts.length > 0 ? 'var(--shadow-sm)' : 'none';
              }}
              title={selectedTexts.length > 0 ? `保留 ${selectedTexts.length} 段选中文本` : '先选择要保留的文本'}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              <span>部分保留 ({selectedTexts.length})</span>
            </button>
            <button
              onClick={handleDiscard}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>丢弃</span>
            </button>
          </div>
        )}

        {status === 'accepted' && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1rem',
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: '#10b981',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}>
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>已保留</span>
          </div>
        )}
      </div>

      {/* AIBlock 内部右键菜单 */}
      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => {
              setContextMenu(null);
              setShowTagInput(false);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              minWidth: '180px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!showTagInput ? (
              <div style={{ padding: '0.25rem 0' }}>
                {/* 复制 */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(contextMenu.text);
                    setContextMenu(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span>📋</span>
                  <span>复制</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>Ctrl+C</span>
                </button>

                {/* 粘贴 */}
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      // 在 AIBlock 中不支持粘贴，提示用户
                      alert('AIBlock 中不支持粘贴，请在普通文本区域操作');
                    } catch (error) {
                      console.error('Failed to paste:', error);
                    }
                    setContextMenu(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span>📄</span>
                  <span>粘贴</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>Ctrl+V</span>
                </button>
                
                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.25rem 0' }} />
                
                {/* 添加标签 */}
                <button
                  onClick={() => setShowTagInput(true)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span>🏷️</span>
                  <span>添加标签</span>
                </button>
                
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #e5e7eb', marginTop: '0.25rem' }}>
                  已选中: {contextMenu.text.substring(0, 30)}
                  {contextMenu.text.length > 30 ? '...' : ''}
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.75rem', minWidth: '250px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  为选中文字添加标签
                </div>
                <input
                  type="text"
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                  placeholder="输入标签文字..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    marginBottom: '0.5rem',
                    outline: 'none',
                  }}
                  autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && tagText.trim() && currentDocumentId) {
                      try {
                        await createTag({
                          documentId: currentDocumentId,
                          text: tagText.trim(),
                          selectedText: contextMenu.text,
                          position: 0,
                          aiBlockId: node.attrs.timestamp.toString(), // 使用 AIBlock 的 timestamp 作为 ID
                        });
                        setContextMenu(null);
                        setShowTagInput(false);
                        setTagText('');
                      } catch (error) {
                        console.error('Failed to create tag:', error);
                        alert('添加标签失败');
                      }
                    } else if (e.key === 'Escape') {
                      setShowTagInput(false);
                      setTagText('');
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={async () => {
                      if (tagText.trim() && currentDocumentId) {
                        try {
                          await createTag({
                            documentId: currentDocumentId,
                            text: tagText.trim(),
                            selectedText: contextMenu.text,
                            position: 0,
                            aiBlockId: node.attrs.timestamp.toString(),
                          });
                          setContextMenu(null);
                          setShowTagInput(false);
                          setTagText('');
                        } catch (error) {
                          console.error('Failed to create tag:', error);
                          alert('添加标签失败');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                    }}
                  >
                    确定
                  </button>
                  <button
                    onClick={() => {
                      setShowTagInput(false);
                      setTagText('');
                    }}
                    style={{
                      flex: 1,
                      padding: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .cursor-blink {
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .loading-dots::after {
          content: '...';
          animation: dots 1.5s infinite;
        }
        
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }

        /* Markdown 样式 */
        .markdown-content {
          line-height: 1.7;
          color: var(--text-primary);
        }

        .markdown-content h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 1em 0 0.5em 0;
          padding-bottom: 0.3em;
          border-bottom: 1px solid var(--border-color);
        }

        .markdown-content h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.8em 0 0.4em 0;
          padding-bottom: 0.2em;
          border-bottom: 1px solid var(--border-color);
        }

        .markdown-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.6em 0 0.3em 0;
        }

        .markdown-content h4 {
          font-size: 1.1em;
          font-weight: 600;
          margin: 0.5em 0 0.2em 0;
        }

        .markdown-content p {
          margin: 0.8em 0;
        }

        .markdown-content strong {
          font-weight: 600;
          color: var(--text-primary);
        }

        .markdown-content em {
          font-style: italic;
        }

        .markdown-content code.inline-code {
          background-color: rgba(110, 118, 129, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
          color: #e83e8c;
        }

        .markdown-content pre {
          background-color: #0d1117;
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
          border: 1px solid rgba(110, 118, 129, 0.2);
        }

        .markdown-content pre code {
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.875em;
          line-height: 1.5;
          color: #c9d1d9;
          background: transparent;
          padding: 0;
        }

        .markdown-content ul,
        .markdown-content ol {
          padding-left: 2em;
          margin: 0.8em 0;
        }

        .markdown-content ul {
          list-style-type: disc;
        }

        .markdown-content ol {
          list-style-type: decimal;
        }

        .markdown-content li {
          margin: 0.4em 0;
        }

        .markdown-content li > p {
          margin: 0.2em 0;
        }

        .markdown-content a {
          color: #3b82f6;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s;
        }

        .markdown-content a:hover {
          border-bottom-color: #3b82f6;
        }

        .markdown-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1em;
          margin: 1em 0;
          color: var(--text-secondary);
          font-style: italic;
        }

        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }

        .markdown-content table th,
        .markdown-content table td {
          border: 1px solid var(--border-color);
          padding: 0.5em 1em;
          text-align: left;
        }

        .markdown-content table th {
          background-color: rgba(110, 118, 129, 0.1);
          font-weight: 600;
        }

        .markdown-content hr {
          border: none;
          border-top: 2px solid var(--border-color);
          margin: 2em 0;
        }

        .markdown-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 1em 0;
        }

        /* 任务列表 */
        .markdown-content input[type="checkbox"] {
          margin-right: 0.5em;
        }
      `}</style>
    </NodeViewWrapper>
  );
};
