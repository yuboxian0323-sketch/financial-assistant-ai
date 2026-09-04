import type { InvestmentRepository } from '@/database/repositories';
import {
  AppError,
  type AddPortfolioHoldingInput,
  type CalendarEventItem,
  type Company,
  type CompanyContent,
  type Holding,
  type HomeBrief,
  type MarketIndex,
  type PortfolioOverview,
  type QuoteBatch,
  type ResearchTask,
  type ResearchTaskDraft,
  type ResearchTaskEvidence,
  type ResearchTaskOutput,
  type WatchItem,
} from '@/types/domain';
import type { AIService, MarketDataService, NewsService, NotificationService, Services } from './contracts';
import { createUnavailableAIService } from './geminiService';
import { applyLiveMarketQuotes, applyLiveQuotes, createOfflineMarketDataService } from './marketDataService';
import { createUnavailableNewsService } from './newsService';
import { delay } from '@/utils/format';
import { calculateNextResearchRun } from '@/utils/researchSchedule';
import { normalizeStockSymbol } from '@/utils/stocks';
import { createWorkspaceService } from './workspaceService';

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

const marketIndices: MarketIndex[] = [
  { id: 'sp500', name: 'S&P 500', symbol: 'SPY', proxyLabel: 'SPY ETF proxy', price: 630.54, changePercent: 0.68, changeAmount: 4.26, prevClose: 626.28, dayLow: 626.71, dayHigh: 631.29, yearLow: 483.50, yearHigh: 634.79, chartPoints: [42, 39, 44, 51, 47, 50, 46, 41, 36, 31, 37, 45, 38, 43, 49, 47, 52, 48, 57, 55, 59, 64, 58, 72, 61, 67] },
  { id: 'nasdaq', name: 'NASDAQ 100', symbol: 'QQQ', proxyLabel: 'QQQ ETF proxy', price: 570.12, changePercent: 0.92, changeAmount: 5.19, prevClose: 564.93, dayLow: 565.20, dayHigh: 571.40, yearLow: 402.39, yearHigh: 572.22, chartPoints: [34, 38, 36, 42, 47, 44, 49, 52, 48, 55, 51, 58, 56, 63, 60, 66, 62, 70, 67, 74, 71, 77, 73, 80] },
  { id: 'dow', name: 'Dow Jones', symbol: 'DIA', proxyLabel: 'DIA ETF proxy', price: 449.02, changePercent: 0.31, changeAmount: 1.39, prevClose: 447.63, dayLow: 447.10, dayHigh: 449.33, yearLow: 366.12, yearHigh: 450.54, chartPoints: [50, 47, 49, 46, 52, 55, 51, 54, 58, 56, 59, 61, 57, 62, 60, 64, 63, 67, 65, 69, 68, 71] },
  { id: 'russell', name: 'Russell 2000', symbol: 'IWM', proxyLabel: 'IWM ETF proxy', price: 229.84, changePercent: -0.18, changeAmount: -0.42, prevClose: 230.26, dayLow: 228.79, dayHigh: 231.07, yearLow: 173.26, yearHigh: 246.65, chartPoints: [62, 59, 63, 57, 55, 60, 56, 52, 54, 49, 51, 47, 50, 46, 48, 44, 45, 42, 46, 43] },
  { id: 'vix', name: 'Market Volatility', symbol: 'VIXY', proxyLabel: 'VIXY ETF proxy', price: 35.72, changePercent: -2.24, changeAmount: -0.82, prevClose: 36.54, dayLow: 35.41, dayHigh: 36.83, yearLow: 31.86, yearHigh: 80.13, chartPoints: [72, 68, 70, 64, 66, 60, 63, 57, 59, 54, 56, 50, 53, 47, 49, 45, 48, 43] },
  { id: 'bitcoin', name: 'Bitcoin Exposure', symbol: 'IBIT', proxyLabel: 'IBIT ETF proxy', price: 68.64, changePercent: 1.43, changeAmount: 0.97, prevClose: 67.67, dayLow: 67.48, dayHigh: 69.20, yearLow: 29.12, yearHigh: 72.09, chartPoints: [38, 42, 39, 46, 44, 51, 49, 56, 53, 60, 57, 65, 62, 70, 66, 74, 71, 78] },
  { id: 'gold', name: 'Gold', symbol: 'GLD', proxyLabel: 'GLD ETF proxy', price: 305.18, changePercent: 0.27, changeAmount: 0.82, prevClose: 304.36, dayLow: 303.17, dayHigh: 306.61, yearLow: 228.64, yearHigh: 318.12, chartPoints: [45, 47, 44, 49, 48, 52, 50, 54, 53, 56, 55, 59, 57, 61, 60, 64, 62, 66] },
];

