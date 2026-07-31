import { EmptyState, Screen, SearchBar, StockRow, WidgetContainer } from '@/components';
import { useUIStore } from '@/features/ui/store';
import { useCompanies } from '@/hooks/useAppQueries';
import { router } from 'expo-router';

export function ResearchScreen() {
  const search = useUIStore((state) => state.researchSearch);
  const setSearch = useUIStore((state) => state.setResearchSearch);
  const companies = useCompanies(search);
  return <Screen title="Research" subtitle="Search a company to enter its living knowledge base.">
    <SearchBar value={search} onChangeText={setSearch} />
    <WidgetContainer title={search ? 'Results' : 'Company Library'} loading={companies.isLoading} error={companies.error} onRetry={() => companies.refetch()} empty={!companies.isLoading && companies.data?.length === 0}>
      {companies.data?.map((company) => <StockRow key={company.id} ticker={company.ticker} name={`${company.name} · ${company.industry}`} price={company.price} change={company.dailyChange} onPress={() => router.push(`/company/${company.id}`)} />)}
      {!companies.isLoading && !companies.data?.length && <EmptyState title="No companies found" description={`No sample company matches “${search}”.`} actionLabel="Clear search" onAction={() => setSearch('')} />}
    </WidgetContainer>
  </Screen>;
}
