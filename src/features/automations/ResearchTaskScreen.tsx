import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppModal, AppText, Button, Card, Divider, EmptyState, LoadingSkeleton, Screen, SectionHeader, Tag } from '@/components';
import { TaskConfigurationEditor } from './TaskConfigurationEditor';
import {
  useDeleteResearchTask,
  useDuplicateResearchTask,
  useLatestResearchTaskOutputs,
  useResearchTask,
  useRunResearchTask,
  useToggleResearchTask,
  useUpdateResearchTask,
} from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { ResearchTaskDraft } from '@/types/domain';

export function ResearchTaskScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; edit?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';
  const taskQuery = useResearchTask(id);
  const outputsQuery = useLatestResearchTaskOutputs();
  const toggle = useToggleResearchTask();
  const duplicate = useDuplicateResearchTask();
  const remove = useDeleteResearchTask();
  const run = useRunResearchTask();
  const update = useUpdateResearchTask();
  const editParam = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const [editing, setEditing] = useState(editParam === '1');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [draft, setDraft] = useState<ResearchTaskDraft | null>(null);
  const task = taskQuery.data;
  const output = outputsQuery.data?.find((item) => item.taskId === id);

  useEffect(() => { if (task) setDraft(task); }, [task]);

  if (taskQuery.isLoading) return <Screen title="Research Task"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  if (taskQuery.error || !task) return <Screen title="Research Task"><EmptyState title="Task unavailable" description={taskQuery.error?.message ?? 'This research task no longer exists.'} actionLabel="Back to Research Tasks" onAction={() => router.replace('/automations')} /></Screen>;

  const saveEdits = () => {
    if (!draft) return;
    update.mutate({ ...task, ...draft }, { onSuccess: () => setEditing(false) });
  };

  return <Screen title={task.name} subtitle="A persistent research workflow with one current output.">
    <Card elevated>
      <View style={styles.rowBetween}>
        <View style={styles.tags}>
          <Tag label={task.type === 'report' ? 'Report' : 'Alert'} />
          <Tag label={task.status === 'running' ? 'Running' : 'Paused'} tone={task.status === 'running' ? 'positive' : 'warning'} />
        </View>
        <AppText variant="caption" tone="muted">{task.scheduleType === 'time' ? 'Scheduled' : 'Event driven'}</AppText>
      </View>
      <AppText tone="secondary">{task.description}</AppText>
      <Divider />
      <Meta label="Schedule" value={task.scheduleLabel} />
      <Meta label="Monitors" value={task.monitors.join(' · ')} />
      {task.reportStyle ? <Meta label="Report style" value={formatStyle(task.reportStyle)} /> : null}
      <Meta label="Last run" value={formatDate(task.lastRunAt, 'Not run yet')} />
      <Meta label="Next local run" value={task.status === 'paused' ? 'Paused' : formatDate(task.nextRunAt, task.scheduleType === 'event' ? 'Waiting for event' : 'Not scheduled')} />
      <Meta label="iPhone notification" value={task.delivery.notifyWhenReady ? 'When the report is ready' : 'Off'} />
      <AppText variant="caption" tone="muted">Times use your iPhone’s local timezone. Alert Center schedules a due reminder, while Notify when ready sends a banner after “Run now” finishes. Fully unattended AI execution still requires the secure scheduler deployment.</AppText>
    </Card>

    <View style={styles.actions}>
      <Button label={run.isPending ? 'Running research…' : 'Run now'} icon="sparkles" onPress={() => run.mutate(task.id)} loading={run.isPending} />
      <Button label={task.status === 'running' ? 'Pause task' : 'Resume task'} variant="secondary" icon={task.status === 'running' ? 'pause' : 'play'} onPress={() => toggle.mutate(task.id)} loading={toggle.isPending} />
      <Button label={editing ? 'Cancel editing' : 'Edit configuration'} variant="secondary" icon="create-outline" onPress={() => setEditing((value) => !value)} />
    </View>

    {run.error ? <EmptyState title="This run didn’t finish" description={run.error.message} actionLabel="Try again" onAction={() => run.mutate(task.id)} /> : null}

    {editing && draft ? <Card>
      <TaskConfigurationEditor draft={draft} onChange={setDraft} />
      {update.error ? <AppText style={styles.error}>{update.error.message}</AppText> : null}
      <Button label="Save changes" onPress={saveEdits} loading={update.isPending} />
    </Card> : null}

    <View style={styles.section}>
      <SectionHeader title="Latest Output" subtitle="A new successful run replaces this output." />
      {outputsQuery.isLoading ? <LoadingSkeleton preset="card" /> : output ? <Card elevated>
        <View style={styles.rowBetween}>
          <Tag label="Latest" tone="positive" />
          <AppText variant="caption" tone="muted">{formatDate(output.generatedAt, '')}</AppText>
        </View>
        <AppText variant="title">{output.title}</AppText>
        <AppText tone="secondary">{output.summary}</AppText>
        {output.sections.map((section) => <View key={section.title} style={styles.outputSection}>
          <Divider />
          <AppText variant="heading">{section.title}</AppText>
          {section.bullets.map((bullet) => <View key={bullet} style={styles.bulletRow}><View style={styles.bullet} /><AppText tone="secondary" style={styles.flex}>{bullet}</AppText></View>)}
        </View>)}
      </Card> : <EmptyState title="No output yet" description="Run this task to create its first research output." actionLabel="Run now" onAction={() => run.mutate(task.id)} />}
    </View>

    <Card>
      <SectionHeader title="Task Management" />
      <Button label="Duplicate task" variant="secondary" icon="copy-outline" onPress={() => duplicate.mutate(task.id, { onSuccess: (copy) => router.push({ pathname: '/research-task/[id]', params: { id: copy.id } }) })} loading={duplicate.isPending} />
      <Button label="Delete task" variant="ghost" icon="trash-outline" onPress={() => setDeleteVisible(true)} />
    </Card>

    <AppModal visible={deleteVisible} title="Delete research task?" onClose={() => setDeleteVisible(false)}>
      <AppText tone="secondary">This removes the task and its latest output from this device. It cannot be undone.</AppText>
      <Button label="Delete task" onPress={() => remove.mutate(task.id, { onSuccess: () => router.replace('/automations') })} loading={remove.isPending} />
      <Button label="Keep task" variant="ghost" onPress={() => setDeleteVisible(false)} disabled={remove.isPending} />
    </AppModal>
  </Screen>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <View style={styles.meta}><AppText variant="caption" tone="muted">{label}</AppText><AppText style={styles.flex}>{value}</AppText></View>;
}

function formatDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatStyle(value: string): string {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  actions: { gap: theme.spacing.sm },
  section: { gap: theme.spacing.md },
  outputSection: { gap: theme.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  bullet: { width: 7, height: 7, marginTop: theme.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent },
  error: { color: theme.colors.negative },
});
