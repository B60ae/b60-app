import { Pressable, Text, StyleSheet, ActivityIndicator, Platform, View, ViewStyle, TextStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { LightTheme, DarkTheme, Radius, Shadows, Spacing } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'brand' | 'yellow' | 'hard'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  shadow?: boolean
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  shadow = false,
}: ButtonProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 12, stiffness: 400 })
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 400 })
  }

  const isGradient = variant === 'brand'
  const isHard = variant === 'hard'
  
  const shadowStyle = shadow 
    ? (isHard ? Shadows.hard : (variant === 'brand' ? Shadows.glowStrong : Shadows.card))
    : {}

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.black,
    },
    secondary: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.borderStrong,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    yellow: {
      backgroundColor: theme.yellow,
      borderWidth: 2,
      borderColor: theme.black,
    },
    brand: {
      borderWidth: 2,
      borderColor: theme.black,
    },
    hard: {
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.black,
    },
  }

  const textColors: Record<ButtonVariant, string> = {
    primary: theme.white,
    secondary: theme.text,
    outline: theme.primary,
    ghost: theme.primary,
    brand: theme.white,
    yellow: theme.black,
    hard: theme.white,
  }

  const containerStyle = [
    styles.base,
    styles.sizes[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled as ViewStyle,
    variantStyles[variant],
    shadowStyle as ViewStyle,
    animatedStyle,
  ]

  const content = loading ? (
    <ActivityIndicator color={textColors[variant]} size="small" />
  ) : (
    <Text style={[
      styles.text, 
      styles.textSizes[size], 
      { color: textColors[variant] }
    ]}>
      {title}
    </Text>
  )

  if (isGradient) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles.sizes[size],
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled as ViewStyle,
          styles.gradientWrapper,
          { borderColor: theme.black },
          animatedStyle,
          shadowStyle as ViewStyle,
        ]}
      >
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles.sizes[size]]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    )
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={containerStyle}
    >
      {content}
    </AnimatedPressable>
  )
}

const styles = {
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    overflow: 'hidden',
  } as ViewStyle,
  fullWidth: { width: '100%' } as ViewStyle,
  disabled: { opacity: 0.5 },
  
  gradientWrapper: {
    padding: 0,
    borderWidth: 2,
  } as ViewStyle,
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  sizes: {
    sm: { paddingVertical: 8, paddingHorizontal: 16 } as ViewStyle,
    md: { paddingVertical: 14, paddingHorizontal: 24 } as ViewStyle,
    lg: { paddingVertical: 18, paddingHorizontal: 32 } as ViewStyle,
  },

  text: { fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' } as TextStyle,
  textSizes: {
    sm: { fontSize: 13 } as TextStyle,
    md: { fontSize: 15 } as TextStyle,
    lg: { fontSize: 17 } as TextStyle,
  },
}
