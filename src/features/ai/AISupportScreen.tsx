import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Card, EmptyState, LoadingSkeleton, Pill, Screen, SectionHeader, Tag } from '@/components';
import { useAIAnalysis, useCompanies } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import { AppError, type AIAnalysis, type AICompanyContext, type Company } from '@/types/domain';

const questionPresets = [
  'Summarize the bull and bear cases.',
  'What evidence could change the thesis?',
  'What are the most important risks?',
] as const;

export function AISupportScreen() {
  const { companyId } = useLocalSearchParams<{ companyId?: string }>();
  const companies = useCompanies();
  const analysis = useAIAnalysis();
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId ?? '');
  const [question, setQuestion] = useState<string>(questionPresets[0]);

  useEffect(() => {
    if (companyId) setSelectedCompanyId(companyId);
  }, [companyId]);

  const selectedCompany = useMemo(
    () => companies.data?.find((company) => company.id === selectedCompanyId) ?? companies.data?.[0],
    [companies.data, selectedCompanyId],
  );
  const trimmedQuestion = question.trim();
  const canSubmit = Boolean(selectedCompany && trimmedQuestion.length >= 3 && trimmedQuestion.length <= 600);

  function submit() {
    if (!selectedCompany || !canSubmit) return;
    analysis.mutate({ question: trimmedQuestion, company: toAIContext(selectedCompany) });
  }

  return <Screen title="AI Support" subtitle="Ask Gemini to examine the saved evidence for one company.">
    <Card style={styles.disclosure}>
      <View style={styles.disclosureTitle}>
        <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.warning} />
        <AppText variant="heading">Privacy notice</AppText>
      </View>
      <AppText tone="secondary">Gemini’s free tier may use submitted content to improve Google products. This screen sends your question plus the company overview, theses, financial metrics, and displayed quote—not saved notes or conversations. Don’t type private or confidential details.</AppText>
    </Card>

    <SectionHeader title="Company" subtitle="Choose the knowledge base Gemini may reference" />
    {companies.isLoading ? <LoadingSkeleton preset="row" /> : companies.error ? <EmptyState title="Companies unavailable" description={companies.error.message} actionLabel="Try again" onAction={() => companies.refetch()} /> :
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {companies.data?.map((company) => <Pill key={company.id} label={company.ticker} selected={company.id === selectedCompany?.id} onPress={() => { setSelectedCompanyId(company.id); analysis.reset(); }} />)}
      </ScrollView>}

    {selectedCompany && <Card>
      <View style={styles.companyHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{selectedCompany.name}</AppText>
          <AppText tone="secondary">{selectedCompany.industry}</AppText>
        </View>
        <Tag label={selectedCompany.priceSource === 'live' ? 'Live quote' : 'Sample quote'} tone={selectedCompany.priceSource === 'live' ? 'positive' : 'warning'} />
      </View>
      <AppText tone="secondary">Gemini will receive the overview, bull and bear theses, {selectedCompany.financials.length} financial metrics, and the displayed ${selectedCompany.price.toFixed(2)} quote.</AppText>
    </Card>}

    <SectionHeader title="Question" subtitle="Use a prompt below or write your own" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {questionPresets.map((preset) => <Pill key={preset} label={preset} selected={question === preset} onPress={() => setQuestion(preset)} />)}
    </ScrollView>
    <View style={styles.inputContainer}>
      <TextInput
        accessibilityLabel="Question for Gemini"
        accessibilityHint="Ask a question about the selected company"
        multiline
        maxLength={600}
        placeholder="Ask about the thesis, evidence, risks, or open questions…"
        placeholderTextColor={theme.colors.textMuted}
        value={question}
        onChangeText={setQuestion}
        style={styles.input}
        textAlignVertical="top"
      />
      <AppText variant="caption" tone="muted" style={styles.count}>{question.length}/600</AppText>
    </View>
    <Button label="Analyze with Gemini" icon="sparkles-outline" loading={analysis.isPending} disabled={!canSubmit} onPress={submit} />
    <AppText variant="caption" tone="muted" style={styles.center}>AI-generated research support · Not financial advice</AppText>

    {analysis.isPending && <View style={styles.results}><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></View>}
    {analysis.error && <EmptyState title="Gemini couldn’t complete the analysis" description={analysis.error.message} actionLabel={analysis.error instanceof AppError && analysis.error.retryable ? 'Try again' : undefined} onAction={analysis.error instanceof AppError && analysis.error.retryable ? submit : undefined} />}
    {analysis.data && <AnalysisResult analysis={analysis.data} onFollowUp={setQuestion} />}
  </Screen>;
}

