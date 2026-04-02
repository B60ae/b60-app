import React from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LightTheme, DarkTheme, Radius, Shadows, Spacing } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

interface CategoryPillProps {
  label: string
  emoji?: string
  isActive: boolean
  onPress: () => void
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function CategoryPill({ label, emoji, isActive, onPress }: CategoryPillProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 12, stiffness: 400 })
    Haptics.selectionAsync()
  }
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 400 })
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.pill,
        isActive ? {
          backgroundColor: theme.primary,
          borderColor: theme.black,
          ...Shadows.hard,
        } : {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        animStyle as ViewStyle,
      ]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[
        styles.label,
        { color: isActive ? theme.white : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 2,
    marginRight: Spacing.sm,
    gap: 4,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})

