import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Card, EmptyState, LoadingSkeleton, NewsCard, Pill, Screen, SectionHeader, SummaryCard, Tag } from '@/components';
import { useCompany, useCompanyContent } from '@/hooks/useAppQueries';
import { useUIStore } from '@/features/ui/store';
import type { CompanyContent, KnowledgeSection } from '@/types/domain';
import { theme } from '@/theme';

const sections: KnowledgeSection[] = ['Overview', 'AI Summary', 'Notes', 'Research', 'Reports', 'News', 'Events', 'Timeline', 'Conversations', 'Bull Thesis', 'Bear Thesis', 'Financials'];
const kindMap: Partial<Record<KnowledgeSection, CompanyContent['kind']>> = { Notes: 'note', Research: 'research', Reports: 'report', News: 'news', Events: 'event', Timeline: 'timeline', Conversations: 'conversation' };

export function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const selected = (useUIStore((state) => state.expandedCard) as KnowledgeSection | null) ?? 'Overview';
  const select = useUIStore((state) => state.setExpandedCard);
  const company = useCompany(id);
  const content = useCompanyContent(id, kindMap[selected]);
  if (company.isLoading) return <Screen title="Knowledge Base"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  if (company.error || !company.data) return <Screen title="Knowledge Base"><EmptyState title="Company unavailable" description={company.error?.message ?? 'This company could not be found.'} actionLabel="Try again" onAction={() => company.refetch()} /></Screen>;
  const data = company.data;
  return <Screen title={data.name} subtitle={`${data.ticker} · ${data.industry} · Sample data`}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>{sections.map((section) => <Pill key={section} label={section} selected={selected === section} onPress={() => select(section)} />)}</ScrollView>
    <SectionHeader title={selected} subtitle="Everything belongs to this company." />
    {selected === 'Overview' && <SummaryCard title="Company overview" summary={data.overview} />}
    {selected === 'AI Summary' && <SummaryCard title="Placeholder — no AI model used" summary={data.aiSummary} emphasis />}
    {selected === 'Bull Thesis' && <Card><Tag label="Bull case" tone="positive" /><Text style={{ ...theme.type.body, color: theme.colors.text }}>{data.bullThesis}</Text></Card>}
    {selected === 'Bear Thesis' && <Card><Tag label="Bear case" tone="warning" /><Text style={{ ...theme.type.body, color: theme.colors.text }}>{data.bearThesis}</Text></Card>}
    {selected === 'Financials' && <View style={{ gap: theme.spacing.md }}>{data.financials.map((metric) => <SummaryCard key={metric.label} title={metric.label} metric={metric.value} summary="Representative placeholder metric." />)}</View>}
    {kindMap[selected] && content.isLoading && <LoadingSkeleton preset="card" />}
    {kindMap[selected] && content.error && <EmptyState title="Section unavailable" description={content.error.message} actionLabel="Try again" onAction={() => content.refetch()} />}
    {kindMap[selected] && !content.isLoading && !content.data?.length && <EmptyState title="Nothing here yet" description="This company section is ready for future research." />}
    {kindMap[selected] && content.data?.map((item) => item.kind === 'news' ? <NewsCard key={item.id} headline={item.title} summary={item.body} timestamp={item.occurredAt} company={data.ticker} important={item.importance >= 3} /> : <Card key={item.id}><Text style={{ ...theme.type.heading, color: theme.colors.text }}>{item.title}</Text><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>{item.body}</Text><Text style={{ ...theme.type.caption, color: theme.colors.textMuted }}>{new Date(item.occurredAt).toLocaleDateString()}</Text></Card>)}
  </Screen>;
}
