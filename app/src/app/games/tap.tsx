import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withRepeat, Easing, cancelAnimation,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, Zap, Trophy, Star } from 'lucide-react-native'
import Svg, { Circle, Rect, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg'
import { gamesApi } from '../../services/api'
import { Events } from '../../services/analytics'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W } = Dimensions.get('window')
const GAME_DURATION = 10
const BURGER_SIZE = 200
const RING_SIZE = 240
const STROKE = 12
const RING_R = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RING_R

type GameState = 'idle' | 'countdown' | 'playing' | 'done'

// ─── Pixel font style helper ──────────────────────────────────────────────────
const RETRO: any = { fontFamily: undefined, fontWeight: '900' as const, letterSpacing: 2 }

// ─── Circular Timer SVG ───────────────────────────────────────────────────────
function TimerRing({ timeLeft, isWarning }: { timeLeft: number; isWarning: boolean }) {
  const progress = timeLeft / GAME_DURATION
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const color = isWarning ? '#EF4444' : Colors.primary
  const cx = RING_SIZE / 2
  const cy = RING_SIZE / 2

  return (
    <Svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={StyleSheet.absoluteFillObject}
      transform={[{ rotate: '-90deg' }]}
      origin={`${cx}, ${cy}`}
    >
      <Circle cx={cx} cy={cy} r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
      <Circle
        cx={cx} cy={cy} r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeDasharray={`${CIRCUMFERENCE}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// ─── Real Burger SVG ─────────────────────────────────────────────────────────
function BurgerSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <RadialGradient id="bunTop" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFB347" />
          <Stop offset="100%" stopColor="#CC7000" />
        </RadialGradient>
        <RadialGradient id="bunBot" cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#F0A020" />
          <Stop offset="100%" stopColor="#B86000" />
        </RadialGradient>
        <RadialGradient id="patty" cx="40%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#8B4513" />
          <Stop offset="100%" stopColor="#3D1A08" />
        </RadialGradient>
      </Defs>

      {/* ── TOP BUN ── */}
      {/* Shadow under dome */}
      <Ellipse cx={120} cy={106} rx={82} ry={12} fill="rgba(0,0,0,0.18)" />
      {/* Dome body */}
      <Ellipse cx={120} cy={72} rx={82} ry={58} fill="url(#bunTop)" />
      {/* Dome highlight */}
      <Ellipse cx={100} cy={52} rx={34} ry={18} fill="rgba(255,255,255,0.18)" />
      {/* Bun base flat */}
      <Rect x={34} y={112} width={172} height={18} rx={9} fill="#D4860A" />
      {/* Sesame seeds */}
      <Ellipse cx={88} cy={62} rx={9} ry={6} fill="rgba(255,255,255,0.25)" />
      <Ellipse cx={88} cy={62} rx={7} ry={4.5} fill="#CC7722" />
      <Ellipse cx={120} cy={50} rx={9} ry={6} fill="rgba(255,255,255,0.25)" />
      <Ellipse cx={120} cy={50} rx={7} ry={4.5} fill="#CC7722" />
      <Ellipse cx={152} cy={65} rx={8} ry={5.5} fill="rgba(255,255,255,0.25)" />
      <Ellipse cx={152} cy={65} rx={6} ry={4} fill="#CC7722" />

      {/* ── LETTUCE ── */}
      <Ellipse cx={120} cy={134} rx={90} ry={13} fill="#14532D" />
      {/* Frill bumps */}
      <Ellipse cx={60}  cy={130} rx={20} ry={12} fill="#16A34A" />
      <Ellipse cx={92}  cy={127} rx={20} ry={12} fill="#22C55E" />
      <Ellipse cx={124} cy={126} rx={22} ry={13} fill="#16A34A" />
      <Ellipse cx={156} cy={128} rx={20} ry={12} fill="#22C55E" />
      <Ellipse cx={182} cy={131} rx={18} ry={11} fill="#16A34A" />

      {/* ── TOMATO ── */}
      <Rect x={36} y={143} width={168} height={14} rx={7} fill="#DC2626" />
      <Rect x={36} y={143} width={168} height={7} rx={7} fill="#EF4444" />

      {/* ── CHEESE ── */}
      <Rect x={30} y={155} width={180} height={16} rx={4} fill="#FCD34D" />
      {/* Cheese drips */}
      <Ellipse cx={46}  cy={172} rx={14} ry={8} fill="#F59E0B" />
      <Ellipse cx={120} cy={171} rx={14} ry={7} fill="#F59E0B" />
      <Ellipse cx={194} cy={172} rx={14} ry={8} fill="#F59E0B" />

      {/* ── PATTY ── */}
      {/* Shadow */}
      <Ellipse cx={120} cy={197} rx={84} ry={9} fill="rgba(0,0,0,0.2)" />
      <Rect x={32} y={168} width={176} height={26} rx={13} fill="url(#patty)" />
      {/* Sear marks */}
      <Rect x={58}  cy={175} x2={82}  y={175} width={24} height={4} rx={2} fill="rgba(0,0,0,0.35)" />
      <Rect x={100} y={173} width={30} height={4} rx={2} fill="rgba(0,0,0,0.35)" />
      <Rect x={148} y={175} width={24} height={4} rx={2} fill="rgba(0,0,0,0.35)" />
      {/* Top sheen */}
      <Rect x={40} y={168} width={160} height={10} rx={8} fill="rgba(255,255,255,0.08)" />

      {/* ── BOTTOM BUN ── */}
      <Rect x={34} y={192} width={172} height={18} rx={9} fill="#E8970F" />
      <Ellipse cx={120} cy={214} rx={82} ry={18} fill="url(#bunBot)" />
      {/* Bottom highlight */}
      <Ellipse cx={120} cy={208} rx={70} ry={8} fill="rgba(255,255,255,0.1)" />
    </Svg>
  )
}

// ─── Retro Loading Screen ─────────────────────────────────────────────────────
function RetroLoadingScreen() {
  const dot1 = useSharedValue(0.3)
  const dot2 = useSharedValue(0.3)
  const dot3 = useSharedValue(0.3)
  const burgerY = useSharedValue(0)

  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false)
    const t2 = setTimeout(() => {
      dot2.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false)
    }, 150)
    const t3 = setTimeout(() => {
      dot3.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false)
    }, 300)
    burgerY.value = withRepeat(withSequence(withTiming(-12, { duration: 500, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) })), -1, false)
    return () => {
      clearTimeout(t2); clearTimeout(t3)
      cancelAnimation(dot1); cancelAnimation(dot2); cancelAnimation(dot3); cancelAnimation(burgerY)
    }
  }, [])

  const d1 = useAnimatedStyle(() => ({ opacity: dot1.value }))
  const d2 = useAnimatedStyle(() => ({ opacity: dot2.value }))
  const d3 = useAnimatedStyle(() => ({ opacity: dot3.value }))
  const bAnim = useAnimatedStyle(() => ({ transform: [{ translateY: burgerY.value }] }))

  return (
    <View style={ls.wrap}>
      <Animated.View style={bAnim}>
        <BurgerSvg size={120} />
      </Animated.View>
      <Text style={ls.title}>SMASH TAP</Text>
      <Text style={ls.sub}>INSERT COIN</Text>
      <View style={ls.dotsRow}>
        <Animated.View style={[ls.dot, d1]} />
        <Animated.View style={[ls.dot, d2]} />
        <Animated.View style={[ls.dot, d3]} />
      </View>
    </View>
  )
}

const ls = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.primary, letterSpacing: 4, textTransform: 'uppercase' },
  sub: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 3 },
  dotsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TapScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const isDark = themeMode === 'dark'
  const T = isDark
    ? { background: '#0A0A0A', text: '#fff', surface: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', textMuted: 'rgba(255,255,255,0.4)' }
    : { background: '#F5F5F5', text: '#1B2A4A', surface: '#fff', border: '#E5E5E5', textMuted: '#888' }

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()

  const [gameState, setGameState] = useState<GameState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [taps, setTaps] = useState(0)
  const [result, setResult] = useState<{ score: number; points_earned: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const burgerScale = useSharedValue(1)
  const burgerRotate = useSharedValue(0)
  const scoreScale = useSharedValue(1)
  const countdownScale = useSharedValue(1)
  const resultOpacity = useSharedValue(0)
  const resultTranslate = useSharedValue(20)
  const resultScale = useSharedValue(0.92)
  // Idle burger float
  const idleFloat = useSharedValue(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tapsRef = useRef(0)
  const gameStateRef = useRef<GameState>('idle')

  const { data: tapStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['games', 'tap-status'],
    queryFn: gamesApi.tapStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  // Idle float animation
  useEffect(() => {
    if (gameState === 'idle') {
      idleFloat.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ), -1, false,
      )
    } else {
      cancelAnimation(idleFloat)
      idleFloat.value = withTiming(0, { duration: 200 })
    }
  }, [gameState])

  const burgerAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: idleFloat.value },
      { scale: burgerScale.value },
      { rotate: `${burgerRotate.value}deg` },
    ],
  }))

  const scoreAnim = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }))
  const countdownAnim = useAnimatedStyle(() => ({ transform: [{ scale: countdownScale.value }] }))
  const resultAnim = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ translateY: resultTranslate.value }, { scale: resultScale.value }],
  }))

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  useEffect(() => () => cleanup(), [])

  const startCountdown = () => {
    setGameState('countdown')
    gameStateRef.current = 'countdown'
    setCountdown(3)
    setTaps(0)
    tapsRef.current = 0
    setTimeLeft(GAME_DURATION)
    setResult(null)
    setError(null)
    resultOpacity.value = 0
    resultTranslate.value = 20
    resultScale.value = 0.92

    let c = 3
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    countdownRef.current = setInterval(() => {
      c--
      if (c <= 0) {
        clearInterval(countdownRef.current!)
        setGameState('playing')
        gameStateRef.current = 'playing'
        startGame()
        return
      }
      setCountdown(c)
      countdownScale.value = withSequence(
        withTiming(1.5, { duration: 80 }),
        withSpring(1, { damping: 5, stiffness: 300 }),
      )
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }, 1000)
  }

  const startGame = () => {
    let t = GAME_DURATION
    timerRef.current = setInterval(() => {
      t--
      setTimeLeft(t)
      if (t <= 0) {
        clearInterval(timerRef.current!)
        endGame()
      }
    }, 1000)
  }

  const endGame = useCallback(async () => {
    gameStateRef.current = 'done'
    setGameState('done')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const finalScore = tapsRef.current

    resultOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) })
    resultTranslate.value = withSpring(0, { damping: 16, stiffness: 220 })
    resultScale.value = withSpring(1, { damping: 16, stiffness: 220 })

    setSubmitting(true)
    try {
      const res = await gamesApi.submitTap(finalScore)
      Events.TAP_GAME_PLAYED(finalScore, res.points_earned)
      setResult(res)
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] })
      queryClient.invalidateQueries({ queryKey: ['games', 'leaderboard'] })
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to submit score')
    } finally {
      setSubmitting(false)
    }
  }, [refetchStatus, queryClient])

  const handleBurgerTap = () => {
    if (gameStateRef.current !== 'playing') return
    tapsRef.current++
    setTaps(tapsRef.current)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    burgerScale.value = withSequence(
      withTiming(0.82, { duration: 55, easing: Easing.out(Easing.quad) }),
      withSpring(1.08, { damping: 4, stiffness: 600 }),
      withSpring(1, { damping: 12 }),
    )
    burgerRotate.value = withSequence(
      withTiming(-7, { duration: 45 }),
      withTiming(7, { duration: 55 }),
      withTiming(0, { duration: 45 }),
    )
    scoreScale.value = withSequence(
      withSpring(1.3, { damping: 3, stiffness: 900 }),
      withSpring(1, { damping: 8 }),
    )
  }

  const canPlay = (tapStatus?.plays_left ?? 0) > 0
  const isWarning = timeLeft <= 3 && gameState === 'playing'

  // Loading state
  if (statusLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0A0A' }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={22} color="#fff" />
          </Pressable>
          <Text style={[styles.title, { color: '#fff' }]}>SMASH TAP</Text>
          <View style={{ width: 40 }} />
        </View>
        <RetroLoadingScreen />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={T.text} />
        </Pressable>
        <Text style={[styles.title, { color: T.text }]}>SMASH TAP</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>

        {/* Retro score strip */}
        <View style={[styles.scoreStrip, { backgroundColor: T.surface, borderColor: isDark ? Colors.primary + '33' : T.border }]}>
          <View style={styles.scoreBlock}>
            <Animated.Text style={[styles.scoreNum, { color: Colors.primary }, scoreAnim]}>
              {String(taps).padStart(2, '0')}
            </Animated.Text>
            <Text style={[styles.scoreLabel, { color: T.textMuted }]}>TAPS</Text>
          </View>
          <View style={[styles.scoreDivider, { backgroundColor: isDark ? Colors.primary + '33' : T.border }]} />
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreNum, { color: isWarning ? '#EF4444' : T.text }]}>
              {String(gameState === 'playing' || gameState === 'countdown' ? timeLeft : GAME_DURATION).padStart(2, '0')}
            </Text>
            <Text style={[styles.scoreLabel, { color: isWarning ? '#EF4444' : T.textMuted }]}>SECS</Text>
          </View>
          <View style={[styles.scoreDivider, { backgroundColor: isDark ? Colors.primary + '33' : T.border }]} />
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreNum, { color: Colors.yellow }]}>
              {String(Math.floor(taps / 10)).padStart(2, '0')}
            </Text>
            <Text style={[styles.scoreLabel, { color: T.textMuted }]}>PTS</Text>
          </View>
        </View>

        {/* Best score badge */}
        {tapStatus && gameState === 'idle' && (
          <View style={[styles.bestBadge, { backgroundColor: T.surface, borderColor: isDark ? Colors.yellow + '40' : T.border }]}>
            <Star size={12} color={Colors.yellow} fill={Colors.yellow} />
            <Text style={[styles.bestText, { color: T.textMuted }]}>
              BEST: <Text style={{ color: Colors.yellow }}>{tapStatus.best_score}</Text> TAPS
            </Text>
            <Text style={[styles.bestSep, { color: T.textMuted }]}>·</Text>
            <Text style={[styles.bestText, { color: T.textMuted }]}>
              <Text style={{ color: Colors.primary }}>{tapStatus.plays_left}</Text> PLAYS LEFT
            </Text>
          </View>
        )}

        {/* Burger zone */}
        <View style={styles.burgerZone}>
          {/* Timer ring */}
          {(gameState === 'playing' || gameState === 'countdown') && (
            <View style={styles.ringWrap}>
              <TimerRing timeLeft={timeLeft} isWarning={isWarning} />
            </View>
          )}

          {/* Idle pulse rings */}
          {gameState === 'idle' && (
            <>
              <View style={[styles.idleRing, { width: 260, height: 260, borderRadius: 130, opacity: 0.05, borderColor: Colors.primary }]} />
              <View style={[styles.idleRing, { width: 220, height: 220, borderRadius: 110, opacity: 0.09, borderColor: Colors.primary }]} />
            </>
          )}

          {/* Countdown */}
          {gameState === 'countdown' && (
            <Animated.View style={[styles.countdownOverlay, countdownAnim]}>
              <Text style={styles.countdownNum}>{countdown <= 0 ? 'GO!' : countdown}</Text>
            </Animated.View>
          )}

          {/* Burger */}
          <Pressable
            onPress={handleBurgerTap}
            disabled={gameState !== 'playing'}
            style={styles.burgerPressable}
            hitSlop={20}
          >
            <Animated.View style={[styles.burgerWrap, burgerAnim, {
              shadowColor: gameState === 'playing' ? (isWarning ? '#EF4444' : Colors.primary) : 'transparent',
              shadowOpacity: gameState === 'playing' ? 0.7 : 0,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 0 },
              elevation: gameState === 'playing' ? 16 : 0,
            }]}>
              <BurgerSvg size={BURGER_SIZE} />
            </Animated.View>
          </Pressable>

          {gameState === 'playing' && (
            <Text style={[styles.tapHint, { color: isWarning ? '#EF4444' : Colors.primary }]}>
              {isWarning ? 'HURRY!' : 'TAP FAST!'}
            </Text>
          )}

          {gameState === 'idle' && (
            <Text style={[styles.tapHint, { color: T.textMuted, marginTop: 16 }]}>
              TAP THE BURGER · 10s · 10 TAPS = 1 PT
            </Text>
          )}
        </View>

        {/* Result card */}
        {gameState === 'done' && (
          <Animated.View style={[styles.resultWrap, resultAnim]}>
            {submitting ? (
              <View style={[styles.submittingRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                <Text style={[styles.submittingText, { color: T.textMuted }]}>
                  SAVING SCORE...
                </Text>
              </View>
            ) : result ? (
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.resultCard}>
                <Trophy size={28} color={Colors.yellow} fill={Colors.yellow} />
                <Text style={styles.resultScore}>{String(result.score).padStart(2, '0')}</Text>
                <Text style={styles.resultScoreLabel}>TAPS</Text>
                {result.points_earned > 0 && (
                  <View style={styles.resultPtsBadge}>
                    <Zap size={14} color="#1B2A4A" fill="#1B2A4A" />
                    <Text style={styles.resultPtsText}>+{result.points_earned} PTS EARNED</Text>
                  </View>
                )}
                {tapStatus && result.score > tapStatus.best_score && (
                  <View style={styles.newRecordBadge}>
                    <Star size={12} color={Colors.yellow} fill={Colors.yellow} />
                    <Text style={styles.newRecordText}>NEW RECORD!</Text>
                  </View>
                )}
              </LinearGradient>
            ) : null}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* CTA */}
        {(gameState === 'idle' || gameState === 'done') && (
          <Pressable
            style={({ pressed }) => [
              styles.ctaWrap,
              !canPlay && { opacity: 0.4 },
              pressed && canPlay && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={canPlay ? startCountdown : undefined}
            disabled={!canPlay || submitting}
          >
            <LinearGradient
              colors={canPlay ? [Colors.primary, Colors.primaryDark] : ['#333', '#222']}
              style={styles.ctaBtn}
            >
              <Text style={styles.ctaBtnText}>
                {!canPlay ? 'NO PLAYS LEFT' : gameState === 'done' ? 'PLAY AGAIN' : 'START GAME'}
              </Text>
              {canPlay && <Zap size={18} color="#fff" fill="#fff" />}
            </LinearGradient>
          </Pressable>
        )}

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 12 },

  scoreStrip: {
    width: '100%', flexDirection: 'row',
    borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1,
  },
  scoreBlock: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  scoreNum: { fontSize: 32, fontWeight: '900', lineHeight: 36, letterSpacing: 1 },
  scoreLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 2, textTransform: 'uppercase' },
  scoreDivider: { width: 1 },

  bestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1,
  },
  bestText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bestSep: { fontSize: 11 },

  burgerZone: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    width: '100%', position: 'relative',
  },

  ringWrap: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },

  idleRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },

  countdownOverlay: {
    position: 'absolute', zIndex: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  countdownNum: {
    fontSize: 100, fontWeight: '900', color: Colors.primary,
    textShadowColor: Colors.primary, textShadowRadius: 40, textShadowOffset: { width: 0, height: 0 },
  },

  burgerPressable: { alignItems: 'center' },
  burgerWrap: {
    width: BURGER_SIZE, height: BURGER_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },

  tapHint: {
    marginTop: 8,
    fontSize: 12, fontWeight: '900', letterSpacing: 2,
    textTransform: 'uppercase',
  },

  resultWrap: { width: '100%', gap: 10 },
  resultCard: {
    borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', gap: 4,
    ...Shadows.glowStrong,
  },
  resultScore: { fontSize: 80, fontWeight: '900', color: '#fff', lineHeight: 84, letterSpacing: 2 },
  resultScoreLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 4 },
  resultPtsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.yellow, borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: 8,
  },
  resultPtsText: { fontSize: 14, fontWeight: '900', color: '#1B2A4A', letterSpacing: 1 },
  newRecordBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 4,
  },
  newRecordText: { fontSize: 11, fontWeight: '900', color: Colors.yellow, letterSpacing: 2 },

  submittingRow: {
    alignItems: 'center', paddingVertical: 20,
    borderRadius: Radius.lg, borderWidth: 1,
  },
  submittingText: { fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  errorBox: {
    borderRadius: Radius.md, padding: Spacing.md,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#EF4444',
  },
  errorText: { fontSize: 13, fontWeight: '600', color: '#EF4444', textAlign: 'center' },

  ctaWrap: { width: '100%' },
  ctaBtn: {
    borderRadius: Radius.lg, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    ...Shadows.glowStrong,
  },
  ctaBtnText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 2 },
})
