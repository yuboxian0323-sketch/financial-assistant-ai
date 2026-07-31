import { AppText, Card, EmptyState, NewsCard, ProgressIndicator, Screen, SummaryCard, WidgetContainer } from '@/components';
import { useSessionBrief } from '@/hooks/useAppQueries';
import { router } from 'expo-router';

export function HomeScreen() {
  const brief = useSessionBrief();
  const data = brief.data;
  return <Screen title="Session Brief" subtitle="What happened while you were away. A calm, focused read built from sample local data.">
    <WidgetContainer title="Important News" loading={brief.isLoading} error={brief.error}>
      {data?.importantNews.map((item) => <NewsCard key={item.id} headline={item.title} summary={item.body} timestamp={item.occurredAt} important onPress={() => router.push(`/company/${item.companyId}`)} />)}
    </WidgetContainer>
    <WidgetContainer title="Industry Events" loading={brief.isLoading} empty={!brief.isLoading && !data?.industryEvents.length}>
      {data?.industryEvents.map((item) => <NewsCard key={item.id} headline={item.title} summary={item.body} timestamp={item.occurredAt} onPress={() => router.push(`/company/${item.companyId}`)} />)}
    </WidgetContainer>
    <WidgetContainer title="Needs Attention" loading={brief.isLoading}>
      {data?.needsAttention.map((item, index) => <Card key={item}><AppText>{item}</AppText><ProgressIndicator value={(index + 1) / 3} label="Sample research priority" /></Card>)}
    </WidgetContainer>
    <WidgetContainer title="Upcoming Events" loading={brief.isLoading}>
      {data?.upcomingEvents.map((item) => <NewsCard key={item.id} headline={item.title} summary={item.body} timestamp={item.occurredAt} onPress={() => router.push(`/company/${item.companyId}`)} />)}
    </WidgetContainer>
    <WidgetContainer title="AI Summary" loading={brief.isLoading}>
      {data ? <SummaryCard title="Placeholder — no AI model used" summary={data.aiSummary} /> : <EmptyState title="No summary" description="The local brief is unavailable." />}
    </WidgetContainer>
  </Screen>;
}
