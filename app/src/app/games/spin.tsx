import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, RotateCcw } from 'lucide-react-native'
import { gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W } = Dimensions.get('window')
const WHEEL_SIZE = W - 64

// Wheel segments — must match backend SPIN_PRIZES order & weights (visual only)
const SEGMENTS = [
  { label: '10 PTS',        color: '#F05A1A', textColor: '#fff' },
  { label: '25 PTS',        color: '#1B2A4A', textColor: '#fff' },
  { label: '50 PTS',        color: '#C94400', textColor: '#fff' },
  { label: '10% OFF',       color: '#16A34A', textColor: '#fff' },
  { label: '100 PTS',       color: '#F05A1A', textColor: '#fff' },
  { label: '25 PTS',        color: '#1B2A4A', textColor: '#fff' },
  { label: 'FREE BURGER',   color: '#FFE500', textColor: '#000' },
  { label: '50 PTS',        color: '#C94400', textColor: '#fff' },
  { label: '250 PTS',       color: '#F05A1A', textColor: '#fff' },
  { label: '15% OFF',       color: '#16A34A', textColor: '#fff' },
]

const SEG_ANGLE = 360 / SEGMENTS.length

function prizeLabel(type: string, value: string) {
  if (type === 'points') return `+${value} Points!`
  if (type === 'discount') return `${value} Discount!`
  if (type === 'free_item') return `Free ${value}!`
  return 'Better luck next time'
}

// Draw wheel using SVG-like approach with View transforms
function WheelSegment({ index, total, label, color, textColor }: {
  index: number; total: number; label: string; color: string; textColor: string
}) {
  const angle = (360 / total) * index
  const segAngle = 360 / total

  return (
    <View
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-start' }]}
      pointerEvents="none"
    >
      <View style={{
        position: 'absolute',
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
        transform: [{ rotate: `${angle}deg` }],
        alignItems: 'center',
      }}>
        {/* Segment wedge using overflow hidden trick */}
        <View style={{
          width: 2,
          height: WHEEL_SIZE / 2,
          backgroundColor: color,
          transformOrigin: 'bottom center',
          transform: [{ scaleX: Math.tan((segAngle / 2) * Math.PI / 180) * (WHEEL_SIZE / 2) / 1 }],
          opacity: 0.95,
        }} />
        <Text style={{
          position: 'absolute',
          top: WHEEL_SIZE * 0.18,
          fontSize: 10,
          fontWeight: '900',
          color: textColor,
          textAlign: 'center',
          transform: [{ rotate: `${segAngle / 2}deg` }],
          width: 56,
        }} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  )
}

// Simple pie-based wheel using colored border sectors
function SpinWheel({ rotation }: { rotation: Animated.SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <Animated.View style={[styles.wheel, animStyle]}>
      {SEGMENTS.map((seg, i) => {
        const angle = SEG_ANGLE * i
        const mid = angle + SEG_ANGLE / 2
        const r = WHEEL_SIZE / 2 - 20
        const x = r * Math.sin((mid * Math.PI) / 180)
        const y = -r * Math.cos((mid * Math.PI) / 180)
        return (
          <View key={i} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <View style={{
              position: 'absolute',
              transform: [{ translateX: x }, { translateY: y }, { rotate: `${mid}deg` }],
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 }} numberOfLines={2}>
                {seg.label}
              </Text>
            </View>
          </View>
        )
      })}
      {/* Colored sector lines */}
      {SEGMENTS.map((seg, i) => {
        const angle = SEG_ANGLE * i
        return (
          <View key={`s${i}`} style={[StyleSheet.absoluteFill]} pointerEvents="none">
            <View style={{
              position: 'absolute',
              top: 0, left: WHEEL_SIZE / 2 - 1,
              width: 2, height: WHEEL_SIZE / 2,
              backgroundColor: 'rgba(0,0,0,0.3)',
              transformOrigin: `1px ${WHEEL_SIZE / 2}px`,
              transform: [{ rotate: `${angle}deg` }],
            }} />
          </View>
        )
      })}
    </Animated.View>
  )
}

