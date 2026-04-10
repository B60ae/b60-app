import React, { useState, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Trash2, MapPin, Minus, Plus, ShoppingBag } from 'lucide-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, FadeInRight, FadeOutLeft, Layout,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { ordersApi, locationsApi } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { DirhamSymbol } from '../../components/ui/DirhamSymbol'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import { useQuery } from '@tanstack/react-query'

// ─── Animated Cart Item ──────────────────────────────────────────────────────

function CartItem({
  item, idx, onUpdate, onRemove,
}: {
  item: any
  idx: number
  onUpdate: (idx: number, qty: number) => void
  onRemove: (idx: number) => void
}) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  const scale = useSharedValue(1)
  const removeScale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handleQtyPress = (newQty: number) => {
    scale.value = withSpring(0.92, { damping: 12 }, () => {
      scale.value = withSpring(1, { damping: 10 })
    })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onUpdate(idx, newQty)
  }

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    removeScale.value = withTiming(0, { duration: 220 }, () => {
      runOnJS(onRemove)(idx)
    })
  }

  const removeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: removeScale.value }],
    opacity: removeScale.value,
  }))

  return (
    <Animated.View
      entering={FadeInRight.duration(280)}
      exiting={FadeOutLeft.duration(220)}
      layout={Layout.springify()}
      style={[styles.cartItemWrapper, removeAnimStyle]}
    >
      {item.menu_item.image_url ? (
        <Image source={{ uri: item.menu_item.image_url }} style={styles.itemThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.itemThumb, { backgroundColor: T.border }]} />
      )}

      <View style={styles.cartItemInfo}>
        <Text style={[styles.itemName, { color: T.text }]} numberOfLines={1}>
          {item.menu_item.name}
        </Text>
        {(item.selected_options?.length ?? 0) > 0 && (
          <Text style={[styles.itemOptions, { color: T.textMuted }]} numberOfLines={1}>
            {item.selected_options?.map((o: any) => o.name).join(', ')}
          </Text>
        )}
        <View style={styles.itemPriceRow}>
          <DirhamSymbol size={12} color="#F05A1A" />
          <Text style={[styles.itemPrice, { color: '#F05A1A' }]}>{item.line_total.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.qtyControls}>
        <Pressable
          onPress={() => item.quantity > 1 && handleQtyPress(item.quantity - 1)}
          style={[styles.qtyBtn, { backgroundColor: T.surface, borderColor: T.border, opacity: item.quantity <= 1 ? 0.35 : 1 }]}
        >
          <Minus size={12} color={T.text} />
        </Pressable>
        <Animated.Text style={[styles.qty, { color: T.text }, animatedStyle]}>{item.quantity}</Animated.Text>
        <Pressable
          onPress={() => handleQtyPress(item.quantity + 1)}
          style={[styles.qtyBtn, { backgroundColor: T.surface, borderColor: T.border }]}
        >
          <Plus size={12} color={T.text} />
        </Pressable>
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.trashBtn}>
          <Trash2 size={15} color="#EF4444" />
        </Pressable>
      </View>
    </Animated.View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const {
    items, locationId, pointsToRedeem,
    updateQuantity, removeItem, setLocation, setPointsToRedeem,
    clearCart, subtotal, discount, total, pointsEarned,
  } = useCartStore()
  const { user } = useAuthStore()
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  const [placing, setPlacing] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setToastVisible(true)
  }

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  })

  const availableLocations = useMemo(
    () => (locations ?? []).filter((loc: any) => !loc.name.toLowerCase().includes('ghurair')),
    [locations]
  )

  const maxRedeemable = Math.min(
    user?.loyalty_points ?? 0,
    Math.floor(subtotal() / POINTS_TO_AED),
  )

  const handlePlaceOrder = async () => {
    if (!locationId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      showToast('Select a pickup location first')
      return
    }
    setPlacing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const earned = pointsEarned()
      const order = await ordersApi.create({
        items: items as any,
        location_id: locationId,
        subtotal: subtotal(),
        points_redeemed: pointsToRedeem,
        discount: discount(),
        total: total(),
      })
      clearCart()
      router.push({
        pathname: '/order-success',
        params: { orderId: order.id, pointsEarned: order.points_earned ?? earned },
      })
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      showToast('Order failed. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ─── Empty State ─────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer, { backgroundColor: T.background }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: T.surface, borderColor: T.border }]}>
          <ShoppingBag size={52} color={T.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: T.text }]}>Cart is Empty</Text>
        <Text style={[styles.emptySub, { color: T.textSecondary }]}>Go smash something from the menu</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/menu')}>
          <Text style={styles.emptyBtnText}>LET'S EAT</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  // ─── Full Cart ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: T.text }]}>Your Cart</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Cart Items */}
        <View style={[styles.card, { backgroundColor: T.surfaceElevated, borderColor: T.border }]}>
          {items.map((item, idx) => (
            <View key={`${item.menu_item.id}-${idx}`}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: T.border }]} />}
              <CartItem item={item} idx={idx} onUpdate={updateQuantity} onRemove={removeItem} />
            </View>
          ))}
        </View>

        {/* Pickup Location */}
        <View style={[styles.card, { backgroundColor: T.surfaceElevated, borderColor: T.border }]}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color="#F05A1A" />
            <Text style={[styles.sectionTitle, { color: T.text }]}>Pickup From</Text>
          </View>
          <View style={styles.locationList}>
            {availableLocations.map((loc: any) => {
              const selected = locationId === loc.id
              return (
                <Pressable
                  key={loc.id}
                  style={[
                    styles.locationOption,
                    { borderColor: T.border },
                    selected && { borderColor: '#F05A1A', backgroundColor: 'rgba(240,90,26,0.07)' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setLocation(loc.id)
                  }}
                >
                  <View style={styles.locationLeft}>
                    <View style={[styles.openDot, { backgroundColor: loc.is_open ? '#22C55E' : T.textMuted }]} />
                    <View>
                      <Text style={[styles.locationName, { color: selected ? '#F05A1A' : T.text }]}>
                        {loc.name}
                      </Text>
                      <Text style={[styles.locationCity, { color: T.textMuted }]}>{loc.city}</Text>
                    </View>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: selected ? '#F05A1A' : T.border }]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Points Redemption */}
        {user && (user.loyalty_points ?? 0) >= MIN_REDEEM_POINTS && (
          <View style={[styles.card, { backgroundColor: T.surfaceElevated, borderColor: T.border }]}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Redeem Points</Text>
            <Text style={[styles.sectionSub, { color: T.textSecondary }]}>
              You have <Text style={{ color: '#F05A1A', fontWeight: '700' }}>{user.loyalty_points} pts</Text>
              {' '}· Max {(maxRedeemable * POINTS_TO_AED).toFixed(0)} AED off
            </Text>
            <View style={styles.pointsRow}>
              <Pressable
                style={[styles.qtyBtn, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPointsToRedeem(Math.max(0, pointsToRedeem - 100))
                }}
              >
                <Minus size={13} color={T.text} />
              </Pressable>
              <View style={styles.pointsValueBox}>
                <Text style={[styles.pointsValue, { color: '#F05A1A' }]}>{pointsToRedeem}</Text>
                <Text style={[styles.pointsLabel, { color: T.textMuted }]}>pts</Text>
              </View>
              <Pressable
                style={[styles.qtyBtn, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPointsToRedeem(Math.min(maxRedeemable, pointsToRedeem + 100))
                }}
              >
                <Plus size={13} color={T.text} />
              </Pressable>
              {pointsToRedeem > 0 && (
                <View style={[styles.discountBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                  <Text style={styles.discountPreview}>
                    = {(pointsToRedeem * POINTS_TO_AED).toFixed(0)} AED off
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.card, { backgroundColor: T.surfaceElevated, borderColor: T.border }]}>
          <Text style={[styles.sectionTitle, { color: T.text }]}>Order Summary</Text>
          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: T.textSecondary }]}>Subtotal</Text>
              <View style={styles.priceRow}>
                <DirhamSymbol size={12} color={T.text} />
                <Text style={[styles.summaryValue, { color: T.text }]}>{subtotal().toFixed(0)}</Text>
              </View>
            </View>
            {discount() > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#22C55E' }]}>Points Discount</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.summaryValue, { color: '#22C55E' }]}>-</Text>
                  <DirhamSymbol size={12} color="#22C55E" />
                  <Text style={[styles.summaryValue, { color: '#22C55E' }]}>{discount().toFixed(0)}</Text>
                </View>
              </View>
            )}
            <View style={[styles.divider, { backgroundColor: T.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: T.text }]}>Total</Text>
              <View style={styles.priceRow}>
                <DirhamSymbol size={18} color="#F05A1A" />
                <Text style={styles.totalValue}>{total().toFixed(0)}</Text>
              </View>
            </View>
            <View style={styles.earnRow}>
              <Text style={styles.earnNote}>+{pointsEarned()} pts dropping after pickup</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 112 }} />
      </ScrollView>

      <Toast message={toastMsg} visible={toastVisible} onHide={() => setToastVisible(false)} duration={3000} />

      {/* Sticky Checkout */}
      <View style={styles.stickyWrapper} pointerEvents="box-none">
        <LinearGradient
          colors={[`${T.background}00`, `${T.background}F5`, T.background]}
          style={styles.fadeGradient}
          pointerEvents="none"
        />
        <View style={[styles.stickyCheckout, { backgroundColor: T.background }]}>
          <Text style={styles.pickupNote}>Average pickup: under 10 mins</Text>
          <Pressable
            style={[styles.checkoutBtn, placing && styles.checkoutBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? (
              <Text style={styles.checkoutBtnText}>SMASHING YOUR ORDER…</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.checkoutBtnText}>SMASH IT ·</Text>
                <DirhamSymbol size={15} color="#fff" />
                <Text style={styles.checkoutBtnText}>{total().toFixed(0)}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Empty
  emptyContainer: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 24, fontWeight: '900' },
  emptySub: { fontSize: 15, textAlign: 'center' },
  emptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: '#F05A1A',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Scroll
  scrollContent: { padding: Spacing.md, gap: Spacing.md },

  // Title
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: 30, fontWeight: '900' },
  countPill: {
    backgroundColor: '#F05A1A', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  countPillText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // Card
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Cart item
  cartItemWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  itemThumb: { width: 60, height: 60, borderRadius: Radius.md },
  cartItemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemOptions: { fontSize: 11, marginTop: 2 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  itemPrice: { fontSize: 14, fontWeight: '700' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  qty: { fontSize: 15, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  trashBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 1, marginVertical: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSub: { fontSize: 13 },

  // Location
  locationList: { gap: Spacing.sm },
  locationOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.sm + 2, borderRadius: Radius.md, borderWidth: 1.5,
  },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  locationName: { fontSize: 14, fontWeight: '700' },
  locationCity: { fontSize: 11, marginTop: 1 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F05A1A' },

  // Points
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  pointsValueBox: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  pointsValue: { fontSize: 22, fontWeight: '900' },
  pointsLabel: { fontSize: 12 },
  discountBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  discountPreview: { fontSize: 13, fontWeight: '700', color: '#22C55E' },

  // Summary
  summaryRows: { gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  totalLabel: { fontSize: 17, fontWeight: '800' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#F05A1A' },
  earnRow: { alignItems: 'flex-end', marginTop: 2 },
  earnNote: { fontSize: 12, color: '#22C55E', fontWeight: '600' },

  // Sticky checkout
  stickyWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  fadeGradient: { height: 32, width: '100%' },
  stickyCheckout: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  checkoutBtn: {
    backgroundColor: '#F05A1A',
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  pickupNote: {
    textAlign: 'center', fontSize: 12, fontWeight: '700',
    color: '#22C55E', marginBottom: 6, letterSpacing: 0.3,
  },
})
