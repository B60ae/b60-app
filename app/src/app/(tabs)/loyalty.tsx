import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Animated, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ShoppingCart, Zap, RotateCcw } from 'lucide-react-native'
import { loyaltyApi, gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import { TIERS, getTier } from '../../utils/tiers'
import type { LoyaltyTransaction } from '../../types'

import { V3, Shadows } from '../../utils/theme'

// ─── Design tokens ───────────────────────────────────────────────────────────────
const C = {
  bg:      V3.k,
  surface: V3.s,
  black:   V3.w,
  accent:  V3.o,
  hairline: V3.ln,
  dim:     V3.dim,
  dim2:    V3.dim2,
  gold:    V3.gold,
  od:      V3.od,
}

const TIER_HEX: Record<string, string> = {
  Bronze:   '#8A5A2B',
  Silver:   '#C9C9C9',
  Gold:     '#E8B31C',
  Platinum: '#E5E4E2',
}

const TIER_PERKS: Record<string, string> = {
  Bronze:   'Earn 1 pt per AED spent',
  Silver:   'Priority support + bonus spin Fridays',
  Gold:     'Free upgrade on every order',
  Platinum: 'VIP treatment + monthly voucher',
}

const { width: SCREEN_W } = Dimensions.get('window')

// ─── AnimatedPointsText ───────────────────────────────────────────────────────────────
function AnimatedPointsText({ target }: { target: number }) {
  const [display, setDisplay] = React.useState(0)

  useEffect(() => {
    if (target === 0) { setDisplay(0); return }
    const duration = 620
    const steps = 40
    const intervalMs = duration / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      const t = step / steps
      const eased = 1 - Math.pow(1 - t, 3) // cubic ease-out
      setDisplay(Math.floor(eased * target))
      if (step >= steps) {
        setDisplay(target)
        clearInterval(timer)
      }
    }, intervalMs)
    return () => clearInterval(timer)
  }, [target])

  return <Text style={s.pointsNumber}>{display.toLocaleString()}</Text>
}

