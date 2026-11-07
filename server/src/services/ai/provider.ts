import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionChoice {
  message?: { content?: string };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: { message?: string; type?: string };
}

export function isConfigured(): boolean {
  return Boolean(env.AI_API_KEY && env.AI_API_KEY.trim().length > 0);
}

/**
 * Calls an OpenAI-compatible Chat Completions endpoint and returns the raw
 * assistant text. The API key never leaves this server.
 */
export async function chat(messages: ChatMessage[], options: { json?: boolean } = {}): Promise<string> {
  if (!isConfigured()) {
    throw ApiError.serviceUnavailable('AI provider is not configured', {
      code: 'AI_NOT_CONFIGURED',
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);
  const url = `${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        temperature: 0.6,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logger.error('AI provider rejected credentials', { status: response.status });
        throw ApiError.serviceUnavailable(
          'AI provider rejected the configured API key. Check AI_API_KEY.',
          { code: 'AI_AUTH_ERROR' },
        );
      }
      if (response.status === 429) {
        throw ApiError.serviceUnavailable('AI provider rate limit reached. Try again shortly.', {
          code: 'AI_RATE_LIMITED',
        });
      }
      logger.error('AI provider error', { status: response.status, message: data?.error?.message });
      throw ApiError.serviceUnavailable('AI provider request failed. Please try again.', {
        code: 'AI_PROVIDER_ERROR',
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw ApiError.serviceUnavailable('AI provider returned an empty response', {
        code: 'AI_EMPTY_RESPONSE',
      });
    }
    return content;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw ApiError.serviceUnavailable('AI request timed out. Please try again.', {
        code: 'AI_TIMEOUT',
      });
    }
    logger.error('AI request failed', { message: err instanceof Error ? err.message : String(err) });
    throw ApiError.serviceUnavailable('Could not reach the AI provider. Please try again.', {
      code: 'AI_NETWORK_ERROR',
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Extracts a JSON object from a model response, tolerating code fences/prose. */
export function parseJsonResponse<T>(content: string): T {
  const trimmed = content.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced?.[1] ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  const jsonText = start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw ApiError.serviceUnavailable('AI returned a malformed response. Please try again.', {
      code: 'AI_PARSE_ERROR',
    });
  }
}
