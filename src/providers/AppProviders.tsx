import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { migrateDatabase } from '@/database/migrations';
import { InvestmentRepository } from '@/database/repositories';
import { createLocalServices } from '@/services/localServices';
import { createMarketDataService } from '@/services/marketDataService';
import { createGeminiService } from '@/services/geminiService';
import { createNewsService } from '@/services/newsService';
import { configureNotificationHandling, createNotificationService } from '@/services/notificationService';
import type { Services } from '@/services/contracts';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });
const ServiceContext = createContext<Services | null>(null);
configureNotificationHandling();

function ResearchTaskScheduler() {
  const services = useContext(ServiceContext);
  const queryClient = useQueryClient();
  const checking = useRef(false);
  const checkDueTasks = useCallback(async (syncReminders = false) => {
    if (!services || checking.current) return;
    checking.current = true;
    let completedTask = false;
    try {
      const tasks = await services.researchTasks.getTasks();
      for (const task of tasks) {
        const due = task.status === 'running' && task.scheduleType === 'time' && task.nextRunAt
          && new Date(task.nextRunAt).getTime() <= Date.now();
        if (due) {
          try { await services.researchTasks.runTask(task.id); completedTask = true; } catch { /* Retry on the next foreground check. */ }
        } else if (syncReminders) {
          await services.notifications.syncTaskReminder(task).catch(() => undefined);
        }
      }
      if (completedTask) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['research-tasks'] }),
          queryClient.invalidateQueries({ queryKey: ['research-task-outputs'] }),
        ]);
      }
    } finally {
      checking.current = false;
    }
  }, [queryClient, services]);

  useEffect(() => {
    void checkDueTasks(true);
    const interval = setInterval(() => { void checkDueTasks(); }, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void checkDueTasks(true); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [checkDueTasks]);
  return null;
}

function ServiceProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const services = useMemo(
    () => createLocalServices(new InvestmentRepository(database), undefined, createMarketDataService(), createGeminiService(), createNewsService(), createNotificationService()),
    [database],
  );
  return <ServiceContext.Provider value={services}><ResearchTaskScheduler />{children}</ServiceContext.Provider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName="investment-os.db" onInit={migrateDatabase} useSuspense>
      <QueryClientProvider client={queryClient}>
        <ServiceProvider>{children}</ServiceProvider>
      </QueryClientProvider>
    </SQLiteProvider>
  );
}

export function useServices(): Services {
  const services = useContext(ServiceContext);
  if (!services) throw new Error('Services are unavailable before application initialization.');
  return services;
}
