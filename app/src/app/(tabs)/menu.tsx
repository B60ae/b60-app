import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Search, X } from 'lucide-react-native'
import { menuApi } from '../../services/api'
import { MenuItemCard } from '../../components/features/MenuItemCard'
import { SkeletonGrid } from '../../components/ui/SkeletonLoader'
import { useCartStore } from '../../stores/cartStore'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

// ─── Category config ───────────────────────────────────────────────────────────

interface CategoryConfig {
  id: string | null
  label: string
  emoji: string
  slug?: string
}

const STATIC_CATEGORIES: CategoryConfig[] = [
  { id: null, label: 'All', emoji: '✨' },
]

const CATEGORY_EMOJIS: Record<string, string> = {
  burgers: '🍔',
  chicken: '🍗',
  fries: '🍟',
  sides: '🍟',
  drinks: '🥤',
  extras: '🥤',
  dessert: '🍨',
  desserts: '🍨',
}

// ─── CategoryPill ──────────────────────────────────────────────────────────────

interface PillProps {
  label: string
  emoji: string
  isActive: boolean
  onPress: () => void
  pillWidth: number
}

function CategoryPill({ label, emoji, isActive, onPress, pillWidth }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        { width: pillWidth },
        isActive ? styles.pillActive : styles.pillInactive,
      ]}
    >
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text
        style={[styles.pillLabel, isActive ? styles.pillLabelActive : styles.pillLabelInactive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ─── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{label.toUpperCase()}</Text>
    </View>
  )
}

// ─── Types for FlashList data ──────────────────────────────────────────────────

type ListRow =
  | { type: 'header'; label: string; key: string }
  | { type: 'pair'; left: MenuItem; right: MenuItem | null; key: string }

// ─── MenuScreen ────────────────────────────────────────────────────────────────

const PILL_WIDTH = 104
const PILL_GAP = 8

export default function MenuScreen() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchRef = useRef<TextInput>(null)
  const addItem = useCartStore((s) => s.addItem)

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: categories } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: menuApi.getCategories,
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ['menu', 'items', activeCategoryId],
    queryFn: () => menuApi.getItems(activeCategoryId ?? undefined),
  })

  // ── Filter ───────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!items) return []
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q),
    )
  }, [items, search])

  const totalCount = items?.length ?? 0

  // ── Category list for pills ──────────────────────────────────────────────────

  const categoryPills: CategoryConfig[] = useMemo(() => {
    const dynamic: CategoryConfig[] =
      categories?.map((cat) => ({
        id: cat.id,
        label: cat.name,
        emoji: CATEGORY_EMOJIS[cat.slug?.toLowerCase() ?? ''] ?? '🍽️',
        slug: cat.slug,
      })) ?? []
    return [...STATIC_CATEGORIES, ...dynamic]
  }, [categories])

  // ── FlashList data — grouped rows ────────────────────────────────────────────

  const listData: ListRow[] = useMemo(() => {
    const rows: ListRow[] = []

    if (search.trim() || !categories?.length) {
      // Flat pairs — no headers
      for (let i = 0; i < filtered.length; i += 2) {
        rows.push({
          type: 'pair',
          left: filtered[i],
          right: filtered[i + 1] ?? null,
          key: `pair-${filtered[i].id}`,
        })
      }
      return rows
    }

    // Grouped by category when no search active
    if (activeCategoryId) {
      // Single category — no header needed
      for (let i = 0; i < filtered.length; i += 2) {
        rows.push({
          type: 'pair',
          left: filtered[i],
          right: filtered[i + 1] ?? null,
          key: `pair-${filtered[i].id}`,
        })
      }
    } else {
      // All categories grouped
      for (const cat of categories) {
        const catItems = filtered.filter((item) => item.category_id === cat.id)
        if (!catItems.length) continue
        rows.push({ type: 'header', label: cat.name, key: `header-${cat.id}` })
        for (let i = 0; i < catItems.length; i += 2) {
          rows.push({
            type: 'pair',
            left: catItems[i],
            right: catItems[i + 1] ?? null,
            key: `pair-${catItems[i].id}`,
          })
        }
      }
    }

    return rows
  }, [filtered, search, categories, activeCategoryId])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleItemPress = useCallback((item: MenuItem) => {
    Haptics.selectionAsync()
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }, [])

  const handleAddToCart = useCallback(
    (item: MenuItem) => {
      addItem(item, 1, [])
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
    [addItem],
  )

  const handleCategoryPress = useCallback((id: string | null) => {
    Haptics.selectionAsync()
    setActiveCategoryId(id)
    setSearch('')
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearch('')
    searchRef.current?.focus()
  }, [])

  // ── Render row ───────────────────────────────────────────────────────────────

  const renderRow = useCallback(
    ({ item: row }: { item: ListRow }) => {
      if (row.type === 'header') {
        return <SectionHeader label={row.label} />
      }

      return (
        <View style={styles.row}>
          <View style={styles.gridItem}>
            <MenuItemCard
              item={row.left}
              onPress={() => handleItemPress(row.left)}
              onAddToCart={() => handleAddToCart(row.left)}
            />
          </View>
          {row.right ? (
            <View style={styles.gridItem}>
              <MenuItemCard
                item={row.right}
                onPress={() => handleItemPress(row.right!)}
                onAddToCart={() => handleAddToCart(row.right!)}
              />
            </View>
          ) : (
            <View style={styles.gridItem} />
          )}
        </View>
      )
    },
    [handleItemPress, handleAddToCart],
  )

  // ── Pills snap interval ───────────────────────────────────────────────────────

  const pillSnapInterval = PILL_WIDTH + PILL_GAP

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Our Menu</Text>
          {totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalCount} items</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search burgers, chicken..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="never"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={10}>
              <View style={styles.clearBtn}>
                <X size={11} color={Colors.white} strokeWidth={2.5} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Category pills */}
      <View style={styles.pillsWrapper}>
        <FlatList
          data={categoryPills}
          keyExtractor={(c) => String(c.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={pillSnapInterval}
          decelerationRate="fast"
          contentContainerStyle={styles.pillsContent}
          renderItem={({ item: cat }) => (
            <CategoryPill
              label={cat.label}
              emoji={cat.emoji}
              isActive={activeCategoryId === cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              pillWidth={PILL_WIDTH}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ width: PILL_GAP }} />}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>
            {search.trim()
              ? `No results for "${search.trim()}"`
              : 'Nothing here yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {search.trim() ? 'Try something else' : 'Check back soon'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={listData}
          keyExtractor={(row) => row.key}
          estimatedItemSize={250}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemType={(row) => row.type}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'center',
    marginTop: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },

  // Search
  searchWrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : Spacing.sm,
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
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pills
  pillsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  pillsContent: {
    paddingHorizontal: Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    gap: 5,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    ...Shadows.glow,
  },
  pillInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillEmoji: {
    fontSize: 13,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillLabelActive: {
    color: Colors.white,
  },
  pillLabelInactive: {
    color: Colors.textSecondary,
  },

  // Section headers
  sectionHeader: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },

  // Grid
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
})
