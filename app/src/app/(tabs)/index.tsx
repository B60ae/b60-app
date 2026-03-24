import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, ChevronRight } from 'lucide-react-native'
import { menuApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { MenuItemCard } from '../../components/features/MenuItemCard'
import { useCartStore } from '../../stores/cartStore'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import { LOCATIONS } from '../../utils/constants'
import type { MenuItem } from '../../types'

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)

  const { data: featured } = useQuery({
    queryKey: ['menu', 'featured'],
    queryFn: menuApi.getFeatured,
  })

  const handleItemPress = (item: MenuItem) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id } })
  }

  const handleQuickAdd = (item: MenuItem) => {
    addItem(item, 1, [])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.sub}>What are you smashing today?</Text>
          </View>
          <Pressable style={styles.notifBtn}>
            <Bell size={22} color={Colors.text} />
          </Pressable>
        </View>

        {/* Hero Banner */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.hero}>
          <Text style={styles.heroTitle}>SMASH IT.</Text>
          <Text style={styles.heroSub}>Dubai's boldest burgers. Pick up in minutes.</Text>
          <Pressable style={styles.heroBtn} onPress={() => router.push('/(tabs)/menu')}>
            <Text style={styles.heroBtnText}>Order Now</Text>
            <ChevronRight size={18} color={Colors.primary} />
          </Pressable>
        </LinearGradient>

        {/* Loyalty Quick View */}
        {user && (
          <Pressable style={styles.loyaltyCard} onPress={() => router.push('/(tabs)/loyalty')}>
            <View>
              <Text style={styles.loyaltyLabel}>YOUR POINTS</Text>
              <Text style={styles.loyaltyPoints}>{user.loyalty_points.toLocaleString()}</Text>
            </View>
            <View style={styles.loyaltyRight}>
              <Text style={styles.loyaltyAed}>≈ AED {(user.loyalty_points * 0.05).toFixed(0)}</Text>
              <Text style={styles.loyaltySub}>tap to redeem →</Text>
            </View>
          </Pressable>
        )}

        {/* Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Locations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg }}>
            <View style={styles.locationsRow}>
              {LOCATIONS.map((loc) => (
                <View key={loc.id} style={styles.locationChip}>
                  <Text style={styles.locationName}>{loc.name}</Text>
                  <Text style={styles.locationCity}>{loc.city}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Featured Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Fan Favourites</Text>
          {featured?.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onPress={handleItemPress}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: Spacing.lg,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { ...Typography.bodySmall, marginTop: 2 },
  notifBtn: {
    width: 42, height: 42, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  hero: {
    margin: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg, gap: 8,
  },
  heroTitle: { fontSize: 40, fontWeight: '900', color: Colors.white, letterSpacing: -1 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.white, borderRadius: Radius.full,
    alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  heroBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  loyaltyCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  loyaltyLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 2 },
  loyaltyPoints: { fontSize: 28, fontWeight: '900', color: Colors.white },
  loyaltyRight: { alignItems: 'flex-end' },
  loyaltyAed: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  loyaltySub: { ...Typography.caption, marginTop: 2 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  locationsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg },
  locationChip: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  locationName: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  locationCity: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
})
