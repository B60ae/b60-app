import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Radius, Spacing, Shadows } from '../../utils/theme'

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
        colors={['#F05A1A', '#C94400']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <View style={styles.left}>
          <Text style={styles.pointsNum}>{points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.mid}>
          <Text style={styles.aed}>AED {aedValue.toFixed(2)}</Text>
          <Text style={styles.aedLabel}>redeemable value</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[tier] }]}>
          <Text style={styles.tierText}>{tier}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadows.glowStrong,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pointsNum: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
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
    color: Colors.white,
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
    color: Colors.black,
  },
})
