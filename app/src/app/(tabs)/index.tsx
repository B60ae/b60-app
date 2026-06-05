import React, { useEffect, useRef, useState, useCallback, memo } from 'react'
import {
  ScrollView, View, Text, StyleSheet, Pressable,
  Animated, FlatList, Dimensions, Platform, Linking,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, Zap, Flame, Star, MapPin, Clock } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { menuApi, locationsApi, loyaltyApi } from '../../services/api'
import { IMAGES } from '../../utils/constants'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { HeroBanner } from '../../components/ui/HeroBanner'
import { PointsBanner } from '../../components/ui/PointsBanner'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { LightTheme, Spacing, Radius, Shadows, Colors } from '../../utils/theme'
import { getTier } from '../../utils/tiers'
import type { MenuItem } from '../../types'

const T = LightTheme
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const FEATURED_CARD_WIDTH = 180

const LOCATION_MAPS: Record<string, string> = {
  'Oud Metha': 'https://maps.google.com/?q=B60+Burgers+Oud+Metha+Dubai',
  'Al Ghurair': 'https://maps.google.com/?q=B60+Burgers+Flayva+Al+Ghurair+Centre+Dubai',
  'Muwaileh': 'https://maps.google.com/?q=B60+Burgers+Muwaileh+Sharjah',
  'Al Warqa': 'https://maps.google.com/?q=B60+Burgers+Al+Warqa+Dubai',
}

