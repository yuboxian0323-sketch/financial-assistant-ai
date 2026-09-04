import type { QuoteBatch, StockQuote } from '@/types/domain';

const requestTimeoutMs = 8_000;
const maxSymbolsPerRequest = 12;
const stockSymbolPattern = /^[A-Z0-9][A-Z0-9._:-]{0,31}$/;

interface FinnhubQuote {
  c?: unknown;
  d?: unknown;
  dp?: unknown;
  h?: unknown;
  l?: unknown;
  o?: unknown;
  pc?: unknown;
  t?: unknown;
}

function parseSymbols(request: Request): string[] {
  const requested = new URL(request.url).searchParams.get('symbols') ?? '';
  return Array.from(new Set(requested.split(',').map((symbol) => symbol.trim().toUpperCase())))
    .filter((symbol) => stockSymbolPattern.test(symbol))
    .slice(0, maxSymbolsPerRequest);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toStockQuote(symbol: string, data: FinnhubQuote): StockQuote | null {
  if (!finiteNumber(data.c) || data.c <= 0 || !finiteNumber(data.pc) || data.pc <= 0) return null;
  if (![data.d, data.dp, data.h, data.l, data.o, data.t].every(finiteNumber) || (data.t as number) <= 0) return null;
  return {
    symbol,
    price: data.c,
    change: data.d as number,
    changePercent: data.dp as number,
    high: data.h as number,
    low: data.l as number,
    open: data.o as number,
    previousClose: data.pc,
    asOf: new Date((data.t as number) * 1_000).toISOString(),
    source: 'Finnhub',
  };
}

async function fetchQuote(symbol: string, apiKey: string, signal: AbortSignal): Promise<StockQuote | null> {
  const query = new URLSearchParams({ symbol, token: apiKey });
  const response = await fetch(`https://finnhub.io/api/v1/quote?${query.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Quote request failed with status ${response.status}.`);
  return toStockQuote(symbol, await response.json() as FinnhubQuote);
}

export async function GET(request: Request): Promise<Response> {
  const symbols = parseSymbols(request);
  if (!symbols.length) {
    return Response.json({ code: 'INVALID_SYMBOLS', message: 'Request at least one valid stock symbol.' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({
      code: 'MARKET_API_NOT_CONFIGURED',
      message: 'Live prices need a FINNHUB_API_KEY in .env.local. Showing saved sample prices.',
    }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const results = await Promise.allSettled(symbols.map((symbol) => fetchQuote(symbol, apiKey, controller.signal)));
  clearTimeout(timeout);

  const quotes: StockQuote[] = [];
  const failedSymbols: string[] = [];
  results.forEach((result, index) => {
    const symbol = symbols[index];
    if (symbol && result.status === 'fulfilled' && result.value) quotes.push(result.value);
    else if (symbol) failedSymbols.push(symbol);
  });

  if (!quotes.length) {
    return Response.json({
      code: 'MARKET_PROVIDER_UNAVAILABLE',
      message: 'Finnhub did not return a valid quote. Showing saved sample prices.',
      failedSymbols,
    }, { status: 502 });
  }

  const body: QuoteBatch = { quotes, failedSymbols };
  return Response.json(body, {
    headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=45' },
  });
}
