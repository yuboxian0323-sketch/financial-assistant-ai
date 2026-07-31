import { EmptyState, Screen, StockRow, WidgetContainer } from '@/components';
import { useWatchlist } from '@/hooks/useAppQueries';
import { router } from 'expo-router';

export function WatchlistScreen() {
  const watchlist = useWatchlist();
  return <Screen title="Watchlist" subtitle="Companies you want to understand—not a stream of prices.">
    <WidgetContainer title="Following" loading={watchlist.isLoading} error={watchlist.error} onRetry={() => watchlist.refetch()} empty={!watchlist.isLoading && watchlist.data?.length === 0}>
      {watchlist.data?.map(({ id, company }) => <StockRow key={id} ticker={company.ticker} name={`${company.name} · ${company.industry}`} price={company.price} change={company.dailyChange} onPress={() => router.push(`/company/${company.id}`)} />)}
      {!watchlist.isLoading && !watchlist.data?.length && <EmptyState title="Your watchlist is empty" description="Companies you follow will appear here." />}
    </WidgetContainer>
  </Screen>;
}
