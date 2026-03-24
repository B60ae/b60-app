import { Pressable, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Colors, Radius, Typography } from '../../utils/theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false,
}: ButtonProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePressIn = () => {
    scale.value = withSpring(0.96)
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
  const handlePressOut = () => { scale.value = withSpring(1) }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        animatedStyle,
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.white} size="small" />
        : <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>{title}</Text>
      }
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surfaceElevated },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 14, paddingHorizontal: 24 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 32 },
  text: { fontWeight: '700' },
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.text },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
})
