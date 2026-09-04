import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AppModal, AppText, Button, Card, ConfirmModal, EmptyState, LoadingSkeleton, Pill, SectionHeader, Tag } from '@/components';
import { useUIStore } from '@/features/ui/store';
import {
  useAddWorkspacePage, useCompanies, useCompanyContent, useCompanyNews, useDeleteWorkspacePage,
  useDuplicateWorkspacePage, useLatestResearchTaskOutputs, useMoveWorkspacePage, useMoveWorkspaceWidget,
  useRemoveWorkspaceWidget, useRenameWorkspacePage, useResearchTasks, useResizeWorkspaceWidget,
  useStockHistory, useStockQuotes, useUpdateWorkspaceWidgetSettings, useWorkspaceLayout,
} from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { Company, StockHistoryRange, WorkspacePage, WorkspaceWidget, WorkspaceWidgetSettings, WorkspaceWidgetSize } from '@/types/domain';
import { getWidgetDefinition, getWorkspaceWidgetDimensions } from './widgetRegistry';
import { WorkspaceWidgetContent, type WorkspaceWidgetData } from './WorkspaceWidgetContent';

type PageDialog = 'add' | 'rename' | null;

export function WorkspaceDashboard({ company }: { company: Company }) {
  const layout = useWorkspaceLayout();
  const content = useCompanyContent(company.id);
  const news = useCompanyNews(company.ticker);
  const companies = useCompanies();
  const tasks = useResearchTasks();
  const outputs = useLatestResearchTaskOutputs();
  const quote = useStockQuotes([company.ticker]);
  const [chartRange, setChartRange] = useState<StockHistoryRange>('1M');
  const hasPriceChart = Boolean(layout.data?.pages.some((item) => item.widgets.some((widget) => widget.type === 'price-chart')));
  const history = useStockHistory(company.ticker, chartRange, hasPriceChart);
  const refetchHistory = history.refetch;
  const selectedId = useUIStore((state) => state.workspacePageId);
  const selectPage = useUIStore((state) => state.setWorkspacePageId);
  const [editing, setEditing] = useState(false);
  const [pageDialog, setPageDialog] = useState<PageDialog>(null);
  const [pageName, setPageName] = useState('');
  const [deletePage, setDeletePage] = useState(false);
  const [deleteWidget, setDeleteWidget] = useState<WorkspaceWidget | null>(null);
  const [configureWidget, setConfigureWidget] = useState<WorkspaceWidget | null>(null);
  const [resizeTarget, setResizeTarget] = useState<WorkspaceWidget | null>(null);
  const addPage = useAddWorkspacePage();
  const renamePage = useRenameWorkspacePage();
  const duplicatePage = useDuplicateWorkspacePage();
  const removePage = useDeleteWorkspacePage();
  const movePage = useMoveWorkspacePage();
  const removeWidget = useRemoveWorkspaceWidget();
  const moveWidget = useMoveWorkspaceWidget();
  const resizeWidget = useResizeWorkspaceWidget();
  const updateSettings = useUpdateWorkspaceWidgetSettings();
  const pages = layout.data?.pages ?? [];
  const page = pages.find((item) => item.id === selectedId) ?? pages[0];

  useEffect(() => {
    if (page && page.id !== selectedId) selectPage(page.id);
  }, [page, selectPage, selectedId]);

  const widgetData: WorkspaceWidgetData = useMemo(() => ({
    company,
    companies: companies.data ?? [company],
    content: content.data ?? [],
    news: news.data ?? [],
    tasks: tasks.data ?? [],
    outputs: outputs.data ?? [],
    quote: quote.data?.quotes.find((item) => item.symbol === company.ticker),
    history: history.data,
    historyRange: chartRange,
    historyLoading: history.isLoading,
    historyError: history.error,
    setHistoryRange: setChartRange,
    retryHistory: () => { void refetchHistory(); },
  }), [chartRange, companies.data, company, content.data, history.data, history.error, history.isLoading, news.data, outputs.data, quote.data, refetchHistory, tasks.data]);
  const dataLoading = content.isLoading || companies.isLoading || tasks.isLoading || outputs.isLoading || quote.isLoading;

  if (layout.isLoading) return <View style={styles.stack}><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></View>;
  if (layout.error || !page) return <EmptyState title="Workspace unavailable" description={layout.error?.message ?? 'No workspace page is available.'} actionLabel="Try again" onAction={() => { void layout.refetch(); }} />;

  const activePage: WorkspacePage = page;
  // Expo Router refreshes generated route types when Metro starts; this cast keeps clean installs type-safe before that generation step.
  const galleryRoute = { pathname: '/widget-gallery', params: { pageId: activePage.id, companyId: company.id } } as unknown as Href;
  const pageIndex = pages.findIndex((item) => item.id === activePage.id);
  const busy = addPage.isPending || renamePage.isPending || duplicatePage.isPending || removePage.isPending || movePage.isPending
    || removeWidget.isPending || moveWidget.isPending || resizeWidget.isPending || updateSettings.isPending;
  const error = addPage.error ?? renamePage.error ?? duplicatePage.error ?? removePage.error ?? movePage.error
    ?? removeWidget.error ?? moveWidget.error ?? resizeWidget.error ?? updateSettings.error;

  function openPageDialog(kind: Exclude<PageDialog, null>) {
    setPageName(kind === 'rename' ? activePage.name : `Page ${pages.length + 1}`);
    setPageDialog(kind);
  }
  function submitPageDialog() {
    if (pageDialog === 'add') addPage.mutate(pageName, { onSuccess: (next) => { selectPage(next.pages[next.pages.length - 1]?.id ?? activePage.id); setPageDialog(null); } });
    if (pageDialog === 'rename') renamePage.mutate({ pageId: activePage.id, name: pageName }, { onSuccess: () => setPageDialog(null) });
  }
  function confirmDeletePage() {
    removePage.mutate(activePage.id, { onSuccess: (next) => { selectPage(next.pages[Math.min(pageIndex, next.pages.length - 1)]?.id ?? next.pages[0]?.id ?? ''); setDeletePage(false); } });
  }
  function saveWidgetSettings(settings: WorkspaceWidgetSettings) {
    if (!configureWidget) return;
    updateSettings.mutate({ pageId: activePage.id, widgetId: configureWidget.id, settings }, { onSuccess: () => setConfigureWidget(null) });
  }

  return <View style={styles.stack}>
    <SectionHeader title="Workspace" subtitle="One layout shared by every company" action={<Button label={editing ? 'Done' : 'Edit Layout'} variant={editing ? 'primary' : 'secondary'} size="small" onPress={() => setEditing((value) => !value)} />} />
    {editing && <Card style={styles.editBanner}><View style={styles.inline}><Ionicons name="move-outline" size={22} color={theme.colors.accent} /><View style={styles.flex}><AppText variant="heading">Editing entire Workspace</AppText><AppText variant="caption" tone="secondary">Changes save automatically and apply to every company.</AppText></View></View></Card>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageTabs}>
      {pages.map((item) => <Pill key={item.id} label={item.name} selected={item.id === activePage.id} onPress={() => selectPage(item.id)} />)}
      {editing && <Pill label="+ Add Page" onPress={() => openPageDialog('add')} />}
    </ScrollView>
    {editing && <View style={styles.pageToolbar}>
      <IconButton label="Move page left" icon="arrow-back" disabled={pageIndex === 0 || busy} onPress={() => movePage.mutate({ pageId: activePage.id, direction: -1 })} />
      <IconButton label="Move page right" icon="arrow-forward" disabled={pageIndex === pages.length - 1 || busy} onPress={() => movePage.mutate({ pageId: activePage.id, direction: 1 })} />
      <IconButton label="Rename page" icon="pencil" disabled={busy} onPress={() => openPageDialog('rename')} />
      <IconButton label="Duplicate page" icon="copy-outline" disabled={busy} onPress={() => duplicatePage.mutate(activePage.id, { onSuccess: (next) => selectPage(next.pages[next.pages.length - 1]?.id ?? activePage.id) })} />
      <IconButton label="Delete page" icon="trash-outline" disabled={pages.length === 1 || busy} destructive onPress={() => setDeletePage(true)} />
      <View style={styles.flex} />
      <Button label="Add Widget" icon="add" size="small" disabled={busy} onPress={() => router.push(galleryRoute)} />
    </View>}
    {error && <Card><AppText variant="heading">Couldn’t save that change</AppText><AppText tone="secondary">{error.message}</AppText></Card>}
    {activePage.widgets.length === 0 ? <EmptyState title="This page is empty" description={editing ? 'Add a widget from the gallery to start building this page.' : 'Choose Edit Layout to add your first widget.'} actionLabel={editing ? 'Add Widget' : undefined} onAction={editing ? () => router.push(galleryRoute) : undefined} /> :
      <WorkspaceGrid page={activePage} data={widgetData} editing={editing} loading={dataLoading} busy={busy}
        onMove={(widgetId, toIndex) => moveWidget.mutate({ pageId: activePage.id, widgetId, toIndex })}
        onResize={setResizeTarget} onDelete={setDeleteWidget} onConfigure={setConfigureWidget}
        onOpenCompany={(companyId) => router.push(`/company/${companyId}`)}
        onOpenNews={(newsId) => router.push({ pathname: '/news/[id]', params: { id: newsId, companyId: company.id, symbol: company.ticker } } as unknown as Href)} />}

    <AppModal visible={Boolean(pageDialog)} title={pageDialog === 'add' ? 'Add Workspace Page' : 'Rename Page'} onClose={() => setPageDialog(null)}>
      <TextInput autoFocus accessibilityLabel="Workspace page name" value={pageName} onChangeText={setPageName} maxLength={32} placeholder="Page name" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
      <View style={styles.modalActions}><Button label="Cancel" variant="ghost" onPress={() => setPageDialog(null)} /><Button label={pageDialog === 'add' ? 'Add Page' : 'Rename'} loading={addPage.isPending || renamePage.isPending} onPress={submitPageDialog} /></View>
    </AppModal>
    <ConfirmModal visible={deletePage} title="Delete this page?" description={`“${activePage.name}” and all widgets on it will be removed. Other pages are unaffected.`} confirmLabel="Delete Page" loading={removePage.isPending} onClose={() => setDeletePage(false)} onConfirm={confirmDeletePage} />
    <ConfirmModal visible={Boolean(deleteWidget)} title="Remove this widget?" description="This removes the widget from the layout. It does not delete any company data." confirmLabel="Remove Widget" loading={removeWidget.isPending} onClose={() => setDeleteWidget(null)} onConfirm={() => deleteWidget && removeWidget.mutate({ pageId: activePage.id, widgetId: deleteWidget.id }, { onSuccess: () => setDeleteWidget(null) })} />
    <WidgetSettingsModal widget={configureWidget} saving={updateSettings.isPending} onClose={() => setConfigureWidget(null)} onSave={saveWidgetSettings} />
    <WidgetSizeModal widget={resizeTarget} saving={resizeWidget.isPending} onClose={() => setResizeTarget(null)} onSelect={(size) => {
      if (!resizeTarget) return;
      resizeWidget.mutate({ pageId: activePage.id, widgetId: resizeTarget.id, size }, { onSuccess: () => setResizeTarget(null) });
    }} />
  </View>;
}