const calendarEvents: CalendarEventItem[] = [
  { id: 'apple-earnings', title: 'Apple Earnings', date: '2026-08-01T20:00:00Z', relativeLabel: 'Tomorrow' },
  { id: 'fed-meeting', title: 'Fed Meeting', date: '2026-08-06T18:00:00Z', relativeLabel: 'Next Wednesday' },
  { id: 'cpi-release', title: 'CPI Release', date: '2026-08-12T12:30:00Z', relativeLabel: 'Next Tuesday' },
  { id: 'nvidia-earnings', title: 'NVIDIA Earnings', date: '2026-08-14T20:00:00Z', relativeLabel: 'In 2 weeks' },
  { id: 'jackson-hole', title: 'Jackson Hole', date: '2026-08-22T14:00:00Z', relativeLabel: 'In 3 weeks' },
];

const watchItems: WatchItem[] = [
  { id: 'nvda-valuation', companyId: 'nvda', category: 'valuation', title: 'NVIDIA valuation', description: 'Approaching the upper end of its sample historical range.' },
  { id: 'msft-earnings', companyId: 'msft', category: 'earnings', title: 'Microsoft AI revenue', description: 'Sample cloud commentary is due next week.' },
  { id: 'ai-spending', category: 'industry', title: 'AI infrastructure', description: 'Capital spending continues to accelerate.' },
  { id: 'amd-volatility', companyId: 'amd', category: 'volatility', title: 'AMD volatility', description: 'Sample implied volatility increased this week.' },
  { id: 'tsm-guidance', companyId: 'tsm', category: 'macro', title: 'TSMC guidance', description: 'Could influence the semiconductor outlook.' },
];

const portfolioEvents: CalendarEventItem[] = [
  { id: 'nvda-earnings', title: 'NVIDIA Earnings', date: '2026-08-14T20:00:00Z', relativeLabel: 'In 2 weeks' },
  { id: 'msft-research', title: 'Microsoft Review', date: '2026-08-18T16:00:00Z', relativeLabel: 'In 18 days' },
  { id: 'tsm-guidance', title: 'TSMC Guidance', date: '2026-08-21T06:00:00Z', relativeLabel: 'In 3 weeks' },
  { id: 'fed-decision', title: 'Fed Decision', date: '2026-09-16T18:00:00Z', relativeLabel: 'Next month' },
];

const portfolioComposition: PortfolioOverview['composition'] = {
  Sector: [
    { label: 'Technology', percentage: 58 },
    { label: 'Communication Services', percentage: 18 },
    { label: 'Consumer Cyclical', percentage: 12 },
    { label: 'Other', percentage: 12 },
  ],
  Industry: [
    { label: 'Semiconductors', percentage: 46 },
    { label: 'Software', percentage: 24 },
    { label: 'Internet Platforms', percentage: 18 },
    { label: 'Consumer Technology', percentage: 12 },
  ],
  Theme: [
    { label: 'AI Infrastructure', percentage: 42 },
    { label: 'Cloud', percentage: 24 },
    { label: 'Digital Platforms', percentage: 20 },
    { label: 'Devices', percentage: 14 },
  ],
  Geography: [
    { label: 'United States', percentage: 68 },
    { label: 'Taiwan', percentage: 18 },
    { label: 'Global', percentage: 14 },
  ],
  'Market Cap': [
    { label: 'Mega Cap', percentage: 76 },
    { label: 'Large Cap', percentage: 18 },
    { label: 'Mid Cap', percentage: 6 },
  ],
};

