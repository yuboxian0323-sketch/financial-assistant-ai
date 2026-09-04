import type { ResearchTaskDraft, ResearchTaskOutputDraft } from '@/types/domain';
import { GeminiProviderError, generateStructuredGemini } from '@/services/geminiServer';

const draftSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['report', 'alert'] },
    description: { type: 'string' },
    monitors: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    scheduleType: { type: 'string', enum: ['time', 'event'] },
    scheduleLabel: { type: 'string' },
    reportStyle: { type: 'string', enum: ['snapshot', 'standard', 'analyst', 'deep-research'] },
    delivery: {
      type: 'object',
      properties: {
        notifyWhenReady: { type: 'boolean' }, showOnHome: { type: 'boolean' }, alertCenter: { type: 'boolean' },
      },
      required: ['notifyWhenReady', 'showOnHome', 'alertCenter'],
    },
  },
  required: ['name', 'type', 'description', 'monitors', 'scheduleType', 'scheduleLabel', 'reportStyle', 'delivery'],
} as const;

const outputSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    sections: {
      type: 'array', maxItems: 7,
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' }, maxItems: 7 } },
        required: ['title', 'bullets'],
      },
    },
  },
  required: ['title', 'summary', 'sections'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseDraft(text: string): ResearchTaskDraft | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value) || typeof value.name !== 'string' || !['report', 'alert'].includes(String(value.type))
      || typeof value.description !== 'string' || !stringArray(value.monitors) || !['time', 'event'].includes(String(value.scheduleType))
      || typeof value.scheduleLabel !== 'string' || !['snapshot', 'standard', 'analyst', 'deep-research'].includes(String(value.reportStyle))
      || !isRecord(value.delivery) || typeof value.delivery.notifyWhenReady !== 'boolean'
      || typeof value.delivery.showOnHome !== 'boolean' || typeof value.delivery.alertCenter !== 'boolean') return null;
    const draft = value as unknown as ResearchTaskDraft;
    return draft.type === 'alert' ? { ...draft, reportStyle: undefined } : draft;
  } catch { return null; }
}

function parseOutput(text: string): ResearchTaskOutputDraft | null {
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value) || typeof value.title !== 'string' || typeof value.summary !== 'string' || !Array.isArray(value.sections)
      || !value.sections.every((section) => isRecord(section) && typeof section.title === 'string' && stringArray(section.bullets))) return null;
    return value as unknown as ResearchTaskOutputDraft;
  } catch { return null; }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return Response.json({ code: 'AI_NOT_CONFIGURED', message: 'Research Tasks need a GEMINI_API_KEY in .env.local.' }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ code: 'INVALID_REQUEST', message: 'The Research Task request was not valid JSON.' }, { status: 400 }); }
  if (!isRecord(body) || (body.action !== 'structure' && body.action !== 'generate')) {
    return Response.json({ code: 'INVALID_REQUEST', message: 'Choose a valid Research Task action.' }, { status: 400 });
  }
  try {
    if (body.action === 'structure') {
      if (typeof body.prompt !== 'string' || body.prompt.trim().length < 8 || body.prompt.length > 1_000) {
        return Response.json({ code: 'INVALID_PROMPT', message: 'Describe the research assignment in at least 8 characters.' }, { status: 400 });
      }
      const output = await generateStructuredGemini({
        apiKey,
        systemInstruction: 'Convert the user request into an investment research automation. Never create brokerage, trading, buy, sell, price prediction, or financial-advice behavior. Use Report for recurring complete analysis and Alert only for important event-driven notices. Return concise editable settings.',
        input: body.prompt.trim(),
        schema: draftSchema,
        maxOutputTokens: 1_200,
      });
      const draft = output ? parseDraft(output) : null;
      if (!draft) return Response.json({ code: 'INVALID_AI_RESPONSE', message: 'Gemini could not structure this task.' }, { status: 502 });
      return Response.json({ draft }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (!isRecord(body.task) || !isRecord(body.evidence) || JSON.stringify(body).length > 80_000) {
      return Response.json({ code: 'INVALID_REQUEST', message: 'The task evidence was invalid or too large.' }, { status: 400 });
    }
    const output = await generateStructuredGemini({
      apiKey,
      systemInstruction: 'You are a research analyst, not a financial adviser. Generate only from the supplied evidence. Never recommend buying or selling, predict prices, execute trades, or invent current facts. Clearly identify sample or missing evidence. For alerts, report only material evidence and stay concise.',
      input: `Research task:\n${JSON.stringify(body.task)}\n\nAvailable evidence:\n${JSON.stringify(body.evidence)}`,
      schema: outputSchema,
      maxOutputTokens: 2_400,
    });
    const parsed = output ? parseOutput(output) : null;
    if (!parsed) return Response.json({ code: 'INVALID_AI_RESPONSE', message: 'Gemini could not generate a valid research output.' }, { status: 502 });
    return Response.json({ output: parsed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const kind = error instanceof GeminiProviderError ? error.kind : 'PROVIDER';
    const status = kind === 'RATE_LIMIT' ? 429 : kind === 'CREDENTIAL' || kind === 'MODEL' ? 503 : 502;
    const message = kind === 'RATE_LIMIT' ? 'The free Gemini rate limit was reached. Wait briefly and try again.'
      : kind === 'CREDENTIAL' ? 'The Gemini credential was rejected.'
        : kind === 'MODEL' ? 'The configured Gemini model is unavailable.'
          : kind === 'TIMEOUT' ? 'Gemini did not respond in time.' : 'Gemini Research Tasks are temporarily unavailable.';
    return Response.json({ code: 'GEMINI_ERROR', message }, { status });
  }
}