function WorkspaceGrid({ page, data, editing, loading, busy, onMove, onResize, onDelete, onConfigure, onOpenNews, onOpenCompany }: {
  page: WorkspacePage; data: WorkspaceWidgetData; editing: boolean; loading: boolean; busy: boolean;
  onMove: (id: string, index: number) => void; onResize: (widget: WorkspaceWidget) => void;
  onDelete: (widget: WorkspaceWidget) => void; onConfigure: (widget: WorkspaceWidget) => void; onOpenNews: (newsId: string) => void;
  onOpenCompany: (companyId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const { widths, heights } = getWorkspaceWidgetDimensions(width);
  return <View style={styles.grid}>{page.widgets.map((widget, index) => <EditableWidget key={widget.id} widget={widget} index={index} count={page.widgets.length} width={widths[widget.size]} minHeight={heights[widget.size]} editing={editing} loading={loading} busy={busy} data={data} onMove={onMove} onResize={onResize} onDelete={onDelete} onConfigure={onConfigure} onOpenNews={onOpenNews} onOpenCompany={onOpenCompany} />)}</View>;
}

function EditableWidget({ widget, index, count, width, minHeight, editing, loading, busy, data, onMove, onResize, onDelete, onConfigure, onOpenNews, onOpenCompany }: {
  widget: WorkspaceWidget; index: number; count: number; width: number | '100%'; minHeight: number; editing: boolean; loading: boolean; busy: boolean;
  data: WorkspaceWidgetData; onMove: (id: string, index: number) => void; onResize: (widget: WorkspaceWidget) => void;
  onDelete: (widget: WorkspaceWidget) => void; onConfigure: (widget: WorkspaceWidget) => void; onOpenNews: (newsId: string) => void;
  onOpenCompany: (companyId: string) => void;
}) {
  const definition = getWidgetDefinition(widget.type);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }, { translateY: translateY.value }], zIndex: translateX.value === 0 && translateY.value === 0 ? 0 : 5 }));
  const gesture = Gesture.Pan().enabled(editing && !busy).onUpdate((event) => { translateX.value = event.translationX; translateY.value = event.translationY; }).onEnd((event) => {
    let target = Math.abs(event.translationX) > Math.abs(event.translationY) && Math.abs(event.translationX) > 32
      ? index + (event.translationX > 0 ? 1 : -1)
      : index + Math.round(event.translationY / 120);
    if (target === index && Math.abs(event.translationY) > 32) target += event.translationY > 0 ? 1 : -1;
    target = Math.max(0, Math.min(count - 1, target));
    translateX.value = withTiming(0, { duration: reduceMotion ? 0 : theme.motion.fast });
    translateY.value = withTiming(0, { duration: reduceMotion ? 0 : theme.motion.fast });
    if (target !== index) runOnJS(onMove)(widget.id, target);
  });
  return <Animated.View layout={LinearTransition.duration(reduceMotion ? 0 : theme.motion.normal)} style={[{ width }, animatedStyle]}>
    <Card elevated={widget.size === 'large'} style={editing ? { ...styles.widgetCard, minHeight, ...styles.editingCard } : { ...styles.widgetCard, minHeight }}>
      <View style={styles.widgetHeader}>
        <View style={styles.widgetTitle}><Ionicons name={definition.icon} size={19} color={theme.colors.accent} /><AppText variant="heading">{definition.name}</AppText></View>
        {editing && <View style={styles.widgetControls}>
          {definition.configurable && <IconButton label={`Configure ${definition.name}`} icon="options-outline" disabled={busy} onPress={() => onConfigure(widget)} />}
          <IconButton label={`Resize ${definition.name}, currently ${widget.size}`} icon="resize-outline" disabled={busy} onPress={() => onResize(widget)} />
          <IconButton label={`Move ${definition.name} up`} icon="arrow-up" disabled={index === 0 || busy} onPress={() => onMove(widget.id, index - 1)} />
          <IconButton label={`Move ${definition.name} down`} icon="arrow-down" disabled={index === count - 1 || busy} onPress={() => onMove(widget.id, index + 1)} />
          <IconButton label={`Remove ${definition.name}`} icon="close" disabled={busy} destructive onPress={() => onDelete(widget)} />
          <GestureDetector gesture={gesture}><Animated.View accessible accessibilityRole="adjustable" accessibilityLabel={`Drag ${definition.name}`} accessibilityState={{ disabled: busy }} accessibilityActions={[{ name: 'decrement', label: 'Move up' }, { name: 'increment', label: 'Move down' }]} onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'decrement' && index > 0) onMove(widget.id, index - 1);
            if (event.nativeEvent.actionName === 'increment' && index < count - 1) onMove(widget.id, index + 1);
          }} style={[styles.iconButton, busy && styles.disabled]}><Ionicons name="reorder-three" size={20} color={theme.colors.text} /></Animated.View></GestureDetector>
        </View>}
      </View>
      {editing && <Tag label={`${widget.size} widget`} />}
      {loading ? <LoadingSkeleton preset="card" /> : <WorkspaceWidgetContent widget={widget} data={data} interactionsDisabled={editing} onOpenNews={onOpenNews} onOpenCompany={onOpenCompany} />}
    </Card>
  </Animated.View>;
}

