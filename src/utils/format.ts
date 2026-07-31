export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const initials = (name: string): string =>
  name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
