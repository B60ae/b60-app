import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, Modal, Dimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  ShoppingBag, MapPin, X, Minus, Plus, Trash2,
  ChevronLeft, ChevronRight, Store, Truck, Search,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, FadeInDown, FadeOutDown,
} from 'react-native-reanimated'
import { menuApi, locationsApi, ordersApi } from '../../services/api'
import { Events } from '../../services/analytics'
import { SkeletonGrid } from '../../components/ui/SkeletonLoader'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { V3, LightTheme, DarkTheme, Colors, Shadows } from '../../utils/theme'
import { Toast } from '../../components/ui/Toast'
import { POINTS_TO_AED, MIN_REDEEM_POINTS } from '../../utils/constants'
import type { MenuItem } from '../../types'

const STEP = 100
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const CARD_W = Math.floor((SCREEN_W - 37) / 2) // 18px padding each side, 1px center gap
type Step = 'method' | 'location' | 'menu'

type ListRow =
  | { type: 'header'; label: string; key: string }
  | { type: 'item'; item: MenuItem; key: string }

type GridRow =
  | { type: 'header'; label: string; key: string }
  | { type: 'pair'; left: MenuItem; right: MenuItem | null; key: string }

function useTheme() {
  const themeMode = useThemeStore((s) => s.themeMode)
  return themeMode === 'light' ? LightTheme : DarkTheme
}

// ─── Menu Row (v3 list style) ────────────────────────────────────────────────────────────────
// Single-column: text left, photo right 96×88 with 14px radius, gold add btn

function MenuCard({ item, onPress, onAdd }: {
  item: MenuItem; onPress: () => void; onAdd: () => void
}) {
  const addScale = useSharedValue(1)
  const addAnim = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }))

  const handleAdd = () => {
    if (!item.is_available) return
    addScale.value = withSequence(
      withSpring(0.6, { damping: 4, stiffness: 800 }),
      withSpring(1, { damping: 6, stiffness: 400 }),
    )
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onAdd()
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!item.is_available}
      style={[styles.menuRow, !item.is_available && { opacity: 0.5 }]}
    >
      <View style={styles.menuRowLeft}>
        {item.is_featured && (
          <View style={styles.favBadge}><Text style={styles.favBadgeText}>Fan fave</Text></View>
        )}
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <Text style={styles.cardPrice}>AED {Number(item.price || 0).toFixed(0)}</Text>
      </View>
      <View style={styles.menuRowImg}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          : <View style={[StyleSheet.absoluteFill, styles.cardImagePlaceholder]}>
              <Text style={styles.cardPlaceholderText}>B60</Text>
            </View>
        }
        {!item.is_available && (
          <View style={styles.soldOutOverlay}><Text style={styles.soldOutText}>Sold out</Text></View>
        )}
        <Animated.View style={[styles.addBtn, addAnim]}>
          <Pressable onPress={handleAdd} style={styles.addBtnInner} disabled={!item.is_available} hitSlop={4}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Pressable>
  )
}

