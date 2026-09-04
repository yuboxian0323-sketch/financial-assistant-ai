import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import {
  AppText,
  ActionLink,
  BulletList,
  CalendarEvents,
  Card,
  ChartModeToggle,
  CompanyLogo,
  EmptyState,
  InteractivePriceChart,
  LoadingSkeleton,
  Screen,
  SectionHeader,
  Tag,
  type PriceChartMode,
} from '@/components';
import { useUIStore } from '@/features/ui/store';
import { useCompanyNews, useLatestResearchTaskOutputs, useResearchTasks, useSessionBrief, useStockHistory } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type {
  HomeNewsCompany,
  HomeNewsItem,
  MarketIndex,
  NewsArticle,
  ResearchTask,
  ResearchTaskOutput,
  StockHistoryRange,
  WatchItem,
} from '@/types/domain';
import { capitalize, titleCase } from '@/utils/format';
import { buildMarketFallback } from '@/utils/priceHistory';

const watchIcons: Record<WatchItem['category'], keyof typeof Ionicons.glyphMap> = {
  valuation: 'trending-up',
  earnings: 'calendar',
  industry: 'hardware-chip',
  volatility: 'pulse',
  macro: 'globe-outline',
};

type MarketRange = '1D' | '5D' | '1Y' | '2Y';
const marketRanges: { value: MarketRange; accessibilityLabel: string }[] = [
  { value: '1D', accessibilityLabel: '1 day' },
  { value: '5D', accessibilityLabel: '5 days' },
  { value: '1Y', accessibilityLabel: '1 year' },
  { value: '2Y', accessibilityLabel: '2 years' },
];

