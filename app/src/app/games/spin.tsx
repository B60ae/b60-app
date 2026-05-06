import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, Pressable, Dimensions, Modal,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS,
  withSpring, withSequence,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, Gift, X, Zap, Star, RotateCcw } from 'lucide-react-native'
import Svg, {
  G, Path, Text as SvgText, Circle,
  Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, Line,
} from 'react-native-svg'
import { gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W } = Dimensions.get('window')
// Wheel fits comfortably with padding for the bulb ring
const WHEEL_SIZE = Math.min(W - 64, 320)
const R = WHEEL_SIZE / 2
const CX = R
const CY = R
// Inner radius where segments start (leaves room for outer rim)
const OUTER_R = R - 2
const INNER_R = 38  // hub radius

const SEGMENTS = [
  { label: '10 PTS',       color: '#C93D08', textColor: '#fff' },
  { label: '25 PTS',       color: '#1B2A4A', textColor: '#fff' },
  { label: '50 PTS',       color: '#E04A18', textColor: '#fff' },
  { label: '10% OFF',      color: '#166534', textColor: '#fff' },
  { label: '100 PTS',      color: '#F05A1A', textColor: '#fff' },
  { label: '25 PTS',       color: '#1B2A4A', textColor: '#fff' },
  { label: 'FREE\nBURGER', color: '#F5C400', textColor: '#1B2A4A' },
  { label: '50 PTS',       color: '#C93D08', textColor: '#fff' },
  { label: '250 PTS',      color: '#F05A1A', textColor: '#fff' },
  { label: '15% OFF',      color: '#166534', textColor: '#fff' },
]

const N = SEGMENTS.length
const SEG_DEG = 360 / N
const BULB_COUNT = 16
// Bulbs sit on a ring just outside the wheel
const BULB_R = R + 18

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function segPath(i: number) {
  const s = polarToXY(i * SEG_DEG, OUTER_R)
  const e = polarToXY((i + 1) * SEG_DEG, OUTER_R)
  const si = polarToXY(i * SEG_DEG, INNER_R)
  const ei = polarToXY((i + 1) * SEG_DEG, INNER_R)
  const large = SEG_DEG > 180 ? 1 : 0
  // Wedge from inner radius to outer radius (donut segment)
  return [
    `M ${si.x} ${si.y}`,
    `L ${s.x} ${s.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ')
}

// ─── Wheel SVG (static — does not rotate, parent View rotates) ───────────────
function WheelSvg() {
  const svgSize = WHEEL_SIZE + 44  // extra space for bulb ring

  return (
    <Svg width={svgSize} height={svgSize} viewBox={`${-22} ${-22} ${svgSize} ${svgSize}`}>
      <Defs>
        <RadialGradient id="hub" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7A3D" />
          <Stop offset="100%" stopColor="#B83500" />
        </RadialGradient>
        <RadialGradient id="hubShine" cx="35%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>

      {/* ── Outer gold rim ── */}
      <Circle cx={CX} cy={CY} r={R + 10} fill="#8B5E0A" />
      <Circle cx={CX} cy={CY} r={R + 8}  fill="#F5C400" />
      <Circle cx={CX} cy={CY} r={R + 4}  fill="#B8860B" />
      <Circle cx={CX} cy={CY} r={R + 1}  fill="#1A0800" />

      {/* ── Segments ── */}
      {SEGMENTS.map((seg, i) => {
        const midDeg = i * SEG_DEG + SEG_DEG / 2
        const midRad = ((midDeg - 90) * Math.PI) / 180
        // Text sits at 65% radius
        const textR = INNER_R + (OUTER_R - INNER_R) * 0.52
        const tx = CX + textR * Math.cos(midRad)
        const ty = CY + textR * Math.sin(midRad)
        const lines = seg.label.split('\n')
        // Text always reads outward from center:
        // rotate so baseline faces outward. For top half rotate = midDeg (points down-outward)
        // For bottom half we add 180 so text doesn't flip upside down
        const textRot = midDeg <= 180 ? midDeg : midDeg + 180

        return (
          <G key={i}>
            <Path d={segPath(i)} fill={seg.color} />
            {/* Subtle inner shadow on each segment edge */}
            <Path
              d={segPath(i)}
              fill="none"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={1.5}
            />
            <G transform={`translate(${tx},${ty}) rotate(${textRot})`}>
              {lines.map((line, li) => (
                <SvgText
                  key={li}
                  x={0}
                  y={(li - (lines.length - 1) / 2) * 14}
                  fill={seg.textColor}
                  fontSize={lines.length > 1 ? 10 : 12}
                  fontWeight="900"
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {line}
                </SvgText>
              ))}
            </G>
          </G>
        )
      })}

      {/* ── Divider lines ── */}
      {SEGMENTS.map((_, i) => {
        const a = polarToXY(i * SEG_DEG, INNER_R)
        const b = polarToXY(i * SEG_DEG, OUTER_R)
        return (
          <Line
            key={`d${i}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.5}
          />
        )
      })}

      {/* ── Bulb ring (outside wheel, inside SVG) ── */}
      {/* Rendered in WheelSvg so they rotate WITH the wheel */}
      {/* Actually bulbs should be STATIC — rendered separately below */}

      {/* ── Center hub ── */}
      <Circle cx={CX} cy={CY} r={INNER_R + 2} fill="#0A0A0A" />
      <Circle cx={CX} cy={CY} r={INNER_R}     fill="url(#hub)" />
      <Circle cx={CX} cy={CY} r={INNER_R}     fill="url(#hubShine)" />
      <Circle cx={CX} cy={CY} r={INNER_R}     fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
    </Svg>
  )
}

