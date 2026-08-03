import React, { useEffect, useRef, memo } from 'react'
import {
  ScrollView, View, Text, StyleSheet, Pressable,
  Linking, Animated,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { menuApi, locationsApi, loyaltyApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { V3, Shadows } from '../../utils/theme'
import { getTier } from '../../utils/tiers'
import type { MenuItem } from '../../types'

// ─── Ticker ───────────────────────────────────────────────────────────────────
const TICKER_ITEMS = ['100% Halal', 'Born in Dubai', 'Pickup only', 'No shortcuts', 'Smashed fresh', '4 spots', 'Tickle is here']

function Ticker() {
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.timing(x, { toValue: -580, duration: 22000, useNativeDriver: true })
    ).start()
  }, [])
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <View style={tk.bar}>
      <Animated.View style={[{ flexDirection: 'row' }, { transform: [{ translateX: x }] }]}>
        <View style={{ flexDirection: 'row', paddingVertical: 7 }}>
          {items.map((t, i) => (
            <Text key={i} style={tk.item}>
              {t}
              <Text style={tk.sep}>{' ▪ '}</Text>
            </Text>
          ))}
        </View>
      </Animated.View>
    </View>
  )
}

const tk = StyleSheet.create({
  bar: { backgroundColor: V3.o, overflow: 'hidden' },
  item: { fontFamily: 'Archivo_400Regular', fontSize: 11, color: '#FFFDF8' } as any,
  sep: { fontSize: 9, color: 'rgba(255,253,248,0.55)' },
})

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ cartCount, onCart }: { cartCount: number; onCart: () => void }) {
  return (
    <View style={topS.bar}>
      <Image
        source={require('../../../assets/images/icon_logo.webp')}
        style={topS.logo}
        contentFit="contain"
      />
      <Pressable style={topS.cartBtn} onPress={onCart} hitSlop={8}>
        <ShoppingCart size={19} color={V3.w} strokeWidth={1.8} />
        {cartCount > 0 && (
          <View style={topS.badge}>
            <Text style={topS.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}

const topS = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  logo: { width: 44, height: 44 },
  cartBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: V3.s,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    ...Shadows.iconBtn,
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: V3.o,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, color: '#FFFDF8' },
})

// ─── Location Bar ─────────────────────────────────────────────────────────────
function LocationBar({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <View style={locS.bar}>
      <View style={locS.dot} />
      <Text style={locS.text}>
        PICKUP · <Text style={locS.name}>{name.toUpperCase()}</Text>
      </Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={locS.change}>CHANGE</Text>
      </Pressable>
    </View>
  )
}

const locS = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 9,
    gap: 8,
    borderBottomWidth: 1, borderBottomColor: V3.ln,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  text: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, letterSpacing: 0.8, color: V3.dim, flex: 1 },
  name: { fontFamily: 'JetBrainsMono_500Medium', color: V3.w },
  change: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1, color: V3.o },
})

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({ item, onPress }: { item?: MenuItem; onPress: () => void }) {
  const name = item?.name ?? 'Tickle'
  const price = `AED ${Number(item?.price ?? 26).toFixed(0)}`
  const imageUri = item?.image_url ?? 'https://b60.ae/images/fancy.webp'

  return (
    <Pressable style={hero.card} onPress={onPress}>
      <Image source={{ uri: imageUri }} style={hero.img} contentFit="cover" />
      <View style={hero.body}>
        <Text style={hero.label}>NEW · LIMITED RUN</Text>
        <Text style={hero.name} numberOfLines={2}>{name.toUpperCase()}</Text>
        <View style={hero.btn}>
          <Text style={hero.btnText}>TRY IT · {price}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const hero = StyleSheet.create({
  card: {
    marginHorizontal: 18, marginTop: 14,
    height: 200, borderRadius: 22,
    backgroundColor: V3.o,
    overflow: 'hidden',
    ...Shadows.cardStrong,
  },
  img: {
    position: 'absolute', right: -10, bottom: 0,
    width: 200, height: 220,
  },
  body: {
    flex: 1, padding: 18, paddingRight: 130,
    justifyContent: 'flex-end', gap: 8,
  },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 8.5, letterSpacing: 1.2,
    color: 'rgba(255,253,248,0.75)',
  },
  name: {
    fontFamily: 'Archivo_900Black',
    fontSize: 44, lineHeight: 40,
    letterSpacing: -1.5, color: V3.gold,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: V3.gold,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, marginTop: 4,
  },
  btnText: { fontFamily: 'Archivo_800ExtraBold', fontSize: 12, color: V3.w, letterSpacing: -0.2 },
})

// ─── Rail Card ────────────────────────────────────────────────────────────────
const RailCard = memo(function RailCard({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  return (
    <Pressable style={rail.card} onPress={onPress}>
      <Image source={{ uri: item.image_url }} style={rail.img} contentFit="cover" />
      <View style={rail.body}>
        <Text style={rail.name} numberOfLines={2}>{item.name.toUpperCase()}</Text>
        <Text style={rail.price}>AED {Number(item.price || 0).toFixed(0)}</Text>
      </View>
    </Pressable>
  )
})

const rail = StyleSheet.create({
  card: { width: 148, backgroundColor: V3.s, borderRadius: 18, overflow: 'hidden', ...Shadows.card },
  img: { width: 148, height: 120, backgroundColor: V3.s2 },
  body: { padding: 12, gap: 4 },
  name: { fontFamily: 'Archivo_800ExtraBold', fontSize: 12, color: V3.w, lineHeight: 15 },
  price: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, letterSpacing: 1.4, color: V3.od },
})

// ─── Section Head ─────────────────────────────────────────────────────────────
function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={hd.row}>
      <Text style={hd.title}>{title}</Text>
      {action && <Pressable onPress={onAction}><Text style={hd.link}>{action} →</Text></Pressable>}
    </View>
  )
}

