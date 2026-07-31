import type { InvestmentRepository } from '@/database/repositories';
import { AppError, type CompanyContent, type SessionBrief } from '@/types/domain';
import type { Services } from './contracts';
import { delay } from '@/utils/format';

export interface MockBehavior { delayMs?: number; failWith?: AppError }

async function simulate<T>(work: () => Promise<T>, behavior: MockBehavior = {}): Promise<T> {
  await delay(behavior.delayMs ?? 140);
  if (behavior.failWith) throw behavior.failWith;
  try { return await work(); }
  catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('DATABASE', error instanceof Error ? error.message : 'Local database request failed.');
  }
}

export function createLocalServices(repository: InvestmentRepository, behavior?: MockBehavior): Services {
  const companyService = {
    search: (query = '') => simulate(() => repository.companies(query.trim()), behavior),
    getById: (id: string) => simulate(async () => {
      const company = await repository.company(id);
      if (!company) throw new AppError('NOT_FOUND', 'Company not found.', false);
      return company;
    }, behavior),
    getContent: (companyId: string, kind?: CompanyContent['kind']) => simulate(() => repository.content(companyId, kind), behavior),
  };
  const portfolioService = { getHoldings: () => simulate(() => repository.portfolio(), behavior) };
  const sessionBriefService = {
    getBrief: () => simulate(async (): Promise<SessionBrief> => {
      const [allNews, events] = await Promise.all([
        repository.content(undefined, 'news'), repository.content(undefined, 'event'),
      ]);
      const uniqueNews = Array.from(new Map(allNews.map((item) => [item.title, item])).values());
      return {
        importantNews: uniqueNews.filter((item) => item.importance >= 3).slice(0, 3),
        industryEvents: uniqueNews.filter((item) => item.title.includes('Industry')).slice(0, 2),
        upcomingEvents: events.slice(0, 3),
        needsAttention: ['Review semiconductor position sizing', 'Revisit two open research questions'],
        aiSummary: 'Sample AI summary: portfolio news flow is constructive, while concentration and upcoming earnings deserve attention. No AI model was used.',
      };
    }, behavior),
  };
  const settingsService = { getDatabaseInfo: () => simulate(() => repository.info(), behavior) };
  return { company: companyService, portfolio: portfolioService, sessionBrief: sessionBriefService, settings: settingsService };
}
