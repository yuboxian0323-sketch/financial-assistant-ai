import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  ActionLink,
  BulletList,
  CalendarEvents,
  Card,
  ConfirmModal,
  CompanyLogo,
  EmptyState,
  LoadingSkeleton,
  Pill,
  Screen,
  SectionHeader,
  Tag,
} from '@/components';
import { useUIStore } from '@/features/ui/store';
import { usePortfolio, usePortfolioOverview, useRemovePortfolioHolding } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type {
  CompositionSlice,
  Holding,
  PortfolioCompositionView,
  PortfolioFavorite,
  PortfolioInsight,
} from '@/types/domain';

const compositionViews: PortfolioCompositionView[] = ['Sector', 'Industry', 'Theme', 'Geography', 'Market Cap'];
const compositionColors = [
  theme.colors.accent,
  theme.colors.positive,
  theme.colors.warning,
  theme.colors.textSecondary,
  theme.colors.negative,
];

export function PortfolioScreen() {
  const overview = usePortfolioOverview();
  const holdings = usePortfolio();
  const selectedView = useUIStore((state) => state.portfolioCompositionView);
  const setSelectedView = useUIStore((state) => state.setPortfolioCompositionView);

  if (overview.isLoading || holdings.isLoading) {
    return <Screen title="My Portfolio" subtitle="Research portfolio · Sample local data"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  }

  if (overview.error || holdings.error || !overview.data) {
    return <Screen title="My Portfolio" subtitle="Research portfolio · Sample local data"><EmptyState title="Portfolio unavailable" description={overview.error?.message ?? holdings.error?.message ?? 'The local research portfolio could not be prepared.'} actionLabel="Try again" onAction={() => { void overview.refetch(); void holdings.refetch(); }} /></Screen>;
  }

  const data = overview.data;
  if (!holdings.data?.length) {
    return <Screen title="My Portfolio" subtitle="Research portfolio · Sample local data"><EmptyState title="No positions yet" description="Research a stock and add a manual position to build your portfolio." actionLabel="Explore stocks" onAction={() => router.navigate('/research')} /></Screen>;
  }

  return (
    <Screen
      title="My Portfolio"
      subtitle={`Research portfolio · ${data.companyPriceSource === 'live' ? 'Live prices via Finnhub' : 'Sample price fallback'} · Insights remain sample`}
      refreshing={overview.isRefetching}
      onRefresh={() => { void overview.refetch(); void holdings.refetch(); }}
    >
      <Positions holdings={holdings.data} />
      <Favorites favorites={data.favorites} />
      <PortfolioBrief bullets={data.briefBullets} />
      <PortfolioComposition
        selectedView={selectedView}
        slices={data.composition[selectedView]}
        onSelect={setSelectedView}
      />
      <PortfolioInsights
        strengths={data.strengths}
        watchItems={data.watchItems}
        researchIdeas={data.researchIdeas}
      />
      <CalendarEvents items={data.upcomingEvents} subtitle="Tracked companies and major macro events" onViewAll={() => router.navigate('/automations')} />
    </Screen>
  );
}

