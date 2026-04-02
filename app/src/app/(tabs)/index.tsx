import React, { useEffect, useRef, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, MapPin, Zap, Flame, Star } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { menuApi, locationsApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { MenuItemCard } from '../../components/features/MenuItemCard'
import { useCartStore } from '../../stores/cartStore'
import { HeroBanner } from '../../components/ui/HeroBanner'
import { PointsBanner } from '../../components/ui/PointsBanner'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'
import type { MenuItem } from '../../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const FEATURED_CARD_WIDTH = 180
const FEATURED_SNAP_INTERVAL = 194

const CATEGORY_QUICK = [
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'chicken', label: 'Chicken', emoji: '🍗' },
  { id: 'fries', label: 'Fries', emoji: '🍟' },
  { id: 'dessert', label: 'Dessert', emoji: '🍫' },
  { id: 'extras', label: 'Extras', emoji: '🥤' },
]

const PROMOS = [
  {
    id: '1',
    topLabel: '2× POINTS',
    subLabel: 'This weekend only',
    gradientColors: ['#F05A1A', '#C94400'] as const,
    icon: Zap,
  },
  {
    id: '2',
    topLabel: 'NEW DROP',
    subLabel: 'Classic Beef just got better',
    gradientColors: ['#1B2A4A', '#0D1829'] as const,
    icon: Flame,
  },
  {
    id: '3',
    topLabel: 'LOYALTY REWARDS',
    subLabel: 'Redeem your points today',
    gradientColors: ['#16A34A', '#15803D'] as const,
    icon: Star,
  },
]

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StaggerSection({ index, children, style }: { index: number, children: React.ReactNode, style?: any }) {
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(24)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 380, delay: index * 80, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[style, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  )
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const [activeCategory, setActiveCategory] = useState('burgers')

  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['menu', 'featured'],
    queryFn: menuApi.getFeatured,
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  })

  const handleCategoryPress = (id: string) => {
    setActiveCategory(id)
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    router.push('/(tabs)/menu')
  }

  const loyaltyPoints = user?.loyalty_points ?? 0
  const loyaltyTier = loyaltyPoints >= 5000 ? 'Gold' : loyaltyPoints >= 1000 ? 'Silver' : 'Bronze'
  const greeting = getTimeGreeting()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <StaggerSection index={0} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.text }]}>Hey {firstName} 👋</Text>
            <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>{greeting}</Text>
          </View>
          <Pressable
            style={[styles.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Bell size={20} color={theme.text} />
          </Pressable>
        </StaggerSection>

        {/* ── Hero ── */}
        <StaggerSection index={1} style={styles.heroWrapper}>
          <HeroBanner
            imageUri="https://b60.ae/images/fancy.webp"
            title="SMASH IT."
            subtitle="Bold burgers. Pick up in minutes."
            ctaLabel="ORDER NOW"
            onCtaPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              router.push('/(tabs)/menu')
            }}
            height={260}
          />
          <View style={styles.liveContainer}>
            <Animated.View style={[styles.livePulse, { transform: [{ scale: pulseAnim }], backgroundColor: theme.primary }]} />
            <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </StaggerSection>

        {/* ── Quick Categories ── */}
        <StaggerSection index={2} style={{ marginTop: Spacing.lg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_QUICK.map((cat, idx) => {
              const active = activeCategory === cat.id
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                  style={[
                    styles.categoryChip,
                    active ? { backgroundColor: theme.black, borderColor: theme.black, ...Shadows.hard } 
                           : { backgroundColor: theme.surface, borderColor: theme.border },
                    { transform: [{ rotate: idx % 2 === 0 ? '-1.5deg' : '1.5deg' }] }
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, { color: active ? theme.white : theme.textSecondary }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </StaggerSection>

        {/* ── Points ── */}
        {user && (
          <StaggerSection index={3} style={{ marginTop: Spacing.md }}>
            <PointsBanner
              points={loyaltyPoints}
              tier={loyaltyTier as any}
              aedValue={loyaltyPoints * 0.05}
              onPress={() => router.push('/(tabs)/loyalty')}
            />
          </StaggerSection>
        )}

        {/* ── Promos ── */}
        <StaggerSection index={user ? 4 : 3} style={{ marginTop: Spacing.lg }}>
          <SectionHeader title="Street Offers" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRow}>
            {PROMOS.map((promo) => {
              const Icon = promo.icon
              return (
                <Pressable key={promo.id} style={[styles.promoCardWrapper, Shadows.hard]}>
                  <LinearGradient colors={promo.gradientColors} style={styles.promoCard}>
                    <Icon size={18} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.promoTitle}>{promo.topLabel}</Text>
                    <Text style={styles.promoSub}>{promo.subLabel}</Text>
                  </LinearGradient>
                </Pressable>
              )
            })}
          </ScrollView>
        </StaggerSection>

        {/* ── Featured ── */}
        <StaggerSection index={user ? 5 : 4} style={{ marginTop: Spacing.lg }}>
          <SectionHeader title="FAN FAVOURITES" onSeeAll={() => router.push('/(tabs)/menu')} />
          {loadingFeatured ? (
            <View style={[styles.featuredRow, { flexDirection: 'row' }]}>
              {[1, 2].map(i => <SkeletonLoader key={i} variant="card" width={FEATURED_CARD_WIDTH} height={220} />)}
            </View>
          ) : (
            <FlatList
              data={featured}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
              renderItem={({ item }) => (
                <View style={{ width: FEATURED_CARD_WIDTH }}>
                  <MenuItemCard 
                    item={item} 
                    onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })} 
                    onAddToCart={() => {
                      addItem(item, 1, [])
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    }}
                  />
                </View>
              )}
            />
          )}
        </StaggerSection>

        {/* ── Locations ── */}
        <StaggerSection index={user ? 6 : 5} style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxl }}>
          <SectionHeader title="Find Us" onSeeAll={() => router.push('/(tabs)/map')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationRow}>
            {(locations ?? []).map((loc: any) => (
              <Pressable key={loc.id} style={[styles.locationCard, { backgroundColor: theme.surface, borderColor: theme.border }, Shadows.card]}>
                <View style={styles.locationTopRow}>
                  <Text style={[styles.locationCity, { color: theme.primary }]}>{loc.city}</Text>
                  <View style={[styles.openDot, { backgroundColor: loc.is_open !== false ? theme.success : theme.error }]} />
                </View>
                <Text style={[styles.locationName, { color: theme.text }]}>{loc.name}</Text>
                <Text style={[styles.locationAddr, { color: theme.textSecondary }]} numberOfLines={1}>{loc.address}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </StaggerSection>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  greetingSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  heroWrapper: { position: 'relative' },
  liveContainer: {
    position: 'absolute', bottom: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  livePulse: { position: 'absolute', left: 10, width: 10, height: 10, borderRadius: 5, opacity: 0.5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 2 },
  liveLabel: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  categoryRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderWidth: 2,
  },
  categoryLabel: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  promoRow: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  promoCardWrapper: { borderRadius: Radius.lg, overflow: 'hidden' },
  promoCard: { width: 220, height: 120, padding: Spacing.md, justifyContent: 'flex-end', gap: 4 },
  promoTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', textTransform: 'uppercase' },
  promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  featuredRow: { paddingHorizontal: Spacing.md, gap: 16 },
  locationRow: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  locationCard: { width: 180, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1.5 },
  locationTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  locationCity: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  openDot: { width: 8, height: 8, borderRadius: 4 },
  locationName: { fontSize: 15, fontWeight: '900' },
  locationAddr: { fontSize: 12, marginTop: 4 },
})

