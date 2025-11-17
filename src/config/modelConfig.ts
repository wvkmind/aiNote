// 模型配置信息
export interface ModelInfo {
  name: string;
  provider: 'poe' | 'ollama';
  contextLength: number;  // 最大上下文长度（tokens）
  description?: string;
}

// Poe 模型配置
export const POE_MODELS: Record<string, ModelInfo> = {
  'Claude-Sonnet-4.5': {
    name: 'Claude-Sonnet-4.5',
    provider: 'poe',
    contextLength: 200000,  // 200k tokens
    description: 'Anthropic 最先进模型，推理、数学和编程能力显著提升 - 推荐使用'
  },
  'GPT-5-Chat': {
    name: 'GPT-5-Chat',
    provider: 'poe',
    contextLength: 400000,  // 400k tokens
    description: 'ChatGPT 非推理模型，原生视觉功能，智能水平高于 GPT-4.1'
  },
  'Claude-3-Sonnet': {
    name: 'Claude-3-Sonnet',
    provider: 'poe',
    contextLength: 200000,  // 200k tokens
    description: 'Claude 3 Sonnet'
  },
  'GPT-4o': {
    name: 'GPT-4o',
    provider: 'poe',
    contextLength: 128000,  // 128k tokens
    description: 'GPT-4 Optimized'
  },
  'Claude-3.5-Sonnet': {
    name: 'Claude-3.5-Sonnet',
    provider: 'poe',
    contextLength: 200000,  // 200k tokens
    description: 'Claude 3.5 Sonnet'
  },
  'GPT-4-Turbo': {
    name: 'GPT-4-Turbo',
    provider: 'poe',
    contextLength: 128000,  // 128k tokens
    description: 'GPT-4 Turbo'
  },
};

// Ollama 模型配置（默认值，实际可能不同）
export const OLLAMA_MODELS: Record<string, ModelInfo> = {
  'llama2': {
    name: 'llama2',
    provider: 'ollama',
    contextLength: 4096,  // 4k tokens
    description: 'Llama 2'
  },
  'mistral': {
    name: 'mistral',
    provider: 'ollama',
    contextLength: 8192,  // 8k tokens
    description: 'Mistral'
  },
  'deepseek-r1:8b': {
    name: 'deepseek-r1:8b',
    provider: 'ollama',
    contextLength: 32768,  // 32k tokens
    description: 'DeepSeek R1 8B'
  },
  'qwen2.5:7b': {
    name: 'qwen2.5:7b',
    provider: 'ollama',
    contextLength: 32768,  // 32k tokens
    description: 'Qwen 2.5 7B'
  },
  'llama3.1:8b': {
    name: 'llama3.1:8b',
    provider: 'ollama',
    contextLength: 128000,  // 128k tokens
    description: 'Llama 3.1 8B'
  },
};

// 获取模型信息
export function getModelInfo(modelName: string, provider: 'poe' | 'ollama'): ModelInfo | null {
  if (provider === 'poe') {
    return POE_MODELS[modelName] || null;
  } else {
    return OLLAMA_MODELS[modelName] || null;
  }
}

// 获取模型的上下文长度（tokens）
export function getModelContextLength(modelName: string, provider: 'poe' | 'ollama'): number {
  const modelInfo = getModelInfo(modelName, provider);
  return modelInfo?.contextLength || 4096; // 默认 4k tokens
}

// 将 tokens 转换为字符数（中文）
export function tokensToChars(tokens: number): number {
  return Math.floor(tokens * 0.5); // 1 token ≈ 0.5 中文字符
}

// 将字符数转换为 tokens（中文）
export function charsToTokens(chars: number): number {
  return Math.ceil(chars / 0.5); // 1 token ≈ 0.5 中文字符
}

// 计算推荐的上下文阈值
export function getRecommendedContextLength(modelName: string, provider: 'poe' | 'ollama'): {
  maxContextLength: number;  // 字符数
  recentTextLength: number;  // 字符数
} {
  const modelTokens = getModelContextLength(modelName, provider);
  const modelChars = tokensToChars(modelTokens);
  
  // 使用 60% 的容量作为上下文，预留 40% 给响应和系统提示
  const maxContextLength = Math.floor(modelChars * 0.6);
  
  // 保留最近文本为上下文的 3-5%
  const recentTextLength = Math.min(Math.floor(maxContextLength * 0.03), 20000);
  
  return {
    maxContextLength,
    recentTextLength: Math.max(recentTextLength, 5000), // 最少 5k
  };
}

// 获取所有可用模型列表
export function getAllModels(): ModelInfo[] {
  return [
    ...Object.values(POE_MODELS),
    ...Object.values(OLLAMA_MODELS),
  ];
}
