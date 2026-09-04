import { createNewsService } from '@/services/newsService';
import type { NewsArticle } from '@/types/domain';
import { cleanNewsText } from '@/utils/news';

const article: NewsArticle = {
  id: 'AAPL-123',
  symbol: 'AAPL',
  headline: 'Apple announces a product update',
  summary: 'The company shared details about an upcoming product.',
  source: 'Example News',
  category: 'company',
  publishedAt: '2026-08-30T12:00:00.000Z',
  url: 'https://example.com/apple-update',
  imageUrl: 'https://example.com/apple.jpg',
  relatedSymbols: ['AAPL'],
  provider: 'Finnhub',
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('company news service', () => {
  it('normalizes common provider encoding artifacts', () => {
    expect(cleanNewsText('Appleâs update &#39;ships&#39; &amp; scales')).toBe("Apple’s update 'ships' & scales");
  });

  it('loads, validates, and caches live company news', async () => {
    const fetchImpl = jest.fn(async () => response({ articles: [article] })) as unknown as typeof fetch;
    const service = createNewsService(fetchImpl);

    await expect(service.getCompanyNews('aapl')).resolves.toEqual([article]);
    await expect(service.getCompanyNews('AAPL')).resolves.toEqual([article]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/api/market/news?symbol=AAPL', expect.any(Object));
  });

  it('drops malformed or unsafe article records', async () => {
    const fetchImpl = jest.fn(async () => response({
      articles: [article, { ...article, id: 'unsafe', url: 'javascript:alert(1)' }, { headline: 'Incomplete' }],
    })) as unknown as typeof fetch;
    const service = createNewsService(fetchImpl);

    await expect(service.getCompanyNews('AAPL')).resolves.toEqual([article]);
  });

  it('returns a typed non-retryable plan error', async () => {
    const fetchImpl = jest.fn(async () => response({ message: 'Company news is unavailable under the current Finnhub plan.' }, 403)) as unknown as typeof fetch;
    const service = createNewsService(fetchImpl);

    await expect(service.getCompanyNews('AAPL')).rejects.toMatchObject({
      code: 'NETWORK',
      retryable: false,
      message: 'Company news is unavailable under the current Finnhub plan.',
    });
  });
});
