import React, { useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight, ClipboardList, Star, LogOut,
  Info, Globe, Instagram, Shield,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

import { useAuthStore } from '../../stores/authStore'
import { ordersApi, locationsApi } from '../../services/api'
import { V3, Shadows } from '../../utils/theme'
import { getTier, TIER_COLORS } from '../../utils/tiers'
import type { Order } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatOrderId(id: string) {
  return 'B60-' + id.slice(-4).toUpperCase()
}

function formatOrderDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  const time = d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (diffDays === 0) return `TODAY · ${time}`
  if (diffDays === 1) return `YESTERDAY · ${time}`
  const date = d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }).toUpperCase()
  return `${date} · ${time}`
}

function getItemSummary(order: Order) {
  if (!order.items?.length) return ''
  return order.items.map((ci) => ci.menu_item.name).join(', ')
}

// ─── Account Row ─────────────────────────────────────────────────────────────
function Row({ icon, label, onPress, danger = false }: {
  icon: React.ReactNode; label: string; onPress?: () => void; danger?: boolean
}) {
  return (
    <Pressable style={ac.row} onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.05)' }}>
      <View style={[ac.icon, danger && ac.iconDanger]}>{icon}</View>
      <Text style={[ac.label, danger && { color: '#EF4444' }]}>{label}</Text>
      <ChevronRight size={15} color={V3.dim2} />
    </Pressable>
  )
}

