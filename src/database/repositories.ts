import type { SQLiteDatabase } from 'expo-sqlite';
import type { Company, CompanyContent, DatabaseInfo, Holding } from '@/types/domain';

type CompanyRow = Omit<Company, 'aiSummary' | 'bullThesis' | 'bearThesis' | 'dailyChange' | 'financials'> & {
  ai_summary: string; bull_thesis: string; bear_thesis: string; daily_change: number; financials_json: string;
};
const mapCompany = (row: CompanyRow): Company => ({
  id: row.id, ticker: row.ticker, name: row.name, industry: row.industry, overview: row.overview,
  aiSummary: row.ai_summary, bullThesis: row.bull_thesis, bearThesis: row.bear_thesis,
  price: row.price, dailyChange: row.daily_change, financials: JSON.parse(row.financials_json) as Company['financials'],
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

  async portfolio(): Promise<Holding[]> {
    const rows = await this.db.getAllAsync<{ holding_id: string; company_id: string; shares: number; average_cost: number; notes: string } & CompanyRow>(
      `SELECT p.id AS holding_id, p.company_id, p.shares, p.average_cost, p.notes, c.* FROM portfolio p JOIN companies c ON c.id = p.company_id ORDER BY c.name`,
    );
    return rows.map((row) => ({ id: row.holding_id, companyId: row.company_id, shares: row.shares, averageCost: row.average_cost, notes: row.notes, company: mapCompany(row) }));
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

  async info(): Promise<DatabaseInfo> {
    const version = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const seed = await this.db.getFirstAsync<{ version: number }>('SELECT MAX(version) AS version FROM seed_versions');
    const count = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM companies');
    return { version: version?.user_version ?? 0, seedVersion: seed?.version ?? 0, companyCount: count?.count ?? 0 };
  }
}
