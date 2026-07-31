import type { SQLiteDatabase } from 'expo-sqlite';
import { contentRows, seedCompanies } from './seedData';

const DATABASE_VERSION = 1;
const SEED_VERSION = 1;

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
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
  await seedDatabase(db);
}

async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const seeded = await db.getFirstAsync<{ version: number }>('SELECT version FROM seed_versions WHERE version = ?', SEED_VERSION);
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
    await transaction.runAsync('INSERT INTO seed_versions VALUES (?, ?)', SEED_VERSION, now);
  });
}