// ─── Cart Sheet ───────────────────────────────────────────────────────────────────────
function CartSheet({ visible, onClose, onOrderPlaced }: {
  visible: boolean; onClose: () => void; onOrderPlaced: () => void
}) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
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

  const stepDown = () => { const n = Math.max(0, pointsToRedeem - STEP); setPointsToRedeem(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }
  const stepUp = () => { const n = Math.min(maxRedeemable, pointsToRedeem + STEP); setPointsToRedeem(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }

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
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>

        <View style={[styles.sheetHeader, { borderBottomColor: theme.borderStrong }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>YOUR ORDER</Text>
            {selectedLocation && (
              <View style={styles.sheetLocRow}>
                <MapPin size={10} color={V3.o} />
                <Text style={[styles.sheetLocText, { color: theme.textMuted }]}>{selectedLocation.name.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={16} style={styles.sheetClose}>
            <X size={18} color={theme.textMuted} strokeWidth={2} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingBag size={44} color={theme.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyCartText, { color: theme.textMuted }]}>NOTHING HERE YET</Text>
          </View>
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {items.map((ci, idx) => (
                <View key={`${ci.menu_item.id}-${idx}`} style={[
                  styles.sheetItem,
                  { borderBottomColor: theme.border },
                  idx === items.length - 1 && { borderBottomWidth: 0 },
                ]}>
                  {ci.menu_item.image_url
                    ? <Image source={{ uri: ci.menu_item.image_url }} style={styles.sheetThumb} contentFit="cover" />
                    : <View style={[styles.sheetThumb, { backgroundColor: theme.surface }]} />
                  }
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.sheetItemName, { color: theme.text }]} numberOfLines={1}>{ci.menu_item.name}</Text>
                    {ci.selected_options?.length > 0 && (
                      <Text style={[styles.sheetItemSub, { color: theme.textMuted }]} numberOfLines={1}>
                        {ci.selected_options.map((o) => o.name).join(' · ')}
                      </Text>
                    )}
                    <Text style={styles.sheetItemPrice}>AED {ci.line_total.toFixed(0)}</Text>
                  </View>
                  <View style={styles.sheetQty}>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); ci.quantity > 1 ? updateQuantity(idx, ci.quantity - 1) : removeItem(idx) }}
                      style={[styles.qtyBtn, { borderColor: theme.borderStrong, backgroundColor: theme.surface }]} hitSlop={8}
                    >
                      {ci.quantity === 1 ? <Trash2 size={12} color="#EF4444" /> : <Minus size={12} color={theme.text} />}
                    </Pressable>
                    <Text style={[styles.qtyNum, { color: theme.text }]}>{ci.quantity}</Text>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQuantity(idx, ci.quantity + 1) }}
                      style={[styles.qtyBtn, { borderColor: theme.borderStrong, backgroundColor: theme.surface }]} hitSlop={8}
                    >
                      <Plus size={12} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {canRedeem && (
                <View style={[styles.pointsCard, {
                  borderColor: pointsToRedeem > 0 ? V3.o : theme.borderStrong,
                  backgroundColor: theme.surface,
                }]}>
                  <View style={styles.pointsCardTop}>
                    <Text style={[styles.pointsLabel, { color: theme.text }]}>REDEEM POINTS</Text>
                    <Text style={[styles.pointsSub, { color: theme.textMuted }]}>{userPoints} PTS AVAILABLE</Text>
                    {pointsToRedeem > 0 && (
                      <View style={styles.savingBadge}>
                        <Text style={styles.savingBadgeText}>SAVING AED {discount().toFixed(0)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable onPress={stepDown} disabled={pointsToRedeem <= 0}
                      style={[styles.stepperBtn, { opacity: pointsToRedeem <= 0 ? 0.3 : 1, borderColor: theme.borderStrong, backgroundColor: theme.surface2 }]} hitSlop={8}>
                      <Minus size={14} color={theme.text} />
                    </Pressable>
                    <View style={[styles.stepperValue, { borderColor: pointsToRedeem > 0 ? V3.o : theme.borderStrong, backgroundColor: theme.surface2 }]}>
                      <Text style={[styles.stepperValueText, { color: pointsToRedeem > 0 ? V3.o : theme.textMuted }]}>
                        {pointsToRedeem > 0 ? `${pointsToRedeem} PTS` : '0 PTS'}
                      </Text>
                    </View>
                    <Pressable onPress={stepUp} disabled={pointsToRedeem >= maxRedeemable}
                      style={[styles.stepperBtn, { opacity: pointsToRedeem >= maxRedeemable ? 0.3 : 1, borderColor: theme.borderStrong, backgroundColor: theme.surface2 }]} hitSlop={8}>
                      <Plus size={14} color={theme.text} />
                    </Pressable>
                    <Pressable onPress={() => { setPointsToRedeem(maxRedeemable); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) }}
                      style={[styles.stepperMax, { borderColor: theme.borderStrong }]}>
                      <Text style={styles.stepperMaxText}>MAX</Text>
                    </Pressable>
                    {pointsToRedeem > 0 && (
                      <Pressable onPress={() => { setPointsToRedeem(0); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                        style={[styles.stepperClear, { borderColor: theme.borderStrong }]}>
                        <Text style={[styles.stepperClearText, { color: theme.textMuted }]}>CLR</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              <View style={[styles.totalsBlock, { borderColor: theme.borderStrong }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.textMuted }]}>SUBTOTAL</Text>
                  <Text style={[styles.totalVal, { color: theme.text }]}>AED {subtotal().toFixed(2)}</Text>
                </View>
                {discount() > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: Colors.success }]}>POINTS ({pointsToRedeem})</Text>
                    <Text style={[styles.totalVal, { color: Colors.success }]}>-AED {discount().toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.totalDivider, { backgroundColor: theme.borderStrong }]} />
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabelBig, { color: theme.text }]}>TOTAL</Text>
                  <Text style={styles.totalValBig}>AED {total().toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.placeOrderWrap, { borderTopColor: theme.borderStrong }]}>
              <Pressable
                style={[styles.placeOrderBtn, { opacity: placing ? 0.7 : 1 }]}
                onPress={handlePlaceOrder}
                disabled={placing}
              >
                <Text style={styles.placeOrderText}>
                  {placing ? 'PLACING ORDER...' : `PLACE ORDER — AED ${total().toFixed(0)}`}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
      </View>
    </Modal>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────────────
export default function OrderScreen() {
  const [step, setStep] = useState<Step>('method')
  const [cartVisible, setCartVisible] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchRef = useRef<TextInput>(null)

  const insets = useSafeAreaInsets()
  const theme = useTheme()
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

  // v3: single-column — gridData is just listData directly
  const gridData = listData

  const handleItemPress = useCallback((item: MenuItem) => {
    Haptics.selectionAsync()
    router.push({ pathname: '/item/[id]', params: { id: item.id } } as any)
  }, [])

  const handleAddToCart = useCallback((item: MenuItem) => {
    addItem(item, 1, [])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [addItem])

  const renderGridRow = useCallback(({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{row.label}</Text>
        </View>
      )
    }
    return (
      <MenuCard item={row.item} onPress={() => handleItemPress(row.item)} onAdd={() => handleAddToCart(row.item)} />
    )
  }, [handleItemPress, handleAddToCart])

  const categoryPills = useMemo(() => {
    const dynamic = categories?.map((cat) => ({ id: cat.id, label: cat.name })) ?? []
    return [{ id: null, label: 'All' }, ...dynamic]
  }, [categories])

  // ── Method ──────────────────────────────────────────────────────────────────────────────

  if (step === 'method') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.pageHeader, { borderBottomColor: theme.borderStrong }]}>
          <View style={styles.b60Box}><Text style={styles.b60Text}>B60</Text></View>
          <Text style={[styles.pageTitle, { color: theme.text }]}>ORDER</Text>
        </View>
        <View style={[styles.subHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.subHeaderText, { color: theme.textMuted }]}>HOW DO YOU WANT IT?</Text>
        </View>

        <Pressable
          style={[styles.methodRow, { borderBottomColor: theme.border }]}
          onPress={() => { Haptics.selectionAsync(); setStep('location') }}
        >
          <Store size={20} color={V3.o} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, { color: theme.text }]}>PICKUP</Text>
            <Text style={[styles.methodSub, { color: theme.textMuted }]}>Order and pay in-app</Text>
          </View>
          <ChevronRight size={18} color={theme.textMuted} strokeWidth={1.5} />
        </Pressable>

        <View style={[styles.methodRow, { borderBottomWidth: 0, opacity: 0.35 }]}>
          <Truck size={20} color={theme.textMuted} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, { color: theme.textMuted }]}>DELIVERY</Text>
            <Text style={[styles.methodSub, { color: theme.textMuted }]}>Coming soon</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Location ───────────────────────────────────────────────────────────────────────────

  if (step === 'location') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.pageHeader, { borderBottomColor: theme.borderStrong }]}>
          <Pressable onPress={() => setStep('method')} hitSlop={12} style={styles.backBtn}>
            <ChevronLeft size={20} color={theme.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.pageTitle, { color: theme.text }]}>CHOOSE BRANCH</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {(locations ?? []).map((loc: any, idx: number) => {
            const isOpen = loc.is_open !== false
            const isSelected = loc.id === locationId
            return (
              <Pressable
                key={loc.id}
                style={[
                  styles.locationRow,
                  { borderBottomColor: theme.border, borderLeftWidth: isSelected ? 3 : 0, borderLeftColor: V3.o },
                  !isOpen && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (!isOpen) return
                  Haptics.selectionAsync()
                  setLocation(loc.id)
                  setStep('menu')
                }}
                disabled={!isOpen}
              >
                <Text style={[styles.locationNum, { color: V3.o }]}>{String(idx + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locationName, { color: theme.text }]}>{loc.name}</Text>
                  {loc.address && (
                    <Text style={[styles.locationAddr, { color: theme.textMuted }]} numberOfLines={1}>{loc.address}</Text>
                  )}
                  {loc.hours && (
                    <Text style={[styles.locationAddr, { color: theme.textMuted }]}>{loc.hours}</Text>
                  )}
                </View>
                <View style={[styles.openPill, { backgroundColor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,100,100,0.08)' }]}>
                  <View style={[styles.openDot, { backgroundColor: isOpen ? Colors.success : theme.textMuted }]} />
                  <Text style={[styles.openPillText, { color: isOpen ? Colors.success : theme.textMuted }]}>
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

  // ── Menu ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>

      <View style={[styles.menuHeader, { borderBottomColor: theme.borderStrong }]}>
        <View style={styles.menuHeaderTop}>
          <Pressable onPress={() => setStep('location')} hitSlop={12} style={styles.backBtn}>
            <ChevronLeft size={20} color={theme.text} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>ORDER</Text>
            {selectedLocation && (
              <Text style={[styles.menuLocLabel, { color: theme.textMuted }]}>{selectedLocation.name.toUpperCase()}</Text>
            )}
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCartVisible(true) }}
            style={styles.cartBtn}
            hitSlop={8}
          >
            <ShoppingBag size={20} color={V3.w} strokeWidth={1.8} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Search size={14} color={theme.textMuted} strokeWidth={2} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="SEARCH..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(''); searchRef.current?.focus() }} hitSlop={10}>
              <X size={14} color={theme.textMuted} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillsRow, { borderTopColor: theme.border }]}>
          {categoryPills.map((cat, idx) => {
            const isActive = activeCategoryId === cat.id
            const isLast = idx === categoryPills.length - 1
            return (
              <Pressable
                key={String(cat.id)}
                onPress={() => { Haptics.selectionAsync(); setActiveCategoryId(cat.id); setSearch('') }}
                style={[
                  styles.pill,
                  { backgroundColor: isActive ? V3.w : 'transparent', borderColor: isActive ? V3.w : V3.ln },
                ]}
              >
                <Text style={[styles.pillLabel, { color: isActive ? V3.s : V3.w }]}>
                  {cat.label.toUpperCase()}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : gridData.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {search.trim() ? `NO RESULTS FOR "${search.toUpperCase()}"` : 'NOTHING HERE YET'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={gridData}
          keyExtractor={(row) => row.key}
          estimatedItemSize={104}
          renderItem={renderGridRow}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: cartCount > 0 ? 100 : 24 }}
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
            <ChevronRight size={18} color="#FFFDF8" strokeWidth={2} />
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
  container: { flex: 1 },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: V3.ln,
  },
  b60Box: {
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: V3.o, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  b60Text: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 14, color: '#FFFDF8',
    letterSpacing: -0.3,
  },
  pageTitle: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 20, letterSpacing: -0.2, color: V3.w,
  },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },

  subHeader: { paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1 },
  subHeaderText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase',
  },

  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 20, borderBottomWidth: 1,
  },
  methodLabel: {
    fontFamily: 'Archivo_900Black', fontSize: 15, textTransform: 'uppercase',
  },
  methodSub: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 3,
  },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 18, borderBottomWidth: 1,
  },
  locationNum: {
    fontFamily: 'Archivo_900Black', fontSize: 15, letterSpacing: -0.3, width: 28,
  },
  locationName: {
    fontFamily: 'Archivo_900Black', fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.2,
  },
  locationAddr: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 1, marginTop: 3, textTransform: 'uppercase',
  },
  openPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5,
  },
  openDot: { width: 5, height: 5, borderRadius: 3 },
  openPillText: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase',
  },

  menuHeader: { borderBottomWidth: 2 },
  menuHeaderTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10,
  },
  menuLocLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 8.5, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 2,
  },
  cartBtn: {
    width: 38, height: 38, backgroundColor: V3.s, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.iconBtn,
  },
  cartBadge: {
    position: 'absolute', top: -3, right: -3, backgroundColor: V3.o,
    minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 8, color: '#FFFDF8',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginVertical: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: V3.s, borderRadius: 14, borderWidth: 1, borderColor: V3.ln,
  },
  searchInput: {
    flex: 1, fontFamily: 'Archivo_400Regular', fontSize: 14,
    color: V3.w, padding: 0,
  },
  pillsRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: V3.ln,
  },
  pillLabel: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
  },

  sectionHeader: {
    paddingVertical: 10, paddingHorizontal: 2, marginTop: 8, marginBottom: 4,
  },
  sectionHeaderText: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 18, letterSpacing: -0.2, color: V3.w,
  },
  // v3 list row
  menuRow: {
    flexDirection: 'row',
    backgroundColor: V3.s,
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: 96,
    ...Shadows.card,
  },
  menuRowLeft: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    gap: 4,
  },
  menuRowImg: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    margin: 8,
    alignSelf: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  cardImagePlaceholder: {
    backgroundColor: V3.s2, alignItems: 'center', justifyContent: 'center',
  },
  cardPlaceholderText: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 11, color: V3.dim2, letterSpacing: 1,
  },
  favBadge: {
    backgroundColor: V3.gold,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    alignSelf: 'flex-start', marginBottom: 2,
  },
  favBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 8, color: V3.w, letterSpacing: 0.8,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,18,6,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  soldOutText: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, color: '#FFFDF8', letterSpacing: 1,
  },
  cardName: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 14, color: V3.w, lineHeight: 17,
  },
  cardDesc: {
    fontFamily: 'Archivo_400Regular', fontSize: 12, color: V3.dim, lineHeight: 17,
  },
  cardPrice: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.4,
    color: V3.od, textTransform: 'uppercase', marginTop: 4,
  },
  addBtn: {
    position: 'absolute', bottom: -2, right: -2,
    width: 30, height: 30, borderRadius: 999,
    backgroundColor: V3.gold,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(151,64,15,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  addBtnInner: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  addBtnText: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 18, color: V3.w, lineHeight: 22,
  },

  floatingCart: { position: 'absolute', left: 18, right: 18 },
  floatingCartBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 12,
    backgroundColor: V3.o, borderRadius: 999,
    shadowColor: 'rgba(151,64,15,0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
  },
  floatingCartBadge: {
    backgroundColor: 'rgba(255,253,248,0.25)', minWidth: 26, height: 26,
    borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  floatingCartBadgeText: {
    fontFamily: 'Archivo_800ExtraBold', color: '#FFFDF8', fontSize: 13,
  },
  floatingCartText: {
    flex: 1, fontFamily: 'Archivo_800ExtraBold', color: '#FFFDF8', fontSize: 15,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', textAlign: 'center',
  },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(30,18,6,0.5)' },
  sheet: { maxHeight: SCREEN_H * 0.88, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHeader: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: V3.ln, flexDirection: 'row', alignItems: 'flex-start',
  },
  sheetTitle: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 20, color: V3.w,
  },
  sheetLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sheetLocText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  sheetClose: { padding: 4, marginLeft: 12 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1,
  },
  sheetThumb: { width: 48, height: 48 },
  sheetItemName: {
    fontFamily: 'Archivo_900Black', fontSize: 12, textTransform: 'uppercase',
  },
  sheetItemSub: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2,
  },
  sheetItemPrice: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.5, color: '#F05A1A', marginTop: 3,
  },
  sheetQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 32, height: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  qtyNum: {
    fontFamily: 'Archivo_900Black', fontSize: 13, minWidth: 18, textAlign: 'center',
  },
  emptyCart: { alignItems: 'center', justifyContent: 'center', padding: 56, gap: 12 },
  emptyCartText: {
    fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase',
  },

  pointsCard: { marginHorizontal: 18, marginTop: 12, padding: 14, gap: 10, borderWidth: 2 },
  pointsCardTop: { gap: 3 },
  pointsLabel: { fontFamily: 'Archivo_900Black', fontSize: 12, textTransform: 'uppercase' },
  pointsSub: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  savingBadge: {
    backgroundColor: Colors.success, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2,
  },
  savingBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium', color: '#fff', fontSize: 9, letterSpacing: 1.2,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperBtn: { width: 38, height: 38, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { flex: 1, height: 38, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperValueText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, letterSpacing: 1.5 },
  stepperMax: {
    height: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F05A1A', borderWidth: 1.5,
  },
  stepperMaxText: { fontFamily: 'JetBrainsMono_500Medium', color: '#fff', fontSize: 9, letterSpacing: 1.5 },
  stepperClear: { height: 38, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  stepperClearText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, letterSpacing: 1.5 },

  totalsBlock: { marginHorizontal: 18, marginTop: 12, borderWidth: 2, padding: 14, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  totalVal: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.2 },
  totalDivider: { height: 2, marginVertical: 4 },
  totalLabelBig: { fontFamily: 'Archivo_900Black', fontSize: 15, textTransform: 'uppercase' },
  totalValBig: { fontFamily: 'Archivo_900Black', fontSize: 17, color: '#F05A1A' },

  placeOrderWrap: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: V3.ln },
  placeOrderBtn: {
    backgroundColor: V3.o, paddingVertical: 17, paddingHorizontal: 20,
    borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(151,64,15,0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
  },
  placeOrderText: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 15, color: '#FFFDF8', letterSpacing: 0.2,
  },
})
