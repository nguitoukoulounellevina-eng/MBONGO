import { SYSTEM_PROMPT } from './prompts/system';
import type { OpenAIConfig, ChatMessage } from './types';
import { DEFAULT_CONFIG } from './types';

/* ═══════════════════════════════════════════
   Configuration
   ═══════════════════════════════════════════ */
let config: OpenAIConfig | null = null;

export function configureOpenAI(cfg: Partial<OpenAIConfig> & { apiKey: string }): void {
  config = {
    apiKey: cfg.apiKey,
    model: cfg.model || DEFAULT_CONFIG.model,
    temperature: cfg.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: cfg.maxTokens || DEFAULT_CONFIG.maxTokens,
  };
}

export function isOpenAIConfigured(): boolean {
  return config !== null && config.apiKey.length > 0;
}

export function resetOpenAIConfig(): void {
  config = null;
}

/* ═══════════════════════════════════════════
   Historique de conversation
   ═══════════════════════════════════════════ */

const MAX_HISTORY_EXCHANGES = 6; // 6 paires (user + assistant) max

let conversationHistory: ChatMessage[] = [];

export function getHistory(): ChatMessage[] {
  return [...conversationHistory];
}

export function addToHistory(role: 'user' | 'assistant', content: string): void {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > MAX_HISTORY_EXCHANGES * 2) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_EXCHANGES * 2);
  }
}

export function resetHistory(): void {
  conversationHistory = [];
}

/* ═══════════════════════════════════════════
   Estimation sommaire du nombre de tokens
   ═══════════════════════════════════════════ */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/* ═══════════════════════════════════════════
   Assembly des messages
   ═══════════════════════════════════════════ */
const MAX_CONTEXT_TOKENS = 2500;
const MAX_HISTORY_TOKENS = 1500;

function buildMessages(context: string, userMessage: string): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // 1. Système — toujours en premier
  messages.push({ role: 'system', content: SYSTEM_PROMPT });

  // 2. Contexte financier — limité en taille
  let contextText = context;
  if (estimateTokens(context) > MAX_CONTEXT_TOKENS) {
    const lines = context.split('\n');
    let truncated = '';
    for (const line of lines) {
      if (estimateTokens(truncated + line) > MAX_CONTEXT_TOKENS) break;
      truncated += line + '\n';
    }
    contextText = truncated + '\n[Le contexte a été tronqué pour limiter la taille de la requête.]';
  }
  messages.push({ role: 'system', content: `Voici les données financières actuelles de l'utilisateur :\n\n${contextText}` });

  // 3. Historique récent — limité en tokens
  let historyTokens = 0;
  const recentHistory: ChatMessage[] = [];
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const tokens = estimateTokens(msg.content);
    if (historyTokens + tokens > MAX_HISTORY_TOKENS) break;
    historyTokens += tokens;
    recentHistory.unshift(msg);
  }
  messages.push(...recentHistory);

  // 4. Message utilisateur
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/* ═══════════════════════════════════════════
   Appel à l'API OpenAI
   ═══════════════════════════════════════════ */
interface OpenAIResponse {
  success: boolean;
  text: string;
  error?: string;
}

const API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 15000;

async function callOpenAI(messages: ChatMessage[]): Promise<OpenAIResponse> {
  if (!config) {
    return { success: false, text: '', error: 'OpenAI n\'est pas configuré.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return {
        success: false,
        text: '',
        error: `Erreur API OpenAI (${response.status}) : ${errBody || response.statusText}`,
      };
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, text: '', error: 'Réponse vide de l\'API OpenAI.' };
    }

    return { success: true, text: content.trim() };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === 'AbortError') {
      return { success: false, text: '', error: 'La requête a expiré.' };
    }
    return { success: false, text: '', error: e?.message || 'Erreur réseau lors de l\'appel à OpenAI.' };
  }
}

/* ═══════════════════════════════════════════
   API publique — askMotema
   ═══════════════════════════════════════════ */
export async function askMotema(
  context: string,
  userMessage: string,
): Promise<OpenAIResponse> {
  if (!isOpenAIConfigured()) {
    return {
      success: false,
      text: '',
      error: 'OpenAI n\'est pas configuré.',
    };
  }

  const messages = buildMessages(context, userMessage);
  const result = await callOpenAI(messages);

  if (result.success) {
    addToHistory('user', userMessage);
    addToHistory('assistant', result.text);
  }

  return result;
}
