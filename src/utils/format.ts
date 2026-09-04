export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const initials = (name: string): string =>
  name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const titleCase = (value: string): string =>
  value.split('-').map(capitalize).join(' ');

export function formatDateTime(value?: string, fallback = 'Unavailable'): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatRelativeTime(value?: string): string {
  if (!value) return 'Never';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1_440)}d ago`;
}

export function isToday(value?: string): boolean {
  return Boolean(value && new Date(value).toDateString() === new Date().toDateString());
}

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