function Positions({ holdings }: { holdings: Holding[] }) {
  const [selected, setSelected] = useState<Holding | null>(null);
  const removeHolding = useRemovePortfolioHolding();
  const remove = () => {
    if (!selected) return;
    removeHolding.mutate(selected.companyId, { onSuccess: () => setSelected(null) });
  };
  return <>
  <Card elevated>
    <SectionHeader title="Portfolio Positions" subtitle={`${holdings.length} manual research ${holdings.length === 1 ? 'position' : 'positions'}`} />
    {holdings.map((holding, index) => {
      const value = holding.shares * holding.company.price;
      return <View
        key={holding.id}
        style={[styles.position, index < holdings.length - 1 && styles.favoriteDivider]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${holding.company.name}, ${holding.shares} shares`}
          onPress={() => router.push(`/company/${holding.company.id}`)}
          style={({ pressed }) => [styles.positionMain, pressed && styles.pressed]}
        >
          <CompanyLogo companyId={holding.company.id} name={holding.company.name} size={44} />
          <View style={styles.flex}>
            <AppText variant="heading">{holding.company.name}</AppText>
            <AppText variant="caption" tone="secondary">{holding.shares.toLocaleString()} shares · ${holding.averageCost.toFixed(2)} avg.</AppText>
            <AppText variant="caption" tone="muted">{holding.company.ticker} · {holding.company.priceSource === 'live' ? 'Live Finnhub price' : 'Saved price'}</AppText>
          </View>
          <View style={styles.quoteColumn}>
            <AppText variant="heading">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</AppText>
            <AppText variant="caption" style={{ color: holding.company.dailyChange >= 0 ? theme.colors.positive : theme.colors.negative }}>
              {holding.company.dailyChange >= 0 ? '+' : ''}{holding.company.dailyChange.toFixed(2)}%
            </AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${holding.company.name} from portfolio`}
          hitSlop={6}
          onPress={() => { removeHolding.reset(); setSelected(holding); }}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
        ><Ionicons name="trash-outline" size={20} color={theme.colors.negative} /></Pressable>
      </View>;
    })}
  </Card>
  <ConfirmModal visible={Boolean(selected)} title={`Remove ${selected?.company.ticker ?? 'position'}?`} description="Only the manual portfolio position will be removed. The company research record, notes, and saved knowledge stay available." confirmLabel="Remove position" cancelLabel="Keep position" loading={removeHolding.isPending} onClose={() => setSelected(null)} onConfirm={remove}>
    {removeHolding.error && <AppText style={styles.removeError}>{removeHolding.error.message}</AppText>}
  </ConfirmModal>
  </>;
}

