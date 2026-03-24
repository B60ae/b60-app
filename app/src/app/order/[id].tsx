import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, ChefHat, Package } from 'lucide-react-native'
import { ordersApi } from '../../services/api'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import type { OrderStatus } from '../../types'

const STATUS_STEPS: { key: OrderStatus; label: string; icon: any }[] = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Being Prepared', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup!', icon: Package },
]

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: order, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'ready' || status === 'completed' || status === 'cancelled' ? false : 8000
    },
  })

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order?.status)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>← Back to Home</Text>
          </Pressable>
          <Text style={styles.title}>Order Tracking</Text>
          <Text style={styles.orderId}>#{id?.slice(-6).toUpperCase()}</Text>
        </View>

        {/* Status */}
        {order && <OrderStatusBadge status={order.status} />}

        {/* Progress Steps */}
        <View style={styles.steps}>
          {STATUS_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isDone = currentStepIdx > idx
            const isActive = currentStepIdx === idx
            const color = isDone || isActive ? Colors.primary : Colors.textMuted
            return (
              <View key={step.key} style={styles.step}>
                <View style={[styles.stepIcon, (isDone || isActive) && styles.stepIconActive]}>
                  <Icon size={22} color={color} />
                </View>
                <Text style={[styles.stepLabel, (isDone || isActive) && { color: Colors.text }]}>
                  {step.label}
                </Text>
                {idx < STATUS_STEPS.length - 1 && (
                  <View style={[styles.connector, isDone && styles.connectorActive]} />
                )}
              </View>
            )
          })}
        </View>

        {/* ETA */}
        {order?.estimated_ready_at && order.status !== 'ready' && (
          <View style={styles.etaCard}>
            <Clock size={20} color={Colors.primary} />
            <View>
              <Text style={styles.etaLabel}>Estimated Ready</Text>
              <Text style={styles.etaTime}>
                {new Date(order.estimated_ready_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}

        {/* Ready Banner */}
        {order?.status === 'ready' && (
          <View style={styles.readyBanner}>
            <Text style={styles.readyEmoji}>🎉</Text>
            <Text style={styles.readyTitle}>Your order is ready!</Text>
            <Text style={styles.readySub}>Head to the counter and pick it up now</Text>
          </View>
        )}

        {/* Order Summary */}
        {order && (
          <View style={styles.summary}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.summaryItem}>
                <Text style={styles.summaryItemName}>{item.quantity}× {item.menu_item.name}</Text>
                <Text style={styles.summaryItemPrice}>AED {item.line_total.toFixed(0)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={{ ...Typography.body, fontWeight: '800' }}>Total</Text>
              <Text style={styles.totalPrice}>AED {order.total.toFixed(0)}</Text>
            </View>
            {order.points_earned > 0 && (
              <Text style={styles.pointsEarned}>+{order.points_earned} points earned 🌟</Text>
            )}
          </View>
        )}

        <Button title="Order Again" onPress={() => router.push('/(tabs)/menu')} variant="outline" fullWidth />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { gap: 4 },
  backBtn: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white },
  orderId: { ...Typography.bodySmall },
  steps: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: 0, borderWidth: 1, borderColor: Colors.border },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  stepIcon: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  stepIconActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  stepLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMuted, flex: 1 },
  connector: { position: 'absolute', left: 21, top: 44, width: 2, height: 28, backgroundColor: Colors.border },
  connectorActive: { backgroundColor: Colors.primary },
  etaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  etaLabel: { ...Typography.caption },
  etaTime: { fontSize: 20, fontWeight: '800', color: Colors.white },
  readyBanner: {
    backgroundColor: Colors.success + '22', borderRadius: Radius.xl, padding: Spacing.lg,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.success + '44',
  },
  readyEmoji: { fontSize: 48 },
  readyTitle: { fontSize: 22, fontWeight: '900', color: Colors.white },
  readySub: { ...Typography.body, textAlign: 'center' },
  summary: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItemName: { ...Typography.body },
  summaryItemPrice: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border },
  totalPrice: { ...Typography.price },
  pointsEarned: { color: Colors.success, fontSize: 13, fontWeight: '600', textAlign: 'right' },
})
