export const normalizeStockSymbol = (symbol: string): string => symbol.trim().toUpperCase();

export const stockSymbolPattern = /^[A-Z0-9][A-Z0-9._:-]{0,31}$/;

export const normalizeStockSymbols = (symbols: string[]): string[] =>
  Array.from(new Set(symbols.map(normalizeStockSymbol).filter(Boolean))).sort();