const hd = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 24, paddingBottom: 14 },
  title: { fontFamily: 'Archivo_800ExtraBold', fontSize: 22, lineHeight: 24, letterSpacing: -0.3, color: V3.w },
  link: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: V3.od },
})

// ─── Club Card ────────────────────────────────────────────────────────────────
function ClubCard({ points, tier, onPress }: { points: number; tier: ReturnType<typeof getTier>; onPress: () => void }) {
  const nextPts = tier.next
  const ptsToNext = nextPts ? nextPts - points : 0
  const progress = nextPts ? Math.min((points - tier.min) / (nextPts - tier.min), 1) : 1
  const nextName = tier.name === 'Bronze' ? 'Silver' : tier.name === 'Silver' ? 'Gold' : tier.name === 'Gold' ? 'Platinum' : null

  return (
    <Pressable style={cl.card} onPress={onPress}>
      <View style={cl.top}>
        <View>
          <Text style={cl.label}>YOUR POINTS</Text>
          <Text style={cl.pts}>{points.toLocaleString()}</Text>
        </View>
        <View style={cl.tierPill}>
          <Text style={cl.tierText}>{tier.name.toUpperCase()}</Text>
        </View>
      </View>
      <View style={cl.track}>
        <View style={[cl.fill, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>
      <View style={cl.foot}>
        <Text style={cl.sub}>
          {ptsToNext > 0 && nextName ? `${ptsToNext.toLocaleString()} pts to ${nextName}` : 'Top tier'}
        </Text>
        <Text style={cl.sub}>20 pts = AED 1</Text>
      </View>
    </Pressable>
  )
}

const cl = StyleSheet.create({
  card: {
    marginHorizontal: 18, marginTop: 14,
    backgroundColor: V3.s, borderRadius: 18, padding: 18, gap: 12,
    ...Shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  label: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: V3.dim2 },
  pts: { fontFamily: 'Archivo_900Black', fontSize: 36, lineHeight: 36, letterSpacing: -1.2, color: V3.o, marginTop: 2 },
  tierPill: { backgroundColor: V3.k, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4, borderWidth: 1, borderColor: V3.ln },
  tierText: { fontFamily: 'Archivo_800ExtraBold', fontSize: 11, color: V3.dim, letterSpacing: 0.5 },
  track: { height: 5, backgroundColor: V3.k, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 5, backgroundColor: V3.o, borderRadius: 999 },
  foot: { flexDirection: 'row', justifyContent: 'space-between' },
  sub: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, letterSpacing: 0.8, color: V3.dim2 },
})

// ─── Location meta ────────────────────────────────────────────────────────────
const LOC_META: Record<string, { hood: string; tag: string; dist: string; isNew?: boolean }> = {
  'Oud Metha':  { hood: 'DUBAI', tag: 'ORIGINAL · EST. 2024', dist: '12 min' },
  'Al Ghurair': { hood: 'DEIRA, DUBAI', tag: 'OPEN DAILY', dist: '15 min' },
  'Muwaileh':   { hood: 'SHARJAH', tag: 'OPEN DAILY', dist: '10 min' },
  'Al Warqa':   { hood: 'DUBAI', tag: 'NOW OPEN', dist: '18 min', isNew: true },
}

const MAPS: Record<string, string> = {
  'Oud Metha':  'https://maps.google.com/?q=B60+Burgers+Oud+Metha+Dubai',
  'Al Ghurair': 'https://maps.google.com/?q=B60+Burgers+Al+Ghurair+Dubai',
  'Muwaileh':   'https://maps.google.com/?q=B60+Burgers+Muwaileh+Sharjah',
  'Al Warqa':   'https://maps.google.com/?q=B60+Burgers+Al+Warqa+Dubai',
}

function getLocMeta(name: string) {
  const key = Object.keys(LOC_META).find((k) => name.includes(k))
  return key ? LOC_META[key] : { hood: 'DUBAI', tag: 'OPEN DAILY', dist: '', isNew: false }
}

function getMapsUrl(name: string) {
  const key = Object.keys(MAPS).find((k) => name.includes(k))
  return key ? MAPS[key] : `https://maps.google.com/?q=${encodeURIComponent(name)}`
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const cartItems = useCartStore((s) => s.items)
  const cartLocationId = useCartStore((s) => s.locationId)
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0)

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
    enabled: isAuthenticated,
    staleTime: 0,
  })

  useEffect(() => {
    if (balance?.total_points !== undefined) {
      useAuthStore.getState().updatePoints(balance.total_points)
    }
  }, [balance?.total_points])

  const loyaltyPoints = user?.loyalty_points ?? 0
  const tier = getTier(loyaltyPoints)
  const selectedLocation = locations?.find((l: any) => l.id === cartLocationId) ?? locations?.[0]
  const locationName = selectedLocation?.name ?? 'Select location'
  const heroItem = featured?.[0]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V3.k }} edges={['top']}>
      <TopBar cartCount={cartCount} onCart={() => router.push('/(tabs)/menu')} />
      <LocationBar name={locationName} onPress={() => router.push('/(tabs)/menu')} />
      <Ticker />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero */}
        <HeroCard item={heroItem} onPress={() => router.push('/(tabs)/menu')} />

        {/* Smash hits */}
        <SectionHead title="Smash hits" action="Full menu" onAction={() => router.push('/(tabs)/menu')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 12, paddingBottom: 4 }}>
          {loadingFeatured
            ? [1, 2, 3].map((i) => <SkeletonLoader key={i} variant="card" width={148} height={195} />)
            : (featured ?? []).slice(0, 5).map((item: MenuItem) => (
              <RailCard key={item.id} item={item}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } } as any)} />
            ))
          }
        </ScrollView>

        {/* B60 Club */}
        {user && (
          <ClubCard points={loyaltyPoints} tier={tier} onPress={() => router.push('/(tabs)/loyalty')} />
        )}

        {/* Play for points */}
        <SectionHead title="Play for points" />
        <Pressable style={s.promo} onPress={() => router.push('/(tabs)/loyalty')}>
          <View style={s.promoIcon}>
            <Text style={s.promoIconText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.promoTitle}>Games in the club</Text>
            <Text style={s.promoCopy}>Smash the patty, spin the wheel. Win points and a free burger.</Text>
          </View>
          <Text style={s.promoArrow}>→</Text>
        </Pressable>

        {/* Four spots */}
        <View style={[hd.row]}>
          <Text style={hd.title}>Four spots</Text>
          <Text style={hd.link}>PICKUP ONLY</Text>
        </View>
        <View style={s.branchWrap}>
          {(locations ?? []).slice(0, 4).map((loc: any, idx: number) => {
            const meta = getLocMeta(loc.name)
            return (
              <Pressable key={loc.id} style={s.branchRow}
                onPress={() => Linking.openURL(getMapsUrl(loc.name))}>
                <Text style={s.branchNum}>{String(idx + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.branchName}>{loc.name}</Text>
                    {meta.isNew && (
                      <View style={s.newBadge}><Text style={s.newBadgeText}>NEW</Text></View>
                    )}
                  </View>
                  <Text style={s.branchSub}>{meta.hood} · {meta.tag}</Text>
                </View>
                {meta.dist ? <Text style={s.branchDist}>{meta.dist}</Text> : null}
              </Pressable>
            )
          })}
        </View>

        <Text style={s.footer}>100% Halal · Dubai & Sharjah · No delivery</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  promo: {
    marginHorizontal: 18, backgroundColor: V3.s, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Shadows.card,
  },
  promoIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: V3.o,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  promoIconText: { fontFamily: 'Archivo_800ExtraBold', fontSize: 26, lineHeight: 28, color: V3.gold, letterSpacing: -0.5 },
  promoTitle: { fontFamily: 'Archivo_800ExtraBold', fontSize: 15, color: V3.w, lineHeight: 18 },
  promoCopy: { fontFamily: 'Archivo_400Regular', fontSize: 13, color: V3.dim, lineHeight: 19, marginTop: 4 },
  promoArrow: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 16, color: V3.od },

  branchWrap: { marginHorizontal: 18, backgroundColor: V3.s, borderRadius: 18, overflow: 'hidden', ...Shadows.card },
  branchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: V3.ln,
  },
  branchNum: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, letterSpacing: 1, color: V3.dim2, width: 24 },
  branchName: { fontFamily: 'Archivo_800ExtraBold', fontSize: 14, color: V3.w, lineHeight: 17 },
  branchSub: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 0.8, color: V3.dim2, marginTop: 2 },
  branchDist: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, letterSpacing: 0.5, color: V3.dim2 },
  newBadge: { backgroundColor: V3.o, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 8, letterSpacing: 1, color: '#FFFDF8' },

  footer: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5,
    letterSpacing: 1.6, color: V3.dim2, textTransform: 'uppercase',
    paddingHorizontal: 18, paddingVertical: 24, textAlign: 'center',
  },
})
