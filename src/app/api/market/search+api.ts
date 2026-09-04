import type { StockSearchResult } from '@/types/domain';

const requestTimeoutMs = 8_000;
const maxResults = 8;

interface FinnhubSearchItem {
  description?: unknown;
  displaySymbol?: unknown;
  symbol?: unknown;
  type?: unknown;
}

interface FinnhubSearchResponse {
  result?: unknown;
}

function isStockType(type: string): boolean {
  const normalized = type.toLocaleLowerCase();
  return normalized.includes('stock')
    || normalized.includes('equity')
    || normalized.includes('adr')
    || normalized.includes('reit');
}

function toSearchResult(value: unknown): StockSearchResult | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as FinnhubSearchItem;
  if (typeof item.symbol !== 'string' || typeof item.displaySymbol !== 'string'
    || typeof item.description !== 'string' || typeof item.type !== 'string'
    || !isStockType(item.type)) return null;
  return {
    symbol: item.symbol,
    displaySymbol: item.displaySymbol,
    description: item.description,
    type: item.type,
  };
}

export async function GET(request: Request): Promise<Response> {
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 64);
  if (!query.length) {
    return Response.json({ code: 'INVALID_QUERY', message: 'Enter a stock symbol or company name.' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({
      code: 'MARKET_API_NOT_CONFIGURED',
      message: 'Search across all stocks needs a FINNHUB_API_KEY in .env.local.',
    }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const params = new URLSearchParams({ q: query, token: apiKey });
    const response = await fetch(`https://finnhub.io/api/v1/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return Response.json({ code: 'MARKET_PROVIDER_UNAVAILABLE', message: 'Finnhub stock search is temporarily unavailable.' }, { status: response.status === 429 ? 429 : 502 });
    }
    const body = await response.json() as FinnhubSearchResponse;
    const results = Array.isArray(body.result)
      ? body.result.map(toSearchResult).filter((item): item is StockSearchResult => item !== null).slice(0, maxResults)
      : [];
    return Response.json({ results }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch {
    return Response.json({ code: 'MARKET_PROVIDER_UNAVAILABLE', message: 'Finnhub stock search is temporarily unavailable.' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
