import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  Star, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, useDerivedValue,
  useAnimatedProps, interpolate, Extrapolation,
} from 'react-native-reanimated'
import { loyaltyApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import { POINTS_TO_AED } from '../../utils/constants'
import type { LoyaltyTransaction } from '../../types'

// ─── Tier Config ─────────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Bronze', min: 0,    max: 999,      color: '#CD7F32', emoji: '🥉', next: 1000 },
  { name: 'Silver', min: 1000, max: 4999,     color: '#A8A8A8', emoji: '🥈', next: 5000 },
  { name: 'Gold',   min: 5000, max: Infinity, color: '#FFD700', emoji: '🥇', next: null },
]

function getTier(points: number) {
  return TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0]
}

// ─── Animated Points Number ──────────────────────────────────────────────────

function AnimatedPointsText({ target }: { target: number }) {
  return <Text style={styles.pointsNumber}>{target.toLocaleString()}</Text>
}

// ─── Animated Progress Bar ───────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const width = useSharedValue(0)

  useEffect(() => {
    width.value = withTiming(Math.min(progress, 1), { duration: 1100 })
  }, [progress])

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(width.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
    backgroundColor: color,
  }))

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  )
}

// ─── Transaction Row ─────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const isEarned = tx.type === 'earned' || tx.type === 'bonus'
  return (
    <View style={[styles.txRow, { backgroundColor: isEarned ? Colors.successTint : Colors.errorTint }]}>
      <View style={[styles.txIcon, { backgroundColor: isEarned ? Colors.success : Colors.error }]}>
        {isEarned
          ? <ArrowUpRight size={14} color={Colors.white} />
          : <ArrowDownLeft size={14} color={Colors.white} />}
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function LoyaltyScreen() {
  const user = useAuthStore((s) => s.user)
  const [howToOpen, setHowToOpen] = React.useState(false)

  const { data: history } = useQuery({
    queryKey: ['loyalty', 'history'],
    queryFn: loyaltyApi.getHistory,
  })

  const points = user?.loyalty_points ?? 0
  const tier = getTier(points)
  const nextTier = TIERS.find(t => t.min > points)
  const progress = nextTier ? (points - tier.min) / (nextTier.min - tier.min) : 1

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.screenTitle}>Loyalty Points</Text>

        {/* ── Points Card ── */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark, '#1B2A4A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsCard}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          {/* Top row: label + tier badge */}
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>YOUR POINTS</Text>
            <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
              <Star size={11} color={Colors.black} fill={Colors.black} />
              <Text style={styles.tierBadgeText}>{tier.name}</Text>
            </View>
          </View>

          {/* Animated count-up */}
          <AnimatedPointsText target={points} />

          <Text style={styles.aedValue}>
            ≈ AED {(points * POINTS_TO_AED).toFixed(0)} redeemable
          </Text>

          {/* Progress bar + label */}
          {nextTier && (
            <View style={styles.progressSection}>
              <ProgressBar progress={progress} color={tier.color} />
              <Text style={styles.progressLabel}>
                {nextTier.min - points} pts to {nextTier.name}
              </Text>
            </View>
          )}

          {/* Tier milestone icons */}
          <View style={styles.tierMilestones}>
            {TIERS.map((t) => {
              const active = points >= t.min
              const isCurrent = tier.name === t.name
              return (
                <View key={t.name} style={[styles.milestone, isCurrent && styles.milestoneActive]}>
                  <View style={[
                    styles.milestoneIcon,
                    { backgroundColor: active ? t.color : 'rgba(255,255,255,0.15)' },
                    isCurrent && { borderWidth: 2, borderColor: Colors.white },
                  ]}>
                    <Text style={styles.milestoneEmoji}>{t.emoji}</Text>
                  </View>
                  <Text style={[styles.milestoneName, isCurrent && { color: Colors.white, fontWeight: '800' }]}>
                    {t.name}
                  </Text>
                  <Text style={styles.milestonePts}>{t.min === 0 ? '0' : t.min.toLocaleString()}</Text>
                </View>
              )
            })}
          </View>
        </LinearGradient>

        {/* ── Redeem CTA ── */}
        <Pressable
          style={styles.redeemBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            router.push('/(tabs)/cart')
          }}
        >
          <View>
            <Text style={styles.redeemBtnText}>Redeem Points →</Text>
            <Text style={styles.redeemBtnSub}>Use in your next order</Text>
          </View>
          <ArrowRight size={20} color={Colors.text} />
        </Pressable>

        {/* ── How to Earn accordion ── */}
        <View style={[styles.card, Shadows.card]}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => {
              Haptics.selectionAsync()
              setHowToOpen(!howToOpen)
            }}
          >
            <Text style={styles.sectionTitle}>How to Earn</Text>
            {howToOpen
              ? <ChevronUp size={18} color={Colors.textMuted} />
              : <ChevronDown size={18} color={Colors.textMuted} />}
          </Pressable>
          {howToOpen && (
            <View style={styles.accordionBody}>
              <View style={styles.ruleRow}>
                <View style={[styles.ruleIcon, { backgroundColor: Colors.primaryTint }]}>
                  <TrendingUp size={16} color={Colors.primary} />
                </View>
                <Text style={styles.ruleText}>Spend AED 1 → Earn 1 Point</Text>
              </View>
              <View style={styles.ruleRow}>
                <View style={[styles.ruleIcon, { backgroundColor: Colors.successTint }]}>
                  <Gift size={16} color={Colors.success} />
                </View>
                <Text style={styles.ruleText}>100 Points → AED 5 off your order</Text>
              </View>
              <View style={styles.ruleRow}>
                <View style={[styles.ruleIcon, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                  <Star size={16} color="#B8860B" />
                </View>
                <Text style={styles.ruleText}>Reach Gold tier for exclusive perks</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Transaction History ── */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>History</Text>
          {history && history.length > 0 ? (
            history.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          ) : (
            <View style={[styles.card, styles.emptyHistory]}>
              <Text style={styles.emptyEmoji}>🍔</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Start ordering to earn points!</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  screenTitle: { fontSize: 30, fontWeight: '900', color: Colors.text },

  // Points card
  pointsCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
    ...Shadows.glowStrong,
  },
  decorCircle1: {
    position: 'absolute', right: -50, top: -50,
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 28, borderColor: 'rgba(255,255,255,0.07)',
  },
  decorCircle2: {
    position: 'absolute', right: 60, bottom: -60,
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 20, borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2.5, textTransform: 'uppercase',
  },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.black },
  pointsNumber: {
    fontSize: 72, fontWeight: '900', color: Colors.white, lineHeight: 78,
  },
  aedValue: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // Progress
  progressSection: { gap: 6 },
  progressTrack: {
    height: 12, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },

  // Tier milestones
  tierMilestones: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  milestone: { alignItems: 'center', gap: 4 },
  milestoneActive: {},
  milestoneIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneEmoji: { fontSize: 18 },
  milestoneName: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  milestonePts: { fontSize: 9, color: 'rgba(255,255,255,0.45)' },

  // Redeem CTA
  redeemBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  redeemBtnText: { fontSize: 17, fontWeight: '800', color: Colors.text },
  redeemBtnSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
  },
  accordionBody: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ruleText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  // History
  historySection: { gap: Spacing.sm },
  emptyHistory: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },

  // Transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.sm + 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  txIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  txLeft: { flex: 1, gap: 1 },
  txType: { fontSize: 13, fontWeight: '600', color: Colors.text },
  txDate: { fontSize: 11, color: Colors.textMuted },
  txPoints: { fontSize: 14, fontWeight: '800' },
})
