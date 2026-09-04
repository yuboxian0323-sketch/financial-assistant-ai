import { GEMINI_MODEL, GeminiProviderError, generateStructuredGemini } from '@/services/geminiServer';
import type { NewsAISummary, NewsAISummaryRequest } from '@/types/domain';

const newsSummarySchema = {
  type: 'object',
  properties: {
    overview: { type: 'string', description: 'A detailed two-to-four paragraph explanation grounded only in the supplied article synopsis.' },
    keyFacts: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    whyItMatters: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    risksAndUnknowns: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    questionsToResearch: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
  },
  required: ['overview', 'keyFacts', 'whyItMatters', 'risksAndUnknowns', 'questionsToResearch', 'sentiment'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function validRequest(value: unknown): value is NewsAISummaryRequest {
  if (!isRecord(value) || !isRecord(value.article) || JSON.stringify(value).length > 30_000) return false;
  const article = value.article;
  const validArticle = isBoundedString(article.headline, 1_000)
    && isBoundedString(article.summary, 12_000)
    && isBoundedString(article.source, 300)
    && isBoundedString(article.category, 300)
    && isBoundedString(article.publishedAt, 100)
    && Array.isArray(article.relatedSymbols)
    && article.relatedSymbols.length <= 20
    && article.relatedSymbols.every((symbol) => isBoundedString(symbol, 30));
  if (!validArticle || value.company === undefined) return validArticle;
  if (!isRecord(value.company)) return false;
  const company = value.company;
  return ['ticker', 'name', 'industry', 'overview', 'bullThesis', 'bearThesis'].every(
    (key) => isBoundedString(company[key], 4_000),
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseSummary(text: string): Omit<NewsAISummary, 'model' | 'generatedAt'> | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value) || typeof value.overview !== 'string'
      || !isStringArray(value.keyFacts) || !isStringArray(value.whyItMatters)
      || !isStringArray(value.risksAndUnknowns) || !isStringArray(value.questionsToResearch)
      || !['positive', 'neutral', 'negative', 'mixed'].includes(String(value.sentiment))) return null;
    return value as Omit<NewsAISummary, 'model' | 'generatedAt'>;
  } catch { return null; }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return Response.json({ code: 'AI_NOT_CONFIGURED', message: 'Detailed news analysis needs a GEMINI_API_KEY in .env.local.' }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ code: 'INVALID_REQUEST', message: 'The news-analysis request was not valid JSON.' }, { status: 400 }); }
  if (!validRequest(body)) {
    return Response.json({ code: 'INVALID_REQUEST', message: 'This article does not contain enough valid text to analyze.' }, { status: 400 });
  }

  try {
    const output = await generateStructuredGemini({
      apiKey,
      systemInstruction: 'You are an investment research assistant, not a financial adviser. Explain the supplied article synopsis in useful detail, using only the supplied article and optional saved company context. Never claim to have read the linked website. Never invent quotes, figures, events, dates, live data, forecasts, or recommendations. Clearly put missing context and uncertain implications under risks and unknowns. Distinguish reported facts from interpretation. Keep the overview detailed but readable and the bullets specific.',
      input: `Article and optional saved company context (the only allowed evidence):\n${JSON.stringify(body)}`,
      schema: newsSummarySchema,
      maxOutputTokens: 2_400,
    });
    const parsed = output ? parseSummary(output) : null;
    if (!parsed) return Response.json({ code: 'INVALID_AI_RESPONSE', message: 'Gemini returned an invalid detailed summary.' }, { status: 502 });
    const summary: NewsAISummary = { ...parsed, model: GEMINI_MODEL, generatedAt: new Date().toISOString() };
    return Response.json({ summary }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const kind = error instanceof GeminiProviderError ? error.kind : 'PROVIDER';
    const status = kind === 'RATE_LIMIT' ? 429 : kind === 'CREDENTIAL' || kind === 'MODEL' ? 503 : 502;
    const message = kind === 'RATE_LIMIT' ? 'The free Gemini rate limit was reached. Wait briefly and try again.'
      : kind === 'CREDENTIAL' ? 'The Gemini credential was rejected.'
        : kind === 'MODEL' ? 'The configured Gemini model is unavailable.'
          : kind === 'TIMEOUT' ? 'Gemini did not respond in time.' : 'Detailed news analysis is temporarily unavailable.';
    return Response.json({ code: 'GEMINI_ERROR', message }, { status });
  }
}
