import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Divider, EmptyState, InteractivePriceChart, Pill, ProgressIndicator, Tag, type PriceChartMode } from '@/components';
import type { Company, CompanyContent, NewsArticle, ResearchTask, ResearchTaskOutput, StockHistory, StockHistoryRange, StockPricePoint, StockQuote, WorkspaceWidget, WorkspaceWidgetSize } from '@/types/domain';
import { theme } from '@/theme';

export interface WorkspaceWidgetData {
  company: Company;
  companies: Company[];
  content: CompanyContent[];
  news: NewsArticle[];
  tasks: ResearchTask[];
  outputs: ResearchTaskOutput[];
  quote?: StockQuote;
  history?: StockHistory;
  historyRange?: StockHistoryRange;
  historyLoading?: boolean;
  historyError?: Error | null;
  setHistoryRange?: (range: StockHistoryRange) => void;
  retryHistory?: () => void;
}

const density = {
  small: { text: 95, metrics: 2, news: 1, notes: 1, tasks: 1, report: 110 },
  medium: { text: 280, metrics: 4, news: 2, notes: 2, tasks: 2, report: 240 },
  large: { text: 900, metrics: 8, news: 5, notes: 5, tasks: 5, report: 700 },
} as const;

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length).trim()}…` : value;
}

function matchingTasks(data: WorkspaceWidgetData): ResearchTask[] {
  const ticker = data.company.ticker.toLocaleLowerCase();
  const name = data.company.name.toLocaleLowerCase();
  return data.tasks.filter((task) => {
    const searchable = `${task.name} ${task.description} ${task.monitors.join(' ')}`.toLocaleLowerCase();
    return searchable.includes(ticker) || searchable.includes(name);
  });
}

function industryFamily(industry: string): string {
  const value = industry.toLocaleLowerCase();
  if (/(semiconductor|chip|foundry)/.test(value)) return 'Semiconductors';
  if (/(software|cloud|internet|platform|consumer technology|technology)/.test(value)) return 'Digital Technology';
  if (/(bank|financial|insurance)/.test(value)) return 'Financial Services';
  if (/(health|biotech|pharma)/.test(value)) return 'Healthcare';
  if (/(energy|oil|gas|utility)/.test(value)) return 'Energy';
  return industry.trim() || 'Other';
}

function similarIndustryCompanies(company: Company, companies: Company[]): Company[] {
  const family = industryFamily(company.industry);
  return companies
    .filter((item) => industryFamily(item.industry) === family)
    .sort((left, right) => left.id === company.id ? -1 : right.id === company.id ? 1 : left.ticker.localeCompare(right.ticker));
}

function priceTone(change: number) {
  return { color: change >= 0 ? theme.colors.positive : theme.colors.negative } as const;
}

function readableTime(value?: string): string {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString();
}

/** Renders company-specific data with information density determined by widget size. */
export function WorkspaceWidgetContent({ widget, data, interactionsDisabled = false, onOpenNews, onOpenCompany }: { widget: WorkspaceWidget; data: WorkspaceWidgetData; interactionsDisabled?: boolean; onOpenNews?: (newsId: string) => void; onOpenCompany?: (companyId: string) => void }) {
  const { company, content } = data;
  const limits = density[widget.size];

  if (widget.type === 'stock-quote') return <StockQuoteWidget size={widget.size} data={data} />;
  if (widget.type === 'price-chart') return <PriceChartWidget widget={widget} data={data} interactionsDisabled={interactionsDisabled} />;
  if (widget.type === 'trading-range') return <TradingRangeWidget size={widget.size} data={data} />;
  if (widget.type === 'ai-opportunities') return <AIInsightWidget kind="opportunity" size={widget.size} company={company} content={content} />;
  if (widget.type === 'ai-risks') return <AIInsightWidget kind="risk" size={widget.size} company={company} content={content} />;

  if (widget.type === 'ai-summary') {
    const configuredLengths = { short: 180, standard: 360, detailed: 900 } as const;
    const setting = String(widget.settings.summaryLength ?? 'standard') as keyof typeof configuredLengths;
    const length = Math.min(limits.text, configuredLengths[setting] ?? configuredLengths.standard);
    return <View style={styles.stack}>
      <Tag label="Sample AI content" />
      <AppText>{truncate(company.aiSummary, length)}</AppText>
      {widget.size === 'large' && <><Divider /><AppText variant="heading">Thesis context</AppText><View style={styles.thesisColumns}><View style={styles.flex}><Tag label="Opportunity" tone="positive" /><AppText tone="secondary">{company.bullThesis}</AppText></View><View style={styles.flex}><Tag label="Risk" tone="warning" /><AppText tone="secondary">{company.bearThesis}</AppText></View></View><AppText variant="heading">Metrics in the saved context</AppText><View style={styles.metricGrid}>{company.financials.slice(0, 5).map((metric) => <QuoteFact key={metric.label} label={metric.label} value={metric.value} />)}</View></>}
      {widget.size !== 'small' && <AppText variant="caption" tone="muted">Saved company summary · verify important claims with primary sources.</AppText>}
    </View>;
  }
  if (widget.type === 'investment-thesis') {
    const textLength = widget.size === 'small' ? 72 : widget.size === 'medium' ? 190 : 520;
    const relatedResearch = content.filter((item) => item.kind === 'research' || item.kind === 'report');
    return <View style={styles.stack}><Tag label="Bull case" tone="positive" /><AppText>{truncate(company.bullThesis, textLength)}</AppText><Divider /><Tag label="Bear case" tone="warning" /><AppText>{truncate(company.bearThesis, textLength)}</AppText>{widget.size === 'large' && <><Divider /><AppText variant="heading">Company context</AppText><AppText tone="secondary">{company.overview}</AppText><AppText variant="heading">Metrics to monitor</AppText><View style={styles.metricGrid}>{company.financials.slice(0, 5).map((metric) => <QuoteFact key={metric.label} label={metric.label} value={metric.value} />)}</View>{relatedResearch.length > 0 && <><AppText variant="heading">Related research</AppText>{relatedResearch.slice(0, 3).map((item) => <AppText key={item.id} tone="secondary">• {item.title}</AppText>)}</>}</>}{widget.size !== 'small' && <AppText variant="caption" tone="muted">Saved thesis statements, not investment advice.</AppText>}</View>;
  }
  if (widget.type === 'key-metrics') {
    if (!company.financials.length) return <EmptyState title="No metrics yet" description="Financial metrics can be added to this company later." />;
    return <View style={styles.stack}><View style={styles.metricGrid}>{company.financials.slice(0, limits.metrics).map((metric) => <View key={metric.label} style={styles.metric}><AppText variant="caption" tone="secondary">{metric.label.toUpperCase()}</AppText><AppText variant="heading">{metric.value || '—'}</AppText></View>)}</View>{widget.size === 'large' && <><Divider /><AppText variant="heading">Market snapshot</AppText><View style={styles.metricGrid}><QuoteFact label="Price" value={`$${company.price.toFixed(2)}`} /><QuoteFact label="Daily move" value={`${company.dailyChange >= 0 ? '+' : ''}${company.dailyChange.toFixed(2)}%`} /><QuoteFact label="Quote source" value={company.priceSource === 'live' ? 'Live' : 'Saved'} /></View><AppText tone="secondary">Large view combines every saved financial metric with current market context. Values may use different reporting periods.</AppText></>}</View>;
  }
  if (widget.type === 'revenue') {
    const revenue = company.financials.find((item) => item.label.toLocaleLowerCase().includes('revenue')) ?? company.financials[0];
    if (!revenue) return <EmptyState title="Revenue unavailable" description="No saved revenue metric exists for this company." />;
    return <View style={styles.stack}><AppText variant={widget.size === 'small' ? 'heading' : 'title'}>{revenue.value}</AppText>{widget.size !== 'small' && <><Tag label={`${String(widget.settings.period ?? 'annual')} · saved data`} /><AppText tone="secondary">{revenue.label} for {company.ticker}</AppText></>}{widget.size === 'large' && <View style={styles.metricGrid}>{company.financials.slice(1, 5).map((metric) => <View key={metric.label} style={styles.metric}><AppText variant="caption" tone="secondary">{metric.label}</AppText><AppText variant="heading">{metric.value}</AppText></View>)}</View>}</View>;
  }
  if (widget.type === 'latest-news') {
    const requestedLimit = Math.max(1, Number(widget.settings.articleCount ?? 5) || 5);
    const limit = Math.min(requestedLimit, limits.news);
    const localNews = content.filter((item) => item.kind === 'news');
    const rows = data.news.length ? data.news.slice(0, limit).map((item) => ({ id: item.id, title: item.headline, summary: item.summary, detail: item.source })) : localNews.slice(0, limit).map((item) => ({ id: item.id, title: item.title, summary: item.body, detail: 'Saved sample' }));
    if (!rows.length) return <EmptyState title="No news yet" description="This company has no recent or saved stories." />;
    return <View>{rows.map((item, index) => <View key={item.id}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. Read full summary`} accessibilityState={{ disabled: interactionsDisabled }} disabled={interactionsDisabled} onPress={() => onOpenNews?.(item.id)} style={({ pressed }) => [styles.newsRow, pressed && styles.pressed]}>
        <View style={styles.flex}><AppText variant="heading">{item.title}</AppText>{widget.size !== 'small' && item.summary ? <AppText tone="secondary">{truncate(item.summary, widget.size === 'large' ? 240 : 120)}</AppText> : null}<AppText variant="caption" tone="muted">{item.detail}{widget.size !== 'small' ? ' · Read full summary' : ''}</AppText></View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </Pressable>{index < rows.length - 1 && <Divider />}
    </View>)}</View>;
  }
  if (widget.type === 'company-overview') return <View style={styles.stack}><Tag label={company.industry} />{widget.size !== 'small' && <AppText variant="heading">{company.name} · {company.ticker}</AppText>}<AppText>{truncate(company.overview, limits.text)}</AppText>{widget.size === 'large' && <><Divider /><AppText variant="heading">Thesis snapshot</AppText><AppText tone="secondary">Opportunity: {company.bullThesis}</AppText><AppText tone="secondary">Risk: {company.bearThesis}</AppText><AppText variant="heading">Financial context</AppText><View style={styles.metricGrid}>{company.financials.slice(0, 5).map((metric) => <QuoteFact key={metric.label} label={metric.label} value={metric.value} />)}</View></>}{widget.size !== 'small' && <AppText variant="caption" tone="muted">Canonical saved company profile.</AppText>}</View>;
  if (widget.type === 'notes') {
    const notes = content.filter((item) => item.kind === 'note').slice(0, limits.notes);
    if (!notes.length) return <EmptyState title="No notes yet" description="Notes saved for this company will appear here." />;
    return <View style={styles.stack}>{notes.map((note) => <View key={note.id}><AppText variant="heading">{note.title}</AppText>{widget.size !== 'small' && <AppText tone="secondary">{truncate(note.body, widget.size === 'large' ? 260 : 120)}</AppText>}{widget.size === 'large' && <AppText variant="caption" tone="muted">{readableTime(note.occurredAt)}</AppText>}</View>)}</View>;
  }
  if (widget.type === 'latest-report') {
    const savedReports = content.filter((item) => item.kind === 'report');
    const saved = savedReports[0];
    const task = matchingTasks(data).find((item) => data.outputs.some((output) => output.taskId === item.id));
    const output = task ? data.outputs.find((item) => item.taskId === task.id) : undefined;
    const title = output?.title ?? saved?.title;
    const body = output?.summary ?? saved?.body;
    return title && body ? <View style={styles.stack}><Tag label={output ? 'Automated report' : 'Saved sample report'} /><AppText variant="heading">{title}</AppText>{widget.size !== 'small' && <AppText tone="secondary">{truncate(body, limits.report)}</AppText>}{widget.size === 'large' && <>{output?.sections.slice(0, 3).map((section) => <View key={section.title}><AppText variant="heading">{section.title}</AppText><AppText tone="secondary">{section.bullets.slice(0, 2).join(' • ')}</AppText></View>)}{!output && savedReports.slice(1, 3).map((report) => <View key={report.id}><Divider /><AppText variant="heading">{report.title}</AppText><AppText tone="secondary">{report.body}</AppText></View>)}</>}</View> : <EmptyState title="No reports yet" description="Saved and automated reports will appear here." />;
  }
  if (widget.type === 'active-tasks') {
    const tasks = matchingTasks(data).filter((task) => task.status === 'running');
    return tasks.length ? <View style={styles.stack}>{tasks.slice(0, limits.tasks).map((task) => <View key={task.id} style={styles.taskRow}><Tag label="Running" tone="positive" /><View style={styles.flex}><AppText variant="heading">{task.name}</AppText>{widget.size !== 'small' && <AppText variant="caption" tone="secondary">{task.scheduleLabel}</AppText>}{widget.size === 'large' && <AppText tone="secondary">{truncate(task.description, 220)}</AppText>}</View></View>)}</View> : <EmptyState title="No active tasks" description={`No running research task mentions ${company.ticker}.`} />;
  }

  return <IndustryPeersWidget size={widget.size} company={company} companies={data.companies} interactionsDisabled={interactionsDisabled} onOpenCompany={onOpenCompany} />;
}

