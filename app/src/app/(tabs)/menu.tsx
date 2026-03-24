import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { menuApi } from '../../services/api'
import { MenuItemCard } from '../../components/features/MenuItemCard'
import { useCartStore } from '../../stores/cartStore'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import type { MenuItem } from '../../types'

export default function MenuScreen() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const addItem = useCartStore((s) => s.addItem)

  const { data: categories } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: menuApi.getCategories,
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ['menu', 'items', activeCategoryId],
    queryFn: () => menuApi.getItems(activeCategoryId ?? undefined),
  })

  const handleItemPress = (item: MenuItem) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.sub}>Made fresh. Every order.</Text>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={styles.categoriesContent}
      >
        <Pressable
          style={[styles.pill, !activeCategoryId && styles.pillActive]}
          onPress={() => setActiveCategoryId(null)}
        >
          <Text style={[styles.pillText, !activeCategoryId && styles.pillTextActive]}>All</Text>
        </Pressable>
        {categories?.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.pill, activeCategoryId === cat.id && styles.pillActive]}
            onPress={() => setActiveCategoryId(cat.id)}
          >
            <Text style={[styles.pillText, activeCategoryId === cat.id && styles.pillTextActive]}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Items Grid */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <MenuItemCard
              item={item}
              onPress={handleItemPress}
              onQuickAdd={(i) => addItem(i, 1, [])}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 28, fontWeight: '900', color: Colors.white },
  sub: { ...Typography.bodySmall },
  categories: { maxHeight: 52 },
  categoriesContent: { paddingHorizontal: Spacing.lg, gap: 8 },
  pill: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
  grid: { padding: Spacing.md, gap: Spacing.md },
  row: { gap: Spacing.md },
  gridItem: { flex: 1 },
})
