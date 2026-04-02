// B60 Brand Design Tokens — Multi-Theme Support
export type ThemeMode = 'light' | 'dark'

export const Colors = {
  primary: '#F05A1A',
  primaryDark: '#C94400',
  primaryLight: '#FF7A3D',
  yellow: '#FFE500',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
}

export const LightTheme = {
  ...Colors,
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceElevated: '#FFFFFF',
  border: '#EEEEEE',
  borderStrong: '#DDDDDD',
  text: '#1B2A4A',
  textSecondary: '#444444',
  textMuted: '#888888',
  textInverse: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
  primaryTint: 'rgba(240, 90, 26, 0.08)',
  successTint: 'rgba(34, 197, 94, 0.1)',
  errorTint: 'rgba(239, 68, 68, 0.1)',
  // Brand Touches
  cardBg: '#FFFFFF',
  shadowColor: '#000',
}

export const DarkTheme = {
  ...Colors,
  background: '#0A0A0A',
  surface: '#121212',
  surfaceElevated: '#1E1E1E',
  asphalt: '#1A1A1A',
  border: '#2A2A2A',
  borderStrong: '#3A3A3A',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  textInverse: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  primaryTint: 'rgba(240, 90, 26, 0.15)',
  successTint: 'rgba(34, 197, 94, 0.15)',
  errorTint: 'rgba(239, 68, 68, 0.15)',
  // Brand Touches
  cardBg: '#121212',
  shadowColor: '#000',
}

export const Fonts = {
  heading: 'Outfit_700Bold',
  headingBlack: 'Outfit_900Black',
  body: 'Inter_400Regular',
  bodySemiBold: 'Inter_600SemiBold',
}

export const Typography = {
  h1: { fontSize: 32, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '700' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '700' as const },
  price: { fontSize: 18, fontWeight: '900' as const },
}

export const Display = {
  hero: { fontSize: 52, fontWeight: '900' as const, letterSpacing: -2, lineHeight: 52 },
  title: { fontSize: 38, fontWeight: '900' as const, letterSpacing: -1.5, lineHeight: 40 },
  label: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 2, textTransform: 'uppercase' as const },
  sticker: { fontSize: 13, fontWeight: '900' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
}

export const Shadows = {
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardStrong: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  // Neobrutalist "Hard" Shadows
  hard: {
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  glowStrong: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
}
