import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { LightTheme, DarkTheme, Radius, Typography, Spacing } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'yellow' | 'outline'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

export function Badge({
  label,
  variant = 'primary',
  size = 'md',
  dot = false,
}: BadgeProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.successTint, border: theme.success, text: theme.success }
      case 'error':
        return { bg: theme.errorTint, border: theme.error, text: theme.error }
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: theme.warning, text: theme.warning }
      case 'yellow':
        return { bg: theme.yellow, border: theme.black, text: theme.black }
      case 'outline':
        return { bg: 'transparent', border: theme.border, text: theme.textSecondary }
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3B82F6', text: '#2563EB' }
      default:
        return { bg: theme.primaryTint, border: theme.primary, text: theme.primary }
    }
  }

  const vs = getVariantStyles()

  return (
    <View style={[
      styles.badge,
      styles.sizes[size],
      { backgroundColor: vs.bg, borderColor: vs.border }
    ]}>
      {dot && <View style={[styles.dot, { backgroundColor: vs.text }]} />}
      <Text style={[
        styles.text,
        { color: vs.text, fontSize: size === 'sm' ? 10 : (size === 'lg' ? 13 : 11) }
      ]}>
        {label}
      </Text>
    </View>
  )
}

const styles = {
  badge: {
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  text: {
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  sizes: {
    sm: { paddingHorizontal: 6, paddingVertical: 2 } as ViewStyle,
    md: { paddingHorizontal: 8, paddingVertical: 3 } as ViewStyle,
    lg: { paddingHorizontal: 10, paddingVertical: 5 } as ViewStyle,
  },
}