function buildCompanyChart(id: string, dailyChange: number): number[] {
  const seed = id.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return Array.from({ length: 18 }, (_, index) =>
    42 + (seed % 11) + index * dailyChange * 0.35 + Math.sin((index + seed) * 0.75) * 4,
  );
}

async function liveBatch(marketData: MarketDataService, companies: Company[]): Promise<QuoteBatch> {
  try {
    return await marketData.getQuotes(companies.map((company) => company.ticker));
  } catch {
    return { quotes: [], failedSymbols: companies.map((company) => company.ticker) };
  }
}

async function withLiveCompanies(marketData: MarketDataService, companies: Company[]): Promise<Company[]> {
  return applyLiveQuotes(companies, await liveBatch(marketData, companies));
}

async function withLiveMarkets(marketData: MarketDataService): Promise<MarketIndex[]> {
  try {
    const batch = await marketData.getQuotes(marketIndices.map((market) => market.symbol));
    return applyLiveMarketQuotes(marketIndices, batch);
  } catch {
    return applyLiveMarketQuotes(marketIndices, { quotes: [], failedSymbols: marketIndices.map((market) => market.symbol) });
  }
}

function applyCompaniesToHoldings(holdings: Holding[], companies: Company[]): Holding[] {
  const byId = new Map(companies.map((company) => [company.id, company]));
  return holdings.map((holding) => ({ ...holding, company: byId.get(holding.companyId) ?? holding.company }));
}

function externalCompanyId(symbol: string): string {
  let hash = 2_166_136_261;
  for (const character of symbol) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  const readable = symbol.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stock';
  return `market-${readable}-${(hash >>> 0).toString(36)}`;
}

function createResearchCompany(input: AddPortfolioHoldingInput): Company {
  const symbol = normalizeStockSymbol(input.symbol);
  return {
    id: externalCompanyId(symbol),
    ticker: symbol,
    name: input.name.trim() || symbol,
    industry: input.type.trim() || 'Market stock',
    overview: `${input.name.trim() || symbol} was added from live stock research. Complete this company overview as research develops.`,
    aiSummary: 'No saved AI summary yet. Add research before requesting a company-grounded analysis.',
    bullThesis: 'Bull thesis has not been written yet.',
    bearThesis: 'Bear thesis has not been written yet.',
    price: input.averageCost,
    dailyChange: 0,
    priceSource: 'sample',
    financials: [],
  };
}

function normalizeTaskDraft(draft: ResearchTaskDraft): ResearchTaskDraft {
  const name = draft.name.trim();
  const description = draft.description.trim();
  const scheduleLabel = draft.scheduleLabel.trim();
  const monitors = Array.from(new Set(draft.monitors.map((monitor) => monitor.trim()).filter(Boolean))).slice(0, 12);
  if (!name || !description || !scheduleLabel || monitors.length === 0) {
    throw new AppError('SERVICE', 'A task needs a name, description, monitoring topics, and schedule.', false);
  }
  return {
    name: name.slice(0, 80),
    type: draft.type,
    description: description.slice(0, 500),
    monitors,
    scheduleType: draft.scheduleType,
    scheduleLabel: scheduleLabel.slice(0, 120),
    reportStyle: draft.type === 'report' ? (draft.reportStyle ?? 'standard') : undefined,
    delivery: { ...draft.delivery },
  };
}

