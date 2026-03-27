import { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { X, Minus, Plus, Check, ShoppingBag } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import { menuApi } from '../../services/api'
import { useCartStore } from '../../stores/cartStore'
import { Toast } from '../../components/ui/Toast'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { CustomizationOption } from '../../types'

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<CustomizationOption[]>([])
  const [showToast, setShowToast] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const addBtnScale = useSharedValue(1)
  const qtyScale = useSharedValue(1)

  const { data: item, isLoading } = useQuery({
    queryKey: ['menu', 'item', id],
    queryFn: () => menuApi.getItem(id!),
    enabled: !!id,
  })

  const toggleOption = (
    option: CustomizationOption,
    type: 'single' | 'multi',
    groupId: string,
  ) => {
    if (type === 'single') {
      setSelectedOptions((prev) => [
        ...prev.filter((o) => {
          const inGroup = item?.customizations
            ?.find((c) => c.id === groupId)
            ?.options.some((opt) => opt.id === o.id)
          return !inGroup
        }),
        option,
      ])
    } else {
      setSelectedOptions((prev) =>
        prev.some((o) => o.id === option.id)
          ? prev.filter((o) => o.id !== option.id)
          : [...prev, option],
      )
    }
  }

  const changeQty = (delta: number) => {
    const next = quantity + delta
    if (next < 1) return
    qtyScale.value = withSequence(
      withSpring(0.82, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    )
    setQuantity(next)
  }

  const optionsCost = selectedOptions.reduce((s, o) => s + o.price_delta, 0)
  const lineTotal = item ? (item.price + optionsCost) * quantity : 0

  const handleAddToCart = () => {
    if (!item) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    addBtnScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    )
    addItem(item, quantity, selectedOptions)
    setShowToast(true)
  }

  const addBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addBtnScale.value }],
  }))

  const qtyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }))

  if (isLoading || !item) return null

  return (
    <View style={styles.container}>
      {/* Hero image — 340px */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        {/* Gradient overlay: bottom third */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Floating close button — blur background effect */}
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
          <X size={18} color={Colors.white} strokeWidth={2.5} />
        </Pressable>

        {/* Name + calories overlay */}
        <View style={styles.nameOverlay}>
          <Text style={styles.nameOnImage}>{item.name}</Text>
          {item.calories ? (
            <View style={styles.caloriePill}>
              <Text style={styles.caloriesOnImage}>{item.calories} kcal</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // Extra bottom padding for sticky CTA
        contentInset={{ bottom: 100 }}
      >
        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>AED {(item.price + optionsCost).toFixed(0)}</Text>
          {optionsCost > 0 && (
            <Text style={styles.basePrice}>Base AED {item.price.toFixed(0)}</Text>
          )}
        </View>

        {/* Description card */}
        {item.description ? (
          <View style={styles.descCard}>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
        ) : null}

        {/* Customizations */}
        {item.customizations?.map((group) => (
          <View key={group.id} style={styles.customGroup}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.name}</Text>
              <View style={styles.groupTypePill}>
                <Text style={styles.groupType}>
                  {group.type === 'single' ? 'Choose one' : 'Pick all that apply'}
                </Text>
              </View>
            </View>
            {group.options.map((option) => {
              const isSelected = selectedOptions.some((o) => o.id === option.id)
              const isSingle = group.type === 'single'
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync()
                    toggleOption(option, group.type, group.id)
                  }}
                >
                  {/* Custom radio (single) or checkbox (multi) */}
                  {isSingle ? (
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  ) : (
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Check size={12} color={Colors.white} strokeWidth={3} />}
                    </View>
                  )}
                  <Text style={[styles.optionName, isSelected && { color: Colors.primary }]}>
                    {option.name}
                  </Text>
                  {option.price_delta > 0 && (
                    <Text style={styles.optionPrice}>+AED {option.price_delta}</Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        ))}

        {/* Quantity section */}
        <View style={styles.qtySection}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <Pressable
              style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={() => changeQty(-1)}
              hitSlop={8}
            >
              <Minus size={20} color={quantity <= 1 ? Colors.textMuted : Colors.text} strokeWidth={2.5} />
            </Pressable>
            <Animated.Text style={[styles.qty, qtyAnimStyle]}>{quantity}</Animated.Text>
            <Pressable style={styles.qtyBtn} onPress={() => changeQty(1)} hitSlop={8}>
              <Plus size={20} color={Colors.text} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Bottom spacer for sticky CTA */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Sticky add-to-cart */}
      <View style={styles.stickyCtaWrapper} pointerEvents="box-none">
        {/* White fade above button */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.96)', Colors.white]}
          style={styles.ctaFade}
          pointerEvents="none"
        />
        <View style={styles.ctaContainer}>
          <Animated.View style={[{ flex: 1 }, addBtnAnimStyle]}>
            <Pressable style={styles.addBtn} onPress={handleAddToCart}>
              <View style={styles.addBtnLeft}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>{quantity}</Text>
                </View>
                <ShoppingBag size={18} color={Colors.white} strokeWidth={2.5} />
              </View>
              <Text style={styles.addBtnText}>
                Add {quantity > 1 ? `${quantity}× ` : ''}to Cart
              </Text>
              <Text style={styles.addBtnPrice}>AED {lineTotal.toFixed(0)}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <Toast
        visible={showToast}
        message={`${item.name} added to your cart!`}
        onHide={() => setShowToast(false)}
        actionLabel="View Cart"
        onAction={() => {
          setShowToast(false)
          router.push('/(tabs)/cart')
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Hero
  imageContainer: {
    width: '100%',
    height: 340,
  },
  image: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    // backdrop blur approximation via semi-transparent overlay
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 20,
    left: Spacing.lg,
    right: Spacing.lg,
    gap: 6,
  },
  nameOnImage: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    lineHeight: 34,
  },
  caloriePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  caloriesOnImage: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  price: { fontSize: 32, fontWeight: '900', color: Colors.primary },
  basePrice: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },

  // Description card
  descCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  desc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Customization groups
  customGroup: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  groupTypePill: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupType: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(240,90,26,0.06)',
  },
  // Radio (single select) — circular 20px
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  // Checkbox (multi) — square 20px, borderRadius 4
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  optionPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Quantity section
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  qtyLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qty: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
    minWidth: 36,
    textAlign: 'center',
  },

  // Sticky CTA
  stickyCtaWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  ctaFade: {
    height: 60,
  },
  ctaContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 8,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    ...Shadows.glowStrong,
  },
  addBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 'auto' as any,
  },
  qtyBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.white,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  addBtnPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    marginLeft: 'auto' as any,
  },
})