// ─── Static bulb ring (does NOT rotate) ──────────────────────────────────────
function BulbRing({ bulbOn }: { bulbOn: boolean }) {
  // Total container size = WHEEL_SIZE + 44 (same as SVG viewBox)
  const containerSize = WHEEL_SIZE + 44
  const center = containerSize / 2

  return (
    <View
      style={{ position: 'absolute', width: containerSize, height: containerSize }}
      pointerEvents="none"
    >
      {Array.from({ length: BULB_COUNT }, (_, i) => {
        const angle = (360 / BULB_COUNT) * i
        const rad = ((angle - 90) * Math.PI) / 180
        // BULB_R is relative to wheel center, which is at `center`
        const x = center + BULB_R * Math.cos(rad)
        const y = center + BULB_R * Math.sin(rad)
        const isOn = i % 2 === 0 ? bulbOn : !bulbOn
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x - 7,
              top: y - 7,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: isOn ? '#FFF3D6' : '#5A3A00',
              borderWidth: 1.5,
              borderColor: isOn ? '#F5C400' : '#3A2200',
              shadowColor: isOn ? '#FFE500' : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isOn ? 0.9 : 0,
              shadowRadius: 8,
              elevation: isOn ? 6 : 0,
            }}
          />
        )
      })}
    </View>
  )
}

// ─── Pointer (static, above wheel) ───────────────────────────────────────────
function Pointer() {
  return (
    <View style={pointerStyles.wrap}>
      {/* Shadow layer */}
      <View style={pointerStyles.shadow} />
      {/* Main triangle */}
      <View style={pointerStyles.triangle} />
      {/* Highlight stripe */}
      <View style={pointerStyles.highlight} />
    </View>
  )
}

const pointerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    zIndex: 20,
    marginBottom: -6,
  },
  shadow: {
    position: 'absolute',
    top: 3,
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 26,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.4)',
  },
  triangle: {
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 26,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
  },
  highlight: {
    position: 'absolute',
    top: 2,
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
})

// ─── Confetti dots ────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [Colors.primary, '#F5C400', Colors.success, '#3FA9F5', Colors.primaryDark]

function ConfettiDot({ dx, dy, color, delay }: { dx: number; dy: number; color: string; delay: number }) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 100 })
    scale.value = withSpring(1, { damping: 10, stiffness: 200 })
    x.value = withSpring(dx, { damping: 14, stiffness: 80 })
    y.value = withSequence(
      withSpring(dy, { damping: 12, stiffness: 70 }),
      withTiming(dy + 120, { duration: 600, easing: Easing.in(Easing.quad) }),
    )
    const t = setTimeout(() => { opacity.value = withTiming(0, { duration: 300 }) }, delay + 600)
    return () => clearTimeout(t)
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]} />
  )
}

