import { fireEvent, render, screen } from '@testing-library/react-native';
import { seedCompanies } from '@/database/seedData';
import { WorkspaceWidgetContent, type WorkspaceWidgetData } from '@/features/workspace/WorkspaceWidgetContent';
import { getWorkspaceWidgetDimensions, widgetCatalog, widgetCategories, widgetDefinitions } from '@/features/workspace/widgetRegistry';
import type { WorkspaceWidget } from '@/types/domain';

describe('Workspace widget framework', () => {
  it('registers fifteen working widgets and exposes every required gallery category', () => {
    expect(widgetDefinitions).toHaveLength(15);
    expect(widgetCatalog.map((item) => item.name)).toEqual(expect.arrayContaining([
      'AI Summary', 'AI News Overview', 'Stock Quote', 'Price Chart', 'Trading Range', 'Key Metrics',
      'Revenue', 'Latest News', 'Company Overview', 'Notes', 'Latest Report', 'Active Tasks',
      'Industry Peers', 'Valuation Comparison',
    ]));
    expect(widgetCategories.map((category) => category.id)).toEqual(['ai', 'financial', 'news', 'business', 'research', 'automation', 'comparison']);
  });

  it('keeps the layout widget identical while inheriting the open company context', () => {
    const nvidia = seedCompanies.find((company) => company.id === 'nvda')!;
    const apple = seedCompanies.find((company) => company.id === 'aapl')!;
    const widget: WorkspaceWidget = { id: 'global-overview', type: 'company-overview', size: 'medium', position: 0, settings: {} };
    const data = (company: typeof nvidia): WorkspaceWidgetData => ({ company, companies: seedCompanies, content: [], news: [], tasks: [], outputs: [] });
    const view = render(<WorkspaceWidgetContent widget={widget} data={data(nvidia)} />);
    expect(screen.getByText(nvidia.overview)).toBeTruthy();

    view.rerender(<WorkspaceWidgetContent widget={widget} data={data(apple)} />);
    expect(screen.getByText(apple.overview)).toBeTruthy();
    expect(screen.queryByText(nvidia.overview)).toBeNull();
  });

  it('uses a stable half-width, full-width, and two-block grid standard', () => {
    const dimensions = getWorkspaceWidgetDimensions(390);
    expect(typeof dimensions.widths.small).toBe('number');
    expect(dimensions.widths.medium).toBe('100%');
    expect(dimensions.widths.large).toBe('100%');
    expect(dimensions.heights.small).toBeLessThan(dimensions.heights.medium);
    expect(dimensions.heights.large).toBe(dimensions.heights.medium * 2 + 12);

    const tabletDimensions = getWorkspaceWidgetDimensions(1024);
    expect(typeof tabletDimensions.widths.small).toBe('number');
    expect(tabletDimensions.widths.medium).toBe('100%');
    expect(tabletDimensions.widths.large).toBe('100%');
  });

  it('shows news summaries and opens the in-app detail from the widget', () => {
    const company = seedCompanies[0]!;
    const url = 'https://example.com/company-news';
    const onOpenNews = jest.fn();
    const widget: WorkspaceWidget = { id: 'global-news', type: 'latest-news', size: 'large', position: 0, settings: { articleCount: 5 } };
    const data: WorkspaceWidgetData = {
      company, companies: seedCompanies, content: [], tasks: [], outputs: [],
      news: [{ id: 'news-1', symbol: company.ticker, headline: 'Company announces new product', summary: 'The full provider summary is visible before opening.', source: 'Example News', category: 'company', publishedAt: new Date().toISOString(), url, relatedSymbols: [company.ticker], provider: 'Finnhub' }],
    };
    render(<WorkspaceWidgetContent widget={widget} data={data} onOpenNews={onOpenNews} />);

    expect(screen.getByText('The full provider summary is visible before opening.')).toBeTruthy();
    fireEvent.press(screen.getByText('Company announces new product'));
    expect(onOpenNews).toHaveBeenCalledWith('news-1');
  });

  it('uses size to make the same news widget brief or detailed', () => {
    const company = seedCompanies[0]!;
    const stories = [1, 2].map((id) => ({
      id: `news-${id}`, symbol: company.ticker, headline: `Story ${id}`, summary: `Detailed summary ${id}`,
      source: 'Reuters', category: 'company', publishedAt: new Date().toISOString(), url: `https://example.com/${id}`,
      relatedSymbols: [company.ticker], provider: 'Finnhub' as const,
    }));
    const data: WorkspaceWidgetData = { company, companies: seedCompanies, content: [], tasks: [], outputs: [], news: stories };
    const widget: WorkspaceWidget = { id: 'sized-news', type: 'latest-news', size: 'small', position: 0, settings: { articleCount: 5 } };
    const view = render(<WorkspaceWidgetContent widget={widget} data={data} />);

    expect(screen.getByText('Story 1')).toBeTruthy();
    expect(screen.queryByText('Story 2')).toBeNull();
    expect(screen.queryByText('Detailed summary 1')).toBeNull();

    view.rerender(<WorkspaceWidgetContent widget={{ ...widget, size: 'large' }} data={data} />);
    expect(screen.getByText('Story 2')).toBeTruthy();
    expect(screen.getByText('Detailed summary 1')).toBeTruthy();
  });

  it('shows every tracked company in the current company industry group', () => {
    const company = seedCompanies.find((item) => item.ticker === 'NVDA')!;
    const onOpenCompany = jest.fn();
    const widget: WorkspaceWidget = { id: 'industry-peers', type: 'compare-companies', size: 'large', position: 0, settings: {} };
    const data: WorkspaceWidgetData = { company, companies: seedCompanies, content: [], news: [], tasks: [], outputs: [] };
    render(<WorkspaceWidgetContent widget={widget} data={data} onOpenCompany={onOpenCompany} />);

    expect(screen.getByText('NVDA')).toBeTruthy();
    expect(screen.getByText('AMD')).toBeTruthy();
    expect(screen.getByText('TSM')).toBeTruthy();
    expect(screen.queryByText('MSFT')).toBeNull();
    expect(screen.getByText('All 3 tracked companies')).toBeTruthy();
    fireEvent.press(screen.getByText('AMD'));
    expect(onOpenCompany).toHaveBeenCalledWith('amd');
  });

  it('renders working, size-aware AI opportunity and risk widgets', () => {
    const company = seedCompanies[0]!;
    const data: WorkspaceWidgetData = { company, companies: seedCompanies, content: [], news: [], tasks: [], outputs: [] };
    const opportunity: WorkspaceWidget = { id: 'opportunity', type: 'ai-opportunities', size: 'small', position: 0, settings: {} };
    const view = render(<WorkspaceWidgetContent widget={opportunity} data={data} />);

    expect(screen.getByText('Opportunity')).toBeTruthy();
    expect(screen.queryByText('Context')).toBeNull();

    view.rerender(<WorkspaceWidgetContent widget={{ ...opportunity, size: 'large', type: 'ai-risks' }} data={data} />);
    expect(screen.getByText('Risk')).toBeTruthy();
    expect(screen.getByText('Context')).toBeTruthy();
    expect(screen.getByText('Research questions')).toBeTruthy();
  });

  it('adds thesis context and market metrics only to large deep-detail widgets', () => {
    const company = seedCompanies[0]!;
    const data: WorkspaceWidgetData = { company, companies: seedCompanies, content: [], news: [], tasks: [], outputs: [] };
    const thesis: WorkspaceWidget = { id: 'thesis', type: 'investment-thesis', size: 'small', position: 0, settings: {} };
    const view = render(<WorkspaceWidgetContent widget={thesis} data={data} />);

    expect(screen.queryByText('Company context')).toBeNull();
    view.rerender(<WorkspaceWidgetContent widget={{ ...thesis, size: 'large' }} data={data} />);
    expect(screen.getByText('Company context')).toBeTruthy();
    expect(screen.getByText('Metrics to monitor')).toBeTruthy();

    view.rerender(<WorkspaceWidgetContent widget={{ ...thesis, type: 'key-metrics', size: 'large' }} data={data} />);
    expect(screen.getByText('Market snapshot')).toBeTruthy();
    expect(screen.getByText('QUOTE SOURCE')).toBeTruthy();
  });
});
