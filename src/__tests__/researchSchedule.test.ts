import { calculateNextResearchRun } from '@/utils/researchSchedule';

describe('research schedule calculation', () => {
  it('uses the named weekday and local clock time', () => {
    const next = new Date(calculateNextResearchRun('time', 'Every Friday at 6:00 PM', new Date(2026, 8, 3, 17, 0))!);
    expect([next.getFullYear(), next.getMonth(), next.getDate(), next.getHours(), next.getMinutes()]).toEqual([2026, 8, 4, 18, 0]);
  });

  it('accepts a 24-hour clock from Gemini or manual edits', () => {
    const next = new Date(calculateNextResearchRun('time', 'Fridays · 18:30', new Date(2026, 8, 3, 17, 0))!);
    expect([next.getDay(), next.getHours(), next.getMinutes()]).toEqual([5, 18, 30]);
  });

  it('skips weekends for weekday schedules', () => {
    const next = new Date(calculateNextResearchRun('time', 'Every weekday at 8:00 AM', new Date(2026, 8, 4, 9, 0))!);
    expect([next.getDay(), next.getHours(), next.getMinutes()]).toEqual([1, 8, 0]);
  });

  it('honors monthly dates and clock times', () => {
    const next = new Date(calculateNextResearchRun('time', 'Monthly on the 15th at 9:30 AM', new Date(2026, 8, 20, 12, 0))!);
    expect([next.getMonth(), next.getDate(), next.getHours(), next.getMinutes()]).toEqual([9, 15, 9, 30]);
  });

  it('returns no fixed time for event-driven tasks', () => {
    expect(calculateNextResearchRun('event', 'Whenever earnings are released')).toBeUndefined();
  });
});
