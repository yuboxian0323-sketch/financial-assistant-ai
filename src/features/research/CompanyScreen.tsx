import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AppText, Card, EmptyState, LoadingSkeleton, Pill, Screen, SectionHeader, SummaryCard, Tag } from '@/components';
import { AddToPortfolioButton } from '@/features/research/AddToPortfolioButton';
import { CompanyNewsFeed } from '@/features/research/CompanyNewsFeed';
import { StockHistoryChart } from '@/features/research/StockHistoryChart';
import { WorkspaceDashboard } from '@/features/workspace/WorkspaceDashboard';
import { useCompany, useCompanyContent, useCompanyNews } from '@/hooks/useAppQueries';
import { useUIStore } from '@/features/ui/store';
import type { Company, CompanyHubPage } from '@/types/domain';
import { theme } from '@/theme';

const pages: CompanyHubPage[] = ['Workspace', 'Overview', 'News', 'Automations'];
const overviewGroups = [
  { title: 'Company', body: 'Description, headquarters, leadership, employees, and founding history.' },
  { title: 'Business', body: 'Business model, products, services, customers, and suppliers.' },
  { title: 'Segments', body: 'Business segments, revenue mix, and geographic exposure.' },
  { title: 'Valuation', body: 'P/E, forward P/E, EV/EBITDA, PEG, DCF, and historical context.' },
  { title: 'Competitors', body: 'Direct, indirect, and emerging competitive threats.' },
  { title: 'Supply Chain & Customers', body: 'Manufacturers, suppliers, partners, and major customer exposure.' },
  { title: 'Risks & Opportunities', body: 'Business, macro, and regulatory risks alongside durable growth drivers.' },
  { title: 'Timeline', body: 'Important company events arranged as a durable historical record.' },
  { title: 'Documents', body: 'Annual reports, quarterly reports, presentations, and SEC filing placeholders.' },
  { title: 'AI Analysis', body: 'Future long-form SWOT, moat, industry position, and outlook analysis.' },
] as const;

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

function CompanyOverview({ company }: { company: Company }) {
  return <View style={{ gap: theme.spacing.md }}>
    <SectionHeader title="Overview" subtitle="The complete, non-personalized company knowledge base" />
    <SummaryCard title="Company description" summary={company.overview} />
    <SectionHeader title="Financials" />
    {company.financials.map((metric) => <SummaryCard key={metric.label} title={metric.label} metric={metric.value} summary="Representative placeholder metric." />)}
    {overviewGroups.map((group) => <Card key={group.title}><AppText variant="heading">{group.title}</AppText><AppText tone="secondary">{group.body}</AppText></Card>)}
    <Card><Tag label="Bull thesis" tone="positive" /><AppText>{company.bullThesis}</AppText></Card>
    <Card><Tag label="Bear thesis" tone="warning" /><AppText>{company.bearThesis}</AppText></Card>
  </View>;
}

function CompanyAutomations({ companyName, ticker }: { companyName: string; ticker: string }) {
  return <View style={{ gap: theme.spacing.md }}><SectionHeader title="Automations" subtitle={`Future continuous monitoring for ${companyName}`} /><Card elevated><Tag label="Future AI monitoring" /><AppText variant="heading">Monitor {ticker} and alert me when the thesis changes.</AppText><AppText tone="secondary">Architecture placeholder only. No agent, notification, or background job is running.</AppText></Card>{['Earnings summary', 'News monitoring', 'Price alert', 'Weekly comparison report'].map((item) => <Card key={item}><AppText variant="heading">{item}</AppText><AppText tone="secondary">Ready for a future structured automation rule.</AppText></Card>)}</View>;
}
