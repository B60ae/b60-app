import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { MapPin, UtensilsCrossed, Star } from 'lucide-react-native'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

// Confetti dot config
const DOTS = [
  { color: Colors.primary, dx: -90, dy: -110, size: 10, delay: 0 },
  { color: Colors.yellow, dx: 80, dy: -130, size: 8, delay: 60 },
  { color: Colors.success, dx: 120, dy: -60, size: 12, delay: 30 },
  { color: Colors.primary, dx: -120, dy: -50, size: 7, delay: 80 },
  { color: Colors.yellow, dx: 60, dy: -150, size: 9, delay: 50 },
  { color: Colors.primaryLight, dx: -60, dy: -140, size: 11, delay: 20 },
  { color: Colors.success, dx: 100, dy: -100, size: 8, delay: 70 },
  { color: Colors.primary, dx: -30, dy: -160, size: 10, delay: 40 },
]

function ConfettiDot({
  color, dx, dy, size, delay,
}: {
  color: string; dx: number; dy: number; size: number; delay: number
}) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }))
    x.value = withDelay(delay, withSpring(dx, { damping: 14, stiffness: 80 }))
    y.value = withDelay(
      delay,
      withSequence(
        withSpring(dy, { damping: 12, stiffness: 70 }),
        withDelay(600, withTiming(dy + 80, { duration: 600, easing: Easing.in(Easing.quad) })),
      ),
    )
    opacity.value = withDelay(delay + 400, withTiming(0, { duration: 500 }))
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }] as any,
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  )
}

export default function OrderSuccessScreen() {
  const { orderId, pointsEarned } = useLocalSearchParams<{ orderId: string; pointsEarned: string }>()
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  const checkScale = useSharedValue(0)
  const checkOpacity = useSharedValue(0)
  const ringScale = useSharedValue(1)
  const contentY = useSharedValue(40)
  const contentOpacity = useSharedValue(0)
  const pointsY = useSharedValue(40)
  const pointsOpacity = useSharedValue(0)
  const coinRotate = useSharedValue(0)

  const pts = Number(pointsEarned ?? 0)

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    checkScale.value = withSpring(1, { damping: 8, stiffness: 60 })
    checkOpacity.value = withTiming(1, { duration: 250 })

    ringScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    )

    contentY.value = withDelay(350, withSpring(0, { damping: 14, stiffness: 100 }))
    contentOpacity.value = withDelay(350, withTiming(1, { duration: 350 }))

    if (pts > 0) {
      pointsY.value = withDelay(600, withSpring(0, { damping: 14, stiffness: 100 }))
      pointsOpacity.value = withDelay(600, withTiming(1, { duration: 350 }))
      coinRotate.value = withDelay(700, withTiming(360, { duration: 800, easing: Easing.out(Easing.cubic) }))
    }
  }, [])

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }))

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }))

  const contentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: contentOpacity.value,
  }))

  const pointsAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pointsY.value }],
    opacity: pointsOpacity.value,
  }))

  const coinAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${coinRotate.value}deg` }],
  }))

  const gradientColors = themeMode === 'dark'
    ? ['#000000', '#0A0A0A', '#121212'] as const
    : ['#000000', '#FFF8F5', '#F8F9FA'] as const

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Check + confetti zone */}
      <View style={styles.heroZone}>
        {DOTS.map((dot, i) => (
          <ConfettiDot key={i} {...dot} />
        ))}

        <Animated.View style={[styles.ringOuter, ringAnimStyle]}>
          <Animated.View style={[styles.checkWrapper, checkAnimStyle]}>
            <View style={styles.checkCircleOuter}>
              <View style={styles.checkCircleInner}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Main content */}
      <Animated.View style={[styles.content, contentAnimStyle]}>
        <Text style={[styles.title, { color: T.text }]}>IT'S SMASHING!</Text>
        <Text style={[styles.subtitle, { color: T.textSecondary }]}>Your order is being fired up right now.</Text>

        {/* Order number card */}
        {orderId && (
          <View style={[styles.orderIdCard, { backgroundColor: T.surface }]}>
            <Text style={[styles.orderIdLabel, { color: T.textMuted }]}>YOUR ORDER</Text>
            <Text style={[styles.orderIdValue, { color: T.text }]}>#{orderId.slice(-6).toUpperCase()}</Text>
            <Text style={[styles.orderIdSub, { color: T.textMuted }]}>Flash this at the counter to collect</Text>
          </View>
        )}

        {/* Points card */}
        {pts > 0 && (
          <Animated.View style={[styles.pointsCard, pointsAnimStyle]}>
            <Animated.View style={[styles.coinWrapper, coinAnimStyle]}>
              <Star size={28} color="#22C55E" fill="#22C55E" />
            </Animated.View>
            <View style={styles.pointsTextBlock}>
              <Text style={[styles.pointsTitle, { color: T.text }]}>+{pts} POINTS EARNED</Text>
              <Text style={[styles.pointsSub, { color: T.textSecondary }]}>Stacking in your B60 Club</Text>
            </View>
          </Animated.View>
        )}

        {/* CTAs */}
        <View style={styles.ctaGroup}>
          <Pressable
            style={[styles.trackBtn, !orderId && { opacity: 0.4 }]}
            disabled={!orderId}
            onPress={() => orderId && router.replace({ pathname: '/order/[id]', params: { id: orderId } })}
          >
            <MapPin size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.trackBtnText}>TRACK MY ORDER</Text>
          </Pressable>
          <Pressable style={[styles.menuBtn, { backgroundColor: T.surface, borderColor: T.border }]} onPress={() => router.replace('/(tabs)/menu')}>
            <UtensilsCrossed size={16} color={T.textSecondary} strokeWidth={2} />
            <Text style={[styles.menuBtnText, { color: T.textSecondary }]}>Back to Menu</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },

  heroZone: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    width: 200,
    height: 200,
  },
  ringOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(34,197,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.18)',
  },
  checkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'rgba(34,197,94,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  checkMark: {
    fontSize: 42,
    color: Colors.white,
    fontWeight: '900',
    lineHeight: 50,
  },

  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: -6,
  },

  orderIdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    width: '100%',
    gap: 4,
    ...Shadows.glow,
  },
  orderIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  orderIdValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
  },
  orderIdSub: {
    fontSize: 12,
    fontWeight: '500',
  },

  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(34,197,94,0.07)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.22)',
    width: '100%',
  },
  coinWrapper: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pointsTextBlock: { flex: 1 },
  pointsTitle: { fontSize: 18, fontWeight: '800' },
  pointsSub: { fontSize: 13, marginTop: 2 },

  ctaGroup: { width: '100%', gap: Spacing.sm, marginTop: Spacing.sm },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    ...Shadows.glowStrong,
  },
  trackBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
  },
  menuBtnText: { fontSize: 15, fontWeight: '700' },
})
