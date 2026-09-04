import type { StockHistory, StockHistoryRange, StockPricePoint } from '@/types/domain';

const requestTimeoutMs = 10_000;
const stockSymbolPattern = /^[A-Z0-9][A-Z0-9._:-]{0,31}$/;
const rangeConfiguration: Record<StockHistoryRange, { providerRange: string; interval: string; windowMs?: number }> = {
  '1H': { providerRange: '1d', interval: '2m', windowMs: 60 * 60_000 },
  '1D': { providerRange: '1d', interval: '5m' },
  '5D': { providerRange: '5d', interval: '30m' },
  '1W': { providerRange: '5d', interval: '30m' },
  '1M': { providerRange: '1mo', interval: '1d' },
  '1Y': { providerRange: '1y', interval: '1wk' },
  '2Y': { providerRange: '2y', interval: '1wk' },
};

interface YahooChartResult {
  meta?: { currency?: unknown; symbol?: unknown };
  timestamp?: unknown;
  indicators?: { quote?: unknown };
}

interface YahooChartResponse {
  chart?: { result?: unknown; error?: unknown };
}

function parseRequest(request: Request): { symbol: string; range: StockHistoryRange } | null {
  const params = new URL(request.url).searchParams;
  const symbol = (params.get('symbol') ?? '').trim().toUpperCase();
  const range = (params.get('range') ?? '') as StockHistoryRange;
  return stockSymbolPattern.test(symbol) && Object.prototype.hasOwnProperty.call(rangeConfiguration, range) ? { symbol, range } : null;
}

function yahooSymbols(symbol: string): string[] {
  const candidates = [symbol];
  if (/^[A-Z0-9]+\.[A-Z]$/.test(symbol)) candidates.push(symbol.replace('.', '-'));
  return Array.from(new Set(candidates));
}

function parsePoints(result: YahooChartResult, windowMs?: number): StockPricePoint[] {
  if (!Array.isArray(result.timestamp) || !Array.isArray(result.indicators?.quote)) return [];
  const quote = result.indicators.quote[0];
  if (!quote || typeof quote !== 'object' || !Array.isArray((quote as { close?: unknown }).close)) return [];
  const closes = (quote as { close: unknown[] }).close;
  const points = result.timestamp.flatMap((timestamp, index) => {
    const close = closes[index];
    return typeof timestamp === 'number' && Number.isFinite(timestamp) && typeof close === 'number' && Number.isFinite(close) && close > 0
      ? [{ timestamp: new Date(timestamp * 1_000).toISOString(), close }]
      : [];
  });
  if (!windowMs || !points.length) return points;
  const latest = new Date(points[points.length - 1]?.timestamp ?? 0).getTime();
  return points.filter((point) => new Date(point.timestamp).getTime() >= latest - windowMs);
}

async function fetchHistory(symbol: string, range: StockHistoryRange, signal: AbortSignal): Promise<StockHistory | null> {
  const configuration = rangeConfiguration[range];
  const params = new URLSearchParams({ range: configuration.providerRange, interval: configuration.interval, includePrePost: 'false', events: 'div,splits' });
  const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 AI-Investment-OS/0.1' },
    signal,
  });
  if (response.status === 429) throw new Error('RATE_LIMIT');
  if (!response.ok) return null;
  const body = await response.json() as YahooChartResponse;
  const result = Array.isArray(body.chart?.result) ? body.chart.result[0] as YahooChartResult | undefined : undefined;
  if (!result) return null;
  const points = parsePoints(result, configuration.windowMs);
  if (points.length < 2) return null;
  return {
    symbol: typeof result.meta?.symbol === 'string' ? result.meta.symbol : symbol,
    range,
    currency: typeof result.meta?.currency === 'string' ? result.meta.currency : 'USD',
    source: 'Yahoo Finance',
    points,
    asOf: points[points.length - 1]?.timestamp ?? new Date().toISOString(),
  };
}

export async function GET(request: Request): Promise<Response> {
  const input = parseRequest(request);
  if (!input) return Response.json({ code: 'INVALID_HISTORY_REQUEST', message: 'Choose a valid stock and chart range.' }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    for (const candidate of yahooSymbols(input.symbol)) {
      const history = await fetchHistory(candidate, input.range, controller.signal);
      if (history) {
        const maxAge = input.range === '1H' || input.range === '1D' ? 60 : 300;
        return Response.json({ history: { ...history, symbol: input.symbol } }, {
          headers: { 'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
        });
      }
    }
    return Response.json({ code: 'HISTORY_NOT_FOUND', message: 'Historical prices are not available for this stock or range.' }, { status: 404 });
  } catch (error) {
    const rateLimited = error instanceof Error && error.message === 'RATE_LIMIT';
    return Response.json({
      code: rateLimited ? 'HISTORY_RATE_LIMIT' : 'HISTORY_UNAVAILABLE',
      message: rateLimited ? 'The chart provider is busy. Wait briefly and try again.' : 'Historical prices are temporarily unavailable.',
    }, { status: rateLimited ? 429 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
