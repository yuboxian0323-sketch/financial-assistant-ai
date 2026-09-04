import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { theme } from '@/theme';
import type { StockHistoryRange, StockPricePoint } from '@/types/domain';

export type PriceChartMode = 'line' | 'bar';

interface InteractivePriceChartProps {
  points: StockPricePoint[];
  positive: boolean;
  range: StockHistoryRange;
  currency: string;
  mode: PriceChartMode;
  height?: number;
  testID?: string;
}

const plotTop = 44;
const plotBottom = 28;

/** Renders price history with touch, drag, and accessibility-based point inspection. */
export function InteractivePriceChart({
  points,
  positive,
  range,
  currency,
  mode,
  height = 190,
  testID = 'interactive-price-chart',
}: InteractivePriceChartProps) {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, points.length - 1));
  const geometry = useMemo(() => buildPriceChartGeometry(points, width, height), [points, width, height]);
  const selectedPoint = points[selectedIndex] ?? points[points.length - 1];
  const selectedCoordinate = geometry.coordinates[selectedIndex] ?? geometry.coordinates[geometry.coordinates.length - 1];
  const color = positive ? theme.colors.positive : theme.colors.negative;

  useEffect(() => setSelectedIndex(Math.max(0, points.length - 1)), [points]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const selectAtLocation = (event: GestureResponderEvent) => {
    setSelectedIndex(pricePointIndexForLocation(event.nativeEvent.locationX, width, points.length));
  };
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') {
      setSelectedIndex((current) => Math.min(points.length - 1, current + 1));
    } else if (event.nativeEvent.actionName === 'decrement') {
      setSelectedIndex((current) => Math.max(0, current - 1));
    }
  };

  return (
    <View
      accessible
      accessibilityActions={[{ name: 'increment', label: 'Next price point' }, { name: 'decrement', label: 'Previous price point' }]}
      accessibilityHint="Drag across the chart, or swipe up and down with VoiceOver, to inspect prices."
      accessibilityLabel={`${range} ${mode} price chart. Selected ${formatChartPrice(selectedPoint?.close ?? 0, currency)} at ${formatChartTime(selectedPoint?.timestamp, range)}.`}
      accessibilityRole="adjustable"
      onAccessibilityAction={onAccessibilityAction}
      onLayout={onLayout}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={selectAtLocation}
      onResponderMove={selectAtLocation}
      onStartShouldSetResponder={() => true}
      style={[styles.chart, { height }]}
      testID={testID}
    >
      <View pointerEvents="none" style={styles.gridTop} />
      <View pointerEvents="none" style={styles.gridMiddle} />
      <View pointerEvents="none" style={styles.gridBottom} />

      {mode === 'line' ? geometry.segments.map((segment, index) => (
        <View
          key={`${segment.left}-${segment.top}-${index}`}
          pointerEvents="none"
          style={[styles.segment, {
            backgroundColor: color,
            width: segment.width,
            left: segment.left,
            top: segment.top,
            transform: [{ rotate: `${segment.angle}deg` }],
          }]}
        />
      )) : geometry.bars.map((bar, index) => (
        <View
          key={`${bar.left}-${index}`}
          pointerEvents="none"
          style={[styles.bar, { backgroundColor: color, height: bar.height, left: bar.left, top: bar.top, width: bar.width }]}
        />
      ))}

      {selectedPoint && selectedCoordinate ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.crosshair, { left: selectedCoordinate.x }]} />
          <View style={[styles.marker, { backgroundColor: color, left: selectedCoordinate.x - 5, top: selectedCoordinate.y - 5 }]} />
          <View style={styles.selectionLabel}>
            <Text style={styles.selectionPrice}>{formatChartPrice(selectedPoint.close, currency)}</Text>
            <Text style={styles.selectionTime}>{formatChartTime(selectedPoint.timestamp, range)}</Text>
          </View>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.rangeLabels}>
        <Text style={styles.axisLabel}>{formatChartPrice(geometry.min, currency)}</Text>
        <Text style={styles.axisLabel}>{formatChartPrice(geometry.max, currency)}</Text>
      </View>
      <View pointerEvents="none" style={styles.timeLabels}>
        <Text style={styles.axisLabel}>{formatChartTime(points[0]?.timestamp, range)}</Text>
        <Text style={styles.axisLabel}>{formatChartTime(points[points.length - 1]?.timestamp, range)}</Text>
      </View>
    </View>
  );
}

