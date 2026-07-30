import React, { useEffect, useRef, useState, useCallback, memo } from 'react'
import {
  ScrollView, View, Text, StyleSheet, Pressable,
  FlatList, Dimensions, Platform, Linking, Animated,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { menuApi, locationsApi, loyaltyApi } from '../../services/api'
import { IMAGES } from '../../utils/constants'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { SkeletonLoader } from '../../components/ui/SkeletonLoader'
import { V3, Shadows } from '../../utils/theme'
import { getTier } from '../../utils/tiers'
import type { MenuItem } from '../../types'

const { width: W } = Dimensions.get('window')

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

// ─── Ticker ──────────────────────────────────────────────────────────────────
const TICKER = ['100% Halal', 'Born in Dubai', 'Pickup only', 'No shortcuts', 'Smashed fresh', '4 spots']

function Ticker() {
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.timing(x, { toValue: -1, duration: 28000, useNativeDriver: true })
    ).start()
  }, [])
  const items = [...TICKER, ...TICKER]
  return (
    <View style={tk.bar}>
      <Animated.View style={[{ flexDirection: 'row' }, { transform: [{ translateX: Animated.multiply(x, 0) }] }]}>
        <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
          {items.map((t, i) => (
            <Text key={i} style={tk.item}>
              {t}
              <Text style={tk.dot}>{' ▪ '}</Text>
            </Text>
          ))}
        </View>
      </Animated.View>
    </View>
  )
}

const tk = StyleSheet.create({
  bar: {
    backgroundColor: V3.o,
    overflow: 'hidden',
    flexShrink: 0,
  },
  item: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 11,
    color: '#FFFDF8',
    paddingHorizontal: 0,
  } as any,
  dot: { fontSize: 9, color: 'rgba(255,253,248,0.6)' },
})

// ─── Top Bar ─────────────────────────────────────────────────────────────────
function TopBar({ cartCount, onCart }: { cartCount: number; onCart: () => void }) {
  return (
    <View style={topS.bar}>
      <Text style={topS.logoText}>B60 Burgers</Text>
      <Pressable style={topS.cartBtn} onPress={onCart}>
        <ShoppingCart size={20} color={V3.w} strokeWidth={1.8} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  logoText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 18,
    color: V3.w,
    letterSpacing: -0.4,
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: V3.s,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.iconBtn,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: V3.o,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: '#FFFDF8',
  },
})

// ─── Rail Card ────────────────────────────────────────────────────────────────
const RailCard = memo(function RailCard({
  item, onPress,
}: { item: MenuItem; onPress: () => void }) {
  return (
    <Pressable style={rail.card} onPress={onPress}>
      <Image source={{ uri: item.image_url }} style={rail.img} contentFit="cover" />
      <View style={rail.body}>
        <Text style={rail.name} numberOfLines={2}>{item.name}</Text>
        <Text style={rail.price}>AED {Number(item.price || 0).toFixed(0)}</Text>
      </View>
    </Pressable>
  )
})

const rail = StyleSheet.create({
  card: {
    width: 148,
    backgroundColor: V3.s,
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.card,
  },
  img: { width: 148, height: 130, backgroundColor: V3.s2 },
  body: { padding: 12, gap: 5 },
  name: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 13,
    color: V3.w,
    lineHeight: 16,
  },
  price: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 1.4,
    color: V3.od,
    textTransform: 'uppercase',
  },
})

// ─── Section Head ─────────────────────────────────────────────────────────────
function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={hd.row}>
      <Text style={hd.title}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={hd.link}>{action} →</Text>
        </Pressable>
      )}
    </View>
  )
}

