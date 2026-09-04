import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppModal, AppText, Button, Card, Divider, EmptyState, LoadingSkeleton, Screen, SectionHeader, Tag } from '@/components';
import {
  useDeleteResearchTask,
  useDuplicateResearchTask,
  useLatestResearchTaskOutputs,
  useResearchTasks,
  useTestResearchNotification,
  useToggleResearchTask,
} from '@/hooks/useAppQueries';
import { theme } from '@/theme';
import type { ResearchTask } from '@/types/domain';

const templates = [
  { category: 'Daily', name: 'Morning Market Brief', prompt: 'Generate a concise market and portfolio research brief every weekday morning.' },
  { category: 'Weekly', name: 'Company Research', prompt: 'Monitor NVIDIA and summarize major company developments every Friday.' },
  { category: 'Monthly', name: 'Industry Review', prompt: 'Create a monthly AI infrastructure industry report.' },
  { category: 'Company', name: 'Earnings Monitor', prompt: 'Alert me whenever a company in my portfolio reports earnings and explain the results.' },
  { category: 'Industry', name: 'Competitor Watch', prompt: 'Compare major developments across NVIDIA, AMD, and custom AI chips each week.' },
  { category: 'Economic', name: 'Federal Reserve Monitor', prompt: 'Explain every Federal Reserve rate decision when it is announced.' },
] as const;

const categories = [
  ['Company Research', 'Products, competitors, earnings, management, and thesis changes.'],
  ['Industry Research', 'Trends, market structure, adoption, and competitive shifts.'],
  ['Portfolio Research', 'Evidence coverage, concentration, open questions, and upcoming events.'],
  ['Market & Economic', 'Market context, inflation, interest rates, and policy events.'],
] as const;

export function AutomationsScreen() {
  const tasksQuery = useResearchTasks();
  const outputsQuery = useLatestResearchTaskOutputs();
  const toggle = useToggleResearchTask();
  const duplicate = useDuplicateResearchTask();
  const remove = useDeleteResearchTask();
  const testNotification = useTestResearchNotification();
  const [taskToDelete, setTaskToDelete] = useState<ResearchTask | null>(null);
  const tasks = tasksQuery.data ?? [];
  const running = tasks.filter((task) => task.status === 'running');
  const updatedToday = tasks.filter((task) => isToday(task.lastRunAt)).length;
  const lastRun = [...tasks].filter((task) => task.lastRunAt).sort((a, b) => (b.lastRunAt ?? '').localeCompare(a.lastRunAt ?? ''))[0]?.lastRunAt;

  return <Screen
    title="Research Tasks"
    subtitle="A team of persistent AI research analysts for recurring company, portfolio, industry, market, and economic work."
    refreshing={tasksQuery.isRefetching || outputsQuery.isRefetching}
    onRefresh={() => { void tasksQuery.refetch(); void outputsQuery.refetch(); }}
  >
    <Card elevated>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Tag label="AI research analysts" tone="positive" />
          <AppText variant="title">Your recurring research, organized</AppText>
          <AppText tone="secondary">Create a task in natural language, review Gemini’s structure, and keep one current output for every workflow.</AppText>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat value={String(running.length)} label="Running" />
        <Stat value={String(updatedToday)} label="Updated today" />
        <Stat value={formatRelative(lastRun)} label="Last AI run" />
      </View>
      <Button label="Create Research Task" icon="add" onPress={() => router.push('/research-task/new')} />
      <Button label="Test iPhone notification" variant="secondary" icon="notifications-outline" onPress={() => testNotification.mutate()} loading={testNotification.isPending} />
      {testNotification.data === 'delivered' ? <AppText variant="caption" style={styles.success}>Test notification sent.</AppText> : null}
      {testNotification.data === 'denied' ? <View style={styles.notificationHelp}>
        <AppText variant="caption" style={styles.error}>Notifications are disabled for AI Investment OS.</AppText>
        <Button label="Open iPhone settings" size="small" variant="ghost" onPress={() => void Linking.openSettings()} />
      </View> : null}
      {testNotification.data === 'unsupported' ? <AppText variant="caption" tone="muted">Test notifications require the iPhone app.</AppText> : null}
      {testNotification.error ? <AppText variant="caption" style={styles.error}>{testNotification.error.message}</AppText> : null}
      <AppText variant="caption" tone="muted">Research only. Tasks never buy, sell, trade, predict prices, or make investment decisions.</AppText>
    </Card>

    <View style={styles.section}>
      <SectionHeader title="Running Tasks" subtitle="View, pause, edit, duplicate, or remove any workflow." />
      {tasksQuery.isLoading ? <><LoadingSkeleton preset="card" /><LoadingSkeleton preset="card" /></> : tasksQuery.error ? <EmptyState title="Research tasks are unavailable" description={tasksQuery.error.message} actionLabel="Try again" onAction={() => void tasksQuery.refetch()} /> : tasks.length === 0 ? <EmptyState title="No research tasks yet" description="Describe the first recurring research job you want handled." actionLabel="Create task" onAction={() => router.push('/research-task/new')} /> : tasks.map((task) =>
        <TaskCard
          key={task.id}
          task={task}
          onView={() => router.push({ pathname: '/research-task/[id]', params: { id: task.id } })}
          onEdit={() => router.push({ pathname: '/research-task/[id]', params: { id: task.id, edit: '1' } })}
          onToggle={() => toggle.mutate(task.id)}
          onDuplicate={() => duplicate.mutate(task.id)}
          onDelete={() => setTaskToDelete(task)}
          busy={toggle.isPending || duplicate.isPending}
        />,
      )}
    </View>

    <View style={styles.section}>
      <SectionHeader title="Latest Outputs" subtitle="Each task keeps exactly one current report or alert." />
      {outputsQuery.isLoading ? <LoadingSkeleton preset="card" /> : (outputsQuery.data?.length ?? 0) > 0 ? outputsQuery.data?.slice(0, 4).map((output) => {
        const task = tasks.find((item) => item.id === output.taskId);
        return <Card key={output.taskId} onPress={() => router.push({ pathname: '/research-task/[id]', params: { id: output.taskId } })}>
          <View style={styles.rowBetween}><Tag label={task?.type === 'alert' ? 'Alert' : 'Report'} /><AppText variant="caption" tone="muted">{formatDate(output.generatedAt)}</AppText></View>
          <AppText variant="heading">{output.title}</AppText>
          <AppText tone="secondary">{output.summary}</AppText>
        </Card>;
      }) : <EmptyState title="No outputs yet" description="Run a task to create its first current output." />}
    </View>

    <View style={styles.section}>
      <SectionHeader title="Recommended Templates" subtitle="Start with a proven research pattern, then edit every field." />
      <View style={styles.grid}>{templates.map((template) => <Card key={template.name} style={styles.gridCard} onPress={() => router.push({ pathname: '/research-task/new', params: { prompt: template.prompt } })}>
        <Tag label={template.category} />
        <AppText variant="heading">{template.name}</AppText>
        <AppText variant="caption" tone="secondary">{template.prompt}</AppText>
      </Card>)}</View>
    </View>

    <View style={styles.section}>
      <SectionHeader title="Task Categories" subtitle="Every workflow belongs to a clear research responsibility." />
      {categories.map(([title, description]) => <Card key={title}>
        <AppText variant="heading">{title}</AppText>
        <AppText tone="secondary">{description}</AppText>
      </Card>)}
    </View>

    <AppModal visible={Boolean(taskToDelete)} title="Delete research task?" onClose={() => setTaskToDelete(null)}>
      <AppText tone="secondary">{taskToDelete ? `This permanently removes “${taskToDelete.name}” and its latest output from this device.` : ''}</AppText>
      <Button label="Delete task" onPress={() => taskToDelete && remove.mutate(taskToDelete.id, { onSuccess: () => setTaskToDelete(null) })} loading={remove.isPending} />
      <Button label="Keep task" variant="ghost" onPress={() => setTaskToDelete(null)} disabled={remove.isPending} />
    </AppModal>
  </Screen>;
}

