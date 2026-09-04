import { StyleSheet, TextInput, View } from 'react-native';
import { AppText, Pill, SectionHeader } from '@/components';
import { theme } from '@/theme';
import type { ResearchReportStyle, ResearchTaskDraft, ResearchTaskType } from '@/types/domain';
import { calculateNextResearchRun } from '@/utils/researchSchedule';

const reportStyles: { value: ResearchReportStyle; label: string; description: string }[] = [
  { value: 'snapshot', label: 'Snapshot', description: 'Quick facts and the most important changes.' },
  { value: 'standard', label: 'Standard', description: 'Balanced recurring research report.' },
  { value: 'analyst', label: 'Analyst', description: 'Deeper evidence, risks, and open questions.' },
  { value: 'deep-research', label: 'Deep Research', description: 'Longest format with multiple research sections.' },
];

function Field({ label, value, onChangeText, multiline, placeholder }: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return <View style={styles.field}>
    <AppText variant="heading">{label}</AppText>
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      style={[styles.input, multiline && styles.multiline]}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>;
}

export function TaskConfigurationEditor({ draft, onChange }: { draft: ResearchTaskDraft; onChange: (draft: ResearchTaskDraft) => void }) {
  const nextRunAt = calculateNextResearchRun(draft.scheduleType, draft.scheduleLabel);
  const setType = (type: ResearchTaskType) => onChange({
    ...draft,
    type,
    reportStyle: type === 'report' ? (draft.reportStyle ?? 'standard') : undefined,
  });
  const toggleDelivery = (key: keyof ResearchTaskDraft['delivery']) => onChange({
    ...draft,
    delivery: { ...draft.delivery, [key]: !draft.delivery[key] },
  });
  return <View style={styles.container}>
    <SectionHeader title="Task Configuration" subtitle="Review Gemini’s structure before saving." />
    <Field label="Task name" value={draft.name} onChangeText={(name) => onChange({ ...draft, name })} />
    <Field label="Description" value={draft.description} onChangeText={(description) => onChange({ ...draft, description })} multiline />
    <View style={styles.field}>
      <AppText variant="heading">Task type</AppText>
      <View style={styles.wrap}>
        <Pill label="Report" selected={draft.type === 'report'} onPress={() => setType('report')} />
        <Pill label="Alert" selected={draft.type === 'alert'} onPress={() => setType('alert')} />
      </View>
    </View>
    <Field
      label="What it monitors"
      value={draft.monitors.join(', ')}
      onChangeText={(value) => onChange({ ...draft, monitors: value.split(',').map((item) => item.trim()) })}
      placeholder="NVIDIA, competitors, earnings"
      multiline
    />
    <View style={styles.field}>
      <AppText variant="heading">Schedule trigger</AppText>
      <View style={styles.wrap}>
        <Pill label="Scheduled time" selected={draft.scheduleType === 'time'} onPress={() => onChange({ ...draft, scheduleType: 'time' })} />
        <Pill label="Event driven" selected={draft.scheduleType === 'event'} onPress={() => onChange({ ...draft, scheduleType: 'event' })} />
      </View>
    </View>
    <Field
      label="Schedule"
      value={draft.scheduleLabel}
      onChangeText={(scheduleLabel) => onChange({ ...draft, scheduleLabel })}
      placeholder={draft.scheduleType === 'time' ? 'Every Friday at 6:00 PM' : 'Whenever earnings are released'}
    />
    <AppText variant="caption" tone="muted">
      {nextRunAt ? `Next local run: ${new Date(nextRunAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Next run: waiting for the described event'}
    </AppText>
    {draft.type === 'report' && <View style={styles.field}>
      <AppText variant="heading">Report style</AppText>
      <View style={styles.wrap}>{reportStyles.map((style) =>
        <Pill key={style.value} label={style.label} selected={draft.reportStyle === style.value} onPress={() => onChange({ ...draft, reportStyle: style.value })} />,
      )}</View>
      <AppText tone="secondary">{reportStyles.find((style) => style.value === draft.reportStyle)?.description}</AppText>
    </View>}
    <View style={styles.field}>
      <AppText variant="heading">Delivery</AppText>
      <View style={styles.wrap}>
        <Pill label="Notify when ready" selected={draft.delivery.notifyWhenReady} onPress={() => toggleDelivery('notifyWhenReady')} />
        <Pill label="Show on Home" selected={draft.delivery.showOnHome} onPress={() => toggleDelivery('showOnHome')} />
        <Pill label="Alert Center" selected={draft.delivery.alertCenter} onPress={() => toggleDelivery('alertCenter')} />
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.lg },
  field: { gap: theme.spacing.sm },
  input: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
    ...theme.type.body,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  multiline: { minHeight: 92 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
