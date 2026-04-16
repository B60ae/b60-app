import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, FadeIn, FadeOut,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, Zap } from 'lucide-react-native'
import { gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W } = Dimensions.get('window')
const GAME_DURATION = 10
const BURGER_SIZE = 120

type GameState = 'idle' | 'countdown' | 'playing' | 'done'

export default function TapScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
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
  const pointsScale = useSharedValue(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tapsRef = useRef(0)

  const { data: tapStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['games', 'tap-status'],
    queryFn: gamesApi.tapStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const burgerAnim = useAnimatedStyle(() => ({
    transform: [{ scale: burgerScale.value }, { rotate: `${burgerRotate.value}deg` }],
  }))

  const pointsAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pointsScale.value }],
    opacity: pointsScale.value,
  }))

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  useEffect(() => () => cleanup(), [])

  const startCountdown = () => {
    setGameState('countdown')
    setCountdown(3)
    setTaps(0)
    tapsRef.current = 0
    setTimeLeft(GAME_DURATION)
    setResult(null)
    setError(null)

    let c = 3
    countdownRef.current = setInterval(() => {
      c--
      setCountdown(c)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      if (c <= 0) {
        clearInterval(countdownRef.current!)
        startGame()
      }
    }, 1000)
  }

  const startGame = () => {
    setGameState('playing')
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
    setGameState('done')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const finalScore = tapsRef.current

    setSubmitting(true)
    try {
      const res = await gamesApi.submitTap(finalScore)
      setResult(res)
      refetchStatus()
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance'] })
      queryClient.invalidateQueries({ queryKey: ['games', 'leaderboard'] })
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to submit score')
    } finally {
      setSubmitting(false)
    }
  }, [])

  const handleBurgerTap = () => {
    if (gameState !== 'playing') return
    tapsRef.current++
    setTaps(tapsRef.current)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    burgerScale.value = withSequence(
      withSpring(0.75, { damping: 3, stiffness: 800 }),
      withSpring(1.1, { damping: 5, stiffness: 400 }),
      withSpring(1, { damping: 8 }),
    )
    burgerRotate.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    )
    pointsScale.value = withSequence(
      withSpring(1, { damping: 4, stiffness: 600 }),
      withTiming(0, { duration: 400 }),
    )
  }

  const canPlay = (tapStatus?.plays_left ?? 0) > 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>SMASH TAP</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>

        {/* Stats bar */}
        {gameState !== 'idle' && (
          <View style={[styles.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: Colors.primary }]}>{taps}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>TAPS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: gameState === 'playing' && timeLeft <= 3 ? '#EF4444' : theme.text }]}>{timeLeft}s</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>LEFT</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: Colors.yellow }]}>{Math.floor(taps / 10)}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>PTS</Text>
            </View>
          </View>
        )}

        {/* Timer bar */}
        {gameState === 'playing' && (
          <View style={[styles.timerTrack, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[styles.timerFill, {
                width: `${(timeLeft / GAME_DURATION) * 100}%`,
                backgroundColor: timeLeft <= 3 ? '#EF4444' : Colors.primary,
              }]}
            />
          </View>
        )}

        {/* Countdown overlay */}
        {gameState === 'countdown' && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.countdownWrap}>
            <Text style={styles.countdownNum}>{countdown === 0 ? 'GO!' : countdown}</Text>
          </Animated.View>
        )}

        {/* Burger tap target */}
        <Pressable
          onPress={handleBurgerTap}
          disabled={gameState !== 'playing'}
          style={({ pressed }) => [styles.burgerArea, { opacity: gameState !== 'playing' ? 0.6 : 1 }]}
        >
          <Animated.View style={[styles.burgerCircle, burgerAnim, { backgroundColor: theme.surface, borderColor: gameState === 'playing' ? Colors.primary : theme.border }]}>
            <Text style={styles.burgerEmoji}>🍔</Text>
            {/* Points pop */}
            <Animated.View style={[styles.pointsPop, pointsAnim]}>
              <Text style={styles.pointsPopText}>+1</Text>
            </Animated.View>
          </Animated.View>
          {gameState === 'playing' && (
            <Text style={[styles.tapHint, { color: theme.textMuted }]}>TAP FAST!</Text>
          )}
        </Pressable>

        {/* Idle state */}
        {gameState === 'idle' && (
          <View style={styles.idleInfo}>
            <Text style={[styles.idleTitle, { color: theme.text }]}>Smash as many burgers as you can</Text>
            <Text style={[styles.idleSub, { color: theme.textMuted }]}>10 seconds · Every 10 taps = 1 point</Text>
            {tapStatus && (
              <View style={[styles.playsLeft, { backgroundColor: theme.primaryTint, borderColor: Colors.primary }]}>
                <Zap size={14} color={Colors.primary} />
                <Text style={[styles.playsLeftText, { color: Colors.primary }]}>
                  {tapStatus.plays_left} play{tapStatus.plays_left !== 1 ? 's' : ''} left today · Best: {tapStatus.best_score} taps
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Result */}
        {gameState === 'done' && result && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.resultWrap}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.resultCard}>
              <Text style={styles.resultScore}>{result.score}</Text>
              <Text style={styles.resultScoreLabel}>TAPS</Text>
              <Text style={styles.resultPoints}>+{result.points_earned} points earned</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {gameState === 'done' && submitting && (
          <Text style={[styles.submittingText, { color: theme.textMuted }]}>Submitting score...</Text>
        )}

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.errorTint, borderColor: theme.error }]}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          </View>
        )}

        {/* CTA Button */}
        {(gameState === 'idle' || gameState === 'done') && (
          <Pressable
            style={[styles.ctaBtn, { opacity: !canPlay ? 0.45 : 1 }]}
            onPress={canPlay ? startCountdown : undefined}
            disabled={!canPlay}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.ctaBtnGradient}>
              <Text style={styles.ctaBtnText}>
                {!canPlay ? 'NO PLAYS LEFT TODAY' : gameState === 'done' ? 'PLAY AGAIN' : 'START GAME'}
              </Text>
            </LinearGradient>
          </Pressable>
        )}

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

  statsBar: { width: '100%', flexDirection: 'row', borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  stat: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statNum: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statDivider: { width: 1 },

  timerTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 3 },

  countdownWrap: { position: 'absolute', zIndex: 10, top: '30%' },
  countdownNum: { fontSize: 96, fontWeight: '900', color: Colors.primary, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 20 },

  burgerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  burgerCircle: {
    width: BURGER_SIZE, height: BURGER_SIZE, borderRadius: BURGER_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
    ...Shadows.glowStrong,
  },
  burgerEmoji: { fontSize: 56 },
  pointsPop: { position: 'absolute', top: -10, right: -10 },
  pointsPopText: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  tapHint: { fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },

  idleInfo: { alignItems: 'center', gap: Spacing.sm },
  idleTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  idleSub: { fontSize: 14, textAlign: 'center' },
  playsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, marginTop: 4 },
  playsLeftText: { fontSize: 13, fontWeight: '700' },

  resultWrap: { width: '100%' },
  resultCard: { borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: 4 },
  resultScore: { fontSize: 80, fontWeight: '900', color: '#fff', lineHeight: 84 },
  resultScoreLabel: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 3 },
  resultPoints: { fontSize: 18, fontWeight: '800', color: Colors.yellow, marginTop: 8 },

  submittingText: { fontSize: 13 },
  errorBox: { width: '100%', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  errorText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  ctaBtn: { width: '100%' },
  ctaBtnGradient: { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center' },
  ctaBtnText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 1 },
})
