import type { ResearchTaskDraft, ResearchTaskOutputDraft } from '@/types/domain';
import { generateStructuredGemini } from '@/services/geminiServer';
import { geminiErrorResponse, isRecord, isStringArray, jsonError, noStoreJson, parseModelJson, readJsonRequest } from '@/services/geminiRoute';

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

function isDraft(value: unknown): value is ResearchTaskDraft {
  return isRecord(value) && typeof value.name === 'string' && ['report', 'alert'].includes(String(value.type))
    && typeof value.description === 'string' && isStringArray(value.monitors) && ['time', 'event'].includes(String(value.scheduleType))
    && typeof value.scheduleLabel === 'string' && ['snapshot', 'standard', 'analyst', 'deep-research'].includes(String(value.reportStyle))
    && isRecord(value.delivery) && typeof value.delivery.notifyWhenReady === 'boolean'
    && typeof value.delivery.showOnHome === 'boolean' && typeof value.delivery.alertCenter === 'boolean';
}

function isOutput(value: unknown): value is ResearchTaskOutputDraft {
  return isRecord(value) && typeof value.title === 'string' && typeof value.summary === 'string' && Array.isArray(value.sections)
    && value.sections.every((section) => isRecord(section) && typeof section.title === 'string' && isStringArray(section.bullets));
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonError('AI_NOT_CONFIGURED', 'Research Tasks need a GEMINI_API_KEY in .env.local.', 503);
  const result = await readJsonRequest(request, 'The Research Task request was not valid JSON.');
  if (!result.ok) return result.response;
  const body = result.body;
  if (!isRecord(body) || (body.action !== 'structure' && body.action !== 'generate')) {
    return jsonError('INVALID_REQUEST', 'Choose a valid Research Task action.', 400);
  }
  try {
    if (body.action === 'structure') {
      if (typeof body.prompt !== 'string' || body.prompt.trim().length < 8 || body.prompt.length > 1_000) {
        return jsonError('INVALID_PROMPT', 'Describe the research assignment in at least 8 characters.', 400);
      }
      const output = await generateStructuredGemini({
        apiKey,
        systemInstruction: 'Convert the user request into an investment research automation. Never create brokerage, trading, buy, sell, price prediction, or financial-advice behavior. Use Report for recurring complete analysis and Alert only for important event-driven notices. Return concise editable settings.',
        input: body.prompt.trim(),
        schema: draftSchema,
        maxOutputTokens: 1_200,
      });
      const parsed = output ? parseModelJson(output, isDraft) : null;
      if (!parsed) return jsonError('INVALID_AI_RESPONSE', 'Gemini could not structure this task.', 502);
      const draft = parsed.type === 'alert' ? { ...parsed, reportStyle: undefined } : parsed;
      return noStoreJson('draft', draft);
    }
    if (!isRecord(body.task) || !isRecord(body.evidence) || JSON.stringify(body).length > 80_000) {
      return jsonError('INVALID_REQUEST', 'The task evidence was invalid or too large.', 400);
    }
    const output = await generateStructuredGemini({
      apiKey,
      systemInstruction: 'You are a research analyst, not a financial adviser. Generate only from the supplied evidence. Never recommend buying or selling, predict prices, execute trades, or invent current facts. Clearly identify sample or missing evidence. For alerts, report only material evidence and stay concise.',
      input: `Research task:\n${JSON.stringify(body.task)}\n\nAvailable evidence:\n${JSON.stringify(body.evidence)}`,
      schema: outputSchema,
      maxOutputTokens: 2_400,
    });
    const parsed = output ? parseModelJson(output, isOutput) : null;
    if (!parsed) return jsonError('INVALID_AI_RESPONSE', 'Gemini could not generate a valid research output.', 502);
    return noStoreJson('output', parsed);
  } catch (error) {
    return geminiErrorResponse(error, 'Gemini Research Tasks are temporarily unavailable.');
  }
}
