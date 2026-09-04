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
  /** Identifies whether the displayed quote came from the live provider or the seed fallback. */
  priceSource?: 'live' | 'sample';
  /** ISO timestamp supplied by the quote provider when live data is available. */
  priceAsOf?: string;
  financials: FinancialMetric[];
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  asOf: string;
  source: 'Finnhub';
}

export interface QuoteBatch {
  quotes: StockQuote[];
  failedSymbols: string[];
}

export interface StockSearchResult {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
}

export type StockHistoryRange = '1H' | '1D' | '5D' | '1W' | '1M' | '1Y' | '2Y';

export interface StockPricePoint {
  timestamp: string;
  close: number;
}

export interface StockHistory {
  symbol: string;
  range: StockHistoryRange;
  currency: string;
  source: 'Yahoo Finance';
  points: StockPricePoint[];
  asOf: string;
}

export interface NewsArticle {
  id: string;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  category: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  relatedSymbols: string[];
  provider: 'Finnhub';
}

export type ResearchTaskType = 'report' | 'alert';
export type ResearchTaskStatus = 'running' | 'paused';
export type ResearchTaskScheduleType = 'time' | 'event';
export type ResearchReportStyle = 'snapshot' | 'standard' | 'analyst' | 'deep-research';

export interface ResearchTaskDelivery {
  notifyWhenReady: boolean;
  showOnHome: boolean;
  alertCenter: boolean;
}

export interface ResearchTaskDraft {
  name: string;
  type: ResearchTaskType;
  description: string;
  monitors: string[];
  scheduleType: ResearchTaskScheduleType;
  scheduleLabel: string;
  reportStyle?: ResearchReportStyle;
  delivery: ResearchTaskDelivery;
}

