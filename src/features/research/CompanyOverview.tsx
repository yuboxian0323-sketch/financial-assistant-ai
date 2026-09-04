import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, CompanyLogo, EmptyState, LoadingSkeleton, SectionHeader, Tag } from '@/components';
import { useCompanyMarketOverview } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { Company } from '@/types/domain';
import { formatDateTime } from '@/utils/format';

interface MetricItem {
  label: string;
  value?: number;
  format?: 'currency' | 'multiple' | 'percent' | 'number';
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, notation: 'compact', maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${formatCompact(value)}`;
  }
}

function formatMetric(item: MetricItem, currency: string): string {
  if (item.value === undefined) return '—';
  if (item.format === 'currency') return formatMoney(item.value, currency);
  if (item.format === 'multiple') return `${item.value.toFixed(2)}×`;
  if (item.format === 'percent') return `${item.value.toFixed(2)}%`;
  return formatCompact(item.value);
}

function MetricGrid({ items, currency }: { items: MetricItem[]; currency: string }) {
  const available = items.filter((item) => item.value !== undefined);
  if (!available.length) return <AppText tone="muted">This provider did not return metrics for this section.</AppText>;
  return <View style={styles.metricGrid}>{available.map((item) => (
    <View key={item.label} style={styles.metricTile} accessible accessibilityLabel={`${item.label}: ${formatMetric(item, currency)}`}>
      <AppText variant="caption" tone="muted">{item.label.toUpperCase()}</AppText>
      <AppText variant="heading">{formatMetric(item, currency)}</AppText>
    </View>
  ))}</View>;
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <View style={styles.fact}><AppText variant="caption" tone="muted">{label}</AppText><AppText style={styles.factValue}>{value}</AppText></View>;
}

/** Displays live provider fundamentals beside the user's saved company research. */
export function CompanyOverview({ company }: { company: Company }) {
  const overview = useCompanyMarketOverview(company.ticker);
  const [websiteError, setWebsiteError] = useState('');
  const live = overview.data;
  const profile = live?.profile;
  const fundamentals = live?.fundamentals;
  const currency = profile?.currency ?? 'USD';
  const website = profile?.website && /^https?:\/\//i.test(profile.website) ? profile.website : undefined;
  const openWebsite = async () => {
    if (!website) return;
    setWebsiteError('');
    try { await Linking.openURL(website); }
    catch { setWebsiteError('The company website could not be opened on this device.'); }
  };

  const valuation: MetricItem[] = [
    { label: 'P/E (TTM)', value: fundamentals?.peRatio, format: 'multiple' },
    { label: 'Price / book', value: fundamentals?.priceToBook, format: 'multiple' },
    { label: 'Price / sales', value: fundamentals?.priceToSales, format: 'multiple' },
    { label: 'Dividend yield', value: fundamentals?.dividendYield, format: 'percent' },
  ];
  const growth: MetricItem[] = [
    { label: 'Revenue growth', value: fundamentals?.revenueGrowth, format: 'percent' },
    { label: 'EPS growth', value: fundamentals?.epsGrowth, format: 'percent' },
    { label: 'EPS (TTM)', value: fundamentals?.eps, format: 'currency' },
    { label: 'Revenue / share', value: fundamentals?.revenuePerShare, format: 'currency' },
  ];
  const profitability: MetricItem[] = [
    { label: 'Gross margin', value: fundamentals?.grossMargin, format: 'percent' },
    { label: 'Operating margin', value: fundamentals?.operatingMargin, format: 'percent' },
    { label: 'Net margin', value: fundamentals?.netMargin, format: 'percent' },
    { label: 'Return on equity', value: fundamentals?.returnOnEquity, format: 'percent' },
    { label: 'Return on assets', value: fundamentals?.returnOnAssets, format: 'percent' },
  ];
  const financialHealth: MetricItem[] = [
    { label: 'Current ratio', value: fundamentals?.currentRatio, format: 'multiple' },
    { label: 'Quick ratio', value: fundamentals?.quickRatio, format: 'multiple' },
    { label: 'Debt / equity', value: fundamentals?.debtToEquity, format: 'percent' },
    { label: 'Free cash flow / share', value: fundamentals?.freeCashFlowPerShare, format: 'currency' },
  ];
  const trading: MetricItem[] = [
    { label: '52-week high', value: fundamentals?.week52High, format: 'currency' },
    { label: '52-week low', value: fundamentals?.week52Low, format: 'currency' },
    { label: '52-week return', value: fundamentals?.week52Return, format: 'percent' },
    { label: 'Year-to-date return', value: fundamentals?.yearToDateReturn, format: 'percent' },
    { label: 'Beta', value: fundamentals?.beta, format: 'multiple' },
  ];

  return <View style={styles.container}>
    <SectionHeader title="Company Overview" subtitle="Live market facts and your saved investment research" />

    <Card elevated>
      <View style={styles.identityRow}>
        <CompanyLogo companyId={company.id} name={profile?.name ?? company.name} size={52} />
        <View style={styles.flex}>
          <AppText variant="title">{profile?.name ?? company.name}</AppText>
          <AppText tone="secondary">{company.ticker}{profile?.exchange ? ` · ${profile.exchange}` : ''}</AppText>
        </View>
        <Tag label={live ? 'Live facts' : 'Saved data'} tone={live ? 'positive' : 'warning'} />
      </View>
      <View style={styles.tags}>
        <Tag label={profile?.industry ?? company.industry} />
        {profile?.country && <Tag label={profile.country} />}
        {profile?.currency && <Tag label={profile.currency} />}
      </View>
      <View style={styles.quoteRow}>
        <View style={styles.flex}><AppText variant="caption" tone="muted">CURRENT PRICE</AppText><AppText variant="title">{formatMoney(company.price, currency)}</AppText></View>
        <View style={styles.alignEnd}><AppText variant="caption" tone="muted">TODAY</AppText><AppText variant="heading" style={{ color: company.dailyChange >= 0 ? theme.colors.positive : theme.colors.negative }}>{company.dailyChange >= 0 ? '+' : ''}{company.dailyChange.toFixed(2)}%</AppText></View>
      </View>
      <AppText variant="caption" tone="muted">{company.priceSource === 'live' ? `Live Finnhub quote · ${formatDateTime(company.priceAsOf)}` : 'Saved sample quote · live quote unavailable'}</AppText>
      {website && <Button label="Visit company website" variant="secondary" size="small" icon="open-outline" onPress={() => { void openWebsite(); }} />}
      {websiteError && <AppText variant="caption" style={styles.errorText}>{websiteError}</AppText>}
    </Card>

    <Card>
      <SectionHeader title="Business Summary" subtitle="Saved research context" />
      <AppText tone="secondary">{company.overview}</AppText>
    </Card>

    {overview.isLoading && <><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></>}
    {overview.error && <Card><EmptyState title="Live fundamentals unavailable" description={overview.error.message} actionLabel="Try again" onAction={() => { void overview.refetch(); }} /><AppText variant="caption" tone="muted">Your saved company research remains available below.</AppText></Card>}

    {live && <>
      <Card>
        <SectionHeader title="Company Facts" subtitle="Profile and listing details" />
        <View style={styles.factGrid}>
          <Fact label="Industry" value={profile?.industry} />
          <Fact label="Exchange" value={profile?.exchange} />
          <Fact label="Country" value={profile?.country} />
          <Fact label="IPO date" value={profile?.ipoDate} />
          <Fact label="Market cap" value={profile?.marketCapitalizationMillions !== undefined ? formatMoney(profile.marketCapitalizationMillions * 1_000_000, currency) : undefined} />
          <Fact label="Shares outstanding" value={profile?.sharesOutstandingMillions !== undefined ? `${formatCompact(profile.sharesOutstandingMillions * 1_000_000)} shares` : undefined} />
        </View>
      </Card>
      <Card><SectionHeader title="Valuation" subtitle="Trailing and current market multiples" /><MetricGrid items={valuation} currency={currency} /></Card>
      <Card><SectionHeader title="Growth" subtitle="Revenue and earnings trends" /><MetricGrid items={growth} currency={currency} /></Card>
      <Card><SectionHeader title="Profitability" subtitle="Margins and capital efficiency" /><MetricGrid items={profitability} currency={currency} /></Card>
      <Card><SectionHeader title="Financial Health" subtitle="Liquidity, leverage, and cash generation" /><MetricGrid items={financialHealth} currency={currency} /></Card>
      <Card><SectionHeader title="Trading Profile" subtitle="Range, returns, and market sensitivity" /><MetricGrid items={trading} currency={currency} /></Card>
      {live.peers.length > 0 && <Card><SectionHeader title="Industry Peers" subtitle="Comparable tickers returned by the market-data provider" /><View style={styles.tags}>{live.peers.map((peer) => <Tag key={peer} label={peer} />)}</View></Card>}
    </>}

    <SectionHeader title="Saved Research" subtitle="Local investment context—not live provider analysis" />
    {company.financials.length > 0 && <Card><SectionHeader title="Saved Metrics" /><View style={styles.factGrid}>{company.financials.map((metric) => <Fact key={metric.label} label={metric.label} value={metric.value} />)}</View></Card>}
    <Card><Tag label="Bull thesis" tone="positive" /><AppText tone="secondary">{company.bullThesis}</AppText></Card>
    <Card><Tag label="Bear thesis" tone="warning" /><AppText tone="secondary">{company.bearThesis}</AppText></Card>

    <Card style={styles.provenance}>
      <AppText variant="caption" tone="muted">DATA NOTES</AppText>
      <AppText variant="caption" tone="secondary">Company facts and fundamental metrics are provided by {live?.source ?? 'the saved local dataset'}{live ? ` and refreshed ${formatDateTime(live.asOf)}` : ''}. Provider fields can be delayed, incomplete, or calculated differently from regulatory filings. Prices and research are informational, not investment advice.</AppText>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  quoteRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.lg, paddingTop: theme.spacing.sm },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metricTile: { flexGrow: 1, flexBasis: '46%', minHeight: 76, justifyContent: 'center', gap: theme.spacing.xs, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceElevated },
  factGrid: { gap: theme.spacing.md },
  fact: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  factValue: { flex: 1, textAlign: 'right' },
  errorText: { color: theme.colors.negative },
  provenance: { backgroundColor: theme.colors.surfaceMuted },
});
