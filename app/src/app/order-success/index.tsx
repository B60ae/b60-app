import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

export default function OrderSuccessScreen() {
  const { orderId, pointsEarned } = useLocalSearchParams<{ orderId: string; pointsEarned: string }>()

  const checkScale = useRef(new Animated.Value(0)).current
  const checkOpacity = useRef(new Animated.Value(0)).current
  const contentSlide = useRef(new Animated.Value(40)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const coinScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(contentSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(coinScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
    ]).start()
  }, [])

  const pts = Number(pointsEarned ?? 0)

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated check circle */}
      <Animated.View style={[styles.checkWrapper, { transform: [{ scale: checkScale }], opacity: checkOpacity }]}>
        <View style={styles.checkCircleOuter}>
          <View style={styles.checkCircleInner}>
            <Text style={styles.checkEmoji}>✓</Text>
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { transform: [{ translateY: contentSlide }], opacity: contentOpacity }]}>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>We're getting your order ready.</Text>

        {orderId && (
          <View style={[styles.orderIdCard, Shadows.card]}>
            <Text style={styles.orderIdLabel}>Order Number</Text>
            <Text style={styles.orderIdValue}>#{orderId.slice(-6).toUpperCase()}</Text>
          </View>
        )}

        {pts > 0 && (
          <Animated.View style={[styles.pointsCard, { transform: [{ scale: coinScale }] }]}>
            <Text style={styles.pointsEmoji}>🏅</Text>
            <View>
              <Text style={styles.pointsTitle}>+{pts} Points Earned</Text>
              <Text style={styles.pointsSub}>Added to your loyalty balance</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.ctaGroup}>
          <Pressable
            style={styles.trackBtn}
            onPress={() => router.replace({ pathname: '/order/[id]', params: { id: orderId ?? '' } })}
          >
            <Text style={styles.trackBtnText}>Track My Order</Text>
          </Pressable>
          <Pressable
            style={styles.menuBtn}
            onPress={() => router.replace('/(tabs)/menu')}
          >
            <Text style={styles.menuBtnText}>Back to Menu</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  checkWrapper: { marginBottom: Spacing.xl },
  checkCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmoji: { fontSize: 44, color: Colors.white, fontWeight: '900' },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 32, fontWeight: '900', color: Colors.text },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: -4 },
  orderIdCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
  orderIdLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5 },
  orderIdValue: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: 2 },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    width: '100%',
  },
  pointsEmoji: { fontSize: 36 },
  pointsTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  pointsSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  ctaGroup: { width: '100%', gap: Spacing.sm, marginTop: Spacing.sm },
  trackBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
    ...Shadows.glowStrong,
  },
  trackBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  menuBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
})
