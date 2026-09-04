import { GEMINI_MODEL, generateStructuredGemini } from '@/services/geminiServer';
import { geminiErrorResponse, isBoundedString, isRecord, isStringArray, jsonError, noStoreJson, parseModelJson, readJsonRequest } from '@/services/geminiRoute';
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

function isSummary(value: unknown): value is Omit<NewsAISummary, 'model' | 'generatedAt'> {
  return isRecord(value) && typeof value.overview === 'string' && isStringArray(value.keyFacts)
    && isStringArray(value.whyItMatters) && isStringArray(value.risksAndUnknowns)
    && isStringArray(value.questionsToResearch) && ['positive', 'neutral', 'negative', 'mixed'].includes(String(value.sentiment));
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonError('AI_NOT_CONFIGURED', 'Detailed news analysis needs a GEMINI_API_KEY in .env.local.', 503);

  const result = await readJsonRequest(request, 'The news-analysis request was not valid JSON.');
  if (!result.ok) return result.response;
  const body = result.body;
  if (!validRequest(body)) {
    return jsonError('INVALID_REQUEST', 'This article does not contain enough valid text to analyze.', 400);
  }

  try {
    const output = await generateStructuredGemini({
      apiKey,
      systemInstruction: 'You are an investment research assistant, not a financial adviser. Explain the supplied article synopsis in useful detail, using only the supplied article and optional saved company context. Never claim to have read the linked website. Never invent quotes, figures, events, dates, live data, forecasts, or recommendations. Clearly put missing context and uncertain implications under risks and unknowns. Distinguish reported facts from interpretation. Keep the overview detailed but readable and the bullets specific.',
      input: `Article and optional saved company context (the only allowed evidence):\n${JSON.stringify(body)}`,
      schema: newsSummarySchema,
      maxOutputTokens: 2_400,
    });
    const parsed = output ? parseModelJson(output, isSummary) : null;
    if (!parsed) return jsonError('INVALID_AI_RESPONSE', 'Gemini returned an invalid detailed summary.', 502);
    const summary: NewsAISummary = { ...parsed, model: GEMINI_MODEL, generatedAt: new Date().toISOString() };
    return noStoreJson('summary', summary);
  } catch (error) {
    return geminiErrorResponse(error, 'Detailed news analysis is temporarily unavailable.');
  }
}
