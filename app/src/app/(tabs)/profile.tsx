import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { LogOut, ChevronRight, ClipboardList, Star, Phone, Mail } from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import { ordersApi, authApi } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { OrderStatusBadge } from '../../components/features/OrderStatusBadge'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()

  const { data: orders } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
  })

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ gap: Spacing.lg, padding: Spacing.lg }}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.name?.charAt(0).toUpperCase() ?? 'B'}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{user?.name ?? 'B60 Fan'}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{orders?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user?.loyalty_points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              AED {orders?.reduce((s, o) => s + o.total, 0).toFixed(0) ?? '0'}
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <MenuItem icon={<ClipboardList size={18} color={Colors.primary} />} label="Order History" onPress={() => {}} />
          <MenuItem icon={<Star size={18} color={Colors.primary} />} label="Loyalty Points" onPress={() => router.push('/(tabs)/loyalty')} />
        </View>

        {/* Recent Orders */}
        {orders && orders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {orders.slice(0, 3).map((order) => (
              <Pressable
                key={order.id}
                style={styles.orderRow}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
              >
                <View>
                  <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-AE')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <OrderStatusBadge status={order.status} />
                  <Text style={styles.orderTotal}>AED {order.total.toFixed(0)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Button title="Log Out" onPress={handleLogout} variant="outline" fullWidth />
      </ScrollView>
    </SafeAreaView>
  )
}

function MenuItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      {icon}
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  avatar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28, fontWeight: '900', color: Colors.white },
  name: { fontSize: 22, fontWeight: '800', color: Colors.white },
  phone: { ...Typography.bodySmall, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  statLabel: { ...Typography.caption },
  divider: { width: 1, backgroundColor: Colors.border },
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, padding: Spacing.md, paddingBottom: 0 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  orderId: { fontSize: 14, fontWeight: '700', color: Colors.text },
  orderDate: { ...Typography.caption, marginTop: 2 },
  orderTotal: { ...Typography.price, fontSize: 14 },
})
