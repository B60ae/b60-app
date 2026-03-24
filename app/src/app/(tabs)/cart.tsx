import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Trash2, MapPin, Minus, Plus } from 'lucide-react-native'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { ordersApi } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import { LOCATIONS, POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import { useState } from 'react'

export default function CartScreen() {
  const { items, locationId, pointsToRedeem, updateQuantity, removeItem,
    setLocation, setPointsToRedeem, clearCart, subtotal, discount, total, pointsEarned } = useCartStore()
  const { user } = useAuthStore()
  const [placing, setPlacing] = useState(false)

  const maxRedeemable = Math.min(
    user?.loyalty_points ?? 0,
    Math.floor(subtotal() / POINTS_TO_AED)
  )

  const handlePlaceOrder = async () => {
    if (!locationId) return Alert.alert('Select a pickup location')
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
      router.push({ pathname: '/order/[id]', params: { id: order.id } })
    } catch {
      Alert.alert('Order failed', 'Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
        <Text style={{ fontSize: 60 }}>🍔</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Go smash something good</Text>
        <Button title="Browse Menu" onPress={() => router.push('/(tabs)/menu')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}>
        <Text style={styles.title}>Your Cart</Text>

        {/* Items */}
        {items.map((item, idx) => (
          <View key={idx} style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
              <Text style={styles.itemName}>{item.menu_item.name}</Text>
              {item.selected_options.length > 0 && (
                <Text style={styles.itemOptions}>{item.selected_options.map(o => o.name).join(', ')}</Text>
              )}
              <Text style={styles.itemPrice}>AED {item.line_total.toFixed(0)}</Text>
            </View>
            <View style={styles.qtyControls}>
              <Pressable onPress={() => updateQuantity(idx, item.quantity - 1)} style={styles.qtyBtn}>
                <Minus size={14} color={Colors.text} />
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable onPress={() => updateQuantity(idx, item.quantity + 1)} style={styles.qtyBtn}>
                <Plus size={14} color={Colors.text} />
              </Pressable>
              <Pressable onPress={() => removeItem(idx)} style={[styles.qtyBtn, { marginLeft: 4 }]}>
                <Trash2 size={14} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        ))}

        {/* Pickup Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pickup From</Text>
          </View>
          {LOCATIONS.map((loc) => (
            <Pressable
              key={loc.id}
              style={[styles.locationOption, locationId === loc.id && styles.locationSelected]}
              onPress={() => setLocation(loc.id)}
            >
              <Text style={[styles.locationName, locationId === loc.id && { color: Colors.primary }]}>
                {loc.name}
              </Text>
              <Text style={styles.locationCity}>{loc.city}</Text>
            </Pressable>
          ))}
        </View>

        {/* Loyalty Redemption */}
        {user && user.loyalty_points >= MIN_REDEEM_POINTS && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Redeem Points</Text>
            <Text style={styles.sectionSub}>You have {user.loyalty_points} pts · Max AED {(maxRedeemable * POINTS_TO_AED).toFixed(0)} off</Text>
            <View style={styles.pointsRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setPointsToRedeem(Math.max(0, pointsToRedeem - 100))}
              >
                <Minus size={14} color={Colors.text} />
              </Pressable>
              <Text style={styles.pointsValue}>{pointsToRedeem} pts</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setPointsToRedeem(Math.min(maxRedeemable, pointsToRedeem + 100))}
              >
                <Plus size={14} color={Colors.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summary}>
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
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>AED {total().toFixed(0)}</Text>
          </View>
          <Text style={styles.earnNote}>+{pointsEarned()} pts earned on this order</Text>
        </View>

        <Button
          title={`Place Order · AED ${total().toFixed(0)}`}
          onPress={handlePlaceOrder}
          loading={placing}
          fullWidth size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  emptySub: { ...Typography.bodySmall },
  cartItem: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start',
    borderWidth: 1, borderColor: Colors.border,
  },
  cartItemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  itemOptions: { ...Typography.caption, marginTop: 2 },
  itemPrice: { ...Typography.price, fontSize: 15, marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
  },
  qty: { fontSize: 15, fontWeight: '700', color: Colors.white, minWidth: 20, textAlign: 'center' },
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionSub: { ...Typography.bodySmall },
  locationOption: {
    padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  locationSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '11' },
  locationName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  locationCity: { ...Typography.caption },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pointsValue: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  summary: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    gap: 8, borderWidth: 1, borderColor: Colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...Typography.body },
  summaryValue: { fontSize: 15, fontWeight: '600', color: Colors.text },
  totalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { fontSize: 18, fontWeight: '800', color: Colors.text },
  totalValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  earnNote: { ...Typography.caption, color: Colors.success, textAlign: 'right' },
})
