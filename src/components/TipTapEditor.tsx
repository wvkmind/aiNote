import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useAppStore } from '../store/useAppStore';
import { SlashCommandMenu } from './editor/SlashCommandMenu';
import { AIBlockExtension } from './editor/AIBlockExtension';
import { TagMark } from './editor/TagMark';
import { TagContextMenu } from './editor/TagContextMenu';
import { ContextSeparatorExtension } from './editor/ContextSeparatorExtension';
import { DocumentLinkExtension } from './editor/DocumentLinkExtension';
import { ChatInput } from './ChatInput';
import { EditorToolbar } from './editor/EditorToolbar';
import { aiService } from '../services/ai';
import { PoeProvider } from '../services/ai/PoeProvider';
import { OllamaProvider } from '../services/ai/OllamaProvider';

interface TipTapEditorProps {
  documentId: string;
  initialContent: JSONContent;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  documentId,
  initialContent,
}) => {
  console.log('📝 TipTapEditor: 组件渲染', {
    documentId,
    initialContentType: typeof initialContent,
    initialContent: initialContent
  });

  const { updateDocument, settings, setAIStreaming, aiStreaming, currentDocument, tags, saveCursorPosition, getCursorPosition, selectDocument } = useAppStore();
  const saveTimeoutRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  // 初始化 AI Service
  useEffect(() => {
    console.log('🔧 初始化 AI Service，设置:', settings);
    
    // 检查 settings 是否已加载
    if (!settings || !settings.aiProviders) {
      console.warn('⚠️ 设置尚未加载，跳过 AI Service 初始化');
      return;
    }
    
    // 注册 AI Providers
    const poeProvider = settings.aiProviders.find(p => p.type === 'poe');
    const ollamaProvider = settings.aiProviders.find(p => p.type === 'ollama');

    console.log('🔍 Poe Provider:', poeProvider);
    console.log('🔍 Ollama Provider:', ollamaProvider);

    if (poeProvider?.enabled && poeProvider.poeApiKey) {
      console.log('✅ 注册 Poe Provider');
      aiService.registerProvider(new PoeProvider(poeProvider.poeApiKey));
    }

    if (ollamaProvider?.enabled) {
      console.log('✅ 注册 Ollama Provider');
      aiService.registerProvider(new OllamaProvider(ollamaProvider.ollamaBaseUrl));
    }

  }, [settings, currentDocument?.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline hover:text-blue-700',
        },
      }),
      DocumentLinkExtension,
      AIBlockExtension,
      TagMark,
      ContextSeparatorExtension,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none p-8',
        style: 'min-height: calc(100vh - 200px);',
      },
      handleKeyDown: (view, event) => {
        // 检测 / 键
        if (event.key === '/') {
          const { selection } = view.state;
          const coords = view.coordsAtPos(selection.from);
          
          setSlashMenuPosition({
            top: coords.top,
            left: coords.left,
          });
          
          // 延迟显示菜单，让 / 字符先插入
          setTimeout(() => {
            setShowSlashMenu(true);
          }, 10);
        }
        
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      console.log('📝 编辑器内容更新，自动保存:', settings.autoSave);
      
      // 触发编辑事件
      window.dispatchEvent(new CustomEvent('document-editing'));
      
      if (settings.autoSave) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(async () => {
          const content = editor.getJSON();
          const contentSize = JSON.stringify(content).length;
          console.log('💾 自动保存文档:', documentId, '内容长度:', contentSize);
          
          // 文档大小警告
          if (contentSize > 5 * 1024 * 1024) { // 5MB
            console.warn('⚠️ 文档较大 (>5MB)，可能影响性能');
            // 只在首次超过时提示，避免频繁弹窗
            if (!sessionStorage.getItem(`warned_${documentId}`)) {
              alert('⚠️ 文档内容较大（超过 5MB），建议拆分为多个文档以获得更好的性能。');
              sessionStorage.setItem(`warned_${documentId}`, 'true');
            }
          } else if (contentSize > 10 * 1024 * 1024) { // 10MB
            console.error('❌ 文档过大 (>10MB)，严重影响性能');
            alert('❌ 文档内容过大（超过 10MB），强烈建议拆分文档！');
          }
          
          // 触发保存中事件
          window.dispatchEvent(new CustomEvent('document-saving'));
          
          await updateDocument(documentId, content);
          
          // 触发保存完成事件
          window.dispatchEvent(new CustomEvent('document-saved'));
        }, settings.autoSaveDelay);
      }
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
      
      // 检查是否需要跳过光标恢复（例如从搜索打开）
      const state = useAppStore.getState();
      if (state.skipCursorRestore) {
        console.log('⏭️ 跳过光标恢复');
        
        // 如果有搜索关键词，定位到匹配位置
        if (state.searchQuery) {
          console.log('🔍 搜索并定位到:', state.searchQuery);
          setTimeout(() => {
            try {
              // 在文档中查找匹配的文本
              const searchText = state.searchQuery!.toLowerCase();
              let foundPosition: number | null = null;
              
              editor.state.doc.descendants((node, pos) => {
                if (foundPosition !== null) return false; // 已找到，停止遍历
                
                if (node.isText && node.text) {
                  const lowerText = node.text.toLowerCase();
                  const matchIndex = lowerText.indexOf(searchText);
                  
                  if (matchIndex !== -1) {
                    // 找到匹配，记录位置
                    foundPosition = pos + matchIndex;
                    return false; // 停止遍历
                  }
                }
              });
              
              if (foundPosition !== null) {
                console.log('✅ 找到匹配位置:', foundPosition);
                // 选中匹配的文本
                editor.commands.focus();
                editor.commands.setTextSelection({
                  from: foundPosition,
                  to: foundPosition + state.searchQuery!.length
                });
                
                // 滚动到匹配位置
                if (scrollContainerRef.current) {
                  const { view } = editor;
                  const coords = view.coordsAtPos(foundPosition);
                  const container = scrollContainerRef.current;
                  const containerRect = container.getBoundingClientRect();
                  const targetScrollTop = coords.top + container.scrollTop - containerRect.top - 100;
                  container.scrollTop = Math.max(0, targetScrollTop);
                }
              } else {
                console.warn('⚠️ 未找到匹配文本，滚动到顶部');
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 0;
                }
              }
            } catch (error) {
              console.error('❌ 搜索定位失败:', error);
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
              }
            }
          }, 100);
        } else {
          // 没有搜索关键词，滚动到顶部
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = 0;
            }
          }, 100);
        }
        
        // 重置标记
        useAppStore.setState({ skipCursorRestore: false, searchQuery: null });
        return;
      }
      
      // 恢复光标位置
      const savedPosition = getCursorPosition(documentId);
      if (savedPosition !== null && savedPosition > 0) {
        console.log('📍 尝试恢复光标位置:', savedPosition);
        setTimeout(() => {
          try {
            // 检查位置是否有效
            const docSize = editor.state.doc.content.size;
            if (savedPosition > docSize) {
              console.warn('⚠️ 保存的光标位置超出文档范围，使用文档开头', savedPosition, '>', docSize);
              editor.commands.focus('start');
            } else {
              editor.commands.focus();
              editor.commands.setTextSelection(savedPosition);
              console.log('✅ 成功恢复光标位置');
            }
            
            // 滚动到光标位置
            if (scrollContainerRef.current) {
              const { view } = editor;
              const actualPosition = Math.min(savedPosition, docSize);
              const coords = view.coordsAtPos(actualPosition);
              const container = scrollContainerRef.current;
              const containerRect = container.getBoundingClientRect();
              const targetScrollTop = coords.top + container.scrollTop - containerRect.top - 100;
              container.scrollTop = Math.max(0, targetScrollTop);
            }
          } catch (error) {
            console.warn('⚠️ 恢复光标位置失败:', error);
            // 失败时不做任何滚动，保持在顶部
          }
        }, 100);
      }
      // 如果没有保存的光标位置，不做任何滚动，保持在文档顶部
    }
  }, [documentId, editor]);

  // 监听标签点击事件，滚动到对应位置
  useEffect(() => {
    if (!editor) return;

    const handleScrollToTag = (event: Event) => {
      const customEvent = event as CustomEvent<{ tagId: string }>;
      const tagId = customEvent.detail.tagId;
      
      console.log('🏷️ 查找标签 ID:', tagId);
      
      // 在文档中查找带有该标签 ID 的 Mark
      const { state } = editor;
      let foundPos: { from: number; to: number } | null = null;
      let allTagMarks: any[] = [];
      
      state.doc.descendants((node, pos) => {
        if (foundPos) return false; // 已找到，停止遍历
        
        if (node.marks && node.marks.length > 0) {
          // 收集所有标签 Mark 用于调试
          node.marks.forEach((mark) => {
            if (mark.type.name === 'tagMark') {
              allTagMarks.push({ tagId: mark.attrs.tagId, pos, text: node.text });
            }
          });
          
          const tagMark = node.marks.find(
            (mark) => mark.type.name === 'tagMark' && mark.attrs.tagId === tagId
          );
          
          if (tagMark) {
            foundPos = {
              from: pos,
              to: pos + node.nodeSize,
            };
            return false; // 停止遍历
          }
        }
      });
      
      console.log('📋 文档中的所有标签 Mark:', allTagMarks);
      
      if (!foundPos) {
        // 如果在文档 Mark 中没找到，检查是否是 AIBlock 标签
        const aiBlockTag = tags.find(tag => tag.id === tagId && tag.aiBlockId);
        if (aiBlockTag) {
          console.log('🏷️ 找到 AIBlock 标签，滚动到对应 AIBlock:', aiBlockTag);
          // 查找对应的 AIBlock
          let aiBlockFound = false;
          state.doc.descendants((node, pos) => {
            if (aiBlockFound) return false;
            if (node.type.name === 'aiBlock' && node.attrs.timestamp?.toString() === aiBlockTag.aiBlockId) {
              foundPos = { from: pos, to: pos + node.nodeSize };
              aiBlockFound = true;
              console.log('✅ 找到对应的 AIBlock，位置:', foundPos);
              return false;
            }
          });
          
          if (!aiBlockFound) {
            console.warn('⚠️ 未找到对应的 AIBlock');
            alert('未找到标签对应的 AIBlock');
            return;
          }
        } else {
          console.warn('⚠️ 未找到标签');
          console.log('🔍 查找的标签 ID:', tagId);
          alert('未找到标签，可能已被删除');
          return;
        }
      }
      
      console.log('✅ 找到标签位置:', foundPos);
      
      // 设置光标位置并高亮选中
      editor.commands.focus();
      editor.commands.setTextSelection(foundPos!);
      
      // 滚动到可见区域
      setTimeout(() => {
        const { view } = editor;
        const coords = view.coordsAtPos(foundPos!.from);
        
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          
          // 计算相对于容器的滚动位置
          const targetScrollTop = coords.top + container.scrollTop - containerRect.top - 100;
          
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth',
          });
        }
      }, 100);
    };

    window.addEventListener('scrollToTag', handleScrollToTag);
    
    return () => {
      window.removeEventListener('scrollToTag', handleScrollToTag);
    };
  }, [editor, tags]);

  // 监听插入上下文分隔符事件
  useEffect(() => {
    if (!editor) return;

    const handleInsertSeparator = () => {
      console.log('🧹 插入上下文分隔符');
      (editor.chain().focus() as any).insertContextSeparator().run();
    };

    window.addEventListener('insert-context-separator', handleInsertSeparator);
    
    return () => {
      window.removeEventListener('insert-context-separator', handleInsertSeparator);
    };
  }, [editor]);

  // 监听插入语音文字事件
  useEffect(() => {
    if (!editor) return;

    const handleInsertVoiceText = (event: Event) => {
      const customEvent = event as CustomEvent<{ text: string }>;
      const text = customEvent.detail.text;
      
      console.log('🎤 插入语音文字到编辑器:', text);
      editor.chain().focus().insertContent(text).run();
    };

    window.addEventListener('insert-voice-text', handleInsertVoiceText);
    
    return () => {
      window.removeEventListener('insert-voice-text', handleInsertVoiceText);
    };
  }, [editor]);

  // 监听文档链接点击事件
  useEffect(() => {
    const handleOpenDocument = (event: Event) => {
      const customEvent = event as CustomEvent<{ documentId: string }>;
      const documentId = customEvent.detail.documentId;
      
      console.log('🔗 打开链接的文档:', documentId);
      selectDocument(documentId);
    };

    window.addEventListener('openDocument', handleOpenDocument);
    
    return () => {
      window.removeEventListener('openDocument', handleOpenDocument);
    };
  }, [selectDocument]);

  // 监听删除标签事件，移除文档中的标签 Mark
  useEffect(() => {
    if (!editor) return;

    const handleRemoveTagMark = (event: Event) => {
      const customEvent = event as CustomEvent<{ tagId: string }>;
      const tagId = customEvent.detail.tagId;
      
      console.log('🗑️ 移除标签 Mark:', tagId);
      
      // 遍历文档，找到并移除对应的标签 Mark
      const { state, view } = editor;
      const tr = state.tr;
      let modified = false;
      
      state.doc.descendants((node, pos) => {
        if (node.marks && node.marks.length > 0) {
          const tagMark = node.marks.find(
            (mark) => mark.type.name === 'tagMark' && mark.attrs.tagId === tagId
          );
          
          if (tagMark) {
            // 移除这个 Mark
            tr.removeMark(pos, pos + node.nodeSize, tagMark.type);
            modified = true;
            console.log('✅ 已移除标签 Mark 在位置:', pos);
          }
        }
      });
      
      if (modified) {
        view.dispatch(tr);
        console.log('✅ 文档已更新，标签高亮已移除');
      }
    };

    window.addEventListener('removeTagMark', handleRemoveTagMark);
    
    return () => {
      window.removeEventListener('removeTagMark', handleRemoveTagMark);
    };
  }, [editor]);

  // 立即保存函数
  const saveImmediately = () => {
    if (editor && documentId) {
      // 清除防抖定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      const content = editor.getJSON();
      console.log('💾 立即保存文档:', documentId);
      updateDocument(documentId, content);
    }
  };

  // 监听失去焦点
  useEffect(() => {
    const handleBlur = () => {
      console.log('👋 编辑器失去焦点，立即保存');
      saveImmediately();
      
      // 保存光标位置
      if (editor) {
        try {
          const { from } = editor.state.selection;
          saveCursorPosition(documentId, from);
          console.log('💾 保存光标位置:', from);
        } catch (error) {
          console.error('❌ 保存光标位置失败:', error);
        }
      }
    };

    if (editor) {
      editor.view.dom.addEventListener('blur', handleBlur);
      return () => {
        editor.view.dom.removeEventListener('blur', handleBlur);
      };
    }
  }, [editor, documentId]);

  // 监听页面刷新/关闭
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🔄 页面即将刷新/关闭，立即保存');
      saveImmediately();
      
      // 保存光标位置
      if (editor) {
        try {
          const { from } = editor.state.selection;
          saveCursorPosition(documentId, from);
        } catch (error) {
          console.error('❌ 保存光标位置失败:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editor, documentId]);

  // 监听文档切换
  useEffect(() => {
    return () => {
      console.log('📄 文档切换，立即保存');
      saveImmediately();
      
      // 保存光标位置
      if (editor) {
        try {
          const { from } = editor.state.selection;
          saveCursorPosition(documentId, from);
        } catch (error) {
          console.error('❌ 保存光标位置失败:', error);
        }
      }
    };
  }, [documentId]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSlashCommand = async (prompt: string) => {
    if (!editor) return;

    console.log('🚀 开始 AI 调用:', { prompt, provider: settings.defaultProvider, model: settings.defaultModel });

    setShowSlashMenu(false);
    setAIStreaming(true);

    // 在外层定义 timestamp，以便在 catch 块中使用
    const timestamp = Date.now();

    try {
      // 删除 / 字符
      const { selection } = editor.state;
      const from = selection.from - 1;
      editor.commands.deleteRange({ from, to: selection.from });

      // 提取上下文（在删除 / 之后，这样不会包含 /）
      // 使用 getJSON 获取完整文档结构，包括 AIBlock
      const docJSON = editor.getJSON();
      let contextText = '';
      
      // 查找最后一个上下文分隔符的位置
      let lastSeparatorIndex = -1;
      const allNodes: any[] = [];
      
      const collectNodes = (node: any) => {
        allNodes.push(node);
        if (node.type === 'contextSeparator') {
          lastSeparatorIndex = allNodes.length - 1;
        }
        if (node.content) {
          for (const child of node.content) {
            collectNodes(child);
          }
        }
      };
      
      collectNodes(docJSON);
      
      // 只提取最后一个分隔符之后的节点
      const nodesToExtract = lastSeparatorIndex >= 0 
        ? allNodes.slice(lastSeparatorIndex + 1) 
        : allNodes;
      
      console.log('🧹 找到上下文分隔符:', lastSeparatorIndex >= 0 ? '是' : '否');
      console.log('📝 提取节点数:', nodesToExtract.length, '/ 总节点数:', allNodes.length);
      
      // 递归提取文本内容
      const extractText = (node: any): string => {
        let text = '';
        
        if (node.type === 'text') {
          text += node.text || '';
        } else if (node.type === 'aiBlock') {
          // 提取 AIBlock 的内容
          const prompt = node.attrs?.prompt || '';
          const response = node.attrs?.response || '';
          // 只包含已接受的 AI 回答
          if (node.attrs?.status === 'accepted' || node.attrs?.status === 'complete') {
            text += `\n[用户]: ${prompt}\n[AI]: ${response}\n`;
          }
        } else if (node.content) {
          for (const child of node.content) {
            text += extractText(child);
          }
        }
        
        return text;
      };
      
      // 提取上下文
      for (const node of nodesToExtract) {
        contextText += extractText(node);
      }
      
      console.log('📝 上下文内容（前200字符）:', contextText.substring(0, 200));
      console.log('📝 上下文总长度:', contextText.length);

      // 插入 AI Block
      editor.commands.insertContent({
        type: 'aiBlock',
        attrs: {
          prompt,
          response: '',
          status: 'streaming',
          model: settings.defaultModel,
          timestamp,
        },
      });

      // 滚动到 AIBlock 位置
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);

      // 调用 AI
      let fullResponse = '';
      let updateScheduled = false;
      
      const updateAIBlock = () => {
        if (editor) {
          // 遍历文档查找匹配的 AIBlock
          let found = false;
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'aiBlock' && node.attrs.timestamp === timestamp) {
              // 使用 transaction 直接更新，不改变选区
              const tr = editor.state.tr;
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                response: fullResponse,
              });
              editor.view.dispatch(tr);
              found = true;
              return false; // 停止遍历
            }
          });
          
          if (!found) {
            console.warn('⚠️ 未找到 AIBlock');
          }
          
          // 自动滚动到底部，让用户看到最新的 AI 输出
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          });
        }
        updateScheduled = false;
      };
      
      console.log('🤖 调用 AI Provider...');
      
      await aiService.sendPrompt(
        settings.defaultProvider,
        prompt,
        contextText,
        settings.defaultModel,
        (chunk) => {
          console.log('📨 收到 chunk:', chunk.substring(0, 50));
          fullResponse += chunk;
          
          // 使用 requestAnimationFrame 批量更新，提升性能
          if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(updateAIBlock);
          }
        }
      );
      
      console.log('✅ AI 调用完成，总长度:', fullResponse.length);
      
      // 确保最后一次更新
      updateAIBlock();

      // 标记为完成
      if (editor) {
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'aiBlock' && node.attrs.timestamp === timestamp) {
            const tr = editor.state.tr;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              status: 'complete',
            });
            editor.view.dispatch(tr);
            return false;
          }
        });
      }

    } catch (error) {
      console.error('❌ AI 调用失败:', error);
      
      // 更新 AI Block 显示错误
      if (editor) {
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'aiBlock' && node.attrs.timestamp === timestamp) {
            const tr = editor.state.tr;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              response: `错误: ${error instanceof Error ? error.message : 'AI 调用失败'}`,
              status: 'complete',
            });
            editor.view.dispatch(tr);
            return false;
          }
        });
      }
      
      alert(`AI 调用失败: ${error}`);
    } finally {
      setAIStreaming(false);
    }
  };

  const handleCancelSlashCommand = () => {
    setShowSlashMenu(false);
    
    // 删除 / 字符
    if (editor) {
      const { selection } = editor.state;
      const from = selection.from - 1;
      editor.commands.deleteRange({ from, to: selection.from });
    }
  };

  if (!editor) {
    return <div className="p-8">Loading editor...</div>;
  }



  // 处理聊天发送
  const handleChatSend = async (message: string) => {
    if (!editor || !message.trim()) return;

    console.log('💬 发送聊天消息:', message);
    setAIStreaming(true);

    const timestamp = Date.now();
    let fullResponse = '';

    try {
      // 移动到文档末尾
      editor.commands.focus('end');
      
      // 提取上下文
      const docJSON = editor.getJSON();
      let contextText = '';
      
      // 查找最后一个上下文分隔符的位置
      let lastSeparatorIndex = -1;
      const allNodes: any[] = [];
      
      const collectNodes = (node: any) => {
        allNodes.push(node);
        if (node.type === 'contextSeparator') {
          lastSeparatorIndex = allNodes.length - 1;
        }
        if (node.content) {
          for (const child of node.content) {
            collectNodes(child);
          }
        }
      };
      
      collectNodes(docJSON);
      
      const nodesToExtract = lastSeparatorIndex >= 0 
        ? allNodes.slice(lastSeparatorIndex + 1) 
        : allNodes;
      
      const extractText = (node: any): string => {
        let text = '';
        if (node.type === 'text') {
          text += node.text || '';
        } else if (node.type === 'aiBlock') {
          const prompt = node.attrs?.prompt || '';
          const response = node.attrs?.response || '';
          if (node.attrs?.status === 'accepted' || node.attrs?.status === 'complete') {
            text += `\n[用户]: ${prompt}\n[AI]: ${response}\n`;
          }
        } else if (node.content) {
          for (const child of node.content) {
            text += extractText(child);
          }
        }
        return text;
      };
      
      for (const node of nodesToExtract) {
        contextText += extractText(node);
      }

      console.log('📝 上下文长度:', contextText.length);

      // 在文档末尾插入 AI Block
      editor.commands.insertContent({
        type: 'aiBlock',
        attrs: {
          prompt: message,
          response: '',
          status: 'streaming',
          model: settings.defaultModel,
          timestamp,
        },
      });

      // 滚动到底部
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);

      // 调用 AI
      let updateScheduled = false;
      
      const updateAIBlock = () => {
        if (editor) {
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'aiBlock' && node.attrs.timestamp === timestamp) {
              const tr = editor.state.tr;
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                response: fullResponse,
              });
              editor.view.dispatch(tr);
              return false;
            }
          });
          updateScheduled = false;
        }
      };

      await aiService.sendPrompt(
        settings.defaultProvider,
        message,
        contextText,
        settings.defaultModel,
        (chunk) => {
          fullResponse += chunk;
          if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(updateAIBlock);
          }
        }
      );

      // 最终更新
      updateAIBlock();

      // 标记为完成
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'aiBlock' && node.attrs.timestamp === timestamp) {
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            status: 'complete',
          });
          editor.view.dispatch(tr);
          return false;
        }
      });

      console.log('✅ AI 回复完成');
      
    } catch (error) {
      console.error('❌ AI 调用失败:', error);
      
      // 标记为错误
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'aiBlock' && node.attrs.timestamp === timestamp) {
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            response: (fullResponse || '') + '\n\n❌ 生成失败',
            status: 'complete',
          });
          editor.view.dispatch(tr);
          return false;
        }
      });
    } finally {
      setAIStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* 工具栏 */}
      <EditorToolbar editor={editor} />
      
      {/* 编辑器区域 - 可滚动 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        <EditorContent editor={editor} />

        {/* Tag Context Menu */}
        <TagContextMenu editor={editor} />

        {/* Slash Command Menu */}
        {showSlashMenu && (
          <SlashCommandMenu
            position={slashMenuPosition}
            onSubmit={handleSlashCommand}
            onCancel={handleCancelSlashCommand}
          />
        )}
      </div>

      {/* 聊天输入框 - 固定在底部 */}
      <div className="border-t-2 border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)]">
        <ChatInput 
          onSend={handleChatSend}
          disabled={aiStreaming}
          isStreaming={aiStreaming}
          onStop={() => {
            console.log('🛑 用户点击停止按钮');
            aiService.stopGeneration();
            setAIStreaming(false);
          }}
        />
      </div>

      {/* 样式 */}
      <style>{`
        .ProseMirror {
          color: var(--text-primary);
        }
        
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror p {
          margin: 0.5em 0;
          line-height: 1.6;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        
        .ProseMirror code {
          background-color: var(--bg-tertiary);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        
        .ProseMirror pre {
          background-color: var(--bg-tertiary);
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          margin: 0.5em 0;
        }
        
        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
        }
        
        .ProseMirror blockquote {
          border-left: 3px solid var(--border-color);
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
          color: var(--text-secondary);
        }
        
        .ProseMirror mark.tag-highlight {
          background-color: #fef3c7;
          padding: 0.1em 0.2em;
          border-radius: 3px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .ProseMirror mark.tag-highlight:hover {
          background-color: #fde68a;
        }
        
        [data-theme="dark"] .ProseMirror mark.tag-highlight {
          background-color: #78350f;
          color: #fef3c7;
        }
        
        [data-theme="dark"] .ProseMirror mark.tag-highlight:hover {
          background-color: #92400e;
        }
        
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1em 0;
          overflow: hidden;
        }
        
        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid var(--border-color);
          padding: 0.5em;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        
        .ProseMirror table th {
          font-weight: bold;
          text-align: left;
          background-color: var(--bg-secondary);
        }
        
        .ProseMirror table .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
        }
        
        /* 待办清单样式 */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin: 0.5rem 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-top: 0.25rem;
          user-select: none;
        }
        
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }
        
        .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
          width: 1.2rem;
          height: 1.2rem;
          cursor: pointer;
          border-radius: 0.25rem;
          border: 2px solid var(--border-color);
          appearance: none;
          background-color: var(--bg-primary);
          transition: all 0.2s;
        }
        
        .ProseMirror ul[data-type="taskList"] input[type="checkbox"]:checked {
          background-color: var(--accent-primary);
          border-color: var(--accent-primary);
          background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
        }
        
        .ProseMirror ul[data-type="taskList"] input[type="checkbox"]:hover {
          border-color: var(--accent-primary);
        }
        
        .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          opacity: 0.6;
        }
        
        /* 图片样式 */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
          box-shadow: var(--shadow-md);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ProseMirror img:hover {
          box-shadow: var(--shadow-lg);
          transform: scale(1.02);
        }
        
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid var(--accent-primary);
          outline-offset: 2px;
        }
        
        /* 文档链接样式 */
        .ProseMirror a.document-link {
          color: var(--accent-primary);
          text-decoration: none;
          padding: 0.1em 0.3em;
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .ProseMirror a.document-link:hover {
          background-color: rgba(59, 130, 246, 0.2);
          text-decoration: underline;
        }
        
        .ProseMirror a.document-link::before {
          content: '📄 ';
        }
      `}</style>
      
      <EditorContent editor={editor} />

      {/* Tag Context Menu */}
      <TagContextMenu editor={editor} />

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <SlashCommandMenu
          position={slashMenuPosition}
          onSubmit={handleSlashCommand}
          onCancel={handleCancelSlashCommand}
        />
      )}
    </div>
  );
};
