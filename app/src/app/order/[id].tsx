import React, { useEffect, useRef, useState } from 'react'
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
import { useCartStore } from '../../stores/cartStore'
import { useThemeStore } from '../../stores/themeStore'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import type { OrderStatus } from '../../types'

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string; icon: any }[] = [
  { key: 'confirmed', label: 'Order Confirmed', sub: 'We got your order!', icon: CheckCircle },
  { key: 'preparing', label: 'Being Prepared', sub: 'Chef is smashing your burger', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup!', sub: 'Head to the counter', icon: Package },
]

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const wasReady = useRef(false)
  const reorderItems = useCartStore((s) => s.reorderItems)
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

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
  const lastUpdatedAt = useRef(new Date())
  const [secsSinceUpdate, setSecsSinceUpdate] = useState(0)

  useEffect(() => {
    if (order?.status === 'ready' && !wasReady.current) {
      wasReady.current = true
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Animated.spring(confettiAnim, { toValue: 1, useNativeDriver: true, tension: 40 }).start()
    }
    lastUpdatedAt.current = new Date()
    setSecsSinceUpdate(0)
  }, [order?.status])

  useEffect(() => {
    const interval = setInterval(() => {
      setSecsSinceUpdate(Math.floor((Date.now() - lastUpdatedAt.current.getTime()) / 1000))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={[styles.backBtn, { backgroundColor: T.surface, borderColor: T.border }]}
          >
            <ArrowLeft size={20} color={T.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: T.text }]}>Tracking Order</Text>
            <Text style={[styles.orderId, { color: T.textMuted }]}>#{id?.slice(-6).toUpperCase()}</Text>
          </View>
          {order && <OrderStatusBadge status={order.status} />}
        </View>

        {/* Ready Banner */}
        {order?.status === 'ready' && (
          <Animated.View style={[
            styles.readyBanner,
            { transform: [{ scale: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }
          ]}>
            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.readyGradient}>
              <Text style={styles.readyTitle}>YOUR ORDER IS READY!</Text>
              <Text style={styles.readySub}>Head to the counter and collect</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Vertical Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          {STATUS_STEPS.map((step, idx) => {
            const Icon = step.icon
            const isDone = currentStepIdx > idx
            const isActive = currentStepIdx === idx
            const isUpcoming = currentStepIdx < idx

            return (
              <View key={step.key} style={styles.timelineItem}>
                {/* Connector line above (except first) */}
                {idx > 0 && (
                  <View style={[
                    styles.connectorLine,
                    { backgroundColor: isDone ? '#F05A1A' : T.border }
                  ]} />
                )}

                <View style={styles.timelineRow}>
                  <View style={styles.iconWrapper}>
                    {isActive && (
                      <View style={[styles.pulseRing, { borderColor: '#F05A1A' }]} />
                    )}
                    <View style={[
                      styles.stepIcon,
                      { backgroundColor: T.background, borderColor: T.border },
                      isDone && styles.stepIconDone,
                      isActive && styles.stepIconActive,
                      isUpcoming && { opacity: 0.4 },
                    ]}>
                      <Icon
                        size={20}
                        color={isDone ? '#fff' : isActive ? '#fff' : T.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepLabel,
                      { color: (isDone || isActive) ? T.text : T.textMuted },
                      (isDone || isActive) && { fontWeight: '700' },
                    ]}>
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text style={[styles.stepSub, { color: T.textSecondary }]}>{step.sub}</Text>
                    )}
                    {isDone && (
                      <Text style={styles.stepDone}>Completed</Text>
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* ETA Card */}
        {order?.estimated_ready_at && order.status !== 'ready' && order.status !== 'completed' && (
          <View style={[styles.etaCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.etaIconWrap}>
              <Clock size={22} color="#F05A1A" />
            </View>
            <View style={styles.etaContent}>
              <Text style={[styles.etaLabel, { color: T.textMuted }]}>Estimated Ready At</Text>
              <Text style={[styles.etaTime, { color: T.text }]}>
                {new Date(order.estimated_ready_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.etaRight}>
              <RefreshCw size={12} color={T.textMuted} />
              <Text style={[styles.lastUpdated, { color: T.textMuted }]}>
                {secsSinceUpdate < 10 ? 'Just now' : `${secsSinceUpdate}s ago`}
              </Text>
            </View>
          </View>
        )}

        {/* Order Summary */}
        {order && (
          <View style={[styles.summaryCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Order Summary</Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.summaryItem}>
                <Text style={[styles.summaryItemName, { color: T.textSecondary }]}>
                  {item.quantity}x {item.menu_item.name}
                </Text>
                <Text style={[styles.summaryItemPrice, { color: T.text }]}>
                  AED {item.line_total.toFixed(0)}
                </Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: T.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.totalLabel, { color: T.text }]}>Total</Text>
              <Text style={styles.totalValue}>AED {order.total.toFixed(0)}</Text>
            </View>
            {order.points_earned > 0 && (
              <View style={styles.pointsEarnedRow}>
                <Text style={styles.pointsEarned}>+{order.points_earned} points earned</Text>
              </View>
            )}
          </View>
        )}

        {order && (
          <Button
            title="Order Again"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              reorderItems(order.items)
              router.push('/(tabs)/cart')
            }}
            variant="outline"
            fullWidth
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  orderId: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  readyBanner: { borderRadius: Radius.xl, overflow: 'hidden' },
  readyGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  readyTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  readySub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  timelineCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: 4,
  },
  timelineItem: { position: 'relative' },
  connectorLine: {
    position: 'absolute',
    left: 19,
    top: -24,
    width: 2,
    height: 28,
    zIndex: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconWrapper: {
    width: 44,
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    opacity: 0.3,
    top: -5,
    left: -5,
  },
  stepIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepIconDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  stepIconActive: { backgroundColor: '#F05A1A', borderColor: '#F05A1A' },
  stepContent: { flex: 1, paddingTop: 8 },
  stepLabel: { fontSize: 15, fontWeight: '600' },
  stepSub: { fontSize: 12, marginTop: 2 },
  stepDone: { fontSize: 11, color: '#22C55E', fontWeight: '700', marginTop: 2 },

  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  etaIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(240,90,26,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  etaContent: { flex: 1 },
  etaLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  etaTime: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  etaRight: { alignItems: 'center', gap: 4 },
  lastUpdated: { fontSize: 10, fontWeight: '600' },

  summaryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryItemName: { fontSize: 14 },
  summaryItemPrice: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1 },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#F05A1A' },
  pointsEarnedRow: { alignItems: 'flex-end' },
  pointsEarned: { fontSize: 12, color: '#22C55E', fontWeight: '700' },
})
