import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BulletList, Button, Card, ConfirmModal, Divider, EmptyState, LoadingSkeleton, MetadataRow, Screen, SectionHeader, Tag } from '@/components';
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
import { formatDateTime, titleCase } from '@/utils/format';

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

  if (taskQuery.isLoading) return <Screen title="Research Task"><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></Screen>;
  if (taskQuery.error || !task) return <Screen title="Research Task"><EmptyState title="Task unavailable" description={taskQuery.error?.message ?? 'This research task no longer exists.'} actionLabel="Back to Research Tasks" onAction={() => router.replace('/automations')} /></Screen>;

  const saveEdits = () => {
    update.mutate({ ...task, ...(draft ?? task) }, { onSuccess: () => setEditing(false) });
  };

  const toggleEditing = () => {
    if (editing) {
      setEditing(false);
      setDraft(null);
    } else {
      setDraft(task);
      setEditing(true);
    }
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
      <MetadataRow label="Schedule" value={task.scheduleLabel} />
      <MetadataRow label="Monitors" value={task.monitors.join(' · ')} />
      {task.reportStyle ? <MetadataRow label="Report style" value={titleCase(task.reportStyle)} /> : null}
      <MetadataRow label="Last run" value={formatDateTime(task.lastRunAt, 'Not run yet')} />
      <MetadataRow label="Next local run" value={task.status === 'paused' ? 'Paused' : formatDateTime(task.nextRunAt, task.scheduleType === 'event' ? 'Waiting for event' : 'Not scheduled')} />
      <MetadataRow label="iPhone notification" value={task.delivery.notifyWhenReady ? 'When the report is ready' : 'Off'} />
      <AppText variant="caption" tone="muted">Times use your iPhone’s local timezone. Alert Center schedules a due reminder, while Notify when ready sends a banner after “Run now” finishes. Fully unattended AI execution still requires the secure scheduler deployment.</AppText>
    </Card>

    <View style={styles.actions}>
      <Button label={run.isPending ? 'Running research…' : 'Run now'} icon="sparkles" onPress={() => run.mutate(task.id)} loading={run.isPending} />
      <Button label={task.status === 'running' ? 'Pause task' : 'Resume task'} variant="secondary" icon={task.status === 'running' ? 'pause' : 'play'} onPress={() => toggle.mutate(task.id)} loading={toggle.isPending} />
      <Button label={editing ? 'Cancel editing' : 'Edit configuration'} variant="secondary" icon="create-outline" onPress={toggleEditing} />
    </View>

    {run.error ? <EmptyState title="This run didn’t finish" description={run.error.message} actionLabel="Try again" onAction={() => run.mutate(task.id)} /> : null}

    {editing ? <Card>
      <TaskConfigurationEditor draft={draft ?? task} onChange={setDraft} />
      {update.error ? <AppText style={styles.error}>{update.error.message}</AppText> : null}
      <Button label="Save changes" onPress={saveEdits} loading={update.isPending} />
    </Card> : null}

    <View style={styles.section}>
      <SectionHeader title="Latest Output" subtitle="A new successful run replaces this output." />
      {outputsQuery.isLoading ? <LoadingSkeleton preset="card" /> : output ? <Card elevated>
        <View style={styles.rowBetween}>
          <Tag label="Latest" tone="positive" />
          <AppText variant="caption" tone="muted">{formatDateTime(output.generatedAt, '')}</AppText>
        </View>
        <AppText variant="title">{output.title}</AppText>
        <AppText tone="secondary">{output.summary}</AppText>
        {output.sections.map((section) => <View key={section.title} style={styles.outputSection}>
          <Divider />
          <AppText variant="heading">{section.title}</AppText>
          <BulletList items={section.bullets} />
        </View>)}
      </Card> : <EmptyState title="No output yet" description="Run this task to create its first research output." actionLabel="Run now" onAction={() => run.mutate(task.id)} />}
    </View>

    <Card>
      <SectionHeader title="Task Management" />
      <Button label="Duplicate task" variant="secondary" icon="copy-outline" onPress={() => duplicate.mutate(task.id, { onSuccess: (copy) => router.push({ pathname: '/research-task/[id]', params: { id: copy.id } }) })} loading={duplicate.isPending} />
      <Button label="Delete task" variant="ghost" icon="trash-outline" onPress={() => setDeleteVisible(true)} />
    </Card>

    <ConfirmModal visible={deleteVisible} title="Delete research task?" description="This removes the task and its latest output from this device. It cannot be undone." confirmLabel="Delete task" cancelLabel="Keep task" loading={remove.isPending} onClose={() => setDeleteVisible(false)} onConfirm={() => remove.mutate(task.id, { onSuccess: () => router.replace('/automations') })} />
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  actions: { gap: theme.spacing.sm },
  section: { gap: theme.spacing.md },
  outputSection: { gap: theme.spacing.sm },
  error: { color: theme.colors.negative },
});
