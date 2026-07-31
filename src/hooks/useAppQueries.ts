import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/providers/AppProviders';
import type { CompanyContent } from '@/types/domain';

export function useCompanies(search = '') {
  const { company } = useServices();
  return useQuery({ queryKey: ['companies', search], queryFn: () => company.search(search) });
}
export function useCompany(id: string) {
  const { company } = useServices();
  return useQuery({ queryKey: ['company', id], queryFn: () => company.getById(id) });
}
export function useCompanyContent(id: string, kind?: CompanyContent['kind']) {
  const { company } = useServices();
  return useQuery({ queryKey: ['company-content', id, kind], queryFn: () => company.getContent(id, kind) });
}
export function usePortfolio() {
  const { portfolio } = useServices();
  return useQuery({ queryKey: ['portfolio'], queryFn: portfolio.getHoldings });
}
export function useWatchlist() {
  const { stock } = useServices();
  return useQuery({ queryKey: ['watchlist'], queryFn: stock.getWatchlist });
}
export function useSessionBrief() {
  const { sessionBrief } = useServices();
  return useQuery({ queryKey: ['session-brief'], queryFn: sessionBrief.getBrief });
}
export function useDatabaseInfo() {
  const { settings } = useServices();
  return useQuery({ queryKey: ['database-info'], queryFn: settings.getDatabaseInfo });
}
