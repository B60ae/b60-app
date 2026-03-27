import React from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { ordersApi } from '../../services/api'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

export default function OrderHistoryScreen() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
  })

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Order History</Text>
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => <SkeletonLoader key={i} variant="row" />)}
        </View>
      ) : !orders || orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍔</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Time to smash something!</Text>
          <Pressable style={styles.browseBtn} onPress={() => router.push('/(tabs)/menu')}>
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: order }) => (
            <Pressable
              style={[styles.orderCard, Shadows.card]}
              onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
            >
              {/* Food thumbnail */}
              {order.items?.[0]?.menu_item?.image_url ? (
                <Image
                  source={{ uri: order.items[0].menu_item.image_url }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={{ fontSize: 22 }}>🍔</Text>
                </View>
              )}

              {/* Order info */}
              <View style={styles.info}>
                <View style={styles.infoTop}>
                  <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  <OrderStatusBadge status={order.status} />
                </View>
                <Text style={styles.itemNames} numberOfLines={1}>
                  {order.items.map((i: any) => i.menu_item?.name).join(', ')}
                </Text>
                <View style={styles.infoBottom}>
                  <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <Text style={styles.total}>AED {order.total.toFixed(0)}</Text>
                </View>
              </View>

              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text },
  skeletonList: { padding: Spacing.md, gap: Spacing.sm },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  infoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId: { fontSize: 14, fontWeight: '800', color: Colors.text },
  itemNames: { fontSize: 12, color: Colors.textSecondary },
  infoBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 11, color: Colors.textMuted },
  total: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
  browseBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  browseBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white },
})
