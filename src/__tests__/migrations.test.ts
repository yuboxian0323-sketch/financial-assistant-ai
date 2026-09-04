import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDatabase } from '@/database/migrations';

describe('database migrations', () => {
  it('applies versioned task seeds exactly once across repeated initialization', async () => {
    let userVersion = 0;
    const seedVersions = new Set<number>();
    const statements: string[] = [];
    const run = async (sql: string, ...params: unknown[]) => {
      statements.push(sql);
      if (sql.includes('INSERT INTO seed_versions')) seedVersions.add(Number(params[0]));
      return {};
    };
    const database = {
      execAsync: jest.fn(async (sql: string) => {
        statements.push(sql);
        const match = sql.match(/PRAGMA user_version = (\d+)/);
        if (match?.[1]) userVersion = Number(match[1]);
      }),
      getFirstAsync: jest.fn(async (sql: string, version?: number) => {
        if (sql.includes('PRAGMA user_version')) return { user_version: userVersion };
        if (sql.includes('seed_versions')) return seedVersions.has(Number(version)) ? { version } : null;
        return null;
      }),
      getAllAsync: jest.fn(async () => []),
      runAsync: jest.fn(run),
      withExclusiveTransactionAsync: jest.fn(async (work: (transaction: { runAsync: typeof run }) => Promise<void>) => work({ runAsync: run })),
    } as unknown as SQLiteDatabase;

    await migrateDatabase(database);
    const firstTaskSeedCount = statements.filter((sql) => sql.includes('INSERT INTO research_tasks')).length;
    const firstOutputSeedCount = statements.filter((sql) => sql.includes('INSERT INTO research_task_outputs')).length;
    await migrateDatabase(database);

    expect(userVersion).toBe(3);
    expect(seedVersions).toEqual(new Set([1, 2]));
    expect(firstTaskSeedCount).toBe(5);
    expect(firstOutputSeedCount).toBe(3);
    expect(statements.filter((sql) => sql.includes('INSERT INTO research_tasks'))).toHaveLength(firstTaskSeedCount);
    expect(statements.filter((sql) => sql.includes('INSERT INTO research_task_outputs'))).toHaveLength(firstOutputSeedCount);
  });
});