// ─── Win Modal ────────────────────────────────────────────────────────────────
function WinModal({
  visible, result, onClose,
}: {
  visible: boolean
  result: { type: string; prize_value: string; voucher_code: string | null } | null
  onClose: () => void
}) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme
  const [confetti, setConfetti] = useState<Array<{ id: number; dx: number; dy: number; color: string; delay: number }>>([])
  const modalScale = useSharedValue(0.85)
  const modalOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      modalScale.value = withSpring(1, { damping: 14, stiffness: 120 })
      modalOpacity.value = withTiming(1, { duration: 180 })
      setConfetti(Array.from({ length: 20 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 280,
        dy: -(70 + Math.random() * 140),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: i * 35,
      })))
      setTimeout(() => setConfetti([]), 2500)
    } else {
      modalScale.value = withTiming(0.9, { duration: 150 })
      modalOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [visible])

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }))

  if (!result) return null

  const isNothing = result.type === 'nothing'
  const prizeText = result.type === 'points' ? `+${result.prize_value} PTS`
    : result.type === 'discount' ? `${result.prize_value} OFF`
    : result.type === 'free_item' ? `FREE ${result.prize_value.toUpperCase()}`
    : '—'

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={mStyles.backdrop} onPress={onClose}>
        <View style={{ alignItems: 'center' }} pointerEvents="box-none">
          {confetti.map((c) => (
            <ConfettiDot key={c.id} dx={c.dx} dy={c.dy} color={c.color} delay={c.delay} />
          ))}
          <Animated.View
            style={[mStyles.card, { backgroundColor: T.background }, modalStyle]}
            onStartShouldSetResponder={() => true}
          >
            <Pressable style={mStyles.closeBtn} onPress={onClose} hitSlop={12}>
              <X size={20} color={T.textMuted} />
            </Pressable>

            {/* Icon */}
            <LinearGradient
              colors={isNothing ? ['#444', '#222'] : ['#F5C400', Colors.primary]}
              style={mStyles.iconCircle}
            >
              {isNothing
                ? <RotateCcw size={34} color="#fff" />
                : <Gift size={34} color="#fff" />
              }
            </LinearGradient>

            <Text style={[mStyles.title, { color: T.text }]}>
              {isNothing ? 'BETTER LUCK!' : 'YOU WON!'}
            </Text>
            <Text style={[mStyles.sub, { color: T.textSecondary }]}>
              {isNothing ? 'Try again tomorrow' : 'Congratulations'}
            </Text>

            {!isNothing && (
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={mStyles.prizeBanner}
              >
                <Text style={mStyles.prizeText}>{prizeText}</Text>
              </LinearGradient>
            )}

            {result.voucher_code && (
              <View style={[mStyles.voucherBox, { backgroundColor: T.surface, borderColor: T.border }]}>
                <Text style={[mStyles.voucherLabel, { color: T.textMuted }]}>YOUR CODE</Text>
                <Text style={mStyles.voucherCode}>{result.voucher_code}</Text>
                <Text style={[mStyles.voucherNote, { color: T.textMuted }]}>Valid 30 days · use at checkout</Text>
              </View>
            )}

            <Pressable onPress={onClose} style={{ width: '100%' }}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={mStyles.claimBtn}>
                <Text style={mStyles.claimText}>{isNothing ? 'GOT IT' : 'AWESOME!'}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  )
}

