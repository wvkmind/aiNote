import { AIProvider } from './types';

export class PoeProvider implements AIProvider {
  name = 'poe' as const;
  private apiUrl = 'https://api.poe.com/v1/chat/completions';
  
  constructor(private apiKey: string) {}
  
  async sendPrompt(
    prompt: string,
    context: string,
    model: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    console.log('🔑 Poe Provider - API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('📤 Poe Provider - 发送请求:', { model, prompt: prompt.substring(0, 50) });
    console.log('📤 Poe Provider - 上下文长度:', context.length);
    console.log('📤 Poe Provider - 上下文内容:', context.substring(0, 200));
    
    const messages: Array<{ role: string; content: string }> = [];
    
    if (context) {
      console.log('✅ 添加上下文到消息');
      messages.push({ role: 'system', content: `上下文：${context}` });
    } else {
      console.log('⚠️ 没有上下文');
    }
    messages.push({ role: 'user', content: prompt });
    
    console.log('📤 最终消息数组:', messages.length, '条消息');
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true
        }),
        signal
      });
      
      console.log('📥 Poe Provider - 响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Poe API 错误响应:', errorText);
        throw new Error(`Poe API error: ${response.status} ${response.statusText} - ${errorText}`);
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('🛑 Poe Provider - 生成已停止');
          return;
        }
        throw error;
      } finally {
        reader.cancel();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Poe Provider - 请求已取消');
        return;
      }
      console.error('Poe API error:', error);
      throw error;
    }
  }
}
