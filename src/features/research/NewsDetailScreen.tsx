import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AppText, Button, Card, EmptyState, LoadingSkeleton, Screen, SectionHeader, Tag } from '@/components';
import { useCompany, useCompanyContent, useCompanyNews, useNewsAISummary } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { NewsAISummaryRequest } from '@/types/domain';

function readableDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Publication time unavailable' : date.toLocaleString();
}

/** Shows the complete available synopsis before the user decides whether to leave the app. */
export function NewsDetailScreen() {
  const { id = '', symbol = '', companyId = '' } = useLocalSearchParams<{ id: string; symbol?: string; companyId?: string }>();
  const liveNews = useCompanyNews(symbol);
  const savedNews = useCompanyContent(companyId || '__no-company__', 'news');
  const company = useCompany(companyId, Boolean(companyId));
  const aiSummary = useNewsAISummary();
  const [openError, setOpenError] = useState<string | null>(null);
  const liveArticle = liveNews.data?.find((article) => article.id === id);
  const savedArticle = savedNews.data?.find((article) => article.id === id);
  const loading = (Boolean(symbol) && liveNews.isLoading) || (Boolean(companyId) && savedNews.isLoading);

  if (loading && !liveArticle && !savedArticle) return <Screen title="News Detail"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  if (!liveArticle && !savedArticle) return <Screen title="News Detail"><EmptyState title="Story unavailable" description={liveNews.error?.message ?? savedNews.error?.message ?? 'This story is no longer available in the current news feed.'} actionLabel="Try again" onAction={() => { void Promise.all([liveNews.refetch(), savedNews.refetch()]); }} /></Screen>;

  const headline = liveArticle?.headline ?? savedArticle?.title ?? 'News story';
  const summary = liveArticle?.summary.trim() || savedArticle?.body.trim() || 'The publisher did not provide a written synopsis for this story.';
  const source = liveArticle?.source ?? 'Saved sample research';
  const publishedAt = liveArticle?.publishedAt ?? savedArticle?.occurredAt ?? '';

  const request: NewsAISummaryRequest = {
    article: liveArticle ? {
      headline: liveArticle.headline,
      summary: liveArticle.summary,
      source: liveArticle.source,
      category: liveArticle.category || 'Company news',
      publishedAt: liveArticle.publishedAt,
      relatedSymbols: liveArticle.relatedSymbols,
    } : {
      headline,
      summary,
      source,
      category: 'Saved research',
      publishedAt,
      relatedSymbols: symbol ? [symbol] : [],
    },
    company: company.data ? {
      ticker: company.data.ticker,
      name: company.data.name,
      industry: company.data.industry,
      overview: company.data.overview,
      bullThesis: company.data.bullThesis,
      bearThesis: company.data.bearThesis,
    } : undefined,
  };

  function generateSummary() {
    aiSummary.mutate(request);
  }

  async function openPublisher() {
    if (!liveArticle?.url) return;
    setOpenError(null);
    try { await Linking.openURL(liveArticle.url); }
    catch { setOpenError('The publisher website could not be opened on this device.'); }
  }

  return <Screen title="News Detail" subtitle={`${symbol || 'Company'} · Read inside the app before opening the publisher`}>
    <Card elevated>
      <View style={styles.tags}><Tag label={liveArticle ? 'Preferred publisher' : 'Saved sample'} tone={liveArticle ? 'positive' : 'default'} /><Tag label={source} /></View>
      <AppText variant="title">{headline}</AppText>
      <AppText variant="caption" tone="muted">{readableDate(publishedAt)}</AppText>
    </Card>
    <Card>
      <SectionHeader title="Complete available summary" subtitle={liveArticle ? 'Full synopsis supplied by the news provider' : 'Locally saved sample research'} />
      <AppText>{summary}</AppText>
    </Card>
    <Card elevated style={styles.aiCard}>
      <View style={styles.tags}><Tag label="AI-generated analysis" /><Tag label="On demand" /></View>
      <SectionHeader title="Detailed AI Summary" subtitle="A deeper interpretation based only on the text shown above and saved company context" />
      {!aiSummary.data && !aiSummary.isPending && !aiSummary.error && <>
        <AppText tone="secondary">Generate a longer explanation with key facts, investment relevance, uncertainties, and follow-up questions. Gemini does not read the linked publisher page or add live facts.</AppText>
        <Button label="Generate Detailed AI Summary" icon="sparkles-outline" onPress={generateSummary} />
      </>}
      {aiSummary.isPending && <View style={styles.loadingGroup}>
        <LoadingSkeleton preset="text" width="92%" />
        <LoadingSkeleton preset="text" width="100%" />
        <LoadingSkeleton preset="text" width="78%" />
        <AppText variant="caption" tone="muted">Gemini is analyzing the available article synopsis…</AppText>
      </View>}
      {aiSummary.error && !aiSummary.isPending && <EmptyState title="Detailed summary unavailable" description={aiSummary.error.message} actionLabel="Try again" onAction={generateSummary} />}
      {aiSummary.data && !aiSummary.isPending && <>
        <View style={styles.tags}>
          <Tag label={`${aiSummary.data.sentiment[0]?.toUpperCase()}${aiSummary.data.sentiment.slice(1)} interpretation`} tone={aiSummary.data.sentiment === 'positive' ? 'positive' : aiSummary.data.sentiment === 'negative' ? 'warning' : 'default'} />
          <Tag label="Not financial advice" />
        </View>
        <AppText>{aiSummary.data.overview}</AppText>
        <SummaryList title="Key facts from the synopsis" items={aiSummary.data.keyFacts} />
        <SummaryList title="Why it may matter" items={aiSummary.data.whyItMatters} />
        <SummaryList title="Risks and unknowns" items={aiSummary.data.risksAndUnknowns} />
        <SummaryList title="Questions to research next" items={aiSummary.data.questionsToResearch} />
        <AppText variant="caption" tone="muted">Generated {readableDate(aiSummary.data.generatedAt)} · AI interpretation can be wrong. Verify important details with the publisher and primary sources.</AppText>
        <Button label="Regenerate Analysis" variant="secondary" icon="refresh-outline" onPress={generateSummary} />
      </>}
    </Card>
    {liveArticle && <Card>
      <SectionHeader title="Story information" />
      <View style={styles.fact}><AppText tone="secondary">Publisher</AppText><AppText>{source}</AppText></View>
      <View style={styles.fact}><AppText tone="secondary">Category</AppText><AppText>{liveArticle.category || 'Company news'}</AppText></View>
      <View style={styles.fact}><AppText tone="secondary">Related symbols</AppText><AppText>{liveArticle.relatedSymbols.join(', ') || symbol}</AppText></View>
      <AppText variant="caption" tone="muted">The external article may contain additional reporting, context, images, or subscription requirements.</AppText>
    </Card>}
    <Card style={styles.choiceCard}>
      <SectionHeader title="Continue reading?" subtitle="Opening the publisher is always your choice" />
      {liveArticle?.url ? <Button label={`Visit ${source} Website`} icon="open-outline" onPress={() => { void openPublisher(); }} /> : <AppText tone="secondary">This saved sample story has no external website.</AppText>}
      <Button label="Stay in App" variant="secondary" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/research'); }} />
      {openError && <AppText tone="secondary">{openError}</AppText>}
    </Card>
  </Screen>;
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <View style={styles.summarySection}>
    <AppText variant="heading">{title}</AppText>
    {items.map((item, index) => <View key={`${title}-${index}`} style={styles.bulletRow}>
      <AppText tone="secondary">•</AppText><AppText tone="secondary" style={styles.bulletText}>{item}</AppText>
    </View>)}
  </View>;
}

const styles = {
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm } as const,
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md } as const,
  choiceCard: { gap: theme.spacing.md } as const,
  aiCard: { gap: theme.spacing.md } as const,
  loadingGroup: { gap: theme.spacing.sm } as const,
  summarySection: { gap: theme.spacing.sm } as const,
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm } as const,
  bulletText: { flex: 1 } as const,
};
