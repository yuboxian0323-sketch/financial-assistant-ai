import { isTrustedNewsPublisher, trustedPublisherLabel } from '@/utils/newsSources';

describe('trusted news publisher filter', () => {
  it('allows established news publishers used by the product', () => {
    expect(isTrustedNewsPublisher('Reuters', 'https://www.reuters.com/markets/example')).toBe(true);
    expect(isTrustedNewsPublisher('Yahoo Finance', 'https://finance.yahoo.com/news/example')).toBe(true);
    expect(isTrustedNewsPublisher('CNBC', 'https://www.cnbc.com/example')).toBe(true);
  });

  it('excludes investment-promotion and unknown domains', () => {
    expect(isTrustedNewsPublisher('The Motley Fool', 'https://www.fool.com/investing/example')).toBe(false);
    expect(isTrustedNewsPublisher('Unknown Blog', 'https://example.com/story')).toBe(false);
  });

  it('normalizes recognizable publisher labels', () => {
    expect(trustedPublisherLabel('Reuters via Yahoo Finance', 'https://finance.yahoo.com/news/example')).toBe('Reuters');
  });
});
