import type { Company, CompanyContent, DatabaseInfo, Holding, SessionBrief, WatchlistEntry } from '@/types/domain';

export interface CompanyService {
  search(query?: string): Promise<Company[]>;
  getById(id: string): Promise<Company>;
  getContent(companyId: string, kind?: CompanyContent['kind']): Promise<CompanyContent[]>;
}
export interface PortfolioService { getHoldings(): Promise<Holding[]> }
export interface StockService { getWatchlist(): Promise<WatchlistEntry[]> }
export interface NewsService { getImportant(companyId?: string): Promise<CompanyContent[]> }
export interface AIService { getPlaceholderSummary(companyId: string): Promise<string> }
export interface SessionBriefService { getBrief(): Promise<SessionBrief> }
export interface SettingsService { getDatabaseInfo(): Promise<DatabaseInfo> }
export interface Services {
  company: CompanyService;
  portfolio: PortfolioService;
  stock: StockService;
  news: NewsService;
  ai: AIService;
  sessionBrief: SessionBriefService;
  settings: SettingsService;
}