function toAIContext(company: Company): AICompanyContext {
  return {
    id: company.id,
    ticker: company.ticker,
    name: company.name,
    industry: company.industry,
    overview: company.overview,
    bullThesis: company.bullThesis,
    bearThesis: company.bearThesis,
    financials: company.financials,
    quote: {
      price: company.price,
      dailyChange: company.dailyChange,
      source: company.priceSource ?? 'sample',
      asOf: company.priceAsOf,
    },
  };
}

function AnalysisResult({ analysis, onFollowUp }: { analysis: AIAnalysis; onFollowUp: (question: string) => void }) {
  const generatedAt = new Date(analysis.generatedAt);
  const timeLabel = Number.isNaN(generatedAt.getTime()) ? 'Generated now' : `Generated ${generatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return <View style={styles.results} accessibilityLiveRegion="polite">
    <SectionHeader title="Gemini analysis" subtitle={`${timeLabel} · Confidence: ${analysis.confidence}`} />
    <Card elevated>
      <Tag label="Gemini 3.7 Flash" />
      <AppText variant="title">{analysis.headline}</AppText>
      <AppText tone="secondary">{analysis.answer}</AppText>
    </Card>
    <AnalysisList title="Key points" icon="bulb-outline" items={analysis.keyPoints} />
    <AnalysisList title="Risks and missing evidence" icon="warning-outline" items={analysis.risks} />
    <AnalysisList title="Evidence used" icon="document-text-outline" items={analysis.evidence} />
    {analysis.followUpQuestions.length > 0 && <Card>
      <SectionHeader title="Continue researching" subtitle="Tap a question to put it in the prompt box" />
      {analysis.followUpQuestions.map((item) => <Pressable key={item} accessibilityRole="button" onPress={() => onFollowUp(item)} style={({ pressed }) => [styles.followUp, pressed && styles.pressed]}>
        <Ionicons name="arrow-forward-circle-outline" size={22} color={theme.colors.accent} />
        <AppText style={styles.flex}>{item}</AppText>
      </Pressable>)}
    </Card>}
  </View>;
}

function AnalysisList({ title, icon, items }: { title: string; icon: keyof typeof Ionicons.glyphMap; items: string[] }) {
  return <Card>
    <View style={styles.disclosureTitle}><Ionicons name={icon} size={20} color={theme.colors.accent} /><AppText variant="heading">{title}</AppText></View>
    {items.length > 0 ? items.map((item) => <View key={item} style={styles.listItem}><View style={styles.bullet} /><AppText tone="secondary" style={styles.flex}>{item}</AppText></View>) : <AppText tone="muted">No items returned.</AppText>}
  </Card>;
}

const styles = StyleSheet.create({
  disclosure: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.warning },
  disclosureTitle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  companyHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
  pills: { gap: theme.spacing.sm },
  inputContainer: { minHeight: 150, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: theme.spacing.lg },
  input: { minHeight: 100, ...theme.type.body, color: theme.colors.text },
  count: { alignSelf: 'flex-end' },
  center: { textAlign: 'center' },
  results: { gap: theme.spacing.lg },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, marginTop: theme.spacing.sm },
  followUp: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  pressed: { opacity: theme.opacity.pressed },
});
