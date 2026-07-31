import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, EmptyState, LoadingSkeleton, NewsCard, Pill, Screen, SectionHeader, SummaryCard, Tag } from '@/components';
import { useCompany, useCompanyContent } from '@/hooks/useAppQueries';
import { useUIStore } from '@/features/ui/store';
import type { Company, CompanyContent, CompanyHubPage } from '@/types/domain';
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
  const storedPage = useUIStore((state) => state.expandedCard);
  const selected: CompanyHubPage = pages.includes(storedPage as CompanyHubPage) ? storedPage as CompanyHubPage : 'Workspace';
  const select = useUIStore((state) => state.setExpandedCard);
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
    <Card><Tag label="Customizable layout" /><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>Drag, resize, pin, and hide controls are intentionally reserved for a future milestone.</Text></Card>
  </View>;
}

function CompanyOverview({ company }: { company: Company }) {
  return <View style={{ gap: theme.spacing.md }}>
    <SectionHeader title="Overview" subtitle="The complete, non-personalized company knowledge base" />
    <SummaryCard title="Company description" summary={company.overview} />
    <SectionHeader title="Financials" />
    {company.financials.map((metric) => <SummaryCard key={metric.label} title={metric.label} metric={metric.value} summary="Representative placeholder metric." />)}
    {overviewGroups.map((group) => <Card key={group.title}><Text style={{ ...theme.type.heading, color: theme.colors.text }}>{group.title}</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>{group.body}</Text></Card>)}
    <Card><Tag label="Bull thesis" tone="positive" /><Text style={{ ...theme.type.body, color: theme.colors.text }}>{company.bullThesis}</Text></Card>
    <Card><Tag label="Bear thesis" tone="warning" /><Text style={{ ...theme.type.body, color: theme.colors.text }}>{company.bearThesis}</Text></Card>
  </View>;
}

function CompanyNews({ ticker, loading, error, items, retry }: { ticker: string; loading: boolean; error: Error | null; items: CompanyContent[]; retry: () => void }) {
  if (loading) return <LoadingSkeleton preset="card" />;
  if (error) return <EmptyState title="News unavailable" description={error.message} actionLabel="Try again" onAction={retry} />;
  return <View style={{ gap: theme.spacing.md }}><SectionHeader title="News" subtitle="Everything that changes over time" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>{['All', 'Company', 'Industry', 'Financial', 'Products', 'Management', 'Macro', 'AI Summary'].map((filter, index) => <Pill key={filter} label={filter} selected={index === 0} />)}</ScrollView>{items.length ? items.map((item) => <NewsCard key={item.id} headline={item.title} summary={item.body} timestamp={item.occurredAt} company={ticker} important={item.importance >= 3} />) : <EmptyState title="No news yet" description="Changing company information will appear here." />}</View>;
}

function CompanyAutomations({ companyName, ticker }: { companyName: string; ticker: string }) {
  return <View style={{ gap: theme.spacing.md }}><SectionHeader title="Automations" subtitle={`Future continuous monitoring for ${companyName}`} /><Card elevated><Tag label="AI monitoring placeholder" /><Text style={{ ...theme.type.heading, color: theme.colors.text }}>Monitor {ticker} and alert me when the thesis changes.</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>Architecture placeholder only. No agent, notification, or background job is running.</Text><Button label="Create automation soon" disabled onPress={() => undefined} /></Card>{['Earnings summary', 'News monitoring', 'Price alert', 'Weekly comparison report'].map((item) => <Card key={item}><Text style={{ ...theme.type.heading, color: theme.colors.text }}>{item}</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>Ready for a future structured automation rule.</Text></Card>)}</View>;
}