export function HomeScreen() {
  const brief = useSessionBrief();
  const tasksQuery = useResearchTasks();
  const outputsQuery = useLatestResearchTaskOutputs();
  const { width } = useWindowDimensions();
  const storedCompanyId = useUIStore((state) => state.homeNewsCompanyId);
  const selectCompany = useUIStore((state) => state.setHomeNewsCompanyId);
  const data = brief.data;
  const selectedCompanyId = data?.newsCompanies.some((company) => company.id === storedCompanyId)
    ? storedCompanyId!
    : data?.newsCompanies[0]?.id ?? '';
  const selectedNews = useMemo(
    () => data?.newsByCompany[selectedCompanyId] ?? [],
    [data?.newsByCompany, selectedCompanyId],
  );

  if (brief.isLoading) {
    return (
      <Screen title={getGreeting()} subtitle="Here’s what matters today.">
        <LoadingSkeleton preset="card" />
        <LoadingSkeleton preset="card" />
        <LoadingSkeleton preset="card" />
      </Screen>
    );
  }

  if (brief.error || !data) {
    return (
      <Screen title={getGreeting()} subtitle="Here’s what matters today.">
        <EmptyState
          title="Today’s brief is unavailable"
          description={brief.error?.message ?? 'The local sample brief could not be prepared.'}
          actionLabel="Try again"
          onAction={() => void brief.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={getGreeting()}
      subtitle={`Here’s what matters today. Company prices are ${data.companyPriceSource === 'live' ? 'live via Finnhub' : 'saved sample fallbacks'}; research content remains sample.`}
      refreshing={brief.isRefetching}
      onRefresh={() => void brief.refetch()}
    >
      <MarketCarousel items={data.marketIndices} width={Math.max(240, width - theme.spacing.xl * 2)} />
      <LatestReports
        tasks={tasksQuery.data ?? []}
        outputs={outputsQuery.data ?? []}
        loading={tasksQuery.isLoading || outputsQuery.isLoading}
        error={tasksQuery.error ?? outputsQuery.error}
        onRetry={() => { void tasksQuery.refetch(); void outputsQuery.refetch(); }}
      />
      <BriefCard
        title="AI Market Brief"
        icon="sparkles"
        bullets={data.marketBriefBullets}
        actionLabel="Read full analysis"
        onAction={() => router.navigate('/workspace')}
      />
      <BriefCard
        title="Your Portfolio Brief"
        icon="pie-chart"
        bullets={data.portfolioBriefBullets}
        badge={`${data.portfolioDayChange >= 0 ? '+' : ''}${data.portfolioDayChange.toFixed(2)}% today`}
        actionLabel="View portfolio"
        onAction={() => router.navigate('/portfolio')}
      />
      <NewsOverview
        companies={data.newsCompanies}
        selectedCompanyId={selectedCompanyId}
        items={selectedNews}
        onSelect={selectCompany}
      />
      <ThingsToWatch items={data.watchItems} />
      <CalendarEvents items={data.calendarEvents} subtitle="Sample calendar" onViewAll={() => router.navigate('/automations')} />
    </Screen>
  );
}

function LatestReports({ tasks, outputs, loading, error, onRetry }: {
  tasks: ResearchTask[];
  outputs: ResearchTaskOutput[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const reports = outputs.filter((output) => {
    const task = taskById.get(output.taskId);
    return task?.type === 'report' && task.delivery.showOnHome;
  }).slice(0, 3);
  return <View style={styles.section}>
    <SectionHeader title="Latest Reports" subtitle="The current output from your saved Research Tasks" action={<ActionLink label="View all" onPress={() => router.navigate('/automations')} prominent />} />
    {loading ? <LoadingSkeleton preset="card" /> : error ? <EmptyState title="Reports are unavailable" description={error.message} actionLabel="Try again" onAction={onRetry} /> : reports.length === 0 ? <EmptyState title="No reports yet" description="Run a report task to place its latest output here." actionLabel="Open Research Tasks" onAction={() => router.navigate('/automations')} /> : reports.map((output) => {
      const task = taskById.get(output.taskId);
      return <Card key={output.taskId} onPress={() => router.push({ pathname: '/research-task/[id]', params: { id: output.taskId } })}>
        <View style={styles.rowBetween}>
          <Tag label={task?.reportStyle ? `${titleCase(task.reportStyle)} report` : 'Report'} />
          <AppText variant="caption" tone="muted">{formatNewsTime(output.generatedAt)}</AppText>
        </View>
        <AppText variant="heading">{output.title}</AppText>
        <AppText tone="secondary">{output.summary}</AppText>
      </Card>;
    })}
  </View>;
}

function MarketCarousel({ items, width }: { items: MarketIndex[]; width: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [range, setRange] = useState<MarketRange>('1D');
  const [mode, setMode] = useState<PriceChartMode>('line');
  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.section}>
      <SectionHeader title="Market Overview" subtitle="Live ETF proxies · swipe for more markets" />
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        style={{ width }}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => <MarketCard item={item} width={width} range={range} mode={mode} />}
      />
      <View accessibilityLabel={`Market ${activeIndex + 1} of ${items.length}`} style={styles.dots}>
        {items.map((item, index) => (
          <View key={item.id} style={[styles.dot, activeIndex === index && styles.dotActive]} />
        ))}
      </View>
      <View accessibilityRole="tablist" style={styles.rangeSelector}>
        {marketRanges.map((option) => {
          const selected = option.value === range;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityLabel={option.accessibilityLabel}
              accessibilityState={{ selected }}
              onPress={() => setRange(option.value)}
              style={({ pressed }) => [
                styles.rangeButton,
                selected && styles.rangeButtonSelected,
                pressed && styles.pressed,
              ]}
            >
              <AppText variant="caption" style={selected ? styles.rangeLabelSelected : undefined}>
                {option.value}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <ChartModeToggle value={mode} onChange={setMode} />
    </View>
  );
}

function MarketCard({ item, width, range, mode }: { item: MarketIndex; width: number; range: MarketRange; mode: PriceChartMode }) {
  const historyRange: StockHistoryRange = range;
  const history = useStockHistory(item.symbol, historyRange);
  const fallbackPoints = useMemo(() => buildMarketFallback(item, range), [item, range]);
  const chartPoints = history.data?.points ?? fallbackPoints;
  const first = history.data?.points[0]?.close;
  const last = history.data?.points[history.data.points.length - 1]?.close;
  const changePercent = first && last ? ((last - first) / first) * 100 : item.changePercent;
  const changeAmount = first && last ? last - first : item.changeAmount;
  const positive = changePercent >= 0;
  const changeColor = positive ? theme.colors.positive : theme.colors.negative;

  return (
    <View style={[styles.marketCard, { width }]}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <AppText variant="title">{item.name}</AppText>
          <AppText variant="caption" tone="muted">{item.proxyLabel}</AppText>
        </View>
        <Tag label={item.priceSource === 'live' ? `Live · ${item.symbol}` : `Fallback · ${item.symbol}`} tone={item.priceSource === 'live' ? 'positive' : 'warning'} />
      </View>
      <AppText style={styles.marketPrice}>{formatMarketValue(item.price)}</AppText>
      <AppText variant="heading" style={{ color: changeColor }}>
        {positive ? '+' : ''}{changePercent.toFixed(2)}% · {positive ? '+' : ''}{formatMarketValue(changeAmount)}
      </AppText>
      {history.isLoading ? <LoadingSkeleton preset="card" /> : (
        <InteractivePriceChart
          points={chartPoints}
          positive={positive}
          range={historyRange}
          currency={history.data?.currency ?? 'USD'}
          mode={mode}
          height={186}
          testID={`market-chart-${item.symbol}`}
        />
      )}
      {history.error ? (
        <Pressable accessibilityRole="button" onPress={() => void history.refetch()} style={({ pressed }) => [styles.chartRetry, pressed && styles.pressed]}>
          <AppText variant="caption" tone="secondary">Saved curve shown. Tap to retry live history.</AppText>
        </Pressable>
      ) : <AppText variant="caption" tone="muted">Drag across the graph to inspect live historical prices.</AppText>}
      <View style={styles.marketMetrics}>
        <Metric label="Prev close" value={formatMarketValue(item.prevClose)} />
        <Metric label="Day range" value={`${formatCompact(item.dayLow)}–${formatCompact(item.dayHigh)}`} />
        <Metric label="Updated" value={formatQuoteTime(item.priceAsOf)} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}

function BriefCard({ title, icon, bullets, badge, actionLabel, onAction }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  bullets: string[];
  badge?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card elevated>
      <View style={styles.rowBetween}>
        <View style={styles.titleWithIcon}>
          <Ionicons name={icon} size={20} color={theme.colors.accent} />
          <AppText variant="heading">{title}</AppText>
        </View>
        {badge ? <Tag label={badge} tone="positive" /> : null}
      </View>
      <BulletList items={bullets} />
      <ActionLink label={actionLabel} onPress={onAction} prominent />
    </Card>
  );
}

function NewsOverview({ companies, selectedCompanyId, items, onSelect }: {
  companies: HomeNewsCompany[];
  selectedCompanyId: string;
  items: HomeNewsItem[];
  onSelect: (companyId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const liveNews = useCompanyNews(selectedCompany?.ticker ?? '');
  const liveItems = liveNews.data?.slice(0, 3) ?? [];
  const usingLive = liveItems.length > 0;

  return (
    <Card elevated>
      <SectionHeader
        title="Company News Overview"
      subtitle={usingLive ? 'Preferred publishers · full summaries open inside the app' : liveNews.error ? 'Saved sample fallback · preferred live news unavailable' : 'Loading preferred live news'}
        action={<ActionLink label="View all" onPress={() => router.navigate('/research')} prominent />}
      />
      <FlatList
        data={companies}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(company) => company.id}
        contentContainerStyle={styles.logoList}
        renderItem={({ item }) => {
          const selected = item.id === selectedCompanyId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name} news`}
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [styles.logoButton, selected && styles.logoButtonSelected, pressed && styles.pressed]}
            >
              <CompanyLogo companyId={item.id} name={item.name} size={42} />
            </Pressable>
          );
        }}
      />
      <Animated.View
        key={selectedCompanyId}
        entering={FadeIn.duration(reduceMotion ? 0 : theme.motion.normal)}
        style={styles.newsList}
      >
        {liveNews.isLoading ? <LoadingSkeleton preset="card" /> : usingLive
          ? liveItems.map((item) => <LiveHomeNewsCard key={item.id} item={item} companyId={selectedCompanyId} />)
          : items.length ? items.map((item) => <HomeNewsCard key={item.id} item={item} />) : (
            <EmptyState title="No news yet" description="No recent live or saved company news is available." actionLabel={liveNews.error ? 'Retry live news' : undefined} onAction={liveNews.error ? () => { void liveNews.refetch(); } : undefined} />
          )}
      </Animated.View>
      <ActionLink label="See more news" onPress={() => router.navigate('/research')} prominent />
    </Card>
  );
}

function LiveHomeNewsCard({ item, companyId }: { item: NewsArticle; companyId: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.headline}. Read full summary from ${item.source}`}
      onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id, symbol: item.symbol, companyId } } as unknown as Href)}
      style={({ pressed }) => [styles.newsItem, pressed && styles.pressed]}
    >
      <View style={styles.rowBetween}>
        <Tag label="Live news" tone="positive" />
        <AppText variant="caption" tone="muted">{item.source}</AppText>
      </View>
      <AppText variant="heading">{item.headline}</AppText>
      {item.summary ? <AppText tone="secondary">{item.summary}</AppText> : null}
      <AppText variant="caption" tone="muted">Finnhub · {formatNewsTime(item.publishedAt)} · Read full summary</AppText>
    </Pressable>
  );
}

function HomeNewsCard({ item }: { item: HomeNewsItem }) {
  const tone = item.sentiment === 'bullish' ? 'positive' : item.sentiment === 'bearish' ? 'warning' : 'default';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.headline}. Read full summary`}
      onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id, companyId: item.companyId } } as unknown as Href)}
      style={({ pressed }) => [styles.newsItem, pressed && styles.pressed]}
    >
      <Tag label={capitalize(item.sentiment)} tone={tone} />
      <AppText variant="heading">{item.headline}</AppText>
      <AppText tone="secondary">{item.summary}</AppText>
      <AppText variant="caption" tone="muted">{item.source} · {formatNewsTime(item.occurredAt)}</AppText>
    </Pressable>
  );
}

function ThingsToWatch({ items }: { items: WatchItem[] }) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Things To Watch" subtitle="Topics worth monitoring · sample analysis" />
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.description}`}
            onPress={() => item.companyId ? router.push(`/company/${item.companyId}`) : router.navigate('/research')}
            style={({ pressed }) => [styles.watchCard, pressed && styles.pressed]}
          >
            <View style={styles.watchIcon}>
              <Ionicons name={watchIcons[item.category]} size={22} color={theme.colors.accent} />
            </View>
            <View style={styles.flex}>
              <AppText variant="heading">{item.title}</AppText>
              <AppText variant="caption" tone="secondary">{item.description}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatMarketValue(value: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatNewsTime(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatQuoteTime(value: string | undefined): string {
  if (!value) return 'Saved';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Saved' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.md },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1 },
  marketCard: { minHeight: 510, padding: theme.spacing.xl, gap: theme.spacing.sm, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.accent, ...theme.elevation.card },
  marketPrice: { fontSize: 36, lineHeight: 42, fontWeight: '700', color: theme.colors.text, fontVariant: ['tabular-nums'] },
  marketMetrics: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 'auto' },
  metric: { flex: 1, gap: theme.spacing.xs },
  dots: { minHeight: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  dot: { width: 7, height: 7, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border },
  dotActive: { width: 18, backgroundColor: theme.colors.accent },
  rangeSelector: { minHeight: 48, flexDirection: 'row', padding: 2, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  rangeButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.sm },
  rangeButtonSelected: { backgroundColor: theme.colors.accentSoft },
  rangeLabelSelected: { color: theme.colors.accent, fontWeight: '700' },
  chartRetry: { minHeight: 44, justifyContent: 'center' },
  logoList: { gap: theme.spacing.md, paddingVertical: theme.spacing.xs },
  logoButton: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.border },
  logoButtonSelected: { backgroundColor: theme.colors.accentSoft, borderWidth: 2, borderColor: theme.colors.accent },
  newsList: { gap: theme.spacing.md },
  newsItem: { minHeight: 44, gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  horizontalList: { gap: theme.spacing.md },
  watchCard: { width: 252, minHeight: 132, flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  watchIcon: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft },
  pressed: { opacity: theme.opacity.pressed },
});
