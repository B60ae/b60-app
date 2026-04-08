import React, { useState, useCallback } from 'react'
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
import { ordersApi, locationsApi } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { DirhamSymbol } from '../../components/ui/DirhamSymbol'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
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
        <Image
          source={{ uri: item.menu_item.image_url }}
          style={styles.itemThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.itemThumb, styles.thumbPlaceholder]} />
      )}

      <View style={styles.cartItemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.menu_item.name}</Text>
        {item.selected_options.length > 0 && (
          <Text style={styles.itemOptions} numberOfLines={1}>
            {item.selected_options.map((o: any) => o.name).join(', ')}
          </Text>
        )}
        <View style={styles.itemPriceRow}>
          <DirhamSymbol size={12} color={Colors.primary} />
          <Text style={styles.itemPrice}>{item.line_total.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.qtyControls}>
        <Pressable onPress={() => handleQtyPress(item.quantity - 1)} style={styles.qtyBtn}>
          <Minus size={12} color={Colors.text} />
        </Pressable>
        <Animated.Text style={[styles.qty, animatedStyle]}>{item.quantity}</Animated.Text>
        <Pressable onPress={() => handleQtyPress(item.quantity + 1)} style={styles.qtyBtn}>
          <Plus size={12} color={Colors.text} />
        </Pressable>
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.trashBtn}>
          <Trash2 size={15} color={Colors.error} />
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

  // Max points = min(user balance, points equivalent of full subtotal discount)
  // POINTS_TO_AED = 0.05 → 1 pt = AED 0.05 → to cover subtotal: subtotal / 0.05 pts
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

  // ─── Empty State ───────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer]}>
        <ShoppingBag size={64} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Cart is empty rn</Text>
        <Text style={styles.emptySub}>Go smash something from the menu 🍔</Text>
        <Pressable
          style={styles.emptyBtn}
          onPress={() => router.push('/(tabs)/menu')}
        >
          <Text style={styles.emptyBtnText}>LET'S EAT</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  // ─── Full Cart ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Your Cart</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Cart Items Card */}
        <View style={styles.card}>
          {items.map((item, idx) => (
            <View key={`${item.menu_item.id}-${idx}`}>
              {idx > 0 && <View style={styles.divider} />}
              <CartItem
                item={item}
                idx={idx}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            </View>
          ))}
        </View>

        {/* Pickup Location */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pickup From</Text>
          </View>
          <View style={styles.locationList}>
            {((locations ?? []).filter((loc: any) => !loc.name.toLowerCase().includes('ghurair'))).map((loc: any) => {
              const selected = locationId === loc.id
              return (
                <Pressable
                  key={loc.id}
                  style={[styles.locationOption, selected && styles.locationSelected]}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setLocation(loc.id)
                  }}
                >
                  <View style={styles.locationLeft}>
                    {/* Green / grey open indicator */}
                    <View style={[styles.openDot, { backgroundColor: loc.is_open ? Colors.success : Colors.textMuted }]} />
                    <View>
                      <Text style={[styles.locationName, selected && { color: Colors.primary }]}>
                        {loc.name}
                      </Text>
                      <Text style={styles.locationCity}>{loc.city}</Text>
                    </View>
                  </View>
                  {/* Radio circle */}
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Points Redemption — only if ≥100 pts */}
        {user && (user.loyalty_points ?? 0) >= MIN_REDEEM_POINTS && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Redeem Points</Text>
            <Text style={styles.sectionSub}>
              You have <Text style={{ color: Colors.primary, fontWeight: '700' }}>{user.loyalty_points} pts</Text>
              {' '}· Max {(maxRedeemable * POINTS_TO_AED).toFixed(0)} AED off
            </Text>
            <View style={styles.pointsRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPointsToRedeem(Math.max(0, pointsToRedeem - 100))
                }}
              >
                <Minus size={13} color={Colors.text} />
              </Pressable>
              <View style={styles.pointsValueBox}>
                <Text style={styles.pointsValue}>{pointsToRedeem}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPointsToRedeem(Math.min(maxRedeemable, pointsToRedeem + 100))
                }}
              >
                <Plus size={13} color={Colors.text} />
              </Pressable>
              {pointsToRedeem > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountPreview}>
                    = {(pointsToRedeem * POINTS_TO_AED).toFixed(0)} AED off
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <View style={styles.priceRow}>
                <DirhamSymbol size={12} color={Colors.text} />
                <Text style={styles.summaryValue}>{subtotal().toFixed(0)}</Text>
              </View>
            </View>
            {discount() > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: Colors.success }]}>Points Discount</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.summaryValue, { color: Colors.success }]}>-</Text>
                  <DirhamSymbol size={12} color={Colors.success} />
                  <Text style={[styles.summaryValue, { color: Colors.success }]}>{discount().toFixed(0)}</Text>
                </View>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={styles.priceRow}>
                <DirhamSymbol size={18} color={Colors.primary} />
                <Text style={styles.totalValue}>{total().toFixed(0)}</Text>
              </View>
            </View>
            <View style={styles.earnRow}>
              <Text style={styles.earnNote}>+{pointsEarned()} pts dropping after pickup 🔥</Text>
            </View>
          </View>
        </View>

        {/* spacer for sticky checkout */}
        <View style={{ height: 112 }} />
      </ScrollView>

      {/* Error Toast */}
      <Toast message={toastMsg} visible={toastVisible} onHide={() => setToastVisible(false)} duration={3000} />

      {/* Sticky Checkout */}
      <View style={styles.stickyWrapper} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.96)', '#FFFFFF']}
          style={styles.fadeGradient}
          pointerEvents="none"
        />
        <View style={styles.stickyCheckout}>
          <Text style={styles.pickupNote}>⚡ Average pickup: under 10 mins</Text>
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
                <DirhamSymbol size={15} color={Colors.white} />
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
  container: { flex: 1, backgroundColor: Colors.background },

  // Empty
  emptyContainer: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: Colors.text },
  emptySub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    ...Shadows.glow,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },

  // Scroll
  scrollContent: { padding: Spacing.md, gap: Spacing.md },

  // Title row
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: 30, fontWeight: '900', color: Colors.text },
  countPill: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  countPillText: { fontSize: 12, fontWeight: '800', color: Colors.white },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },

  // Cart item
  cartItemWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  itemThumb: { width: 60, height: 60, borderRadius: Radius.md, backgroundColor: Colors.surface },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cartItemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  itemOptions: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 3 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  qty: { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 18, textAlign: 'center' },
  trashBtn: {
    width: 30, height: 30, borderRadius: Radius.full,
    backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 2 },

  // Price with symbol
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionSub: { fontSize: 13, color: Colors.textSecondary },

  // Location
  locationList: { gap: Spacing.sm },
  locationOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.sm + 2, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  locationSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  locationName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  locationCity: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  // Points
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  pointsValueBox: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  pointsValue: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  pointsLabel: { fontSize: 12, color: Colors.textMuted },
  discountBadge: {
    backgroundColor: Colors.successTint, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  discountPreview: { fontSize: 13, fontWeight: '700', color: Colors.success },

  // Summary
  summaryRows: { gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  totalLabel: { fontSize: 17, fontWeight: '800', color: Colors.text },
  totalValue: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  earnRow: { alignItems: 'flex-end', marginTop: 2 },
  earnNote: { fontSize: 12, color: Colors.success, fontWeight: '600' },

  // Sticky checkout
  stickyWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  fadeGradient: { height: 32, width: '100%' },
  stickyCheckout: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
    ...Shadows.glowStrong,
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { fontSize: 17, fontWeight: '900', color: Colors.white, letterSpacing: 0.3 },
  pickupNote: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
})
