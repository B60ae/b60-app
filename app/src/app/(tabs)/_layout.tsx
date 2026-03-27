import { useRef, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Home, UtensilsCrossed, ShoppingCart, Star, User } from 'lucide-react-native'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Colors } from '../../utils/theme'
import { useCartStore } from '../../stores/cartStore'

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const count = useCartStore((s) => s.items.length)
  const prevCount = useRef(count)
  const badgeScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (count > prevCount.current) {
      Animated.sequence([
        Animated.spring(badgeScale, { toValue: 1.5, useNativeDriver: true, tension: 300, friction: 8 }),
        Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start()
    }
    prevCount.current = count
  }, [count])

  return (
    <View>
      <ShoppingCart size={size} color={color} />
      {count > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </Animated.View>
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
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 4,
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
