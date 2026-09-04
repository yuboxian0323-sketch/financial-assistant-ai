export const normalizeStockSymbol = (symbol: string): string => symbol.trim().toUpperCase();

export const normalizeStockSymbols = (symbols: string[]): string[] =>
  Array.from(new Set(symbols.map(normalizeStockSymbol).filter(Boolean))).sort();