const ac = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    gap: 14, borderBottomWidth: 1, borderBottomColor: V3.ln,
  },
  icon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,109,21,0.08)',
  },
  iconDanger: { backgroundColor: 'rgba(239,68,68,0.08)' },
  label: { flex: 1, fontFamily: 'Archivo_700Bold', fontSize: 14, color: V3.w },
})

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: orders } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
    enabled: isAuthenticated,
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
    staleTime: 1000 * 60 * 10,
    enabled: isAuthenticated,
  })

  const tier = getTier(user?.loyalty_points ?? 0)
  const tierStyle = TIER_COLORS[tier.name]

  const totalLifetime = useMemo(
    () => orders?.reduce((s, o) => s + Number(o.total || 0), 0) ?? 0,
    [orders]
  )

  const displayName = useMemo(() => {
    if (!user?.name) return 'B60 Fan'
    const parts = user.name.trim().split(' ')
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  }, [user?.name])

  const getLocationName = (locId: string) =>
    locations?.find((l: any) => l.id === locId)?.name ?? ''

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Image
          source={require('../../../assets/images/icon_logo.webp')}
          style={s.topLogo}
          contentFit="contain"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* User hero */}
        <View style={s.hero}>
          <Image
            source={require('../../../assets/images/icon_logo.webp')}
            style={s.avatar}
            contentFit="contain"
          />
          <View style={s.heroInfo}>
            <View style={s.nameRow}>
              <Text style={s.name}>{displayName}</Text>
              <View style={[s.tierBadge, { backgroundColor: tierStyle.bg }]}>
                <Text style={[s.tierBadgeText, { color: tierStyle.text }]}>{tier.name.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={s.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNumOrange}>{(user?.loyalty_points ?? 0).toLocaleString()}</Text>
            <Text style={s.statLabel}>POINTS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>AED {Math.round(totalLifetime)}</Text>
            <Text style={s.statLabel}>LIFETIME</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{orders?.length ?? 0}</Text>
            <Text style={s.statLabel}>ORDERS</Text>
          </View>
        </View>

        {/* Past orders */}
        <Text style={s.sectionTitle}>Past orders</Text>
        <View style={s.card}>
          {orders && orders.length > 0 ? (
            orders.slice(0, 8).map((order: Order, idx: number) => {
              const locName = getLocationName(order.location_id)
              const datePart = formatOrderDate(order.created_at)
              const meta = [datePart, locName.toUpperCase(), order.points_earned ? `+${order.points_earned} PTS` : '']
                .filter(Boolean).join(' · ')
              const isLast = idx === Math.min(orders.length, 8) - 1
              return (
                <Pressable
                  key={order.id}
                  style={[s.orderRow, isLast && { borderBottomWidth: 0 }]}
                  onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } } as any)}
                >
                  <View style={s.orderTop}>
                    <Text style={s.orderId}>{formatOrderId(order.id)}</Text>
                    <Text style={s.orderPrice}>AED {Number(order.total).toFixed(0)}</Text>
                  </View>
                  <Text style={s.orderItems} numberOfLines={1}>{getItemSummary(order)}</Text>
                  <Text style={s.orderMeta}>{meta}</Text>
                </Pressable>
              )
            })
          ) : (
            <View style={s.emptyOrders}>
              <Text style={s.emptyText}>No orders yet</Text>
              <Pressable onPress={() => router.push('/(tabs)/menu')}>
                <Text style={s.emptyLink}>Order now →</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Account */}
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.card}>
          <Row icon={<ClipboardList size={16} color={V3.o} />} label="Order History" onPress={() => router.push('/orders')} />
          <Row icon={<Star size={16} color={V3.o} />} label="Loyalty & Rewards" onPress={() => router.push('/(tabs)/loyalty')} />
          <Row icon={<Instagram size={16} color={V3.o} />} label="Follow us @b60_ae" onPress={() => Linking.openURL('https://instagram.com/b60_ae')} />
          <Row icon={<Globe size={16} color={V3.o} />} label="Visit b60.ae" onPress={() => Linking.openURL('https://b60.ae')} />
          <Row icon={<Info size={16} color={V3.o} />} label="About B60 Burgers" onPress={() => router.push('/about' as any)} />
          <Row icon={<Shield size={16} color={V3.o} />} label="Terms & Privacy" onPress={() => router.push('/legal' as any)} />
          <Row icon={<LogOut size={16} color="#EF4444" />} label="Log Out" onPress={handleLogout} danger />
        </View>

        <Text style={s.version}>B60 BURGERS · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: V3.k },

  topBar: { paddingHorizontal: 18, paddingVertical: 10 },
  topLogo: { width: 44, height: 44 },

  hero: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 4, paddingBottom: 20, gap: 16,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: V3.s },
  heroInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  name: { fontFamily: 'Archivo_800ExtraBold', fontSize: 22, color: V3.w, letterSpacing: -0.5 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tierBadgeText: { fontFamily: 'Archivo_800ExtraBold', fontSize: 10, letterSpacing: 0.5 },
  email: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: V3.dim2, letterSpacing: 0.5 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, marginBottom: 24,
    backgroundColor: V3.s, borderRadius: 18, padding: 18,
    ...Shadows.card,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumOrange: { fontFamily: 'Archivo_900Black', fontSize: 22, color: V3.o, letterSpacing: -0.5 },
  statNum: { fontFamily: 'Archivo_900Black', fontSize: 18, color: V3.w, letterSpacing: -0.5 },
  statLabel: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, letterSpacing: 1.2, color: V3.dim2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 32, backgroundColor: V3.ln },

  sectionTitle: {
    fontFamily: 'Archivo_800ExtraBold', fontSize: 20, color: V3.w, letterSpacing: -0.3,
    paddingHorizontal: 18, paddingBottom: 12,
  },
  card: {
    marginHorizontal: 18, marginBottom: 24,
    backgroundColor: V3.s, borderRadius: 18, overflow: 'hidden',
    ...Shadows.card,
  },

  orderRow: {
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: V3.ln, gap: 3,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontFamily: 'Archivo_800ExtraBold', fontSize: 14, color: V3.w },
  orderPrice: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 13, color: V3.o, letterSpacing: 0.5 },
  orderItems: { fontFamily: 'Archivo_400Regular', fontSize: 13, color: V3.dim, lineHeight: 18 },
  orderMeta: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9.5, color: V3.dim2, letterSpacing: 0.8 },

  emptyOrders: { padding: 28, alignItems: 'center', gap: 8 },
  emptyText: { fontFamily: 'Archivo_400Regular', fontSize: 14, color: V3.dim2 },
  emptyLink: { fontFamily: 'Archivo_800ExtraBold', fontSize: 13, color: V3.o },

  version: {
    textAlign: 'center', fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5, letterSpacing: 1.6, color: V3.dim2, paddingVertical: 16,
  },
})
