import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, FlatList, TextInput, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Search, X } from 'lucide-react-native'
import { menuApi } from '../../services/api'
import { MenuItemCard } from '../../components/features/MenuItemCard'
import { CategoryPill } from '../../components/ui/CategoryPill'
import { SkeletonGrid } from '../../components/ui/SkeletonLoader'
import { useCartStore } from '../../stores/cartStore'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

const CATEGORY_EMOJIS: Record<string, string> = {
  burgers: '🍔', chicken: '🍗', fries: '🍟', dessert: '🍫', extras: '🥤', drinks: '🥤',
}

export default function MenuScreen() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const addItem = useCartStore((s) => s.addItem)

  const { data: categories } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: menuApi.getCategories,
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ['menu', 'items', activeCategoryId],
    queryFn: () => menuApi.getItems(activeCategoryId ?? undefined),
  })

  const filtered = useMemo(() => {
    if (!items) return []
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
  }, [items, search])

  const handleItemPress = (item: MenuItem) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menu</Text>
          <Text style={styles.sub}>Made fresh. Every order.</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search burgers, chicken..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Pills - sticky */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          snapToInterval={120}
          decelerationRate="fast"
        >
          <CategoryPill
            label="All"
            emoji="✨"
            isActive={!activeCategoryId}
            onPress={() => setActiveCategoryId(null)}
          />
          {categories?.map((cat) => (
            <CategoryPill
              key={cat.id}
              label={cat.name}
              emoji={CATEGORY_EMOJIS[cat.slug] ?? '🍽️'}
              isActive={activeCategoryId === cat.id}
              onPress={() => setActiveCategoryId(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Items Grid */}
      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>No items found</Text>
          <Text style={styles.emptySubtext}>Try a different search or category</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  searchWrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.md,
    gap: 0,
  },
  grid: { padding: Spacing.md, paddingBottom: 100 },
  row: { gap: Spacing.sm },
  gridItem: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySubtext: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
})
