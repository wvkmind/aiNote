import { JSONContent } from '@tiptap/react';
import { Document } from '../types';

export class ExportUtils {
  // 将 TipTap JSON 转换为纯文本
  static toPlainText(content: JSONContent): string {
    let text = '';

    const traverse = (node: JSONContent) => {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.type === 'paragraph') {
        if (node.content) {
          node.content.forEach(traverse);
        }
        text += '\n\n';
      } else if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        if (node.content) {
          text += prefix + ' ';
          node.content.forEach(traverse);
        }
        text += '\n\n';
      } else if (node.type === 'codeBlock') {
        text += '```\n';
        if (node.content) {
          node.content.forEach(traverse);
        }
        text += '\n```\n\n';
      } else if (node.type === 'aiBlock') {
        const prompt = node.attrs?.prompt || '';
        const response = node.attrs?.response || '';
        const model = node.attrs?.model || '';
        const status = node.attrs?.status || '';
        
        if (status === 'accepted' || status === 'complete') {
          text += `\n[AI 对话 - ${model}]\n`;
          text += `用户: ${prompt}\n`;
          text += `AI: ${response}\n\n`;
        }
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        if (node.content) {
          node.content.forEach(traverse);
        }
        text += '\n';
      } else if (node.type === 'listItem') {
        text += '• ';
        if (node.content) {
          node.content.forEach(traverse);
        }
        text += '\n';
      } else if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(content);
    return text.trim();
  }

  // 将 TipTap JSON 转换为 Markdown
  static toMarkdown(content: JSONContent): string {
    let markdown = '';

    const traverse = (node: JSONContent) => {
      if (node.type === 'text') {
        let text = node.text || '';
        // 处理文本标记
        if (node.marks) {
          node.marks.forEach(mark => {
            if (mark.type === 'bold') {
              text = `**${text}**`;
            } else if (mark.type === 'italic') {
              text = `*${text}*`;
            } else if (mark.type === 'code') {
              text = `\`${text}\``;
            }
          });
        }
        markdown += text;
      } else if (node.type === 'paragraph') {
        if (node.content) {
          node.content.forEach(traverse);
        }
        markdown += '\n\n';
      } else if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        markdown += prefix + ' ';
        if (node.content) {
          node.content.forEach(traverse);
        }
        markdown += '\n\n';
      } else if (node.type === 'codeBlock') {
        const lang = node.attrs?.language || '';
        markdown += '```' + lang + '\n';
        if (node.content) {
          node.content.forEach(traverse);
        }
        markdown += '\n```\n\n';
      } else if (node.type === 'aiBlock') {
        const prompt = node.attrs?.prompt || '';
        const response = node.attrs?.response || '';
        const model = node.attrs?.model || '';
        const status = node.attrs?.status || '';
        
        if (status === 'accepted' || status === 'complete') {
          markdown += `\n---\n`;
          markdown += `**AI 对话** (${model})\n\n`;
          markdown += `**用户**: ${prompt}\n\n`;
          markdown += `**AI**: ${response}\n\n`;
          markdown += `---\n\n`;
        }
      } else if (node.type === 'bulletList') {
        if (node.content) {
          node.content.forEach(traverse);
        }
        markdown += '\n';
      } else if (node.type === 'orderedList') {
        if (node.content) {
          let index = 1;
          node.content.forEach(child => {
            markdown += `${index}. `;
            if (child.content) {
              child.content.forEach(traverse);
            }
            markdown += '\n';
            index++;
          });
        }
        markdown += '\n';
      } else if (node.type === 'listItem') {
        markdown += '- ';
        if (node.content) {
          node.content.forEach(traverse);
        }
        markdown += '\n';
      } else if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(content);
    return markdown.trim();
  }

  // 导出为 JSON
  static exportAsJSON(document: Document): string {
    return JSON.stringify(document, null, 2);
  }

  // 导出为 Markdown
  static exportAsMarkdown(document: Document): string {
    let markdown = `# ${document.title}\n\n`;
    markdown += `创建时间: ${new Date(document.createdAt < 10000000000 ? document.createdAt * 1000 : document.createdAt).toLocaleString('zh-CN')}\n`;
    markdown += `更新时间: ${new Date(document.updatedAt < 10000000000 ? document.updatedAt * 1000 : document.updatedAt).toLocaleString('zh-CN')}\n\n`;
    markdown += `---\n\n`;
    markdown += this.toMarkdown(document.content);
    return markdown;
  }

  // 导出为纯文本
  static exportAsText(document: Document): string {
    let text = `${document.title}\n`;
    text += `${'='.repeat(document.title.length)}\n\n`;
    text += `创建时间: ${new Date(document.createdAt < 10000000000 ? document.createdAt * 1000 : document.createdAt).toLocaleString('zh-CN')}\n`;
    text += `更新时间: ${new Date(document.updatedAt < 10000000000 ? document.updatedAt * 1000 : document.updatedAt).toLocaleString('zh-CN')}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;
    text += this.toPlainText(document.content);
    return text;
  }

  // 下载文件
  static async downloadFile(content: string, filename: string, mimeType: string) {
    try {
      // 在 Tauri 环境中使用文件保存对话框
      const { save } = await import('@tauri-apps/plugin-dialog');
      
      console.log('📥 打开保存对话框，默认文件名:', filename);
      
      const extension = filename.split('.').pop() || 'txt';
      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: `${extension.toUpperCase()} 文件`,
          extensions: [extension]
        }]
      });
      
      if (filePath) {
        console.log('📥 保存文件到:', filePath);
        
        // 使用 Tauri 的 invoke 调用后端保存文件
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_file', { path: filePath, content });
        
        console.log('✅ 文件保存成功');
      } else {
        console.log('❌ 用户取消保存');
      }
    } catch (error) {
      console.error('❌ 保存文件失败:', error);
      // 降级到浏览器下载
      console.log('📥 降级到浏览器下载');
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
}
