import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { X, Minus, Plus, ShoppingCart } from 'lucide-react-native'
import { menuApi } from '../../services/api'
import { useCartStore } from '../../stores/cartStore'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import type { CustomizationOption } from '../../types'

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<CustomizationOption[]>([])
  const addItem = useCartStore((s) => s.addItem)

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

  const optionsCost = selectedOptions.reduce((s, o) => s + o.price_delta, 0)
  const lineTotal = item ? (item.price + optionsCost) * quantity : 0

  const handleAddToCart = () => {
    if (!item) return
    addItem(item, quantity, selectedOptions)
    Alert.alert('Added!', `${item.name} added to cart`, [
      { text: 'Keep shopping', style: 'cancel' },
      { text: 'View Cart', onPress: () => router.push('/(tabs)/cart') },
    ])
  }

  if (isLoading || !item) return null

  return (
    <View style={styles.container}>
      {/* Image */}
      <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <X size={20} color={Colors.white} />
      </Pressable>

      <ScrollView style={styles.content}>
        {/* Name & Price */}
        <View style={styles.header}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>AED {(item.price + optionsCost).toFixed(0)}</Text>
        </View>
        <Text style={styles.desc}>{item.description}</Text>
        {item.calories && <Text style={styles.calories}>{item.calories} kcal</Text>}

        {/* Customizations */}
        {item.customizations?.map((group) => (
          <View key={group.id} style={styles.customGroup}>
            <Text style={styles.groupTitle}>{group.name}</Text>
            <Text style={styles.groupType}>{group.type === 'single' ? 'Choose one' : 'Choose all that apply'}</Text>
            {group.options.map((option) => {
              const isSelected = selectedOptions.some((o) => o.id === option.id)
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => toggleOption(option, group.type, group.id)}
                >
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

        {/* Qty + Add */}
        <View style={styles.footer}>
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus size={18} color={Colors.text} />
            </Pressable>
            <Text style={styles.qty}>{quantity}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
              <Plus size={18} color={Colors.text} />
            </Pressable>
          </View>
          <Button
            title={`Add to Cart · AED ${lineTotal.toFixed(0)}`}
            onPress={handleAddToCart}
            fullWidth size="lg"
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  image: { width: '100%', height: 300 },
  closeBtn: {
    position: 'absolute', top: 50, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { flex: 1, fontSize: 24, fontWeight: '900', color: Colors.white },
  price: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  desc: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: 8 },
  calories: { ...Typography.caption, marginBottom: Spacing.md },
  customGroup: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  groupTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  groupType: { ...Typography.caption },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '11' },
  optionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  optionPrice: { ...Typography.caption, color: Colors.primary },
  footer: { gap: Spacing.md, paddingBottom: 40 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  qty: { fontSize: 24, fontWeight: '800', color: Colors.white },
})
