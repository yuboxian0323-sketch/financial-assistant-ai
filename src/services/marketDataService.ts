import type { MarketDataService } from './contracts';
import { AppError, type Company, type CompanyMarketFundamentals, type CompanyMarketOverview, type MarketIndex, type QuoteBatch, type StockHistory, type StockHistoryRange, type StockQuote, type StockSearchResult } from '@/types/domain';
import { normalizeStockSymbols } from '@/utils/stocks';

interface MarketQuoteResponse {
  quotes?: unknown;
  failedSymbols?: unknown;
  code?: unknown;
  message?: unknown;
}

interface MarketDataOptions {
  fetchImpl?: typeof fetch;
  cacheMs?: number;
}

interface MarketSearchResponse {
  results?: unknown;
  code?: unknown;
  message?: unknown;
}

interface MarketHistoryResponse {
  history?: unknown;
  code?: unknown;
  message?: unknown;
}

interface CompanyOverviewResponse {
  overview?: unknown;
  code?: unknown;
  message?: unknown;
}

const DEFAULT_CACHE_MS = 30_000;

function isStockQuote(value: unknown): value is StockQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Record<string, unknown>;
  return typeof quote.symbol === 'string'
    && typeof quote.price === 'number'
    && Number.isFinite(quote.price)
    && typeof quote.change === 'number'
    && typeof quote.changePercent === 'number'
    && typeof quote.open === 'number'
    && typeof quote.high === 'number'
    && typeof quote.low === 'number'
    && typeof quote.previousClose === 'number'
    && typeof quote.asOf === 'string'
    && quote.source === 'Finnhub';
}

function isStockSearchResult(value: unknown): value is StockSearchResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return typeof result.symbol === 'string'
    && typeof result.displaySymbol === 'string'
    && typeof result.description === 'string'
    && typeof result.type === 'string';
}

function isStockHistory(value: unknown): value is StockHistory {
  if (!value || typeof value !== 'object') return false;
  const history = value as Record<string, unknown>;
  return typeof history.symbol === 'string'
    && ['1H', '1D', '5D', '1W', '1M', '1Y', '2Y'].includes(String(history.range))
    && typeof history.currency === 'string'
    && history.source === 'Yahoo Finance'
    && typeof history.asOf === 'string'
    && Array.isArray(history.points)
    && history.points.length >= 2
    && history.points.every((point) => point && typeof point === 'object'
      && typeof (point as Record<string, unknown>).timestamp === 'string'
      && typeof (point as Record<string, unknown>).close === 'number'
      && Number.isFinite((point as Record<string, unknown>).close));
}

function hasOnlyOptionalNumbers(value: unknown): value is CompanyMarketFundamentals {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every((item) => item === undefined || (typeof item === 'number' && Number.isFinite(item))));
}

function isCompanyMarketOverview(value: unknown): value is CompanyMarketOverview {
  if (!value || typeof value !== 'object') return false;
  const overview = value as Record<string, unknown>;
  if (!overview.profile || typeof overview.profile !== 'object' || Array.isArray(overview.profile)) return false;
  const profile = overview.profile as Record<string, unknown>;
  return typeof profile.symbol === 'string'
    && typeof profile.name === 'string'
    && hasOnlyOptionalNumbers(overview.fundamentals)
    && Array.isArray(overview.peers)
    && overview.peers.every((peer) => typeof peer === 'string')
    && overview.source === 'Finnhub'
    && typeof overview.asOf === 'string';
}

function errorFromResponse(status: number, body: MarketQuoteResponse, fallback: string): AppError {
  const message = typeof body.message === 'string' ? body.message : fallback;
  if (status === 503 && body.code === 'MARKET_API_NOT_CONFIGURED') {
    return new AppError('CONFIGURATION', message, false);
  }
  return new AppError('NETWORK', message, status >= 500 || status === 429);
}

