import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Pill, ProgressIndicator, Screen, SectionHeader, StockRow, SummaryCard, Tag, WidgetContainer } from '@/components';
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
      <Card style={{ flex: 1 }}><Tag label="Research" /><Text style={{ ...theme.type.title, color: theme.colors.text }}>7</Text><Text style={{ ...theme.type.caption, color: theme.colors.textSecondary }}>Companies tracked</Text></Card>
      <Card style={{ flex: 1 }}><Tag label="Portfolio" /><Text style={{ ...theme.type.title, color: theme.colors.text }}>{portfolio.data?.length ?? '—'}</Text><Text style={{ ...theme.type.caption, color: theme.colors.textSecondary }}>Core positions</Text></Card>
    </View>
    <Card><SectionHeader title="Research readiness" subtitle="Sample workspace widget" /><ProgressIndicator value={0.72} label="72% of open questions reviewed" /></Card>
    <Card><SectionHeader title="Workspace architecture" subtitle="Layout only—company data stays canonical" /><Text style={{ ...theme.type.body, color: theme.colors.textSecondary }}>Future versions can pin, resize, hide, and rearrange widgets without copying company knowledge.</Text><Button label="Customize soon" variant="secondary" disabled onPress={() => undefined} /></Card>
  </Screen>;
}
