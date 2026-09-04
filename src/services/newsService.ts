import type { NewsService } from './contracts';
import { AppError, type NewsArticle } from '@/types/domain';
import { isWebUrl } from '@/utils/news';
import { normalizeStockSymbol } from '@/utils/stocks';

interface NewsResponseBody {
  articles?: unknown;
  code?: unknown;
  message?: unknown;
  launchAsset?: unknown;
}

const cacheDurationMs = 5 * 60_000;

function isNewsArticle(value: unknown): value is NewsArticle {
  if (!value || typeof value !== 'object') return false;
  const article = value as Record<string, unknown>;
  return typeof article.id === 'string'
    && typeof article.symbol === 'string'
    && typeof article.headline === 'string'
    && typeof article.summary === 'string'
    && typeof article.source === 'string'
    && typeof article.category === 'string'
    && typeof article.publishedAt === 'string'
    && isWebUrl(article.url)
    && (article.imageUrl === undefined || isWebUrl(article.imageUrl))
    && Array.isArray(article.relatedSymbols)
    && article.relatedSymbols.every((symbol) => typeof symbol === 'string')
    && article.provider === 'Finnhub';
}

/** Loads validated company news through the protected Expo server route. */
export function createNewsService(fetchImpl: typeof fetch = fetch): NewsService {
  const cache = new Map<string, { articles: NewsArticle[]; expiresAt: number }>();
  return {
    async getCompanyNews(inputSymbol) {
      const symbol = normalizeStockSymbol(inputSymbol);
      if (!symbol) return [];
      const cached = cache.get(symbol);
      if (cached && cached.expiresAt > Date.now()) return cached.articles;

      let response: Response;
      try {
        response = await fetchImpl(`/api/market/news?${new URLSearchParams({ symbol }).toString()}`, {
          headers: { Accept: 'application/json' },
        });
      } catch {
        throw new AppError('NETWORK', 'Could not reach the live company-news service.', true);
      }

      let body: NewsResponseBody;
      try {
        body = await response.json() as NewsResponseBody;
      } catch {
        throw new AppError('NETWORK', 'The live company-news service returned an unreadable response.', true);
      }
      if (body.launchAsset) {
        throw new AppError('CONFIGURATION', 'Expo was started before live news was added. Restart the Expo server and reload the app.', false);
      }
      if (!response.ok) {
        const message = typeof body.message === 'string' ? body.message : 'Live company news is temporarily unavailable.';
        throw new AppError(response.status === 503 ? 'CONFIGURATION' : 'NETWORK', message, response.status === 429 || response.status >= 500);
      }
      const articles = Array.isArray(body.articles) ? body.articles.filter(isNewsArticle) : [];
      cache.set(symbol, { articles, expiresAt: Date.now() + cacheDurationMs });
      return articles;
    },
  };
}

export function createUnavailableNewsService(): NewsService {
  return {
    getCompanyNews: async () => {
      throw new AppError('CONFIGURATION', 'Live company news is not configured.', false);
    },
  };
}
