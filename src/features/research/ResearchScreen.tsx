import { Screen, SearchBar, StockRow, WidgetContainer } from '@/components';
import { useUIStore } from '@/features/ui/store';
import { useCompanies, useStockQuotes, useStockSearch } from '@/hooks/useAppQueries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { router } from 'expo-router';
import { useMemo } from 'react';

export function ResearchScreen() {
  const search = useUIStore((state) => state.researchSearch);
  const setSearch = useUIStore((state) => state.setResearchSearch);
  const debouncedSearch = useDebouncedValue(search, 400);
  const companies = useCompanies(debouncedSearch);
  const marketSearch = useStockSearch(debouncedSearch);
  const marketSymbols = useMemo(() => marketSearch.data?.map((result) => result.symbol) ?? [], [marketSearch.data]);
  const quotes = useStockQuotes(marketSymbols);
  const quoteBySymbol = useMemo(
    () => new Map(quotes.data?.quotes.map((quote) => [quote.symbol, quote]) ?? []),
    [quotes.data?.quotes],
  );
  const searchingMarket = debouncedSearch.trim().length > 0;

  return <Screen title="Research" subtitle="Search Finnhub-supported stocks worldwide. Exchange delays and account-plan limits may apply.">
    <SearchBar value={search} onChangeText={setSearch} />
    <WidgetContainer title={searchingMarket ? 'Saved Knowledge Bases' : 'Company Library'} loading={companies.isLoading} error={companies.error} onRetry={() => companies.refetch()} empty={!companies.isLoading && companies.data?.length === 0}>
      {companies.data?.map((company) => <StockRow key={company.id} ticker={company.ticker} name={`${company.name} · ${company.industry}`} price={company.price} change={company.dailyChange} quoteSource={company.priceSource} onPress={() => router.push(`/company/${company.id}`)} />)}
    </WidgetContainer>
    {searchingMarket && <WidgetContainer
      title="All Market Stocks"
      loading={marketSearch.isLoading || (Boolean(marketSearch.data?.length) && quotes.isLoading)}
      error={marketSearch.error ?? quotes.error}
      onRetry={() => { void marketSearch.refetch(); void quotes.refetch(); }}
      empty={!marketSearch.isLoading && marketSearch.data?.length === 0}
    >
      {marketSearch.data?.map((result) => {
        const quote = quoteBySymbol.get(result.symbol);
        return <StockRow
          key={`${result.symbol}-${result.displaySymbol}`}
          ticker={result.displaySymbol}
          name={`${result.description} · ${result.type}`}
          price={quote?.price}
          change={quote?.changePercent}
          quoteSource={quote ? 'live' : undefined}
          onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: result.symbol, name: result.description, type: result.type } })}
        />;
      })}
    </WidgetContainer>}
  </Screen>;
}
