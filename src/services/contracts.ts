import type { Company, CompanyContent, DatabaseInfo, Holding, SessionBrief } from '@/types/domain';

export interface CompanyService {
  search(query?: string): Promise<Company[]>;
  getById(id: string): Promise<Company>;
  getContent(companyId: string, kind?: CompanyContent['kind']): Promise<CompanyContent[]>;
}
export interface PortfolioService { getHoldings(): Promise<Holding[]> }
export interface SessionBriefService { getBrief(): Promise<SessionBrief> }
export interface SettingsService { getDatabaseInfo(): Promise<DatabaseInfo> }
export interface Services {
  company: CompanyService;
  portfolio: PortfolioService;
  sessionBrief: SessionBriefService;
  settings: SettingsService;
}
