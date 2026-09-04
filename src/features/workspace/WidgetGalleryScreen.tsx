import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText, Button, Card, EmptyState, LoadingSkeleton, Pill, SearchBar, SectionHeader, Tag } from '@/components';
import { useAddWorkspaceWidget, useWorkspaceLayout } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { WorkspaceWidgetCategory } from '@/types/domain';
import { widgetCatalog, widgetCategories } from './widgetRegistry';

export function WidgetGalleryScreen() {
  const { pageId = '', companyId = '' } = useLocalSearchParams<{ pageId: string; companyId: string }>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<WorkspaceWidgetCategory>('ai');
  const layout = useWorkspaceLayout();
  const addWidget = useAddWorkspaceWidget();
  const page = layout.data?.pages.find((item) => item.id === pageId);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return widgetCatalog.filter((item) => query
      ? `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase().includes(query)
      : item.category === category);
  }, [category, search]);

  function finish() {
    if (router.canGoBack()) router.back();
    else if (companyId) router.replace(`/company/${companyId}`);
    else router.replace('/workspace');
  }

  if (layout.isLoading) return <View style={styles.screen}><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></View>;
  if (layout.error || !page) return <View style={styles.screen}><EmptyState title="Workspace page unavailable" description={layout.error?.message ?? 'Return to the Workspace and choose a page.'} actionLabel="Go Back" onAction={finish} /></View>;

  return <ScrollView style={styles.background} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
    <SectionHeader title="Widget Gallery" subtitle={`Adding to ${page.name} · applies to every company`} />
    <SearchBar value={search} onChangeText={setSearch} placeholder="Search widgets" />
    {!search.trim() && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{widgetCategories.map((item) => <Pill key={item.id} label={item.label} selected={category === item.id} onPress={() => setCategory(item.id)} />)}</ScrollView>}
    <View style={styles.notice}><Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} /><AppText variant="caption" tone="secondary">Available widgets are ready now. Planned widgets show the complete future catalog without adding unfinished behavior.</AppText></View>
    <View style={styles.grid}>{filtered.map((item) => <Card key={item.id} style={styles.card} elevated={Boolean(item.definition)}>
      <View style={styles.preview}><Ionicons name={item.icon} size={30} color={item.definition ? theme.colors.accent : theme.colors.textMuted} /></View>
      <View style={styles.badges}><Tag label={widgetCategories.find((entry) => entry.id === item.category)?.label ?? item.category} />{!item.definition && <Tag label="Planned" />}</View>
      <AppText variant="heading">{item.name}</AppText>
      <AppText tone="secondary">{item.description}</AppText>
      {item.definition ? <>
        <AppText variant="caption" tone="muted">Sizes: {item.definition.supportedSizes.join(' · ')}</AppText>
        <Button label={`Add ${item.name}`} size="small" loading={addWidget.isPending && addWidget.variables?.type === item.definition.type} disabled={addWidget.isPending} onPress={() => addWidget.mutate({ pageId, type: item.definition!.type, size: item.definition!.defaultSize, settings: item.definition!.defaultSettings }, { onSuccess: finish })} />
      </> : <Button label="Coming Later" variant="ghost" size="small" disabled />}
    </Card>)}</View>
    {!filtered.length && <EmptyState title="No widgets found" description="Try another search term or browse a category." />}
    {addWidget.error && <Card><AppText variant="heading">Couldn’t add widget</AppText><AppText tone="secondary">{addWidget.error.message}</AppText></Card>}
  </ScrollView>;
}

const styles = {
  background: { flex: 1, backgroundColor: theme.colors.background } as const,
  screen: { padding: theme.spacing.xl, paddingBottom: theme.spacing.hero, gap: theme.spacing.lg } as const,
  categories: { gap: theme.spacing.sm } as const,
  notice: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft } as const,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md } as const,
  card: { minWidth: 260, flexGrow: 1, flexBasis: '46%', minHeight: 260 } as const,
  preview: { minHeight: 74, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted } as const,
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm } as const,
};
