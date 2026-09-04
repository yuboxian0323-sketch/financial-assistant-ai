import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { WorkspaceWidgetCategory, WorkspaceWidgetSettings, WorkspaceWidgetSize, WorkspaceWidgetType } from '@/types/domain';
import { theme } from '@/theme';

export interface WidgetDefinition {
  type: WorkspaceWidgetType;
  name: string;
  description: string;
  category: WorkspaceWidgetCategory;
  icon: ComponentProps<typeof Ionicons>['name'];
  supportedSizes: WorkspaceWidgetSize[];
  defaultSize: WorkspaceWidgetSize;
  defaultSettings: WorkspaceWidgetSettings;
  configurable?: boolean;
}
export interface WidgetCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: WorkspaceWidgetCategory;
  icon: ComponentProps<typeof Ionicons>['name'];
  definition?: WidgetDefinition;
}

export function getWorkspaceWidgetDimensions(viewportWidth: number): { widths: Record<WorkspaceWidgetSize, number | '100%'>; heights: Record<WorkspaceWidgetSize, number> } {
  const available = Math.max(280, viewportWidth - theme.spacing.xl * 2);
  const compact = viewportWidth < 700;
  const mediumBlockHeight = compact ? 240 : 270;
  return {
    // One stable two-column grid: Small is one column; Medium and Large span both columns.
    widths: { small: Math.floor((available - theme.spacing.md) / 2), medium: '100%', large: '100%' },
    // Large is exactly two Medium vertical blocks plus the standard grid gap.
    heights: { small: compact ? 180 : 200, medium: mediumBlockHeight, large: mediumBlockHeight * 2 + theme.spacing.md },
  };
}

export const widgetCategories: { id: WorkspaceWidgetCategory; label: string }[] = [
  { id: 'ai', label: 'AI' }, { id: 'financial', label: 'Financial' }, { id: 'news', label: 'News' },
  { id: 'business', label: 'Business' }, { id: 'research', label: 'Research' },
  { id: 'automation', label: 'Automation' }, { id: 'comparison', label: 'Comparison' },
];

