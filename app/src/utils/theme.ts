// B60 Brand Design Tokens — Light Theme
export const Colors = {
  primary: '#F05A1A',
  primaryDark: '#C94400',
  primaryLight: '#FF7A3D',
  yellow: '#FFE500',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceElevated: '#FFFFFF',
  border: '#EEEEEE',
  borderStrong: '#DDDDDD',
  text: '#1B2A4A',
  textSecondary: '#444444',
  textMuted: '#888888',
  textInverse: '#FFFFFF',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  // Tints
  primaryTint: 'rgba(240, 90, 26, 0.08)',
  successTint: 'rgba(34, 197, 94, 0.1)',
  errorTint: 'rgba(239, 68, 68, 0.1)',
}

export const Fonts = {
  heading: 'Outfit_700Bold',
  headingBlack: 'Outfit_900Black',
  body: 'Inter_400Regular',
  bodySemiBold: 'Inter_600SemiBold',
}

export const Typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, color: Colors.text },
  h2: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  h3: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  h4: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: Colors.text },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, color: Colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.textMuted },
  label: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  price: { fontSize: 18, fontWeight: '700' as const, color: Colors.primary },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardStrong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  glow: {
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glowStrong: {
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
}
