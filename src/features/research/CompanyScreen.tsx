import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { AppText, Button, Card, EmptyState, LoadingSkeleton, NewsCard, Pill, Screen, SectionHeader, SummaryCard, Tag } from '@/components';
import { useCompany, useCompanyContent } from '@/hooks/useAppQueries';
import { useUIStore } from '@/features/ui/store';
import type { Company, CompanyContent, CompanyHubPage } from '@/types/domain';
import { theme } from '@/theme';

const pages: CompanyHubPage[] = ['Workspace', 'Overview', 'News', 'Automations'];
const newsFilters = ['All', 'Company', 'Industry', 'Financial', 'Products', 'Management', 'Macro', 'AI Summary'];
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
  if (company.isLoading) return <Screen title="Company Hub"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  if (company.error || !company.data) return <Screen title="Company Hub"><EmptyState title="Company unavailable" description={company.error?.message ?? 'This company could not be found.'} actionLabel="Try again" onAction={() => company.refetch()} /></Screen>;
  const data = company.data;
  return <Screen title={data.name} subtitle={`${data.ticker} · ${data.industry} · One shared company hub`}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>{pages.map((page) => <Pill key={page} label={page} selected={selected === page} onPress={() => select(page)} />)}</ScrollView>
    {selected === 'Workspace' && <CompanyWorkspace company={data} newsCount={news.data?.length ?? 0} />}
    {selected === 'Overview' && <CompanyOverview company={data} />}
    {selected === 'News' && <CompanyNews ticker={data.ticker} loading={news.isLoading} error={news.error} items={news.data ?? []} retry={() => news.refetch()} />}
    {selected === 'Automations' && <CompanyAutomations companyName={data.name} ticker={data.ticker} />}
  </Screen>;
}

function CompanyWorkspace({ company, newsCount }: { company: Company; newsCount: number }) {
  return <View style={{ gap: theme.spacing.md }}>
    <SectionHeader title="Workspace" subtitle="Personal widgets referencing Overview data" />
    <SummaryCard title="AI Summary · Placeholder" summary={company.aiSummary} emphasis />
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      <View style={{ flex: 1 }}><SummaryCard title="Sample price" metric={`$${company.price.toFixed(2)}`} summary={`${company.dailyChange >= 0 ? '+' : ''}${company.dailyChange.toFixed(2)}% today`} /></View>
      <View style={{ flex: 1 }}><SummaryCard title="News" metric={String(newsCount)} summary="Sample tracked stories" /></View>
    </View>
    {company.financials.slice(0, 2).map((metric) => <SummaryCard key={metric.label} title={metric.label} metric={metric.value} summary="Referenced from the canonical Overview." />)}
    <Card><Tag label="Customizable layout" /><AppText tone="secondary">Drag, resize, pin, and hide controls are intentionally reserved for a future milestone.</AppText></Card>
  </View>;
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

function CompanyNews({ ticker, loading, error, items, retry }: { ticker: string; loading: boolean; error: Error | null; items: CompanyContent[]; retry: () => void }) {
  if (loading) return <LoadingSkeleton preset="card" />;
  if (error) return <EmptyState title="News unavailable" description={error.message} actionLabel="Try again" onAction={retry} />;
  return <View style={{ gap: theme.spacing.md }}><SectionHeader title="News" subtitle="Everything that changes over time" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>{newsFilters.map((filter, index) => <Pill key={filter} label={filter} selected={index === 0} />)}</ScrollView>{items.length ? items.map((item) => <NewsCard key={item.id} headline={item.title} summary={item.body} timestamp={item.occurredAt} company={ticker} important={item.importance >= 3} />) : <EmptyState title="No news yet" description="Changing company information will appear here." />}</View>;
}

function CompanyAutomations({ companyName, ticker }: { companyName: string; ticker: string }) {
  return <View style={{ gap: theme.spacing.md }}><SectionHeader title="Automations" subtitle={`Future continuous monitoring for ${companyName}`} /><Card elevated><Tag label="AI monitoring placeholder" /><AppText variant="heading">Monitor {ticker} and alert me when the thesis changes.</AppText><AppText tone="secondary">Architecture placeholder only. No agent, notification, or background job is running.</AppText><Button label="Create automation soon" disabled /></Card>{['Earnings summary', 'News monitoring', 'Price alert', 'Weekly comparison report'].map((item) => <Card key={item}><AppText variant="heading">{item}</AppText><AppText tone="secondary">Ready for a future structured automation rule.</AppText></Card>)}</View>;
}
