import React, { useState } from 'react'
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
import Svg, { G, Path, Text as SvgText } from 'react-native-svg'
import { gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W } = Dimensions.get('window')
const WHEEL_SIZE = W - 64
const R = WHEEL_SIZE / 2
const CX = R
const CY = R

const SEGMENTS = [
  { label: '10 PTS',      color: '#F05A1A' },
  { label: '25 PTS',      color: '#1B2A4A' },
  { label: '50 PTS',      color: '#C94400' },
  { label: '10% OFF',     color: '#16A34A' },
  { label: '100 PTS',     color: '#F05A1A' },
  { label: '25 PTS',      color: '#1B2A4A' },
  { label: 'FREE\nBURGER',color: '#FFE500' },
  { label: '50 PTS',      color: '#C94400' },
  { label: '250 PTS',     color: '#F05A1A' },
  { label: '15% OFF',     color: '#16A34A' },
]

const N = SEGMENTS.length
const SEG_DEG = 360 / N

function polarToXY(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function segPath(i: number) {
  const startDeg = i * SEG_DEG
  const endDeg = startDeg + SEG_DEG
  const start = polarToXY(startDeg, R - 2)
  const end = polarToXY(endDeg, R - 2)
  const largeArc = SEG_DEG > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R - 2} ${R - 2} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function WheelSvg() {
  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
      {SEGMENTS.map((seg, i) => {
        const midDeg = i * SEG_DEG + SEG_DEG / 2
        const textPos = polarToXY(midDeg, R * 0.62)
        const textColor = seg.color === '#FFE500' ? '#000' : '#fff'
        const lines = seg.label.split('\n')
        return (
          <G key={i}>
            <Path d={segPath(i)} fill={seg.color} stroke="#fff" strokeWidth={1.5} />
            {lines.map((line, li) => (
              <SvgText
                key={li}
                x={textPos.x}
                y={textPos.y + (li - (lines.length - 1) / 2) * 11}
                fill={textColor}
                fontSize={9}
                fontWeight="900"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {line}
              </SvgText>
            ))}
          </G>
        )
      })}
    </Svg>
  )
}

function prizeLabel(type: string, value: string) {
  if (type === 'points') return `+${value} Points!`
  if (type === 'discount') return `${value} Discount!`
  if (type === 'free_item') return `Free ${value}!`
  return 'Better luck next time'
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

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
          <Animated.View style={[styles.wheelContainer, animStyle]}>
            <WheelSvg />
          </Animated.View>

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
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  hub: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glowStrong,
  },
  hubText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1 },
  statusText: { fontSize: 13, fontWeight: '600' },

  resultCard: { width: '100%', borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
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
