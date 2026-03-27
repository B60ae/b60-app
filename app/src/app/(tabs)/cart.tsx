import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Trash2, MapPin, Minus, Plus, ShoppingBag, ChevronRight } from 'lucide-react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { ordersApi, locationsApi } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import { useQuery } from '@tanstack/react-query'

export default function CartScreen() {
  const { items, locationId, pointsToRedeem, updateQuantity, removeItem,
    setLocation, setPointsToRedeem, clearCart, subtotal, discount, total, pointsEarned } = useCartStore()
  const { user } = useAuthStore()
  const [placing, setPlacing] = useState(false)

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  })

  const maxRedeemable = Math.min(
    user?.loyalty_points ?? 0,
    Math.floor(subtotal() / POINTS_TO_AED)
  )

  const handlePlaceOrder = async () => {
    if (!locationId) return Alert.alert('Select a pickup location first')
    setPlacing(true)
    try {
      const order = await ordersApi.create({
        items,
        location_id: locationId,
        subtotal: subtotal(),
        points_redeemed: pointsToRedeem,
        discount: discount(),
        total: total(),
      })
      clearCart()
      router.push({ pathname: '/order-success', params: { orderId: order.id, pointsEarned: order.points_earned ?? pointsEarned() } })
    } catch {
      Alert.alert('Order failed', 'Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer]}>
        <Image
          source={{ uri: 'https://b60.ae/images/classic-beef.webp' }}
          style={styles.emptyImage}
          resizeMode="cover"
        />
        <View style={styles.emptyContent}>
          <ShoppingBag size={40} color={Colors.primary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Go smash something good</Text>
          <Button title="Browse Menu" onPress={() => router.push('/(tabs)/menu')} style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Your Cart</Text>
        <Text style={styles.itemCount}>{items.length} item{items.length > 1 ? 's' : ''}</Text>

        {/* Cart Items */}
        <View style={styles.card}>
          {items.map((item, idx) => (
            <View key={idx}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.cartItem}>
                {/* Food thumbnail */}
                {item.menu_item.image_url ? (
                  <Image
                    source={{ uri: item.menu_item.image_url }}
                    style={styles.itemThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemThumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 20 }}>🍔</Text>
                  </View>
                )}
                <View style={styles.cartItemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.menu_item.name}</Text>
                  {item.selected_options.length > 0 && (
                    <Text style={styles.itemOptions} numberOfLines={1}>
                      {item.selected_options.map((o) => o.name).join(', ')}
                    </Text>
                  )}
                  <Text style={styles.itemPrice}>AED {item.line_total.toFixed(0)}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <Pressable onPress={() => updateQuantity(idx, item.quantity - 1)} style={styles.qtyBtn}>
                    <Minus size={13} color={Colors.text} />
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable onPress={() => updateQuantity(idx, item.quantity + 1)} style={styles.qtyBtn}>
                    <Plus size={13} color={Colors.text} />
                  </Pressable>
                  <Pressable onPress={() => removeItem(idx)} hitSlop={8}>
                    <Trash2 size={16} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
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
            {(locations ?? []).map((loc: any) => (
              <Pressable
                key={loc.id}
                style={[styles.locationOption, locationId === loc.id && styles.locationSelected]}
                onPress={() => setLocation(loc.id)}
              >
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationName, locationId === loc.id && { color: Colors.primary }]}>
                    {loc.name}
                  </Text>
                  <Text style={styles.locationCity}>{loc.city}</Text>
                </View>
                {locationId === loc.id && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Loyalty Redemption */}
        {user && user.loyalty_points >= MIN_REDEEM_POINTS && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Redeem Points</Text>
            <Text style={styles.sectionSub}>
              You have {user.loyalty_points} pts · Max AED {(maxRedeemable * POINTS_TO_AED).toFixed(0)} off
            </Text>
            <View style={styles.pointsSliderRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setPointsToRedeem(Math.max(0, pointsToRedeem - 100))}
              >
                <Minus size={14} color={Colors.text} />
              </Pressable>
              <View style={styles.pointsValueContainer}>
                <Text style={styles.pointsValue}>{pointsToRedeem}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setPointsToRedeem(Math.min(maxRedeemable, pointsToRedeem + 100))}
              >
                <Plus size={14} color={Colors.text} />
              </Pressable>
              {pointsToRedeem > 0 && (
                <Text style={styles.discountPreview}>= AED {(pointsToRedeem * POINTS_TO_AED).toFixed(0)} off</Text>
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
              <Text style={styles.summaryValue}>AED {subtotal().toFixed(0)}</Text>
            </View>
            {discount() > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: Colors.success }]}>Points Discount</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>-AED {discount().toFixed(0)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>AED {total().toFixed(0)}</Text>
            </View>
            <Text style={styles.earnNote}>🏅 You'll earn +{pointsEarned()} points on this order</Text>
          </View>
        </View>

        {/* spacer for sticky button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky checkout button */}
      <View style={styles.stickyCheckout}>
        <Button
          title={`Place Order · AED ${total().toFixed(0)}`}
          onPress={handlePlaceOrder}
          loading={placing}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: { alignItems: 'center' },
  emptyImage: {
    width: '100%',
    height: 220,
    opacity: 0.15,
  },
  emptyContent: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -40,
    padding: Spacing.lg,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text },
  itemCount: { fontSize: 14, color: Colors.textSecondary, marginTop: -4 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  itemThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  itemOptions: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  qty: { fontSize: 15, fontWeight: '700', color: Colors.text, minWidth: 18, textAlign: 'center' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionSub: { fontSize: 13, color: Colors.textSecondary },
  locationList: { gap: Spacing.sm },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  locationSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  locationInfo: {},
  locationName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  locationCity: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  checkMark: {
    width: 22, height: 22, borderRadius: Radius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  checkMarkText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  pointsSliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  pointsValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  pointsValue: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  pointsLabel: { fontSize: 12, color: Colors.textMuted },
  discountPreview: { fontSize: 13, fontWeight: '700', color: Colors.success },
  summaryRows: { gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  totalLabel: { fontSize: 17, fontWeight: '800', color: Colors.text },
  totalValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  earnNote: { fontSize: 12, color: Colors.success, textAlign: 'right', marginTop: 4 },
  stickyCheckout: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.cardStrong,
  },
})