const hd = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 14,
  },
  title: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: V3.w,
  },
  link: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: V3.od,
  },
})

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const cartItems = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
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
    enabled: !!user,
    staleTime: 0,
  })

  useEffect(() => {
    if (balance?.total_points !== undefined) {
      useAuthStore.getState().updatePoints(balance.total_points)
    }
  }, [balance?.total_points])

  const loyaltyPoints = user?.loyalty_points ?? 0
  const tier = getTier(loyaltyPoints)

  const handleAddFeatured = useCallback((item: MenuItem) => {
    addItem(item, 1, [])
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [addItem])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: V3.k }} edges={['top']}>
      <TopBar cartCount={cartCount} onCart={() => router.push('/(tabs)/menu')} />
      <Ticker />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero drop card */}
        <Pressable style={s.hero} onPress={() => router.push('/(tabs)/menu')}>
          <Image source={{ uri: IMAGES.homeHero }} style={s.heroImg} contentFit="cover" />
          <View style={s.heroGrad} />
          <View style={s.heroBody}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={s.tag}>
                <Text style={s.tagText}>New</Text>
              </View>
              <View style={s.tagGhost}>
                <Text style={s.tagGhostText}>Limited run</Text>
              </View>
            </View>
            <View style={s.heroFoot}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroName}>Tickle</Text>
                <Text style={s.heroDesc} numberOfLines={2}>
                  Fried onions, beef patty, special sauce, house jam, fresh jalapeño.
                </Text>
              </View>
              <View style={s.priceChip}>
                <Text style={s.priceText}>AED 26</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Points / club card */}
        {user && (
          <Pressable style={s.clubCard} onPress={() => router.push('/(tabs)/loyalty')}>
            <View style={{ flex: 1 }}>
              <Text style={s.clubLabel}>B60 Club · Your points</Text>
              <Text style={s.clubPts}>{loyaltyPoints}</Text>
              <Text style={s.clubTier}>{tier.name}</Text>
            </View>
            <Text style={s.clubArrow}>→</Text>
          </Pressable>
        )}

        {/* Smash hits rail */}
        <SectionHead title="Smash hits" action="Full menu" onAction={() => router.push('/(tabs)/menu')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 12, paddingBottom: 4 }}
          style={{ overflow: 'visible' }}
        >
          {loadingFeatured ? (
            <>
              {[1, 2, 3].map((i) => (
                <SkeletonLoader key={i} variant="card" width={148} height={195} />
              ))}
            </>
          ) : (
            (featured ?? []).slice(0, 5).map((item: MenuItem) => (
              <RailCard
                key={item.id}
                item={item}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              />
            ))
          )}
        </ScrollView>

        {/* Play for points promo */}
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

        {/* Branches */}
        <SectionHead title="Four spots" />
        <View style={s.branchWrap}>
          {(locations ?? []).slice(0, 4).map((loc: any, idx: number) => {
            const isOpen = loc.is_open !== false
            return (
              <Pressable
                key={loc.id}
                style={s.branchRow}
                onPress={() => {
                  const url = getMapsUrl(loc.name, loc.address ?? '')
                  Linking.openURL(url)
                }}
              >
                <Text style={s.branchNum}>{String(idx + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.branchName}>{loc.name}</Text>
                  <Text style={s.branchAddr}>{loc.address}</Text>
                </View>
                <View style={[s.openDot, { backgroundColor: isOpen ? '#22C55E' : V3.dim2 }]} />
              </Pressable>
            )
          })}
        </View>

        <Text style={s.footer}>Pickup only · 100% halal · Dubai & Sharjah</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  // Hero drop card — 22px radius, orange gradient, margin 12px 18px 0
  hero: {
    marginHorizontal: 18,
    marginTop: 14,
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    ...Shadows.cardStrong,
  },
  heroImg: { position: 'absolute', width: '100%', height: '100%' },
  heroGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,18,6,0.38)',
  },
  heroBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    justifyContent: 'space-between',
  },
  tag: {
    backgroundColor: V3.gold,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    letterSpacing: 1.4,
    color: V3.w,
    textTransform: 'uppercase',
  },
  tagGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,253,248,0.5)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagGhostText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,253,248,0.8)',
    textTransform: 'uppercase',
  },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroName: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 52,
    lineHeight: 46,
    letterSpacing: -1.6,
    color: '#FFFDF8',
  },
  heroDesc: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,253,248,0.85)',
    maxWidth: 220,
    marginTop: 7,
  },
  priceChip: {
    backgroundColor: V3.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  priceText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 15,
    color: V3.w,
    letterSpacing: -0.2,
  },

  // Club card
  clubCard: {
    marginHorizontal: 18,
    marginTop: 14,
    backgroundColor: V3.o,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  clubLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,253,248,0.7)',
  },
  clubPts: {
    fontFamily: 'Archivo_900Black',
    fontSize: 38,
    lineHeight: 38,
    letterSpacing: -1.2,
    color: V3.gold,
    marginTop: 4,
  },
  clubTier: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 13,
    color: 'rgba(255,253,248,0.85)',
    marginTop: 3,
  },
  clubArrow: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    color: 'rgba(255,253,248,0.7)',
    marginLeft: 8,
  },

  // Promo card
  promo: {
    marginHorizontal: 18,
    backgroundColor: V3.s,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadows.card,
  },
  promoIcon: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: V3.k,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  promoIconText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 26,
    lineHeight: 28,
    color: V3.o,
    letterSpacing: -0.5,
  },
  promoTitle: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 15,
    color: V3.w,
    lineHeight: 18,
  },
  promoCopy: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 13,
    color: V3.dim,
    lineHeight: 19,
    marginTop: 4,
  },
  promoArrow: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    color: V3.od,
  },

  // Branches
  branchWrap: {
    marginHorizontal: 18,
    backgroundColor: V3.s,
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.card,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: V3.ln,
  },
  branchNum: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: V3.dim2,
    width: 24,
  },
  branchName: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 14,
    color: V3.w,
    lineHeight: 17,
  },
  branchAddr: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 12,
    color: V3.dim2,
    marginTop: 3,
  },
  openDot: { width: 7, height: 7, borderRadius: 4 },

  footer: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: V3.dim2,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    paddingVertical: 20,
    paddingBottom: 28,
  },
})
