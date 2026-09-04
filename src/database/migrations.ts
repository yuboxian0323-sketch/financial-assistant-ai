import type { SQLiteDatabase } from 'expo-sqlite';
import { contentRows, seedCompanies } from './seedData';
import { calculateNextResearchRun } from '@/utils/researchSchedule';

const DATABASE_VERSION = 3;
const FOUNDATION_SEED_VERSION = 1;
const TASK_SEED_VERSION = 2;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS seed_versions (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY, ticker TEXT NOT NULL UNIQUE, name TEXT NOT NULL, industry TEXT NOT NULL,
        overview TEXT NOT NULL, ai_summary TEXT NOT NULL, bull_thesis TEXT NOT NULL, bear_thesis TEXT NOT NULL,
        price REAL NOT NULL, daily_change REAL NOT NULL, financials_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS portfolio (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL UNIQUE REFERENCES companies(id), shares REAL NOT NULL,
        average_cost REAL NOT NULL, notes TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL UNIQUE REFERENCES companies(id), created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL,
        body TEXT NOT NULL, occurred_at TEXT NOT NULL, importance INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS research (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL,
        body TEXT NOT NULL, kind TEXT NOT NULL, occurred_at TEXT NOT NULL, importance INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL,
        body TEXT NOT NULL, occurred_at TEXT NOT NULL, importance INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL,
        body TEXT NOT NULL, occurred_at TEXT NOT NULL, importance INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_notes_company ON notes(company_id);
      CREATE INDEX IF NOT EXISTS idx_research_company_kind ON research(company_id, kind);
      CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
    `);
    await db.runAsync('INSERT OR IGNORE INTO schema_migrations VALUES (?, ?)', 1, new Date().toISOString());
    await db.execAsync('PRAGMA user_version = 1');
  }
  await seedFoundation(db);
  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS research_tasks (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, task_type TEXT NOT NULL, status TEXT NOT NULL,
        prompt TEXT NOT NULL, description TEXT NOT NULL, monitors_json TEXT NOT NULL,
        schedule_type TEXT NOT NULL, schedule_label TEXT NOT NULL, report_style TEXT,
        delivery_json TEXT NOT NULL, last_run_at TEXT, next_run_at TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS research_task_outputs (
        task_id TEXT PRIMARY KEY REFERENCES research_tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL, summary TEXT NOT NULL, sections_json TEXT NOT NULL, generated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_research_tasks_status_next ON research_tasks(status, next_run_at);
    `);
    await db.runAsync('INSERT OR IGNORE INTO schema_migrations VALUES (?, ?)', 2, new Date().toISOString());
    await db.execAsync('PRAGMA user_version = 2');
  }
  await seedResearchTasks(db);
  if (currentVersion < 3) {
    const tasks = await db.getAllAsync<{
      id: string; status: 'running' | 'paused'; schedule_type: 'time' | 'event'; schedule_label: string;
    }>('SELECT id, status, schedule_type, schedule_label FROM research_tasks');
    const now = new Date();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const task of tasks) {
        const nextRunAt = task.status === 'running'
          ? calculateNextResearchRun(task.schedule_type, task.schedule_label, now) ?? null
          : null;
        await transaction.runAsync('UPDATE research_tasks SET next_run_at = ? WHERE id = ?', nextRunAt, task.id);
      }
      await transaction.runAsync('INSERT OR IGNORE INTO schema_migrations VALUES (?, ?)', 3, now.toISOString());
    });
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}

