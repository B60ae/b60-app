import React, { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet, View, Pressable } from 'react-native'
import { LightTheme, DarkTheme, Radius, Spacing, Shadows } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'
import { CheckCircle } from 'lucide-react-native'

interface ToastProps {
  message: string
  visible: boolean
  onHide: () => void
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export function Toast({ message, visible, onHide, duration = 2000, actionLabel, onAction }: ToastProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const translateY = useRef(new Animated.Value(100)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
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
    }
  }, [visible])

  if (!visible) return null

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: theme.black,
        borderColor: theme.black,
        transform: [{ translateY }], 
        opacity 
      }
    ]}>
      <CheckCircle size={18} color={theme.success} />
      <Text style={[styles.text, { color: theme.white }]}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: theme.primary }]}>{actionLabel}</Text>
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

