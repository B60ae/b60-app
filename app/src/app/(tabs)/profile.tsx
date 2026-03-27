import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { LogOut, ChevronRight, ClipboardList, Star, Edit2, Check, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../stores/authStore'
import { ordersApi, authApi } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32', Silver: '#A8A8A8', Gold: '#FFD700',
}

function getTier(points: number) {
  if (points >= 5000) return 'Gold'
  if (points >= 1000) return 'Silver'
  return 'Bronze'
}

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

  const handleLogout = () => {
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
    } catch {
      Alert.alert('Error', 'Could not update name.')
    } finally {
      setSavingName(false)
    }
  }

  const totalSpent = orders?.reduce((s, o) => s + o.total, 0) ?? 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.profileHeader}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { borderColor: tierColor }]}>
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0).toUpperCase() ?? 'B'}
              </Text>
            </View>
            <View style={styles.nameSection}>
              {editingName ? (
                <View style={styles.editNameRow}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    style={styles.nameInput}
                    autoFocus
                    returnKeyType="done"
                  />
                  <Pressable onPress={handleSaveName} hitSlop={8}>
                    <Check size={20} color={Colors.white} />
                  </Pressable>
                  <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                    <X size={20} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.nameRow} onPress={() => { setNameInput(user?.name ?? ''); setEditingName(true) }}>
                  <Text style={styles.name}>{user?.name ?? 'B60 Fan'}</Text>
                  <Edit2 size={14} color="rgba(255,255,255,0.7)" />
                </Pressable>
              )}
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{tier} Member</Text>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={[styles.statsCard, Shadows.card]}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{orders?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user?.loyalty_points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>AED {totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Menu Items */}
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

        {/* Recent Orders */}
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
                  {/* First item thumbnail */}
                  {order.items?.[0]?.menu_item?.image_url && (
                    <Image
                      source={{ uri: order.items[0].menu_item.image_url }}
                      style={styles.orderThumb}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-AE')}</Text>
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

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  )
}

function MenuRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuRowIcon}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={16} color={Colors.textMuted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { gap: Spacing.md, paddingBottom: Spacing.xxl },
  profileHeader: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarInitial: { fontSize: 28, fontWeight: '900', color: Colors.white },
  nameSection: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.white },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 2,
  },
  tierPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tierText: { fontSize: 11, fontWeight: '800', color: Colors.black },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.border },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: 0,
    padding: Spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  menuRowIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  rowDivider: { height: 1, backgroundColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  orderThumb: { width: 44, height: 44, borderRadius: Radius.md },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 13, fontWeight: '700', color: Colors.text },
  orderDate: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  orderRight: { alignItems: 'flex-end', gap: 3 },
  orderTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  seeAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.errorTint,
    backgroundColor: Colors.errorTint,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.error },
})
