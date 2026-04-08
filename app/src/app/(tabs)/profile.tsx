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
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { ordersApi, authApi } from '../../services/api'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows, Typography } from '../../utils/theme'
import { Switch } from 'react-native'
import { Moon } from 'lucide-react-native'

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

function AnimatedStat({ target, prefix = '' }: { target: number; prefix?: string }) {
  return <Text style={styles.statNum}>{`${prefix}${target.toLocaleString()}`}</Text>
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, onPress, color
}: {
  icon: React.ReactNode
  label: string
  onPress: () => void
  color: string
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuRowIcon}>{icon}</View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      <ChevronRight size={16} color={color === '#FFFFFF' ? 'rgba(255,255,255,0.4)' : '#888888'} />
    </Pressable>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore()
  const { themeMode, setThemeMode } = useThemeStore()
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: orders } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
    enabled: isAuthenticated,
  })

  const tier = getTier(user?.loyalty_points ?? 0)
  const tierColor = TIER_COLORS[tier]
  const totalSpent = orders?.reduce((s, o) => s + Number(o.total || 0), 0) ?? 0

  const toggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')
  }

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ── */}
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          {/* Decorative circle */}
          <View style={styles.headerDecor} />

          <View style={styles.avatarRow}>
            {/* Avatar with tier-color ring */}
            <View style={[styles.avatarRing, { borderColor: tierColor }]}>
              <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.avatarInitial, { color: theme.white }]}>
                  {user?.name?.charAt(0).toUpperCase() ?? 'B'}
                </Text>
              </View>
            </View>

            <View style={styles.nameSection}>
              <Text style={styles.greetingLabel}>Your Profile</Text>
              {editingName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    style={[styles.nameInput, { color: theme.white, borderBottomColor: 'rgba(255,255,255,0.5)' }]}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                  <Pressable onPress={handleSaveName} hitSlop={8} disabled={savingName}>
                    <Check size={20} color={theme.white} />
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
                  <Text style={[styles.name, { color: theme.white }]}>{user?.name ?? 'B60 Fan'}</Text>
                  <Edit2 size={13} color="rgba(255,255,255,0.65)" />
                </Pressable>
              )}
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>

          {/* Tier pill badge */}
          <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
            <Star size={10} color={theme.black} fill={theme.black} />
            <Text style={[styles.tierPillText, { color: theme.black }]}>{tier} Member</Text>
          </View>
        </LinearGradient>

        {/* ── Street Mode Toggle ── */}
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.themeToggleRow}>
            <View style={styles.themeIconBox}>
              <Moon size={18} color={themeMode === 'dark' ? theme.yellow : theme.textSecondary} />
              <Text style={[styles.themeLabel, { color: theme.text }]}>STREET MODE</Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={theme.white}
            />
          </View>
        </View>

        {/* ── Stats Card ── */}
        <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }, themeMode === 'dark' ? Shadows.hard : Shadows.card]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{orders?.length ?? 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Orders</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{user?.loyalty_points ?? 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Points</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.primary }]}>AED {Math.round(totalSpent).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Spent</Text>
          </View>
        </View>

        {/* ── Menu Section ── */}
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }, themeMode === 'dark' ? Shadows.hard : Shadows.card]}>
          <MenuRow
            icon={<ClipboardList size={18} color={theme.primary} />}
            label="Order History"
            onPress={() => router.push('/orders')}
            color={theme.text}
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <MenuRow
            icon={<Star size={18} color={theme.primary} />}
            label="Loyalty Points"
            onPress={() => router.push('/(tabs)/loyalty')}
            color={theme.text}
          />
        </View>

        {/* ── Recent Orders ── */}
        {orders && orders.length > 0 && (
          <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }, themeMode === 'dark' ? Shadows.hard : Shadows.card]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Orders</Text>
            {orders.slice(0, 3).map((order, idx) => (
              <View key={order.id}>
                {idx > 0 && <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />}
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
                    <View style={[styles.orderThumb, styles.orderThumbPlaceholder, { backgroundColor: theme.border }]} />
                  )}
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderId, { color: theme.text }]}>#{order.id.slice(-6).toUpperCase()}</Text>
                    <Text style={[styles.orderDate, { color: theme.textMuted }]}>
                      {new Date(order.created_at).toLocaleDateString('en-AE')}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <OrderStatusBadge status={order.status} />
                    <Text style={[styles.orderTotal, { color: theme.primary }]}>AED {Number(order.total || 0).toFixed(0)}</Text>
                  </View>
                </Pressable>
              </View>
            ))}

            <Pressable style={[styles.seeAllRow, { borderTopColor: theme.border }]} onPress={() => router.push('/orders')}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>See all orders</Text>
              <ChevronRight size={14} color={theme.primary} />
            </Pressable>
          </View>
        )}

        {/* ── Logout ── */}
        <Pressable style={[styles.logoutBtn, { backgroundColor: theme.error, borderColor: theme.black, shadowColor: theme.black }]} onPress={handleLogout}>
          <LogOut size={18} color={theme.white} />
          <Text style={[styles.logoutText, { color: theme.white }]}>Log Out</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28, fontWeight: '900' },
  nameSection: { flex: 1, gap: 2 },
  greetingLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameInput: {
    flex: 1, fontSize: 18, fontWeight: '700',
    paddingVertical: 2,
  },
  tierPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  tierPillText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  // Theme Toggle Row
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  themeIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1.5,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 17, fontWeight: '900' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1.5 },

  // Menu card
  menuCard: {
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  menuRowIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(240, 90, 26, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', flex: 1 },
  rowDivider: { height: 1 },

  // Section title
  sectionTitle: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', marginBottom: Spacing.sm },

  // Recent orders
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  orderThumb: { width: 48, height: 48, borderRadius: Radius.sm },
  orderThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 13, fontWeight: '900' },
  orderDate: { fontSize: 11, marginTop: 1 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { fontSize: 13, fontWeight: '900' },
  seeAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingTop: Spacing.md, marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  seeAllText: { fontSize: 13, fontWeight: '700' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    // Neobrutalist shadow — borderColor/shadowColor applied inline via theme
    borderWidth: 2,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  logoutText: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase' },
})
