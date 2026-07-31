import { contentRows, seedCompanies } from '@/database/seedData';

describe('foundation seed data', () => {
  it('provides seven complete company knowledge bases', () => {
    expect(seedCompanies).toHaveLength(7);
    for (const company of seedCompanies) {
      const owned = contentRows.filter((item) => item.companyId === company.id);
      expect(owned.filter((item) => item.kind === 'news')).toHaveLength(5);
      expect(owned.filter((item) => item.kind === 'report')).toHaveLength(3);
      expect(owned.filter((item) => item.kind === 'timeline')).toHaveLength(3);
      expect(company.financials.length).toBeGreaterThanOrEqual(3);
      expect(company.aiSummary).toContain('Sample AI summary');
      expect(company.bullThesis).toBeTruthy();
      expect(company.bearThesis).toBeTruthy();
    }
  });

  it('uses globally stable content identifiers', () => {
    const ids = contentRows.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