function WidgetSettingsModal({ widget, saving, onClose, onSave }: { widget: WorkspaceWidget | null; saving: boolean; onClose: () => void; onSave: (settings: WorkspaceWidgetSettings) => void }) {
  if (!widget) return null;
  const definition = getWidgetDefinition(widget.type);
  let options: { label: string; settings: WorkspaceWidgetSettings }[] = [];
  if (widget.type === 'ai-summary') options = ['short', 'standard', 'detailed'].map((value) => ({ label: value, settings: { summaryLength: value } }));
  if (widget.type === 'latest-news') options = [5, 10, 20].map((value) => ({ label: `${value} articles`, settings: { articleCount: value } }));
  if (widget.type === 'revenue') options = ['annual', 'quarterly', 'ttm'].map((value) => ({ label: value, settings: { period: value } }));
  return <AppModal visible title={`Configure ${definition.name}`} onClose={onClose}><AppText tone="secondary">Choose how this widget appears. The choice applies globally while its data follows the open company.</AppText><View style={styles.optionGrid}>{options.map((option) => <Button key={option.label} label={option.label} variant="secondary" size="small" disabled={saving} onPress={() => onSave(option.settings)} />)}</View></AppModal>;
}

function WidgetSizeModal({ widget, saving, onClose, onSelect }: { widget: WorkspaceWidget | null; saving: boolean; onClose: () => void; onSelect: (size: WorkspaceWidgetSize) => void }) {
  if (!widget) return null;
  const definition = getWidgetDefinition(widget.type);
  const sizeDescriptions: Record<WorkspaceWidgetSize, string> = {
    small: 'Half-width · quick essentials', medium: 'Full-width · one standard block', large: 'Full-width · two-block deep detail',
  };
  return <AppModal visible title={`Resize ${definition.name}`} onClose={onClose}>
    <AppText tone="secondary">Size controls both the widget footprint and its information depth. Changes save automatically.</AppText>
    <View style={styles.sizeOptions}>{(['small', 'medium', 'large'] as const).map((size) => {
      const supported = definition.supportedSizes.includes(size);
      return <Pressable key={size} accessibilityRole="button" accessibilityLabel={`${size} widget size`} accessibilityState={{ selected: widget.size === size, disabled: !supported || saving }} disabled={!supported || saving} onPress={() => onSelect(size)} style={({ pressed }) => [styles.sizeOption, widget.size === size && styles.sizeOptionSelected, !supported && styles.disabled, pressed && styles.pressed]}>
        <View style={[styles.sizePreview, size === 'small' ? styles.sizePreviewSmall : size === 'medium' ? styles.sizePreviewMedium : styles.sizePreviewLarge]} />
        <AppText variant="heading">{size[0]?.toUpperCase()}{size.slice(1)}</AppText>
        <AppText variant="caption" tone="muted" style={styles.center}>{sizeDescriptions[size]}</AppText>
        {!supported && <AppText variant="caption" tone="muted">Unavailable</AppText>}
      </Pressable>;
    })}</View>
  </AppModal>;
}