async function seedFoundation(db: SQLiteDatabase): Promise<void> {
  const seeded = await db.getFirstAsync<{ version: number }>('SELECT version FROM seed_versions WHERE version = ?', FOUNDATION_SEED_VERSION);
  if (seeded) return;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const now = new Date().toISOString();
    for (const company of seedCompanies) {
      await transaction.runAsync(
        `INSERT INTO companies VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        company.id, company.ticker, company.name, company.industry, company.overview, company.aiSummary,
        company.bullThesis, company.bearThesis, company.price, company.dailyChange, JSON.stringify(company.financials), now,
      );
    }
    for (const item of contentRows) {
      const table = item.kind === 'note' ? 'notes' : item.kind === 'report' ? 'reports' : item.kind === 'conversation' ? 'conversations' : 'research';
      if (table === 'research') {
        await transaction.runAsync(`INSERT INTO research VALUES (?, ?, ?, ?, ?, ?, ?)`, item.id, item.companyId, item.title, item.body, item.kind, item.occurredAt, item.importance);
      } else {
        await transaction.runAsync(`INSERT INTO ${table} VALUES (?, ?, ?, ?, ?, ?)`, item.id, item.companyId, item.title, item.body, item.occurredAt, item.importance);
      }
    }
    const holdings = [['holding-nvda', 'nvda', 24, 108.20, 'Core AI infrastructure exposure.'], ['holding-msft', 'msft', 12, 391.40, 'Durable enterprise distribution.'], ['holding-tsm', 'tsm', 18, 168.75, 'Advanced-node manufacturing leader.']] as const;
    for (const holding of holdings) await transaction.runAsync('INSERT INTO portfolio VALUES (?, ?, ?, ?, ?, ?)', ...holding, now);
    for (const id of ['nvda', 'meta', 'msft', 'googl', 'amd', 'aapl', 'tsm']) await transaction.runAsync('INSERT INTO watchlist VALUES (?, ?, ?)', `watch-${id}`, id, now);
    await transaction.runAsync('INSERT INTO settings VALUES (?, ?, ?)', 'previous_session_at', '2026-07-30T08:30:00Z', now);
    await transaction.runAsync('INSERT INTO seed_versions VALUES (?, ?)', FOUNDATION_SEED_VERSION, now);
  });
}

async function seedResearchTasks(db: SQLiteDatabase): Promise<void> {
  const seeded = await db.getFirstAsync<{ version: number }>('SELECT version FROM seed_versions WHERE version = ?', TASK_SEED_VERSION);
  if (seeded) return;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const now = new Date();
    const generatedAt = now.toISOString();
    const previousDay = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString();
    const delivery = JSON.stringify({ notifyWhenReady: true, showOnHome: true, alertCenter: true });
    const tasks = [
      ['task-morning-brief', 'Morning Market Brief', 'report', 'running', 'Generate a morning market report every weekday.', 'A concise daily briefing covering markets, tracked companies, news, and upcoming events.', ['Markets', 'Portfolio', 'AI Infrastructure'], 'time', 'Every weekday · 8:00 AM', 'snapshot', generatedAt, new Date(now.getTime() + 24 * 60 * 60_000).toISOString()],
      ['task-nvidia-weekly', 'Weekly NVIDIA Research', 'report', 'running', 'Monitor NVIDIA and summarize major developments every Friday.', 'Tracks NVIDIA news, financial highlights, products, and competitors.', ['NVIDIA', 'Semiconductors', 'AI Infrastructure'], 'time', 'Every Friday · 6:00 PM', 'analyst', generatedAt, nextWeek],
      ['task-ai-industry', 'AI Industry Review', 'report', 'running', 'Generate a weekly AI industry review.', 'Explains the most important changes across AI infrastructure, models, and adoption.', ['Artificial Intelligence', 'Cloud Computing', 'Semiconductors'], 'time', 'Every Sunday · 5:00 PM', 'standard', previousDay, nextWeek],
      ['task-fed-monitor', 'Federal Reserve Monitor', 'alert', 'running', 'Explain every Federal Reserve announcement.', 'Flags important policy decisions and explains why they matter without giving trading advice.', ['Federal Reserve', 'Interest Rates', 'Inflation'], 'event', 'Whenever a Federal Reserve decision appears', null, null, null],
      ['task-portfolio-review', 'Weekly Portfolio Review', 'report', 'running', 'Review my research portfolio every week.', 'Summarizes portfolio evidence, concentration, open questions, and upcoming events.', ['Portfolio', 'Technology', 'Risk'], 'time', 'Every Monday · 7:30 AM', 'standard', null, nextWeek],
    ] as const;
    for (const task of tasks) {
      await transaction.runAsync(
        `INSERT INTO research_tasks
          (id, name, task_type, status, prompt, description, monitors_json, schedule_type, schedule_label, report_style, delivery_json, last_run_at, next_run_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        task[0], task[1], task[2], task[3], task[4], task[5], JSON.stringify(task[6]), task[7], task[8], task[9], delivery, task[10], task[11], generatedAt, generatedAt,
      );
    }
    const outputs = [
      ['task-morning-brief', 'Morning Market Brief', 'Markets are mixed while AI infrastructure remains the main research focus.', [
        { title: 'Market Summary', bullets: ['Major market proxies are near recent highs.', 'Semiconductor leadership remains important to monitor.'] },
        { title: 'Needs Attention', bullets: ['Review upcoming earnings dates.', 'Separate live market evidence from saved sample research.'] },
      ], generatedAt],
      ['task-nvidia-weekly', 'Weekly NVIDIA Research', 'The saved NVIDIA thesis remains centered on platform breadth, execution, and customer concentration.', [
        { title: 'Research Update', bullets: ['Accelerated computing remains the core thesis.', 'Supply and customer concentration remain open risks.'] },
        { title: 'Next Questions', bullets: ['Track product roadmap execution.', 'Compare ecosystem maturity with alternative accelerators.'] },
      ], generatedAt],
      ['task-ai-industry', 'AI Industry Review', 'AI infrastructure spending and enterprise adoption remain the week’s dominant themes.', [
        { title: 'Industry Signals', bullets: ['Cloud providers continue investing in infrastructure.', 'Enterprise adoption evidence remains uneven by industry.'] },
      ], previousDay],
    ] as const;
    for (const output of outputs) {
      await transaction.runAsync(
        'INSERT INTO research_task_outputs (task_id, title, summary, sections_json, generated_at) VALUES (?, ?, ?, ?, ?)',
        output[0], output[1], output[2], JSON.stringify(output[3]), output[4],
      );
    }
    await transaction.runAsync('INSERT INTO seed_versions VALUES (?, ?)', TASK_SEED_VERSION, generatedAt);
  });
}
