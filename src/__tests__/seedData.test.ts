import { contentRows, seedCompanies } from '@/database/seedData';
import type { InvestmentRepository } from '@/database/repositories';
import { createLocalServices } from '@/services/localServices';
import type { MarketDataService } from '@/services/contracts';
import type { Holding } from '@/types/domain';

describe('foundation seed data', () => {
  it('provides seven complete company knowledge bases', () => {
    expect(seedCompanies).toHaveLength(7);
    for (const company of seedCompanies) {
      const owned = contentRows.filter((item) => item.companyId === company.id);
      expect(owned.filter((item) => item.kind === 'news')).toHaveLength(5);
      expect(owned.filter((item) => item.kind === 'report')).toHaveLength(3);
      expect(owned.filter((item) => item.kind === 'timeline')).toHaveLength(3);
      expect(company.financials.length).toBeGreaterThanOrEqual(3);
      expect(company.aiSummary).toContain('Sample AI summary');
      expect(company.bullThesis).toBeTruthy();
      expect(company.bearThesis).toBeTruthy();
    }
  });

  it('uses globally stable content identifiers', () => {
    const ids = contentRows.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('home brief service', () => {
  it('builds every briefing section from local sample records', async () => {
    const portfolioCompanies = seedCompanies.filter((company) => ['nvda', 'msft', 'tsm'].includes(company.id));
    const holdings: Holding[] = portfolioCompanies.map((company, index) => ({
      id: `holding-${company.id}`,
      companyId: company.id,
      company,
      shares: 10 + index,
      averageCost: company.price * 0.8,
      notes: 'Sample holding',
    }));
    const repository = {
      companies: jest.fn(async () => seedCompanies),
      portfolio: jest.fn(async () => holdings),
      watchlist: jest.fn(async () => seedCompanies),
      content: jest.fn(async () => contentRows.filter((item) => item.kind === 'news')),
    } as unknown as InvestmentRepository;

    const services = createLocalServices(repository, { delayMs: 0 });
    const brief = await services.sessionBrief.getBrief();
    const portfolio = await services.portfolio.getOverview();

    expect(brief.marketIndices).toHaveLength(7);
    expect(brief.marketBriefBullets).toHaveLength(4);
    expect(brief.portfolioBriefBullets).toHaveLength(5);
    expect(brief.newsCompanies.length).toBeGreaterThanOrEqual(3);
    expect(brief.newsByCompany.nvda).toHaveLength(3);
    expect(brief.watchItems).toHaveLength(5);
    expect(brief.calendarEvents).toHaveLength(5);
    expect(portfolio.favorites).toHaveLength(7);
    expect(portfolio.briefBullets).toHaveLength(5);
    expect(Object.keys(portfolio.composition)).toEqual(['Sector', 'Industry', 'Theme', 'Geography', 'Market Cap']);
    expect(portfolio.strengths).toHaveLength(2);
    expect(portfolio.watchItems).toHaveLength(2);
    expect(portfolio.researchIdeas).toHaveLength(3);
    expect(portfolio.upcomingEvents).toHaveLength(4);
  });
});

describe('live quote integration', () => {
  it('replaces saved company prices through the service boundary', async () => {
    const repository = {
      companies: jest.fn(async () => seedCompanies),
    } as unknown as InvestmentRepository;
    const marketData: MarketDataService = {
      searchStocks: jest.fn(async () => []),
      getHistory: jest.fn(async () => ({
        symbol: 'NVDA', range: '1D' as const, currency: 'USD', source: 'Yahoo Finance' as const,
        points: [{ timestamp: '2026-08-19T13:00:00.000Z', close: 205 }, { timestamp: '2026-08-19T14:00:00.000Z', close: 210 }],
        asOf: '2026-08-19T14:00:00.000Z',
      })),
      getQuotes: jest.fn(async () => ({
        quotes: [{
          symbol: 'NVDA', price: 210, change: 5, changePercent: 2.44,
          open: 205, high: 211, low: 204, previousClose: 205,
          asOf: '2026-08-19T14:30:00.000Z', source: 'Finnhub' as const,
        }],
        failedSymbols: seedCompanies.filter((company) => company.ticker !== 'NVDA').map((company) => company.ticker),
      })),
    };

    const services = createLocalServices(repository, { delayMs: 0 }, marketData);
    const companies = await services.company.search();
    const nvidia = companies.find((company) => company.ticker === 'NVDA');
    const microsoft = companies.find((company) => company.ticker === 'MSFT');

    expect(nvidia).toMatchObject({ price: 210, dailyChange: 2.44, priceSource: 'live' });
    expect(microsoft?.priceSource).toBe('sample');
  });
});

describe('portfolio persistence service', () => {
  it('creates a research company and saves a manual position', async () => {
    const addHolding = jest.fn(async (company, shares: number, averageCost: number) => ({
      id: `holding-${company.id}`, companyId: company.id, company, shares, averageCost, notes: 'Added from stock research.',
    }));
    const repository = {
      companyByTicker: jest.fn(async () => null),
      addHolding,
    } as unknown as InvestmentRepository;
    const services = createLocalServices(repository, { delayMs: 0 });

    const holding = await services.portfolio.addHolding({
      symbol: 'SHOP.TO', name: 'Shopify', type: 'Common Stock', shares: 2.5, averageCost: 150,
    });

    expect(holding).toMatchObject({ shares: 2.5, averageCost: 150, company: { ticker: 'SHOP.TO', name: 'Shopify' } });
    expect(addHolding).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'SHOP.TO' }), 2.5, 150);
  });

  it('removes only the selected portfolio position', async () => {
    const removeHolding = jest.fn(async () => undefined);
    const repository = { removeHolding } as unknown as InvestmentRepository;
    const services = createLocalServices(repository, { delayMs: 0 });

    await expect(services.portfolio.removeHolding('nvda')).resolves.toBeUndefined();
    expect(removeHolding).toHaveBeenCalledWith('nvda');
  });
});