export function pricePointIndexForLocation(locationX: number, width: number, pointCount: number): number {
  if (pointCount <= 1 || width <= 0 || !Number.isFinite(locationX)) return 0;
  const progress = Math.max(0, Math.min(1, locationX / width));
  return Math.round(progress * (pointCount - 1));
}

export function buildPriceChartGeometry(points: StockPricePoint[], width: number, height: number) {
  const values = points.map((point) => point.close);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const valueRange = max - min;
  const safeRange = Math.max(valueRange, Math.max(max, 1) * 0.005);
  const plotWidth = Math.max(0, width - theme.spacing.xs);
  const plotHeight = Math.max(1, height - plotTop - plotBottom);
  const coordinates = points.map((point, index) => ({
    x: points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth,
    y: plotTop + (1 - (valueRange === 0 ? 0.5 : (point.close - min) / safeRange)) * plotHeight,
  }));
  const segments = coordinates.slice(0, -1).flatMap((point, index) => {
    const next = coordinates[index + 1];
    if (!next || width <= 0) return [];
    const segmentWidth = Math.hypot(next.x - point.x, next.y - point.y);
    return [{
      width: Math.round(segmentWidth * 100) / 100,
      left: Math.round(((point.x + next.x) / 2 - segmentWidth / 2) * 100) / 100,
      top: Math.round(((point.y + next.y) / 2) * 100) / 100,
      angle: Math.round(Math.atan2(next.y - point.y, next.x - point.x) * (180 / Math.PI) * 100) / 100,
    }];
  });
  const spacing = points.length > 1 ? plotWidth / points.length : plotWidth;
  const barWidth = Math.max(1, Math.min(10, spacing * 0.68));
  const chartBottom = height - plotBottom;
  const bars = coordinates.map((point) => ({
    width: barWidth,
    left: point.x - barWidth / 2,
    top: point.y,
    height: Math.max(2, chartBottom - point.y),
  }));
  return { min, max, coordinates, segments, bars };
}

function formatChartPrice(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChartTime(value: string | undefined, range: StockHistoryRange): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return range === '1H' || range === '1D' || range === '5D' || range === '1W'
    ? date.toLocaleString([], { weekday: range === '5D' || range === '1W' ? 'short' : undefined, hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', year: range === '1Y' || range === '2Y' ? '2-digit' : undefined, day: range === '1M' ? 'numeric' : undefined });
}

const styles = StyleSheet.create({
  chart: { overflow: 'hidden', borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
  segment: { position: 'absolute', height: 3, borderRadius: theme.radius.pill },
  bar: { position: 'absolute', borderTopLeftRadius: theme.radius.sm, borderTopRightRadius: theme.radius.sm, opacity: 0.82 },
  gridTop: { position: 'absolute', top: plotTop, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  gridMiddle: { position: 'absolute', top: '56%', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  gridBottom: { position: 'absolute', bottom: plotBottom, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  crosshair: { position: 'absolute', top: plotTop, bottom: plotBottom, width: StyleSheet.hairlineWidth, backgroundColor: theme.colors.textSecondary },
  marker: { position: 'absolute', width: 10, height: 10, borderRadius: theme.radius.pill, borderWidth: 2, borderColor: theme.colors.text },
  selectionLabel: { position: 'absolute', top: theme.spacing.xs, left: theme.spacing.sm, right: theme.spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectionPrice: { ...theme.type.heading, color: theme.colors.text },
  selectionTime: { ...theme.type.caption, color: theme.colors.textSecondary },
  rangeLabels: { position: 'absolute', top: plotTop + theme.spacing.xs, right: theme.spacing.sm, bottom: plotBottom + theme.spacing.xs, justifyContent: 'space-between', alignItems: 'flex-end' },
  timeLabels: { position: 'absolute', left: theme.spacing.sm, right: theme.spacing.sm, bottom: theme.spacing.xs, flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { ...theme.type.caption, color: theme.colors.textMuted },
});
