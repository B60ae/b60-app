import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, Dimensions, Modal, ScrollView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS,
  withSpring, withSequence, useAnimatedProps,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, Gift, X, Zap, Star } from 'lucide-react-native'
import Svg, { G, Path, Text as SvgText, Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W } = Dimensions.get('window')
const WHEEL_SIZE = Math.min(W - 32, 360)
const R = WHEEL_SIZE / 2
const CX = R
const CY = R

// ─── Wheel Segments ───────────────────────────────────────────────────────────
const SEGMENTS = [
  { label: '10 PTS',        color: '#E8440A', textColor: '#fff' },
  { label: '25 PTS',        color: '#1B2A4A', textColor: '#fff' },
  { label: '50 PTS',        color: '#B83500', textColor: '#fff' },
  { label: '10% OFF',       color: '#15803D', textColor: '#fff' },
  { label: '100 PTS',       color: '#F05A1A', textColor: '#fff' },
  { label: '25 PTS',        color: '#1B2A4A', textColor: '#fff' },
  { label: 'FREE\nBURGER',  color: '#FFE500', textColor: '#1B2A4A' },
  { label: '50 PTS',        color: '#B83500', textColor: '#fff' },
  { label: '250 PTS',       color: '#F05A1A', textColor: '#fff' },
  { label: '15% OFF',       color: '#15803D', textColor: '#fff' },
]

const N = SEGMENTS.length
const SEG_DEG = 360 / N
const BULB_COUNT = 14

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

// ─── Wheel SVG ────────────────────────────────────────────────────────────────
function WheelSvg() {
  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
      <Defs>
        <RadialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7A3D" />
          <Stop offset="100%" stopColor="#C94400" />
        </RadialGradient>
        <RadialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="85%" stopColor="#FFF3D6" />
          <Stop offset="100%" stopColor="#E0C090" />
        </RadialGradient>
      </Defs>

      {/* Outer rim */}
      <Circle cx={CX} cy={CY} r={R - 1} fill="#FFF3D6" />
      <Circle cx={CX} cy={CY} r={R - 6} fill="none" stroke="#B83500" strokeWidth={4} />

      {/* Segments */}
      {SEGMENTS.map((seg, i) => {
        const midDeg = i * SEG_DEG + SEG_DEG / 2
        const midRad = ((midDeg - 90) * Math.PI) / 180
        const isBottom = midDeg > 90 && midDeg < 270
        const textR = R * 0.58
        const tx = CX + textR * Math.cos(midRad)
        const ty = CY + textR * Math.sin(midRad)
        const lines = seg.label.split('\n')
        const textRotate = isBottom ? midDeg + 180 : midDeg

        return (
          <G key={i}>
            <Path
              d={segPath(i)}
              fill={seg.color}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
            <G transform={`translate(${tx},${ty}) rotate(${textRotate})`}>
              {lines.map((line, li) => (
                <SvgText
                  key={li}
                  x={0}
                  y={(li - (lines.length - 1) / 2) * 13}
                  fill={seg.textColor}
                  fontSize={lines.length > 1 ? 9 : 11}
                  fontWeight="900"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {line}
                </SvgText>
              ))}
            </G>
          </G>
        )
      })}

      {/* Divider lines */}
      {SEGMENTS.map((_, i) => {
        const angleDeg = i * SEG_DEG
        const inner = polarToXY(angleDeg, 28)
        const outer = polarToXY(angleDeg, R - 6)
        return (
          <Path
            key={`div-${i}`}
            d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
          />
        )
      })}

      {/* Center hub */}
      <Circle cx={CX} cy={CY} r={36} fill="url(#hubGlow)" />
      <Circle cx={CX} cy={CY} r={36} fill="none" stroke="#FFF3D6" strokeWidth={3} />
      <Circle cx={CX} cy={CY} r={28} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
    </Svg>
  )
}

// ─── Blinking Bulb Ring ───────────────────────────────────────────────────────
function BulbRing({ bulbOn }: { bulbOn: boolean }) {
  const outerR = WHEEL_SIZE / 2 + 18
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
      {Array.from({ length: BULB_COUNT }, (_, i) => {
        const angle = (360 / BULB_COUNT) * i
        const rad = ((angle - 90) * Math.PI) / 180
        const x = WHEEL_SIZE / 2 + outerR * Math.cos(rad)
        const y = WHEEL_SIZE / 2 + outerR * Math.sin(rad)
        const isOn = i % 2 === 0 ? bulbOn : !bulbOn
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x - 6,
              top: y - 6,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: isOn ? '#FFF3D6' : 'rgba(255,243,214,0.25)',
              shadowColor: isOn ? '#FFE500' : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isOn ? 1 : 0,
              shadowRadius: 6,
              elevation: isOn ? 4 : 0,
            }}
          />
        )
      })}
    </View>
  )
}

