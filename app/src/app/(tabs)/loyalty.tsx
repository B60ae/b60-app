import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  Star, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronUp, ArrowRight, Zap, Trophy, RotateCcw,
} from 'lucide-react-native'
import { loyaltyApi, gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { LightTheme, Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import { POINTS_TO_AED } from '../../utils/constants'
import { TIERS, getTier } from '../../utils/tiers'
import type { LoyaltyTransaction } from '../../types'

const T = LightTheme

function AnimatedPointsText({ target }: { target: number }) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    const steps = 40
    const intervalMs = 1200 / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const t = step / steps
      const eased = 1 - (1 - t) * (1 - t)
      setDisplay(Math.floor(eased * target))
      if (step >= steps) clearInterval(timer)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [target])
  return <Text style={styles.pointsNumber}>{display.toLocaleString()}</Text>
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const filled = Math.round(Math.min(progress, 1) * 10)
  return (
    <View style={styles.meterRow}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.meterBlock,
            { backgroundColor: i < filled ? color : '#E5E5E5', borderColor: '#000' },
          ]}
        />
      ))}
    </View>
  )
}

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const isEarned = tx.type === 'earned' || tx.type === 'bonus'
  return (
    <View style={[styles.txRow, { borderLeftColor: isEarned ? Colors.success : Colors.error }]}>
      <View style={[styles.txIcon, { backgroundColor: isEarned ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)' }]}>
        {isEarned
          ? <ArrowUpRight size={14} color={Colors.success} />
          : <ArrowDownLeft size={14} color={Colors.error} />}
      </View>
      <View style={styles.txLeft}>
        <Text style={styles.txType}>{tx.description}</Text>
        <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('en-AE')}</Text>
      </View>
      <Text style={[styles.txPoints, { color: isEarned ? Colors.success : Colors.error }]}>
        {isEarned ? '+' : '-'}{Math.abs(tx.points)} pts
      </Text>
    </View>
  )
}

function ArcadeCard({
  title, subtitle, badge, bg, icon: Icon, onPress,
}: {
  title: string; subtitle: string; badge?: string
  bg: string; icon: any; onPress: () => void
}) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress() }}
      style={({ pressed }) => [styles.arcadeCard, { opacity: pressed ? 0.88 : 1 }]}
    >
      <View style={[styles.arcadeCardInner, { backgroundColor: bg }]}>
        <View style={styles.arcadeDecor} />
        <View style={styles.arcadeCardContent}>
          <View style={styles.arcadeIconWrap}>
            <Icon size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.arcadeCardTitle}>{title}</Text>
            <Text style={styles.arcadeCardSub}>{subtitle}</Text>
          </View>
          {badge
            ? <View style={styles.arcadeBadge}><Text style={styles.arcadeBadgeText}>{badge}</Text></View>
            : <ArrowRight size={18} color="rgba(255,255,255,0.7)" />}
        </View>
      </View>
    </Pressable>
  )
}

