import React from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Trophy, Zap, RotateCcw, Flame } from 'lucide-react-native'
import { gamesApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { Colors, LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import type { LeaderboardEntry } from '../../types'

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <View style={[styles.rankCircle, { backgroundColor: RANK_COLORS[rank - 1] }]}>
        <Trophy size={14} color="#000" fill="#000" />
      </View>
    )
  }
  return (
    <View style={[styles.rankCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
      <Text style={styles.rankNum}>#{rank}</Text>
    </View>
  )
}

function LeaderboardRow({ entry, rank, isYou, theme }: { entry: LeaderboardEntry; rank: number; isYou: boolean; theme: any }) {
  return (
    <View style={[
      styles.row,
      { backgroundColor: theme.surface },
      isYou && styles.rowHighlight,
      rank <= 3 && styles.rowTop,
    ]}>
      {rank <= 3 ? (
        <LinearGradient
          colors={rank === 1 ? ['#FFD700', '#B8860B'] : rank === 2 ? ['#C0C0C0', '#808080'] : ['#CD7F32', '#8B4513']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      ) : null}
      <RankBadge rank={rank} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: rank <= 3 ? '#000' : theme.text }]} numberOfLines={1}>
          {entry.display_name}{isYou ? ' (you)' : ''}
        </Text>
        <View style={styles.rowScores}>
          <View style={styles.scoreChip}>
            <Zap size={10} color={Colors.primary} />
            <Text style={styles.scoreChipText}>{entry.tap_score}</Text>
          </View>
          <View style={styles.scoreChip}>
            <RotateCcw size={10} color={Colors.primary} />
            <Text style={styles.scoreChipText}>{entry.spin_score}</Text>
          </View>
          <View style={styles.scoreChip}>
            <Flame size={10} color={Colors.primary} />
            <Text style={styles.scoreChipText}>{entry.order_streak}d</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.rowTotal, { color: rank <= 3 ? '#000' : theme.text }]}>{entry.total_score}</Text>
    </View>
  )
}

export default function LeaderboardScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.user?.id)

  const { data, isLoading } = useQuery({
    queryKey: ['games', 'leaderboard'],
    queryFn: gamesApi.leaderboard,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const leaderboard = data?.leaderboard ?? []
  const yourRank = data?.your_rank
  const weekStart = data?.week_start

  const weekLabel = weekStart
    ? `Week of ${new Date(weekStart).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}`
    : 'This Week'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.text }]}>LEADERBOARD</Text>
          <Text style={[styles.weekLabel, { color: theme.textMuted }]}>{weekLabel} · Resets Monday</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Your rank banner */}
      {yourRank && (
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.yourRankBanner}>
          <Trophy size={18} color="#fff" />
          <Text style={styles.yourRankText}>Your rank this week: #{yourRank}</Text>
        </LinearGradient>
      )}

      {/* Score legend */}
      <View style={[styles.legend, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          { icon: Zap, label: 'Tap score' },
          { icon: RotateCcw, label: 'Spin score' },
          { icon: Flame, label: 'Streak days' },
        ].map(({ icon: Icon, label }, i) => (
          <View key={i} style={styles.legendItem}>
            <Icon size={12} color={Colors.primary} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>{label}</Text>
          </View>
        ))}
        <Text style={[styles.legendNote, { color: theme.textMuted }]}>Streak ×10 pts</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.row, styles.skeleton, { backgroundColor: theme.surface }]} />
          ))
        ) : leaderboard.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No scores yet</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>Play games to claim your spot on the board.</Text>
          </View>
        ) : (
          leaderboard.map((entry, i) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              rank={i + 1}
              isYou={entry.user_id === userId}
              theme={theme}
            />
          ))
        )}
      </ScrollView>

      {/* Prizes footer */}
      <View style={[styles.prizesFooter, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.prizesTitle, { color: theme.text }]}>Weekly Prizes</Text>
        <View style={styles.prizeRow}>
          {['#1 · 500 pts + free burger', '#2 · 250 pts', '#3 · 100 pts'].map((p, i) => (
            <View key={i} style={[styles.prizeChip, { backgroundColor: i === 0 ? Colors.primary : theme.background, borderColor: theme.border }]}>
              <Text style={[styles.prizeChipText, { color: i === 0 ? '#fff' : theme.text }]}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  weekLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  yourRankBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, borderRadius: Radius.md, padding: Spacing.sm + 4, marginBottom: 4 },
  yourRankText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  legend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11 },
  legendNote: { marginLeft: 'auto', fontSize: 11, fontWeight: '700' },

  list: { paddingHorizontal: Spacing.md, gap: Spacing.xs ?? 6, paddingBottom: 120 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.sm + 2, overflow: 'hidden',
    minHeight: 58,
  },
  rowHighlight: { borderWidth: 2, borderColor: Colors.primary },
  rowTop: {},
  skeleton: { height: 58, opacity: 0.4 },

  rankCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: 12, fontWeight: '900', color: '#fff' },

  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  rowScores: { flexDirection: 'row', gap: 6 },
  scoreChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  scoreChipText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  rowTotal: { fontSize: 20, fontWeight: '900', color: '#fff' },

  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', maxWidth: 260 },

  prizesFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, borderTopWidth: 1, gap: Spacing.sm },
  prizesTitle: { fontSize: 13, fontWeight: '800' },
  prizeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  prizeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  prizeChipText: { fontSize: 11, fontWeight: '700' },
})
