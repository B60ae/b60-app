import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, ChefHat, Package, ArrowLeft, RefreshCw } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { ordersApi } from '../../services/api'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { OrderStatus } from '../../types'

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string; icon: any }[] = [
  { key: 'confirmed', label: 'Order Confirmed', sub: 'We got your order!', icon: CheckCircle },
  { key: 'preparing', label: 'Being Prepared', sub: 'Chef is smashing your burger', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup!', sub: 'Head to the counter', icon: Package },
]

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const wasReady = useRef(false)

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'ready' || status === 'completed' || status === 'cancelled' ? false : 8000
    },
  })

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order?.status)
  const confettiAnim = useRef(new Animated.Value(0)).current
  const lastUpdated = useRef(new Date())

  useEffect(() => {
    if (order?.status === 'ready' && !wasReady.current) {
      wasReady.current = true
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Animated.spring(confettiAnim, { toValue: 1, useNativeDriver: true, tension: 40 }).start()
    }
    lastUpdated.current = new Date()
  }, [order?.status])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Tracking Order</Text>
            <Text style={styles.orderId}>#{id?.slice(-6).toUpperCase()}</Text>
          </View>
          {order && <OrderStatusBadge status={order.status} />}
        </View>

        {/* Ready Banner */}
        {order?.status === 'ready' && (
          <Animated.View style={[styles.readyBanner, { transform: [{ scale: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
            <LinearGradient colors={[Colors.success, '#16A34A']} style={styles.readyGradient}>
              <Text style={styles.readyEmoji}>🎉</Text>
              <Text style={styles.readyTitle}>Your order is ready!</Text>
              <Text style={styles.readySub}>Head to the counter and pick it up</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Vertical Timeline */}
        <View style={[styles.timelineCard, Shadows.card]}>
          {STATUS_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isDone = currentStepIdx > idx
            const isActive = currentStepIdx === idx
            const isUpcoming = currentStepIdx < idx

            return (
              <View key={step.key} style={styles.timelineItem}>
                {/* Connector line above (except first) */}
                {idx > 0 && (
                  <View style={[styles.connectorLine, isDone && styles.connectorLineDone]} />
                )}

                <View style={styles.timelineRow}>
                  {/* Step icon with pulse for active */}
                  <View style={styles.iconWrapper}>
                    {isActive && (
                      <View style={styles.pulseRing} />
                    )}
                    <View style={[
                      styles.stepIcon,
                      isDone && styles.stepIconDone,
                      isActive && styles.stepIconActive,
                      isUpcoming && styles.stepIconUpcoming,
                    ]}>
                      <Icon
                        size={20}
                        color={isDone || isActive ? Colors.white : Colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.stepContent}>
                    <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]}>
                      {step.label}
                    </Text>
                    {isActive && <Text style={styles.stepSub}>{step.sub}</Text>}
                    {isDone && <Text style={styles.stepDone}>✓ Completed</Text>}
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* ETA Card */}
        {order?.estimated_ready_at && order.status !== 'ready' && order.status !== 'completed' && (
          <View style={[styles.etaCard, Shadows.card]}>
            <Clock size={22} color={Colors.primary} />
            <View style={styles.etaContent}>
              <Text style={styles.etaLabel}>Estimated Ready At</Text>
              <Text style={styles.etaTime}>
                {new Date(order.estimated_ready_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.etaRight}>
              <RefreshCw size={12} color={Colors.textMuted} />
              <Text style={styles.lastUpdated}>Live</Text>
            </View>
          </View>
        )}

        {/* Order Summary */}
        {order && (
          <View style={[styles.summaryCard, Shadows.card]}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.summaryItem}>
                <Text style={styles.summaryItemName}>{item.quantity}× {item.menu_item.name}</Text>
                <Text style={styles.summaryItemPrice}>AED {item.line_total.toFixed(0)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>AED {order.total.toFixed(0)}</Text>
            </View>
            {order.points_earned > 0 && (
              <View style={styles.pointsEarnedRow}>
                <Text style={styles.pointsEarned}>🏅 +{order.points_earned} points earned</Text>
              </View>
            )}
          </View>
        )}

        <Button
          title="Order Again"
          onPress={() => router.push('/(tabs)/menu')}
          variant="outline"
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  orderId: { fontSize: 12, color: Colors.textMuted },
  readyBanner: { borderRadius: Radius.xl, overflow: 'hidden' },
  readyGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  readyEmoji: { fontSize: 48 },
  readyTitle: { fontSize: 22, fontWeight: '900', color: Colors.white },
  readySub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  timelineCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineItem: { position: 'relative' },
  connectorLine: {
    position: 'absolute',
    left: 19,
    top: -24,
    width: 2,
    height: 28,
    backgroundColor: Colors.border,
    zIndex: 0,
  },
  connectorLineDone: { backgroundColor: Colors.primary },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconWrapper: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.3,
    top: -5,
    left: -5,
  },
  stepIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  stepIconDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepIconActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepIconUpcoming: { opacity: 0.5 },
  stepContent: { flex: 1, paddingTop: 8 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  stepLabelActive: { color: Colors.text, fontWeight: '700' },
  stepSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  stepDone: { fontSize: 11, color: Colors.success, fontWeight: '600', marginTop: 2 },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryTint,
  },
  etaContent: { flex: 1 },
  etaLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  etaTime: { fontSize: 22, fontWeight: '900', color: Colors.text },
  etaRight: { alignItems: 'center', gap: 2 },
  lastUpdated: { fontSize: 10, color: Colors.success, fontWeight: '600' },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItemName: { fontSize: 14, color: Colors.textSecondary },
  summaryItemPrice: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  pointsEarnedRow: { alignItems: 'flex-end' },
  pointsEarned: { fontSize: 12, color: Colors.success, fontWeight: '600' },
})
