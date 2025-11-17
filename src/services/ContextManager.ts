import { ContextManagementConfig } from '../types';
import { AIProvider } from './ai/types';

export class ContextManager {
  private config: ContextManagementConfig;
  private memoryHistory: string = ''; // 记忆历史（总结后的内容）
  private recentHistory: string = ''; // 最近的历史（未总结的内容）
  private aiProvider: AIProvider | null = null;
  private onSummaryUpdate: ((summary: string) => Promise<void>) | null = null;
  
  constructor(config: ContextManagementConfig) {
    this.config = config;
  }
  
  /**
   * 设置保存回调
   */
  setDocument(_documentId: string, onSummaryUpdate: (summary: string) => Promise<void>): void {
    this.onSummaryUpdate = onSummaryUpdate;
  }
  
  /**
   * 加载已保存的总结历史
   */
  loadSummary(summary: string | undefined): void {
    if (summary) {
      this.memoryHistory = summary;
      console.log('📚 加载已保存的总结历史，长度:', summary.length);
    }
  }
  
  /**
   * 设置 AI Provider（用于总结）
   */
  setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: ContextManagementConfig): void {
    this.config = config;
  }
  
  /**
   * 智能处理上下文
   * @param content 完整的文档内容（包括文档、AI提问、AI回答）
   * @returns 处理后的上下文（记忆历史 + 最近历史）
   */
  async processContext(content: string): Promise<string> {
    console.log('🧠 ContextManager.processContext 调用');
    console.log('  - 内容长度:', content.length);
    console.log('  - 记忆历史长度:', this.memoryHistory.length);
    console.log('  - 最近历史长度:', this.recentHistory.length);
    console.log('  - 阈值:', this.config.maxContextLength);
    
    // 如果未启用智能上下文管理，直接返回原内容
    if (!this.config.enabled) {
      console.log('⚠️ 智能上下文管理未启用，直接返回原内容');
      return content;
    }
    
    // 更新最近历史
    this.recentHistory = content;
    
    // 检查最近历史是否超过阈值
    if (this.recentHistory.length > this.config.maxContextLength) {
      console.log('📝 最近历史超过阈值，开始总结...');
      await this.summarizeAndUpdateMemory();
    }
    
    // 返回：记忆历史 + 最近历史
    const finalContext = this.buildFinalContext();
    console.log('✅ 最终上下文长度:', finalContext.length);
    
    return finalContext;
  }
  
  /**
   * 总结最近历史并更新记忆
   */
  private async summarizeAndUpdateMemory(): Promise<void> {
    console.log('📝 开始总结最近历史...');
    console.log('  - 最近历史长度:', this.recentHistory.length);
    
    try {
      let summary = '';
      
      // 构建总结提示词
      const prompt = `请总结以下对话和文档内容的核心要点。保留所有重要信息、关键概念、用户问题和AI回答的要点。要求简洁但信息完整，不要遗漏重要细节：

${this.recentHistory}

请用简洁的语言总结上述内容的核心要点：`;
      
      console.log('🤖 调用 AI Provider 进行总结...');
      
      if (!this.aiProvider) {
        throw new Error('AI Provider 未设置');
      }
      
      await this.aiProvider.sendPrompt(
        prompt,
        '',
        this.config.summaryModel,
        (chunk) => {
          summary += chunk;
        }
      );
      
      summary = summary.trim();
      console.log('✅ 总结完成，长度:', summary.length);
      console.log('📄 总结内容:', summary.substring(0, 200) + '...');
      
      // 更新记忆历史：覆盖旧的总结
      this.memoryHistory = '[历史总结]\n' + summary;
      
      // 清空最近历史
      this.recentHistory = '';
      
      console.log('✅ 记忆历史已更新，长度:', this.memoryHistory.length);
      
      // 保存到数据库
      if (this.onSummaryUpdate) {
        await this.onSummaryUpdate(this.memoryHistory);
        console.log('💾 总结已保存到数据库');
      }
      
    } catch (error) {
      console.error('❌ 总结失败:', error);
      // 失败时保留原内容，只截断到阈值
      this.recentHistory = this.recentHistory.slice(-this.config.maxContextLength);
      console.log('⚠️ 使用降级方案：截断到阈值');
    }
  }
  
  /**
   * 构建最终上下文：记忆历史 + 最近历史
   */
  private buildFinalContext(): string {
    if (this.memoryHistory && this.recentHistory) {
      return `${this.memoryHistory}\n\n[最近内容]\n${this.recentHistory}`;
    } else if (this.memoryHistory) {
      return this.memoryHistory;
    } else {
      return this.recentHistory;
    }
  }
  
  /**
   * 重置上下文管理器（清空所有历史）
   */
  reset(): void {
    console.log('🔄 重置上下文管理器');
    this.memoryHistory = '';
    this.recentHistory = '';
  }
  
  /**
   * 获取当前状态（用于调试）
   */
  getStatus(): { memoryLength: number; recentLength: number; totalLength: number } {
    return {
      memoryLength: this.memoryHistory.length,
      recentLength: this.recentHistory.length,
      totalLength: this.memoryHistory.length + this.recentHistory.length,
    };
  }
}
