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
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, FadeInDown, FadeOutDown,
} from 'react-native-reanimated'
import { menuApi, locationsApi, ordersApi } from '../../services/api'
import { SkeletonGrid } from '../../components/ui/SkeletonLoader'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { LightTheme, DarkTheme, Spacing, Radius, Colors, Shadows } from '../../utils/theme'
import { DirhamSymbol } from '../../components/ui/DirhamSymbol'
import { Toast } from '../../components/ui/Toast'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import type { MenuItem } from '../../types'

type Step = 'method' | 'location' | 'menu'

const { height: SCREEN_H } = Dimensions.get('window')

// ─── Menu Item Card ────────────────────────────────────────────────────────────

function MenuCard({ item, onPress, onAdd, T }: {
  item: MenuItem; onPress: () => void; onAdd: () => void; T: any
}) {
  const addScale = useSharedValue(1)
  const cardScale = useSharedValue(1)
  const addAnim = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }))
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }))

  const handleAdd = () => {
    if (!item.is_available) return
    addScale.value = withSequence(
      withSpring(0.72, { damping: 4, stiffness: 800 }),
      withSpring(1, { damping: 6, stiffness: 400 }),
    )
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    onAdd()
  }

  return (
    <Animated.View style={[styles.card, { backgroundColor: T.surfaceElevated, borderColor: T.border }, cardAnim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { cardScale.value = withSpring(0.97, { damping: 8, stiffness: 400 }) }}
        onPressOut={() => { cardScale.value = withSpring(1, { damping: 8, stiffness: 300 }) }}
        style={styles.cardInner}
        disabled={!item.is_available}
      >
        <View style={styles.cardImage}>
          {item.image_url
            ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: T.textMuted, letterSpacing: 2 }}>B60</Text>
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
          <Text style={[styles.cardName, { color: T.text }]} numberOfLines={1}>{item.name}</Text>
          {item.description
            ? <Text style={[styles.cardDesc, { color: T.textMuted }]} numberOfLines={2}>{item.description}</Text>
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

function SectionHeader({ label, T }: { label: string; T: any }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={[styles.sectionHeaderText, { color: T.text }]}>{label.toUpperCase()}</Text>
    </View>
  )
}

type ListRow = { type: 'header'; label: string; key: string } | { type: 'item'; item: MenuItem; key: string }

// ─── Cart Sheet ────────────────────────────────────────────────────────────────

function CartSheet({ visible, onClose, T, theme, onOrderPlaced }: {
  visible: boolean; onClose: () => void; T: any; theme: any; onOrderPlaced: () => void
}) {
  const insets = useSafeAreaInsets()
  const { items, locationId, pointsToRedeem, setPointsToRedeem, updateQuantity, removeItem, clearCart, subtotal, discount, total } = useCartStore()
  const { user, updatePoints } = useAuthStore()
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: locationsApi.getAll, staleTime: 1000 * 60 * 10 })
  const selectedLocation = locations?.find((l: any) => l.id === locationId)

  const [placing, setPlacing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const maxRedeemable = Math.min(
    Math.floor((user?.loyalty_points ?? 0) / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS,
    Math.floor(subtotal() / POINTS_TO_AED / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS,
  )
  const togglePoints = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setPointsToRedeem(pointsToRedeem > 0 ? 0 : maxRedeemable)
  }

  const handlePlaceOrder = async () => {
    if (!locationId) { setToast({ message: 'Select a location first', type: 'error' }); return }
    if (items.length === 0) return
    setPlacing(true)
    try {
      const order = await ordersApi.createOrder({
        location_id: locationId,
        items: items as any,
        subtotal: subtotal(),
        discount: discount(),
        total: total(),
        points_redeemed: pointsToRedeem,
      })
      const earned = Math.floor(total())
      updatePoints((user?.loyalty_points ?? 0) - pointsToRedeem + earned)
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
      <View style={[styles.sheet, { backgroundColor: T.background, paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: T.border }]} />
        </View>

        {/* Header */}
        <View style={[styles.sheetHeader, { borderBottomColor: T.border }]}>
          <Text style={[styles.sheetTitle, { color: T.text }]}>Your Order</Text>
          {selectedLocation && (
            <View style={styles.sheetLocRow}>
              <MapPin size={12} color={Colors.primary} />
              <Text style={[styles.sheetLocText, { color: T.textSecondary }]}>{selectedLocation.name}</Text>
            </View>
          )}
          <Pressable onPress={onClose} hitSlop={12} style={styles.sheetClose}>
            <X size={20} color={T.textMuted} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingBag size={48} color={T.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyCartText, { color: T.textMuted }]}>Your cart is empty</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.sheetItems} showsVerticalScrollIndicator={false}>
              {items.map((ci, idx) => (
                <View key={`${ci.menu_item.id}-${idx}`} style={[styles.sheetItem, { borderBottomColor: T.border }]}>
                  {ci.menu_item.image_url
                    ? <Image source={{ uri: ci.menu_item.image_url }} style={styles.sheetThumb} contentFit="cover" />
                    : <View style={[styles.sheetThumb, { backgroundColor: T.border }]} />
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetItemName, { color: T.text }]} numberOfLines={1}>{ci.menu_item.name}</Text>
                    {ci.selected_options?.length > 0 && (
                      <Text style={[styles.sheetItemSub, { color: T.textMuted }]} numberOfLines={1}>
                        {ci.selected_options.map((o) => o.name).join(', ')}
                      </Text>
                    )}
                    <Text style={[styles.sheetItemPrice, { color: Colors.primary }]}>AED {ci.line_total.toFixed(0)}</Text>
                  </View>
                  <View style={styles.sheetQty}>
                    <Pressable
                      onPress={() => ci.quantity > 1 ? updateQuantity(idx, ci.quantity - 1) : removeItem(idx)}
                      style={[styles.qtyBtn, { borderColor: T.border, backgroundColor: T.surface }]}
                      hitSlop={8}
                    >
                      {ci.quantity === 1
                        ? <Trash2 size={13} color="#EF4444" />
                        : <Minus size={13} color={T.text} />
                      }
                    </Pressable>
                    <Text style={[styles.qtyNum, { color: T.text }]}>{ci.quantity}</Text>
                    <Pressable
                      onPress={() => updateQuantity(idx, ci.quantity + 1)}
                      style={[styles.qtyBtn, { borderColor: T.border, backgroundColor: T.surface }]}
                      hitSlop={8}
                    >
                      <Plus size={13} color={T.text} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {/* Points redemption */}
              {(user?.loyalty_points ?? 0) >= MIN_REDEEM_POINTS && maxRedeemable > 0 && (
                <Pressable
                  style={[styles.pointsRow, { backgroundColor: T.surface, borderColor: pointsToRedeem > 0 ? Colors.primary : T.border }]}
                  onPress={togglePoints}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pointsLabel, { color: T.text }]}>Use {maxRedeemable} points</Text>
                    <Text style={[styles.pointsSub, { color: T.textMuted }]}>Save AED {(maxRedeemable * POINTS_TO_AED).toFixed(0)}</Text>
                  </View>
                  <View style={[styles.pointsCheck, { backgroundColor: pointsToRedeem > 0 ? Colors.primary : T.border }]}>
                    {pointsToRedeem > 0 && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                  </View>
                </Pressable>
              )}

              {/* Totals */}
              <View style={[styles.totalsBox, { borderTopColor: T.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: T.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.totalVal, { color: T.text }]}>AED {subtotal().toFixed(0)}</Text>
                </View>
                {discount() > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: Colors.success }]}>Points discount</Text>
                    <Text style={[styles.totalVal, { color: Colors.success }]}>-AED {discount().toFixed(0)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { color: T.text, fontWeight: '900', fontSize: 16 }]}>Total</Text>
                  <Text style={[styles.totalVal, { color: Colors.primary, fontWeight: '900', fontSize: 18 }]}>AED {total().toFixed(0)}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Place order */}
            <Pressable
              style={[styles.placeOrderBtn, { opacity: placing ? 0.7 : 1 }]}
              onPress={handlePlaceOrder}
              disabled={placing}
            >
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.placeOrderGradient}>
                <Text style={styles.placeOrderText}>{placing ? 'PLACING ORDER...' : 'PLACE ORDER'}</Text>
                <Text style={styles.placeOrderTotal}>AED {total().toFixed(0)}</Text>
              </LinearGradient>
            </Pressable>
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

  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme
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
    if (!cartVisible && cartCount === 0) {
      // show cart peek on first add
    }
  }, [addItem, cartVisible, cartCount])

  const renderRow = useCallback(({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') return <SectionHeader label={row.label} T={T} />
    return <MenuCard item={row.item} onPress={() => handleItemPress(row.item)} onAdd={() => handleAddToCart(row.item)} T={T} />
  }, [T, handleItemPress, handleAddToCart])

  const categoryPills = useMemo(() => {
    const dynamic = categories?.map((cat) => ({ id: cat.id, label: cat.name })) ?? []
    return [{ id: null, label: 'All' }, ...dynamic]
  }, [categories])

  // ── Step: Method ──────────────────────────────────────────────────────────────

  if (step === 'method') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: T.text }]}>Start an Order</Text>
          <Text style={[styles.stepSub, { color: T.textSecondary }]}>How would you like to order?</Text>
        </View>

        <View style={styles.methodCards}>
          <Pressable
            style={[styles.methodCard, { backgroundColor: T.surface, borderColor: T.border }]}
            onPress={() => { Haptics.selectionAsync(); setStep('location') }}
          >
            <View style={[styles.methodIcon, { backgroundColor: 'rgba(240,90,26,0.12)' }]}>
              <Store size={32} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodLabel, { color: T.text }]}>Pickup</Text>
              <Text style={[styles.methodSub, { color: T.textSecondary }]}>Order and pay in the app</Text>
            </View>
            <ChevronRight size={20} color={T.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.methodCard, { backgroundColor: T.surface, borderColor: T.border, opacity: 0.45 }]}
            disabled
          >
            <View style={[styles.methodIcon, { backgroundColor: 'rgba(240,90,26,0.08)' }]}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: T.background }]}>
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep('method')} style={styles.backBtn} hitSlop={12}>
            <ChevronLeft size={22} color={T.text} />
          </Pressable>
          <Text style={[styles.stepTitle, { color: T.text }]}>Pick a Location</Text>
          <Text style={[styles.stepSub, { color: T.textSecondary }]}>Choose your pickup branch</Text>
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
                  { backgroundColor: T.surface, borderColor: isSelected ? Colors.primary : T.border },
                  isSelected && { borderWidth: 2 },
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
                      <Text style={[styles.locAddr, { color: T.textSecondary }]} numberOfLines={1}>{loc.address}</Text>
                    </View>
                  )}
                  {loc.hours && (
                    <Text style={[styles.locAddr, { color: T.textMuted, marginTop: 2 }]}>{loc.hours}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => setStep('location')} hitSlop={12} style={styles.backBtn}>
            <ChevronLeft size={20} color={T.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: T.text }]}>MENU</Text>
            {selectedLocation && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color={Colors.primary} />
                <Text style={[styles.headerSub, { color: T.textMuted }]}>{selectedLocation.name}</Text>
              </View>
            )}
          </View>
          {/* Cart button */}
          <Pressable
            style={[styles.cartBtn, { backgroundColor: Colors.primary }]}
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

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Search size={15} color={T.textMuted} strokeWidth={2} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search the menu..."
            placeholderTextColor={T.textMuted}
            style={[styles.searchInput, { color: T.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(''); searchRef.current?.focus() }} hitSlop={10}>
              <View style={[styles.clearBtn, { backgroundColor: T.textMuted }]}>
                <X size={10} color="#fff" strokeWidth={3} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContent}>
          {categoryPills.map((cat) => {
            const isActive = activeCategoryId === cat.id
            return (
              <Pressable
                key={String(cat.id)}
                onPress={() => { Haptics.selectionAsync(); setActiveCategoryId(cat.id); setSearch('') }}
                style={[styles.pill, isActive
                  ? { backgroundColor: Colors.primary, borderColor: Colors.primary }
                  : { backgroundColor: T.surface, borderColor: T.border }
                ]}
              >
                <Text style={[styles.pillLabel, { color: isActive ? '#fff' : T.textSecondary }]}>{cat.label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Menu list */}
      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: T.text }]}>
            {search.trim() ? `Nothing for "${search.trim()}"` : 'Nothing here yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: T.textMuted }]}>
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

      {/* Floating cart bar when items in cart */}
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
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.floatingCartGradient}>
              <View style={styles.floatingCartBadge}>
                <Text style={styles.floatingCartBadgeText}>{cartCount}</Text>
              </View>
              <Text style={styles.floatingCartText}>VIEW ORDER</Text>
              <ChevronRight size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* Cart sheet */}
      <CartSheet
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        T={T}
        theme={themeMode}
        onOrderPlaced={() => setStep('method')}
      />
    </SafeAreaView>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Steps
  stepHeader: { padding: Spacing.lg, paddingBottom: Spacing.md, gap: 4 },
  stepTitle: { fontSize: 28, fontWeight: '900' },
  stepSub: { fontSize: 14, fontWeight: '500' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Method
  methodCards: { padding: Spacing.md, gap: Spacing.md },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1.5,
  },
  methodIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 18, fontWeight: '800' },
  methodSub: { fontSize: 13, marginTop: 2 },

  // Location
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1.5,
    padding: Spacing.md, gap: Spacing.md, overflow: 'hidden',
  },
  locAccent: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0, top: 0, bottom: 0 },
  locName: { fontSize: 16, fontWeight: '800', paddingLeft: 8 },
  locAddr: { fontSize: 12, paddingLeft: 8 },
  openPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Menu header
  header: { paddingTop: Spacing.sm, paddingBottom: 0, borderBottomWidth: 1, gap: Spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  headerSub: { fontSize: 11, fontWeight: '600' },

  // Cart button in header
  cartBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glowStrong,
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.yellow, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  cartBadgeText: { fontSize: 9, fontWeight: '900', color: '#000' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    gap: Spacing.sm, borderWidth: 1, marginHorizontal: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  clearBtn: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Pills
  pillsContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8, flexDirection: 'row' },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5 },
  pillLabel: { fontSize: 13, fontWeight: '700' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  sectionAccent: { width: 4, height: 18, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionHeaderText: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },

  // Card
  card: {
    marginHorizontal: Spacing.md, marginBottom: 10,
    borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden',
    elevation: 2,
  },
  cardInner: { flexDirection: 'row', height: 110 },
  cardImage: { width: 110, height: 110, position: 'relative' },
  favBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  favBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  cardBody: { flex: 1, padding: Spacing.md, justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  cardDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice: { fontSize: 17, fontWeight: '900', color: Colors.primary },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  addBtnText: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },

  // Floating cart
  floatingCart: { position: 'absolute', left: Spacing.md, right: Spacing.md },
  floatingCartBtn: { borderRadius: Radius.lg, overflow: 'hidden', ...Shadows.glowStrong },
  floatingCartGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 16, gap: Spacing.sm },
  floatingCartBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  floatingCartBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  floatingCartText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySubtext: { fontSize: 14, marginTop: 6, textAlign: 'center' },

  // Cart sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: SCREEN_H * 0.88, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, gap: Spacing.sm,
  },
  sheetTitle: { fontSize: 22, fontWeight: '900', flex: 1 },
  sheetLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sheetLocText: { fontSize: 12 },
  sheetClose: { padding: 4 },
  sheetItems: { maxHeight: SCREEN_H * 0.45 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetThumb: { width: 52, height: 52, borderRadius: Radius.sm },
  sheetItemName: { fontSize: 14, fontWeight: '700' },
  sheetItemSub: { fontSize: 11, marginTop: 1 },
  sheetItemPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  sheetQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 14, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  emptyCart: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  emptyCartText: { fontSize: 16, fontWeight: '600' },
  pointsRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5,
  },
  pointsLabel: { fontSize: 14, fontWeight: '700' },
  pointsSub: { fontSize: 12, marginTop: 2 },
  pointsCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  totalsBox: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, marginTop: Spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalVal: { fontSize: 14, fontWeight: '700' },
  placeOrderBtn: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  placeOrderGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 18 },
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  placeOrderTotal: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '900' },
})