const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%', borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center', gap: 14,
    elevation: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 24,
  },
  closeBtn: { position: 'absolute', top: 14, right: 14, padding: 4 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glowStrong,
  },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  sub: { fontSize: 14, marginTop: -8 },
  prizeBanner: {
    width: '100%', borderRadius: Radius.lg,
    paddingVertical: 18, alignItems: 'center',
    ...Shadows.glowStrong,
  },
  prizeText: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  voucherBox: {
    width: '100%', borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, gap: 3,
  },
  voucherLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  voucherCode: { fontSize: 24, fontWeight: '900', color: Colors.primary, letterSpacing: 4 },
  voucherNote: { fontSize: 11 },
  claimBtn: {
    borderRadius: Radius.lg, paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.glowStrong,
  },
  claimText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1 },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SpinScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()

  const rotation = useSharedValue(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ type: string; prize_value: string; voucher_code: string | null } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulbOn, setBulbOn] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setBulbOn((b) => !b), 520)
    return () => clearInterval(id)
  }, [])

  const { data: spinStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['games', 'spin-status'],
    queryFn: gamesApi.spinStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const handleSpinDone = useCallback((res: { prize_type: string; prize_value: string; voucher_code: string | null }) => {
    setResult({ type: res.prize_type, prize_value: res.prize_value, voucher_code: res.voucher_code })
    setSpinning(false)
    setShowModal(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    refetchStatus()
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] })
  }, [refetchStatus, queryClient])

  const doSpin = async () => {
    if (spinning || !spinStatus?.can_spin) return
    setSpinning(true)
    setResult(null)
    setError(null)
    setShowModal(false)
    try {
      const res = await gamesApi.spin()
      const extraSpins = 5 + Math.floor(Math.random() * 3)
      const segIdx = res.segment_index ?? 0
      const segMid = segIdx * SEG_DEG + SEG_DEG / 2
      const jitter = (Math.random() - 0.5) * (SEG_DEG * 0.45)
      const landAngle = 360 - ((segMid + jitter) % 360)
      const currentBase = Math.ceil(rotation.value / 360) * 360
      const target = currentBase + extraSpins * 360 + landAngle
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      rotation.value = withTiming(target, {
        duration: 4500,
        easing: Easing.bezier(0.17, 0.67, 0.12, 0.99),
      }, () => runOnJS(handleSpinDone)(res))
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Something went wrong.')
      setSpinning(false)
    }
  }

  const wheelAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const canSpin = !spinning && !!spinStatus?.can_spin
  const spinsLeft = spinStatus?.spins_left ?? 0
  const containerSize = WHEEL_SIZE + 44

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Full-screen dark gradient background */}
      <LinearGradient
        colors={['#1A0600', '#2C0E00', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>SPIN THE WHEEL</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Spins pill */}
      <View style={[
        styles.spinsPill,
        { borderColor: canSpin ? Colors.primary : 'rgba(255,255,255,0.15)', backgroundColor: canSpin ? 'rgba(240,90,26,0.15)' : 'rgba(255,255,255,0.06)' },
      ]}>
        <Zap size={13} color={canSpin ? Colors.primary : 'rgba(255,255,255,0.4)'} fill={canSpin ? Colors.primary : 'none'} />
        <Text style={[styles.spinsPillText, { color: canSpin ? Colors.primary : 'rgba(255,255,255,0.5)' }]}>
          {spinning
            ? 'Spinning...'
            : spinsLeft > 0
              ? `${spinsLeft} spin${spinsLeft !== 1 ? 's' : ''} left today`
              : 'No spins left — come back tomorrow'}
        </Text>
      </View>

      {/* Pointer + Wheel zone */}
      <View style={styles.wheelZone}>
        <Pointer />

        {/* Wheel container — animated rotation applied here */}
        <View style={{ width: containerSize, height: containerSize, alignItems: 'center', justifyContent: 'center' }}>
          {/* Static bulb ring */}
          <BulbRing bulbOn={bulbOn} />

          {/* Rotating wheel */}
          <Animated.View style={[{ width: containerSize, height: containerSize }, wheelAnimStyle]}>
            <WheelSvg />
          </Animated.View>

          {/* Hub label — static overlay */}
          <View style={styles.hubLabel} pointerEvents="none">
            <Text style={styles.hubText}>B60</Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Spin button */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={doSpin}
          disabled={!canSpin}
          style={[styles.spinBtnWrap, !canSpin && { opacity: 0.45 }]}
        >
          <LinearGradient
            colors={canSpin ? [Colors.primary, Colors.primaryDark] : ['#444', '#222']}
            style={styles.spinBtn}
          >
            <Zap size={20} color="#fff" fill={canSpin ? '#fff' : 'none'} />
            <Text style={styles.spinBtnText}>
              {spinning ? 'SPINNING...' : 'SPIN NOW'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Quick info row */}
        <View style={styles.infoRow}>
          {['1 free spin/day', '+1 per order', 'Win food & points'].map((t, i) => (
            <View key={i} style={styles.infoChip}>
              <Text style={styles.infoChipText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <WinModal visible={showModal} result={result} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 2, color: '#fff', textTransform: 'uppercase' },

  spinsPill: {
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    marginBottom: 4,
  },
  spinsPillText: { fontSize: 13, fontWeight: '700' },

  wheelZone: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  hubLabel: {
    position: 'absolute',
    width: INNER_R * 2, height: INNER_R * 2, borderRadius: INNER_R,
    alignItems: 'center', justifyContent: 'center',
  },
  hubText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  errorBox: {
    marginHorizontal: Spacing.lg, borderRadius: Radius.md,
    padding: Spacing.sm, backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { fontSize: 13, color: Colors.error, fontWeight: '600', textAlign: 'center' },

  bottomArea: { paddingHorizontal: Spacing.lg, gap: 10 },
  spinBtnWrap: {},
  spinBtn: {
    borderRadius: Radius.lg, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    ...Shadows.glowStrong,
  },
  spinBtnText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  infoRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  infoChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  infoChipText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
})
