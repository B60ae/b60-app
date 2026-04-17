import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, Pressable, Platform, Animated as RNAnimated,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { X, Minus, Plus, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { menuApi } from '../../services/api'
import { useCartStore } from '../../stores/cartStore'
import { useThemeStore } from '../../stores/themeStore'
import { Toast } from '../../components/ui/Toast'
import { LightTheme, DarkTheme, Spacing, Radius } from '../../utils/theme'
import type { CustomizationOption } from '../../types'

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<CustomizationOption[]>([])
  const [showToast, setShowToast] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  const addBtnScale = useSharedValue(1)
  const qtyScale = useSharedValue(1)
  const scrollY = useRef(new RNAnimated.Value(0)).current
  const imageTranslate = scrollY.interpolate({
    inputRange: [0, 340], outputRange: [0, -80], extrapolate: 'clamp',
  })

  const { data: item, isLoading } = useQuery({
    queryKey: ['menu', 'item', id],
    queryFn: () => menuApi.getItem(id!),
    enabled: !!id,
  })

  const toggleOption = (option: CustomizationOption, type: 'single' | 'multi', groupId: string) => {
    if (type === 'single') {
      setSelectedOptions((prev) => [
        ...prev.filter((o) => {
          const inGroup = item?.customizations?.find((c) => c.id === groupId)?.options.some((opt) => opt.id === o.id)
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
  const lineTotal = item ? (Number(item.price || 0) + optionsCost) * quantity : 0

  const handleAddToCart = () => {
    if (!item) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    addBtnScale.value = withSequence(
      withSpring(0.88, { damping: 6, stiffness: 600 }),
      withSpring(1, { damping: 8, stiffness: 350 }),
    )
    addItem(item, quantity, selectedOptions)
    setShowToast(true)
  }

  const addBtnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }))
  const qtyAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: qtyScale.value }] }))

  if (isLoading || !item) return null

  // Render all customization groups — don't filter by hardcoded ID
  const addons = item.customizations ?? []

  return (
    <View style={[styles.container, { backgroundColor: T.background }]}>

      {/* Hero image */}
      <View style={styles.imageContainer}>
        <RNAnimated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: imageTranslate }] }]}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        </RNAnimated.View>

        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
          <X size={18} color="#fff" strokeWidth={2.5} />
        </Pressable>

        {/* Item name + price overlaid on image */}
        <View style={styles.nameOverlay}>
          {item.is_featured && (
            <View style={styles.fanFavBadge}>
              <Text style={styles.fanFavText}>FAN FAV</Text>
            </View>
          )}
          <Text style={styles.nameOnImage}>{item.name.toUpperCase()}</Text>
          <Text style={styles.priceOnImage}>AED {(Number(item.price || 0) + optionsCost).toFixed(0)}</Text>
        </View>
      </View>

      <RNAnimated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: T.background }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Description */}
        {item.description ? (
          <Text style={[styles.desc, { color: T.textSecondary }]}>{item.description}</Text>
        ) : null}

        {/* Add-ons only — no Heat Level */}
        {addons.map((group: any) => (
          <View key={group.id} style={[styles.addonsCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.addonsTitle, { color: T.text }]}>{(group.name ?? 'ADD-ONS').toUpperCase()}</Text>
            <Text style={[styles.addonsSub, { color: T.textMuted }]}>{group.type === 'single' ? 'Pick one' : 'Pick all that apply'}</Text>
            <View style={styles.addonsList}>
              {group.options.map((option: any) => {
                const isSelected = selectedOptions.some((o) => o.id === option.id)
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.addonRow,
                      { borderColor: isSelected ? '#F05A1A' : T.border },
                      isSelected && { backgroundColor: 'rgba(240,90,26,0.07)' },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync()
                      toggleOption(option, 'multi', group.id)
                    }}
                  >
                    <View style={[
                      styles.addonCheck,
                      { borderColor: isSelected ? '#F05A1A' : T.border },
                      isSelected && { backgroundColor: '#F05A1A', borderColor: '#F05A1A' },
                    ]}>
                      {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                    </View>
                    <Text style={[styles.addonName, { color: isSelected ? '#F05A1A' : T.text }]}>
                      {option.name}
                    </Text>
                    <Text style={[styles.addonPrice, { color: T.textMuted }]}>+AED {option.price_delta}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}

        {/* Quantity */}
        <View style={[styles.qtySection, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.qtyLabel, { color: T.text }]}>QTY</Text>
          <View style={styles.qtyRow}>
            <Pressable
              style={[styles.qtyBtn, { backgroundColor: T.background, borderColor: T.border }, quantity <= 1 && { opacity: 0.35 }]}
              onPress={() => changeQty(-1)}
              hitSlop={8}
              disabled={quantity <= 1}
            >
              <Minus size={18} color={T.text} strokeWidth={2.5} />
            </Pressable>
            <Animated.Text style={[styles.qty, { color: T.text }, qtyAnimStyle]}>{quantity}</Animated.Text>
            <Pressable
              style={[styles.qtyBtn, { backgroundColor: T.background, borderColor: T.border }]}
              onPress={() => changeQty(1)}
              hitSlop={8}
            >
              <Plus size={18} color={T.text} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </RNAnimated.ScrollView>

      {/* Sticky Add to Cart */}
      <View style={styles.stickyCtaWrapper} pointerEvents="box-none">
        <LinearGradient
          colors={[`${T.background}00`, `${T.background}EE`, T.background]}
          style={styles.ctaFade}
          pointerEvents="none"
        />
        <View style={[styles.ctaContainer, { backgroundColor: T.background }]}>
          <Animated.View style={[{ flex: 1 }, addBtnAnimStyle]}>
            <Pressable style={styles.addBtn} onPress={handleAddToCart}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>{quantity}</Text>
              </View>
              <Text style={styles.addBtnText}>ADD TO CART</Text>
              <Text style={styles.addBtnPrice}>AED {lineTotal.toFixed(0)}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {showToast && <Toast
        message={`${item.name} added to cart`}
        onHide={() => setShowToast(false)}
        actionLabel="View Cart"
        onAction={() => {
          setShowToast(false)
          router.push('/(tabs)/cart')
        }}
      />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  imageContainer: { width: '100%', height: 320 },
  image: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radius.full,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  nameOverlay: {
    position: 'absolute', bottom: 20,
    left: Spacing.lg, right: Spacing.lg, gap: 6,
  },
  fanFavBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F05A1A',
    borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 4,
  },
  fanFavText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  nameOnImage: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  priceOnImage: {
    fontSize: 22, fontWeight: '900', color: '#F05A1A',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },

  desc: { fontSize: 14, lineHeight: 22 },

  // Add-ons card
  addonsCard: {
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, gap: Spacing.sm,
  },
  addonsTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  addonsSub: { fontSize: 12, fontWeight: '500', marginTop: -4 },
  addonsList: { gap: 8 },
  addonRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: 12, borderRadius: Radius.md, borderWidth: 1.5,
  },
  addonCheck: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  addonName: { flex: 1, fontSize: 14, fontWeight: '600' },
  addonPrice: { fontSize: 13, fontWeight: '700' },

  // Quantity
  qtySection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1,
  },
  qtyLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  qty: { fontSize: 26, fontWeight: '900', minWidth: 32, textAlign: 'center' },

  // Sticky CTA
  stickyCtaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  ctaFade: { height: 40 },
  ctaContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 8,
    gap: Spacing.sm,
  },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F05A1A', borderRadius: Radius.xl,
    paddingVertical: 16, paddingHorizontal: Spacing.lg,
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  qtyBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full,
    minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, marginRight: 10,
  },
  qtyBadgeText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  addBtnText: { flex: 1, fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  addBtnPrice: { fontSize: 17, fontWeight: '900', color: '#fff' },
})