function TaskCard({ task, onView, onEdit, onToggle, onDuplicate, onDelete, busy }: {
  task: ResearchTask; onView: () => void; onEdit: () => void; onToggle: () => void; onDuplicate: () => void; onDelete: () => void; busy: boolean;
}) {
  return <Card elevated={task.status === 'running'}>
    <View style={styles.rowBetween}>
      <View style={styles.tags}><Tag label={task.type === 'report' ? 'Report' : 'Alert'} /><Tag label={task.status === 'running' ? 'Running' : 'Paused'} tone={task.status === 'running' ? 'positive' : 'warning'} /></View>
      <AppText variant="caption" tone="muted">{task.scheduleType === 'time' ? 'Scheduled' : 'Event driven'}</AppText>
    </View>
    <AppText variant="title">{task.name}</AppText>
    <AppText tone="secondary">{task.description}</AppText>
    <View style={styles.tags}>{task.monitors.slice(0, 4).map((monitor) => <Tag key={monitor} label={monitor} />)}</View>
    <Divider />
    <Meta label="Schedule" value={task.scheduleLabel} />
    <Meta label="Last run" value={formatDate(task.lastRunAt, 'Not run yet')} />
    <Meta label="Next run" value={task.status === 'paused' ? 'Paused' : formatDate(task.nextRunAt, task.scheduleType === 'event' ? 'Waiting for event' : 'Not scheduled')} />
    <View style={styles.buttons}>
      <Button label="View" size="small" onPress={onView} />
      <Button label={task.status === 'running' ? 'Pause' : 'Resume'} size="small" variant="secondary" onPress={onToggle} disabled={busy} />
      <Button label="Edit" size="small" variant="secondary" onPress={onEdit} />
      <Button label="Duplicate" size="small" variant="ghost" onPress={onDuplicate} disabled={busy} />
      <Button label="Delete" size="small" variant="ghost" onPress={onDelete} />
    </View>
  </Card>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <View style={styles.meta}><AppText variant="caption" tone="muted">{label}</AppText><AppText variant="caption" style={styles.flex}>{value}</AppText></View>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><AppText variant="title">{value}</AppText><AppText variant="caption" tone="muted">{label}</AppText></View>;
}

function isToday(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function formatDate(value?: string, fallback = 'Unavailable'): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatRelative(value?: string): string {
  if (!value) return 'Never';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1_440)}d ago`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: theme.spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  stats: { flexDirection: 'row', gap: theme.spacing.sm },
  stat: { flex: 1, minHeight: 76, justifyContent: 'center', padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceElevated },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  gridCard: { width: '47%', minWidth: 150 },
  notificationHelp: { gap: theme.spacing.sm },
  success: { color: theme.colors.positive },
  error: { color: theme.colors.negative },
});
