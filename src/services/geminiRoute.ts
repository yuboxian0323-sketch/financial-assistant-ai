import { GeminiProviderError } from './geminiServer';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isBoundedString = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;

export function parseModelJson<T>(text: string, validate: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(text);
    return validate(value) ? value : null;
  } catch {
    return null;
  }
}

export const jsonError = (code: string, message: string, status: number): Response =>
  Response.json({ code, message }, { status });

export const noStoreJson = <T>(key: string, value: T): Response =>
  Response.json({ [key]: value }, { headers: { 'Cache-Control': 'no-store' } });

export async function readJsonRequest(request: Request, message: string): Promise<
  { ok: true; body: unknown } | { ok: false; response: Response }
> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: jsonError('INVALID_REQUEST', message, 400) };
  }
}

export function geminiErrorResponse(error: unknown, unavailableMessage: string): Response {
  const kind = error instanceof GeminiProviderError ? error.kind : 'PROVIDER';
  const status = kind === 'RATE_LIMIT' ? 429 : kind === 'CREDENTIAL' || kind === 'MODEL' ? 503 : 502;
  const message = kind === 'RATE_LIMIT' ? 'The free Gemini rate limit was reached. Wait briefly and try again.'
    : kind === 'CREDENTIAL' ? 'The Gemini credential was rejected.'
      : kind === 'MODEL' ? 'The configured Gemini model is unavailable.'
        : kind === 'TIMEOUT' ? 'Gemini did not respond in time.' : unavailableMessage;
  return jsonError('GEMINI_ERROR', message, status);
}
