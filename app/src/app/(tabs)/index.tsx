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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, MapPin, ChevronRight, Flame, Star, Zap } from 'lucide-react-native'
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
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const FEATURED_CARD_WIDTH = 176
const FEATURED_SNAP_INTERVAL = 192

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

// Diagonal stripe overlay for promo cards
function DiagonalStripes() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { left: 30 + i * 55, top: -40 },
          ]}
        />
      ))}
    </View>
  )
}

// Staggered section wrapper
interface StaggerProps {
  index: number
  children: React.ReactNode
  style?: object
}
function StaggerSection({ index, children, style }: StaggerProps) {
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(24)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 380,
        delay: index * 80,
        useNativeDriver: true,
      }),
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
  const [activeCategory, setActiveCategory] = useState('burgers')

  // Pulsing live dot
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

  const handleItemPress = (item: MenuItem) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }

  const handleQuickAdd = (item: MenuItem) => {
    addItem(item, 1, [])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleCategoryPress = (id: string) => {
    setActiveCategory(id)
    Haptics.selectionAsync()
    router.push('/(tabs)/menu')
  }

  const loyaltyPoints = user?.loyalty_points ?? 0
  const loyaltyTier = loyaltyPoints >= 5000 ? 'Gold' : loyaltyPoints >= 1000 ? 'Silver' : 'Bronze'
  const aedValue = loyaltyPoints * 0.05
  const greeting = getTimeGreeting()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── Section 0: Header ── */}
        <StaggerSection index={0} style={styles.header}>
          <View style={styles.headerLeft}>
            {user ? (
              <>
                <Text style={styles.greeting}>Hey {firstName} 👋</Text>
                <Text style={styles.greetingSub}>{greeting}</Text>
              </>
            ) : (
              <>
                <Text style={styles.greeting}>B60 Burgers</Text>
                <Text style={styles.greetingSub}>Dubai's boldest smash burgers</Text>
              </>
            )}
          </View>
          <Pressable
            style={styles.notifBtn}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Bell size={20} color={Colors.text} />
          </Pressable>
        </StaggerSection>

        {/* ── Section 1: Hero Banner + Live Dot ── */}
        <StaggerSection index={1} style={styles.heroWrapper}>
          <HeroBanner
            imageUri="https://b60.ae/images/fancy.webp"
            title="SMASH IT."
            subtitle="Dubai's boldest burgers. Pick up in minutes."
            ctaLabel="Order Now"
            onCtaPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              router.push('/(tabs)/menu')
            }}
            height={280}
          />
          {/* Live indicator */}
          <View style={styles.liveContainer} pointerEvents="none">
            <Animated.View
              style={[
                styles.livePulse,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </StaggerSection>

        {/* ── Section 2: Category pills ── */}
        <StaggerSection index={2} style={{ marginTop: Spacing.lg }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORY_QUICK.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isActive ? styles.categoryChipActive : styles.categoryChipInactive,
                  ]}
                  onPress={() => handleCategoryPress(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isActive ? styles.categoryLabelActive : styles.categoryLabelInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </StaggerSection>

        {/* ── Section 3: Points Banner (logged in only) ── */}
        {user && (
          <StaggerSection index={3} style={{ marginTop: Spacing.md }}>
            <PointsBanner
              points={loyaltyPoints}
              tier={loyaltyTier}
              aedValue={aedValue}
              onPress={() => router.push('/(tabs)/loyalty')}
            />
          </StaggerSection>
        )}

        {/* ── Section 4: Promo Cards ── */}
        <StaggerSection index={user ? 4 : 3} style={{ marginTop: Spacing.lg }}>
          <SectionHeader title="Offers & News" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoRow}
          >
            {PROMOS.map((promo) => {
              const Icon = promo.icon
              return (
                <Pressable
                  key={promo.id}
                  style={styles.promoCardWrapper}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <LinearGradient
                    colors={promo.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.promoCard}
                  >
                    <DiagonalStripes />
                    <Icon size={18} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.promoTitle}>{promo.topLabel}</Text>
                    <Text style={styles.promoSub}>{promo.subLabel}</Text>
                  </LinearGradient>
                </Pressable>
              )
            })}
          </ScrollView>
        </StaggerSection>

        {/* ── Section 5: Featured Items ── */}
        <StaggerSection index={user ? 5 : 4} style={{ marginTop: Spacing.lg }}>
          <SectionHeader
            title="🔥 Fan Favourites"
            onSeeAll={() => router.push('/(tabs)/menu')}
          />
          {loadingFeatured ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
            >
              {[1, 2, 3].map((i) => (
                <SkeletonLoader
                  key={i}
                  variant="card"
                  width={FEATURED_CARD_WIDTH}
                  height={220}
                  style={styles.featuredCard}
                />
              ))}
            </ScrollView>
          ) : (
            <FlatList
              data={featured}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
              snapToInterval={FEATURED_SNAP_INTERVAL}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <View style={styles.featuredCard}>
                  <MenuItemCard
                    item={item}
                    onPress={handleItemPress}
                    onQuickAdd={handleQuickAdd}
                  />
                </View>
              )}
            />
          )}
        </StaggerSection>

        {/* ── Section 6: Locations ── */}
        <StaggerSection
          index={user ? 6 : 5}
          style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxl }}
        >
          <SectionHeader
            title="Pick up at"
            onSeeAll={() => router.push('/(tabs)/map')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationRow}
          >
            {(locations ?? []).map((loc: any) => {
              const isOpen = loc.is_open !== false
              return (
                <Pressable
                  key={loc.id}
                  style={[styles.locationCard, Shadows.card]}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <View style={styles.locationTopRow}>
                    <View style={styles.locationHeaderLeft}>
                      <MapPin size={13} color={Colors.primary} />
                      <Text style={styles.locationCity}>{loc.city}</Text>
                    </View>
                    <View
                      style={[
                        styles.openDot,
                        { backgroundColor: isOpen ? Colors.success : Colors.error },
                      ]}
                    />
                  </View>
                  <Text style={styles.locationName}>{loc.name}</Text>
                  {loc.address ? (
                    <Text style={styles.locationAddr} numberOfLines={1}>
                      {loc.address}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.openBadge,
                      { backgroundColor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.openBadgeText,
                        { color: isOpen ? Colors.success : Colors.error },
                      ]}
                    >
                      {isOpen ? 'Open now' : 'Closed'}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </StaggerSection>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },

  // Hero
  heroWrapper: {
    position: 'relative',
  },
  liveContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  livePulse: {
    position: 'absolute',
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(240, 90, 26, 0.5)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F05A1A',
    marginLeft: 2,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Category pills
  categoryRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6,
    ...Shadows.card,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryLabelActive: {
    color: Colors.white,
  },
  categoryLabelInactive: {
    color: Colors.textSecondary,
  },

  // Promo cards
  promoRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  promoCardWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.cardStrong,
  },
  promoCard: {
    width: 200,
    height: 110,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    justifyContent: 'flex-end',
    gap: 3,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    width: 28,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '25deg' }],
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  promoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Featured items
  featuredRow: {
    paddingHorizontal: Spacing.md,
    gap: 12,
    paddingRight: Spacing.lg,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
  },

  // Locations
  locationRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  locationCard: {
    width: 168,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationCity: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  locationAddr: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  openBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
})