// ─── AnimatedProgressBar ──────────────────────────────────────────────────────────────
function AnimatedProgressBar({ progress }: { progress: number }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: 1100,
      useNativeDriver: false,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    }).start()
  }, [progress])

  return (
    <View style={s.progressTrack}>
      <Animated.View
        style={[
          s.progressFill,
          {
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  )
}

// ─── Points panel (orange, with sheen sweep) ────────────────────────────────────────────
function PointsPanel({
  points, redeemableAed, canRedeem, ptsToRedeem,
}: {
  points: number
  redeemableAed: number
  canRedeem: boolean
  ptsToRedeem: number
}) {
  const sheenX = useRef(new Animated.Value(-SCREEN_W)).current

  useEffect(() => {
    const sweep = () => {
      sheenX.setValue(-SCREEN_W)
      Animated.timing(sheenX, {
        toValue: SCREEN_W * 1.5,
        duration: 800,
        useNativeDriver: true,
        easing: (t: number) => t,
      }).start()
    }
    sweep()
    const id = setInterval(sweep, 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <View style={s.pointsPanel}>
      {/* Sheen overlay */}
      <Animated.View
        pointerEvents="none"
        style={[s.sheen, { transform: [{ translateX: sheenX }] }]}
      />

      <View style={s.pointsRow}>
        {/* Left: label + big number */}
        <View style={s.pointsLeft}>
          <Text style={s.panelLabel}>B60 CLUB · POINTS BALANCE</Text>
          <AnimatedPointsText target={points} />
        </View>

        {/* Right: AED value */}
        <View style={s.pointsRight}>
          <Text style={s.aedValue}>AED {redeemableAed.toFixed(0)}</Text>
          <Text style={s.aedLabel}>REDEEMABLE VALUE</Text>
        </View>
      </View>

      <Text style={s.panelHint}>
        {canRedeem
          ? 'APPLY AT CHECKOUT · 20 PTS = AED 1'
          : `${ptsToRedeem} MORE POINTS TO REDEEM`}
      </Text>
    </View>
  )
}

// ─── Section head ─────────────────────────────────────────────────────────────────────
function SectionHead({ label, right }: { label: string; right?: string }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionHeadText}>{label}</Text>
      {right != null && <Text style={s.sectionHeadRight}>{right}</Text>}
    </View>
  )
}

// ─── Game card ──────────────────────────────────────────────────────────────────────────
function GameCard({
  title, subtitle, badge, icon: Icon, onPress,
}: {
  title: string
  subtitle: string
  badge?: string
  icon: any
  onPress: () => void
}) {
  const pressed = useRef(new Animated.Value(0)).current

  return (
    <Pressable
      onPressIn={() =>
        Animated.timing(pressed, { toValue: 1, duration: 60, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.timing(pressed, { toValue: 0, duration: 100, useNativeDriver: true }).start()
      }
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onPress()
      }}
      style={s.gameCardOuter}
    >
      <Animated.View
        style={[
          s.gameCard,
          {
            transform: [
              { translateX: pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) },
              { translateY: pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) },
            ],
          },
        ]}
      >
        <View style={s.gameIconBox}>
          <Icon size={20} color={C.black} strokeWidth={2} />
        </View>
        <Text style={s.gameTitle}>{title}</Text>
        <Text style={s.gameSub}>{subtitle}</Text>
        {badge != null && (
          <View style={s.gameBadge}>
            <Text style={s.gameBadgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  )
}

// ─── History row with stagger-in ─────────────────────────────────────────────────────────────
function HistoryRow({ tx, index }: { tx: LoyaltyTransaction; index: number }) {
  const anim = useRef(new Animated.Value(0)).current
  const isEarned = tx.type === 'earned' || tx.type === 'bonus'

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index, 8) * 45,
      useNativeDriver: true,
    }).start()
  }, [])

  return (
    <Animated.View
      style={[
        s.historyRow,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={s.historyLeft}>
        <Text style={s.historyDesc}>{tx.description}</Text>
        <Text style={s.historyDate}>{new Date(tx.created_at).toLocaleDateString('en-AE')}</Text>
      </View>
      <Text style={[s.historyPts, { color: isEarned ? C.accent : C.dim2 }]}>
        {isEarned ? '+' : '-'}{Math.abs(tx.points)}
      </Text>
    </Animated.View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────────────────
export default function LoyaltyScreen() {
  const user           = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: balance } = useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn:  loyaltyApi.getBalance,
    staleTime: 0,
    enabled:  isAuthenticated,
  })
  const { data: history } = useQuery({
    queryKey: ['loyalty', 'history'],
    queryFn:  loyaltyApi.getHistory,
    enabled:  isAuthenticated,
  })
  const { data: spinStatus } = useQuery({
    queryKey: ['games', 'spin-status'],
    queryFn:  gamesApi.spinStatus,
    enabled:  isAuthenticated,
    staleTime: 0,
  })
  const { data: tapStatus } = useQuery({
    queryKey: ['games', 'tap-status'],
    queryFn:  gamesApi.tapStatus,
    enabled:  isAuthenticated,
    staleTime: 0,
  })
  const { data: leaderboardData } = useQuery({
    queryKey: ['games', 'leaderboard'],
    queryFn:  gamesApi.leaderboard,
    enabled:  isAuthenticated,
  })

  useEffect(() => {
    if (balance?.total_points !== undefined) {
      useAuthStore.getState().updatePoints(balance.total_points)
    }
  }, [balance?.total_points])

  const points         = balance?.total_points ?? user?.loyalty_points ?? 0
  const tier           = getTier(points)
  const nextTier       = TIERS.find((t) => t.min > points)
  const progress       = nextTier ? (points - tier.min) / (nextTier.min - tier.min) : 1
  const redeemableAed  = points * POINTS_TO_AED
  const canRedeem      = points >= MIN_REDEEM_POINTS
  const ptsToRedeem    = Math.max(0, MIN_REDEEM_POINTS - points)
  const historyList    = history ?? []
  const tierColor      = TIER_HEX[tier.name] ?? '#8A5A2B'

  // leaderboard data kept for query freshness (not rendered in v2 loyalty layout)
  void leaderboardData

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── TopBar ── */}
      <View style={s.topBar}>
        <View style={s.logoBox}>
          <Text style={s.logoText}>B60</Text>
        </View>
        <Pressable
          style={s.cartBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push('/(tabs)/cart')
          }}
        >
          <ShoppingCart size={20} color={C.black} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
      >

        {/* ── Points panel ── */}
        <PointsPanel
          points={points}
          redeemableAed={redeemableAed}
          canRedeem={canRedeem}
          ptsToRedeem={ptsToRedeem}
        />

        {/* ── Tier row ── */}
        <View style={s.tierRow}>
          <View style={[s.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={s.tierBadgeText}>{tier.name.toUpperCase()}</Text>
          </View>
          <View style={s.tierProgressWrap}>
            <AnimatedProgressBar progress={progress} />
          </View>
          {nextTier && (
            <Text style={s.tierPtsLabel} numberOfLines={1}>
              {(nextTier.min - points).toLocaleString()} PTS TO {nextTier.name.toUpperCase()}
            </Text>
          )}
        </View>

        {/* ── Perk row ── */}
        <View style={s.perkRow}>
          <Text style={s.perkLabel}>YOUR PERK</Text>
          <Text style={s.perkText}>{TIER_PERKS[tier.name] ?? 'Earn 1 pt per AED spent'}</Text>
        </View>

        {/* ── Play for points ── */}
        <SectionHead label="Play for points" right="Daily" />

        <View style={s.gameGrid}>
          <GameCard
            title="SMASH IT"
            subtitle={
              tapStatus
                ? tapStatus.best_score > 0
                  ? `${tapStatus.plays_left} plays left · Best: ${tapStatus.best_score}`
                  : `${tapStatus.plays_left} play${tapStatus.plays_left !== 1 ? 's' : ''} left`
                : 'Tap as fast as you can'
            }
            badge={tapStatus && tapStatus.plays_left > 0 ? 'PLAY' : undefined}
            icon={Zap}
            onPress={() => router.push('/games/tap' as any)}
          />
          <View style={s.gameGridDivider} />
          <GameCard
            title="SPIN THE WHEEL"
            subtitle={
              spinStatus?.can_spin
                ? `${spinStatus.spins_left} spin${spinStatus.spins_left !== 1 ? 's' : ''} left`
                : 'Come back tomorrow'
            }
            badge={spinStatus?.can_spin ? 'SPIN' : undefined}
            icon={RotateCcw}
            onPress={() => router.push('/games/spin' as any)}
          />
        </View>

        {/* ── Tiers ── */}
        <SectionHead label="Tiers" />

        <View style={s.tierTableCard}>
          {TIERS.map((t) => {
            const isCurrent = t.name === tier.name
            const tc = TIER_HEX[t.name] ?? '#8A5A2B'
            return (
              <View key={t.name} style={[s.tierTableRow, isCurrent && s.tierTableRowActive]}>
                <View style={[s.tierTableBadge, { backgroundColor: tc }]}>
                  <Text style={s.tierTableBadgeText}>{t.name}</Text>
                </View>
                <Text style={s.tierTableRange}>
                  {t.max === Infinity
                    ? `${t.min.toLocaleString()}+`
                    : `${t.min.toLocaleString()}–${t.max.toLocaleString()}`}
                </Text>
                <Text style={s.tierTablePerk} numberOfLines={2}>
                  {TIER_PERKS[t.name] ?? ''}
                </Text>
                {isCurrent && (
                  <View style={s.youTag}>
                    <Text style={s.youTagText}>You</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {/* ── History ── */}
        <SectionHead
          label="History"
          right={historyList.length > 0 ? String(historyList.length) : undefined}
        />

        <View style={s.historyCard}>
          {historyList.length > 0 ? (
            historyList.map((tx, i) => (
              <HistoryRow key={tx.id} tx={tx} index={i} />
            ))
          ) : (
            <View style={s.emptyHistory}>
              <Text style={s.emptyTitle}>No history yet</Text>
              <Text style={s.emptyBody}>Place your first order and watch those points stack.</Text>
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            1 AED SPENT = 1 POINT · 20 POINTS = AED 1 OFF · MINIMUM 100 POINTS TO REDEEM
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // ── TopBar
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 18,
    paddingVertical:   14,
    backgroundColor:   C.bg,
  },
  logoBox: { paddingHorizontal: 0 },
  logoText: {
    fontFamily:    'Archivo_800ExtraBold',
    fontSize:      18,
    color:         C.black,
    letterSpacing: -0.4,
  },
  cartBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadows.iconBtn,
  },

  // ── Points panel — floating card, orange gradient bg
  pointsPanel: {
    backgroundColor:   C.accent,
    marginHorizontal:  18,
    marginTop:         14,
    borderRadius:      22,
    paddingHorizontal: 18,
    paddingTop:        20,
    paddingBottom:     18,
    overflow:          'hidden',
    ...Shadows.cardStrong,
  },
  sheen: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    left:            -20,
    width:           80,
    backgroundColor: 'rgba(255,253,248,0.12)',
    transform:       [{ skewX: '-12deg' }],
  },
  pointsRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
  },
  pointsLeft: { flex: 1, paddingRight: 12 },
  panelLabel: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9.5,
    color:         'rgba(255,253,248,0.7)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom:  2,
  },
  pointsNumber: {
    fontFamily:    'Archivo_900Black',
    fontSize:      76,
    lineHeight:    62,
    letterSpacing: -3.4,
    color:         C.gold,
    marginTop:     6,
  },
  pointsRight: { alignItems: 'flex-end', paddingTop: 6 },
  aedValue: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize:   22,
    color:      '#FFFDF8',
    fontWeight: '800' as const,
  },
  aedLabel: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9,
    color:         'rgba(255,253,248,0.65)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop:     3,
  },
  panelHint: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9.5,
    color:         'rgba(255,253,248,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop:     14,
  },

  // ── Tier row — inside floating card
  tierRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    marginHorizontal:  18,
    marginTop:         12,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      18,
    backgroundColor:   C.surface,
    ...Shadows.card,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    backgroundColor:   C.bg,
  },
  tierBadgeText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize:   12,
    color:      C.od,
  },
  tierProgressWrap: { flex: 1 },
  progressTrack: {
    height:          8,
    backgroundColor: C.bg,
    borderRadius:    999,
    overflow:        'hidden',
  },
  progressFill: {
    height:          '100%',
    backgroundColor: C.accent,
    borderRadius:    999,
  },
  tierPtsLabel: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9,
    color:         C.dim2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink:    1,
    maxWidth:      100,
  },

  // ── Perk row
  perkRow: {
    marginHorizontal:  18,
    marginTop:         10,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      18,
    gap:               4,
    backgroundColor:   C.surface,
    ...Shadows.card,
  },
  perkLabel: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9.5,
    color:         C.dim2,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  perkText: {
    fontFamily: 'Archivo_400Regular',
    fontSize:   14,
    color:      C.black,
    lineHeight: 20,
  },

  // ── Section head
  sectionHead: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 18,
    paddingTop:        22,
    paddingBottom:     12,
    backgroundColor:   C.bg,
  },
  sectionHeadText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize:   20,
    color:      C.black,
    letterSpacing: -0.2,
  },
  sectionHeadRight: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9.5,
    color:         C.dim2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Game grid
  gameGrid: {
    flexDirection:    'row',
    marginHorizontal: 18,
    gap:              10,
    marginBottom:     4,
  },
  gameGridDivider: { width: 0 },
  gameCardOuter: { flex: 1 },
  gameCard: {
    minHeight:       132,
    padding:         16,
    backgroundColor: C.surface,
    borderRadius:    18,
    gap:             6,
    ...Shadows.card,
  },
  gameIconBox: {
    width:           38,
    height:          38,
    borderRadius:    999,
    backgroundColor: C.bg,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  gameTitle: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize:   13,
    color:      C.black,
    lineHeight: 16,
  },
  gameSub: {
    fontFamily: 'Archivo_400Regular',
    fontSize:   12,
    color:      C.dim2,
    lineHeight: 16,
  },
  gameBadge: {
    alignSelf:         'flex-start',
    backgroundColor:   C.gold,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      999,
    marginTop:         4,
  },
  gameBadgeText: {
    fontFamily:    'JetBrainsMono_500Medium',
    fontSize:      9,
    color:         C.black,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Tier table
  tierTableCard: {
    marginHorizontal: 18,
    backgroundColor:  C.surface,
    borderRadius:     18,
    overflow:         'hidden',
    ...Shadows.card,
    marginBottom:     4,
  },
  tierTableRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    gap:               10,
    backgroundColor:   C.surface,
  },
  tierTableRowActive: { backgroundColor: 'rgba(239,109,21,0.06)' },
  tierTableBadge: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      999,
    backgroundColor:   C.bg,
  },
  tierTableBadgeText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize:   10,
    color:      C.od,
  },
  tierTableRange: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9,
    color:         C.dim2,
    width:         80,
    letterSpacing: 0.4,
  },
  tierTablePerk: {
    fontFamily: 'Archivo_400Regular',
    fontSize:   11,
    color:      C.dim,
    flex:       1,
    lineHeight: 16,
  },
  youTag: {
    backgroundColor:   C.gold,
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      999,
  },
  youTagText: {
    fontFamily:    'JetBrainsMono_500Medium',
    fontSize:      8,
    color:         C.black,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── History card + rows
  historyCard: {
    marginHorizontal: 18,
    backgroundColor:  C.surface,
    borderRadius:     18,
    overflow:         'hidden',
    ...Shadows.card,
    marginBottom:     4,
  },
  historyRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingVertical:   13,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    backgroundColor:   C.surface,
  },
  historyLeft: { flex: 1, gap: 2 },
  historyDesc: {
    fontFamily: 'Archivo_400Regular',
    fontSize:   13,
    color:      C.black,
  },
  historyDate: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      10,
    color:         C.dim2,
    letterSpacing: 0.5,
  },
  historyPts: {
    fontFamily:    'Archivo_800ExtraBold',
    fontSize:      15,
    letterSpacing: -0.5,
  },
  emptyHistory: {
    paddingHorizontal: 18,
    paddingVertical:   36,
    alignItems:        'center',
    gap:               6,
    backgroundColor:   C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  emptyTitle: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize:   14,
    color:      C.black,
  },
  emptyBody: {
    fontFamily: 'Archivo_400Regular',
    fontSize:   12,
    color:      C.dim2,
    textAlign:  'center',
  },

  // ── Footer
  footer: {
    paddingHorizontal: 18,
    paddingVertical:   20,
    marginTop:         10,
  },
  footerText: {
    fontFamily:    'JetBrainsMono_400Regular',
    fontSize:      9,
    color:         C.dim2,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    textAlign:     'center',
    lineHeight:    14,
  },
})
