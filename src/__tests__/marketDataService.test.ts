import { applyLiveMarketQuotes, applyLiveQuotes, createMarketDataService } from '@/services/marketDataService';
import { seedCompanies } from '@/database/seedData';
import type { StockQuote } from '@/types/domain';

const liveQuote: StockQuote = {
  symbol: 'NVDA',
  price: 200.25,
  change: 3.25,
  changePercent: 1.65,
  open: 197,
  high: 201,
  low: 196.5,
  previousClose: 197,
  asOf: '2026-08-19T14:30:00.000Z',
  source: 'Finnhub',
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('live market data service', () => {
  it('loads and caches validated live quotes', async () => {
    const fetchImpl = jest.fn(async () => response({ quotes: [liveQuote], failedSymbols: [] })) as unknown as typeof fetch;
    const service = createMarketDataService({ fetchImpl, cacheMs: 60_000 });

    await expect(service.getQuotes(['nvda', 'NVDA'])).resolves.toEqual({ quotes: [liveQuote], failedSymbols: [] });
    await expect(service.getQuotes(['NVDA'])).resolves.toEqual({ quotes: [liveQuote], failedSymbols: [] });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/api/market/quotes?symbols=NVDA', expect.any(Object));
  });

  it('returns a typed configuration error without exposing a credential', async () => {
    const fetchImpl = jest.fn(async () => response({
      code: 'MARKET_API_NOT_CONFIGURED',
      message: 'Live prices need configuration.',
    }, 503)) as unknown as typeof fetch;
    const service = createMarketDataService({ fetchImpl });

    await expect(service.getQuotes(['NVDA'])).rejects.toMatchObject({
      code: 'CONFIGURATION',
      message: 'Live prices need configuration.',
      retryable: false,
    });
  });

  it('searches and caches the provider stock universe', async () => {
    const result = { symbol: 'SHOP.TO', displaySymbol: 'SHOP', description: 'SHOPIFY INC', type: 'Common Stock' };
    const fetchImpl = jest.fn(async () => response({ results: [result] })) as unknown as typeof fetch;
    const service = createMarketDataService({ fetchImpl });

    await expect(service.searchStocks('shopify')).resolves.toEqual([result]);
    await expect(service.searchStocks('shopify')).resolves.toEqual([result]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/api/market/search?q=shopify', expect.any(Object));
  });

  it('loads and caches selectable historical chart ranges', async () => {
    const history = {
      symbol: 'AAPL', range: '1M' as const, currency: 'USD', source: 'Yahoo Finance' as const,
      points: [
        { timestamp: '2026-08-01T20:00:00.000Z', close: 300 },
        { timestamp: '2026-08-19T20:00:00.000Z', close: 310 },
      ],
      asOf: '2026-08-19T20:00:00.000Z',
    };
    const fetchImpl = jest.fn(async () => response({ history })) as unknown as typeof fetch;
    const service = createMarketDataService({ fetchImpl });

    await expect(service.getHistory('aapl', '1M')).resolves.toEqual(history);
    await expect(service.getHistory('AAPL', '1M')).resolves.toEqual(history);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/api/market/history?symbol=AAPL&range=1M', expect.any(Object));
  });

  it('identifies a stale Expo server instead of treating HTML as chart data', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 500,
      headers: { get: () => 'text/html' },
      json: async () => { throw new Error('Not JSON'); },
    } as unknown as Response)) as unknown as typeof fetch;
    const service = createMarketDataService({ fetchImpl });

    await expect(service.getHistory('AAPL', '1D')).rejects.toMatchObject({
      code: 'CONFIGURATION',
      retryable: false,
      message: expect.stringContaining('Restart Expo'),
    });
  });

  it('overlays quotes without mutating the SQLite company record', () => {
    const savedCompany = seedCompanies.find((company) => company.ticker === 'NVDA');
    expect(savedCompany).toBeDefined();
    if (!savedCompany) return;

    const [quotedCompany] = applyLiveQuotes([savedCompany], { quotes: [liveQuote], failedSymbols: [] });
    expect(quotedCompany).toMatchObject({ price: 200.25, dailyChange: 1.65, priceSource: 'live' });
    expect(savedCompany.price).not.toBe(200.25);
  });

  it('maps a live ETF quote onto a market proxy without changing its identity', () => {
    const market = {
      id: 'sp500', name: 'S&P 500', symbol: 'SPY', proxyLabel: 'SPY ETF proxy',
      price: 600, changePercent: 0, changeAmount: 0, prevClose: 600,
      dayLow: 600, dayHigh: 600, yearLow: 500, yearHigh: 650, chartPoints: [1, 2],
    };
    const quote = { ...liveQuote, symbol: 'SPY', price: 650.25 };

    expect(applyLiveMarketQuotes([market], { quotes: [quote], failedSymbols: [] })[0]).toMatchObject({
      id: 'sp500', name: 'S&P 500', symbol: 'SPY', price: 650.25, priceSource: 'live',
    });
    expect(market.price).toBe(600);
  });
});
