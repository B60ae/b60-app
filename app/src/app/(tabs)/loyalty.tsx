import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { Star, TrendingUp, Gift } from 'lucide-react-native'
import { loyaltyApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import { POINTS_TO_AED } from '../../utils/constants'
import type { LoyaltyTransaction } from '../../types'

const TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: '#CD7F32' },
  { name: 'Silver', min: 1000, max: 4999, color: '#C0C0C0' },
  { name: 'Gold', min: 5000, max: Infinity, color: '#FFD700' },
]

function getTier(points: number) {
  return TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0]
}

export default function LoyaltyScreen() {
  const user = useAuthStore((s) => s.user)
  const { data: balance, isLoading } = useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: loyaltyApi.getBalance,
  })
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.lg, padding: Spacing.lg }}>
        <Text style={styles.title}>Loyalty Points</Text>

        {/* Points Card */}
        <LinearGradient
          colors={[tier.color + 'CC', tier.color + '44']}
          style={styles.pointsCard}
        >
          <View style={styles.pointsCardTop}>
            <Star size={28} color={tier.color} fill={tier.color} />
            <View style={styles.tierBadge}>
              <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
            </View>
          </View>
          <Text style={styles.pointsNumber}>{points.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>POINTS</Text>
          <Text style={styles.aedValue}>≈ AED {(points * POINTS_TO_AED).toFixed(0)} value</Text>

          {/* Progress to next tier */}
          {nextTier && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                {nextTier.min - points} pts to {nextTier.name}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tier.color }]} />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.ruleRow}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.ruleText}>Spend AED 1 → Earn 1 Point</Text>
          </View>
          <View style={styles.ruleRow}>
            <Gift size={20} color={Colors.primary} />
            <Text style={styles.ruleText}>100 Points → AED 5 off your order</Text>
          </View>
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>History</Text>
          {history?.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
          {!history?.length && (
            <Text style={Typography.bodySmall}>No transactions yet. Start ordering! 🍔</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const isEarned = tx.type === 'earned' || tx.type === 'bonus'
  return (
    <View style={styles.txRow}>
      <View style={styles.txLeft}>
        <Text style={styles.txDesc}>{tx.description}</Text>
        <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('en-AE')}</Text>
      </View>
      <Text style={[styles.txPoints, { color: isEarned ? Colors.success : Colors.error }]}>
        {isEarned ? '+' : '-'}{Math.abs(tx.points)} pts
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white },
  pointsCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: 4 },
  pointsCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierBadge: {
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tierText: { fontSize: 13, fontWeight: '700' },
  pointsNumber: { fontSize: 56, fontWeight: '900', color: Colors.white, marginTop: 8 },
  pointsLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 3 },
  aedValue: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 4 },
  progressSection: { marginTop: 16, gap: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
  howItWorks: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleText: { ...Typography.body },
  historySection: { gap: Spacing.sm },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  txLeft: { gap: 2 },
  txDesc: { fontSize: 14, fontWeight: '600', color: Colors.text },
  txDate: { ...Typography.caption },
  txPoints: { fontSize: 15, fontWeight: '700' },
})
