export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_CONFIG: Omit<OpenAIConfig, 'apiKey'> = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1024,
};
