import { AIProvider } from './types';

export class OllamaProvider implements AIProvider {
  name = 'ollama' as const;
  
  constructor(private baseUrl: string = 'http://localhost:11434') {}
  
  async sendPrompt(
    prompt: string,
    context: string,
    model: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const fullPrompt = context 
      ? `上下文：${context}\n\n${prompt}`
      : prompt;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          prompt: fullPrompt,
          stream: true
        }),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                onChunk(json.response);
              }
              // Check if generation is done
              if (json.done) {
                break;
              }
            } catch (e) {
              console.error('Failed to parse Ollama response:', e);
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('🛑 Ollama Provider - 生成已停止');
          return;
        }
        throw error;
      } finally {
        reader.cancel();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Ollama Provider - 请求已取消');
        return;
      }
      console.error('Ollama API error:', error);
      throw error;
    }
  }
}