// ─── Confetti Dot ─────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [Colors.primary, Colors.yellow, Colors.success, '#3FA9F5', '#1B2A4A']

function ConfettiDot({ dx, dy, color, delay }: { dx: number; dy: number; color: string; delay: number }) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 })
    x.value = withSpring(dx, { damping: 14, stiffness: 80 })
    y.value = withSequence(
      withSpring(dy, { damping: 12, stiffness: 70 }),
      withTiming(dy + 100, { duration: 700, easing: Easing.in(Easing.quad) }),
    )
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 })
    }, delay + 500)
    return () => clearTimeout(timer)
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color },
        style,
      ]}
    />
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
  const T = useThemeStore((s) => s.themeMode) === 'light' ? LightTheme : DarkTheme
  const [confetti, setConfetti] = useState<Array<{ id: number; dx: number; dy: number; color: string; delay: number }>>([])
  const modalScale = useSharedValue(0)
  const modalOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      modalScale.value = withSpring(1, { damping: 12, stiffness: 100 })
      modalOpacity.value = withTiming(1, { duration: 200 })
      const pieces = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        dx: (Math.random() - 0.5) * 240,
        dy: -(60 + Math.random() * 120),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: i * 40,
      }))
      setConfetti(pieces)
      setTimeout(() => setConfetti([]), 2000)
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
  const prizeText = result.type === 'points' ? `+${result.prize_value} POINTS`
    : result.type === 'discount' ? `${result.prize_value} OFF`
    : result.type === 'free_item' ? `FREE ${result.prize_value.toUpperCase()}`
    : 'BETTER LUCK NEXT TIME'

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={{ alignItems: 'center' }}>
          {/* Confetti burst from center */}
          {confetti.map((c) => (
            <ConfettiDot key={c.id} dx={c.dx} dy={c.dy} color={c.color} delay={c.delay} />
          ))}
          <Animated.View style={[styles.modalCard, { backgroundColor: T.background }, modalStyle]}>
            <Pressable style={styles.modalClose} onPress={onClose} hitSlop={12}>
              <X size={20} color={T.textMuted} />
            </Pressable>

            {/* Prize icon */}
            <LinearGradient
              colors={isNothing ? ['#555', '#333'] : [Colors.yellow, Colors.primary]}
              style={styles.modalIconCircle}
            >
              {isNothing
                ? <Star size={36} color="#fff" />
                : <Gift size={36} color="#fff" />
              }
            </LinearGradient>

            <Text style={[styles.modalTitle, { color: T.text }]}>
              {isNothing ? 'BETTER LUCK!' : 'CONGRATULATIONS!'}
            </Text>
            <Text style={[styles.modalSub, { color: T.textSecondary }]}>
              {isNothing ? 'Try again tomorrow' : 'You just won'}
            </Text>

            {!isNothing && (
              <View style={[styles.prizeBox, { backgroundColor: T.surface, borderColor: T.border }]}>
                <Text style={[styles.prizeText, { color: Colors.primary }]}>{prizeText}</Text>
              </View>
            )}

            {result.voucher_code && (
              <View style={[styles.voucherBox, { backgroundColor: 'rgba(240,90,26,0.08)', borderColor: Colors.primary }]}>
                <Text style={[styles.voucherTag, { color: Colors.primary }]}>YOUR CODE</Text>
                <Text style={styles.voucherCode}>{result.voucher_code}</Text>
                <Text style={[styles.voucherNote, { color: T.textMuted }]}>Valid 30 days · Use at checkout</Text>
              </View>
            )}

            <Pressable style={styles.claimBtn} onPress={onClose}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.claimBtnGradient}>
                <Text style={styles.claimBtnText}>
                  {isNothing ? 'GOT IT' : 'CLAIM PRIZE'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  )
}

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

  // Blinking bulbs
  useEffect(() => {
    const id = setInterval(() => setBulbOn((b) => !b), 500)
    return () => clearInterval(id)
  }, [])

  const { data: spinStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['games', 'spin-status'],
    queryFn: gamesApi.spinStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const handleSpinDone = (res: { prize_type: string; prize_value: string; voucher_code: string | null }) => {
    setResult({ type: res.prize_type, prize_value: res.prize_value, voucher_code: res.voucher_code })
    setSpinning(false)
    setShowModal(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    refetchStatus()
    queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] })
  }

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
      const jitter = (Math.random() - 0.5) * (SEG_DEG * 0.5)
      const landAngle = 360 - ((segMid + jitter) % 360)
      const currentBase = Math.ceil(rotation.value / 360) * 360
      const target = currentBase + extraSpins * 360 + landAngle
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      rotation.value = withTiming(target, {
        duration: 4500,
        easing: Easing.bezier(0.17, 0.67, 0.16, 1),
      }, () => {
        runOnJS(handleSpinDone)(res)
      })
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Something went wrong. Try again.')
      setSpinning(false)
    }
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const canSpin = !spinning && !!spinStatus?.can_spin
  const spinsLeft = spinStatus?.spins_left ?? 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>

      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={T.text} />
        </Pressable>
        <Text style={[styles.title, { color: T.text }]}>SPIN THE WHEEL</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Spins left pill */}
        <View style={[styles.spinsPill, { backgroundColor: canSpin ? T.primaryTint : T.surface, borderColor: canSpin ? Colors.primary : T.border }]}>
          <Zap size={13} color={canSpin ? Colors.primary : T.textMuted} fill={canSpin ? Colors.primary : 'none'} />
          <Text style={[styles.spinsPillText, { color: canSpin ? Colors.primary : T.textMuted }]}>
            {spinning
              ? 'Spinning...'
              : spinsLeft > 0
                ? `${spinsLeft} spin${spinsLeft !== 1 ? 's' : ''} left today`
                : 'No spins left — come back tomorrow'}
          </Text>
        </View>

        {/* Pointer */}
        <View style={styles.pointerWrap}>
          <View style={styles.pointer} />
        </View>

        {/* Wheel + bulb ring container */}
        <View style={[styles.wheelOuter, { width: WHEEL_SIZE + 48, height: WHEEL_SIZE + 48 }]}>
          {/* Glow shadow */}
          <View style={[styles.wheelGlow, { width: WHEEL_SIZE + 24, height: WHEEL_SIZE + 24, borderRadius: (WHEEL_SIZE + 24) / 2 }]} />

          {/* Bulb ring */}
          <View style={{ width: WHEEL_SIZE + 48, height: WHEEL_SIZE + 48, alignItems: 'center', justifyContent: 'center' }}>
            <BulbRing bulbOn={bulbOn} />

            {/* Animated wheel */}
            <Animated.View style={[{ width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, overflow: 'hidden' }, animStyle]}>
              <WheelSvg />
            </Animated.View>

            {/* Hub label — static */}
            <View style={styles.hubLabel} pointerEvents="none">
              <Text style={styles.hubText}>B60</Text>
            </View>
          </View>
        </View>

        {error && (
          <View style={[styles.errorBox, { borderColor: Colors.error, backgroundColor: T.errorTint }]}>
            <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Spin button */}
        <Pressable
          style={[styles.spinBtnWrap, !canSpin && { opacity: 0.5 }]}
          onPress={doSpin}
          disabled={!canSpin}
        >
          <LinearGradient
            colors={canSpin ? [Colors.primary, Colors.primaryDark] : ['#555', '#333']}
            style={styles.spinBtn}
          >
            <Zap size={20} color="#fff" fill={canSpin ? '#fff' : 'none'} />
            <Text style={styles.spinBtnText}>
              {spinning ? 'SPINNING...' : 'SPIN NOW'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* How it works */}
        <View style={[styles.infoBox, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.infoTitle, { color: T.text }]}>HOW IT WORKS</Text>
          {[
            '1 free spin per day',
            '+1 spin for every order you place',
            'Win points, discounts & free food',
          ].map((line, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.infoText, { color: T.textSecondary }]}>{line}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <WinModal
        visible={showModal}
        result={result}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },

  body: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    paddingTop: 4,
  },

  spinsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  spinsPillText: { fontSize: 13, fontWeight: '700' },

  pointerWrap: { alignItems: 'center', marginBottom: -10, zIndex: 10 },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 16, borderRightWidth: 16, borderBottomWidth: 28,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 10, elevation: 8,
  },

  wheelOuter: { alignItems: 'center', justifyContent: 'center' },
  wheelGlow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 0,
  },

  hubLabel: {
    position: 'absolute',
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  hubText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  errorBox: {
    width: '100%', borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  spinBtnWrap: { width: '100%' },
  spinBtn: {
    borderRadius: Radius.lg, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    ...Shadows.glowStrong,
  },
  spinBtnText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  infoBox: {
    width: '100%', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, gap: Spacing.sm,
  },
  infoTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoDot: { width: 6, height: 6, borderRadius: 3 },
  infoText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%', borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.md,
    ...Shadows.glowStrong,
  },
  modalClose: { position: 'absolute', top: Spacing.md, right: Spacing.md, padding: 4 },
  modalIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glowStrong,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  modalSub: { fontSize: 14, fontWeight: '500', marginTop: -8 },
  prizeBox: {
    width: '100%', borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', borderWidth: 1,
  },
  prizeText: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  voucherBox: {
    width: '100%', borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1.5, gap: 4,
  },
  voucherTag: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  voucherCode: { fontSize: 26, fontWeight: '900', color: Colors.yellow, letterSpacing: 4 },
  voucherNote: { fontSize: 11, marginTop: 2 },
  claimBtn: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden' },
  claimBtnGradient: {
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    ...Shadows.glowStrong,
  },
  claimBtnText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1 },
})