function getMapsUrl(name: string, address: string) {
  const key = Object.keys(LOCATION_MAPS).find((k) => name.toLowerCase().includes(k.toLowerCase()))
  return key ? LOCATION_MAPS[key] : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`
}

const FeaturedCard = memo(function FeaturedCard({
  item, onPress, onAdd,
}: { item: MenuItem; onPress: () => void; onAdd: () => void }) {
  return (
    <Pressable style={styles.featuredCard} onPress={onPress}>
      <Image source={{ uri: item.image_url }} style={styles.featuredCardImage} contentFit="cover" />
      <View style={styles.featuredCardBody}>
        <Text style={styles.featuredCardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.featuredCardPrice}>AED {Number(item.price || 0).toFixed(0)}</Text>
        <Pressable style={styles.featuredAddBtn} onPress={onAdd} hitSlop={8}>
          <Text style={styles.featuredAddBtnText}>+ ADD</Text>
        </Pressable>
      </View>
    </Pressable>
  )
})

const CATEGORY_QUICK = [
  { id: 'burgers', label: 'Burgers' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'fries', label: 'Fries' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'extras', label: 'Extras' },
]

const PROMOS = [
  { id: '1', topLabel: '2× POINTS', subLabel: 'This weekend only', bg: Colors.primary, icon: Zap, tag: 'HOT' },
  { id: '2', topLabel: 'NEW DROP',   subLabel: 'Classic Beef just got better', bg: '#1B2A4A', icon: Flame, tag: 'NEW' },
  { id: '3', topLabel: 'LOYALTY',    subLabel: 'Redeem your points today', bg: '#16A34A', icon: Star, tag: null },
]

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

function HypeTicker() {
  const [idx, setIdx] = useState(0)
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#000', paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.yellow },
  text: {
    flex: 1, fontSize: 11, fontWeight: '900', color: Colors.yellow,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
})

function StaggerSection({ index, children, style }: { index: number; children: React.ReactNode; style?: any }) {
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(24)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
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
  const [activeCategory, setActiveCategory] = useState('burgers')

  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
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

  useEffect(() => {
    if (balance?.total_points !== undefined) {
      useAuthStore.getState().updatePoints(balance.total_points)
    }
  }, [balance?.total_points])

  const handleAddFeatured = useCallback((item: MenuItem) => {
    addItem(item, 1, [])
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }, [addItem])

  const renderFeaturedItem = useCallback(({ item }: { item: MenuItem }) => (
    <FeaturedCard
      item={item}
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
      onAdd={() => handleAddFeatured(item)}
    />
  ), [handleAddFeatured])

  const handleCategoryPress = (id: string) => {
    setActiveCategory(id)
    if (Platform.OS !== 'web') Haptics.selectionAsync()
    router.push('/(tabs)/menu')
  }

  const loyaltyPoints = user?.loyalty_points ?? 0
  const loyaltyTier = getTier(loyaltyPoints).name
  const greeting = getTimeGreeting()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Orange curved header ── */}
        <StaggerSection index={0} style={styles.headerBlock}>
          <View style={styles.headerInner}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <View style={styles.headerCenter}>
              <Text style={styles.brandTagline}>B60 BURGERS</Text>
              <Text style={styles.greetingText}>{greeting.toUpperCase()}, {firstName.toUpperCase()}</Text>
            </View>
            <Pressable
              style={styles.notifBtn}
              onPress={() => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Bell size={18} color="#fff" />
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
            <Animated.View style={[styles.livePulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.liveDot} />
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
                    active
                      ? { backgroundColor: T.primary, borderColor: '#000', ...Shadows.hard }
                      : { backgroundColor: T.surface, borderColor: '#000', ...Shadows.hardSm },
                    { transform: [{ rotate: idx % 2 === 0 ? '-1.5deg' : '1.5deg' }] },
                  ]}
                >
                  <Text style={[styles.categoryLabel, { color: active ? '#fff' : T.text }]}>
                    {cat.label.toUpperCase()}
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

        {/* ── Street Offers ── */}
        <StaggerSection index={user ? 4 : 3} style={{ marginTop: Spacing.lg }}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>STREET OFFERS</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRow}>
            {PROMOS.map((promo) => {
              const Icon = promo.icon
              return (
                <Pressable key={promo.id} style={[styles.promoCard, { backgroundColor: promo.bg }, Shadows.hard]}>
                  {promo.tag && (
                    <View style={styles.promoTag}>
                      <Text style={styles.promoTagText}>{promo.tag}</Text>
                    </View>
                  )}
                  <Icon size={18} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.promoTitle}>{promo.topLabel}</Text>
                  <Text style={styles.promoSub}>{promo.subLabel}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </StaggerSection>

        {/* ── Featured ── */}
        <StaggerSection index={user ? 5 : 4} style={{ marginTop: Spacing.lg }}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>FAN FAVOURITES</Text>
            <Pressable onPress={() => router.push('/(tabs)/menu')} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>SEE ALL →</Text>
            </Pressable>
          </View>
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
              renderItem={renderFeaturedItem}
              getItemLayout={(_, index) => ({ length: 200, offset: 212 * index, index })}
            />
          )}
        </StaggerSection>

        {/* ── Locations ── */}
        <StaggerSection index={user ? 6 : 5} style={{ marginTop: Spacing.lg, marginBottom: Spacing.xxl }}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>FIND US</Text>
          </View>
          <View style={styles.locationList}>
            {(locations ?? []).map((loc: any) => {
              const isOpen = loc.is_open !== false
              return (
                <Pressable
                  key={loc.id}
                  style={[styles.locationCard, Shadows.hardSm]}
                  onPress={async () => {
                    const url = getMapsUrl(loc.name, loc.address ?? '')
                    const supported = await Linking.canOpenURL(url)
                    Linking.openURL(supported ? url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name)}`)
                  }}
                >
                  <View style={[styles.locationAccent, { backgroundColor: isOpen ? T.primary : T.textMuted }]} />
                  <Image
                    source={require('../../../assets/images/icon.png')}
                    style={[styles.locationLogo, !isOpen && { opacity: 0.4 }]}
                    contentFit="contain"
                  />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{loc.name}</Text>
                    <View style={styles.locationAddrRow}>
                      <MapPin size={11} color={T.textMuted} />
                      <Text style={styles.locationAddr} numberOfLines={1}>{loc.address}</Text>
                    </View>
                    {loc.hours && (
                      <View style={styles.locationAddrRow}>
                        <Clock size={11} color={T.textMuted} />
                        <Text style={styles.locationAddr}>{loc.hours}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.openPill, { backgroundColor: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(100,100,100,0.1)' }]}>
                    <View style={[styles.openDot, { backgroundColor: isOpen ? T.success : T.textMuted }]} />
                    <Text style={[styles.openPillText, { color: isOpen ? T.success : T.textMuted }]}>
                      {isOpen ? 'OPEN' : 'CLOSED'}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </StaggerSection>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F3' },
  scroll: { paddingBottom: Spacing.xxl },

  // Orange curved header
  headerBlock: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerLogo: { width: 48, height: 48, borderRadius: 12 },
  headerCenter: { flex: 1 },
  brandTagline: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  greetingText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginTop: 1 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroWrapper: { position: 'relative' },
  liveContainer: {
    position: 'absolute', bottom: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  livePulse: { position: 'absolute', left: 10, width: 10, height: 10, borderRadius: 5, opacity: 0.5, backgroundColor: Colors.primary },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 2, backgroundColor: Colors.primary },
  liveLabel: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 1 },

  categoryRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 13, borderWidth: 2.5, minHeight: 44,
  },
  categoryLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  sectionAccent: { width: 4, height: 18, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '900', color: '#1B2A4A', letterSpacing: 2, textTransform: 'uppercase' },
  seeAllBtn: {},
  seeAllText: { fontSize: 10, fontWeight: '900', color: Colors.primary, letterSpacing: 1 },

  promoRow: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  promoCard: {
    width: 220, height: 120, padding: Spacing.md,
    justifyContent: 'flex-end', gap: 4,
    borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
  },
  promoTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', textTransform: 'uppercase' },
  promoSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  promoTag: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Colors.yellow, borderRadius: Radius.sm,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1.5, borderColor: '#000',
    transform: [{ rotate: '3deg' }],
  },
  promoTagText: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1 },

  featuredRow: { paddingHorizontal: Spacing.md, gap: 12 },
  featuredCard: {
    width: 200, borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
    overflow: 'hidden', backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  featuredCardImage: { width: '100%', height: 120 },
  featuredCardBody: { padding: Spacing.sm, gap: 4, backgroundColor: '#fff' },
  featuredCardName: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', lineHeight: 16, color: '#1B2A4A' },
  featuredCardPrice: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  featuredAddBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm, borderWidth: 2, borderColor: '#000',
    paddingVertical: 10, alignItems: 'center', marginTop: 4, minHeight: 44, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  featuredAddBtnText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  locationList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 2.5, borderColor: '#000',
    overflow: 'hidden', gap: Spacing.sm, paddingRight: Spacing.sm,
    backgroundColor: '#fff',
  },
  locationAccent: { width: 5, alignSelf: 'stretch' },
  locationLogo: { width: 52, height: 52, margin: Spacing.sm },
  locationInfo: { flex: 1, gap: 3 },
  locationName: { fontSize: 14, fontWeight: '900', color: '#1B2A4A' },
  locationAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationAddr: { fontSize: 11, flex: 1, color: '#555' },
  openPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.full,
  },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
})
