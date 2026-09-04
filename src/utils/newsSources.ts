const trustedSourceFragments = [
  'reuters', 'yahoo finance', 'associated press', 'ap news', 'bloomberg',
  'cnbc', 'financial times', 'wall street journal', 'marketwatch',
];

const trustedDomains = [
  'reuters.com', 'finance.yahoo.com', 'news.yahoo.com', 'apnews.com', 'bloomberg.com',
  'cnbc.com', 'ft.com', 'wsj.com', 'marketwatch.com',
];
const excludedDomains = ['fool.com', 'investorplace.com', 'seekingalpha.com', 'marketbeat.com', 'tipranks.com', 'zacks.com'];

function hostname(url: string): string {
  try { return new URL(url).hostname.toLocaleLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
}

/** Limits market news to an intentionally conservative publisher allowlist. */
export function isTrustedNewsPublisher(source: string, url: string): boolean {
  const normalizedSource = source.trim().toLocaleLowerCase();
  const domain = hostname(url);
  if (excludedDomains.some((excluded) => domain === excluded || domain.endsWith(`.${excluded}`))) return false;
  return trustedSourceFragments.some((fragment) => normalizedSource.includes(fragment))
    || trustedDomains.some((trusted) => domain === trusted || domain.endsWith(`.${trusted}`));
}

export function trustedPublisherLabel(source: string, url: string): string {
  const domain = hostname(url);
  if (domain.endsWith('reuters.com') || source.toLocaleLowerCase().includes('reuters')) return 'Reuters';
  if (domain.endsWith('yahoo.com') || source.toLocaleLowerCase().includes('yahoo finance')) return 'Yahoo Finance';
  return source.trim();
}
