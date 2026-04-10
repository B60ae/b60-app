import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, UtensilsCrossed } from 'lucide-react-native'
import { ordersApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { LightTheme, DarkTheme, Spacing, Radius } from '../../utils/theme'

export default function OrderHistoryScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
    retry: 1,
    enabled: isAuthenticated,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const orderCount = orders?.length ?? 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: T.background, borderBottomColor: T.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: T.surface, borderColor: T.border }]}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={T.text} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: T.text }]}>MY ORDERS</Text>
          {orderCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{orderCount}</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonLoader key={i} variant="row" />)}
        </View>
      ) : isError ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: T.surface, borderColor: T.border }]}>
            <UtensilsCrossed size={40} color={T.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.text }]}>Could not load orders</Text>
          <Text style={[styles.emptySub, { color: T.textSecondary }]}>
            Check your connection and try again.
          </Text>
          <Pressable style={styles.browseBtn} onPress={() => refetch()}>
            <Text style={styles.browseBtnText}>RETRY</Text>
          </Pressable>
        </View>
      ) : !orders || orders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: T.surface, borderColor: T.border }]}>
            <UtensilsCrossed size={40} color={T.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.text }]}>No orders yet</Text>
          <Text style={[styles.emptySub, { color: T.textSecondary }]}>
            You haven't placed any orders.{'\n'}Time to smash something!
          </Text>
          <Pressable style={styles.browseBtn} onPress={() => router.push('/(tabs)/menu')}>
            <Text style={styles.browseBtnText}>BROWSE MENU</Text>
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
              tintColor="#F05A1A"
              colors={['#F05A1A']}
            />
          }
          renderItem={({ item: order }) => {
            const firstItem = order.items?.[0]
            const imageUrl = firstItem?.menu_item?.image_url
            const firstName = firstItem?.menu_item?.name ?? 'Unknown item'
            const extraCount = order.items.length - 1
            const formattedDate = new Date(order.created_at).toLocaleDateString('en-AE', {
              day: 'numeric', month: 'short', year: 'numeric',
            })

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.orderCard,
                  { backgroundColor: T.surfaceElevated, borderColor: T.border },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
              >
                {/* Orange left accent */}
                <View style={styles.cardAccent} />

                {/* Thumbnail */}
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: T.border }]}>
                    <UtensilsCrossed size={20} color={T.textMuted} />
                  </View>
                )}

                {/* Order info */}
                <View style={styles.info}>
                  <View style={styles.infoTop}>
                    <Text style={[styles.orderId, { color: T.text }]}>
                      #{order.id.slice(-6).toUpperCase()}
                    </Text>
                    <OrderStatusBadge status={order.status} />
                  </View>
                  <Text style={[styles.itemName, { color: T.textSecondary }]} numberOfLines={1}>
                    {firstName}{extraCount > 0 ? ` +${extraCount} more` : ''}
                  </Text>
                  <View style={styles.infoBottom}>
                    <Text style={[styles.date, { color: T.textMuted }]}>{formattedDate}</Text>
                    <Text style={styles.total}>AED {Number(order.total).toFixed(0)}</Text>
                  </View>
                </View>

                <ChevronRight size={16} color={T.textMuted} />
              </Pressable>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: '#F05A1A',
    borderRadius: Radius.full,
    minWidth: 24, height: 24,
    paddingHorizontal: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  skeletonList: { padding: Spacing.md, gap: Spacing.sm },

  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
  },

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: '#F05A1A',
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },

  thumb: { width: 60, height: 60, borderRadius: Radius.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  info: { flex: 1, gap: 4 },
  infoTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: Spacing.sm,
  },
  orderId: { fontSize: 15, fontWeight: '800' },
  itemName: { fontSize: 13, fontWeight: '500' },
  infoBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 2,
  },
  date: { fontSize: 11, fontWeight: '500' },
  total: { fontSize: 15, fontWeight: '800', color: '#F05A1A' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, paddingHorizontal: Spacing.xl,
  },
  emptyIconWrapper: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 24, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: -4 },
  browseBtn: {
    marginTop: Spacing.sm,
    backgroundColor: '#F05A1A',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  browseBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
})
