import type { AIService } from './contracts';
import { AppError, type AIAnalysis, type NewsAISummary, type ResearchTaskDraft, type ResearchTaskOutputDraft } from '@/types/domain';

interface AIResponseBody {
  analysis?: unknown;
  code?: unknown;
  message?: unknown;
  launchAsset?: unknown;
  draft?: unknown;
  output?: unknown;
  summary?: unknown;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAnalysis(value: unknown): value is AIAnalysis {
  if (!value || typeof value !== 'object') return false;
  const analysis = value as Record<string, unknown>;
  return typeof analysis.headline === 'string'
    && typeof analysis.answer === 'string'
    && isStringArray(analysis.keyPoints)
    && isStringArray(analysis.risks)
    && isStringArray(analysis.evidence)
    && isStringArray(analysis.followUpQuestions)
    && ['low', 'medium', 'high'].includes(String(analysis.confidence))
    && analysis.model === 'gemini-3.5-flash-lite'
    && typeof analysis.generatedAt === 'string';
}

function isNewsSummary(value: unknown): value is NewsAISummary {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Record<string, unknown>;
  return typeof summary.overview === 'string'
    && isStringArray(summary.keyFacts)
    && isStringArray(summary.whyItMatters)
    && isStringArray(summary.risksAndUnknowns)
    && isStringArray(summary.questionsToResearch)
    && ['positive', 'neutral', 'negative', 'mixed'].includes(String(summary.sentiment))
    && summary.model === 'gemini-3.5-flash-lite'
    && typeof summary.generatedAt === 'string';
}

async function postAI(fetchImpl: typeof fetch, path: string, request: unknown): Promise<AIResponseBody> {
  let response: Response;
  try {
    response = await fetchImpl(path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new AppError('NETWORK', 'Could not reach Gemini. Check the connection and try again.', true);
  }
  let body: AIResponseBody;
  try { body = await response.json() as AIResponseBody; }
  catch { throw new AppError('NETWORK', 'Gemini returned an unreadable response.', true); }
  if (body.launchAsset) throw new AppError('CONFIGURATION', 'Restart the Expo server to load AI Support.', false);
  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : 'Gemini is temporarily unavailable.';
    throw new AppError(response.status === 503 ? 'CONFIGURATION' : 'NETWORK', message, response.status === 429 || response.status >= 500);
  }
  return body;
}

function isTaskDraft(value: unknown): value is ResearchTaskDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  const delivery = draft.delivery as Record<string, unknown> | undefined;
  return typeof draft.name === 'string'
    && (draft.type === 'report' || draft.type === 'alert')
    && typeof draft.description === 'string'
    && isStringArray(draft.monitors)
    && (draft.scheduleType === 'time' || draft.scheduleType === 'event')
    && typeof draft.scheduleLabel === 'string'
    && (draft.reportStyle === undefined || ['snapshot', 'standard', 'analyst', 'deep-research'].includes(String(draft.reportStyle)))
    && Boolean(delivery)
    && typeof delivery?.notifyWhenReady === 'boolean'
    && typeof delivery.showOnHome === 'boolean'
    && typeof delivery.alertCenter === 'boolean';
}

function isTaskOutput(value: unknown): value is ResearchTaskOutputDraft {
  if (!value || typeof value !== 'object') return false;
  const output = value as Record<string, unknown>;
  return typeof output.title === 'string'
    && typeof output.summary === 'string'
    && Array.isArray(output.sections)
    && output.sections.every((section) => section && typeof section === 'object'
      && typeof (section as Record<string, unknown>).title === 'string'
      && isStringArray((section as Record<string, unknown>).bullets));
}

async function postResearchTask(fetchImpl: typeof fetch, body: unknown): Promise<AIResponseBody> {
  let response: Response;
  try {
    response = await fetchImpl('/api/ai/research-task', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AppError('NETWORK', 'Could not reach the Gemini research-task service.', true);
  }
  let result: AIResponseBody;
  try { result = await response.json() as AIResponseBody; }
  catch { throw new AppError('NETWORK', 'Gemini returned an unreadable research-task response.', true); }
  if (result.launchAsset) throw new AppError('CONFIGURATION', 'Restart the Expo server to load Research Tasks.', false);
  if (!response.ok) {
    const message = typeof result.message === 'string' ? result.message : 'Gemini could not complete the research task.';
    throw new AppError(response.status === 503 ? 'CONFIGURATION' : 'NETWORK', message, response.status === 429 || response.status >= 500);
  }
  return result;
}

/** Calls the Expo server route so the Gemini credential never enters the mobile bundle. */
export function createGeminiService(fetchImpl: typeof fetch = fetch): AIService {
  return {
    async analyzeCompany(request) {
      const body = await postAI(fetchImpl, '/api/ai/analyze', request);
      if (!isAnalysis(body.analysis)) throw new AppError('SERVICE', 'Gemini returned an invalid analysis format.', true);
      return body.analysis;
    },
    async summarizeNews(request) {
      const body = await postAI(fetchImpl, '/api/ai/news-summary', request);
      if (!isNewsSummary(body.summary)) throw new AppError('SERVICE', 'Gemini returned an invalid news summary format.', true);
      return body.summary;
    },
    async structureResearchTask(prompt) {
      const body = await postResearchTask(fetchImpl, { action: 'structure', prompt });
      if (!isTaskDraft(body.draft)) throw new AppError('SERVICE', 'Gemini returned an invalid task configuration.', true);
      return body.draft.type === 'alert' ? { ...body.draft, reportStyle: undefined } : body.draft;
    },
    async generateResearchTaskOutput(task, evidence) {
      const body = await postResearchTask(fetchImpl, { action: 'generate', task, evidence });
      if (!isTaskOutput(body.output)) throw new AppError('SERVICE', 'Gemini returned an invalid task output.', true);
      return body.output;
    },
  };
}

export function createUnavailableAIService(): AIService {
  return {
    analyzeCompany: async () => {
      throw new AppError('CONFIGURATION', 'Gemini AI Support is not configured.', false);
    },
    summarizeNews: async () => {
      throw new AppError('CONFIGURATION', 'Gemini News Analysis is not configured.', false);
    },
    structureResearchTask: async () => {
      throw new AppError('CONFIGURATION', 'Gemini Research Tasks are not configured.', false);
    },
    generateResearchTaskOutput: async () => {
      throw new AppError('CONFIGURATION', 'Gemini Research Tasks are not configured.', false);
    },
  };
}
