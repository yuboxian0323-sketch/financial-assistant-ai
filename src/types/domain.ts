export interface Company {
  id: string;
  ticker: string;
  name: string;
  industry: string;
  overview: string;
  aiSummary: string;
  bullThesis: string;
  bearThesis: string;
  price: number;
  dailyChange: number;
  financials: FinancialMetric[];
}

export interface FinancialMetric { label: string; value: string }
export interface Holding { id: string; companyId: string; company: Company; shares: number; averageCost: number; notes: string }
export interface WatchlistEntry { id: string; companyId: string; company: Company }
export interface CompanyContent {
  id: string;
  companyId: string;
  kind: 'note' | 'research' | 'report' | 'conversation' | 'news' | 'event' | 'timeline';
  title: string;
  body: string;
  occurredAt: string;
  importance: number;
}
export interface SessionBrief {
  portfolioValue: number;
  portfolioChange: number;
  importantNews: CompanyContent[];
  industryEvents: CompanyContent[];
  upcomingEvents: CompanyContent[];
  needsAttention: string[];
  aiSummary: string;
  previousSessionAt: string;
}
export interface DatabaseInfo { version: number; seedVersion: number; companyCount: number }
export type KnowledgeSection = 'Overview' | 'AI Summary' | 'Notes' | 'Research' | 'Reports' | 'News' | 'Events' | 'Timeline' | 'Conversations' | 'Bull Thesis' | 'Bear Thesis' | 'Financials';
export type CompanyHubPage = 'Workspace' | 'Overview' | 'News' | 'Automations';

export class AppError extends Error {
  constructor(public readonly code: 'DATABASE' | 'NOT_FOUND' | 'SERVICE', message: string, public readonly retryable = true) {
    super(message);
    this.name = 'AppError';
  }
}
