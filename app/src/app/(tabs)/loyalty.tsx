import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  Star, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronUp, ArrowRight, Zap, Trophy, RotateCcw,
} from 'lucide-react-native'

import { loyaltyApi, gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import { POINTS_TO_AED } from '../../utils/constants'
import type { LoyaltyTransaction } from '../../types'

// ─── Tier Config ─────────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Bronze', min: 0,    max: 999,      color: '#CD7F32', next: 1000 },
  { name: 'Silver', min: 1000, max: 4999,     color: '#A8A8A8', next: 5000 },
  { name: 'Gold',   min: 5000, max: Infinity, color: '#FFD700', next: null },
]

function getTier(points: number) {
  return TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0]
}

// ─── Animated Points Number ──────────────────────────────────────────────────

function AnimatedPointsText({ target }: { target: number }) {
  const [displayPoints, setDisplayPoints] = React.useState(0)

  useEffect(() => {
    const duration = 1200
    const frameDuration = 1000 / 60
    const totalFrames = Math.round(duration / frameDuration)
    let frame = 0
    const timer = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - (1 - progress) * (1 - progress)
      setDisplayPoints(Math.floor(eased * target))
      if (frame >= totalFrames) clearInterval(timer)
    }, frameDuration)
    return () => clearInterval(timer)
  }, [target])

  return <Text style={styles.pointsNumber}>{displayPoints.toLocaleString()}</Text>
}

// ─── Smash Meter ─────────────────────────────────────────────────────────────

function SmashMeter({ progress, color }: { progress: number; color: string }) {
  const filled = Math.round(Math.min(progress, 1) * 10)
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: i < filled ? color : 'rgba(255,255,255,0.2)' }} />
      ))}
    </View>
  )
}

// ─── Transaction Row ─────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const isEarned = tx.type === 'earned' || tx.type === 'bonus'
  return (
    <View style={[styles.txRow, { backgroundColor: isEarned ? theme.successTint : theme.errorTint, borderColor: theme.border }]}>
      <View style={[styles.txIcon, { backgroundColor: isEarned ? theme.success : theme.error }]}>
        {isEarned ? <ArrowUpRight size={14} color="#fff" /> : <ArrowDownLeft size={14} color="#fff" />}
      </View>
      <View style={styles.txLeft}>
        <Text style={[styles.txType, { color: theme.text }]}>{tx.description}</Text>
        <Text style={[styles.txDate, { color: theme.textMuted }]}>{new Date(tx.created_at).toLocaleDateString('en-AE')}</Text>
      </View>
      <Text style={[styles.txPoints, { color: isEarned ? theme.success : theme.error }]}>
        {isEarned ? '+' : '-'}{Math.abs(tx.points)} pts
      </Text>
    </View>
  )
}

// ─── Arcade Game Card ─────────────────────────────────────────────────────────

