import type { NewsArticle } from '@/types/domain';
import { cleanNewsText } from '@/utils/news';
import { isTrustedNewsPublisher, trustedPublisherLabel } from '@/utils/newsSources';

const requestTimeoutMs = 8_000;
const maxArticles = 20;
const lookbackDays = 30;
const stockSymbolPattern = /^[A-Z0-9][A-Z0-9._:-]{0,31}$/;

interface FinnhubNewsItem {
  category?: unknown;
  datetime?: unknown;
  headline?: unknown;
  id?: unknown;
  image?: unknown;
  related?: unknown;
  source?: unknown;
  summary?: unknown;
  url?: unknown;
}

function validWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

function toArticle(symbol: string, value: unknown): NewsArticle | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as FinnhubNewsItem;
  if ((typeof item.id !== 'number' && typeof item.id !== 'string')
    || typeof item.datetime !== 'number' || !Number.isFinite(item.datetime) || item.datetime <= 0
    || typeof item.headline !== 'string' || !item.headline.trim()
    || typeof item.source !== 'string' || !item.source.trim()
    || !validWebUrl(item.url)) return null;
  const relatedSymbols = typeof item.related === 'string'
    ? item.related.split(',').map((related) => related.trim()).filter(Boolean)
    : [];
  const source = cleanNewsText(item.source);
  if (!isTrustedNewsPublisher(source, item.url)) return null;
  return {
    id: `${symbol}-${String(item.id)}`,
    symbol,
    headline: cleanNewsText(item.headline),
    summary: typeof item.summary === 'string' ? cleanNewsText(item.summary) : '',
    source: trustedPublisherLabel(source, item.url),
    category: typeof item.category === 'string' && item.category.trim() ? cleanNewsText(item.category) : 'company',
    publishedAt: new Date(item.datetime * 1_000).toISOString(),
    url: item.url,
    imageUrl: validWebUrl(item.image) ? item.image : undefined,
    relatedSymbols,
    provider: 'Finnhub',
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<Response> {
  const symbol = (new URL(request.url).searchParams.get('symbol') ?? '').trim().toUpperCase();
  if (!stockSymbolPattern.test(symbol)) {
    return Response.json({ code: 'INVALID_SYMBOL', message: 'Choose a valid stock symbol for company news.' }, { status: 400 });
  }
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ code: 'MARKET_API_NOT_CONFIGURED', message: 'Live news needs a FINNHUB_API_KEY in .env.local.' }, { status: 503 });
  }

  const to = new Date();
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60_000);
  const query = new URLSearchParams({ symbol, from: isoDate(from), to: isoDate(to), token: apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`https://finnhub.io/api/v1/company-news?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502;
      return Response.json({
        code: status === 429 ? 'NEWS_RATE_LIMIT' : status === 403 ? 'NEWS_PLAN_UNAVAILABLE' : 'NEWS_PROVIDER_UNAVAILABLE',
        message: status === 429 ? 'The Finnhub news rate limit was reached. Wait briefly and try again.' : status === 403 ? 'Company news is unavailable under the current Finnhub plan.' : 'Finnhub company news is temporarily unavailable.',
      }, { status });
    }
    const body = await response.json() as unknown;
    const parsed = Array.isArray(body)
      ? body.map((item) => toArticle(symbol, item)).filter((item): item is NewsArticle => item !== null)
      : [];
    const articles = Array.from(new Map(parsed.map((article) => [article.url, article])).values())
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
      .slice(0, maxArticles);
    return Response.json({ articles }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=900' },
    });
  } catch {
    return Response.json({ code: 'NEWS_PROVIDER_UNAVAILABLE', message: 'Finnhub company news is temporarily unavailable.' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
