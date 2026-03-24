import { Tabs } from 'expo-router'
import { Home, UtensilsCrossed, ShoppingCart, Star, User } from 'lucide-react-native'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../utils/theme'
import { useCartStore } from '../../stores/cartStore'

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const count = useCartStore((s) => s.items.length)
  return (
    <View>
      <ShoppingCart size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ color, size }) => <UtensilsCrossed size={size} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} /> }} />
      <Tabs.Screen name="loyalty" options={{ title: 'Points', tabBarIcon: ({ color, size }) => <Star size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -6, right: -10,
    backgroundColor: Colors.primary,
    borderRadius: 999, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
})
