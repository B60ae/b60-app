import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Platform, Modal, Dimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Search, X, MapPin, ShoppingBag, ChevronRight, Truck, Store, Trash2, Minus, Plus, ChevronLeft } from 'lucide-react-native'
import { Image } from 'expo-image'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, FadeInDown, FadeOutDown,
} from 'react-native-reanimated'
import { menuApi, locationsApi, ordersApi } from '../../services/api'
import { Events } from '../../services/analytics'
import { SkeletonGrid } from '../../components/ui/SkeletonLoader'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { LightTheme, Spacing, Radius, Colors, Shadows } from '../../utils/theme'
import { DirhamSymbol } from '../../components/ui/DirhamSymbol'
import { Toast } from '../../components/ui/Toast'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import type { MenuItem } from '../../types'

const T = LightTheme
type Step = 'method' | 'location' | 'menu'
const { height: SCREEN_H } = Dimensions.get('window')

// ─── Menu Item Card ────────────────────────────────────────────────────────────

function MenuCard({ item, onPress, onAdd }: {
  item: MenuItem; onPress: () => void; onAdd: () => void
}) {
  const addScale = useSharedValue(1)
  const cardScale = useSharedValue(1)
  const addAnim = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }))
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }))

  const handleAdd = () => {
    if (!item.is_available) return
    addScale.value = withSequence(
      withSpring(0.72, { damping: 4, stiffness: 800 }),
      withSpring(1,    { damping: 6, stiffness: 400 }),
    )
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    onAdd()
  }

  return (
    <Animated.View style={[styles.card, cardAnim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { cardScale.value = withSpring(0.97, { damping: 8, stiffness: 400 }) }}
        onPressOut={() => { cardScale.value = withSpring(1,    { damping: 8, stiffness: 300 }) }}
        style={styles.cardInner}
        disabled={!item.is_available}
      >
        <View style={styles.cardImage}>
          {item.image_url
            ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            : <View style={[StyleSheet.absoluteFill, styles.cardImagePlaceholder]}>
                <Text style={styles.cardPlaceholderText}>B60</Text>
              </View>
          }
          {item.is_featured && (
            <View style={styles.favBadge}><Text style={styles.favBadgeText}>FAV</Text></View>
          )}
          {!item.is_available && (
            <View style={styles.soldOutOverlay}><Text style={styles.soldOutText}>SOLD OUT</Text></View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {item.description
            ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            : null
          }
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>AED {Number(item.price || 0).toFixed(0)}</Text>
            <Animated.View style={addAnim}>
              <Pressable
                onPress={handleAdd}
                style={[styles.addBtn, !item.is_available && { opacity: 0.3 }]}
                hitSlop={8}
                disabled={!item.is_available}
              >
                <Text style={styles.addBtnText}>+</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionHeaderText}>{label.toUpperCase()}</Text>
    </View>
  )
}

type ListRow = { type: 'header'; label: string; key: string } | { type: 'item'; item: MenuItem; key: string }

// ─── Cart Sheet ────────────────────────────────────────────────────────────────

const STEP = 100

function CartSheet({ visible, onClose, onOrderPlaced }: {
  visible: boolean; onClose: () => void; onOrderPlaced: () => void
}) {
  const insets = useSafeAreaInsets()
  const { items, locationId, pointsToRedeem, setPointsToRedeem, updateQuantity, removeItem, clearCart, subtotal, discount, total } = useCartStore()
  const { user, updatePoints } = useAuthStore()
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: locationsApi.getAll, staleTime: 1000 * 60 * 10 })
  const selectedLocation = locations?.find((l: any) => l.id === locationId)

  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const userPoints = user?.loyalty_points ?? 0
  const maxRedeemable = Math.min(
    Math.floor(userPoints / STEP) * STEP,
    Math.floor(subtotal() / POINTS_TO_AED / STEP) * STEP,
  )
  const canRedeem = userPoints >= MIN_REDEEM_POINTS && maxRedeemable >= STEP

  const stepDown = () => { const next = Math.max(0, pointsToRedeem - STEP); setPointsToRedeem(next); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }
  const stepUp   = () => { const next = Math.min(maxRedeemable, pointsToRedeem + STEP); setPointsToRedeem(next); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }

  const handlePlaceOrder = async () => {
    if (!locationId) { setToast({ message: 'Select a location first', type: 'error' }); return }
    if (items.length === 0) return
    setPlacing(true)
    Events.CHECKOUT_STARTED(total(), items.length)
    if (pointsToRedeem > 0) Events.POINTS_REDEEMED(pointsToRedeem)
    try {
      const order = await ordersApi.createOrder({
        location_id: locationId,
        items: items as any,
        subtotal: subtotal(),
        discount: discount(),
        total: total(),
        points_redeemed: pointsToRedeem,
      })
      const earned = Math.floor(subtotal())
      Events.ORDER_PLACED(order.id, total(), locationId)
      updatePoints(userPoints - pointsToRedeem + earned)
      clearCart()
      onClose()
      router.push({ pathname: '/order-success', params: { orderId: order.id, pointsEarned: earned } } as any)
      onOrderPlaced()
    } catch (e: any) {
      setToast({ message: e?.response?.data?.error ?? 'Order failed. Try again.', type: 'error' })
    } finally {
      setPlacing(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>

        <View style={styles.sheetHandle}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Your Order</Text>
            {selectedLocation && (
              <View style={styles.sheetLocRow}>
                <MapPin size={11} color={Colors.primary} />
                <Text style={styles.sheetLocText}>{selectedLocation.name}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.sheetClose}>
            <X size={20} color={T.textMuted} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingBag size={48} color={T.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
          </View>
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

              <View style={styles.itemsCard}>
                {items.map((ci, idx) => (
                  <View key={`${ci.menu_item.id}-${idx}`} style={[
                    styles.sheetItem,
                    idx === items.length - 1 && { borderBottomWidth: 0 },
                  ]}>
                    {ci.menu_item.image_url
                      ? <Image source={{ uri: ci.menu_item.image_url }} style={styles.sheetThumb} contentFit="cover" />
                      : <View style={[styles.sheetThumb, { backgroundColor: T.surface }]} />
                    }
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.sheetItemName} numberOfLines={1}>{ci.menu_item.name}</Text>
                      {ci.selected_options?.length > 0 && (
                        <Text style={styles.sheetItemSub} numberOfLines={1}>
                          {ci.selected_options.map((o) => o.name).join(' · ')}
                        </Text>
                      )}
                      <Text style={styles.sheetItemPrice}>AED {ci.line_total.toFixed(0)}</Text>
                    </View>
                    <View style={styles.sheetQty}>
                      <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); ci.quantity > 1 ? updateQuantity(idx, ci.quantity - 1) : removeItem(idx) }}
                        style={styles.qtyBtn} hitSlop={8}
                      >
                        {ci.quantity === 1 ? <Trash2 size={13} color="#EF4444" /> : <Minus size={13} color={T.text} />}
                      </Pressable>
                      <Text style={styles.qtyNum}>{ci.quantity}</Text>
                      <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQuantity(idx, ci.quantity + 1) }}
                        style={styles.qtyBtn} hitSlop={8}
                      >
                        <Plus size={13} color={T.text} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>

              {canRedeem && (
                <View style={[styles.pointsCard, { borderColor: pointsToRedeem > 0 ? Colors.primary : '#000' }]}>
                  <View style={styles.pointsCardTop}>
                    <View style={styles.pointsIconWrap}>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointsLabel}>Redeem Points</Text>
                      <Text style={styles.pointsSub}>
                        You have <Text style={{ color: Colors.primary, fontWeight: '800' }}>{userPoints}</Text> pts
                      </Text>
                    </View>
                    {pointsToRedeem > 0 && (
                      <View style={styles.savingBadge}>
                        <Text style={styles.savingBadgeText}>-AED {discount().toFixed(0)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable onPress={stepDown} disabled={pointsToRedeem <= 0}
                      style={[styles.stepperBtn, { opacity: pointsToRedeem <= 0 ? 0.35 : 1 }]} hitSlop={8}>
                      <Minus size={16} color={T.text} />
                    </Pressable>
                    <View style={[styles.stepperValue, { borderColor: pointsToRedeem > 0 ? Colors.primary : '#000' }]}>
                      <Text style={[styles.stepperValueText, { color: pointsToRedeem > 0 ? Colors.primary : T.textMuted }]}>
                        {pointsToRedeem > 0 ? `${pointsToRedeem} pts` : '0 pts'}
                      </Text>
                    </View>
                    <Pressable onPress={stepUp} disabled={pointsToRedeem >= maxRedeemable}
                      style={[styles.stepperBtn, { opacity: pointsToRedeem >= maxRedeemable ? 0.35 : 1 }]} hitSlop={8}>
                      <Plus size={16} color={T.text} />
                    </Pressable>
                    <Pressable onPress={() => { setPointsToRedeem(maxRedeemable); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) }}
                      style={styles.stepperMax}>
                      <Text style={styles.stepperMaxText}>MAX</Text>
                    </Pressable>
                    {pointsToRedeem > 0 && (
                      <Pressable onPress={() => { setPointsToRedeem(0); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                        style={styles.stepperClear}>
                        <Text style={styles.stepperClearText}>Clear</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.totalsCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalVal}>AED {subtotal().toFixed(2)}</Text>
                </View>
                {discount() > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: Colors.success }]}>Points ({pointsToRedeem} pts)</Text>
                    <Text style={[styles.totalVal, { color: Colors.success, fontWeight: '800' }]}>-AED {discount().toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { fontWeight: '900', fontSize: 16, color: T.text }]}>Total</Text>
                  <Text style={[styles.totalVal, { color: Colors.primary, fontWeight: '900', fontSize: 20 }]}>AED {total().toFixed(2)}</Text>
                </View>
              </View>

            </ScrollView>

            <View style={styles.placeOrderWrap}>
              <Pressable
                style={[styles.placeOrderBtn, { opacity: placing ? 0.7 : 1 }]}
                onPress={handlePlaceOrder}
                disabled={placing}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeOrderText}>{placing ? 'PLACING ORDER...' : 'PLACE ORDER'}</Text>
                  {discount() > 0 && (
                    <Text style={styles.placeOrderSaving}>Saving AED {discount().toFixed(0)} with points</Text>
                  )}
                </View>
                <View style={styles.placeOrderPricePill}>
                  <Text style={styles.placeOrderTotal}>AED {total().toFixed(0)}</Text>
                </View>
              </Pressable>
            </View>
          </>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
      </View>
    </Modal>
  )
}

// ─── Main ORDER screen ─────────────────────────────────────────────────────────

export default function OrderScreen() {
  const [step, setStep] = useState<Step>('method')
  const [cartVisible, setCartVisible] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchRef = useRef<TextInput>(null)

  const insets = useSafeAreaInsets()
  const { addItem, setLocation, locationId, items: cartItems } = useCartStore()
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
    staleTime: 1000 * 60 * 10,
  })

  const { data: categories } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: menuApi.getCategories,
    enabled: step === 'menu',
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ['menu', 'items', activeCategoryId],
    queryFn: () => menuApi.getItems(activeCategoryId ?? undefined),
    enabled: step === 'menu',
  })

  const selectedLocation = locations?.find((l: any) => l.id === locationId)

  const filtered = useMemo(() => {
    if (!items) return []
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
  }, [items, search])

  const listData: ListRow[] = useMemo(() => {
    const rows: ListRow[] = []
    if (search.trim() || !categories?.length) {
      filtered.forEach((item) => rows.push({ type: 'item', item, key: `item-${item.id}` }))
      return rows
    }
    if (activeCategoryId) {
      filtered.forEach((item) => rows.push({ type: 'item', item, key: `item-${item.id}` }))
    } else {
      for (const cat of categories) {
        const catItems = filtered.filter((item) => item.category_id === cat.id)
        if (!catItems.length) continue
        rows.push({ type: 'header', label: cat.name, key: `header-${cat.id}` })
        catItems.forEach((item) => rows.push({ type: 'item', item, key: `item-${item.id}` }))
      }
    }
    return rows
  }, [filtered, search, categories, activeCategoryId])

  const handleItemPress = useCallback((item: MenuItem) => {
    Haptics.selectionAsync()
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }, [])

  const handleAddToCart = useCallback((item: MenuItem) => {
    addItem(item, 1, [])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [addItem])

  const renderRow = useCallback(({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') return <SectionHeader label={row.label} />
    return <MenuCard item={row.item} onPress={() => handleItemPress(row.item)} onAdd={() => handleAddToCart(row.item)} />
  }, [handleItemPress, handleAddToCart])

  const categoryPills = useMemo(() => {
    const dynamic = categories?.map((cat) => ({ id: cat.id, label: cat.name })) ?? []
    return [{ id: null, label: 'All' }, ...dynamic]
  }, [categories])

  // ── Step: Method ──────────────────────────────────────────────────────────────

  if (step === 'method') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepHeaderBlock}>
          <Text style={styles.stepTitle}>Start an Order</Text>
          <Text style={styles.stepSub}>How would you like to order?</Text>
        </View>

        <View style={styles.methodCards}>
          <Pressable
            style={[styles.methodCard, Shadows.hard]}
            onPress={() => { Haptics.selectionAsync(); setStep('location') }}
          >
            <View style={styles.methodIcon}>
              <Store size={32} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodLabel}>Pickup</Text>
              <Text style={styles.methodSub}>Order and pay in the app</Text>
            </View>
            <ChevronRight size={20} color={T.textMuted} />
          </Pressable>

          <Pressable style={[styles.methodCard, { opacity: 0.45 }]} disabled>
            <View style={[styles.methodIcon, { backgroundColor: 'rgba(240,90,26,0.06)' }]}>
              <Truck size={32} color={T.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodLabel, { color: T.textMuted }]}>Delivery</Text>
              <Text style={[styles.methodSub, { color: T.textMuted }]}>Coming soon</Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // ── Step: Location ────────────────────────────────────────────────────────────

  if (step === 'location') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepHeaderBlock}>
          <Pressable onPress={() => setStep('method')} style={styles.backBtn} hitSlop={12}>
            <ChevronLeft size={22} color={T.text} />
          </Pressable>
          <Text style={styles.stepTitle}>Pick a Location</Text>
          <Text style={styles.stepSub}>Choose your pickup branch</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}>
          {(locations ?? []).map((loc: any) => {
            const isOpen = loc.is_open !== false
            const isSelected = loc.id === locationId
            return (
              <Pressable
                key={loc.id}
                style={[
                  styles.locationCard,
                  isSelected && styles.locationCardSelected,
                  Shadows.hardSm,
                ]}
                onPress={() => {
                  if (!isOpen) return
                  Haptics.selectionAsync()
                  setLocation(loc.id)
                  setStep('menu')
                }}
                disabled={!isOpen}
              >
                <View style={[styles.locAccent, { backgroundColor: isOpen ? Colors.primary : T.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locName, { color: isOpen ? T.text : T.textMuted }]}>{loc.name}</Text>
                  {loc.address && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <MapPin size={11} color={T.textMuted} />
                      <Text style={styles.locAddr} numberOfLines={1}>{loc.address}</Text>
                    </View>
                  )}
                  {loc.hours && (
                    <Text style={[styles.locAddr, { marginTop: 2 }]}>{loc.hours}</Text>
                  )}
                </View>
                <View style={[styles.openPill, { backgroundColor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,100,100,0.1)' }]}>
                  <View style={[styles.openDot, { backgroundColor: isOpen ? Colors.success : T.textMuted }]} />
                  <Text style={[styles.openPillText, { color: isOpen ? Colors.success : T.textMuted }]}>
                    {isOpen ? 'OPEN' : 'CLOSED'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Step: Menu ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <View style={styles.menuHeader}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => setStep('location')} hitSlop={12} style={styles.backBtn}>
            <ChevronLeft size={20} color={T.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>MENU</Text>
            {selectedLocation && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color={Colors.primary} />
                <Text style={styles.headerSub}>{selectedLocation.name}</Text>
              </View>
            )}
          </View>
          <Pressable
            style={styles.cartBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCartVisible(true) }}
          >
            <ShoppingBag size={18} color="#fff" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Search size={15} color={T.textMuted} strokeWidth={2} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search the menu..."
            placeholderTextColor={T.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(''); searchRef.current?.focus() }} hitSlop={10}>
              <View style={styles.clearBtn}>
                <X size={10} color="#fff" strokeWidth={3} />
              </View>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContent}>
          {categoryPills.map((cat) => {
            const isActive = activeCategoryId === cat.id
            return (
              <Pressable
                key={String(cat.id)}
                onPress={() => { Haptics.selectionAsync(); setActiveCategoryId(cat.id); setSearch('') }}
                style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={[styles.pillLabel, { color: isActive ? '#fff' : T.text }]}>{cat.label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {search.trim() ? `Nothing for "${search.trim()}"` : 'Nothing here yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {search.trim() ? 'Try a different search' : 'Check back soon'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={listData}
          keyExtractor={(row) => row.key}
          estimatedItemSize={120}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: cartCount > 0 ? 100 : 24, paddingTop: Spacing.sm }}
          showsVerticalScrollIndicator={false}
          getItemType={(row) => row.type}
        />
      )}

      {cartCount > 0 && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutDown.duration(200)}
          style={[styles.floatingCart, { bottom: insets.bottom + 16 }]}
        >
          <Pressable
            style={styles.floatingCartBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCartVisible(true) }}
          >
            <View style={styles.floatingCartBadge}>
              <Text style={styles.floatingCartBadgeText}>{cartCount}</Text>
            </View>
            <Text style={styles.floatingCartText}>VIEW ORDER</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </Animated.View>
      )}

      <CartSheet
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        onOrderPlaced={() => setStep('method')}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F3' },

  // Method/Location step header
  stepHeaderBlock: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  stepTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: -0.5 },
  stepSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, marginBottom: 4,
  },

  // Method cards
  methodCards: { padding: Spacing.md, gap: Spacing.md },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
    backgroundColor: '#fff',
  },
  methodIcon: {
    width: 60, height: 60, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(240,90,26,0.10)',
    borderWidth: 2, borderColor: '#000',
  },
  methodLabel: { fontSize: 18, fontWeight: '900', color: T.text },
  methodSub: { fontSize: 13, marginTop: 2, color: T.textSecondary },

  // Location
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
    backgroundColor: '#fff',
  },
  locationCardSelected: { borderColor: Colors.primary, borderWidth: 3 },
  locAccent: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0, top: 0, bottom: 0 },
  locName: { fontSize: 16, fontWeight: '800', paddingLeft: 8 },
  locAddr: { fontSize: 12, paddingLeft: 8, color: T.textSecondary },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Menu header
  menuHeader: {
    paddingTop: Spacing.sm, paddingBottom: 0,
    borderBottomWidth: 2, borderBottomColor: '#000',
    gap: Spacing.sm, backgroundColor: '#FFF8F3',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  menuTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -1, color: T.text },
  headerSub: { fontSize: 11, fontWeight: '600', color: T.textMuted },
  cartBtn: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5,
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.yellow, borderRadius: 8, borderWidth: 1.5, borderColor: '#000',
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  cartBadgeText: { fontSize: 9, fontWeight: '900', color: '#000' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    gap: Spacing.sm, borderWidth: 2, borderColor: '#000',
    marginHorizontal: Spacing.md,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0, color: T.text },
  clearBtn: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: T.textMuted },

  pillsContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 2 },
  pillActive: { backgroundColor: Colors.primary, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  pillInactive: { backgroundColor: '#fff', borderColor: '#000' },
  pillLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section header in list
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  sectionAccent: { width: 4, height: 18, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionHeaderText: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: '#1B2A4A' },

  // Card
  card: {
    marginHorizontal: Spacing.md, marginBottom: 10,
    borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
    overflow: 'hidden', backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5,
  },
  cardInner: { flexDirection: 'row', height: 110 },
  cardImage: { width: 110, height: 110, position: 'relative' },
  cardImagePlaceholder: { backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  cardPlaceholderText: { fontSize: 11, fontWeight: '900', color: T.textMuted, letterSpacing: 2 },
  favBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1.5, borderColor: '#000' },
  favBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  cardBody: { flex: 1, padding: Spacing.md, justifyContent: 'space-between', backgroundColor: '#FFF8F3' },
  cardName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, color: T.text, textTransform: 'uppercase' },
  cardDesc: { fontSize: 12, lineHeight: 17, marginTop: 2, color: T.textMuted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice: { fontSize: 17, fontWeight: '900', color: Colors.primary },
  addBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  addBtnText: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },

  // Floating cart
  floatingCart: { position: 'absolute', left: Spacing.md, right: Spacing.md },
  floatingCartBtn: {
    borderRadius: Radius.lg, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 16, gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
  },
  floatingCartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  floatingCartBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  floatingCartText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: { fontSize: 17, fontWeight: '700', textAlign: 'center', color: T.text },
  emptySubtext: { fontSize: 14, marginTop: 6, textAlign: 'center', color: T.textMuted },

  // Cart sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: SCREEN_H * 0.88, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden', backgroundColor: '#FFF8F3',
    borderTopWidth: 2.5, borderLeftWidth: 2.5, borderRightWidth: 2.5, borderColor: '#000',
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1.5, borderBottomColor: '#000', gap: Spacing.sm,
  },
  sheetTitle: { fontSize: 22, fontWeight: '900', flex: 1, color: T.text },
  sheetLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sheetLocText: { fontSize: 12, color: T.textMuted },
  sheetClose: { padding: 4 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  sheetThumb: { width: 52, height: 52, borderRadius: Radius.sm },
  sheetItemName: { fontSize: 14, fontWeight: '700', color: T.text },
  sheetItemSub: { fontSize: 11, marginTop: 1, color: T.textMuted },
  sheetItemPrice: { fontSize: 14, fontWeight: '900', marginTop: 2, color: Colors.primary },
  sheetQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#000',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyNum: { fontSize: 14, fontWeight: '700', minWidth: 16, textAlign: 'center', color: T.text },
  emptyCart: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  emptyCartText: { fontSize: 16, fontWeight: '600', color: T.textMuted },

  // Points stepper
  itemsCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 2, borderColor: '#000', overflow: 'hidden',
    backgroundColor: '#fff',
  },
  pointsCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 2,
    padding: Spacing.md, gap: Spacing.sm,
    backgroundColor: '#fff',
  },
  pointsCardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pointsIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(240,90,26,0.10)' },
  pointsLabel: { fontSize: 14, fontWeight: '700', color: T.text },
  pointsSub: { fontSize: 12, marginTop: 2, color: T.textMuted },
  savingBadge: { backgroundColor: Colors.success, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  savingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F3' },
  stepperValue: { flex: 1, height: 40, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F3' },
  stepperValueText: { fontSize: 15, fontWeight: '800' },
  stepperMax: { paddingHorizontal: 14, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#000' },
  stepperMaxText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  stepperClear: { paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#000', alignItems: 'center', justifyContent: 'center' },
  stepperClearText: { fontSize: 13, fontWeight: '700', color: T.textMuted },

  // Totals
  totalsCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 2, borderColor: '#000',
    padding: Spacing.md, gap: 8, backgroundColor: '#fff',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  totalVal: { fontSize: 14, fontWeight: '700', color: T.text },
  totalDivider: { height: 2, backgroundColor: '#000', marginVertical: 4 },

  // Place order
  placeOrderWrap: { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 18,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
  },
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  placeOrderSaving: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  placeOrderPricePill: {
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  placeOrderTotal: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '900' },
})