async function getMarketJson<T extends MarketQuoteResponse>(
  fetchImpl: typeof fetch,
  path: string,
  messages: { network: string; unreadable: string; fallback: string; stale?: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(path, { headers: { Accept: 'application/json' } });
  } catch {
    throw new AppError('NETWORK', messages.network, true);
  }
  const contentType = response.headers?.get?.('content-type');
  if (messages.stale && contentType && !contentType.includes('application/json')) {
    throw new AppError('CONFIGURATION', messages.stale, false);
  }
  let body: T;
  try { body = await response.json() as T; }
  catch { throw new AppError('NETWORK', messages.unreadable, true); }
  if (!response.ok) throw errorFromResponse(response.status, body, messages.fallback);
  return body;
}

/** Creates a client for the server-side market proxy while keeping API credentials out of the app bundle. */
export function createMarketDataService(options: MarketDataOptions = {}): MarketDataService {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cacheMs = options.cacheMs ?? DEFAULT_CACHE_MS;
  const cache = new Map<string, { quote: StockQuote; expiresAt: number }>();
  const searchCache = new Map<string, { results: StockSearchResult[]; expiresAt: number }>();
  const historyCache = new Map<string, { history: StockHistory; expiresAt: number }>();
  const overviewCache = new Map<string, { overview: CompanyMarketOverview; expiresAt: number }>();

  return {
    async getQuotes(inputSymbols: string[]): Promise<QuoteBatch> {
      const symbols = normalizeStockSymbols(inputSymbols);
      if (!symbols.length) return { quotes: [], failedSymbols: [] };

      const now = Date.now();
      const cachedQuotes = symbols.flatMap((symbol) => {
        const cached = cache.get(symbol);
        return cached && cached.expiresAt > now ? [cached.quote] : [];
      });
      const cachedSymbols = new Set(cachedQuotes.map((quote) => quote.symbol));
      const missingSymbols = symbols.filter((symbol) => !cachedSymbols.has(symbol));
      if (!missingSymbols.length) return { quotes: cachedQuotes, failedSymbols: [] };

      const query = new URLSearchParams({ symbols: missingSymbols.join(',') });
      const body = await getMarketJson<MarketQuoteResponse>(fetchImpl, `/api/market/quotes?${query.toString()}`, {
        network: 'Could not reach the live stock quote service. Showing saved sample prices.',
        unreadable: 'The live stock quote service returned an unreadable response.',
        fallback: 'Live stock quotes are temporarily unavailable.',
      });

      const freshQuotes = Array.isArray(body.quotes) ? body.quotes.filter(isStockQuote) : [];
      const failedSymbols = Array.isArray(body.failedSymbols)
        ? body.failedSymbols.filter((symbol): symbol is string => typeof symbol === 'string')
        : missingSymbols.filter((symbol) => !freshQuotes.some((quote) => quote.symbol === symbol));
      freshQuotes.forEach((quote) => cache.set(quote.symbol, { quote, expiresAt: now + cacheMs }));
      return { quotes: [...cachedQuotes, ...freshQuotes], failedSymbols };
    },
    async searchStocks(inputQuery: string): Promise<StockSearchResult[]> {
      const query = inputQuery.trim();
      if (!query.length) return [];
      const cacheKey = query.toLocaleLowerCase();
      const cached = searchCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.results;

      const body = await getMarketJson<MarketSearchResponse>(fetchImpl, `/api/market/search?${new URLSearchParams({ q: query }).toString()}`, {
        network: 'Could not reach the stock search service.',
        unreadable: 'The stock search service returned an unreadable response.',
        fallback: 'Stock search is temporarily unavailable.',
      });
      const results = Array.isArray(body.results) ? body.results.filter(isStockSearchResult) : [];
      searchCache.set(cacheKey, { results, expiresAt: Date.now() + 5 * 60_000 });
      return results;
    },
    async getHistory(inputSymbol: string, range: StockHistoryRange): Promise<StockHistory> {
      const symbol = normalizeStockSymbols([inputSymbol])[0];
      if (!symbol) throw new AppError('SERVICE', 'Choose a valid stock for the chart.', false);
      const cacheKey = `${symbol}:${range}`;
      const cached = historyCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return cached.history;

      const body = await getMarketJson<MarketHistoryResponse>(fetchImpl, `/api/market/history?${new URLSearchParams({ symbol, range }).toString()}`, {
        network: 'Could not reach the historical price service.',
        unreadable: 'The historical price service returned an unreadable response.',
        fallback: 'Historical prices are temporarily unavailable.',
        stale: 'The Expo server is stale. Restart Expo with --clear to load the chart route.',
      });
      if (!isStockHistory(body.history)) throw new AppError('SERVICE', 'The historical price service returned invalid chart data.', true);
      historyCache.set(cacheKey, { history: body.history, expiresAt: Date.now() + (range === '1H' || range === '1D' ? 60_000 : 5 * 60_000) });
      return body.history;
    },
    async getCompanyOverview(inputSymbol: string): Promise<CompanyMarketOverview> {
      const symbol = normalizeStockSymbols([inputSymbol])[0];
      if (!symbol) throw new AppError('SERVICE', 'Choose a valid stock for the company overview.', false);
      const cached = overviewCache.get(symbol);
      if (cached && cached.expiresAt > Date.now()) return cached.overview;

      const body = await getMarketJson<CompanyOverviewResponse>(fetchImpl, `/api/market/company?${new URLSearchParams({ symbol }).toString()}`, {
        network: 'Could not reach the live company fundamentals service.',
        unreadable: 'The live company fundamentals service returned an unreadable response.',
        fallback: 'Live company fundamentals are temporarily unavailable.',
        stale: 'The Expo server is stale. Restart Expo with --clear to load the company overview route.',
      });
      if (!isCompanyMarketOverview(body.overview)) {
        throw new AppError('SERVICE', 'The company fundamentals service returned invalid data.', true);
      }
      overviewCache.set(symbol, { overview: body.overview, expiresAt: Date.now() + 60 * 60_000 });
      return body.overview;
    },
  };
}

