import React from 'react'
import { View, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Radius, Shadows, Spacing } from '../../utils/theme'

type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  variant?: CardVariant
  pressable?: boolean
  accent?: boolean
  onPress?: () => void
  // Legacy
  elevated?: boolean
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function CardInner({
  children,
  variant,
  accent,
  style,
}: {
  children: React.ReactNode
  variant: CardVariant
  accent: boolean
  style?: ViewStyle
}) {
  const baseStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    accent && styles.accentContainer,
    style,
  ]

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.card, styles.gradientCard, accent && styles.accentContainer, style]}
      >
        {accent && <View style={styles.accentStrip} />}
        <View style={accent ? styles.accentContent : undefined}>{children}</View>
      </LinearGradient>
    )
  }

  return (
    <View style={baseStyle}>
      {accent && <View style={styles.accentStrip} />}
      <View style={accent ? styles.accentContent : undefined}>{children}</View>
    </View>
  )
}

export function Card({
  children,
  style,
  variant,
  pressable = false,
  accent = false,
  onPress,
  elevated = false,
}: CardProps) {
  // Legacy elevated prop maps to variant
  const resolvedVariant: CardVariant = variant ?? (elevated ? 'elevated' : 'default')

  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 280 })
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 280 })
  }

  if (pressable || onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pressableWrapper, animatedStyle]}
      >
        <CardInner variant={resolvedVariant} accent={accent} style={style}>
          {children}
        </CardInner>
      </AnimatedPressable>
    )
  }

  return (
    <CardInner variant={resolvedVariant} accent={accent} style={style}>
      {children}
    </CardInner>
  )
}

const styles = StyleSheet.create({
  pressableWrapper: {
    // Wrapper only holds animation — no visual styles
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  elevated: {
    ...Shadows.cardStrong,
    borderWidth: 0,
    backgroundColor: Colors.surfaceElevated,
  },
  outlined: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  gradientCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Accent strip — 3px left orange bar
  accentContainer: {
    flexDirection: 'row',
    padding: 0,
  },
  accentStrip: {
    width: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  accentContent: {
    flex: 1,
    padding: Spacing.md,
  },
})
