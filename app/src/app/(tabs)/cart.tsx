import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Trash2, MapPin, Minus, Plus, ShoppingBag } from 'lucide-react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, FadeInRight, FadeOutLeft, Layout,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { ordersApi, locationsApi } from '../../services/api'
import { Events } from '../../services/analytics'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { DirhamSymbol } from '../../components/ui/DirhamSymbol'
import { LightTheme, DarkTheme, Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import { useQuery } from '@tanstack/react-query'

const ORANGE = Colors.primary

// ─── Animated Cart Item ──────────────────────────────────────────────────────

function CartItem({
  item, idx, onUpdate, onRemove, T,
}: {
  item: any
  idx: number
  onUpdate: (idx: number, qty: number) => void
  onRemove: (idx: number) => void
  T: typeof LightTheme
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
        <Image source={{ uri: item.menu_item.image_url }} style={styles.itemThumb} contentFit="cover" />
      ) : (
        <View style={[styles.itemThumb, { backgroundColor: T.surface2 }]} />
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
          <DirhamSymbol size={12} color={ORANGE} />
          <Text style={styles.itemPrice}>{item.line_total.toFixed(0)}</Text>
        </View>
      </View>

      <View style={styles.qtyControls}>
        <Pressable
          onPress={() => item.quantity > 1 && handleQtyPress(item.quantity - 1)}
          style={[styles.qtyBtn, { backgroundColor: T.surface2, opacity: item.quantity <= 1 ? 0.35 : 1 }]}
        >
          <Minus size={12} color={T.text} />
        </Pressable>
        <Animated.Text style={[styles.qty, { color: T.text }, animatedStyle]}>{item.quantity}</Animated.Text>
        <Pressable
          onPress={() => handleQtyPress(item.quantity + 1)}
          style={[styles.qtyBtn, { backgroundColor: T.surface2 }]}
        >
          <Plus size={12} color={T.text} />
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
  const { user, isAuthenticated } = useAuthStore()
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  const insets = useSafeAreaInsets()
  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'error') => {
    setToast({ message: msg, type })
  }

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
    enabled: isAuthenticated,
  })

  const availableLocations = locations ?? []

  const maxRedeemable = Math.floor(Math.min(
    user?.loyalty_points ?? 0,
    Math.floor(subtotal() / POINTS_TO_AED),
  ) / 100) * 100

  const handlePlaceOrder = async () => {
    if (!locationId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      showToast('Select a pickup location first', 'error')
      return
    }
    setPlacing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Events.CHECKOUT_STARTED(total(), items.length)
    if (pointsToRedeem > 0) Events.POINTS_REDEEMED(pointsToRedeem)
    try {
      const earned = pointsEarned()
      const order = await ordersApi.createOrder({
        items: items as any,
        location_id: locationId,
        subtotal: subtotal(),
        points_redeemed: pointsToRedeem,
        discount: discount(),
        total: total(),
      })
      Events.ORDER_PLACED(order.id, total(), locationId)
      clearCart()
      router.push({
        pathname: '/order-success',
        params: { orderId: order.id, pointsEarned: order.points_earned ?? earned },
      } as any)
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      showToast('Order failed. Please try again.', 'error')
    } finally {
      setPlacing(false)
    }
  }

  // ─── Empty State ─────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: T.background }]}>
        <View style={[styles.emptyIconWrap, { borderColor: T.text, backgroundColor: T.surface }]}>
          <ShoppingBag size={52} color={T.text} />
        </View>
        <Text style={[styles.emptyTitle, { color: T.text }]}>Cart is Empty</Text>
        <Text style={[styles.emptySub, { color: T.textSecondary }]}>Go smash something from the menu</Text>
        <Pressable style={[styles.emptyBtn, { borderColor: T.text }]} onPress={() => router.push('/(tabs)/menu')}>
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
          <Text style={[styles.title, { color: T.text }]}>YOUR CART</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{items.length} ITEM{items.length !== 1 ? 'S' : ''}</Text>
          </View>
        </View>

        {/* Cart Items */}
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.text }]}>
          {items.map((item, idx) => (
            <View key={`${item.menu_item.id}-${idx}`}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: T.border }]} />}
              <CartItem item={item} idx={idx} onUpdate={updateQuantity} onRemove={removeItem} T={T} />
            </View>
          ))}
        </View>

        {/* Pickup Location */}
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.text }]}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={ORANGE} />
            <Text style={[styles.sectionTitle, { color: T.text }]}>PICKUP FROM</Text>
          </View>
          <View style={styles.locationList}>
            {availableLocations.map((loc: any) => {
              const selected = locationId === loc.id
              return (
                <Pressable
                  key={loc.id}
                  style={[
                    styles.locationOption,
                    selected && styles.locationOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setLocation(loc.id)
                  }}
                >
                  {/* Orange left-border stripe for selected */}
                  {selected && <View style={styles.locationSelectedStripe} />}
                  <View style={styles.locationLeft}>
                    <View style={[styles.openDot, { backgroundColor: loc.is_open ? Colors.success : T.border }]} />
                    <View>
                      <Text style={[styles.locationName, { color: selected ? ORANGE : T.text }]}>
                        {loc.name}
                      </Text>
                      <Text style={[styles.locationCity, { color: T.textMuted }]}>{loc.city}</Text>
                    </View>
                  </View>
                  {/* Brutalist radio — square checkbox feel */}
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Points Redemption */}
        {user && (user.loyalty_points ?? 0) >= MIN_REDEEM_POINTS && (
          <View style={[styles.card, styles.pointsCard, { borderColor: Colors.black }]}>
            <Text style={[styles.sectionTitle, { color: Colors.black }]}>REDEEM POINTS</Text>
            <Text style={[styles.sectionSub, { color: Colors.black }]}>
              You have <Text style={{ color: ORANGE, fontFamily: 'Archivo_800ExtraBold' }}>{user.loyalty_points} PTS</Text>
              {' '}· Max {(maxRedeemable * POINTS_TO_AED).toFixed(0)} AED off
            </Text>
            <View style={styles.pointsRow}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPointsToRedeem(Math.max(0, pointsToRedeem - 100))
                }}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <View style={styles.pointsValueBox}>
                <Text style={styles.pointsValue}>{pointsToRedeem}</Text>
                <Text style={styles.pointsLabel}>PTS</Text>
              </View>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPointsToRedeem(Math.min(maxRedeemable, pointsToRedeem + 100))
                }}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
              {pointsToRedeem > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountPreview}>
                    = {(pointsToRedeem * POINTS_TO_AED).toFixed(0)} AED OFF
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.text }]}>
          <Text style={[styles.sectionTitle, { color: T.text }]}>ORDER SUMMARY</Text>
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
              <Text style={[styles.totalLabel, { color: T.text }]}>TOTAL</Text>
              <View style={styles.priceRow}>
                <DirhamSymbol size={18} color={ORANGE} />
                <Text style={styles.totalValue}>{total().toFixed(0)}</Text>
              </View>
            </View>
            <View style={styles.earnRow}>
              <Text style={styles.earnNote}>+{pointsEarned()} PTS DROP AFTER PICKUP</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} duration={3000} />}

      {/* Sticky Checkout */}
      <View style={[styles.stickyCheckout, { backgroundColor: T.background, borderTopColor: T.text, paddingBottom: Math.max(Spacing.lg, insets.bottom + Spacing.sm) }]}>
        <Text style={styles.pickupNote}>AVG PICKUP: UNDER 10 MINS</Text>
        <Pressable
          style={[styles.checkoutBtn, placing && { opacity: 0.6 }]}
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
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  emptyTitle: { fontFamily: 'Archivo_900Black', fontSize: 26, letterSpacing: -0.5 },
  emptySub: { fontFamily: 'Archivo_400Regular', fontSize: 15, textAlign: 'center' },
  emptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: ORANGE,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderWidth: 2.5,
  },
  emptyBtnText: { fontFamily: 'Archivo_900Black', fontSize: 16, color: '#fff', letterSpacing: 1 },

  // Scroll
  scrollContent: { padding: Spacing.md, gap: Spacing.md },

  // Title
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: 'Archivo_900Black', fontSize: 28, letterSpacing: -0.5 },
  countPill: {
    backgroundColor: ORANGE, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 2, borderColor: Colors.black,
  },
  countPillText: { fontFamily: 'Archivo_900Black', fontSize: 11, color: '#fff', letterSpacing: 0.5 },

  // Card
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 2.5,
    gap: Spacing.sm,
  },

  // Cart item
  cartItemWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  itemThumb: { width: 60, height: 60, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.black },
  cartItemInfo: { flex: 1 },
  itemName: { fontFamily: 'Archivo_800ExtraBold', fontSize: 14 },
  itemOptions: { fontFamily: 'Archivo_400Regular', fontSize: 11, marginTop: 2 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  itemPrice: { fontFamily: 'Archivo_900Black', fontSize: 14, color: ORANGE },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.black,
  },
  qty: { fontFamily: 'Archivo_900Black', fontSize: 15, minWidth: 22, textAlign: 'center' },
  trashBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: LightTheme.errorTint,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)',
  },
  divider: { height: 1.5, marginVertical: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontFamily: 'Archivo_900Black', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionSub: { fontFamily: 'Archivo_400Regular', fontSize: 13 },

  // Location
  locationList: { gap: Spacing.sm },
  locationOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.sm + 2,
    borderRadius: Radius.sm,
    borderWidth: 2, borderColor: Colors.black,
    overflow: 'hidden',
  },
  locationOptionSelected: {
    borderColor: ORANGE,
    backgroundColor: 'rgba(240,90,26,0.05)',
  },
  locationSelectedStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 4, backgroundColor: ORANGE,
  },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  locationName: { fontFamily: 'Archivo_800ExtraBold', fontSize: 14 },
  locationCity: { fontFamily: 'Archivo_400Regular', fontSize: 11, marginTop: 1 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2.5, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: ORANGE, backgroundColor: ORANGE },
  radioInner: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#fff' },

  // Points stepper
  pointsCard: { backgroundColor: Colors.gold },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: Colors.black,
    backgroundColor: '#fff',
  },
  stepperBtnText: { fontFamily: 'Archivo_900Black', fontSize: 20, color: Colors.black, lineHeight: 24 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  pointsValueBox: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  pointsValue: { fontFamily: 'Archivo_900Black', fontSize: 24, color: Colors.black },
  pointsLabel: { fontFamily: 'Archivo_900Black', fontSize: 11, color: Colors.black, letterSpacing: 1 },
  discountBadge: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: Colors.black,
  },
  discountPreview: { fontFamily: 'Archivo_900Black', fontSize: 12, color: Colors.success, letterSpacing: 0.5 },

  // Summary
  summaryRows: { gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: 'Archivo_400Regular', fontSize: 14 },
  summaryValue: { fontFamily: 'Archivo_700Bold', fontSize: 14 },
  totalLabel: { fontFamily: 'Archivo_900Black', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
  totalValue: { fontFamily: 'Archivo_900Black', fontSize: 26, color: ORANGE, letterSpacing: -0.5 },
  earnRow: { alignItems: 'flex-end', marginTop: 2 },
  earnNote: { fontFamily: 'Archivo_800ExtraBold', fontSize: 11, color: Colors.success, letterSpacing: 0.5 },

  // Sticky checkout
  stickyCheckout: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 2.5,
  },
  checkoutBtn: {
    backgroundColor: ORANGE,
    borderRadius: Radius.md,
    padding: Spacing.md + 2,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.black,
  },
  checkoutBtnText: { fontFamily: 'Archivo_900Black', fontSize: 17, color: '#fff', letterSpacing: 0.5 },
  pickupNote: {
    fontFamily: 'Archivo_900Black',
    textAlign: 'center', fontSize: 11,
    color: Colors.success, marginBottom: 6, letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