function AIInsightWidget({ kind, size, company, content }: { kind: 'opportunity' | 'risk'; size: WorkspaceWidgetSize; company: Company; content: CompanyContent[] }) {
  const isOpportunity = kind === 'opportunity';
  const thesis = isOpportunity ? company.bullThesis : company.bearThesis;
  const relevantResearch = content.filter((item) => item.kind === 'research' || item.kind === 'report' || item.kind === 'news');
  const questions = isOpportunity
    ? [`What evidence would confirm this growth driver?`, `Which metric best measures adoption for ${company.ticker}?`, 'What could prevent the opportunity from translating into durable returns?']
    : [`What evidence would show this risk is increasing?`, `Which metric would provide the earliest warning for ${company.ticker}?`, 'What could reduce or offset this risk?'];
  const metricLimit = size === 'medium' ? 2 : 5;
  return <View style={styles.stack}>
    <View style={styles.tags}><Tag label="Sample AI interpretation" /><Tag label={isOpportunity ? 'Opportunity' : 'Risk'} tone={isOpportunity ? 'positive' : 'warning'} /></View>
    <AppText variant={size === 'small' ? 'heading' : 'title'}>{truncate(thesis, size === 'small' ? 95 : size === 'medium' ? 280 : 700)}</AppText>
    {size !== 'small' && <><AppText variant="heading">Context</AppText><AppText tone="secondary">{truncate(company.aiSummary.replace(/^Sample AI summary:\s*/i, ''), size === 'medium' ? 180 : 520)}</AppText></>}
    {size !== 'small' && company.financials.length > 0 && <><AppText variant="heading">Metrics to verify</AppText><View style={styles.metricGrid}>{company.financials.slice(0, metricLimit).map((metric) => <QuoteFact key={metric.label} label={metric.label} value={metric.value} />)}</View></>}
    {size === 'large' && <><AppText variant="heading">Research questions</AppText>{questions.map((question) => <View key={question} style={styles.bulletRow}><AppText tone="secondary">•</AppText><AppText tone="secondary" style={styles.flex}>{question}</AppText></View>)}{relevantResearch.length > 0 && <><AppText variant="heading">Related saved evidence</AppText>{relevantResearch.slice(0, 3).map((item) => <AppText key={item.id} tone="secondary">• {item.title}</AppText>)}</>}</>}
    <AppText variant="caption" tone="muted">Based on saved company context · not financial advice.</AppText>
  </View>;
}

