import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AppText, Card, EmptyState, LoadingSkeleton, Pill, Screen, SectionHeader, Tag } from '@/components';
import { AddToPortfolioButton } from '@/features/research/AddToPortfolioButton';
import { CompanyOverview } from '@/features/research/CompanyOverview';
import { CompanyNewsFeed } from '@/features/research/CompanyNewsFeed';
import { StockHistoryChart } from '@/features/research/StockHistoryChart';
import { WorkspaceDashboard } from '@/features/workspace/WorkspaceDashboard';
import { useCompany, useCompanyContent, useCompanyNews } from '@/hooks/useAppQueries';
import { useUIStore } from '@/features/ui/store';
import type { CompanyHubPage } from '@/types/domain';
import { theme } from '@/theme';

const pages: CompanyHubPage[] = ['Workspace', 'Overview', 'News', 'Automations'];
export function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storedPage = useUIStore((state) => state.companyHubPage);
  const selected: CompanyHubPage = pages.includes(storedPage as CompanyHubPage) ? storedPage as CompanyHubPage : 'Workspace';
  const select = useUIStore((state) => state.setCompanyHubPage);
  const company = useCompany(id);
  const news = useCompanyContent(id, 'news');
  const liveNews = useCompanyNews(company.data?.ticker ?? '');
  if (company.isLoading) return <Screen title="Company Hub"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  if (company.error || !company.data) return <Screen title="Company Hub"><EmptyState title="Company unavailable" description={company.error?.message ?? 'This company could not be found.'} actionLabel="Try again" onAction={() => company.refetch()} /></Screen>;
  const data = company.data;
  return <Screen title={data.name} subtitle={`${data.ticker} · ${data.industry} · One shared company hub`}>
    <StockHistoryChart symbol={data.ticker} currentPrice={data.price} dailyChange={data.dailyChange} />
    <AddToPortfolioButton stock={{ symbol: data.ticker, name: data.name, type: data.industry, price: data.price }} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>{pages.map((page) => <Pill key={page} label={page} selected={selected === page} onPress={() => select(page)} />)}</ScrollView>
    {selected === 'Workspace' && <WorkspaceDashboard company={data} />}
    {selected === 'Overview' && <CompanyOverview company={data} />}
    {selected === 'News' && <CompanyNewsFeed symbol={data.ticker} companyId={data.id} articles={liveNews.data ?? []} loading={liveNews.isLoading} error={liveNews.error} retry={() => { void liveNews.refetch(); }} fallbackItems={news.data ?? []} />}
    {selected === 'Automations' && <CompanyAutomations companyName={data.name} ticker={data.ticker} />}
  </Screen>;
}

function CompanyAutomations({ companyName, ticker }: { companyName: string; ticker: string }) {
  return <View style={{ gap: theme.spacing.md }}><SectionHeader title="Automations" subtitle={`Future continuous monitoring for ${companyName}`} /><Card elevated><Tag label="Future AI monitoring" /><AppText variant="heading">Monitor {ticker} and alert me when the thesis changes.</AppText><AppText tone="secondary">Architecture placeholder only. No agent, notification, or background job is running.</AppText></Card>{['Earnings summary', 'News monitoring', 'Price alert', 'Weekly comparison report'].map((item) => <Card key={item}><AppText variant="heading">{item}</AppText><AppText tone="secondary">Ready for a future structured automation rule.</AppText></Card>)}</View>;
}
