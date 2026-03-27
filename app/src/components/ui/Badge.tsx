import { View, Text, StyleSheet } from 'react-native'
import { Colors, Radius } from '../../utils/theme'

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'orange' | 'gold'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  // Legacy passthrough — still supported
  color?: string
  textColor?: string
}

interface VariantStyle {
  bg: string
  text: string
  border: string
  dot: string
}

const VARIANT_STYLES: Record<BadgeVariant, VariantStyle> = {
  default: {
    bg: 'rgba(27, 42, 74, 0.08)',
    text: Colors.text,
    border: 'rgba(27, 42, 74, 0.2)',
    dot: Colors.text,
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.12)',
    text: '#16A34A',
    border: 'rgba(34, 197, 94, 0.35)',
    dot: '#16A34A',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#DC2626',
    border: 'rgba(239, 68, 68, 0.3)',
    dot: '#DC2626',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#B45309',
    border: 'rgba(245, 158, 11, 0.35)',
    dot: '#D97706',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#1D4ED8',
    border: 'rgba(59, 130, 246, 0.3)',
    dot: '#2563EB',
  },
  orange: {
    bg: 'rgba(240, 90, 26, 0.1)',
    text: Colors.primaryDark,
    border: 'rgba(240, 90, 26, 0.3)',
    dot: Colors.primary,
  },
  gold: {
    bg: 'rgba(255, 229, 0, 0.18)',
    text: '#92600A',
    border: 'rgba(255, 229, 0, 0.55)',
    dot: '#D4A800',
  },
}

const SIZE_TEXT: Record<BadgeSize, number> = {
  sm: 10,
  md: 12,
  lg: 14,
}

const SIZE_PADDING: Record<BadgeSize, { paddingHorizontal: number; paddingVertical: number }> = {
  sm: { paddingHorizontal: 7, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 3 },
  lg: { paddingHorizontal: 12, paddingVertical: 5 },
}

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  dot = false,
  color,
  textColor,
}: BadgeProps) {
  // Legacy color passthrough
  const vs = VARIANT_STYLES[variant]
  const bgColor = color ? color + '22' : vs.bg
  const txtColor = textColor ?? vs.text
  const borderColor = color ?? vs.border
  const dotColor = color ?? vs.dot

  return (
    <View
      style={[
        styles.badge,
        SIZE_PADDING[size],
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: dotColor },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            fontSize: SIZE_TEXT[size],
            color: txtColor,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.1,
  },
})
