import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Card, EmptyState, LoadingSkeleton, Screen, StockRow, Tag, WidgetContainer } from '@/components';
import { useCompanies, useWorkspaceLayout } from '@/hooks/useAppQueries';
import { theme } from '@/theme';

export function WorkspaceScreen() {
  const companies = useCompanies();
  const layout = useWorkspaceLayout();
  const firstCompany = companies.data?.[0];
  return <Screen title="My Workspace" subtitle="Choose a company to open the global, customizable research layout.">
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}><Tag label="Global layout" /><Tag label="Autosaved" /><Tag label={`${layout.data?.pages.length ?? '—'} pages`} /></View>
    <Card elevated><Tag label="Workspace V1" /><AppText variant="title">One layout, every company</AppText><AppText tone="secondary">Edit pages and widgets once. Each widget automatically uses the company you are currently viewing.</AppText>{firstCompany && <Button label={`Open ${firstCompany.ticker} Workspace`} icon="grid-outline" onPress={() => router.push(`/company/${firstCompany.id}`)} />}</Card>
    {layout.isLoading && <LoadingSkeleton preset="card" />}
    {layout.error && <EmptyState title="Workspace unavailable" description={layout.error.message} actionLabel="Try again" onAction={() => { void layout.refetch(); }} />}
    <WidgetContainer title="Company Workspaces" loading={companies.isLoading} empty={companies.data?.length === 0} error={companies.error} onRetry={() => companies.refetch()}>
      {companies.data?.map((company) => <StockRow key={company.id} ticker={company.ticker} name={company.name} price={company.price} change={company.dailyChange} quoteSource={company.priceSource} onPress={() => router.push(`/company/${company.id}`)} />)}
    </WidgetContainer>
    <Card><AppText variant="heading">How it works</AppText><AppText tone="secondary">Open any company, choose Workspace, then select Edit Layout. Reorder pages, drag or resize widgets, and add more from the gallery. Company research stays canonical and is never copied into the layout.</AppText></Card>
  </Screen>;
}
