import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationResult, NotificationService } from './contracts';

const reminderIdentifier = (taskId: string) => `research-task-due-${taskId}`;

function canNotify(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    || status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

async function requestNotificationAccess(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (canNotify(current)) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return canNotify(requested);
}

/** Ensures local notifications are visible even while the app is open. */
export function configureNotificationHandling(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function sendImmediate(title: string, body: string, data: Record<string, string>): Promise<NotificationResult> {
  if (Platform.OS === 'web') return 'unsupported';
  if (!await requestNotificationAccess()) return 'denied';
  await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default', data }, trigger: null });
  return 'delivered';
}

export function createNotificationService(): NotificationService {
  return {
    async syncTaskReminder(task) {
      if (Platform.OS === 'web') return 'unsupported';
      await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(task.id)).catch(() => undefined);
      if (task.status !== 'running' || task.scheduleType !== 'time' || !task.nextRunAt || !task.delivery.alertCenter) return 'unsupported';
      const date = new Date(task.nextRunAt);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return 'unsupported';
      if (!await requestNotificationAccess()) return 'denied';
      await Notifications.scheduleNotificationAsync({
        identifier: reminderIdentifier(task.id),
        content: {
          title: `${task.name} is due`,
          body: 'Open AI Investment OS to run this research task.',
          sound: 'default',
          data: { researchTaskId: task.id, notificationKind: 'task-due' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
      return 'scheduled';
    },
    async cancelTaskReminder(taskId) {
      if (Platform.OS !== 'web') await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(taskId)).catch(() => undefined);
    },
    async notifyTaskCompleted(task, output) {
      if (!task.delivery.notifyWhenReady) return 'unsupported';
      return sendImmediate(`${task.name} is ready`, output.summary, { researchTaskId: task.id, notificationKind: 'task-complete' });
    },
    sendTestNotification: () => sendImmediate(
      'Research Task notifications are on',
      'You’ll receive an iPhone notification when enabled research tasks finish.',
      { notificationKind: 'test' },
    ),
  };
}
