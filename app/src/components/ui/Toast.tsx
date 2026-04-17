import React, { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet, Pressable } from 'react-native'
import { LightTheme, DarkTheme, Radius, Spacing, Shadows, Colors } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'
import { CheckCircle, XCircle } from 'lucide-react-native'

export type ToastType = 'success' | 'error'

interface ToastProps {
  message: string
  onHide: () => void
  type?: ToastType
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export function Toast({ message, onHide, type = 'success', duration = 2500, actionLabel, onAction }: ToastProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const translateY = useRef(new Animated.Value(100)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => onHide())
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const iconColor = type === 'error' ? theme.error : theme.success
  const Icon = type === 'error' ? XCircle : CheckCircle

  return (
    <Animated.View style={[
      styles.container,
      {
        backgroundColor: theme.black,
        borderColor: type === 'error' ? theme.error : Colors.primary,
        transform: [{ translateY }],
        opacity,
      }
    ]}>
      <Icon size={18} color={iconColor} />
      <Text style={[styles.text, { color: theme.white }]}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: Colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.hard,
    borderWidth: 2,
    zIndex: 999,
  },
  text: {
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
    textTransform: 'uppercase',
  },
  action: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
})

