import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen, SectionHeader, Tag } from '@/components';
import { TaskConfigurationEditor } from './TaskConfigurationEditor';
import { useCreateResearchTask, useStructureResearchTask } from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { ResearchTaskDraft } from '@/types/domain';

const examples = [
  'Monitor NVIDIA and summarize major developments every Friday.',
  'Alert me whenever a company in my portfolio reports earnings.',
  'Create a monthly AI infrastructure industry report.',
];

function starterDraft(prompt: string): ResearchTaskDraft {
  return {
    name: 'New Research Task',
    type: /alert|whenever|when /i.test(prompt) ? 'alert' : 'report',
    description: prompt.trim(),
    monitors: ['Portfolio', 'Market developments'],
    scheduleType: /whenever|when |event/i.test(prompt) ? 'event' : 'time',
    scheduleLabel: /whenever|when |event/i.test(prompt) ? 'Whenever the described event occurs' : 'Every week',
    reportStyle: 'standard',
    delivery: { notifyWhenReady: true, showOnHome: true, alertCenter: true },
  };
}

export function CreateResearchTaskScreen() {
  const params = useLocalSearchParams<{ prompt?: string | string[] }>();
  const initialPrompt = Array.isArray(params.prompt) ? params.prompt[0] ?? '' : params.prompt ?? '';
  const [prompt, setPrompt] = useState(initialPrompt);
  const [draft, setDraft] = useState<ResearchTaskDraft | null>(null);
  const structure = useStructureResearchTask();
  const create = useCreateResearchTask();
  const canStructure = useMemo(() => prompt.trim().length >= 8, [prompt]);

  const structurePrompt = () => {
    structure.mutate(prompt.trim(), { onSuccess: setDraft });
  };
  const save = () => {
    if (!draft) return;
    create.mutate({ prompt, draft }, {
      onSuccess: (task) => router.replace({ pathname: '/research-task/[id]', params: { id: task.id } }),
    });
  };

  return <Screen
    title="Create Research Task"
    subtitle="Describe the outcome in plain language. Gemini will turn it into an editable research workflow."
  >
    <Card elevated>
      <Tag label="Step 1 · Describe it" tone="positive" />
      <AppText variant="heading">What should your research analysts do?</AppText>
      <TextInput
        accessibilityLabel="Research task description"
        value={prompt}
        onChangeText={(value) => { setPrompt(value); setDraft(null); structure.reset(); }}
        multiline
        maxLength={1_000}
        placeholder="Monitor NVIDIA and summarize major developments every Friday."
        placeholderTextColor={theme.colors.textMuted}
        style={styles.promptInput}
        textAlignVertical="top"
      />
      <AppText variant="caption" tone="muted">Include the companies or topics, the trigger or schedule, and the output you want.</AppText>
      <Button label="Let Gemini structure this task" icon="sparkles" onPress={structurePrompt} loading={structure.isPending} disabled={!canStructure} />
    </Card>

    {!draft && <View style={styles.section}>
      <SectionHeader title="Try an example" />
      {examples.map((example) => <Card key={example} onPress={() => setPrompt(example)} padding="lg"><AppText>{example}</AppText></Card>)}
    </View>}

    {structure.error && !draft ? <EmptyState
      title="Gemini couldn’t structure this task"
      description={structure.error.message}
      actionLabel="Use starter configuration"
      onAction={() => setDraft(starterDraft(prompt))}
    /> : null}

    {draft && <Card>
      <TaskConfigurationEditor draft={draft} onChange={setDraft} />
    </Card>}

    {draft && <View style={styles.actions}>
      {create.error ? <AppText style={styles.error}>{create.error.message}</AppText> : null}
      <Button label="Create Research Task" icon="checkmark" onPress={save} loading={create.isPending} />
      <Button label="Start over" variant="ghost" onPress={() => { setDraft(null); structure.reset(); }} disabled={create.isPending} />
    </View>}

    <Card padding="lg">
      <AppText variant="heading">Research-only boundary</AppText>
      <AppText tone="secondary">Tasks summarize evidence and explain relevance. They never buy, sell, trade, predict prices, or make investment decisions.</AppText>
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  promptInput: {
    minHeight: 170,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
    ...theme.type.body,
    padding: theme.spacing.lg,
  },
  section: { gap: theme.spacing.md },
  actions: { gap: theme.spacing.md },
  error: { color: theme.colors.negative },
});
