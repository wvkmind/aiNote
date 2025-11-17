import { AIProvider } from './types';
import { PoeProvider } from './PoeProvider';
import { OllamaProvider } from './OllamaProvider';

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private abortController: AbortController | null = null;
  
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  /**
   * 停止当前的 AI 生成
   */
  stopGeneration(): void {
    if (this.abortController) {
      console.log('🛑 停止 AI 生成');
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  async sendPrompt(
    providerName: 'poe' | 'ollama',
    prompt: string,
    context: string,
    model: string,
    onChunk: (text: string) => void
  ): Promise<void> {
    console.log('📞 AIService.sendPrompt 调用');
    console.log('  - Provider:', providerName);
    console.log('  - Prompt:', prompt.substring(0, 50));
    console.log('  - 上下文长度:', context.length);
    console.log('  - 上下文内容:', context.substring(0, 100));
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    // 创建新的 AbortController
    this.abortController = new AbortController();
    
    try {
      return await provider.sendPrompt(prompt, context, model, onChunk, this.abortController.signal);
    } finally {
      this.abortController = null;
    }
  }
  

}

// 创建单例实例
export const aiService = new AIService();
