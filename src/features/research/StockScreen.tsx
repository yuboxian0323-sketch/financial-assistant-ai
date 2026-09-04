import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, EmptyState, LoadingSkeleton, Screen, SectionHeader, SummaryCard } from '@/components';
import { AddToPortfolioButton } from '@/features/research/AddToPortfolioButton';
import { CompanyNewsFeed } from '@/features/research/CompanyNewsFeed';
import { StockHistoryChart } from '@/features/research/StockHistoryChart';
import { useCompanyNews, useStockQuotes } from '@/hooks/useAppQueries';
import { theme } from '@/theme';

export function StockScreen() {
  const params = useLocalSearchParams<{ symbol: string; name?: string; type?: string }>();
  const symbol = (params.symbol ?? '').trim().toUpperCase();
  const title = params.name || symbol || 'Stock';
  const quoteQuery = useStockQuotes(symbol ? [symbol] : []);
  const newsQuery = useCompanyNews(symbol);
  const quote = quoteQuery.data?.quotes.find((item) => item.symbol === symbol);

  if (quoteQuery.isLoading) {
    return <Screen title={title} subtitle="Loading the latest provider quote…"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  }
  if (quoteQuery.error) {
    return <Screen title={title}><EmptyState title="Quote unavailable" description={quoteQuery.error.message} actionLabel="Try again" onAction={() => void quoteQuery.refetch()} /></Screen>;
  }
  if (!quote) {
    return <Screen title={title}><EmptyState title="No quote returned" description="Finnhub does not have a quote for this symbol under the current account plan." actionLabel="Try again" onAction={() => void quoteQuery.refetch()} /></Screen>;
  }

  return <Screen
    title={params.name ?? quote.symbol}
    subtitle={`${quote.symbol}${params.type ? ` · ${params.type}` : ''} · Latest Finnhub quote; exchange delays may apply`}
    refreshing={quoteQuery.isRefetching}
    onRefresh={() => void quoteQuery.refetch()}
  >
    <StockHistoryChart symbol={quote.symbol} currentPrice={quote.price} dailyChange={quote.changePercent} />
    <AddToPortfolioButton stock={{ symbol: quote.symbol, name: params.name ?? quote.symbol, type: params.type ?? 'Market stock', price: quote.price }} />
    <SectionHeader title="Session Range" subtitle="Actual quote fields returned by the provider" />
    <View style={styles.grid}>
      <View style={styles.half}><SummaryCard title="Open" metric={`$${quote.open.toFixed(2)}`} summary="Session opening price" /></View>
      <View style={styles.half}><SummaryCard title="Previous close" metric={`$${quote.previousClose.toFixed(2)}`} summary="Prior session close" /></View>
      <View style={styles.half}><SummaryCard title="High" metric={`$${quote.high.toFixed(2)}`} summary="Session high" /></View>
      <View style={styles.half}><SummaryCard title="Low" metric={`$${quote.low.toFixed(2)}`} summary="Session low" /></View>
    </View>
    <Card>
      <SectionHeader title="Knowledge Base" subtitle="This stock is not yet saved locally" />
      <AppText tone="secondary">Adding this stock to the portfolio creates a local research record that can grow into notes, theses, reports, and AI-supported analysis.</AppText>
    </Card>
    <CompanyNewsFeed
      symbol={quote.symbol}
      articles={newsQuery.data ?? []}
      loading={newsQuery.isLoading}
      error={newsQuery.error}
      retry={() => { void newsQuery.refetch(); }}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  half: { flexGrow: 1, flexBasis: '46%' },
});
