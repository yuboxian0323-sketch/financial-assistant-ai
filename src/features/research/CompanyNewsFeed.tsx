import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { EmptyState, LoadingSkeleton, NewsCard, Pill, SectionHeader } from '@/components';
import { theme } from '@/theme';
import type { CompanyContent, NewsArticle } from '@/types/domain';

const filters = ['Latest', '7 Days', '30 Days'] as const;

interface CompanyNewsFeedProps {
  symbol: string;
  articles: NewsArticle[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
  fallbackItems?: CompanyContent[];
  companyId?: string;
}

/** Shows live provider articles, with a clearly identified local fallback when necessary. */
export function CompanyNewsFeed({ symbol, articles, loading, error, retry, fallbackItems = [], companyId = '' }: CompanyNewsFeedProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('Latest');
  const [openedAt] = useState(Date.now);
  if (loading && !fallbackItems.length) return <LoadingSkeleton preset="card" />;

  const useLive = articles.length > 0;
  const normalized = useLive
    ? articles.map((article) => ({
      id: article.id,
      headline: article.headline,
      summary: article.summary,
      timestamp: article.publishedAt,
      source: article.source,
      url: article.url,
      important: false,
    }))
    : fallbackItems.map((item) => ({
      id: item.id,
      headline: item.title,
      summary: item.body,
      timestamp: item.occurredAt,
      source: 'Saved sample',
      url: undefined,
      important: item.importance >= 3,
    }));
  const cutoff = filter === '7 Days' ? openedAt - 7 * 24 * 60 * 60_000 : filter === '30 Days' ? openedAt - 30 * 24 * 60 * 60_000 : 0;
  const filtered = normalized.filter((item) => !cutoff || new Date(item.timestamp).getTime() >= cutoff).slice(0, 12);

  if (!normalized.length) {
    return <EmptyState
      title={error ? 'Live news unavailable' : 'No recent company news'}
      description={error?.message ?? 'Finnhub returned no recent North American company news for this symbol.'}
      actionLabel={error ? 'Try again' : undefined}
      onAction={error ? retry : undefined}
    />;
  }

  return <View style={{ gap: theme.spacing.md }}>
    <SectionHeader
      title="Company News"
      subtitle={useLive ? 'Preferred publishers via Finnhub · read summaries in app' : `Saved sample fallback${error ? ` · ${error.message}` : ''}`}
    />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
      {filters.map((option) => <Pill key={option} label={option} selected={filter === option} onPress={() => setFilter(option)} />)}
    </ScrollView>
    {filtered.length ? filtered.map((item) => <NewsCard
      key={item.id}
      headline={item.headline}
      summary={item.summary}
      timestamp={item.timestamp}
      company={symbol}
      source={item.source}
      important={item.important}
      onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id, symbol, companyId } } as unknown as Href)}
    />) : <EmptyState title={`No news from the last ${filter === '7 Days' ? '7' : '30'} days`} description="Choose Latest to view the newest available articles." />}
  </View>;
}