function Favorites({ favorites }: { favorites: PortfolioFavorite[] }) {
  return (
    <Card elevated>
      <SectionHeader
        title="Favorites"
        subtitle={`${favorites.length} actively tracked companies`}
        action={<ActionLink label="View all" onPress={() => router.navigate('/research')} />}
      />
      <View>
        {favorites.map((favorite, index) => (
          <Pressable
            key={favorite.company.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${favorite.company.name} workspace`}
            onPress={() => router.push(`/company/${favorite.company.id}`)}
            style={({ pressed }) => [
              styles.favorite,
              index < favorites.length - 1 && styles.favoriteDivider,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.favoriteHeader}>
              <CompanyLogo companyId={favorite.company.id} name={favorite.company.name} size={48} />
              <View style={styles.flex}>
                <AppText variant="heading">{favorite.company.name}</AppText>
                <AppText variant="caption" tone="secondary">{favorite.theme}</AppText>
              </View>
              <View style={styles.quoteColumn}>
                <AppText variant="heading">${favorite.company.price.toFixed(2)}</AppText>
                <AppText variant="caption" style={{ color: favorite.company.dailyChange >= 0 ? theme.colors.positive : theme.colors.negative }}>
                  {favorite.company.dailyChange >= 0 ? '+' : ''}{favorite.company.dailyChange.toFixed(2)}%
                </AppText>
                <AppText variant="caption" tone="muted">{favorite.company.priceSource === 'live' ? 'Live · Finnhub' : 'Sample fallback'}</AppText>
              </View>
            </View>
            <View style={styles.favoriteMeta}>
              <StarRating value={favorite.conviction} />
              <Tag
                label={favorite.researchStatus}
                tone={favorite.researchStatus === 'High Conviction' ? 'positive' : favorite.researchStatus === 'Monitoring' ? 'warning' : 'default'}
              />
            </View>
            <AppText variant="caption" tone="secondary" numberOfLines={2}>{favorite.insight}</AppText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <View accessibilityLabel={`${value} out of 5 conviction`} style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons key={star} name={star <= value ? 'star' : 'star-outline'} size={16} color={theme.colors.accent} />
      ))}
    </View>
  );
}

function PortfolioBrief({ bullets }: { bullets: string[] }) {
  return (
    <Card elevated>
      <SectionHeader
        title="AI Portfolio Brief"
        subtitle="Sample interpretation · no AI model used"
        action={<ActionLink label="View full report" onPress={() => router.navigate('/workspace')} />}
      />
      <BulletList items={bullets} />
    </Card>
  );
}

function PortfolioComposition({ selectedView, slices, onSelect }: {
  selectedView: PortfolioCompositionView;
  slices: CompositionSlice[];
  onSelect: (view: PortfolioCompositionView) => void;
}) {
  return (
    <Card elevated>
      <SectionHeader title="Portfolio Composition" subtitle="What the research portfolio is made of" />
      <FlatList
        data={compositionViews}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.segmentList}
        renderItem={({ item }) => <Pill label={item} selected={selectedView === item} onPress={() => onSelect(item)} />}
      />
      <View accessibilityLabel={`${selectedView} composition`} style={styles.compositionBar}>
        {slices.map((slice, index) => (
          <View key={slice.label} style={{ flex: slice.percentage, backgroundColor: compositionColors[index % compositionColors.length] }} />
        ))}
      </View>
      <View style={styles.legend}>
        {slices.map((slice, index) => (
          <View key={slice.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: compositionColors[index % compositionColors.length] }]} />
            <AppText tone="secondary" style={styles.flex}>{slice.label}</AppText>
            <AppText variant="heading">{slice.percentage}%</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function PortfolioInsights({ strengths, watchItems, researchIdeas }: {
  strengths: PortfolioInsight[];
  watchItems: PortfolioInsight[];
  researchIdeas: PortfolioInsight[];
}) {
  return (
    <Card elevated>
      <SectionHeader title="Portfolio Insights" subtitle="One focused summary of the sample portfolio" />
      <InsightGroup title="Strengths" icon="checkmark-circle" color={theme.colors.positive} items={strengths} />
      <View style={styles.divider} />
      <InsightGroup title="Things To Watch" icon="warning" color={theme.colors.warning} items={watchItems} />
      <View style={styles.divider} />
      <InsightGroup title="Research Ideas" icon="bulb" color={theme.colors.accent} items={researchIdeas} />
    </Card>
  );
}

function InsightGroup({ title, icon, color, items }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: PortfolioInsight[];
}) {
  return (
    <View style={styles.insightGroup}>
      <View style={styles.insightHeading}>
        <Ionicons name={icon} size={20} color={color} />
        <AppText variant="heading">{title}</AppText>
      </View>
      {items.map((item) => (
        <View key={item.title} style={styles.insightRow}>
          <View style={[styles.insightMarker, { backgroundColor: color }]} />
          <View style={styles.flex}>
            <AppText variant="heading">{item.title}</AppText>
            <AppText variant="caption" tone="secondary">{item.description}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.md },
  flex: { flex: 1 },
  favorite: { minHeight: 150, justifyContent: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  position: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  positionMain: { flex: 1, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  removeButton: { width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', marginLeft: theme.spacing.sm },
  removeError: { color: theme.colors.negative },
  favoriteDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  favoriteHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  quoteColumn: { alignItems: 'flex-end' },
  favoriteMeta: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  stars: { flexDirection: 'row', gap: 2 },
  segmentList: { gap: theme.spacing.sm },
  compositionBar: { height: 22, flexDirection: 'row', overflow: 'hidden', borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceMuted },
  legend: { gap: theme.spacing.md },
  legendRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  legendDot: { width: 10, height: 10, borderRadius: theme.radius.pill },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  insightGroup: { gap: theme.spacing.md },
  insightHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  insightRow: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  insightMarker: { width: 7, height: 7, borderRadius: theme.radius.pill, marginTop: theme.spacing.sm },
  pressed: { opacity: theme.opacity.pressed },
});