function ArcadeCard({
  title, subtitle, badge, gradientColors, icon: Icon, onPress, locked,
}: {
  title: string
  subtitle: string
  badge?: string
  gradientColors: [string, string]
  icon: any
  onPress: () => void
  locked?: boolean
}) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress() }}
      style={({ pressed }) => [styles.arcadeCard, { opacity: pressed ? 0.88 : 1 }]}
    >
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.arcadeCardGradient}>
        {/* Decor circle */}
        <View style={styles.arcadeDecor} />
        <View style={styles.arcadeCardContent}>
          <View style={styles.arcadeIconWrap}>
            <Icon size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.arcadeCardTitle}>{title}</Text>
            <Text style={styles.arcadeCardSub}>{subtitle}</Text>
          </View>
          {badge ? (
            <View style={styles.arcadeBadge}>
              <Text style={styles.arcadeBadgeText}>{badge}</Text>
            </View>
          ) : (
            <ArrowRight size={18} color="rgba(255,255,255,0.7)" />
          )}
        </View>
        {locked && (
          <View style={styles.arcadeLocked}>
            <Text style={styles.arcadeLockedText}>PLAY</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function LoyaltyScreen() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const [howToOpen, setHowToOpen] = React.useState(false)

  const { data: balance } = useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: loyaltyApi.getBalance,
    staleTime: 0,
    enabled: isAuthenticated,
  })

  const { data: history } = useQuery({
    queryKey: ['loyalty', 'history'],
    queryFn: loyaltyApi.getHistory,
    enabled: isAuthenticated,
  })

  const { data: spinStatus } = useQuery({
    queryKey: ['games', 'spin-status'],
    queryFn: gamesApi.spinStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const { data: tapStatus } = useQuery({
    queryKey: ['games', 'tap-status'],
    queryFn: gamesApi.tapStatus,
    enabled: isAuthenticated,
    staleTime: 0,
  })

  const { data: leaderboardData } = useQuery({
    queryKey: ['games', 'leaderboard'],
    queryFn: gamesApi.leaderboard,
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (balance?.total_points !== undefined) {
      useAuthStore.getState().updatePoints(balance.total_points)
    }
  }, [balance?.total_points])

  const points = balance?.total_points ?? user?.loyalty_points ?? 0
  const tier = getTier(points)
  const nextTier = TIERS.find(t => t.min > points)
  const progress = nextTier ? (points - tier.min) / (nextTier.min - tier.min) : 1

  const topPlayer = leaderboardData?.leaderboard?.[0]
  const yourRank = leaderboardData?.your_rank

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.text }]}>B60 CLUB</Text>
            <Text style={[styles.screenSub, { color: theme.textMuted }]}>ORDER · EARN · PLAY · WIN</Text>
          </View>
          <Pressable
            style={[styles.leaderboardBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/games/leaderboard' as any) }}
          >
            <Trophy size={16} color={Colors.yellow} />
            {yourRank && <Text style={[styles.leaderboardBtnText, { color: theme.text }]}>#{yourRank}</Text>}
          </Pressable>
        </View>

        {/* ── Points Card ── */}
        <LinearGradient
          colors={[theme.primary, theme.primaryDark, '#1B2A4A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pointsCard, Shadows.glowStrong]}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>YOUR POINTS</Text>
            <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
              <Star size={11} color="#000" fill="#000" />
              <Text style={styles.tierBadgeText}>{tier.name}</Text>
            </View>
          </View>

          <AnimatedPointsText target={points} />
          <Text style={styles.aedValue}>≈ AED {(points * POINTS_TO_AED).toFixed(0)} redeemable</Text>

          {nextTier && (
            <View style={styles.progressSection}>
              <SmashMeter progress={progress} color={tier.color} />
              <Text style={styles.progressLabel}>{nextTier.min - points} pts to {nextTier.name}</Text>
            </View>
          )}

          <View style={styles.tierMilestones}>
            {TIERS.map((t) => {
              const active = points >= t.min
              const isCurrent = tier.name === t.name
              return (
                <View key={t.name} style={styles.milestone}>
                  <View style={[styles.milestoneIcon, { backgroundColor: active ? t.color : 'rgba(255,255,255,0.15)' }, isCurrent && { borderWidth: 2, borderColor: '#fff' }]}>
                    <Text style={[styles.milestoneInitial, active && { color: '#fff' }]}>{t.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.milestoneName, isCurrent && { color: '#fff', fontWeight: '800' }]}>{t.name}</Text>
                  <Text style={styles.milestonePts}>{t.min === 0 ? '0' : t.min.toLocaleString()}</Text>
                </View>
              )
            })}
          </View>
        </LinearGradient>

        {/* ── Redeem CTA ── */}
        <Pressable
          style={[styles.redeemBtn, { backgroundColor: theme.yellow, borderColor: '#000', shadowColor: '#000' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(tabs)/cart') }}
        >
          <View>
            <Text style={[styles.redeemBtnText, { color: '#000' }]}>USE YOUR POINTS →</Text>
            <Text style={[styles.redeemBtnSub, { color: theme.textSecondary }]}>Save AED on your next smash</Text>
          </View>
          <ArrowRight size={20} color="#000" />
        </Pressable>

        {/* ── ARCADE Section ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>ARCADE</Text>
            <Text style={[styles.sectionPill, { backgroundColor: Colors.primary }]}>WIN PRIZES</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>Play games. Win points, vouchers & free food.</Text>

          <ArcadeCard
            title="SPIN THE WHEEL"
            subtitle={spinStatus?.can_spin ? `${spinStatus.spins_left} spin${spinStatus.spins_left !== 1 ? 's' : ''} left today` : 'Come back tomorrow'}
            badge={spinStatus?.can_spin ? 'SPIN NOW' : undefined}
            gradientColors={[Colors.primary, Colors.primaryDark]}
            icon={RotateCcw}
            onPress={() => router.push('/games/spin' as any)}
          />

          <ArcadeCard
            title="SMASH TAP"
            subtitle={tapStatus ? `${tapStatus.plays_left} plays left · Best: ${tapStatus.best_score} taps` : 'Tap as fast as you can'}
            badge={tapStatus && tapStatus.plays_left > 0 ? 'PLAY' : undefined}
            gradientColors={['#1B2A4A', '#2D3E6A']}
            icon={Zap}
            onPress={() => router.push('/games/tap' as any)}
          />

          <ArcadeCard
            title="LEADERBOARD"
            subtitle={topPlayer ? `#1 ${topPlayer.display_name} — ${topPlayer.total_score} pts` : 'Weekly competition · Resets Monday'}
            gradientColors={['#0D1829', '#1B2A4A']}
            icon={Trophy}
            onPress={() => router.push('/games/leaderboard' as any)}
          />
        </View>

        {/* ── How to Earn accordion ── */}
        <View style={[styles.card, Shadows.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => { Haptics.selectionAsync(); setHowToOpen(!howToOpen) }}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>How to Earn</Text>
            {howToOpen ? <ChevronUp size={18} color={theme.textMuted} /> : <ChevronDown size={18} color={theme.textMuted} />}
          </Pressable>
          {howToOpen && (
            <View style={styles.accordionBody}>
              {[
                { icon: TrendingUp, color: theme.primary, bg: theme.primaryTint, text: 'Spend AED 1 → Earn 1 Point' },
                { icon: Gift, color: theme.success, bg: theme.successTint, text: '100 Points → AED 5 off your order' },
                { icon: Star, color: '#B8860B', bg: 'rgba(255,215,0,0.15)', text: 'Reach Gold tier for exclusive perks' },
                { icon: RotateCcw, color: Colors.primary, bg: theme.primaryTint, text: 'Daily spin → win up to 500 pts or free food' },
              ].map(({ icon: Icon, color, bg, text }, i) => (
                <View key={i} style={styles.ruleRow}>
                  <View style={[styles.ruleIcon, { backgroundColor: bg }]}><Icon size={16} color={color} /></View>
                  <Text style={[styles.ruleText, { color: theme.textSecondary }]}>{text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Transaction History ── */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
          {history && history.length > 0 ? (
            history.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          ) : (
            <View style={[styles.card, styles.emptyHistory, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.text }]}>No History Yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Place your first order and watch those points stack.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  screenTitle: { fontSize: 30, fontWeight: '900' },
  screenSub: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: -4 },
  leaderboardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1,
  },
  leaderboardBtnText: { fontSize: 13, fontWeight: '800' },

  // Points card
  pointsCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: 90, borderWidth: 28, borderColor: 'rgba(255,255,255,0.07)' },
  decorCircle2: { position: 'absolute', right: 60, bottom: -60, width: 120, height: 120, borderRadius: 60, borderWidth: 20, borderColor: 'rgba(255,255,255,0.05)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2.5, textTransform: 'uppercase' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  tierBadgeText: { fontSize: 12, fontWeight: '800' },
  pointsNumber: { fontSize: 72, fontWeight: '900', color: '#fff', lineHeight: 78 },
  aedValue: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  progressSection: { gap: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  tierMilestones: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  milestone: { alignItems: 'center', gap: 4 },
  milestoneIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  milestoneInitial: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.5)' },
  milestoneName: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  milestonePts: { fontSize: 9, color: 'rgba(255,255,255,0.45)' },

  // Redeem
  redeemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 2, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  redeemBtnText: { fontSize: 16, fontWeight: '900' },
  redeemBtnSub: { fontSize: 12, fontWeight: '600' },

  // Arcade
  sectionBlock: { gap: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  sectionDesc: { fontSize: 13, marginTop: -4 },

  arcadeCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  arcadeCardGradient: { padding: Spacing.md, overflow: 'hidden' },
  arcadeDecor: { position: 'absolute', right: -30, top: -30, width: 100, height: 100, borderRadius: 50, borderWidth: 20, borderColor: 'rgba(255,255,255,0.06)' },
  arcadeCardContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  arcadeIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  arcadeCardTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  arcadeCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  arcadeBadge: { backgroundColor: Colors.yellow, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  arcadeBadgeText: { fontSize: 11, fontWeight: '900', color: '#000' },
  arcadeLocked: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  arcadeLockedText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  // Card
  card: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  accordionBody: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ruleText: { fontSize: 14, flex: 1 },

  // History
  historySection: { gap: Spacing.sm },
  emptyHistory: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptySubtext: { fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.sm + 2, borderWidth: 1 },
  txIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  txLeft: { flex: 1, gap: 1 },
  txType: { fontSize: 13, fontWeight: '600' },
  txDate: { fontSize: 11 },
  txPoints: { fontSize: 14, fontWeight: '800' },
})