export default function SpinScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()

  const rotation = useSharedValue(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ type: string; prize_value: string; voucher_code: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: spinStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['games', 'spin-status'],
    queryFn: gamesApi.spinStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const doSpin = async () => {
    if (spinning || !spinStatus?.can_spin) return
    setSpinning(true)
    setResult(null)
    setError(null)

    try {
      const res = await gamesApi.spin()

      // Spin 5–8 full rotations + land on a visually random segment
      const extraSpins = 5 + Math.floor(Math.random() * 3)
      const landAngle = Math.random() * 360
      const target = rotation.value + extraSpins * 360 + landAngle

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

      rotation.value = withTiming(target, { duration: 4000, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(handleSpinDone)(res)
      })
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Something went wrong')
      setSpinning(false)
    }
  }

  const handleSpinDone = (res: { prize_type: string; prize_value: string; voucher_code: string | null }) => {
    setResult({ type: res.prize_type, prize_value: res.prize_value, voucher_code: res.voucher_code })
    setSpinning(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    refetchStatus()
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>SPIN THE WHEEL</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* Pointer */}
        <View style={styles.pointer} />

        {/* Wheel */}
        <View style={styles.wheelWrap}>
          {/* Colored background sectors */}
          <View style={[styles.wheel, { position: 'absolute' }]}>
            {SEGMENTS.map((seg, i) => (
              <View key={i} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                <View style={{
                  position: 'absolute',
                  width: WHEEL_SIZE,
                  height: WHEEL_SIZE,
                  borderRadius: WHEEL_SIZE / 2,
                  overflow: 'hidden',
                }} />
              </View>
            ))}
          </View>

          <SpinWheel rotation={rotation} />

          {/* Center hub */}
          <View style={styles.hub}>
            <Text style={styles.hubText}>B60</Text>
          </View>
        </View>

        {/* Status */}
        {spinStatus && (
          <View style={[styles.statusRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <RotateCcw size={14} color={Colors.primary} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {spinStatus.spins_left > 0
                ? `${spinStatus.spins_left} spin${spinStatus.spins_left !== 1 ? 's' : ''} remaining today`
                : 'No spins left · Order to get more'}
            </Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <LinearGradient
            colors={result.type === 'nothing' ? [theme.surface, theme.surface] : [Colors.primary, Colors.primaryDark]}
            style={styles.resultCard}
          >
            <Text style={[styles.resultEmoji]}>{result.type === 'nothing' ? '😅' : '🎉'}</Text>
            <Text style={styles.resultLabel}>{prizeLabel(result.type, result.prize_value ?? '')}</Text>
            {result.voucher_code && (
              <View style={styles.voucherBox}>
                <Text style={styles.voucherLabel}>YOUR VOUCHER CODE</Text>
                <Text style={styles.voucherCode}>{result.voucher_code}</Text>
                <Text style={styles.voucherNote}>Use this at checkout · Valid 30 days</Text>
              </View>
            )}
          </LinearGradient>
        )}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.errorTint, borderColor: theme.error }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {/* Spin Button */}
        <Pressable
          style={[styles.spinBtn, { opacity: (!spinStatus?.can_spin || spinning) ? 0.45 : 1 }]}
          onPress={doSpin}
          disabled={!spinStatus?.can_spin || spinning}
        >
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.spinBtnGradient}>
            <Text style={styles.spinBtnText}>{spinning ? 'SPINNING...' : 'SPIN NOW'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.md },

  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 24,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: Colors.primary,
    zIndex: 10,
  },
  wheelWrap: { width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center', justifyContent: 'center' },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1B2A4A',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  hub: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glowStrong,
  },
  hubText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1 },
  statusText: { fontSize: 13, fontWeight: '600' },

  resultCard: { width: '100%', borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  resultEmoji: { fontSize: 36 },
  resultLabel: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  voucherBox: { width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 },
  voucherLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase' },
  voucherCode: { fontSize: 24, fontWeight: '900', color: Colors.yellow, letterSpacing: 3 },
  voucherNote: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  errorBox: { width: '100%', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  errorText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  spinBtn: { width: '100%' },
  spinBtnGradient: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center' },
  spinBtnText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 1 },
})
