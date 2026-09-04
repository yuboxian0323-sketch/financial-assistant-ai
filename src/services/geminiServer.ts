export const GEMINI_MODEL = 'gemini-3.5-flash-lite' as const;

type GeminiFailureKind = 'RATE_LIMIT' | 'CREDENTIAL' | 'MODEL' | 'PROVIDER' | 'TIMEOUT';

export class GeminiProviderError extends Error {
  constructor(public readonly kind: GeminiFailureKind) {
    super(kind);
    this.name = 'GeminiProviderError';
  }
}

interface GeminiGenerateResponse {
  candidates?: {
    content?: { parts?: { text?: unknown }[] };
    finishReason?: unknown;
  }[];
}

function extractText(response: GeminiGenerateResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.map((part) => typeof part.text === 'string' ? part.text : '').join('').trim();
  return text || null;
}

function failureKind(status: number): GeminiFailureKind {
  if (status === 429) return 'RATE_LIMIT';
  if (status === 401 || status === 403) return 'CREDENTIAL';
  if (status === 404) return 'MODEL';
  return 'PROVIDER';
}

/** Calls Gemini's supported structured-output method without exposing credentials to the app bundle. */
export async function generateStructuredGemini({
  apiKey,
  systemInstruction,
  input,
  schema,
  maxOutputTokens,
  timeoutMs = 45_000,
}: {
  apiKey: string;
  systemInstruction: string;
  input: string;
  schema: unknown;
  maxOutputTokens: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: input }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      },
    );
    if (!response.ok) throw new GeminiProviderError(failureKind(response.status));
    return extractText(await response.json() as GeminiGenerateResponse);
  } catch (error) {
    if (error instanceof GeminiProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new GeminiProviderError('TIMEOUT');
    throw new GeminiProviderError('PROVIDER');
  } finally {
    clearTimeout(timeout);
  }
}
