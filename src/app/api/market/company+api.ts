import type { CompanyMarketFundamentals, CompanyMarketOverview, CompanyMarketProfile } from '@/types/domain';
import { normalizeStockSymbol, stockSymbolPattern } from '@/utils/stocks';

const requestTimeoutMs = 8_000;

interface ProviderResult {
  ok: boolean;
  value?: unknown;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function firstNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = number(source[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function toProfile(symbol: string, value: unknown): CompanyMarketProfile {
  const source = record(value) ?? {};
  return {
    symbol: text(source.ticker) ?? symbol,
    name: text(source.name) ?? symbol,
    country: text(source.country),
    currency: text(source.currency),
    exchange: text(source.exchange),
    industry: text(source.finnhubIndustry),
    ipoDate: text(source.ipo),
    website: text(source.weburl),
    marketCapitalizationMillions: number(source.marketCapitalization),
    sharesOutstandingMillions: number(source.shareOutstanding),
  };
}

function toFundamentals(value: unknown): CompanyMarketFundamentals {
  const container = record(value);
  const source = record(container?.metric) ?? {};
  return {
    peRatio: firstNumber(source, ['peBasicExclExtraTTM', 'peNormalizedAnnual', 'peTTM']),
    priceToBook: firstNumber(source, ['pbAnnual', 'pbQuarterly']),
    priceToSales: firstNumber(source, ['psTTM', 'psAnnual']),
    dividendYield: firstNumber(source, ['dividendYieldIndicatedAnnual', 'dividendYieldTTM']),
    beta: firstNumber(source, ['beta']),
    eps: firstNumber(source, ['epsBasicExclExtraItemsTTM', 'epsNormalizedAnnual']),
    revenuePerShare: firstNumber(source, ['revenuePerShareTTM', 'revenuePerShareAnnual']),
    revenueGrowth: firstNumber(source, ['revenueGrowthTTMYoy', 'revenueGrowth3Y']),
    epsGrowth: firstNumber(source, ['epsGrowthTTMYoy', 'epsGrowth3Y']),
    grossMargin: firstNumber(source, ['grossMarginTTM', 'grossMarginAnnual']),
    operatingMargin: firstNumber(source, ['operatingMarginTTM', 'operatingMarginAnnual']),
    netMargin: firstNumber(source, ['netProfitMarginTTM', 'netProfitMarginAnnual']),
    returnOnEquity: firstNumber(source, ['roeTTM', 'roeAnnual']),
    returnOnAssets: firstNumber(source, ['roaTTM', 'roaAnnual']),
    currentRatio: firstNumber(source, ['currentRatioAnnual', 'currentRatioQuarterly']),
    quickRatio: firstNumber(source, ['quickRatioAnnual', 'quickRatioQuarterly']),
    debtToEquity: firstNumber(source, ['totalDebt/totalEquityAnnual', 'totalDebt/totalEquityQuarterly']),
    freeCashFlowPerShare: firstNumber(source, ['freeCashFlowPerShareTTM', 'freeCashFlowPerShareAnnual']),
    week52High: firstNumber(source, ['52WeekHigh']),
    week52Low: firstNumber(source, ['52WeekLow']),
    week52Return: firstNumber(source, ['52WeekPriceReturnDaily']),
    yearToDateReturn: firstNumber(source, ['yearToDatePriceReturnDaily']),
  };
}

function toPeers(symbol: string, value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => text(item)?.toUpperCase()).filter((item): item is string => Boolean(item))))
      .filter((item) => item !== symbol && stockSymbolPattern.test(item))
      .slice(0, 12)
    : [];
}

async function fetchProvider(path: string, apiKey: string, signal: AbortSignal): Promise<ProviderResult> {
  try {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`https://finnhub.io/api/v1/${path}${separator}token=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    return response.ok ? { ok: true, value: await response.json() as unknown } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function GET(request: Request): Promise<Response> {
  const symbol = normalizeStockSymbol(new URL(request.url).searchParams.get('symbol') ?? '');
  if (!stockSymbolPattern.test(symbol)) {
    return Response.json({ code: 'INVALID_SYMBOL', message: 'Choose a valid stock symbol for the company overview.' }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({
      code: 'MARKET_API_NOT_CONFIGURED',
      message: 'Live company fundamentals need a FINNHUB_API_KEY in .env.local.',
    }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const query = `symbol=${encodeURIComponent(symbol)}`;
  const [profileResult, metricsResult, peersResult] = await Promise.all([
    fetchProvider(`stock/profile2?${query}`, apiKey, controller.signal),
    fetchProvider(`stock/metric?${query}&metric=all`, apiKey, controller.signal),
    fetchProvider(`stock/peers?${query}`, apiKey, controller.signal),
  ]);
  clearTimeout(timeout);

  if (!profileResult.ok && !metricsResult.ok && !peersResult.ok) {
    return Response.json({
      code: 'MARKET_PROVIDER_UNAVAILABLE',
      message: 'Live company fundamentals are temporarily unavailable.',
    }, { status: 502 });
  }

  const overview: CompanyMarketOverview = {
    profile: toProfile(symbol, profileResult.value),
    fundamentals: toFundamentals(metricsResult.value),
    peers: toPeers(symbol, peersResult.value),
    source: 'Finnhub',
    asOf: new Date().toISOString(),
  };
  return Response.json({ overview }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