function StockQuoteWidget({ size, data }: { size: WorkspaceWidgetSize; data: WorkspaceWidgetData }) {
  const { company, quote } = data;
  const price = quote?.price ?? company.price;
  const changePercent = quote?.changePercent ?? company.dailyChange;
  const change = quote?.change ?? (price - price / Math.max(0.01, 1 + changePercent / 100));
  return <View style={styles.stack}>
    <View style={styles.quoteRow}><View style={styles.flex}><AppText variant="caption" tone="secondary">{company.ticker}</AppText><AppText variant={size === 'small' ? 'title' : 'hero'}>${price.toFixed(2)}</AppText></View><AppText variant="heading" style={priceTone(changePercent)}>{changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%</AppText></View>
    {size !== 'small' && <AppText style={priceTone(change)}>{change >= 0 ? '+' : ''}${change.toFixed(2)} today</AppText>}
    {size === 'large' && <View style={styles.metricGrid}><QuoteFact label="Previous close" value={`$${(quote?.previousClose ?? price - change).toFixed(2)}`} /><QuoteFact label="Session high" value={`$${(quote?.high ?? price).toFixed(2)}`} /><QuoteFact label="Session low" value={`$${(quote?.low ?? price).toFixed(2)}`} /></View>}
    {size !== 'small' && <AppText variant="caption" tone="muted">{quote ? 'Finnhub live quote' : 'Saved quote fallback'} · {readableTime(quote?.asOf ?? company.priceAsOf)}</AppText>}
  </View>;
}

function TradingRangeWidget({ size, data }: { size: WorkspaceWidgetSize; data: WorkspaceWidgetData }) {
  const { company, quote } = data;
  const price = quote?.price ?? company.price;
  const previousClose = quote?.previousClose ?? price / Math.max(0.01, 1 + company.dailyChange / 100);
  const open = quote?.open ?? previousClose;
  const high = quote?.high ?? Math.max(price, open);
  const low = quote?.low ?? Math.min(price, open);
  const rangePosition = high === low ? 0.5 : (price - low) / (high - low);
  const facts: [string, number][] = size === 'small' ? [['Low', low], ['High', high]] : [['Open', open], ['Previous', previousClose], ['Low', low], ['High', high]];
  return <View style={styles.stack}>
    <View style={styles.metricGrid}>{facts.map(([label, value]) => <QuoteFact key={label} label={label} value={`$${value.toFixed(2)}`} />)}</View>
    {size !== 'small' && <ProgressIndicator value={rangePosition} label={`Current $${price.toFixed(2)} · ${Math.round(rangePosition * 100)}% through today’s displayed range`} />}
    {size === 'large' && <><Divider /><AppText tone="secondary">Today’s displayed spread is ${(high - low).toFixed(2)} points. This describes price position, not valuation or future direction.</AppText><AppText variant="caption" tone="muted">{quote ? 'Finnhub live quote' : 'Saved quote fallback'} · {readableTime(quote?.asOf ?? company.priceAsOf)}</AppText></>}
  </View>;
}

function QuoteFact({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><AppText variant="caption" tone="secondary">{label.toUpperCase()}</AppText><AppText variant="heading">{value}</AppText></View>;
}

const chartRanges: StockHistoryRange[] = ['1H', '1D', '5D', '1W', '1M', '1Y', '2Y'];

function PriceChartWidget({ widget, data, interactionsDisabled }: { widget: WorkspaceWidget; data: WorkspaceWidgetData; interactionsDisabled: boolean }) {
  const configuredRange = chartRanges.includes(widget.settings.range as StockHistoryRange) ? widget.settings.range as StockHistoryRange : '1M';
  const [mode, setMode] = useState<PriceChartMode>('line');
  const range = data.historyRange ?? configuredRange;
  const fallback = useMemo(() => buildQuoteFallback(data.company.price, data.company.dailyChange), [data.company.dailyChange, data.company.price]);
  const points = data.history?.points.length ? data.history.points : fallback;
  const first = points[0]?.close ?? data.company.price;
  const last = points[points.length - 1]?.close ?? data.company.price;
  const change = first ? ((last - first) / first) * 100 : 0;
  const ranges = widget.size === 'medium' ? chartRanges.filter((item) => ['1D', '1M', '1Y'].includes(item)) : chartRanges;
  const height = widget.size === 'small' ? 104 : widget.size === 'medium' ? 154 : 220;
  return <View style={styles.stack}>
    <View style={styles.quoteRow}><AppText variant={widget.size === 'small' ? 'heading' : 'title'}>${last.toFixed(2)}</AppText><AppText variant="heading" style={priceTone(change)}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% · {range}</AppText></View>
    {widget.size === 'large' && !interactionsDisabled && <View style={styles.selector}><Pill label="Line" selected={mode === 'line'} onPress={() => setMode('line')} /><Pill label="Bars" selected={mode === 'bar'} onPress={() => setMode('bar')} /></View>}
    <InteractivePriceChart points={points} positive={change >= 0} range={range} currency={data.history?.currency ?? 'USD'} mode={mode} height={height} testID={`workspace-price-chart-${widget.size}`} />
    {widget.size !== 'small' && !interactionsDisabled && <View style={styles.selector}>{ranges.map((item) => <Pill key={item} label={item} selected={range === item} onPress={() => data.setHistoryRange?.(item)} />)}</View>}
    {widget.size === 'large' && <AppText variant="caption" tone="muted">Drag across the chart to inspect prices · {data.historyLoading ? 'Loading live history' : data.history?.source ?? 'Illustrative quote fallback'} · market delays may apply.</AppText>}
    {widget.size === 'large' && data.historyError && !interactionsDisabled && <Button label="Retry live history" variant="secondary" size="small" onPress={data.retryHistory} />}
  </View>;
}

function buildQuoteFallback(currentPrice: number, dailyChange: number): StockPricePoint[] {
  const previousClose = currentPrice / Math.max(0.01, 1 + dailyChange / 100);
  const now = Date.now();
  return Array.from({ length: 16 }, (_, index) => {
    const progress = index / 15;
    return {
      timestamp: new Date(now - (15 - index) * 30 * 60_000).toISOString(),
      close: previousClose + (currentPrice - previousClose) * progress + Math.sin(progress * Math.PI * 4) * currentPrice * 0.0015,
    };
  });
}

function IndustryPeersWidget({ size, company, companies, interactionsDisabled, onOpenCompany }: { size: WorkspaceWidgetSize; company: Company; companies: Company[]; interactionsDisabled: boolean; onOpenCompany?: (companyId: string) => void }) {
  const family = industryFamily(company.industry);
  const group = similarIndustryCompanies(company, companies);
  const peers = group.filter((item) => item.id !== company.id);
  if (!peers.length) return <EmptyState title="No industry peers tracked" description={`Add another ${family.toLocaleLowerCase()} company to compare it with ${company.ticker}.`} />;

  if (size === 'small') return <View style={styles.stack}><Tag label={family} /><AppText variant="caption" tone="secondary">{group.length} tracked companies · tap to open</AppText><View style={styles.tags}>{group.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.name} stock window`} accessibilityState={{ disabled: interactionsDisabled }} disabled={interactionsDisabled} onPress={() => onOpenCompany?.(item.id)} style={({ pressed }) => pressed && styles.pressed}><Tag label={item.ticker} tone={item.id === company.id ? 'positive' : 'default'} /></Pressable>)}</View></View>;

  return <View style={styles.stack}>
    <View style={styles.quoteRow}><Tag label={family} /><AppText variant="caption" tone="secondary">All {group.length} tracked companies</AppText></View>
    {group.map((item, index) => <View key={item.id}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name} stock window`} accessibilityHint="Opens this company’s chart, overview, news, and workspace." accessibilityState={{ disabled: interactionsDisabled }} disabled={interactionsDisabled} onPress={() => onOpenCompany?.(item.id)} style={({ pressed }) => [styles.peerPressable, pressed && styles.pressed]}>
      <View style={styles.peerRow}><View style={styles.flex}><View style={styles.tickerRow}><AppText variant="heading">{item.ticker}</AppText>{item.id === company.id && <Tag label="Current" tone="positive" />}</View>{size === 'large' && <AppText variant="caption" tone="secondary">{item.name} · {item.industry}</AppText>}</View>
      <View style={styles.alignEnd}><AppText variant="heading">${item.price.toFixed(2)}</AppText><AppText style={priceTone(item.dailyChange)}>{item.dailyChange >= 0 ? '+' : ''}{item.dailyChange.toFixed(2)}%</AppText></View><Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} /></View>
      {size === 'large' && item.financials[0] && <AppText variant="caption" tone="muted">{item.financials[0].label}: {item.financials[0].value} · {item.priceSource === 'live' ? 'Live quote' : 'Saved quote'}</AppText>}
    </Pressable>{index < group.length - 1 && <Divider />}</View>)}
    {size === 'large' && <AppText variant="caption" tone="muted">Peers are grouped by related saved industry categories. Price and daily movement are not measures of valuation.</AppText>}
  </View>;
}

const styles = {
  stack: { gap: theme.spacing.sm } as const,
  flex: { flex: 1 } as const,
  alignEnd: { alignItems: 'flex-end' } as const,
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs } as const,
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md } as const,
  metric: { minWidth: 88, flexGrow: 1, flexBasis: '28%', gap: theme.spacing.xs } as const,
  newsRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md } as const,
  pressed: { opacity: theme.opacity.pressed } as const,
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const,
  quoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md } as const,
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs } as const,
  peerRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.sm } as const,
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const,
  peerPressable: { minHeight: 54, justifyContent: 'center', gap: theme.spacing.xs } as const,
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm } as const,
  thesisColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.lg } as const,
};