function createTaskId(): string {
  return `research-task-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

const unavailableNotifications: NotificationService = {
  syncTaskReminder: async () => 'unsupported',
  cancelTaskReminder: async () => undefined,
  notifyTaskCompleted: async () => 'unsupported',
  sendTestNotification: async () => 'unsupported',
};

export function createLocalServices(
  repository: InvestmentRepository,
  behavior?: MockBehavior,
  marketData: MarketDataService = createOfflineMarketDataService(),
  ai: AIService = createUnavailableAIService(),
  news: NewsService = createUnavailableNewsService(),
  notifications: NotificationService = unavailableNotifications,
): Services {
  const taskOrThrow = async (id: string): Promise<ResearchTask> => {
    const task = await repository.researchTask(id);
    if (!task) throw new AppError('NOT_FOUND', 'Research task not found.', false);
    return task;
  };
  const syncReminder = (task: ResearchTask) => notifications.syncTaskReminder(task).catch(() => undefined);
  const companyService = {
    search: (query = '') => simulate(async () => {
      const companies = await repository.companies(query.trim());
      return withLiveCompanies(marketData, companies);
    }, behavior),
    getById: (id: string) => simulate(async () => {
      const company = await repository.company(id);
      if (!company) throw new AppError('NOT_FOUND', 'Company not found.', false);
      return (await withLiveCompanies(marketData, [company]))[0] ?? company;
    }, behavior),
    getContent: (companyId: string, kind?: CompanyContent['kind']) => simulate(() => repository.content(companyId, kind), behavior),
  };
  const portfolioService = {
    getHoldings: () => simulate(async () => {
      const holdings = await repository.portfolio();
      const companies = await withLiveCompanies(marketData, holdings.map((holding) => holding.company));
      return applyCompaniesToHoldings(holdings, companies);
    }, behavior),
    getOverview: () => simulate(async (): Promise<PortfolioOverview> => {
      const [savedHoldings, savedWatchlist] = await Promise.all([repository.portfolio(), repository.watchlist()]);
      const combined = [...savedHoldings.map((holding) => holding.company), ...savedWatchlist];
      const quotedCompanies = await withLiveCompanies(marketData, combined);
      const holdings = applyCompaniesToHoldings(savedHoldings, quotedCompanies);
      const quotedById = new Map(quotedCompanies.map((company) => [company.id, company]));
      const watchlist = savedWatchlist.map((company) => quotedById.get(company.id) ?? company);
      const companyPriceSource = quotedCompanies.some((company) => company.priceSource === 'live') ? 'live' as const : 'sample' as const;
      const convictionByCompany: Record<string, number> = { nvda: 5, msft: 4, tsm: 5, meta: 4, googl: 4, aapl: 4, amd: 3 };
      const themeByIndustry: Record<string, string> = {
        Semiconductors: 'Semiconductors · AI',
        Software: 'Cloud · AI',
        'Internet Platforms': 'Platforms · AI',
        'Consumer Technology': 'Devices · Services',
      };
      const trackedCompanies = Array.from(new Map(
        [...holdings.map((holding) => holding.company), ...watchlist].map((company) => [company.id, company]),
      ).values());
      const favorites = trackedCompanies.map((company) => {
        const conviction = convictionByCompany[company.id] ?? 3;
        return {
          company,
          theme: themeByIndustry[company.industry] ?? company.industry,
          conviction,
          researchStatus: conviction === 5 ? 'High Conviction' as const : conviction === 4 ? 'Active Research' as const : 'Monitoring' as const,
          insight: company.aiSummary.replace(/^Sample AI summary:\s*/i, ''),
          chartPoints: buildCompanyChart(company.id, company.dailyChange),
        };
      });
      const strongest = [...holdings].sort((a, b) => b.company.dailyChange - a.company.dailyChange)[0];
      return {
        companyPriceSource,
        favorites,
        briefBullets: [
          'Semiconductor exposure remains the portfolio’s largest sample theme.',
          strongest ? `${strongest.company.name} is the strongest-conviction holding today.` : 'No sample holdings are available.',
          'Healthcare exposure remains limited in this research portfolio.',
          'The long-term AI infrastructure thesis remains intact.',
          'Two tracked companies have sample reviews scheduled next month.',
        ],
        composition: portfolioComposition,
        strengths: [
          { title: 'Strong AI infrastructure exposure', description: 'Multiple holdings participate across chips, cloud, and platforms.' },
          { title: 'High-quality large-cap companies', description: 'The sample portfolio emphasizes durable market leaders.' },
        ],
        watchItems: [
          { title: 'Semiconductor concentration', description: 'Several tracked ideas depend on the same capital-spending cycle.' },
          { title: 'Limited healthcare exposure', description: 'The research portfolio has no current healthcare theme.' },
        ],
        researchIdeas: [
          { title: 'Broadcom', description: 'Adds networking and custom-silicon exposure.' },
          { title: 'ServiceNow', description: 'Expands enterprise software and workflow exposure.' },
          { title: 'ASML', description: 'Adds a critical semiconductor-equipment layer.' },
        ],
        upcomingEvents: portfolioEvents,
      };
    }, behavior),
    addHolding: (input: AddPortfolioHoldingInput) => simulate(async () => {
      const symbol = normalizeStockSymbol(input.symbol);
      if (!symbol || !Number.isFinite(input.shares) || input.shares <= 0 || !Number.isFinite(input.averageCost) || input.averageCost <= 0) {
        throw new AppError('SERVICE', 'Enter a valid share amount and average cost.', false);
      }
      const existingCompany = await repository.companyByTicker(symbol);
      return repository.addHolding(existingCompany ?? createResearchCompany({ ...input, symbol }), input.shares, input.averageCost);
    }, behavior),
    removeHolding: (companyId: string) => simulate(async () => {
      if (!companyId.trim()) throw new AppError('SERVICE', 'Choose a portfolio position to remove.', false);
      await repository.removeHolding(companyId);
    }, behavior),
  };
  const sessionBriefService = {
    getBrief: () => simulate(async (): Promise<HomeBrief> => {
      const [savedCompanies, savedHoldings, allNews] = await Promise.all([
        repository.companies(), repository.portfolio(), repository.content(undefined, 'news'),
      ]);
      const [companies, liveMarkets] = await Promise.all([
        withLiveCompanies(marketData, savedCompanies),
        withLiveMarkets(marketData),
      ]);
      const holdings = applyCompaniesToHoldings(savedHoldings, companies);
      const uniqueNews = Array.from(new Map(allNews.map((item) => [item.title, item])).values());
      const companyMap = new Map(companies.map((company) => [company.id, company]));
      const newsCompanyIds = Array.from(new Set([
        ...holdings.map((holding) => holding.companyId),
        ...companies.map((company) => company.id),
      ])).slice(0, 6);
      const newsCompanies = newsCompanyIds.flatMap((id) => {
        const company = companyMap.get(id);
        return company ? [{ id: company.id, name: company.name, ticker: company.ticker }] : [];
      });
      const newsByCompany = Object.fromEntries(newsCompanies.map((company) => {
        const companyData = companyMap.get(company.id);
        const items = uniqueNews.filter((item) => item.companyId === company.id).slice(0, 3).map((item, index) => ({
          id: item.id,
          companyId: company.id,
          sentiment: companyData && companyData.dailyChange < 0 ? 'bearish' as const : index === 2 ? 'neutral' as const : 'bullish' as const,
          headline: item.title,
          summary: item.body,
          source: 'Sample local brief',
          occurredAt: item.occurredAt,
        }));
        return [company.id, items];
      }));
      const holdingValues = holdings.map((holding) => ({
        holding,
        value: holding.shares * holding.company.price,
      }));
      const totalValue = holdingValues.reduce((sum, item) => sum + item.value, 0);
      const portfolioDayChange = totalValue
        ? holdingValues.reduce((sum, item) => sum + item.value * item.holding.company.dailyChange, 0) / totalValue
        : 0;
      const strongest = [...holdings].sort((a, b) => b.company.dailyChange - a.company.dailyChange)[0];
      const weakest = [...holdings].sort((a, b) => a.company.dailyChange - b.company.dailyChange)[0];
      const largest = [...holdingValues].sort((a, b) => b.value - a.value)[0];
      const companyPriceSource = companies.some((company) => company.priceSource === 'live') ? 'live' as const : 'sample' as const;
      return {
        companyPriceSource,
        marketIndices: liveMarkets,
        marketBriefBullets: [
          'AI infrastructure stocks lead the sample market session.',
          'Treasury yields are steady ahead of the next Fed meeting.',
          'Semiconductor shares outperform the broader sample market.',
          'Enterprise AI spending remains the primary market catalyst.',
        ],
        portfolioBriefBullets: [
          `${companyPriceSource === 'live' ? 'Portfolio' : 'Sample portfolio'} ${portfolioDayChange >= 0 ? '+' : ''}${portfolioDayChange.toFixed(2)}% today.`,
          strongest ? `${strongest.company.name} is the strongest ${companyPriceSource === 'live' ? '' : 'sample '}holding at ${strongest.company.dailyChange >= 0 ? '+' : ''}${strongest.company.dailyChange.toFixed(2)}%.` : 'No sample holdings are available.',
          largest && totalValue ? `${largest.holding.company.name} represents ${Math.round((largest.value / totalValue) * 100)}% of ${companyPriceSource === 'live' ? 'current' : 'sample'} portfolio value.` : 'Position concentration is unavailable.',
          weakest ? `${weakest.company.name} is today’s weakest ${companyPriceSource === 'live' ? '' : 'sample '}holding.` : 'No weakest holding is available.',
          'Two sample earnings reviews are scheduled this month.',
        ],
        portfolioDayChange,
        newsCompanies,
        newsByCompany,
        watchItems,
        calendarEvents,
      };
    }, behavior),
  };
  const researchTaskService = {
    getTasks: () => simulate(() => repository.researchTasks(), behavior),
    getTask: (id: string) => simulate(() => repository.researchTask(id), behavior),
    getLatestOutputs: () => simulate(() => repository.researchTaskOutputs(), behavior),
    createTask: (prompt: string, input: ResearchTaskDraft) => simulate(async (): Promise<ResearchTask> => {
      const cleanPrompt = prompt.trim();
      if (cleanPrompt.length < 8) throw new AppError('SERVICE', 'Describe the research task in a little more detail.', false);
      const draft = normalizeTaskDraft(input);
      const now = new Date();
      const created = await repository.insertResearchTask({
        ...draft,
        id: createTaskId(),
        prompt: cleanPrompt.slice(0, 1_000),
        status: 'running',
        nextRunAt: calculateNextResearchRun(draft.scheduleType, draft.scheduleLabel, now),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      await syncReminder(created);
      return created;
    }, behavior),
    updateTask: (input: ResearchTask) => simulate(async (): Promise<ResearchTask> => {
      const existing = await taskOrThrow(input.id);
      const draft = normalizeTaskDraft(input);
      const updatedAt = new Date().toISOString();
      const updated = await repository.updateResearchTask({
        ...existing,
        ...draft,
        prompt: input.prompt.trim().slice(0, 1_000) || existing.prompt,
        status: input.status,
        nextRunAt: input.status === 'running' ? calculateNextResearchRun(draft.scheduleType, draft.scheduleLabel) : undefined,
        updatedAt,
      });
      await syncReminder(updated);
      return updated;
    }, behavior),
    toggleTask: (id: string) => simulate(async (): Promise<ResearchTask> => {
      const task = await taskOrThrow(id);
      const status = task.status === 'running' ? 'paused' : 'running';
      const updated = await repository.updateResearchTask({
        ...task,
        status,
        nextRunAt: status === 'running' ? calculateNextResearchRun(task.scheduleType, task.scheduleLabel) : undefined,
        updatedAt: new Date().toISOString(),
      });
      await syncReminder(updated);
      return updated;
    }, behavior),
    duplicateTask: (id: string) => simulate(async (): Promise<ResearchTask> => {
      const task = await taskOrThrow(id);
      const now = new Date();
      return repository.insertResearchTask({
        ...task,
        id: createTaskId(),
        name: `${task.name.slice(0, 75)} Copy`,
        status: 'paused',
        lastRunAt: undefined,
        nextRunAt: undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }, behavior),
    deleteTask: (id: string) => simulate(async () => {
      await taskOrThrow(id);
      await notifications.cancelTaskReminder(id).catch(() => undefined);
      await repository.deleteResearchTask(id);
    }, behavior),
    runTask: (id: string) => simulate(async (): Promise<ResearchTaskOutput> => {
      const task = await taskOrThrow(id);
      const [savedCompanies, holdings, markets] = await Promise.all([
        repository.companies(), repository.portfolio(), withLiveMarkets(marketData),
      ]);
      const searchText = task.monitors.join(' ').toLocaleLowerCase();
      const matched = savedCompanies.filter((company) =>
        searchText.includes(company.ticker.toLocaleLowerCase()) || searchText.includes(company.name.toLocaleLowerCase()),
      );
      const fallback = holdings.map((holding) => holding.company);
      const selected = Array.from(new Map((matched.length ? matched : fallback.length ? fallback : savedCompanies)
        .map((company) => [company.id, company])).values()).slice(0, 6);
      const companies = await withLiveCompanies(marketData, selected);
      const evidenceCompanies = await Promise.all(companies.map(async (company) => {
        let articles: Awaited<ReturnType<NewsService['getCompanyNews']>> = [];
        try { articles = await news.getCompanyNews(company.ticker); } catch { /* A task can still run with saved research. */ }
        return {
          ticker: company.ticker,
          name: company.name,
          overview: company.overview,
          bullThesis: company.bullThesis,
          bearThesis: company.bearThesis,
          financials: company.financials,
          price: company.price,
          dailyChange: company.dailyChange,
          priceSource: company.priceSource ?? 'sample' as const,
          news: articles.slice(0, 5).map((article) => ({
            headline: article.headline,
            summary: article.summary,
            source: article.source,
            publishedAt: article.publishedAt,
          })),
        };
      }));
      const evidence: ResearchTaskEvidence = {
        capturedAt: new Date().toISOString(),
        companies: evidenceCompanies,
        market: markets.map((item) => ({
          name: item.name,
          symbol: item.symbol,
          price: item.price,
          changePercent: item.changePercent,
          priceSource: item.priceSource ?? 'sample',
        })),
        portfolio: holdings.map((holding) => ({
          ticker: holding.company.ticker,
          name: holding.company.name,
          shares: holding.shares,
          averageCost: holding.averageCost,
          price: holding.company.price,
          priceSource: holding.company.priceSource ?? 'sample',
        })),
        events: calendarEvents.map((event) => ({ ...event, source: 'sample' as const })),
      };
      const draft = await ai.generateResearchTaskOutput(task, evidence);
      const completedAt = new Date();
      const output: ResearchTaskOutput = { ...draft, taskId: task.id, generatedAt: completedAt.toISOString() };
      await repository.saveResearchTaskOutput(output);
      const updatedTask = await repository.updateResearchTask({
        ...task,
        lastRunAt: output.generatedAt,
        nextRunAt: task.status === 'running' ? calculateNextResearchRun(task.scheduleType, task.scheduleLabel, completedAt) : undefined,
        updatedAt: output.generatedAt,
      });
      await syncReminder(updatedTask);
      await notifications.notifyTaskCompleted(updatedTask, output).catch(() => undefined);
      return output;
    }, behavior),
  };
  const settingsService = { getDatabaseInfo: () => simulate(() => repository.info(), behavior) };
  return { ai, marketData, news, notifications, company: companyService, portfolio: portfolioService, sessionBrief: sessionBriefService, researchTasks: researchTaskService, workspace: createWorkspaceService(repository), settings: settingsService };
}
