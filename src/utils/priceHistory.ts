import type { MarketIndex, StockPricePoint, StockHistoryRange } from '@/types/domain';

const rangeDurationMs: Partial<Record<StockHistoryRange, number>> = {
  '1D': 24 * 60 * 60_000,
  '5D': 5 * 24 * 60 * 60_000,
  '1Y': 365 * 24 * 60 * 60_000,
  '2Y': 730 * 24 * 60 * 60_000,
};

/** Creates a deterministic intraday curve between the prior close and current quote. */
export function buildQuoteFallback(currentPrice: number, dailyChange: number): StockPricePoint[] {
  const denominator = 1 + dailyChange / 100;
  const previousClose = denominator > 0 ? currentPrice / denominator : currentPrice;
  const amplitude = Math.max(Math.abs(currentPrice - previousClose) * 0.18, currentPrice * 0.001);
  const now = Date.now();
  return Array.from({ length: 20 }, (_, index) => {
    const progress = index / 19;
    return {
      timestamp: new Date(now - (19 - index) * 20 * 60_000).toISOString(),
      close: previousClose + (currentPrice - previousClose) * progress
        + Math.sin(progress * Math.PI * 4) * amplitude * Math.sin(progress * Math.PI),
    };
  });
}

/** Scales a bundled market curve to the selected time range and current quote. */
export function buildMarketFallback(item: MarketIndex, range: StockHistoryRange): StockPricePoint[] {
  const duration = rangeDurationMs[range] ?? rangeDurationMs['1D']!;
  const min = Math.min(...item.chartPoints);
  const spread = Math.max(1, Math.max(...item.chartPoints) - min);
  const now = Date.now();
  return item.chartPoints.map((point, index) => ({
    timestamp: new Date(now - duration + (duration * index) / Math.max(1, item.chartPoints.length - 1)).toISOString(),
    close: item.price * (0.98 + ((point - min) / spread) * 0.02),
  }));
}