export const widgetDefinitions: WidgetDefinition[] = [
  { type: 'ai-summary', name: 'AI Summary', description: 'A sample AI-labelled summary from the company knowledge base.', category: 'ai', icon: 'sparkles-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'large', defaultSettings: { summaryLength: 'standard' }, configurable: true },
  { type: 'ai-opportunities', name: 'AI Opportunities', description: 'Potential upside drivers, supporting context, and questions to validate.', category: 'ai', icon: 'rocket-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'ai-risks', name: 'AI Risks', description: 'Important downside risks, monitoring signals, and research questions.', category: 'ai', icon: 'shield-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'investment-thesis', name: 'Investment Thesis', description: 'View the saved bull and bear cases together.', category: 'ai', icon: 'git-compare-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'large', defaultSettings: {} },
  { type: 'stock-quote', name: 'Stock Quote', description: 'Current price, daily move, source, and update time.', category: 'financial', icon: 'cash-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'small', defaultSettings: {} },
  { type: 'price-chart', name: 'Price Chart', description: 'Interactive historical price curve with selectable periods.', category: 'financial', icon: 'trending-up-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'large', defaultSettings: { range: '1M' } },
  { type: 'trading-range', name: 'Trading Range', description: 'Open, previous close, session high, and session low.', category: 'financial', icon: 'pulse-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'key-metrics', name: 'Key Metrics', description: 'The most important saved financial metrics.', category: 'financial', icon: 'speedometer-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'large', defaultSettings: {} },
  { type: 'revenue', name: 'Revenue', description: 'A focused revenue metric with a configurable period.', category: 'financial', icon: 'bar-chart-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: { period: 'annual' }, configurable: true },
  { type: 'latest-news', name: 'Latest News', description: 'Live provider stories with a saved local fallback.', category: 'news', icon: 'newspaper-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'large', defaultSettings: { articleCount: 5 }, configurable: true },
  { type: 'company-overview', name: 'Company Overview', description: 'A compact view of the canonical company overview.', category: 'business', icon: 'business-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'notes', name: 'Notes', description: 'Recent notes owned by the current company.', category: 'research', icon: 'create-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'latest-report', name: 'Latest Report', description: 'The newest saved or automated research report.', category: 'automation', icon: 'document-text-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'active-tasks', name: 'Active Tasks', description: 'Research tasks that mention the current company.', category: 'automation', icon: 'flash-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'medium', defaultSettings: {} },
  { type: 'compare-companies', name: 'Industry Peers', description: 'Show every tracked company in the same or closely related industry.', category: 'comparison', icon: 'swap-horizontal-outline', supportedSizes: ['small', 'medium', 'large'], defaultSize: 'large', defaultSettings: {} },
];

const planned: Omit<WidgetCatalogEntry, 'definition'>[] = [
  { id: 'ai-news-overview', name: 'AI News Overview', description: 'A concise AI-labelled news briefing.', category: 'ai', icon: 'newspaper-outline' },
  { id: 'bull-vs-bear', name: 'Bull vs Bear', description: 'An AI-assisted debate between both sides of the thesis.', category: 'ai', icon: 'git-compare-outline' },
  { id: 'ai-chat', name: 'AI Chat', description: 'Company-aware research conversation.', category: 'ai', icon: 'chatbubble-ellipses-outline' },
  { id: 'latest-ai-report', name: 'Latest AI Report', description: 'The newest AI-assisted company report.', category: 'ai', icon: 'document-text-outline' },
  { id: 'eps', name: 'EPS', description: 'Earnings per share history and estimates.', category: 'financial', icon: 'trending-up-outline' },
  { id: 'cash-flow', name: 'Cash Flow', description: 'Cash generation and quality trends.', category: 'financial', icon: 'cash-outline' },
  { id: 'balance-sheet', name: 'Balance Sheet', description: 'Assets, liabilities, and financial strength.', category: 'financial', icon: 'scale-outline' },
  { id: 'valuation', name: 'Valuation', description: 'Multiples and valuation context.', category: 'financial', icon: 'calculator-outline' },
  { id: 'margins', name: 'Margins', description: 'Gross, operating, and net margin trends.', category: 'financial', icon: 'analytics-outline' },
  { id: 'growth', name: 'Growth', description: 'Revenue and earnings growth trends.', category: 'financial', icon: 'stats-chart-outline' },
  { id: 'news-timeline', name: 'News Timeline', description: 'Important stories arranged chronologically.', category: 'news', icon: 'time-outline' },
  { id: 'press-releases', name: 'Press Releases', description: 'Recent company announcements.', category: 'news', icon: 'megaphone-outline' },
  { id: 'upcoming-earnings', name: 'Upcoming Earnings', description: 'Upcoming earnings date and expectations.', category: 'news', icon: 'calendar-outline' },
  { id: 'sec-filings', name: 'SEC Filings', description: 'Recent regulatory filings.', category: 'news', icon: 'document-attach-outline' },
  { id: 'products', name: 'Products', description: 'Products, services, and customer value.', category: 'business', icon: 'cube-outline' },
  { id: 'leadership', name: 'Leadership', description: 'Executive team and governance.', category: 'business', icon: 'people-outline' },
  { id: 'business-segments', name: 'Business Segments', description: 'Revenue and operating segment breakdown.', category: 'business', icon: 'pie-chart-outline' },
  { id: 'competitors', name: 'Competitors', description: 'Direct, indirect, and emerging competitors.', category: 'business', icon: 'trophy-outline' },
  { id: 'related-companies', name: 'Related Companies', description: 'Companies connected by industry, competition, or supply chain.', category: 'business', icon: 'link-outline' },
  { id: 'research-checklist', name: 'Research Checklist', description: 'A repeatable due-diligence checklist.', category: 'research', icon: 'checkbox-outline' },
  { id: 'saved-articles', name: 'Saved Articles', description: 'Articles saved to the company knowledge base.', category: 'research', icon: 'bookmark-outline' },
  { id: 'watch-topics', name: 'Watch Topics', description: 'Important topics to monitor over time.', category: 'research', icon: 'eye-outline' },
  { id: 'latest-alerts', name: 'Latest Alerts', description: 'Recent automation alerts for this company.', category: 'automation', icon: 'notifications-outline' },
  { id: 'industry-comparison', name: 'Industry Comparison', description: 'Compare company metrics with its industry.', category: 'comparison', icon: 'podium-outline' },
  { id: 'revenue-comparison', name: 'Revenue Comparison', description: 'Compare revenue scale and growth with peers.', category: 'comparison', icon: 'bar-chart-outline' },
  { id: 'valuation-comparison', name: 'Valuation Comparison', description: 'Compare valuation multiples with peers.', category: 'comparison', icon: 'calculator-outline' },
];

export const widgetCatalog: WidgetCatalogEntry[] = [
  ...widgetDefinitions.map((definition) => ({
    id: definition.type, name: definition.name, description: definition.description,
    category: definition.category, icon: definition.icon, definition,
  })),
  ...planned,
];

export function getWidgetDefinition(type: WorkspaceWidgetType): WidgetDefinition {
  const definition = widgetDefinitions.find((item) => item.type === type);
  if (!definition) throw new Error(`Unknown workspace widget: ${type}`);
  return definition;
}
