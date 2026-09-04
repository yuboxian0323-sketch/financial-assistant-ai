import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, InteractivePriceChart, LoadingSkeleton, Pill, SectionHeader, Tag, type PriceChartMode } from '@/components';
import { useStockHistory } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { StockHistoryRange, StockPricePoint } from '@/types/domain';

const ranges: StockHistoryRange[] = ['1H', '1D', '1W', '1M', '1Y', '2Y'];
export function StockHistoryChart({ symbol, currentPrice, dailyChange }: { symbol: string; currentPrice: number; dailyChange: number }) {
  const [range, setRange] = useState<StockHistoryRange>('1D');
  const [mode, setMode] = useState<PriceChartMode>('line');
  const history = useStockHistory(symbol, range);
  const points = history.data?.points ?? [];
  const fallbackPoints = useMemo(() => buildQuoteFallback(currentPrice, dailyChange), [currentPrice, dailyChange]);
  const first = points[0]?.close;
  const last = points[points.length - 1]?.close;
  const rangeChange = first && last ? ((last - first) / first) * 100 : dailyChange;
  const positive = rangeChange >= 0;

  return <Card elevated>
    <SectionHeader
      title={`${symbol} Price History`}
      subtitle="Selectable live-market history"
      action={<Tag label={history.error ? 'Quote fallback' : history.data?.source ?? 'Loading'} tone={history.error ? 'warning' : positive ? 'positive' : 'warning'} />}
    />
    <View style={styles.priceRow}>
      <AppText style={styles.price}>${currentPrice.toFixed(2)}</AppText>
      <AppText variant="heading" style={{ color: positive ? theme.colors.positive : theme.colors.negative }}>
        {positive ? '+' : ''}{rangeChange.toFixed(2)}% · {history.error ? 'Today' : range}
      </AppText>
    </View>
    <View accessibilityRole="tablist" style={styles.modeSelector}>
      <Pill label="Line" selected={mode === 'line'} onPress={() => setMode('line')} />
      <Pill label="Bars" selected={mode === 'bar'} onPress={() => setMode('bar')} />
    </View>
    {history.isLoading ? <LoadingSkeleton preset="card" /> : history.error ? <View style={styles.fallback}>
      <InteractivePriceChart points={fallbackPoints} positive={dailyChange >= 0} range="1D" currency="USD" mode={mode} />
      <AppText variant="caption" tone="secondary">Live history could not load. This illustrative curve connects the previous-close estimate to the current Finnhub quote.</AppText>
      <Button label="Retry live chart" variant="secondary" size="small" onPress={() => void history.refetch()} />
    </View> : <InteractivePriceChart points={points} positive={positive} range={range} currency={history.data?.currency ?? 'USD'} mode={mode} />}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ranges}>
      {ranges.map((item) => <Pill key={item} label={item} selected={range === item} onPress={() => setRange(item)} />)}
    </ScrollView>
    <AppText variant="caption" tone="muted">Drag across the graph to inspect a price and time · Finnhub current quote · History via Yahoo Finance · Market delays may apply</AppText>
  </Card>;
}

function buildQuoteFallback(currentPrice: number, dailyChange: number): StockPricePoint[] {
  const denominator = 1 + dailyChange / 100;
  const previousClose = denominator > 0 ? currentPrice / denominator : currentPrice;
  const amplitude = Math.max(Math.abs(currentPrice - previousClose) * 0.18, currentPrice * 0.001);
  const now = Date.now();
  const count = 20;
  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const curve = Math.sin(progress * Math.PI * 4) * amplitude * Math.sin(progress * Math.PI);
    return {
      timestamp: new Date(now - (count - 1 - index) * 20 * 60_000).toISOString(),
      close: previousClose + (currentPrice - previousClose) * progress + curve,
    };
  });
}

const styles = StyleSheet.create({
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.md },
  price: { ...theme.type.hero, color: theme.colors.text },
  modeSelector: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  ranges: { gap: theme.spacing.sm },
  fallback: { gap: theme.spacing.md },
});
