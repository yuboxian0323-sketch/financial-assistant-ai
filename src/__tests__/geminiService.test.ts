import { createGeminiService } from '@/services/geminiService';
import type { AIAnalysis, AIAnalysisRequest, NewsAISummary, NewsAISummaryRequest } from '@/types/domain';

const request: AIAnalysisRequest = {
  question: 'What evidence could change the thesis?',
  company: {
    id: 'nvda', ticker: 'NVDA', name: 'NVIDIA', industry: 'Semiconductors',
    overview: 'Sample overview', bullThesis: 'Sample bull thesis', bearThesis: 'Sample bear thesis',
    financials: [{ label: 'Revenue', value: 'Sample value' }],
    quote: { price: 200, dailyChange: 1.5, source: 'live', asOf: '2026-08-19T12:00:00.000Z' },
  },
};

const analysis: AIAnalysis = {
  headline: 'Evidence to monitor',
  answer: 'The saved thesis depends on continued demand.',
  keyPoints: ['Track demand'],
  risks: ['The supplied context has limited financial history'],
  evidence: ['Sample overview'],
  followUpQuestions: ['Which metric best represents demand?'],
  confidence: 'medium',
  model: 'gemini-3.5-flash-lite',
  generatedAt: '2026-08-19T12:01:00.000Z',
};

const newsRequest: NewsAISummaryRequest = {
  article: {
    headline: 'NVIDIA announces a product update', summary: 'The provider synopsis describes a sample product update.',
    source: 'Reuters', category: 'Company news', publishedAt: '2026-08-19T12:00:00.000Z', relatedSymbols: ['NVDA'],
  },
};

const newsSummary: NewsAISummary = {
  overview: 'The supplied synopsis describes a product update, but does not include enough information to assess its financial effect.',
  keyFacts: ['A product update was announced.'],
  whyItMatters: ['Product execution can affect the saved company thesis.'],
  risksAndUnknowns: ['The synopsis provides no revenue or customer data.'],
  questionsToResearch: ['What adoption evidence did the publisher report?'],
  sentiment: 'mixed', model: 'gemini-3.5-flash-lite', generatedAt: '2026-08-19T12:01:00.000Z',
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('Gemini AI service', () => {
  it('structures a natural-language research task through the protected task route', async () => {
    const draft = {
      name: 'Weekly NVIDIA Research', type: 'report' as const, description: 'Track NVIDIA evidence.',
      monitors: ['NVIDIA'], scheduleType: 'time' as const, scheduleLabel: 'Every Friday', reportStyle: 'analyst' as const,
      delivery: { notifyWhenReady: true, showOnHome: true, alertCenter: true },
    };
    const fetchImpl = jest.fn(async () => response({ draft })) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.structureResearchTask('Monitor NVIDIA every Friday.')).resolves.toEqual(draft);
    expect(fetchImpl).toHaveBeenCalledWith('/api/ai/research-task', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'structure', prompt: 'Monitor NVIDIA every Friday.' }),
    }));
  });

  it('uses the protected app route and accepts structured analysis', async () => {
    const fetchImpl = jest.fn(async () => response({ analysis })) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.analyzeCompany(request)).resolves.toEqual(analysis);
    expect(fetchImpl).toHaveBeenCalledWith('/api/ai/analyze', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
    }));
  });

  it('generates a detailed news summary through the protected route', async () => {
    const fetchImpl = jest.fn(async () => response({ summary: newsSummary })) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.summarizeNews(newsRequest)).resolves.toEqual(newsSummary);
    expect(fetchImpl).toHaveBeenCalledWith('/api/ai/news-summary', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(newsRequest),
    }));
  });

  it('rejects malformed detailed news output', async () => {
    const fetchImpl = jest.fn(async () => response({ summary: { overview: 'Missing sections' } })) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.summarizeNews(newsRequest)).rejects.toMatchObject({ code: 'SERVICE', retryable: true });
  });

  it('returns a typed retryable error when the free-tier limit is reached', async () => {
    const fetchImpl = jest.fn(async () => response({ message: 'The free Gemini rate limit was reached.' }, 429)) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.analyzeCompany(request)).rejects.toMatchObject({
      code: 'NETWORK',
      retryable: true,
      message: 'The free Gemini rate limit was reached.',
    });
  });

  it('rejects malformed model output instead of rendering it', async () => {
    const fetchImpl = jest.fn(async () => response({ analysis: { answer: 'Missing required fields' } })) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.analyzeCompany(request)).rejects.toMatchObject({ code: 'SERVICE', retryable: true });
  });

  it('explains when a stale Expo server returns its project manifest', async () => {
    const fetchImpl = jest.fn(async () => response({ launchAsset: { url: 'bundle' } })) as unknown as typeof fetch;
    const service = createGeminiService(fetchImpl);

    await expect(service.analyzeCompany(request)).rejects.toMatchObject({
      code: 'CONFIGURATION',
      retryable: false,
      message: expect.stringContaining('Restart the Expo server'),
    });
  });
});