/** Keeps tests and fully offline startup deterministic when no remote adapter is supplied. */
export function createOfflineMarketDataService(): MarketDataService {
  return {
    getQuotes: async (symbols) => ({ quotes: [], failedSymbols: normalizeStockSymbols(symbols) }),
    searchStocks: async () => [],
    getHistory: async () => { throw new AppError('CONFIGURATION', 'Historical prices are unavailable offline.', false); },
    getCompanyOverview: async () => { throw new AppError('CONFIGURATION', 'Live company fundamentals are unavailable offline.', false); },
  };
}

/** Applies quote snapshots without mutating SQLite-owned company records. */
export function applyLiveQuotes(companies: Company[], batch: QuoteBatch): Company[] {
  const bySymbol = new Map(batch.quotes.map((quote) => [quote.symbol, quote]));
  return companies.map((company) => {
    const quote = bySymbol.get(company.ticker.toUpperCase());
    return quote ? {
      ...company,
      price: quote.price,
      dailyChange: quote.changePercent,
      priceSource: 'live',
      priceAsOf: quote.asOf,
    } : {
      ...company,
      priceSource: 'sample',
      priceAsOf: undefined,
    };
  });
}

/** Overlays live ETF proxy quotes while retaining the bundled values as an offline fallback. */
export function applyLiveMarketQuotes(markets: MarketIndex[], batch: QuoteBatch): MarketIndex[] {
  const bySymbol = new Map(batch.quotes.map((quote) => [quote.symbol, quote]));
  return markets.map((market) => {
    const quote = bySymbol.get(market.symbol.toUpperCase());
    return quote ? {
      ...market,
      price: quote.price,
      changePercent: quote.changePercent,
      changeAmount: quote.change,
      prevClose: quote.previousClose,
      dayLow: quote.low,
      dayHigh: quote.high,
      priceSource: 'live',
      priceAsOf: quote.asOf,
    } : {
      ...market,
      priceSource: 'sample',
      priceAsOf: undefined,
    };
  });
}
