import type { SQLiteDatabase } from 'expo-sqlite';
import type { Company, CompanyContent, DatabaseInfo, Holding, ResearchTask, ResearchTaskDelivery, ResearchTaskOutput, ResearchTaskOutputSection, WorkspaceLayout } from '@/types/domain';

type CompanyRow = Omit<Company, 'aiSummary' | 'bullThesis' | 'bearThesis' | 'dailyChange' | 'financials'> & {
  ai_summary: string; bull_thesis: string; bear_thesis: string; daily_change: number; financials_json: string;
};
type HoldingRow = { holding_id: string; company_id: string; shares: number; average_cost: number; notes: string } & CompanyRow;
type ResearchTaskRow = {
  id: string; name: string; task_type: ResearchTask['type']; status: ResearchTask['status']; prompt: string;
  description: string; monitors_json: string; schedule_type: ResearchTask['scheduleType']; schedule_label: string;
  report_style: ResearchTask['reportStyle'] | null; delivery_json: string; last_run_at: string | null;
  next_run_at: string | null; created_at: string; updated_at: string;
};
type ResearchTaskOutputRow = { task_id: string; title: string; summary: string; sections_json: string; generated_at: string };
const mapCompany = (row: CompanyRow): Company => ({
  id: row.id, ticker: row.ticker, name: row.name, industry: row.industry, overview: row.overview,
  aiSummary: row.ai_summary, bullThesis: row.bull_thesis, bearThesis: row.bear_thesis,
  price: row.price, dailyChange: row.daily_change, financials: JSON.parse(row.financials_json) as Company['financials'],
});
const mapResearchTask = (row: ResearchTaskRow): ResearchTask => ({
  id: row.id,
  name: row.name,
  type: row.task_type,
  status: row.status,
  prompt: row.prompt,
  description: row.description,
  monitors: JSON.parse(row.monitors_json) as string[],
  scheduleType: row.schedule_type,
  scheduleLabel: row.schedule_label,
  reportStyle: row.report_style ?? undefined,
  delivery: JSON.parse(row.delivery_json) as ResearchTaskDelivery,
  lastRunAt: row.last_run_at ?? undefined,
  nextRunAt: row.next_run_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const mapResearchTaskOutput = (row: ResearchTaskOutputRow): ResearchTaskOutput => ({
  taskId: row.task_id,
  title: row.title,
  summary: row.summary,
  sections: JSON.parse(row.sections_json) as ResearchTaskOutputSection[],
  generatedAt: row.generated_at,
});

export class InvestmentRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async companies(search = ''): Promise<Company[]> {
    const rows = await this.db.getAllAsync<CompanyRow>(
      `SELECT * FROM companies WHERE ticker LIKE ? OR name LIKE ? ORDER BY name`, `%${search}%`, `%${search}%`,
    );
    return rows.map(mapCompany);
  }

  async company(id: string): Promise<Company | null> {
    const row = await this.db.getFirstAsync<CompanyRow>('SELECT * FROM companies WHERE id = ?', id);
    return row ? mapCompany(row) : null;
  }

  async companyByTicker(ticker: string): Promise<Company | null> {
    const row = await this.db.getFirstAsync<CompanyRow>('SELECT * FROM companies WHERE UPPER(ticker) = UPPER(?)', ticker);
    return row ? mapCompany(row) : null;
  }

  async portfolio(): Promise<Holding[]> {
    const rows = await this.db.getAllAsync<HoldingRow>(
      `SELECT p.id AS holding_id, p.company_id, p.shares, p.average_cost, p.notes, c.* FROM portfolio p JOIN companies c ON c.id = p.company_id ORDER BY c.name`,
    );
    return rows.map((row) => ({ id: row.holding_id, companyId: row.company_id, shares: row.shares, averageCost: row.average_cost, notes: row.notes, company: mapCompany(row) }));
  }

  async addHolding(company: Company, shares: number, averageCost: number): Promise<Holding> {
    let saved: Holding | null = null;
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const now = new Date().toISOString();
      await transaction.runAsync(
        `INSERT OR IGNORE INTO companies
          (id, ticker, name, industry, overview, ai_summary, bull_thesis, bear_thesis, price, daily_change, financials_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        company.id, company.ticker, company.name, company.industry, company.overview, company.aiSummary,
        company.bullThesis, company.bearThesis, company.price, company.dailyChange, JSON.stringify(company.financials), now,
      );
      const persistedCompany = await transaction.getFirstAsync<CompanyRow>('SELECT * FROM companies WHERE UPPER(ticker) = UPPER(?)', company.ticker);
      if (!persistedCompany) throw new Error('The company could not be saved.');
      await transaction.runAsync(
        'INSERT OR IGNORE INTO portfolio (id, company_id, shares, average_cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        `holding-${persistedCompany.id}`, persistedCompany.id, shares, averageCost, 'Added from stock research.', now,
      );
      const row = await transaction.getFirstAsync<HoldingRow>(
        `SELECT p.id AS holding_id, p.company_id, p.shares, p.average_cost, p.notes, c.*
         FROM portfolio p JOIN companies c ON c.id = p.company_id WHERE p.company_id = ?`,
        persistedCompany.id,
      );
      if (!row) throw new Error('The portfolio position could not be saved.');
      saved = { id: row.holding_id, companyId: row.company_id, shares: row.shares, averageCost: row.average_cost, notes: row.notes, company: mapCompany(row) };
    });
    if (!saved) throw new Error('The portfolio position could not be saved.');
    return saved;
  }

  async removeHolding(companyId: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync('DELETE FROM portfolio WHERE company_id = ?', companyId);
    });
  }

  async watchlist(): Promise<Company[]> {
    const rows = await this.db.getAllAsync<CompanyRow>(
      `SELECT c.* FROM watchlist w JOIN companies c ON c.id = w.company_id ORDER BY c.name`,
    );
    return rows.map(mapCompany);
  }

  async content(companyId?: string, kind?: CompanyContent['kind']): Promise<CompanyContent[]> {
    const result: CompanyContent[] = [];
    const tables = [
      { table: 'notes', fixedKind: 'note' }, { table: 'reports', fixedKind: 'report' },
      { table: 'conversations', fixedKind: 'conversation' }, { table: 'research', fixedKind: null },
    ] as const;
    for (const source of tables) {
      const clauses: string[] = [];
      const params: string[] = [];
      if (companyId) { clauses.push('company_id = ?'); params.push(companyId); }
      if (source.table === 'research' && kind) { clauses.push('kind = ?'); params.push(kind); }
      if (source.fixedKind && kind && source.fixedKind !== kind) continue;
      const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
      const rows = await this.db.getAllAsync<{ id: string; company_id: string; title: string; body: string; occurred_at: string; importance: number; kind?: CompanyContent['kind'] }>(
        `SELECT * FROM ${source.table}${where} ORDER BY occurred_at DESC`, ...params,
      );
      result.push(...rows.map((row) => ({ id: row.id, companyId: row.company_id, kind: source.fixedKind ?? row.kind ?? 'research', title: row.title, body: row.body, occurredAt: row.occurred_at, importance: row.importance })));
    }
    return result.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async researchTasks(): Promise<ResearchTask[]> {
    const rows = await this.db.getAllAsync<ResearchTaskRow>(
      `SELECT * FROM research_tasks ORDER BY CASE status WHEN 'running' THEN 0 ELSE 1 END, updated_at DESC`,
    );
    return rows.map(mapResearchTask);
  }

  async researchTask(id: string): Promise<ResearchTask | null> {
    const row = await this.db.getFirstAsync<ResearchTaskRow>('SELECT * FROM research_tasks WHERE id = ?', id);
    return row ? mapResearchTask(row) : null;
  }

  async researchTaskOutputs(): Promise<ResearchTaskOutput[]> {
    const rows = await this.db.getAllAsync<ResearchTaskOutputRow>('SELECT * FROM research_task_outputs ORDER BY generated_at DESC');
    return rows.map(mapResearchTaskOutput);
  }

  async insertResearchTask(task: ResearchTask): Promise<ResearchTask> {
    await this.db.runAsync(
      `INSERT INTO research_tasks
        (id, name, task_type, status, prompt, description, monitors_json, schedule_type, schedule_label, report_style, delivery_json, last_run_at, next_run_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id, task.name, task.type, task.status, task.prompt, task.description, JSON.stringify(task.monitors), task.scheduleType,
      task.scheduleLabel, task.reportStyle ?? null, JSON.stringify(task.delivery), task.lastRunAt ?? null, task.nextRunAt ?? null, task.createdAt, task.updatedAt,
    );
    return task;
  }

  async updateResearchTask(task: ResearchTask): Promise<ResearchTask> {
    await this.db.runAsync(
      `UPDATE research_tasks SET name = ?, task_type = ?, status = ?, prompt = ?, description = ?, monitors_json = ?,
        schedule_type = ?, schedule_label = ?, report_style = ?, delivery_json = ?, last_run_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?`,
      task.name, task.type, task.status, task.prompt, task.description, JSON.stringify(task.monitors), task.scheduleType, task.scheduleLabel,
      task.reportStyle ?? null, JSON.stringify(task.delivery), task.lastRunAt ?? null, task.nextRunAt ?? null, task.updatedAt, task.id,
    );
    return task;
  }

  async deleteResearchTask(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM research_tasks WHERE id = ?', id);
  }

  async saveResearchTaskOutput(output: ResearchTaskOutput): Promise<ResearchTaskOutput> {
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO research_task_outputs (task_id, title, summary, sections_json, generated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(task_id) DO UPDATE SET title = excluded.title, summary = excluded.summary,
         sections_json = excluded.sections_json, generated_at = excluded.generated_at`,
        output.taskId, output.title, output.summary, JSON.stringify(output.sections), output.generatedAt,
      );
      await transaction.runAsync('UPDATE research_tasks SET last_run_at = ?, updated_at = ? WHERE id = ?', output.generatedAt, output.generatedAt, output.taskId);
    });
    return output;
  }

  async workspaceLayout(): Promise<WorkspaceLayout | null> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'workspace_layout_v1');
    if (!row) return null;
    return JSON.parse(row.value) as WorkspaceLayout;
  }

  async saveWorkspaceLayout(layout: WorkspaceLayout): Promise<WorkspaceLayout> {
    await this.db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      'workspace_layout_v1', JSON.stringify(layout), layout.updatedAt,
    );
    return layout;
  }

  async info(): Promise<DatabaseInfo> {
    const version = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const seed = await this.db.getFirstAsync<{ version: number }>('SELECT MAX(version) AS version FROM seed_versions');
    const count = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM companies');
    return { version: version?.user_version ?? 0, seedVersion: seed?.version ?? 0, companyCount: count?.count ?? 0 };
  }
}
