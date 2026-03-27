import { Pressable, Text, StyleSheet, ActivityIndicator, Platform, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Radius, Shadows, Spacing } from '../../utils/theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'brand' | 'yellow'
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

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: Colors.white,
  secondary: Colors.text,
  outline: Colors.primary,
  ghost: Colors.primary,
  brand: Colors.white,
  yellow: Colors.text,
}

const INDICATOR_COLOR: Record<ButtonVariant, string> = {
  primary: Colors.white,
  secondary: Colors.text,
  outline: Colors.primary,
  ghost: Colors.primary,
  brand: Colors.white,
  yellow: Colors.text,
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
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 })
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }

  const isGradient = variant === 'brand'
  const shadowStyle = shadow && variant === 'brand' ? Shadows.glowStrong : {}

  const containerStyle = [
    styles.base,
    styles[`size_${size}` as keyof typeof styles],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    animatedStyle,
    shadowStyle,
  ]

  const content = loading ? (
    <ActivityIndicator color={INDICATOR_COLOR[variant]} size="small" />
  ) : (
    <Text style={[styles.text, styles[`textSize_${size}` as keyof typeof styles], { color: TEXT_COLOR[variant] }]}>
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
          styles[`size_${size}` as keyof typeof styles],
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          styles.gradientWrapper,
          animatedStyle,
          shadowStyle,
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles[`size_${size}` as keyof typeof styles]]}
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
      style={[
        containerStyle,
        styles[variant as keyof typeof styles],
      ]}
    >
      {content}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },

  // Variant backgrounds + borders
  primary: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  secondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yellow: {
    backgroundColor: Colors.yellow,
    borderWidth: 1,
    borderColor: '#D4BF00',
  },

  // Gradient brand variant
  gradientWrapper: {
    padding: 0,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sizes
  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 14, paddingHorizontal: 24 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 32 },

  // Text
  text: { fontWeight: '700', letterSpacing: 0.2 },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
})
