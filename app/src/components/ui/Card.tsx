import React from 'react'
import { View, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { LightTheme, DarkTheme, Radius, Shadows, Spacing } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient' | 'hard' | 'glow'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  variant?: CardVariant
  pressable?: boolean
  accent?: boolean
  onPress?: () => void
  elevated?: boolean
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Card({
  children,
  style,
  variant,
  pressable = false,
  accent = false,
  onPress,
  elevated = false,
}: CardProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  
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

  const getVariantStyle = (): ViewStyle => {
    switch (resolvedVariant) {
      case 'elevated':
        return { 
          backgroundColor: theme.surface, 
          ...Shadows.card, 
          borderWidth: 1, 
          borderColor: theme.border 
        }
      case 'outlined':
        return { 
          backgroundColor: 'transparent', 
          borderWidth: 1.5, 
          borderColor: theme.borderStrong 
        }
      case 'hard':
        return { 
          backgroundColor: theme.surface, 
          ...Shadows.hard, 
          borderWidth: 2, 
          borderColor: theme.black 
        }
      case 'glow':
        return { 
          backgroundColor: theme.surface, 
          ...Shadows.glow, 
          borderWidth: 1, 
          borderColor: theme.primary 
        }
      case 'gradient':
        return {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        }
      default:
        return { 
          backgroundColor: theme.surface, 
          borderWidth: 1, 
          borderColor: theme.border 
        }
    }
  }

  const baseContent = (
    <>
      {accent && <View style={[styles.accentStrip, { backgroundColor: theme.primary }]} />}
      <View style={accent ? styles.accentContent : undefined}>{children}</View>
    </>
  )

  if (pressable || onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          getVariantStyle(),
          accent && styles.accentContainer,
          animatedStyle,
          style
        ]}
      >
        {resolvedVariant === 'gradient' ? (
          <LinearGradient
            colors={[theme.background, theme.surface]}
            style={StyleSheet.absoluteFill}
          >
            {baseContent}
          </LinearGradient>
        ) : baseContent}
      </AnimatedPressable>
    )
  }

  return (
    <View style={[
      styles.card,
      getVariantStyle(),
      accent && styles.accentContainer,
      style
    ]}>
      {resolvedVariant === 'gradient' ? (
         <LinearGradient
            colors={[theme.background, theme.surface]}
            style={StyleSheet.absoluteFill}
          >
            {baseContent}
          </LinearGradient>
      ) : baseContent}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  accentContainer: {
    flexDirection: 'row',
    padding: 0,
  },
  accentStrip: {
    width: 4,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  accentContent: {
    flex: 1,
    padding: Spacing.md,
  },
})

