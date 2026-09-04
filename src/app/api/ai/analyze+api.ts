import type { AIAnalysis, AIAnalysisRequest } from '@/types/domain';
import { GEMINI_MODEL, generateStructuredGemini } from '@/services/geminiServer';
import { geminiErrorResponse, isRecord, isStringArray, jsonError, noStoreJson, parseModelJson, readJsonRequest } from '@/services/geminiRoute';

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

function isAnalysis(value: unknown): value is Omit<AIAnalysis, 'model' | 'generatedAt'> {
  return isRecord(value) && typeof value.headline === 'string' && typeof value.answer === 'string'
    && isStringArray(value.keyPoints) && isStringArray(value.risks) && isStringArray(value.evidence)
    && isStringArray(value.followUpQuestions) && ['low', 'medium', 'high'].includes(String(value.confidence));
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonError('AI_NOT_CONFIGURED', 'Gemini AI Support needs a GEMINI_API_KEY in .env.local.', 503);

  const result = await readJsonRequest(request, 'The AI request was not valid JSON.');
  if (!result.ok) return result.response;
  const body = result.body;
  if (!validRequest(body)) {
    return jsonError('INVALID_REQUEST', 'Choose a company and enter a question between 3 and 600 characters.', 400);
  }

  try {
    const output = await generateStructuredGemini({
      apiKey,
      systemInstruction: 'You are an investment research assistant, not a financial adviser. Use only the supplied context. Never invent facts, live data, forecasts, price targets, or recommendations to buy or sell. Separate evidence from interpretation, identify missing evidence, and keep the answer concise.',
      input: `Question: ${body.question.trim()}\n\nCompany context (the only allowed evidence):\n${JSON.stringify(body.company)}`,
      schema: analysisSchema,
      maxOutputTokens: 1_600,
    });
    const parsed = output ? parseModelJson(output, isAnalysis) : null;
    if (!parsed) return jsonError('INVALID_AI_RESPONSE', 'Gemini returned an invalid structured response.', 502);
    const analysis: AIAnalysis = { ...parsed, model: GEMINI_MODEL, generatedAt: new Date().toISOString() };
    return noStoreJson('analysis', analysis);
  } catch (error) {
    return geminiErrorResponse(error, 'Gemini is temporarily unavailable.');
  }
}
