// B60 v3 — Soft/Warm Design Tokens
export type ThemeMode = 'light' | 'dark'

export const V3 = {
  k: '#FAF3E9',         // page ground — warm cream
  s: '#FFFDF8',         // card / surface
  s2: '#F3E8DB',        // pressed state / track
  w: '#1E1206',         // ink text — warm black
  o: '#EF6D15',         // accent orange
  od: '#C94D0C',        // deep orange — small text on cream (contrast safe)
  gold: '#FFC61A',      // gold — add buttons, CTA on orange
  ln: 'rgba(30,18,6,0.10)',   // hairlines
  dim: 'rgba(30,18,6,0.65)',  // secondary text
  dim2: 'rgba(30,18,6,0.45)', // tertiary text / labels
  cream: '#FFFDF8',     // tab bar ground
}

// Legacy alias — keeps existing screens from hard-crashing
export const V2 = {
  k: V3.k,
  s: V3.s,
  s2: V3.s2,
  w: V3.w,
  o: V3.o,
  od: V3.od,
  gold: V3.gold,
  cream: V3.cream,
  ln: V3.ln,
  dim: V3.dim,
  dim2: V3.dim2,
  navy: '#1B2A4A',
  dk: '#1E1206',
  ds: '#2A1A0E',
  ds2: '#3A2615',
  dw: '#FFF8F3',
  dln: 'rgba(255,248,243,0.13)',
  ddim: 'rgba(255,248,243,0.55)',
  ddim2: 'rgba(255,248,243,0.36)',
}

export const Colors = {
  primary: '#EF6D15',
  primaryDark: '#C94D0C',
  primaryLight: '#FF8F2F',
  gold: '#FFC61A',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFDF8',
  black: '#1E1206',
}

export const LightTheme = {
  ...Colors,
  background: V3.k,
  surface: V3.s,
  surfaceElevated: V3.s,
  surface2: V3.s2,
  border: V3.ln,
  borderStrong: V3.w,
  text: V3.w,
  textSecondary: V3.dim,
  textMuted: V3.dim2,
  textInverse: V3.s,
  overlay: 'rgba(30,18,6,0.5)',
  primaryTint: 'rgba(239,109,21,0.08)',
  successTint: 'rgba(34,197,94,0.1)',
  errorTint: 'rgba(239,68,68,0.1)',
  cardBg: V3.s,
  shadowColor: '#1E1206',
  tabBarBg: V3.cream,
  tabBarActive: V3.od,
  tabBarInactive: V3.dim2,
}

export const DarkTheme = {
  ...Colors,
  background: V2.dk,
  surface: V2.ds,
  surfaceElevated: V2.ds2,
  surface2: V2.ds2,
  border: V2.dln,
  borderStrong: V2.dw,
  text: V2.dw,
  textSecondary: V2.ddim,
  textMuted: V2.ddim2,
  textInverse: V2.dk,
  overlay: 'rgba(0,0,0,0.7)',
  primaryTint: 'rgba(239,109,21,0.15)',
  successTint: 'rgba(34,197,94,0.15)',
  errorTint: 'rgba(239,68,68,0.15)',
  cardBg: V2.ds,
  shadowColor: '#000',
  tabBarBg: V3.cream,
  tabBarActive: V3.od,
  tabBarInactive: V2.ddim2,
}

// V3 typography — Archivo 800 sentence-case display; mono for labels
export const Fonts = {
  display: 'Archivo_800ExtraBold',
  displayBold: 'Archivo_800ExtraBold',
  displayRegular: 'Archivo_400Regular',
  mono: 'JetBrainsMono_500Medium',
  monoRegular: 'JetBrainsMono_400Regular',
  heading: 'Archivo_800ExtraBold',
  headingBlack: 'Archivo_800ExtraBold',
  body: 'Archivo_400Regular',
  bodySemiBold: 'Archivo_700Bold',
}

// V3 type scale — sentence case, Archivo 800
export const Type = {
  d1: { fontFamily: 'Archivo_800ExtraBold', fontSize: 38, lineHeight: 38, letterSpacing: -0.76 },
  d2: { fontFamily: 'Archivo_800ExtraBold', fontSize: 27, lineHeight: 29, letterSpacing: -0.4 },
  d3: { fontFamily: 'Archivo_800ExtraBold', fontSize: 20, lineHeight: 22, letterSpacing: -0.2 },
  d4: { fontFamily: 'Archivo_800ExtraBold', fontSize: 15, lineHeight: 18, letterSpacing: -0.1 },
  d5: { fontFamily: 'Archivo_800ExtraBold', fontSize: 12, lineHeight: 15, letterSpacing: 0 },
  m: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  m9: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase' as const },
  bd: { fontFamily: 'Archivo_400Regular', fontSize: 13, lineHeight: 20 },
  loginHero: { fontFamily: 'Archivo_800ExtraBold', fontSize: 33, lineHeight: 34, letterSpacing: -1.15 },
  pts: { fontFamily: 'Archivo_900Black', fontSize: 76, lineHeight: 68, letterSpacing: -3.4 },
}

export const Typography = {
  h1: { fontSize: 38, fontWeight: '800' as const },
  h2: { fontSize: 27, fontWeight: '800' as const },
  h3: { fontSize: 20, fontWeight: '800' as const },
  h4: { fontSize: 15, fontWeight: '800' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  bodySmall: { fontSize: 10, fontWeight: '500' as const },
  caption: { fontSize: 9.5, fontWeight: '400' as const },
  label: { fontSize: 10, fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: 1.6 },
  price: { fontSize: 17, fontWeight: '800' as const },
}

export const Display = {
  hero: { fontSize: 38, fontWeight: '800' as const, letterSpacing: -0.76, lineHeight: 38 },
  title: { fontSize: 27, fontWeight: '800' as const, letterSpacing: -0.4, lineHeight: 29 },
  label: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  sticker: { fontSize: 12, fontWeight: '800' as const, letterSpacing: 0 },
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  gutter: 18,
}

// V3 radii — soft, card-first design
export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 999,
}

// V3 shadows — soft drop shadows, warm ink color
export const Shadows = {
  card: {
    shadowColor: '#1E1206',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardStrong: {
    shadowColor: '#1E1206',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.11,
    shadowRadius: 28,
    elevation: 7,
  },
  // Button "ledge" drop shadow — gives the press-down feel
  ledge: {
    shadowColor: 'rgba(151,64,15,0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  // Tab bar lift shadow
  tabLift: {
    shadowColor: '#1E1206',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 8,
  },
  // Small icon button
  iconBtn: {
    shadowColor: '#1E1206',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  // No shadow
  none: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  // Legacy
  hard: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  hardSm: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  glow: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  glowStrong: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
}
