import React from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { Colors, Radius, Spacing } from '../../utils/theme'

interface CategoryPillProps {
  label: string
  emoji?: string
  isActive: boolean
  onPress: () => void
}

export function CategoryPill({ label, emoji, isActive, onPress }: CategoryPillProps) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => { scale.value = withSpring(0.92) }
  const handlePressOut = () => { scale.value = withSpring(1) }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pill, isActive && styles.pillActive]}
      >
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    gap: 4,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.white,
  },
})
