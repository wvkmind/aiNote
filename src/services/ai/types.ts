export interface AIProvider {
  name: 'poe' | 'ollama';
  sendPrompt(
    prompt: string,
    context: string,
    model: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void>;
}
