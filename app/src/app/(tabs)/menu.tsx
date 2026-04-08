import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Search, X } from 'lucide-react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated'
import { menuApi } from '../../services/api'
import { SkeletonGrid } from '../../components/ui/SkeletonLoader'
import { useCartStore } from '../../stores/cartStore'
import { useThemeStore } from '../../stores/themeStore'
import { LightTheme, DarkTheme, Spacing, Radius } from '../../utils/theme'
import { DirhamSymbol } from '../../components/ui/DirhamSymbol'
import type { MenuItem } from '../../types'

// ─── Category config ───────────────────────────────────────────────────────────

// ─── MenuItem Row Card ─────────────────────────────────────────────────────────

function MenuCard({ item, onPress, onAdd }: {
  item: MenuItem
  onPress: () => void
  onAdd: () => void
}) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme
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
        {/* Image */}
        <View style={styles.cardImage}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={[styles.placeholderText, { color: T.textMuted }]}>B60</Text>
            </View>
          )}

          {item.is_featured && (
            <View style={styles.fanFavBadge}>
              <Text style={styles.fanFavText}>FAV</Text>
            </View>
          )}

          {!item.is_available && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: T.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={[styles.cardDesc, { color: T.textMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.cardFooter}>
            <View style={styles.priceRow}>
              <Text style={styles.cardPrice}>AED {Number(item.price || 0).toFixed(0)}</Text>
            </View>
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

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ label, T }: { label: string; T: any }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={[styles.sectionHeaderText, { color: T.text }]}>{label.toUpperCase()}</Text>
    </View>
  )
}

// ─── List row types ────────────────────────────────────────────────────────────

type ListRow =
  | { type: 'header'; label: string; key: string }
  | { type: 'item'; item: MenuItem; key: string }

// ─── MenuScreen ────────────────────────────────────────────────────────────────

export default function MenuScreen() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchRef = useRef<TextInput>(null)
  const addItem = useCartStore((s) => s.addItem)
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

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
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q),
    )
  }, [items, search])

  const totalCount = items?.length ?? 0

  // ── FlashList data — single-column with headers ───────────────────────────

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

  const handleCategoryPress = useCallback((id: string | null) => {
    Haptics.selectionAsync()
    setActiveCategoryId(id)
    setSearch('')
  }, [])

  const renderRow = useCallback(({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') return <SectionHeader label={row.label} T={T} />
    return (
      <MenuCard
        item={row.item}
        onPress={() => handleItemPress(row.item)}
        onAdd={() => handleAddToCart(row.item)}
      />
    )
  }, [T, handleItemPress, handleAddToCart])

  const categoryPills = useMemo(() => {
    const dynamic = categories?.map((cat) => ({
      id: cat.id,
      label: cat.name,
    })) ?? []
    return [{ id: null, label: 'All' }, ...dynamic]
  }, [categories])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: T.text }]}>MENU</Text>
            {totalCount > 0 && (
              <Text style={[styles.headerSub, { color: T.textMuted }]}>{totalCount} items available</Text>
            )}
          </View>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {categoryPills.map((cat) => {
            const isActive = activeCategoryId === cat.id
            return (
              <Pressable
                key={String(cat.id)}
                onPress={() => handleCategoryPress(cat.id)}
                style={[
                  styles.pill,
                  isActive
                    ? { backgroundColor: '#F05A1A', borderColor: '#F05A1A' }
                    : { backgroundColor: T.surface, borderColor: T.border },
                ]}
              >
                <Text style={[styles.pillLabel, { color: isActive ? '#fff' : T.textSecondary }]}>
                  {cat.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
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
  container: { flex: 1 },

  // Header
  header: {
    paddingTop: Spacing.sm,
    paddingBottom: 0,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 34,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    gap: Spacing.sm,
    borderWidth: 1,
    marginHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearBtn: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Pills
  pillsContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionAccent: {
    width: 4, height: 18,
    backgroundColor: '#F05A1A',
    borderRadius: 2,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // List
  listContent: { paddingBottom: 100, paddingTop: Spacing.sm },

  // Card — full-width horizontal layout
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInner: {
    flexDirection: 'row',
    height: 110,
  },
  cardImage: {
    width: 110,
    height: 110,
    position: 'relative',
  },
  fanFavBadge: {
    position: 'absolute',
    top: 8, left: 8,
    backgroundColor: '#F05A1A',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fanFavText: {
    fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.8,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1,
  },
  placeholderText: {
    fontSize: 11, fontWeight: '900', letterSpacing: 2,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#F05A1A',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F05A1A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F05A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  addBtnText: {
    fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26,
  },

  // Empty
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48,
  },
  emptyText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySubtext: { fontSize: 14, marginTop: 6, textAlign: 'center' },
})
