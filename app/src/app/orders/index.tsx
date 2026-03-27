import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, ShoppingBag } from 'lucide-react-native'
import { ordersApi } from '../../services/api'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

export default function OrderHistoryScreen() {
  const [refreshing, setRefreshing] = useState(false)

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const orderCount = orders?.length ?? 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={Colors.text} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>My Orders</Text>
          {orderCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{orderCount}</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="row" />
          ))}
        </View>
      ) : !orders || orders.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <Text style={styles.emptyEmoji}>🍔</Text>
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>
            You haven't placed any orders.{'\n'}Time to smash something!
          </Text>
          <Pressable
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <ShoppingBag size={16} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item: order }) => {
            const firstItem = order.items?.[0]
            const imageUrl = firstItem?.menu_item?.image_url
            const firstName = firstItem?.menu_item?.name ?? 'Unknown item'
            const extraCount = order.items.length - 1
            const formattedDate = new Date(order.created_at).toLocaleDateString('en-AE', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.orderCard,
                  Shadows.card,
                  pressed && styles.orderCardPressed,
                ]}
                onPress={() =>
                  router.push({ pathname: '/order/[id]', params: { id: order.id } })
                }
              >
                {/* Thumbnail */}
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbEmoji}>🍔</Text>
                  </View>
                )}

                {/* Order info */}
                <View style={styles.info}>
                  {/* Top row: order # + status badge */}
                  <View style={styles.infoTop}>
                    <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                    <OrderStatusBadge status={order.status} />
                  </View>

                  {/* Item name */}
                  <Text style={styles.itemName} numberOfLines={1}>
                    {firstName}
                    {extraCount > 0 ? ` +${extraCount} more` : ''}
                  </Text>

                  {/* Bottom row: date + total */}
                  <View style={styles.infoBottom}>
                    <Text style={styles.date}>{formattedDate}</Text>
                    <Text style={styles.total}>AED {order.total.toFixed(0)}</Text>
                  </View>
                </View>

                <ChevronRight size={16} color={Colors.textMuted} />
              </Pressable>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },

  // Loading skeletons
  skeletonList: { padding: Spacing.md, gap: Spacing.sm },

  // List
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
  },

  // Order card
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
  orderCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  // Thumbnail — 60×60
  thumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 24 },

  // Info block
  info: { flex: 1, gap: 4 },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  orderId: { fontSize: 15, fontWeight: '800', color: Colors.text },
  itemName: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  date: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  total: { fontSize: 15, fontWeight: '800', color: Colors.primary },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -4,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadows.glowStrong,
  },
  browseBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white },
})
