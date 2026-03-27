import { useState, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { X, Minus, Plus, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { menuApi } from '../../services/api'
import { useCartStore } from '../../stores/cartStore'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { CustomizationOption } from '../../types'

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<CustomizationOption[]>([])
  const [showToast, setShowToast] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const addBtnScale = useRef(new Animated.Value(1)).current
  const qtyScale = useRef(new Animated.Value(1)).current

  const { data: item, isLoading } = useQuery({
    queryKey: ['menu', 'item', id],
    queryFn: () => menuApi.getItem(id!),
    enabled: !!id,
  })

  const toggleOption = (option: CustomizationOption, type: 'single' | 'multi', groupId: string) => {
    if (type === 'single') {
      setSelectedOptions((prev) => [
        ...prev.filter((o) => {
          const inGroup = item?.customizations?.find(c => c.id === groupId)?.options.some(opt => opt.id === o.id)
          return !inGroup
        }),
        option,
      ])
    } else {
      setSelectedOptions((prev) =>
        prev.some((o) => o.id === option.id)
          ? prev.filter((o) => o.id !== option.id)
          : [...prev, option]
      )
    }
  }

  const changeQty = (delta: number) => {
    const next = quantity + delta
    if (next < 1) return
    Animated.sequence([
      Animated.spring(qtyScale, { toValue: 0.85, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(qtyScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start()
    setQuantity(next)
  }

  const optionsCost = selectedOptions.reduce((s, o) => s + o.price_delta, 0)
  const lineTotal = item ? (item.price + optionsCost) * quantity : 0

  const handleAddToCart = () => {
    if (!item) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Animated.sequence([
      Animated.spring(addBtnScale, { toValue: 0.93, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(addBtnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start()
    addItem(item, quantity, selectedOptions)
    setShowToast(true)
  }

  if (isLoading || !item) return null

  return (
    <View style={styles.container}>
      {/* Hero image — 340px with gradient overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0, y: 1 }}
        />
        {/* Floating close button */}
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
          <X size={18} color={Colors.white} />
        </Pressable>
        {/* Name overlay on image */}
        <View style={styles.nameOverlay}>
          <Text style={styles.nameOnImage}>{item.name}</Text>
          {item.calories ? <Text style={styles.caloriesOnImage}>{item.calories} kcal</Text> : null}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Price + Description */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>AED {(item.price + optionsCost).toFixed(0)}</Text>
          {optionsCost > 0 && (
            <Text style={styles.basePrice}>Base AED {item.price.toFixed(0)}</Text>
          )}
        </View>
        {item.description ? (
          <Text style={styles.desc}>{item.description}</Text>
        ) : null}

        {/* Customizations */}
        {item.customizations?.map((group) => (
          <View key={group.id} style={[styles.customGroup, Shadows.card]}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.name}</Text>
              <Text style={styles.groupType}>{group.type === 'single' ? 'Choose one' : 'Pick all that apply'}</Text>
            </View>
            {group.options.map((option) => {
              const isSelected = selectedOptions.some((o) => o.id === option.id)
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => {
                    Haptics.selectionAsync()
                    toggleOption(option, group.type, group.id)
                  }}
                >
                  <View style={[styles.optionCheck, isSelected && styles.optionCheckActive]}>
                    {isSelected && <Check size={12} color={Colors.white} />}
                  </View>
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

        {/* Quantity selector */}
        <View style={styles.qtySection}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={() => changeQty(-1)} hitSlop={8}>
              <Minus size={20} color={Colors.text} />
            </Pressable>
            <Animated.Text style={[styles.qty, { transform: [{ scale: qtyScale }] }]}>
              {quantity}
            </Animated.Text>
            <Pressable style={styles.qtyBtn} onPress={() => changeQty(1)} hitSlop={8}>
              <Plus size={20} color={Colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Add to cart button */}
        <Animated.View style={{ transform: [{ scale: addBtnScale }] }}>
          <Button
            title={`Add to Cart · AED ${lineTotal.toFixed(0)}`}
            onPress={handleAddToCart}
            fullWidth
            size="lg"
          />
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <Toast
        visible={showToast}
        message={`${item.name} added to your cart!`}
        onHide={() => setShowToast(false)}
        actionLabel="View Cart"
        onAction={() => { setShowToast(false); router.push('/(tabs)/cart') }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  imageContainer: {
    width: '100%',
    height: 340,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 20,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  nameOnImage: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caloriesOnImage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  price: { fontSize: 30, fontWeight: '900', color: Colors.primary },
  basePrice: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'line-through' },
  desc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  customGroup: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  groupHeader: { gap: 2 },
  groupTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  groupType: { fontSize: 12, color: Colors.textMuted },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(240,90,26,0.06)' },
  optionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  optionPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qty: { fontSize: 24, fontWeight: '900', color: Colors.text, minWidth: 32, textAlign: 'center' },
})
