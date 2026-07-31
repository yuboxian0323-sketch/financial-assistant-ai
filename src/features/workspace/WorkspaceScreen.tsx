import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Card, Pill, ProgressIndicator, Screen, SectionHeader, StockRow, SummaryCard, Tag, WidgetContainer } from '@/components';
import { useCompanies, usePortfolio } from '@/hooks/useAppQueries';
import { theme } from '@/theme';

export function WorkspaceScreen() {
  const companies = useCompanies();
  const portfolio = usePortfolio();
  return <Screen title="My Workspace" subtitle="Your personal investment dashboard. Widgets reference the shared knowledge base.">
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}><Pill label="My Dashboard" selected /><Pill label="Edit layout" /></View>
    <SummaryCard title="AI Summary · Placeholder" summary="Your research is concentrated in AI infrastructure. Two earnings events and three open questions deserve attention. No AI model was used." emphasis />
    <WidgetContainer title="Pinned Companies" loading={companies.isLoading} error={companies.error} onRetry={() => companies.refetch()}>
      {companies.data?.slice(0, 3).map((company) => <StockRow key={company.id} ticker={company.ticker} name={company.name} price={company.price} change={company.dailyChange} onPress={() => router.push(`/company/${company.id}`)} />)}
    </WidgetContainer>
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      <Card style={{ flex: 1 }}><Tag label="Research" /><AppText variant="title">7</AppText><AppText variant="caption" tone="secondary">Companies tracked</AppText></Card>
      <Card style={{ flex: 1 }}><Tag label="Portfolio" /><AppText variant="title">{portfolio.data?.length ?? '—'}</AppText><AppText variant="caption" tone="secondary">Core positions</AppText></Card>
    </View>
    <Card><SectionHeader title="Research readiness" subtitle="Sample workspace widget" /><ProgressIndicator value={0.72} label="72% of open questions reviewed" /></Card>
    <Card><SectionHeader title="Workspace architecture" subtitle="Layout only—company data stays canonical" /><AppText tone="secondary">Future versions can pin, resize, hide, and rearrange widgets without copying company knowledge.</AppText><Button label="Customize soon" variant="secondary" disabled /></Card>
  </Screen>;
}
