import React, { useEffect, useRef } from 'react'
import { ScrollView, View, Text, StyleSheet, Pressable, Animated, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, MapPin, ChevronRight, Flame, Star, Zap } from 'lucide-react-native'
import { menuApi, locationsApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { MenuItemCard } from '../../components/features/MenuItemCard'
import { useCartStore } from '../../stores/cartStore'
import { HeroBanner } from '../../components/ui/HeroBanner'
import { PointsBanner } from '../../components/ui/PointsBanner'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

const CATEGORY_QUICK = [
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'chicken', label: 'Chicken', emoji: '🍗' },
  { id: 'fries', label: 'Fries', emoji: '🍟' },
  { id: 'dessert', label: 'Dessert', emoji: '🍫' },
  { id: 'extras', label: 'Extras', emoji: '🥤' },
]

const PROMOS = [
  { id: '1', title: 'Double Points', subtitle: 'This weekend only', color: '#F05A1A', icon: Zap },
  { id: '2', title: 'New Drop', subtitle: 'Try the Vegas Smash', color: '#1B2A4A', icon: Flame },
  { id: '3', title: 'Loyalty Rewards', subtitle: 'Redeem your points', color: '#22A855', icon: Star },
]

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['menu', 'featured'],
    queryFn: menuApi.getFeatured,
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  })

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60 }),
    ]).start()
  }, [])

  const handleItemPress = (item: MenuItem) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }

  const handleQuickAdd = (item: MenuItem) => {
    addItem(item, 1, [])
  }

  const loyaltyPoints = user?.loyalty_points ?? 0
  const loyaltyTier = loyaltyPoints >= 5000 ? 'Gold' : loyaltyPoints >= 1000 ? 'Silver' : 'Bronze'
  const aedValue = loyaltyPoints * 0.05

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.greeting}>Hey {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.sub}>What are you smashing today?</Text>
          </View>
          <Pressable style={styles.notifBtn}>
            <Bell size={20} color={Colors.text} />
          </Pressable>
        </Animated.View>

        {/* Hero Banner */}
        <HeroBanner
          imageUri="https://b60.ae/images/fancy.webp"
          title="SMASH IT."
          subtitle="Dubai's boldest burgers. Pick up in minutes."
          ctaLabel="Order Now"
          onCtaPress={() => router.push('/(tabs)/menu')}
          height={270}
        />

        {/* Category Quick Jump */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: Spacing.lg }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORY_QUICK.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryChip}
                onPress={() => router.push('/(tabs)/menu')}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Points Banner */}
        {user && (
          <Animated.View style={{ opacity: fadeAnim, marginTop: Spacing.md }}>
            <PointsBanner
              points={loyaltyPoints}
              tier={loyaltyTier}
              aedValue={aedValue}
              onPress={() => router.push('/(tabs)/loyalty')}
            />
          </Animated.View>
        )}

        {/* Promo Strip */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: Spacing.lg }}>
          <SectionHeader title="Offers & News" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoRow}
          >
            {PROMOS.map((promo) => {
              const Icon = promo.icon
              return (
                <Pressable key={promo.id} style={[styles.promoCard, { backgroundColor: promo.color }]}>
                  <Icon size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoSub}>{promo.subtitle}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </Animated.View>

        {/* Fan Favourites */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: Spacing.lg }}>
          <SectionHeader
            title="🔥 Fan Favourites"
            onSeeAll={() => router.push('/(tabs)/menu')}
          />
          {loadingFeatured ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {[1, 2, 3].map((i) => <SkeletonLoader key={i} variant="card" width={180} height={220} style={styles.featuredCard} />)}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
              snapToInterval={196}
              decelerationRate="fast"
            >
              {featured?.map((item) => (
                <View key={item.id} style={styles.featuredCard}>
                  <MenuItemCard item={item} onPress={handleItemPress} onQuickAdd={handleQuickAdd} />
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Locations */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: Spacing.lg, marginBottom: Spacing.xxl }}>
          <SectionHeader title="📍 Our Branches" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationRow}
          >
            {(locations ?? []).map((loc: any) => (
              <View key={loc.id} style={[styles.locationCard, Shadows.card]}>
                <View style={styles.locationHeader}>
                  <MapPin size={14} color={Colors.primary} />
                  <Text style={styles.locationCity}>{loc.city}</Text>
                </View>
                <Text style={styles.locationName}>{loc.name}</Text>
                {loc.address && <Text style={styles.locationAddr} numberOfLines={1}>{loc.address}</Text>}
                <View style={[styles.openDot, { backgroundColor: loc.is_open !== false ? Colors.success : Colors.error }]} />
              </View>
            ))}
          </ScrollView>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  notifBtn: {
    width: 42, height: 42, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    ...Shadows.card,
  },
  categoryRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 72,
    ...Shadows.card,
  },
  categoryEmoji: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: Colors.text },
  promoRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  promoCard: {
    width: 160,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    justifyContent: 'flex-end',
    gap: 4,
    minHeight: 100,
  },
  promoTitle: { fontSize: 15, fontWeight: '800', color: Colors.white },
  promoSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  featuredRow: {
    paddingHorizontal: Spacing.md,
    gap: 4,
  },
  featuredCard: { width: 180 },
  locationRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  locationCard: {
    width: 160,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationCity: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  locationName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  locationAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  openDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
