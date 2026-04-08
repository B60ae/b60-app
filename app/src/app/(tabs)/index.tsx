import React, { useEffect, useRef, useState, useCallback } from 'react'
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
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, Zap, Flame, Star, MapPin, Clock } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { menuApi, locationsApi, loyaltyApi } from '../../services/api'
import { IMAGES } from '../../utils/constants'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { HeroBanner } from '../../components/ui/HeroBanner'
import { PointsBanner } from '../../components/ui/PointsBanner'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows, Colors } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'
import type { MenuItem } from '../../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const FEATURED_CARD_WIDTH = 180
const FEATURED_SNAP_INTERVAL = 194

const CATEGORY_QUICK = [
  { id: 'burgers', label: 'Burgers' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'fries', label: 'Fries' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'extras', label: 'Extras' },
]

const PROMOS = [
  {
    id: '1',
    topLabel: '2× POINTS',
    subLabel: 'This weekend only',
    gradientColors: ['#F05A1A', '#C94400'] as const,
    icon: Zap,
    tag: 'HOT',
  },
  {
    id: '2',
    topLabel: 'NEW DROP',
    subLabel: 'Classic Beef just got better',
    gradientColors: ['#1B2A4A', '#0D1829'] as const,
    icon: Flame,
    tag: 'NEW',
  },
  {
    id: '3',
    topLabel: 'LOYALTY REWARDS',
    subLabel: 'Redeem your points today',
    gradientColors: ['#16A34A', '#15803D'] as const,
    icon: Star,
    tag: null,
  },
]

// Rotating hype lines for the live ticker
const HYPE_LINES = [
  'SMASHING ORDERS RIGHT NOW',
  'PICKUP IN UNDER 10 MINS',
  'EARN POINTS ON EVERY ORDER',
  'NO DELIVERY. NO WAIT. JUST SMASH.',
]

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Scrolling ticker component
function HypeTicker() {
  const [idx, setIdx] = useState(0)
  const fade = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIdx(i => (i + 1) % HYPE_LINES.length)
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <View style={tickerStyles.container}>
      <View style={tickerStyles.dot} />
      <Animated.Text style={[tickerStyles.text, { opacity: fade }]} numberOfLines={1}>
        {HYPE_LINES[idx]}
      </Animated.Text>
    </View>
  )
}

const tickerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  text: {
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})

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

  const { data: balance } = useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: loyaltyApi.getBalance,
    enabled: !!user,
    staleTime: 0,
  })

  // Sync fresh balance into auth store as soon as home tab loads
  useEffect(() => {
    if (balance?.total_points !== undefined) {
      useAuthStore.getState().updatePoints(balance.total_points)
    }
  }, [balance?.total_points])

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
        <StaggerSection index={0} style={[styles.header, { borderBottomColor: theme.border }]}>
          {/* Brand logo block */}
          <View style={styles.headerBrand}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <Text style={[styles.brandTagline, { color: theme.textSecondary }]}>SMASH BURGERS · DUBAI</Text>
          </View>
          {/* User greeting + bell */}
          <View style={styles.headerRight}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting.toUpperCase()}, {firstName.toUpperCase()}</Text>
            <Pressable
              style={[styles.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Bell size={18} color={theme.text} />
            </Pressable>
          </View>
        </StaggerSection>

        {/* ── Hype Ticker ── */}
        <HypeTicker />

        {/* ── Hero ── */}
        <StaggerSection index={1} style={styles.heroWrapper}>
          <HeroBanner
            imageUri={IMAGES.homeHero}
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
                    active ? { backgroundColor: theme.primary, borderColor: theme.primary, ...Shadows.hard }
                           : { backgroundColor: theme.surface, borderColor: theme.border },
                    { transform: [{ rotate: idx % 2 === 0 ? '-1.5deg' : '1.5deg' }] }
                  ]}
                >
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
                    {promo.tag && (
                      <View style={styles.promoTag}>
                        <Text style={styles.promoTagText}>{promo.tag}</Text>
                      </View>
                    )}
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
              {[1, 2].map(i => <SkeletonLoader key={i} variant="card" width={FEATURED_CARD_WIDTH} height={120} />)}
            </View>
          ) : (
            <FlatList
              data={featured}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.featuredCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                >
                  <Image source={{ uri: item.image_url }} style={styles.featuredCardImage} contentFit="cover" />
                  <View style={styles.featuredCardBody}>
                    <Text style={[styles.featuredCardName, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.featuredCardPrice, { color: theme.primary }]}>AED {Number(item.price || 0).toFixed(0)}</Text>
                    <Pressable
                      style={styles.featuredAddBtn}
                      onPress={() => {
                        addItem(item, 1, [])
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
                      }}
                    >
                      <Text style={styles.featuredAddBtnText}>+ ADD</Text>
                    </Pressable>
                  </View>
                </Pressable>
              )}
            />
          )}
        </StaggerSection>

        {/* ── Locations ── */}
        <StaggerSection index={user ? 6 : 5} style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxl }}>
          <SectionHeader title="Find Us" />
          <View style={styles.locationList}>
            {(locations ?? []).map((loc: any) => {
              const isOpen = loc.is_open !== false
              return (
                <View key={loc.id} style={[styles.locationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {/* Left accent bar */}
                  <View style={[styles.locationAccent, { backgroundColor: isOpen ? theme.primary : theme.textMuted }]} />

                  {/* B60 logo */}
                  <Image
                    source={require('../../../assets/images/icon.png')}
                    style={[styles.locationLogo, !isOpen && { opacity: 0.4 }]}
                    contentFit="contain"
                  />

                  {/* Info */}
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, { color: theme.text }]}>{loc.name}</Text>
                    <View style={styles.locationAddrRow}>
                      <MapPin size={11} color={theme.textMuted} />
                      <Text style={[styles.locationAddr, { color: theme.textSecondary }]} numberOfLines={1}>{loc.address}</Text>
                    </View>
                    {loc.hours && (
                      <View style={styles.locationAddrRow}>
                        <Clock size={11} color={theme.textMuted} />
                        <Text style={[styles.locationAddr, { color: theme.textSecondary }]}>{loc.hours}</Text>
                      </View>
                    )}
                  </View>

                  {/* Open/Closed pill */}
                  <View style={[styles.openPill, { backgroundColor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,100,100,0.12)' }]}>
                    <View style={[styles.openDot, { backgroundColor: isOpen ? theme.success : theme.textMuted }]} />
                    <Text style={[styles.openPillText, { color: isOpen ? theme.success : theme.textMuted }]}>
                      {isOpen ? 'OPEN' : 'CLOSED'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
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
    borderBottomWidth: 1,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 48, height: 48 },
  brandTagline: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  notifBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
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
  promoTag: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Colors.yellow, borderRadius: Radius.sm,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1.5, borderColor: Colors.black,
    transform: [{ rotate: '3deg' }],
  },
  promoTagText: { fontSize: 9, fontWeight: '900', color: Colors.black, letterSpacing: 1 },
  featuredRow: { paddingHorizontal: Spacing.md, gap: 12 },
  featuredCard: {
    width: 200, borderRadius: Radius.lg, borderWidth: 1.5, overflow: 'hidden',
  },
  featuredCardImage: { width: '100%', height: 120 },
  featuredCardBody: { padding: Spacing.sm, gap: 4 },
  featuredCardName: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', lineHeight: 16 },
  featuredCardPrice: { fontSize: 15, fontWeight: '900' },
  featuredAddBtn: {
    backgroundColor: '#F05A1A', borderRadius: Radius.sm,
    paddingVertical: 6, alignItems: 'center', marginTop: 2,
  },
  featuredAddBtnText: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  locationList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1.5,
    overflow: 'hidden', gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  locationAccent: { width: 4, alignSelf: 'stretch' },
  locationLogo: {
    width: 52, height: 52,
    margin: Spacing.sm,
  },
  locationInfo: { flex: 1, gap: 3 },
  locationName: { fontSize: 14, fontWeight: '900' },
  locationAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationAddr: { fontSize: 11, flex: 1 },
  openPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.full,
  },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
})

