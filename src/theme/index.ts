export const palette = {
  background: '#080B10',
  surface: '#111722',
  surfaceElevated: '#192130',
  surfaceMuted: '#0D121A',
  text: '#F4F7FB',
  textSecondary: '#9AA6B6',
  textMuted: '#667386',
  border: '#253044',
  accent: '#7EA7FF',
  accentSoft: '#172A4F',
  positive: '#66D19E',
  negative: '#FF7A89',
  warning: '#F4C56A',
  overlay: 'rgba(0, 0, 0, 0.68)',
  transparent: 'transparent',
} as const;

export type ThemePalette = { [K in keyof typeof palette]: string };

export const lightPaletteContract: ThemePalette = {
  background: '#F5F7FA', surface: '#FFFFFF', surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EDF1F6', text: '#10141C', textSecondary: '#4E5968',
  textMuted: '#778397', border: '#DCE2EA', accent: '#315FBE',
  accentSoft: '#E3ECFF', positive: '#18784C', negative: '#B83245',
  warning: '#8A5B00', overlay: 'rgba(0, 0, 0, 0.35)', transparent: 'transparent',
};

export const theme = {
  colors: palette,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 44 },
  radius: { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 },
  type: {
    hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
    heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  },
  elevation: {
    card: { shadowColor: palette.background, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  },
  opacity: { disabled: 0.45, pressed: 0.78 },
  motion: { fast: 140, normal: 220, slow: 360 },
} as const;

export type AppTheme = typeof theme;