export default function LoyaltyScreen() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [howToOpen, setHowToOpen] = React.useState(false)

  const { data: balance } = useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: loyaltyApi.getBalance,
    staleTime: 0, enabled: isAuthenticated,
  })
  const { data: history } = useQuery({
    queryKey: ['loyalty', 'history'],
    queryFn: loyaltyApi.getHistory,
    enabled: isAuthenticated,
  })
  const { data: spinStatus } = useQuery({
    queryKey: ['games', 'spin-status'],
    queryFn: gamesApi.spinStatus,
    enabled: isAuthenticated, staleTime: 0,
  })
  const { data: tapStatus } = useQuery({
    queryKey: ['games', 'tap-status'],
    queryFn: gamesApi.tapStatus,
    enabled: isAuthenticated, staleTime: 0,
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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Orange curved header ── */}
        <View style={styles.headerBlock}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.headerTitle}>B60 CLUB</Text>
              <Text style={styles.headerSub}>ORDER · EARN · PLAY · WIN</Text>
            </View>
            <Pressable
              style={styles.leaderboardBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/games/leaderboard' as any) }}
            >
              <Trophy size={16} color="#1B2A4A" />
              {yourRank && <Text style={styles.leaderboardBtnText}>#{yourRank}</Text>}
            </Pressable>
          </View>

          {/* Points inside header */}
          <View style={styles.pointsHeroCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>YOUR POINTS</Text>
              <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                <Star size={10} color="#000" fill="#000" />
                <Text style={styles.tierBadgeText}>{tier.name.toUpperCase()}</Text>
              </View>
            </View>
            <AnimatedPointsText target={points} />
            <Text style={styles.aedValue}>≈ AED {(points * POINTS_TO_AED).toFixed(0)} redeemable</Text>
            {nextTier && (
              <View style={styles.progressSection}>
                <ProgressBar progress={progress} color={tier.color} />
                <Text style={styles.progressLabel}>{nextTier.min - points} pts to {nextTier.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Redeem CTA ── */}
        <Pressable
          style={styles.redeemBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(tabs)/cart') }}
        >
          <View>
            <Text style={styles.redeemBtnText}>USE YOUR POINTS →</Text>
            <Text style={styles.redeemBtnSub}>Save AED on your next smash</Text>
          </View>
          <ArrowRight size={20} color="#000" />
        </Pressable>

        {/* ── ARCADE ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>ARCADE</Text>
            <View style={styles.sectionPill}><Text style={styles.sectionPillText}>WIN PRIZES</Text></View>
          </View>
          <Text style={styles.sectionDesc}>Play games. Win points, vouchers & free food.</Text>

          <ArcadeCard
            title="SPIN THE WHEEL"
            subtitle={spinStatus?.can_spin ? `${spinStatus.spins_left} spin${spinStatus.spins_left !== 1 ? 's' : ''} left today` : 'Come back tomorrow'}
            badge={spinStatus?.can_spin ? 'SPIN NOW' : undefined}
            bg={Colors.primary}
            icon={RotateCcw}
            onPress={() => router.push('/games/spin' as any)}
          />

          <ArcadeCard
            title="SMASH TAP"
            subtitle={tapStatus
              ? tapStatus.best_score > 0
                ? `${tapStatus.plays_left} plays left · Best: ${tapStatus.best_score} taps`
                : `${tapStatus.plays_left} play${tapStatus.plays_left !== 1 ? 's' : ''} left today`
              : 'Tap as fast as you can'}
            badge={tapStatus && tapStatus.plays_left > 0 ? 'PLAY' : undefined}
            bg="#1B2A4A"
            icon={Zap}
            onPress={() => router.push('/games/tap' as any)}
          />

          <ArcadeCard
            title="LEADERBOARD"
            subtitle={topPlayer ? `#1 ${topPlayer.display_name} — ${topPlayer.total_score} pts` : 'Weekly competition · Resets Monday'}
            bg="#0D1829"
            icon={Trophy}
            onPress={() => router.push('/games/leaderboard' as any)}
          />
        </View>

        {/* ── How to Earn accordion ── */}
        <View style={styles.accordionCard}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => { Haptics.selectionAsync(); setHowToOpen(!howToOpen) }}
          >
            <Text style={styles.accordionTitle}>How to Earn</Text>
            {howToOpen ? <ChevronUp size={18} color={T.textMuted} /> : <ChevronDown size={18} color={T.textMuted} />}
          </Pressable>
          {howToOpen && (
            <View style={styles.accordionBody}>
              {[
                { icon: TrendingUp, color: T.primary, bg: T.primaryTint, text: 'Spend AED 1 → Earn 1 Point' },
                { icon: Gift, color: T.success, bg: T.successTint, text: '100 Points → AED 5 off your order' },
                { icon: Star, color: '#B8860B', bg: 'rgba(255,215,0,0.15)', text: 'Reach Gold tier for exclusive perks' },
                { icon: RotateCcw, color: Colors.primary, bg: T.primaryTint, text: 'Daily spin → win up to 500 pts or free food' },
              ].map(({ icon: Icon, color, bg, text }, i) => (
                <View key={i} style={styles.ruleRow}>
                  <View style={[styles.ruleIcon, { backgroundColor: bg }]}><Icon size={16} color={color} /></View>
                  <Text style={styles.ruleText}>{text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Transaction History ── */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>HISTORY</Text>
          </View>
          {history && history.length > 0 ? (
            history.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>No History Yet</Text>
              <Text style={styles.emptySubtext}>Place your first order and watch those points stack.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F3' },
  scroll: { gap: Spacing.md, paddingBottom: Spacing.xxl },

  // Orange curved header
  headerBlock: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: Spacing.md,
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  headerSub: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, marginTop: 1 },
  leaderboardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.yellow,
    borderRadius: Radius.md, borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  leaderboardBtnText: { fontSize: 13, fontWeight: '800', color: '#1B2A4A' },

  // Points hero card (inside header)
  pointsHeroCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
    padding: Spacing.md, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 10, fontWeight: '800', color: T.textMuted, letterSpacing: 2.5, textTransform: 'uppercase' },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: '#000',
  },
  tierBadgeText: { fontSize: 10, fontWeight: '900', color: '#000' },
  pointsNumber: { fontSize: 68, fontWeight: '900', color: '#1B2A4A', lineHeight: 74 },
  aedValue: { fontSize: 13, color: T.textMuted, fontWeight: '600' },
  progressSection: { gap: 6 },
  meterRow: { flexDirection: 'row', gap: 3 },
  meterBlock: { flex: 1, height: 8, borderRadius: 2, borderWidth: 1 },
  progressLabel: { color: T.textMuted, fontSize: 12, fontWeight: '600' },

  // Redeem
  redeemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.md,
    backgroundColor: Colors.yellow,
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  redeemBtnText: { fontSize: 16, fontWeight: '900', color: '#000' },
  redeemBtnSub: { fontSize: 12, fontWeight: '600', color: '#333', marginTop: 1 },

  // Section
  sectionBlock: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  sectionAccent: { width: 4, height: 18, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '900', color: '#1B2A4A', letterSpacing: 2, textTransform: 'uppercase' },
  sectionPill: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 2, borderColor: '#000' },
  sectionPillText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  sectionDesc: { fontSize: 13, color: T.textMuted, marginTop: -4, paddingHorizontal: Spacing.md },

  // Arcade card
  arcadeCard: {
    borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  arcadeCardInner: { padding: Spacing.md, overflow: 'hidden' },
  arcadeDecor: { position: 'absolute', right: -30, top: -30, width: 100, height: 100, borderRadius: 50, borderWidth: 20, borderColor: 'rgba(255,255,255,0.06)' },
  arcadeCardContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  arcadeIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  arcadeCardTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  arcadeCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  arcadeBadge: {
    backgroundColor: Colors.yellow, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1.5, borderColor: '#000',
  },
  arcadeBadgeText: { fontSize: 11, fontWeight: '900', color: '#000' },

  // Accordion
  accordionCard: {
    marginHorizontal: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 2.5, borderColor: '#000',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4,
    overflow: 'hidden',
  },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  accordionTitle: { fontSize: 15, fontWeight: '900', color: '#1B2A4A', letterSpacing: 0.5 },
  accordionBody: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
  ruleText: { fontSize: 14, flex: 1, color: T.textSecondary },

  // History
  historySection: { gap: Spacing.sm },
  emptyHistory: {
    marginHorizontal: Spacing.md, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#fff', borderRadius: Radius.lg,
    borderWidth: 2, borderColor: '#000',
  },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#1B2A4A' },
  emptySubtext: { fontSize: 13, color: T.textMuted, textAlign: 'center' },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.sm + 2,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#000',
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  txIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txLeft: { flex: 1, gap: 1 },
  txType: { fontSize: 13, fontWeight: '600', color: '#1B2A4A' },
  txDate: { fontSize: 11, color: T.textMuted },
  txPoints: { fontSize: 14, fontWeight: '800' },
})
