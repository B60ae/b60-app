import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  LogOut, ChevronRight, ClipboardList, Star,
  Edit2, Check, X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, useDerivedValue,
} from 'react-native-reanimated'
import { ReText } from 'react-native-reanimated'
import { useAuthStore } from '../../stores/authStore'
import { ordersApi, authApi } from '../../services/api'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

// ─── Tier ─────────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#A8A8A8',
  Gold: '#FFD700',
}

function getTier(points: number): string {
  if (points >= 5000) return 'Gold'
  if (points >= 1000) return 'Silver'
  return 'Bronze'
}

// ─── Animated Stat Number ────────────────────────────────────────────────────

function AnimatedStat({ target, prefix = '' }: { target: number; prefix?: string }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(target, { duration: 1200 })
  }, [target])

  const displayText = useDerivedValue(() =>
    `${prefix}${Math.round(progress.value).toLocaleString()}`
  )

  return <ReText style={styles.statNum} text={displayText} />
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, onPress,
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuRowIcon}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={16} color={Colors.textMuted} />
    </Pressable>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const { data: orders } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
  })

  const tier = getTier(user?.loyalty_points ?? 0)
  const tierColor = TIER_COLORS[tier]
  const totalSpent = orders?.reduce((s, o) => s + o.total, 0) ?? 0

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ])
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const updated = await authApi.updateProfile({ name: nameInput.trim() })
      if (user) await setUser({ ...user, name: updated.name }, '')
      setEditingName(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      Alert.alert('Error', 'Could not update name.')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ── */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          {/* Decorative circle */}
          <View style={styles.headerDecor} />

          <View style={styles.avatarRow}>
            {/* Avatar with tier-color ring */}
            <View style={[styles.avatarRing, { borderColor: tierColor }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {user?.name?.charAt(0).toUpperCase() ?? 'B'}
                </Text>
              </View>
            </View>

            <View style={styles.nameSection}>
              <Text style={styles.greetingLabel}>Hey there,</Text>
              {editingName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    style={styles.nameInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                  <Pressable onPress={handleSaveName} hitSlop={8} disabled={savingName}>
                    <Check size={20} color={Colors.white} />
                  </Pressable>
                  <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                    <X size={20} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.nameRow}
                  onPress={() => {
                    setNameInput(user?.name ?? '')
                    setEditingName(true)
                  }}
                >
                  <Text style={styles.name}>{user?.name ?? 'B60 Fan'}</Text>
                  <Edit2 size={13} color="rgba(255,255,255,0.65)" />
                </Pressable>
              )}
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>

          {/* Tier pill badge */}
          <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
            <Star size={10} color={Colors.black} fill={Colors.black} />
            <Text style={styles.tierPillText}>{tier} Member</Text>
          </View>
        </LinearGradient>

        {/* ── Stats Card ── */}
        <View style={[styles.statsCard, Shadows.card]}>
          <View style={styles.stat}>
            <AnimatedStat target={orders?.length ?? 0} />
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <AnimatedStat target={user?.loyalty_points ?? 0} />
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <AnimatedStat target={Math.round(totalSpent)} prefix="AED " />
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* ── Menu Section ── */}
        <View style={[styles.menuCard, Shadows.card]}>
          <MenuRow
            icon={<ClipboardList size={18} color={Colors.primary} />}
            label="Order History"
            onPress={() => router.push('/orders')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon={<Star size={18} color={Colors.primary} />}
            label="Loyalty Points"
            onPress={() => router.push('/(tabs)/loyalty')}
          />
        </View>

        {/* ── Recent Orders ── */}
        {orders && orders.length > 0 && (
          <View style={[styles.menuCard, Shadows.card]}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {orders.slice(0, 3).map((order, idx) => (
              <View key={order.id}>
                {idx > 0 && <View style={styles.rowDivider} />}
                <Pressable
                  style={styles.orderRow}
                  onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                >
                  {order.items?.[0]?.menu_item?.image_url ? (
                    <Image
                      source={{ uri: order.items[0].menu_item.image_url }}
                      style={styles.orderThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.orderThumb, styles.orderThumbPlaceholder]}>
                      <Text style={{ fontSize: 18 }}>🍔</Text>
                    </View>
                  )}
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleDateString('en-AE')}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <OrderStatusBadge status={order.status} />
                    <Text style={styles.orderTotal}>AED {order.total.toFixed(0)}</Text>
                  </View>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.seeAllRow} onPress={() => router.push('/orders')}>
              <Text style={styles.seeAllText}>See all orders</Text>
              <ChevronRight size={14} color={Colors.primary} />
            </Pressable>
          </View>
        )}

        {/* ── Logout ── */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.white} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { gap: Spacing.md, paddingBottom: Spacing.xxl },

  // Header
  profileHeader: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  headerDecor: {
    position: 'absolute', right: -40, top: -40,
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 24, borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, padding: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28, fontWeight: '900', color: Colors.white },
  nameSection: { flex: 1, gap: 2 },
  greetingLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.white },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameInput: {
    flex: 1, fontSize: 18, fontWeight: '700', color: Colors.white,
    borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 2,
  },
  tierPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  tierPillText: { fontSize: 11, fontWeight: '800', color: Colors.black },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.border },

  // Menu card
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: Spacing.md,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  menuRowIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  rowDivider: { height: 1, backgroundColor: Colors.border },

  // Section title
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },

  // Recent orders
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  orderThumb: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.surface },
  orderThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 13, fontWeight: '700', color: Colors.text },
  orderDate: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  seeAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingTop: Spacing.sm, marginTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  seeAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.error,
    ...Shadows.cardStrong,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.white },
})
