import type { ResearchTaskScheduleType } from '@/types/domain';

const weekdays = [
  ['sunday', 0], ['monday', 1], ['tuesday', 2], ['wednesday', 3],
  ['thursday', 4], ['friday', 5], ['saturday', 6],
] as const;

function parseClock(label: string): { hour: number; minute: number } {
  const twelveHour = label.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (twelveHour) {
    const meridiem = twelveHour[3]?.toLocaleLowerCase().startsWith('p') ? 'pm' : 'am';
    let hour = Math.min(12, Math.max(1, Number(twelveHour[1])));
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return { hour, minute: Math.min(59, Number(twelveHour[2] ?? 0)) };
  }
  const twentyFourHour = label.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/i) ?? label.match(/(?:\bat\b|@)\s*(\d{1,2})\b/i);
  if (twentyFourHour) return { hour: Math.min(23, Number(twentyFourHour[1])), minute: Math.min(59, Number(twentyFourHour[2] ?? 0)) };
  if (/evening/i.test(label)) return { hour: 18, minute: 0 };
  if (/afternoon/i.test(label)) return { hour: 13, minute: 0 };
  if (/morning/i.test(label)) return { hour: 8, minute: 0 };
  return { hour: 9, minute: 0 };
}

function atClock(date: Date, hour: number, minute: number): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function monthlyDate(from: Date, day: number, hour: number, minute: number): Date {
  const candidate = new Date(from.getFullYear(), from.getMonth(), 1, hour, minute, 0, 0);
  const setDay = () => candidate.setDate(Math.min(day, new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate()));
  setDay();
  if (candidate <= from) {
    candidate.setDate(1);
    candidate.setMonth(candidate.getMonth() + 1);
    setDay();
  }
  return candidate;
}

/** Calculates the next occurrence in the device's local timezone from an editable schedule label. */
export function calculateNextResearchRun(scheduleType: ResearchTaskScheduleType, scheduleLabel: string, from = new Date()): string | undefined {
  if (scheduleType === 'event') return undefined;
  const label = scheduleLabel.trim().toLocaleLowerCase();
  const { hour, minute } = parseClock(label);
  const everyHours = label.match(/every\s+(\d+)\s+hours?/i);
  if (/\bhourly\b/i.test(label) || everyHours) {
    const result = new Date(from);
    result.setMinutes(result.getMinutes() + (everyHours ? Math.max(1, Number(everyHours[1])) : 1) * 60, 0, 0);
    return result.toISOString();
  }
  if (/\bmonthly\b|every\s+month|each\s+month/i.test(label)) {
    const dayMatch = label.match(/\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i) ?? label.match(/\bday\s+(\d{1,2})\b/i);
    return monthlyDate(from, Math.min(31, Math.max(1, Number(dayMatch?.[1] ?? 1))), hour, minute).toISOString();
  }
  const namedWeekday = weekdays.find(([name]) => new RegExp(`\\b${name}s?\\b`, 'i').test(label));
  if (namedWeekday) {
    const result = atClock(from, hour, minute);
    let daysAhead = (namedWeekday[1] - result.getDay() + 7) % 7;
    if (daysAhead === 0 && result <= from) daysAhead = 7;
    result.setDate(result.getDate() + daysAhead);
    return result.toISOString();
  }
  if (/\bweekdays?\b/i.test(label)) {
    const result = atClock(from, hour, minute);
    if (result <= from) result.setDate(result.getDate() + 1);
    while (result.getDay() === 0 || result.getDay() === 6) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }
  if (/\bdaily\b|every\s+day/i.test(label)) {
    const result = atClock(from, hour, minute);
    if (result <= from) result.setDate(result.getDate() + 1);
    return result.toISOString();
  }
  const everyWeeks = label.match(/every\s+(\d+)\s+weeks?/i);
  const result = atClock(from, hour, minute);
  result.setDate(result.getDate() + (everyWeeks ? Math.max(1, Number(everyWeeks[1])) : 1) * 7);
  return result.toISOString();
}
