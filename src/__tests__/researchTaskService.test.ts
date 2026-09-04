import { seedCompanies } from '@/database/seedData';
import type { InvestmentRepository } from '@/database/repositories';
import { createLocalServices } from '@/services/localServices';
import { createOfflineMarketDataService } from '@/services/marketDataService';
import type { AIService, NewsService, NotificationService } from '@/services/contracts';
import type { ResearchTask, ResearchTaskDraft, ResearchTaskOutput } from '@/types/domain';

const draft: ResearchTaskDraft = {
  name: 'Weekly NVIDIA Research',
  type: 'report',
  description: 'Summarize the latest saved and live NVIDIA evidence.',
  monitors: ['NVIDIA', 'Semiconductors'],
  scheduleType: 'time',
  scheduleLabel: 'Every Friday at 6:00 PM',
  reportStyle: 'analyst',
  delivery: { notifyWhenReady: true, showOnHome: true, alertCenter: true },
};

function createHarness() {
  const tasks = new Map<string, ResearchTask>();
  const outputs = new Map<string, ResearchTaskOutput>();
  const repository = {
    researchTasks: jest.fn(async () => Array.from(tasks.values())),
    researchTask: jest.fn(async (id: string) => tasks.get(id) ?? null),
    researchTaskOutputs: jest.fn(async () => Array.from(outputs.values())),
    insertResearchTask: jest.fn(async (task: ResearchTask) => { tasks.set(task.id, task); return task; }),
    updateResearchTask: jest.fn(async (task: ResearchTask) => { tasks.set(task.id, task); return task; }),
    deleteResearchTask: jest.fn(async (id: string) => { tasks.delete(id); outputs.delete(id); }),
    saveResearchTaskOutput: jest.fn(async (output: ResearchTaskOutput) => { outputs.set(output.taskId, output); return output; }),
    companies: jest.fn(async () => seedCompanies),
    portfolio: jest.fn(async () => []),
  } as unknown as InvestmentRepository;
  const ai: AIService = {
    analyzeCompany: jest.fn(async () => { throw new Error('Not used'); }),
    summarizeNews: jest.fn(async () => { throw new Error('Not used'); }),
    structureResearchTask: jest.fn(async () => draft),
    generateResearchTaskOutput: jest.fn(async (task) => ({
      title: task.name,
      summary: 'Evidence-only research summary.',
      sections: [{ title: 'What changed', bullets: ['No recommendation or price prediction was produced.'] }],
    })),
  };
  const news: NewsService = { getCompanyNews: jest.fn(async () => []) };
  const notifications: NotificationService = {
    syncTaskReminder: jest.fn(async () => 'scheduled'),
    cancelTaskReminder: jest.fn(async () => undefined),
    notifyTaskCompleted: jest.fn(async () => 'delivered'),
    sendTestNotification: jest.fn(async () => 'delivered'),
  };
  const services = createLocalServices(repository, { delayMs: 0 }, createOfflineMarketDataService(), ai, news, notifications);
  return { services, tasks, outputs, repository, ai, notifications };
}

describe('research task service', () => {
  it('creates, pauses, resumes, and duplicates a persistent task', async () => {
    const { services, notifications } = createHarness();
    const created = await services.researchTasks.createTask('Monitor NVIDIA every Friday.', draft);

    expect(created).toMatchObject({ status: 'running', type: 'report', reportStyle: 'analyst' });
    expect(new Date(created.nextRunAt ?? '').getDay()).toBe(5);
    expect(new Date(created.nextRunAt ?? '').getHours()).toBe(18);
    expect(notifications.syncTaskReminder).toHaveBeenCalledWith(created);
    await expect(services.researchTasks.toggleTask(created.id)).resolves.toMatchObject({ status: 'paused', nextRunAt: undefined });
    await expect(services.researchTasks.toggleTask(created.id)).resolves.toMatchObject({ status: 'running' });
    await expect(services.researchTasks.duplicateTask(created.id)).resolves.toMatchObject({ name: 'Weekly NVIDIA Research Copy', status: 'paused', lastRunAt: undefined });
  });

  it('keeps exactly one latest output per task when a task runs again', async () => {
    const { services, outputs, repository, ai, notifications } = createHarness();
    const created = await services.researchTasks.createTask('Monitor NVIDIA every Friday.', draft);

    const first = await services.researchTasks.runTask(created.id);
    const second = await services.researchTasks.runTask(created.id);

    expect(first.taskId).toBe(created.id);
    expect(second.taskId).toBe(created.id);
    expect(outputs.size).toBe(1);
    expect(repository.saveResearchTaskOutput).toHaveBeenCalledTimes(2);
    expect(notifications.notifyTaskCompleted).toHaveBeenCalledTimes(2);
    expect(ai.generateResearchTaskOutput).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.id }),
      expect.objectContaining({ companies: [expect.objectContaining({ ticker: 'NVDA' })] }),
    );
  });

  it('deletes the task and its owned output through the repository boundary', async () => {
    const { services, tasks, outputs, notifications } = createHarness();
    const created = await services.researchTasks.createTask('Monitor NVIDIA every Friday.', draft);
    await services.researchTasks.runTask(created.id);

    await services.researchTasks.deleteTask(created.id);

    expect(tasks.has(created.id)).toBe(false);
    expect(outputs.has(created.id)).toBe(false);
    expect(notifications.cancelTaskReminder).toHaveBeenCalledWith(created.id);
  });
});
