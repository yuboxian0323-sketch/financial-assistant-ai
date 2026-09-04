import type { AddPortfolioHoldingInput, AIAnalysis, AIAnalysisRequest, Company, CompanyContent, DatabaseInfo, Holding, HomeBrief, NewsAISummary, NewsAISummaryRequest, NewsArticle, PortfolioOverview, QuoteBatch, ResearchTask, ResearchTaskDraft, ResearchTaskEvidence, ResearchTaskOutput, ResearchTaskOutputDraft, StockHistory, StockHistoryRange, StockSearchResult, WorkspaceLayout, WorkspaceWidgetSettings, WorkspaceWidgetSize, WorkspaceWidgetType } from '@/types/domain';

export interface AIService {
  analyzeCompany(request: AIAnalysisRequest): Promise<AIAnalysis>;
  summarizeNews(request: NewsAISummaryRequest): Promise<NewsAISummary>;
  structureResearchTask(prompt: string): Promise<ResearchTaskDraft>;
  generateResearchTaskOutput(task: ResearchTask, evidence: ResearchTaskEvidence): Promise<ResearchTaskOutputDraft>;
}

export interface MarketDataService {
  getQuotes(symbols: string[]): Promise<QuoteBatch>;
  searchStocks(query: string): Promise<StockSearchResult[]>;
  getHistory(symbol: string, range: StockHistoryRange): Promise<StockHistory>;
}

export interface NewsService {
  getCompanyNews(symbol: string): Promise<NewsArticle[]>;
}

export interface CompanyService {
  search(query?: string): Promise<Company[]>;
  getById(id: string): Promise<Company>;
  getContent(companyId: string, kind?: CompanyContent['kind']): Promise<CompanyContent[]>;
}
export interface PortfolioService {
  getHoldings(): Promise<Holding[]>;
  getOverview(): Promise<PortfolioOverview>;
  addHolding(input: AddPortfolioHoldingInput): Promise<Holding>;
  removeHolding(companyId: string): Promise<void>;
}
export interface SessionBriefService { getBrief(): Promise<HomeBrief> }
export interface ResearchTaskService {
  getTasks(): Promise<ResearchTask[]>;
  getTask(id: string): Promise<ResearchTask | null>;
  getLatestOutputs(): Promise<ResearchTaskOutput[]>;
  createTask(prompt: string, draft: ResearchTaskDraft): Promise<ResearchTask>;
  updateTask(task: ResearchTask): Promise<ResearchTask>;
  toggleTask(id: string): Promise<ResearchTask>;
  duplicateTask(id: string): Promise<ResearchTask>;
  deleteTask(id: string): Promise<void>;
  runTask(id: string): Promise<ResearchTaskOutput>;
}
export type NotificationResult = 'delivered' | 'scheduled' | 'denied' | 'unsupported';
export interface NotificationService {
  syncTaskReminder(task: ResearchTask): Promise<NotificationResult>;
  cancelTaskReminder(taskId: string): Promise<void>;
  notifyTaskCompleted(task: ResearchTask, output: ResearchTaskOutput): Promise<NotificationResult>;
  sendTestNotification(): Promise<NotificationResult>;
}
export interface WorkspaceService {
  getLayout(): Promise<WorkspaceLayout>;
  addPage(name: string): Promise<WorkspaceLayout>;
  renamePage(pageId: string, name: string): Promise<WorkspaceLayout>;
  duplicatePage(pageId: string): Promise<WorkspaceLayout>;
  deletePage(pageId: string): Promise<WorkspaceLayout>;
  movePage(pageId: string, direction: -1 | 1): Promise<WorkspaceLayout>;
  addWidget(pageId: string, type: WorkspaceWidgetType, size: WorkspaceWidgetSize, settings: WorkspaceWidgetSettings): Promise<WorkspaceLayout>;
  removeWidget(pageId: string, widgetId: string): Promise<WorkspaceLayout>;
  moveWidget(pageId: string, widgetId: string, toIndex: number): Promise<WorkspaceLayout>;
  resizeWidget(pageId: string, widgetId: string, size: WorkspaceWidgetSize): Promise<WorkspaceLayout>;
  updateWidgetSettings(pageId: string, widgetId: string, settings: WorkspaceWidgetSettings): Promise<WorkspaceLayout>;
}
export interface SettingsService { getDatabaseInfo(): Promise<DatabaseInfo> }
export interface Services {
  ai: AIService;
  marketData: MarketDataService;
  news: NewsService;
  company: CompanyService;
  portfolio: PortfolioService;
  sessionBrief: SessionBriefService;
  researchTasks: ResearchTaskService;
  notifications: NotificationService;
  workspace: WorkspaceService;
  settings: SettingsService;
}