export interface ResearchTask extends ResearchTaskDraft {
  id: string;
  prompt: string;
  status: ResearchTaskStatus;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchTaskOutputSection {
  title: string;
  bullets: string[];
}

export interface ResearchTaskOutputDraft {
  title: string;
  summary: string;
  sections: ResearchTaskOutputSection[];
}

export interface ResearchTaskOutput extends ResearchTaskOutputDraft {
  taskId: string;
  generatedAt: string;
}

export interface ResearchTaskEvidence {
  capturedAt: string;
  companies: {
    ticker: string;
    name: string;
    overview: string;
    bullThesis: string;
    bearThesis: string;
    financials: FinancialMetric[];
    price: number;
    dailyChange: number;
    priceSource: 'live' | 'sample';
    news: { headline: string; summary: string; source: string; publishedAt: string }[];
  }[];
  market: {
    name: string;
    symbol: string;
    price: number;
    changePercent: number;
    priceSource: 'live' | 'sample';
  }[];
  portfolio: {
    ticker: string;
    name: string;
    shares: number;
    averageCost: number;
    price: number;
    priceSource: 'live' | 'sample';
  }[];
  events: (CalendarEventItem & { source: 'sample' })[];
}

export type WorkspaceWidgetSize = 'small' | 'medium' | 'large';
export type WorkspaceWidgetCategory = 'ai' | 'financial' | 'news' | 'business' | 'research' | 'automation' | 'comparison';
export type WorkspaceWidgetType =
  | 'ai-summary'
  | 'ai-opportunities'
  | 'ai-risks'
  | 'investment-thesis'
  | 'stock-quote'
  | 'price-chart'
  | 'trading-range'
  | 'key-metrics'
  | 'revenue'
  | 'latest-news'
  | 'company-overview'
  | 'notes'
  | 'latest-report'
  | 'active-tasks'
  | 'compare-companies';

export type WorkspaceWidgetSettings = Record<string, string | number | boolean>;

export interface WorkspaceWidget {
  id: string;
  type: WorkspaceWidgetType;
  size: WorkspaceWidgetSize;
  position: number;
  settings: WorkspaceWidgetSettings;
}

export interface WorkspacePage {
  id: string;
  name: string;
  position: number;
  widgets: WorkspaceWidget[];
}

export interface WorkspaceLayout {
  version: 1;
  pages: WorkspacePage[];
  updatedAt: string;
}

export interface AddPortfolioHoldingInput {
  symbol: string;
  name: string;
  type: string;
  shares: number;
  averageCost: number;
}

export interface AICompanyContext {
  id: string;
  ticker: string;
  name: string;
  industry: string;
  overview: string;
  bullThesis: string;
  bearThesis: string;
  financials: FinancialMetric[];
  quote: {
    price: number;
    dailyChange: number;
    source: 'live' | 'sample';
    asOf?: string;
  };
}

export interface AIAnalysisRequest {
  question: string;
  company: AICompanyContext;
}

export interface AIAnalysis {
  headline: string;
  answer: string;
  keyPoints: string[];
  risks: string[];
  evidence: string[];
  followUpQuestions: string[];
  confidence: 'low' | 'medium' | 'high';
  model: 'gemini-3.5-flash-lite';
  generatedAt: string;
}

export interface NewsAISummaryRequest {
  article: Pick<NewsArticle, 'headline' | 'summary' | 'source' | 'category' | 'publishedAt' | 'relatedSymbols'>;
  company?: Pick<Company, 'ticker' | 'name' | 'industry' | 'overview' | 'bullThesis' | 'bearThesis'>;
}

export interface NewsAISummary {
  overview: string;
  keyFacts: string[];
  whyItMatters: string[];
  risksAndUnknowns: string[];
  questionsToResearch: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  model: 'gemini-3.5-flash-lite';
  generatedAt: string;
}

export interface FinancialMetric { label: string; value: string }
export interface Holding { id: string; companyId: string; company: Company; shares: number; averageCost: number; notes: string }
export interface CompanyContent {
  id: string;
  companyId: string;
  kind: 'note' | 'research' | 'report' | 'conversation' | 'news' | 'event' | 'timeline';
  title: string;
  body: string;
  occurredAt: string;
  importance: number;
}
export interface MarketIndex {
  id: string;
  name: string;
  /** Tradable market proxy used for live quotes and historical curves. */
  symbol: string;
  proxyLabel: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  prevClose: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  chartPoints: number[];
  priceSource?: 'live' | 'sample';
  priceAsOf?: string;
}

export type NewsSentiment = 'bullish' | 'neutral' | 'bearish';

export interface HomeNewsItem {
  id: string;
  companyId: string;
  sentiment: NewsSentiment;
  headline: string;
  summary: string;
  source: string;
  occurredAt: string;
}

export interface HomeNewsCompany {
  id: string;
  name: string;
  ticker: string;
}

export interface WatchItem {
  id: string;
  companyId?: string;
  category: 'valuation' | 'earnings' | 'industry' | 'volatility' | 'macro';
  title: string;
  description: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  relativeLabel: string;
}

export interface HomeBrief {
  companyPriceSource: 'live' | 'sample';
  marketIndices: MarketIndex[];
  marketBriefBullets: string[];
  portfolioBriefBullets: string[];
  portfolioDayChange: number;
  newsCompanies: HomeNewsCompany[];
  newsByCompany: Record<string, HomeNewsItem[]>;
  watchItems: WatchItem[];
  calendarEvents: CalendarEventItem[];
}

export type PortfolioCompositionView = 'Sector' | 'Industry' | 'Theme' | 'Geography' | 'Market Cap';
export type ResearchStatus = 'High Conviction' | 'Active Research' | 'Monitoring';

export interface PortfolioFavorite {
  company: Company;
  theme: string;
  conviction: number;
  researchStatus: ResearchStatus;
  insight: string;
  chartPoints: number[];
}

export interface CompositionSlice {
  label: string;
  percentage: number;
}

export interface PortfolioInsight {
  title: string;
  description: string;
}

export interface PortfolioOverview {
  companyPriceSource: 'live' | 'sample';
  favorites: PortfolioFavorite[];
  briefBullets: string[];
  composition: Record<PortfolioCompositionView, CompositionSlice[]>;
  strengths: PortfolioInsight[];
  watchItems: PortfolioInsight[];
  researchIdeas: PortfolioInsight[];
  upcomingEvents: CalendarEventItem[];
}
export interface DatabaseInfo { version: number; seedVersion: number; companyCount: number }
export type CompanyHubPage = 'Workspace' | 'Overview' | 'News' | 'Automations';

export class AppError extends Error {
  constructor(public readonly code: 'DATABASE' | 'NOT_FOUND' | 'SERVICE' | 'CONFIGURATION' | 'NETWORK', message: string, public readonly retryable = true) {
    super(message);
    this.name = 'AppError';
  }
}
