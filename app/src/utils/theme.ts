// B60 Brand Design Tokens
export const Colors = {
  primary: '#F05A1A',
  primaryDark: '#C94A12',
  primaryLight: '#FF7A3D',
  background: '#111111',
  surface: '#1A1A1A',
  surfaceElevated: '#222222',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
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
  full: 999,
}

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
}