function IconButton({ label, icon, onPress, disabled, destructive }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void; disabled?: boolean; destructive?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled || !onPress} onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.iconButton, destructive && styles.destructiveButton, (disabled || !onPress) && styles.disabled, pressed && styles.pressed]}><Ionicons name={icon} size={20} color={destructive ? theme.colors.negative : theme.colors.text} /></Pressable>;
}

const styles = {
  stack: { gap: theme.spacing.lg } as const,
  flex: { flex: 1 } as const,
  inline: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md } as const,
  editBanner: { backgroundColor: theme.colors.accentSoft } as const,
  pageTabs: { gap: theme.spacing.sm } as const,
  pageToolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.xs } as const,
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: theme.spacing.md } as const,
  widgetCard: { minHeight: 150 } as const,
  editingCard: { borderColor: theme.colors.accent, borderWidth: 1 } as const,
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const,
  widgetTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const,
  widgetControls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' } as const,
  iconButton: { width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceElevated } as const,
  destructiveButton: { backgroundColor: theme.colors.surfaceMuted } as const,
  disabled: { opacity: theme.opacity.disabled } as const,
  pressed: { opacity: theme.opacity.pressed } as const,
  input: { minHeight: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: theme.spacing.md, ...theme.type.body } as const,
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm } as const,
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm } as const,
  sizeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'stretch' } as const,
  sizeOption: { flex: 1, minWidth: 84, minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface } as const,
  sizeOptionSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft } as const,
  sizePreview: { borderRadius: theme.radius.sm, backgroundColor: theme.colors.accent } as const,
  sizePreviewSmall: { width: 30, height: 30 } as const,
  sizePreviewMedium: { width: 52, height: 30 } as const,
  sizePreviewLarge: { width: 52, height: 52 } as const,
  center: { textAlign: 'center' } as const,
};
