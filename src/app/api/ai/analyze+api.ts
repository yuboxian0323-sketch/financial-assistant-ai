import type { AIAnalysis, AIAnalysisRequest } from '@/types/domain';
import { GEMINI_MODEL, GeminiProviderError, generateStructuredGemini } from '@/services/geminiServer';

const analysisSchema = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'A concise heading for the answer.' },
    answer: { type: 'string', description: 'A direct answer grounded only in the supplied company context.' },
    keyPoints: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    risks: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    evidence: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    followUpQuestions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['headline', 'answer', 'keyPoints', 'risks', 'evidence', 'followUpQuestions', 'confidence'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function validRequest(value: unknown): value is AIAnalysisRequest {
  if (!isRecord(value) || typeof value.question !== 'string' || value.question.trim().length < 3 || value.question.length > 600) return false;
  const company = value.company;
  if (!isRecord(company)) return false;
  const hasValidStrings = ['id', 'ticker', 'name', 'industry', 'overview', 'bullThesis', 'bearThesis'].every(
    (key) => typeof company[key] === 'string' && String(company[key]).trim().length > 0 && String(company[key]).length <= 4_000,
  );
  const validFinancials = Array.isArray(company.financials) && company.financials.length <= 20 && company.financials.every(
    (metric) => isRecord(metric) && typeof metric.label === 'string' && metric.label.length <= 200 && typeof metric.value === 'string' && metric.value.length <= 500,
  );
  const quote = company.quote;
  const validQuote = isRecord(quote)
    && typeof quote.price === 'number' && Number.isFinite(quote.price)
    && typeof quote.dailyChange === 'number' && Number.isFinite(quote.dailyChange)
    && (quote.source === 'live' || quote.source === 'sample')
    && (quote.asOf === undefined || (typeof quote.asOf === 'string' && quote.asOf.length <= 100));
  return hasValidStrings && validFinancials && validQuote;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseAnalysis(text: string): Omit<AIAnalysis, 'model' | 'generatedAt'> | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value)) return null;
    if (typeof value.headline !== 'string' || typeof value.answer !== 'string') return null;
    if (!isStringArray(value.keyPoints) || !isStringArray(value.risks) || !isStringArray(value.evidence) || !isStringArray(value.followUpQuestions)) return null;
    if (!['low', 'medium', 'high'].includes(String(value.confidence))) return null;
    return value as Omit<AIAnalysis, 'model' | 'generatedAt'>;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ code: 'AI_NOT_CONFIGURED', message: 'Gemini AI Support needs a GEMINI_API_KEY in .env.local.' }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ code: 'INVALID_REQUEST', message: 'The AI request was not valid JSON.' }, { status: 400 }); }
  if (!validRequest(body)) {
    return Response.json({ code: 'INVALID_REQUEST', message: 'Choose a company and enter a question between 3 and 600 characters.' }, { status: 400 });
  }

  try {
    const output = await generateStructuredGemini({
      apiKey,
      systemInstruction: 'You are an investment research assistant, not a financial adviser. Use only the supplied context. Never invent facts, live data, forecasts, price targets, or recommendations to buy or sell. Separate evidence from interpretation, identify missing evidence, and keep the answer concise.',
      input: `Question: ${body.question.trim()}\n\nCompany context (the only allowed evidence):\n${JSON.stringify(body.company)}`,
      schema: analysisSchema,
      maxOutputTokens: 1_600,
    });
    const parsed = output ? parseAnalysis(output) : null;
    if (!parsed) return Response.json({ code: 'INVALID_AI_RESPONSE', message: 'Gemini returned an invalid structured response.' }, { status: 502 });
    const analysis: AIAnalysis = { ...parsed, model: GEMINI_MODEL, generatedAt: new Date().toISOString() };
    return Response.json({ analysis }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const kind = error instanceof GeminiProviderError ? error.kind : 'PROVIDER';
    const status = kind === 'RATE_LIMIT' ? 429 : kind === 'CREDENTIAL' || kind === 'MODEL' ? 503 : 502;
    const message = kind === 'RATE_LIMIT' ? 'The free Gemini rate limit was reached. Wait briefly and try again.'
      : kind === 'CREDENTIAL' ? 'The Gemini credential was rejected.'
        : kind === 'MODEL' ? 'The configured Gemini model is unavailable.'
          : kind === 'TIMEOUT' ? 'Gemini did not respond in time.' : 'Gemini is temporarily unavailable.';
    return Response.json({ code: 'GEMINI_ERROR', message }, { status });
  }
}
