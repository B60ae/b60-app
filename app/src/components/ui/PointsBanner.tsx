import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { LightTheme, DarkTheme, Radius, Spacing, Shadows } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

interface PointsBannerProps {
  points: number
  tier: 'Bronze' | 'Silver' | 'Gold'
  aedValue: number
  onPress?: () => void
}

const TIER_COLORS = {
  Bronze: '#CD7F32',
  Silver: '#A8A8A8',
  Gold: '#FFD700',
}

export function PointsBanner({ points, tier, aedValue, onPress }: PointsBannerProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const animatedPoints = useSharedValue(0)

  useEffect(() => {
    animatedPoints.value = withTiming(points, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    })
  }, [points])

  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.container, Shadows.glowStrong]}
      >
        <View style={styles.left}>
          <Text style={[styles.pointsNum, { color: theme.white }]}>{points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.mid}>
          <Text style={[styles.aed, { color: theme.white }]}>AED {aedValue.toFixed(2)}</Text>
          <Text style={styles.aedLabel}>redeemable value</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[tier] }]}>
          <Text style={[styles.tierText, { color: theme.black }]}>{tier}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pointsNum: {
    fontSize: 28,
    fontWeight: '900',
  },
  pointsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  mid: {
    flex: 1,
  },
  aed: {
    fontSize: 16,
    fontWeight: '700',
  },
  aedLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '800',
  },
})
